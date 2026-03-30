import { test, expect } from "@playwright/test";
import {
  createPackageFixture,
  createSampleProjectSnapshot,
  openEditorForCurrentStep,
  openFirstCourse,
  openFirstLesson,
  readDownloadedPackage,
  resetApp,
  saveEditor,
  seedProject
} from "./helpers/app.mjs";

function buildLessonWithEditor(config) {
  const options = Array.isArray(config.options) ? config.options : [];
  return {
    id: config.lessonId,
    title: config.lessonTitle,
    subtitle: "",
    steps: [
      {
        id: config.stepId,
        type: "content",
        title: config.stepTitle,
        blocks: [
          { id: `${config.stepId}-heading`, kind: "heading", value: config.stepTitle },
          {
            id: config.blockId,
            kind: "editor",
            interactionMode: config.interactionMode || "choice",
            value: config.value,
            options
          },
          { id: `${config.stepId}-button`, kind: "button", popupEnabled: false, popupBlocks: [] }
        ]
      }
    ]
  };
}

async function readLogicalText(locator) {
  return locator.evaluate((node) => {
    const clone = node.cloneNode(true);
    Array.from(clone.querySelectorAll("br")).forEach((lineBreak) => {
      lineBreak.replaceWith("\n");
    });
    Array.from(clone.querySelectorAll("[data-template-placeholder]")).forEach((placeholder) => {
      placeholder.replaceWith(placeholder.getAttribute("data-template-value") || placeholder.textContent || "");
    });
    return String(clone.textContent || "")
      .replace(/\r/g, "")
      .replace(/\u00a0/g, " ");
  });
}

async function readStoredEditorValue(page, blockId) {
  return page.evaluate((targetBlockId) => {
    const snapshot = JSON.parse(localStorage.getItem("aralearn_project_v1") || "null");
    const block = snapshot.content.courses
      .flatMap((course) => course.modules)
      .flatMap((moduleItem) => moduleItem.lessons)
      .flatMap((lesson) => lesson.steps)
      .flatMap((step) => step.blocks || [])
      .find((item) => item && item.id === targetBlockId);
    return block ? String(block.value || "") : null;
  }, blockId);
}

test("editor manual, runtime e export/import preservam HTML literal multiline com indentacao", async ({ page }) => {
  const lessonId = "lesson-editor-multiline-a";
  const lessonTitle = "Licao multiline A";
  const stepId = "step-editor-multiline-a";
  const blockId = "block-editor-multiline-a";
  const rawValue = "<header>\n  <h1>Comandos Linux</h1>\n</header>\n<main id=\"app\"></main>";

  const snapshot = createSampleProjectSnapshot();
  snapshot.content.courses[0].modules[0].lessons = [
    buildLessonWithEditor({
      lessonId,
      lessonTitle,
      stepId,
      stepTitle: "HTML multiline",
      blockId,
      value: rawValue,
      options: []
    })
  ];

  await seedProject(page, snapshot);
  await openFirstCourse(page);
  await openFirstLesson(page);

  const runtimeTerminal = page.locator(".lesson-card .terminal-box").first();
  expect(await readLogicalText(runtimeTerminal)).toBe(rawValue);

  await openEditorForCurrentStep(page);
  const templateInput = page.locator('.builder-block[data-block-kind="editor"] [data-terminal-template]').first();
  expect(await readLogicalText(templateInput)).toBe(rawValue);
  await expect(templateInput).toContainText("<header>");
  await expect(templateInput).toContainText("<main id=\"app\"></main>");
  const templateHtml = await templateInput.evaluate((node) => node.innerHTML);
  expect(templateHtml).toContain("&lt;header&gt;");
  expect(templateHtml).toContain("&lt;/header&gt;");

  await saveEditor(page);
  expect(await readStoredEditorValue(page, blockId)).toBe(rawValue);

  await page.locator('[data-action="lesson-home"]').click();
  const lessonDownloadPromise = page.waitForEvent("download");
  await page.locator('[data-action="open-context"][data-kind="lesson"]').first().click();
  await page.locator('[data-action="context-export-lesson"]').click();
  const lessonPayload = await readDownloadedPackage(await lessonDownloadPromise);

  const exportedBlock = lessonPayload.lesson.steps
    .flatMap((step) => step.blocks || [])
    .find((block) => block.id === blockId);
  expect(exportedBlock.value).toBe(rawValue);

  const lessonZipPath = await createPackageFixture(lessonPayload, "editor-multiline-a.zip");

  await resetApp(page);
  await openFirstCourse(page);
  await page.locator('[data-action="open-context"][data-kind="module"]').first().click();
  await page.locator('[data-action="context-import-module"]').click();

  const dialogPromise = page.waitForEvent("dialog");
  await page.locator("#import-json-file").setInputFiles(lessonZipPath);
  const dialog = await dialogPromise;
  expect(dialog.message()).toContain(`Lição "${lessonTitle}" importada em`);
  await dialog.accept();

  const importedLesson = page.locator(".lesson-item", { hasText: lessonTitle }).first();
  await expect(importedLesson).toBeVisible();
  await importedLesson.locator('[data-action="open-lesson"]').click();

  const importedTerminal = page.locator(".lesson-card .terminal-box").first();
  expect(await readLogicalText(importedTerminal)).toBe(rawValue);
});

test("editor preserva linha vazia intermediaria no runtime, no editor manual e no JSON salvo", async ({ page }) => {
  const blockId = "block-editor-multiline-b";
  const rawValue = "function saudacao() {\n\n  console.log(\"Olá\");\n}";

  const snapshot = createSampleProjectSnapshot();
  snapshot.content.courses[0].modules[0].lessons = [
    buildLessonWithEditor({
      lessonId: "lesson-editor-multiline-b",
      lessonTitle: "Licao multiline B",
      stepId: "step-editor-multiline-b",
      stepTitle: "Linha vazia",
      blockId,
      value: rawValue,
      options: []
    })
  ];

  await seedProject(page, snapshot);
  await openFirstCourse(page);
  await openFirstLesson(page);

  const runtimeTerminal = page.locator(".lesson-card .terminal-box").first();
  expect(await readLogicalText(runtimeTerminal)).toBe(rawValue);
  const runtimeHtml = await runtimeTerminal.evaluate((node) => node.innerHTML);
  expect(runtimeHtml).toMatch(/<br>\s*<br>/);

  await openEditorForCurrentStep(page);
  const templateInput = page.locator('.builder-block[data-block-kind="editor"] [data-terminal-template]').first();
  expect(await readLogicalText(templateInput)).toBe(rawValue);
  const templateHtml = await templateInput.evaluate((node) => node.innerHTML);
  expect(templateHtml).toMatch(/<br>\s*<br>/);

  await saveEditor(page);
  expect(await readStoredEditorValue(page, blockId)).toBe(rawValue);

  await openEditorForCurrentStep(page);
  const reopenedInput = page.locator('.builder-block[data-block-kind="editor"] [data-terminal-template]').first();
  expect(await readLogicalText(reopenedInput)).toBe(rawValue);
});

test("editor choice preserva multiline com placeholder embutido e salva o template bruto com [[...]]", async ({ page }) => {
  const blockId = "block-editor-multiline-c";
  const rawValue = "<header>\n  [[<h1>Comandos Linux</h1>]]\n</header>\n<main id=\"app\"></main>";
  const filledValue = "<header>\n  <h1>Comandos Linux</h1>\n</header>\n<main id=\"app\"></main>";

  const snapshot = createSampleProjectSnapshot();
  snapshot.content.courses[0].modules[0].lessons = [
    buildLessonWithEditor({
      lessonId: "lesson-editor-multiline-c",
      lessonTitle: "Licao multiline C",
      stepId: "step-editor-multiline-c",
      stepTitle: "Placeholder multiline",
      blockId,
      value: rawValue,
      interactionMode: "choice",
      options: [
        {
          id: "opt-editor-multiline-c",
          value: "<h1>Comandos Linux</h1>",
          enabled: true,
          displayOrder: 0,
          slotOrder: 0
        }
      ]
    })
  ];

  await seedProject(page, snapshot);
  await openFirstCourse(page);
  await openFirstLesson(page);

  await openEditorForCurrentStep(page);
  const templateInput = page.locator('.builder-block[data-block-kind="editor"] [data-terminal-template]').first();
  expect(await readLogicalText(templateInput)).toBe(filledValue);
  const templateHtml = await templateInput.evaluate((node) => node.innerHTML);
  expect(templateHtml).toContain("&lt;header&gt;");
  expect(templateHtml).toContain('data-template-placeholder="true"');
  expect(templateHtml).toContain("&lt;h1&gt;Comandos Linux&lt;/h1&gt;");

  await saveEditor(page);
  expect(await readStoredEditorValue(page, blockId)).toBe(rawValue);

  const optionButton = page.locator(".token-option").first();
  await expect(optionButton).toContainText("<h1>Comandos Linux</h1>");
  await optionButton.click();

  const runtimeTerminal = page.locator(".lesson-card .exercise-terminal").first();
  expect(await readLogicalText(runtimeTerminal)).toBe(filledValue);
});
