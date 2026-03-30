import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { strToU8, zipSync } from "fflate";
import { createPackageFixture, createSampleProjectSnapshot, resetApp } from "./helpers/app.mjs";

const ASSET_PATH = "assets/images/hero.svg";
const SAMPLE_ASSET_PATH = "assets/images/sample-intro.svg";
const ASSET_SVG =
  "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"20\" viewBox=\"0 0 32 20\">" +
  "<rect width=\"32\" height=\"20\" rx=\"4\" fill=\"#1f2937\"/>" +
  "<circle cx=\"10\" cy=\"10\" r=\"4\" fill=\"#f5c96a\"/>" +
  "<rect x=\"17\" y=\"7\" width=\"9\" height=\"6\" rx=\"2\" fill=\"#34d399\"/>" +
  "</svg>";

function createTempFile(fileName, bytes) {
  const filePath = path.join(os.tmpdir(), `aralearn-${Date.now()}-${Math.random().toString(36).slice(2)}-${fileName}`);
  fs.writeFileSync(filePath, Buffer.from(bytes));
  return filePath;
}

function decodeDataUrlToBuffer(dataUrl) {
  const text = String(dataUrl || "");
  const match = text.match(/^data:([^,]*),(.*)$/);
  if (!match) return Buffer.alloc(0);
  if (/;base64/i.test(match[1])) return Buffer.from(match[2], "base64");
  return Buffer.from(decodeURIComponent(match[2]), "utf8");
}

function buildCoursePackage(options = {}) {
  const courseId = options.courseId || "curso-importado";
  const courseTitle = options.courseTitle || "Curso importado";
  const lessonId = options.lessonId || `${courseId}-licao-01`;
  const lessonTitle = options.lessonTitle || "Lição importada";
  const stepId = options.stepId || `${lessonId}-step-01`;
  const imagePath = options.imagePath || "";
  const contentBlocks = [
    { id: `${stepId}-heading`, kind: "heading", value: options.cardTitle || "CARD IMPORTADO" }
  ];

  if (imagePath) {
    contentBlocks.push({ id: `${stepId}-image`, kind: "image", value: imagePath });
  }

  contentBlocks.push({
    id: `${stepId}-paragraph`,
    kind: "paragraph",
    value: options.paragraph || "Conteúdo importado do pacote ZIP.",
    richText: options.paragraph || "Conteúdo importado do pacote ZIP."
  });
  contentBlocks.push({
    id: `${stepId}-button`,
    kind: "button",
    popupEnabled: false,
    popupBlocks: []
  });

  return {
    course: {
      id: courseId,
      title: courseTitle,
      description: options.description || "Pacote de teste para importação.",
      modules: [
        {
          id: `${courseId}-modulo-01`,
          title: options.moduleTitle || "Módulo ZIP",
          lessons: [
            {
              id: lessonId,
              title: lessonTitle,
              subtitle: options.lessonSubtitle || "",
              steps: [
                {
                  id: stepId,
                  type: "content",
                  title: options.cardTitle || "CARD IMPORTADO",
                  blocks: contentBlocks
                },
                {
                  id: `${lessonId}-complete`,
                  type: "lesson_complete",
                  title: "Lição concluída",
                  blocks: [
                    { id: `${lessonId}-complete-heading`, kind: "heading", value: "Lição concluída" },
                    {
                      id: `${lessonId}-complete-button`,
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
    },
    progress: { lessons: [] },
    assets: imagePath ? [imagePath] : [],
    packageMeta: {
      format: "aralearn-package-v3",
      scope: "course",
      exportedAt: "2026-03-29T00:00:00.000Z",
      appTitle: "AraLearn",
      source: {
        courseId: courseId
      }
    }
  };
}

async function openAppImport(page) {
  await page.locator('[data-action="toggle-side"]').click();
  await page.locator('[data-action="import-json-trigger"]').click();
}

test("importa ZIP sem compressão", async ({ page }) => {
  await resetApp(page);
  const packagePath = await createPackageFixture(
    buildCoursePackage({
      courseId: "curso-stored",
      courseTitle: "Curso stored"
    }),
    "curso-stored.zip"
  );

  await openAppImport(page);
  const dialogPromise = page.waitForEvent("dialog");
  await page.locator("#import-json-file").setInputFiles(packagePath);
  const dialog = await dialogPromise;
  expect(dialog.message()).toContain('Curso "Curso stored" importado no app.');
  await dialog.accept();

  await expect(page.locator('.course-card:has-text("Curso stored")')).toHaveCount(1);
});

test("importa ZIP com DEFLATE e mantém assets de imagem acessíveis", async ({ page }) => {
  await resetApp(page);
  const packagePath = await createPackageFixture(
    buildCoursePackage({
      courseId: "curso-deflate",
      courseTitle: "Curso deflate",
      lessonTitle: "Lição com imagem",
      imagePath: ASSET_PATH
    }),
    "curso-deflate.zip",
    {
      compression: "deflate",
      assets: {
        [ASSET_PATH]: strToU8(ASSET_SVG)
      }
    }
  );

  await openAppImport(page);
  const dialogPromise = page.waitForEvent("dialog");
  await page.locator("#import-json-file").setInputFiles(packagePath);
  const dialog = await dialogPromise;
  expect(dialog.message()).toContain('Curso "Curso deflate" importado no app.');
  await dialog.accept();

  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem("aralearn_project_v1") || "null"));
  expect(snapshot).toBeTruthy();
  expect(snapshot.assets[ASSET_PATH]).toContain("data:image/svg+xml;base64,");

  await page.locator('.course-card:has-text("Curso deflate") [data-action="open-course"]').click();
  await page.locator('.lesson-item:has-text("Lição com imagem") [data-action="open-lesson"]').click();
  await expect(page.locator(".step-image")).toHaveAttribute("src", /data:image\/svg\+xml;base64,/);
});

test("falha com mensagem clara quando o ZIP válido não traz project.json", async ({ page }) => {
  await resetApp(page);
  const zipPath = createTempFile("sem-project-json.zip", zipSync({
    "assets/images/solta.svg": strToU8(ASSET_SVG)
  }, { level: 6 }));

  await openAppImport(page);
  const dialogPromise = page.waitForEvent("dialog");
  await page.locator("#import-json-file").setInputFiles(zipPath);
  const dialog = await dialogPromise;
  expect(dialog.message()).toContain("faltou o arquivo project.json");
  await dialog.accept();
});

test("falha com mensagem clara quando o ZIP está corrompido", async ({ page }) => {
  await resetApp(page);
  const zipPath = createTempFile("corrompido.zip", strToU8("isto-nao-e-um-zip-valido"));

  await openAppImport(page);
  const dialogPromise = page.waitForEvent("dialog");
  await page.locator("#import-json-file").setInputFiles(zipPath);
  const dialog = await dialogPromise;
  expect(dialog.message()).toContain("ZIP inválido ou corrompido");
  await dialog.accept();
});

test("falha com mensagem clara quando o pacote referencia asset ausente", async ({ page }) => {
  await resetApp(page);
  const packagePath = await createPackageFixture(
    buildCoursePackage({
      courseId: "curso-asset-ausente",
      courseTitle: "Curso asset ausente",
      imagePath: "assets/images/faltando.svg"
    }),
    "curso-asset-ausente.zip",
    { compression: "deflate" }
  );

  await openAppImport(page);
  const dialogPromise = page.waitForEvent("dialog");
  await page.locator("#import-json-file").setInputFiles(packagePath);
  const dialog = await dialogPromise;
  expect(dialog.message()).toContain('Asset ausente: "assets/images/faltando.svg"');
  await dialog.accept();
});

test("round-trip de exportação e reimportação do app preserva conteúdo, progresso e assets", async ({ page }) => {
  await page.route("**/content/hardcoded-content.js", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript; charset=utf-8",
      body: "window.AraLearnBundledContent = { content: { appTitle: 'AraLearn', courses: [] }, assets: {} };"
    });
  });

  const seed = createSampleProjectSnapshot();
  await page.goto("/");
  await page.evaluate((snapshot) => {
    localStorage.clear();
    localStorage.setItem("aralearn_project_v1", JSON.stringify(snapshot));
    localStorage.setItem("aralearn_progress_v1", JSON.stringify(snapshot.progress || { lessons: [] }));
  }, seed);
  await page.reload();

  await page.locator('[data-action="toggle-side"]').click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator('[data-action="export-json"]').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("Download path not available.");

  const exportedSnapshot = await page.evaluate(() => {
    const snapshot = JSON.parse(localStorage.getItem("aralearn_project_v1") || "null");
    return snapshot
      ? {
          content: snapshot.content,
          progress: snapshot.progress,
          assets: snapshot.assets
        }
      : null;
  });
  expect(exportedSnapshot).toBeTruthy();
  const exportedAssetBuffer = decodeDataUrlToBuffer(exportedSnapshot.assets[SAMPLE_ASSET_PATH]);

  await page.evaluate(() => {
    const snapshot = JSON.parse(localStorage.getItem("aralearn_project_v1") || "null");
    snapshot.content.appTitle = "Workspace temporário";
    snapshot.content.courses = [];
    snapshot.assets = {};
    localStorage.setItem("aralearn_project_v1", JSON.stringify(snapshot));
    localStorage.setItem("aralearn_progress_v1", JSON.stringify(snapshot.progress || { lessons: [] }));
  });
  await page.reload();

  await openAppImport(page);
  const promptPromise = page.waitForEvent("dialog");
  await page.locator("#import-json-file").setInputFiles(downloadPath);
  const prompt = await promptPromise;
  expect(prompt.type()).toBe("prompt");
  await prompt.accept("substituir");

  await expect.poll(async () => {
    return await page.evaluate(() => {
      const snapshot = JSON.parse(localStorage.getItem("aralearn_project_v1") || "null");
      return snapshot && snapshot.content ? snapshot.content.appTitle : "";
    });
  }).toBe(exportedSnapshot.content.appTitle);

  const after = await page.evaluate(() => {
    const snapshot = JSON.parse(localStorage.getItem("aralearn_project_v1") || "null");
    return snapshot
      ? {
          content: snapshot.content,
          progress: snapshot.progress,
          assets: snapshot.assets
        }
      : null;
  });

  expect(after.content).toEqual(exportedSnapshot.content);
  expect(after.progress).toEqual(exportedSnapshot.progress);
  expect(Object.keys(after.assets).sort()).toEqual(Object.keys(exportedSnapshot.assets).sort());
  expect(decodeDataUrlToBuffer(after.assets[SAMPLE_ASSET_PATH]).equals(exportedAssetBuffer)).toBeTruthy();
});
