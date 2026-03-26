import { test, expect } from "@playwright/test";
import {
  resetApp,
  seedProject,
  createSampleProjectSnapshot,
  openFirstCourse,
  openFirstLesson,
  insertStepAfter,
  saveEditor,
  advanceStep,
  selectAllRichText
} from "./helpers/app.mjs";

test("persistência local grava snapshot e progresso em JSON claro e coerente", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator('[data-action="palette-add"][data-block-type="paragraph"]').click();
  const paragraphBlock = page.locator('.builder-block[data-block-kind="paragraph"]').first();
  const richInput = paragraphBlock.locator("[data-block-rich-input]").first();
  await richInput.fill("Texto salvo no snapshot");
  await selectAllRichText(richInput);
  await paragraphBlock.locator('[data-action="block-style-bold"]').click();

  await saveEditor(page);
  await advanceStep(page);
  await page.waitForTimeout(250);

  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem("aralearn_project_v1") || "null"));
  const progressOnly = await page.evaluate(() => JSON.parse(localStorage.getItem("aralearn_progress_v1") || "null"));

  expect(snapshot).toBeTruthy();
  expect(Array.isArray(snapshot.content.courses)).toBeTruthy();
  expect(Array.isArray(snapshot.progress.lessons)).toBeTruthy();
  expect(typeof snapshot.updatedAt).toBe("string");
  expect(snapshot.assets && typeof snapshot.assets === "object").toBeTruthy();

  const savedBlock = snapshot.content.courses
    .flatMap((course) => course.modules)
    .flatMap((moduleItem) => moduleItem.lessons)
    .flatMap((lesson) => lesson.steps)
    .flatMap((step) => step.blocks || [])
    .find((block) => block && block.kind === "paragraph" && String(block.value || "").includes("Texto salvo no snapshot"));

  expect(savedBlock).toBeTruthy();
  expect(savedBlock.kind).toBe("paragraph");
  expect(savedBlock.richText).toContain("<strong>");
  expect(savedBlock.value).toContain("Texto salvo no snapshot");

  expect(progressOnly).toBeTruthy();
  expect(Array.isArray(progressOnly.lessons)).toBeTruthy();
  expect(progressOnly.lessons.length).toBeGreaterThan(0);
  expect(typeof progressOnly.lessons[0].courseId).toBe("string");
  expect(typeof progressOnly.lessons[0].moduleId).toBe("string");
  expect(typeof progressOnly.lessons[0].lessonId).toBe("string");
  expect(typeof progressOnly.lessons[0].currentIndexHint).toBe("number");
  expect(typeof progressOnly.lessons[0].furthestIndexHint).toBe("number");
});

test("alinhamentos e estilo do título da tabela persistem no JSON do projeto", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator('[data-action="palette-add"][data-block-type="heading"]').click();
  await page.locator('[data-action="palette-add"][data-block-type="paragraph"]').click();
  await page.locator('[data-action="palette-add"][data-block-type="table"]').click();

  const headingBlock = page.locator('.builder-block[data-block-kind="heading"]').first();
  await headingBlock.locator("[data-heading-input]").fill("Título alinhado");
  await headingBlock.locator('[data-action="block-align-center"]').click();

  const paragraphBlock = page.locator('.builder-block[data-block-kind="paragraph"]').first();
  await paragraphBlock.locator("[data-block-rich-input]").fill("Parágrafo alinhado");
  await paragraphBlock.locator('[data-action="block-align-right"]').click();

  const tableBlock = page.locator('.builder-block[data-block-kind="table"]').first();
  await tableBlock.locator("[data-table-title]").fill("Tabela alinhada");
  await tableBlock.locator('[data-action="table-align-center"]').click();
  await tableBlock.locator('[data-action="table-style-italic"]').click();

  await saveEditor(page);

  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem("aralearn_project_v1") || "null"));
  const blocks = snapshot.content.courses
    .flatMap((course) => course.modules)
    .flatMap((moduleItem) => moduleItem.lessons)
    .flatMap((lesson) => lesson.steps)
    .flatMap((step) => step.blocks || []);

  const savedHeading = blocks.find((block) => block && block.kind === "heading" && block.value === "Título alinhado");
  const savedParagraph = blocks.find((block) => block && block.kind === "paragraph" && block.value.includes("Parágrafo alinhado"));
  const savedTable = blocks.find((block) => block && block.kind === "table" && block.title === "Tabela alinhada");

  expect(savedHeading).toBeTruthy();
  expect(savedHeading.align).toBe("center");

  expect(savedParagraph).toBeTruthy();
  expect(savedParagraph.align).toBe("right");

  expect(savedTable).toBeTruthy();
  expect(savedTable.titleStyle.align).toBe("center");
  expect(savedTable.titleStyle.bold).toBe(true);
  expect(savedTable.titleStyle.italic).toBe(true);
});

test("paragraph com richText explícito continua renderizando mesmo quando value precisa ser derivado", async ({ page }) => {
  const snapshot = createSampleProjectSnapshot();
  const paragraphBlock = snapshot.content.courses[0].modules[0].lessons[0].steps[0].blocks.find(
    (block) => block && block.kind === "paragraph"
  );

  paragraphBlock.value = "";
  paragraphBlock.richText = 'Use <strong>INSERT</strong><br>para adicionar uma linha.';

  await seedProject(page, snapshot);
  await openFirstCourse(page);
  await openFirstLesson(page);

  const paragraph = page.locator(".lesson-card .rich-text").first();
  await expect(paragraph).toContainText("Use INSERT");
  await expect(paragraph.locator("strong")).toContainText("INSERT");
  await expect(paragraph.locator("p")).toContainText("para adicionar uma linha.");
  const html = await paragraph.locator("p").evaluate((node) => node.innerHTML);
  expect(html).toContain("<strong>INSERT</strong>");
  expect(html).toContain("<br>");
});
