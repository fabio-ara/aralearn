import { test, expect } from "@playwright/test";
import { createPackageFixture, insertStepAfter, openFirstCourse, openFirstLesson, readDownloadedPackage, resetApp, saveEditor } from "./helpers/app.mjs";

test("exporta pacotes com metadados corretos de app, curso, módulo e lição", async ({ page }) => {
  await resetApp(page);

  await page.locator('[data-action="toggle-side"]').click();
  const appDownloadPromise = page.waitForEvent("download");
  await page.locator('[data-action="export-json"]').click();
  const appPayload = await readDownloadedPackage(await appDownloadPromise);
  expect(appPayload.packageMeta.scope).toBe("app");
  expect(Array.isArray(appPayload.courses)).toBeTruthy();

  const courseDownloadPromise = page.waitForEvent("download");
  await page.locator('[data-action="open-context"][data-kind="course"]').first().click();
  await page.locator('[data-action="context-export-course"]').click();
  const coursePayload = await readDownloadedPackage(await courseDownloadPromise);
  expect(coursePayload.packageMeta.scope).toBe("course");
  expect(coursePayload.course.title).toBeTruthy();

  await openFirstCourse(page);

  const moduleDownloadPromise = page.waitForEvent("download");
  await page.locator('[data-action="open-context"][data-kind="module"]').first().click();
  await page.locator('[data-action="context-export-module"]').click();
  const modulePayload = await readDownloadedPackage(await moduleDownloadPromise);
  expect(modulePayload.packageMeta.scope).toBe("module");
  expect(modulePayload.module.title).toBeTruthy();

  const lessonDownloadPromise = page.waitForEvent("download");
  await page.locator('[data-action="open-context"][data-kind="lesson"]').first().click();
  await page.locator('[data-action="context-export-lesson"]').click();
  const lessonPayload = await readDownloadedPackage(await lessonDownloadPromise);
  expect(lessonPayload.packageMeta.scope).toBe("lesson");
  expect(lessonPayload.lesson.title).toBeTruthy();
});

test("importa pacote de lição a partir do menu de módulo e insere a lição no contêiner correto", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);

  const lessonPayload = {
    lesson: {
      id: "licao-fixture",
      title: "Lição fixture",
      subtitle: "",
      steps: [
        {
          id: "step-fixture",
          type: "content",
          title: "Card fixture",
          blocks: [
            { id: "block-1", kind: "heading", value: "Card fixture" },
            { id: "block-2", kind: "button", popupEnabled: false, popupBlocks: [] }
          ]
        }
      ]
    },
    progress: { lessons: [] },
    assets: [],
    packageMeta: {
      format: "aralearn-package-v3",
      scope: "lesson",
      exportedAt: new Date().toISOString(),
      appTitle: "AraLearn",
      source: {
        courseId: "curso-fixture",
        moduleId: "modulo-fixture",
        lessonId: "licao-fixture"
      }
    }
  };

  const lessonZipPath = await createPackageFixture(lessonPayload, "lesson-fixture.zip");

  await page.locator('[data-action="open-context"][data-kind="module"]').first().click();
  await page.locator('[data-action="context-import-module"]').click();

  const dialogPromise = page.waitForEvent("dialog");
  await page.locator("#import-json-file").setInputFiles(lessonZipPath);
  const dialog = await dialogPromise;
  expect(dialog.message()).toContain('Lição "Lição fixture" importada em');
  await dialog.accept();

  await expect(page.locator("text=Lição fixture")).toBeVisible();

  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem("aralearn_project_v1") || "null"));
  expect(snapshot).toBeTruthy();
  expect(
    snapshot.content.courses
      .flatMap((course) => course.modules)
      .flatMap((moduleItem) => moduleItem.lessons)
      .some((lesson) => lesson.title === "Lição fixture")
  ).toBeTruthy();
});

test("importação de app permite mesclar cursos, módulos, lições, cards e blocos faltantes", async ({ page }) => {
  await resetApp(page);

  const appPayload = {
    appTitle: "AraLearn",
    courses: [
      {
        id: "curso-teste",
        title: "Curso de teste",
        description: "Projeto importável com partes novas.",
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
                      {
                        id: "block-intro-text",
                        kind: "paragraph",
                        value: "Primeiro card de teste.",
                        richText: "Primeiro card de teste."
                      },
                      {
                        id: "block-intro-extra",
                        kind: "paragraph",
                        value: "Bloco novo trazido pela mesclagem.",
                        richText: "Bloco novo trazido pela mesclagem."
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
                          },
                          {
                            id: "popup-extra",
                            kind: "paragraph",
                            value: "Popup extra importado sem substituir o resto.",
                            richText: "Popup extra importado sem substituir o resto."
                          }
                        ]
                      }
                    ]
                  },
                  {
                    id: "step-bonus",
                    type: "content",
                    title: "BONUS",
                    blocks: [
                      { id: "block-bonus-heading", kind: "heading", value: "BONUS" },
                      {
                        id: "block-bonus-text",
                        kind: "paragraph",
                        value: "Card novo incluído na mesma lição.",
                        richText: "Card novo incluído na mesma lição."
                      },
                      {
                        id: "block-bonus-button",
                        kind: "button",
                        popupEnabled: false,
                        popupBlocks: []
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
              },
              {
                id: "licao-extra",
                title: "Lição extra",
                subtitle: "Chegou pela mesclagem",
                steps: [
                  {
                    id: "licao-extra-step-01",
                    type: "content",
                    title: "NOVA LIÇÃO",
                    blocks: [
                      { id: "licao-extra-block-01", kind: "heading", value: "NOVA LIÇÃO" },
                      {
                        id: "licao-extra-block-02",
                        kind: "paragraph",
                        value: "Lição nova adicionada sem substituir a existente.",
                        richText: "Lição nova adicionada sem substituir a existente."
                      },
                      {
                        id: "licao-extra-block-03",
                        kind: "button",
                        popupEnabled: false,
                        popupBlocks: []
                      }
                    ]
                  },
                  {
                    id: "licao-extra-step-02",
                    type: "lesson_complete",
                    title: "Lição concluída",
                    blocks: [
                      { id: "licao-extra-complete-01", kind: "heading", value: "Lição concluída" },
                      {
                        id: "licao-extra-complete-02",
                        kind: "button",
                        popupEnabled: false,
                        popupBlocks: []
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            id: "modulo-extra",
            title: "Módulo extra",
            lessons: [
              {
                id: "modulo-extra-licao-01",
                title: "Primeira lição do módulo extra",
                subtitle: "",
                steps: [
                  {
                    id: "modulo-extra-step-01",
                    type: "content",
                    title: "MÓDULO EXTRA",
                    blocks: [
                      { id: "modulo-extra-block-01", kind: "heading", value: "MÓDULO EXTRA" },
                      {
                        id: "modulo-extra-block-02",
                        kind: "paragraph",
                        value: "Módulo novo adicionado na importação.",
                        richText: "Módulo novo adicionado na importação."
                      },
                      {
                        id: "modulo-extra-block-03",
                        kind: "button",
                        popupEnabled: false,
                        popupBlocks: []
                      }
                    ]
                  },
                  {
                    id: "modulo-extra-step-02",
                    type: "lesson_complete",
                    title: "Lição concluída",
                    blocks: [
                      { id: "modulo-extra-complete-01", kind: "heading", value: "Lição concluída" },
                      {
                        id: "modulo-extra-complete-02",
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
      {
        id: "curso-importado",
        title: "Curso importado",
        description: "Curso novo trazido pelo pacote de app.",
        modules: [
          {
            id: "curso-importado-modulo-01",
            title: "Módulo novo",
            lessons: [
              {
                id: "curso-importado-licao-01",
                title: "Lição importada",
                subtitle: "",
                steps: [
                  {
                    id: "curso-importado-step-01",
                    type: "content",
                    title: "CURSO NOVO",
                    blocks: [
                      { id: "curso-importado-block-01", kind: "heading", value: "CURSO NOVO" },
                      {
                        id: "curso-importado-block-02",
                        kind: "paragraph",
                        value: "Curso inteiro incluído na mesclagem.",
                        richText: "Curso inteiro incluído na mesclagem."
                      },
                      {
                        id: "curso-importado-block-03",
                        kind: "button",
                        popupEnabled: false,
                        popupBlocks: []
                      }
                    ]
                  },
                  {
                    id: "curso-importado-step-02",
                    type: "lesson_complete",
                    title: "Lição concluída",
                    blocks: [
                      { id: "curso-importado-complete-01", kind: "heading", value: "Lição concluída" },
                      {
                        id: "curso-importado-complete-02",
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
    ],
    progress: { lessons: [] },
    assets: {},
    packageMeta: {
      format: "aralearn-package-v3",
      scope: "app",
      exportedAt: new Date().toISOString(),
      appTitle: "AraLearn"
    }
  };

  const appZipPath = await createPackageFixture(appPayload, "app-merge-fixture.zip");

  await page.locator('[data-action="toggle-side"]').click();
  await page.locator('[data-action="import-json-trigger"]').click();

  const promptPromise = page.waitForEvent("dialog");
  await page.locator("#import-json-file").setInputFiles(appZipPath);
  const prompt = await promptPromise;
  expect(prompt.type()).toBe("prompt");
  expect(prompt.message()).toContain("mesclar");
  await prompt.accept("mesclar");

  const alertPromise = page.waitForEvent("dialog");
  const alert = await alertPromise;
  expect(alert.message()).toContain("Projeto mesclado");
  await alert.accept();

  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem("aralearn_project_v1") || "null"));
  expect(snapshot).toBeTruthy();

  const mergedCourse = snapshot.content.courses.find((course) => course.id === "curso-teste");
  expect(mergedCourse).toBeTruthy();
  expect(snapshot.content.courses.some((course) => course.id === "curso-importado")).toBeTruthy();
  expect(mergedCourse.modules.some((moduleItem) => moduleItem.title === "Módulo extra")).toBeTruthy();

  const mergedModule = mergedCourse.modules.find((moduleItem) => moduleItem.id === "modulo-inicial");
  expect(mergedModule.lessons.some((lesson) => lesson.title === "Lição extra")).toBeTruthy();

  const mergedLesson = mergedModule.lessons.find((lesson) => lesson.id === "licao-inicial");
  expect(mergedLesson.steps.some((step) => step.id === "step-bonus")).toBeTruthy();

  const introStep = mergedLesson.steps.find((step) => step.id === "step-intro");
  expect(introStep.blocks.some((block) => block.id === "block-intro-extra")).toBeTruthy();

  const fillStep = mergedLesson.steps.find((step) => step.id === "step-fill");
  const fillButton = fillStep.blocks.find((block) => block.kind === "button");
  expect(fillButton.popupBlocks.some((block) => block.id === "popup-extra")).toBeTruthy();
});

test("exportação de lição preserva assets usados em imagem dentro do popup estruturado", async ({ page }) => {
  const tinySvgDataUrl =
    "data:image/svg+xml;utf8," +
    "<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'>" +
    "<rect width='8' height='8' fill='%23f5c96a'/>" +
    "</svg>";

  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator("[data-button-popup]").check();
  await page.locator('[data-action="button-edit-popup"]').click();
  await page.locator('.popup-builder-overlay [data-action="palette-add"][data-block-type="image"]').click();
  await page
    .locator('.popup-builder-overlay .builder-block[data-block-kind="image"] [data-block-input="true"]')
    .first()
    .fill(tinySvgDataUrl);
  await page.locator('[data-action="popup-builder-save"]').click();
  await expect(page.locator(".popup-builder-overlay")).toHaveCount(0);

  await saveEditor(page);
  await page.locator('[data-action="lesson-home"]').click();

  const lessonDownloadPromise = page.waitForEvent("download");
  await page.locator('[data-action="open-context"][data-kind="lesson"]').first().click();
  await page.locator('[data-action="context-export-lesson"]').click();
  const lessonPayload = await readDownloadedPackage(await lessonDownloadPromise);

  expect(lessonPayload.packageMeta.scope).toBe("lesson");
  expect(Array.isArray(lessonPayload.assets)).toBeTruthy();
  expect(lessonPayload.assets.length).toBeGreaterThanOrEqual(1);
  lessonPayload.assets.forEach((assetPath) => {
    expect(assetPath).toMatch(/^assets\/images\//);
  });

  const popupImageBlock = lessonPayload.lesson.steps
    .flatMap((step) => step.blocks || [])
    .filter((block) => block.kind === "button")
    .flatMap((block) => block.popupBlocks || [])
    .find((block) => block.kind === "image");

  expect(popupImageBlock).toBeTruthy();
  expect(lessonPayload.assets).toContain(popupImageBlock.value);
});

test("salvamento rápido do popup seguido do salvamento do card preserva o conteúdo estruturado", async ({ page }) => {
  const tinySvgDataUrl =
    "data:image/svg+xml;utf8," +
    "<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'>" +
    "<rect width='8' height='8' fill='%23f5c96a'/>" +
    "</svg>";

  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator("[data-button-popup]").check();
  await page.locator('[data-action="button-edit-popup"]').click();
  await page.locator('.popup-builder-overlay [data-action="palette-add"][data-block-type="image"]').click();
  await page
    .locator('.popup-builder-overlay .builder-block[data-block-kind="image"] [data-block-input="true"]')
    .first()
    .fill(tinySvgDataUrl);

  await page.locator('[data-action="popup-builder-save"]').click();
  await page.locator('[data-action="editor-save"]').evaluate((node) => node.click());
  await expect(page.locator(".editor-overlay")).toHaveCount(0, { timeout: 10000 });

  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem("aralearn_project_v1") || "null"));
  expect(snapshot).toBeTruthy();

  const customStep = snapshot.content.courses
    .flatMap((course) => course.modules)
    .flatMap((moduleItem) => moduleItem.lessons)
    .flatMap((lesson) => lesson.steps)
    .find((step) =>
      Array.isArray(step.blocks) &&
      step.blocks.some((block) => block.kind === "button" && block.popupEnabled)
    );

  expect(customStep).toBeTruthy();
  expect(customStep.type).toBe("content");
  const popupButton = customStep.blocks.find((block) => block.kind === "button");
  expect(Array.isArray(popupButton.popupBlocks)).toBeTruthy();
  expect(popupButton.popupBlocks).toHaveLength(1);
  expect(popupButton.popupBlocks[0].kind).toBe("image");
  expect(String(popupButton.popupBlocks[0].value || "")).toMatch(/^assets\/images\//);
  expect(Object.keys(snapshot.assets || {})).toContain(popupButton.popupBlocks[0].value);
});
