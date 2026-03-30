import { expect } from "@playwright/test";
import { strToU8, unzipSync, zipSync } from "fflate";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadBrowserModule } from "../../helpers/load-browser-module.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fileHelpersModulePath = path.resolve(__dirname, "../../../modules/file-helpers.js");
const fileHelpersVendorPath = path.resolve(__dirname, "../../../modules/vendor/fflate.js");
let fileHelpersPromise = null;
const SAMPLE_IMAGE_PATH = "assets/images/sample-intro.svg";
const SAMPLE_IMAGE_DATA_URL =
  "data:image/svg+xml;utf8," +
  "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='140' viewBox='0 0 240 140'>" +
  "<rect width='240' height='140' rx='24' fill='%231f2937'/>" +
  "<circle cx='56' cy='44' r='18' fill='%23f5c96a'/>" +
  "<rect x='28' y='82' width='184' height='16' rx='8' fill='%23f59e0b' opacity='0.78'/>" +
  "<rect x='28' y='106' width='132' height='12' rx='6' fill='%23fce7b2' opacity='0.92'/>" +
  "</svg>";

async function getFileHelpers() {
  if (!fileHelpersPromise) {
    fileHelpersPromise = loadBrowserModule(fileHelpersModulePath, [fileHelpersVendorPath]).then((browserModule) =>
      browserModule.AraLearnFileHelpers.createFileHelpers()
    );
  }
  return fileHelpersPromise;
}

export async function resetApp(page) {
  await page.goto("/");
  await page.evaluate((snapshot) => {
    localStorage.clear();
    if (snapshot) {
      localStorage.setItem("aralearn_project_v1", JSON.stringify(snapshot));
      localStorage.setItem("aralearn_progress_v1", JSON.stringify(snapshot.progress || { lessons: [] }));
    }
  }, createSampleProjectSnapshot());
  await page.reload();
  await expect(page.locator(".course-card").first()).toBeVisible();
  await expect(page.locator('[data-action="open-course"]').first()).toBeVisible();
}

export async function resetToEmptyApp(page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
  await expect(page.locator(".course-card").first()).toBeVisible();
}

export async function seedProject(page, snapshot = createSampleProjectSnapshot()) {
  await page.goto("/");
  await page.evaluate((payload) => {
    localStorage.clear();
    if (payload) {
      localStorage.setItem("aralearn_project_v1", JSON.stringify(payload));
      localStorage.setItem("aralearn_progress_v1", JSON.stringify(payload.progress || { lessons: [] }));
    }
  }, snapshot);
  await page.reload();
}

export async function openFirstCourse(page) {
  const sampleCourseButton = page
    .locator('.course-card', { hasText: "Curso de teste" })
    .locator('[data-action="open-course"]')
    .first();
  if (await sampleCourseButton.count()) {
    await sampleCourseButton.click();
  } else {
    await page.locator('[data-action="open-course"]').first().click();
  }
  await expect(page.locator(".module-card").first()).toBeVisible();
}

export async function openFirstLesson(page) {
  await page.locator('[data-action="open-lesson"]').first().click();
  await expect(page.locator(".lesson-card").first()).toBeVisible();
}

export async function advanceStep(page) {
  const button = page.locator('[data-action="step-button-click"], [data-action="continue-step"]').first();
  await expect(button).toBeVisible();
  await button.click();
}

export async function waitForFlowchartReady(page, index = 0) {
  const scroll = page.locator("[data-flowchart-scroll='true']").nth(index);
  await expect(scroll).toBeVisible();
  await expect(scroll).toHaveAttribute("data-flowchart-layout-status", "ready", { timeout: 10000 });
}

export async function openQuickPanel(page) {
  await page.locator('[data-action="toggle-lesson-quick"]').click();
  await expect(page.locator(".quick-panel")).toBeVisible();
}

export async function openEditorForCurrentStep(page) {
  await openQuickPanel(page);
  await page.locator('[data-action="step-edit"]').click();
  await expect(page.locator(".editor-overlay")).toBeVisible();
}

export async function insertStepAfter(page) {
  await openQuickPanel(page);
  await page.locator('[data-action="step-insert-after"]').click();
  await expect(page.locator(".editor-overlay")).toBeVisible();
}

export async function saveEditor(page) {
  const saveButton = page.locator('[data-action="editor-save"]');
  await saveButton.scrollIntoViewIfNeeded();
  await saveButton.evaluate((node) => node.click());
  await expect(page.locator(".editor-overlay")).toHaveCount(0, { timeout: 10000 });
}

export async function selectAllRichText(locator) {
  await locator.evaluate((node) => {
    node.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  });
}

export async function selectTextareaRange(locator, start, end) {
  await locator.evaluate((node, selection) => {
    node.focus();
    node.setSelectionRange(selection.start, selection.end);
  }, { start, end });
}

export async function selectRichTextRange(locator, start, end) {
  await locator.evaluate((node, selection) => {
    node.focus();
    const resolve = (wantedOffset) => {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let current = walker.nextNode();
      let consumed = 0;
      while (current) {
        const length = String(current.textContent || "").length;
        if (wantedOffset <= consumed + length) {
          return {
            node: current,
            offset: Math.max(0, wantedOffset - consumed)
          };
        }
        consumed += length;
        current = walker.nextNode();
      }
      return {
        node,
        offset: node.childNodes ? node.childNodes.length : 0
      };
    };

    const range = document.createRange();
    const selectionHandle = window.getSelection();
    const startPos = resolve(selection.start);
    const endPos = resolve(selection.end);
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);
    selectionHandle.removeAllRanges();
    selectionHandle.addRange(range);
  }, { start, end });
}

export async function readDownloadedPackage(download) {
  const filePath = await download.path();
  if (!filePath) throw new Error("Download path not available.");
  const zipBytes = fs.readFileSync(filePath);
  const entries = unzipSync(new Uint8Array(zipBytes));
  const jsonEntry = entries["project.json"];
  if (!jsonEntry) throw new Error("Package JSON not found.");
  return JSON.parse(Buffer.from(jsonEntry).toString("utf8"));
}

function toUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return strToU8(String(value || ""));
}

export async function createPackageFixture(payload, fileName = "fixture.zip", options = {}) {
  const filePath = path.join(os.tmpdir(), `aralearn-${Date.now()}-${Math.random().toString(36).slice(2)}-${fileName}`);
  const compression = options && options.compression === "deflate" ? "deflate" : "store";
  const assetEntries = options && options.assets && typeof options.assets === "object" ? options.assets : {};
  const entries = [
    {
      path: "project.json",
      bytes: strToU8(JSON.stringify(payload, null, 2))
    }
  ];

  Object.keys(assetEntries).forEach((assetPath) => {
    entries.push({
      path: assetPath,
      bytes: toUint8Array(assetEntries[assetPath])
    });
  });

  let zipBytes = null;
  if (compression === "deflate") {
    const zipInput = {};
    entries.forEach((entry) => {
      zipInput[entry.path] = entry.bytes;
    });
    zipBytes = zipSync(zipInput, { level: 6 });
  } else {
    const fileHelpers = await getFileHelpers();
    zipBytes = fileHelpers.createZip(entries);
  }

  fs.writeFileSync(filePath, Buffer.from(zipBytes));
  return filePath;
}

export function createSampleProjectSnapshot() {
  return {
    content: {
      appTitle: "AraLearn",
      courses: [
        {
          id: "curso-teste",
          title: "Curso de teste",
          description: "Projeto autoral de teste.",
          modules: [
            {
              id: "modulo-inicial",
              title: "Módulo inicial",
              lessons: [
                {
                  id: "licao-inicial",
                  title: "Lição inicial",
                  subtitle: "Exemplo autoral",
                  steps: [
                    {
                      id: "step-intro",
                      type: "content",
                      title: "WELCOME",
                      blocks: [
                        { id: "block-intro-heading", kind: "heading", value: "WELCOME" },
                        { id: "block-intro-image", kind: "image", value: SAMPLE_IMAGE_PATH },
                        {
                          id: "block-intro-text",
                          kind: "paragraph",
                          value: "Primeiro card de teste.",
                          richText: "Primeiro card de teste."
                        },
                        {
                          id: "block-intro-button",
                          kind: "button",
                          popupEnabled: false,
                          popupBlocks: []
                        }
                      ]
                    },
                    {
                      id: "step-fill",
                      type: "content",
                      title: "FILL IN THE BLANKS",
                      blocks: [
                        { id: "block-fill-heading", kind: "heading", value: "FILL IN THE BLANKS" },
                        {
                          id: "block-fill-text",
                          kind: "paragraph",
                          value: "Abra o popup para revisar o conteúdo.",
                          richText: "Abra o popup para revisar o conteúdo."
                        },
                        {
                          id: "block-fill-button",
                          kind: "button",
                          popupEnabled: true,
                          popupBlocks: [
                            { id: "popup-heading", kind: "heading", value: "Nice!" },
                            {
                              id: "popup-editor",
                              kind: "editor",
                              value: "Ada Lovelace",
                              options: []
                            },
                            {
                              id: "popup-paragraph",
                              kind: "paragraph",
                              value: "Ada Lovelace is often described as the first programmer.",
                              richText: "Ada Lovelace is often described as the first programmer."
                            }
                          ]
                        }
                      ]
                    },
                    {
                      id: "step-complete",
                      type: "lesson_complete",
                      title: "Lição concluída",
                      blocks: [
                        { id: "block-complete-heading", kind: "heading", value: "Lição concluída" },
                        {
                          id: "block-complete-button",
                          kind: "button",
                          popupEnabled: false,
                          popupBlocks: []
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    progress: { lessons: [] },
    assets: {
      [SAMPLE_IMAGE_PATH]: SAMPLE_IMAGE_DATA_URL
    },
    updatedAt: new Date().toISOString()
  };
}
