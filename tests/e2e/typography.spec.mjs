import { test, expect } from "@playwright/test";
import { insertStepAfter, openFirstCourse, openFirstLesson, resetApp } from "./helpers/app.mjs";

test("tipografia mantém legibilidade no fluxo mobile-first do autor", async ({ page }) => {
  await resetApp(page);

  const homeTypography = await page.evaluate(() => {
    const subtitle = document.querySelector(".card-subtitle");
    const tiny = document.querySelector(".progress-meta");
    const subtitleStyle = subtitle ? window.getComputedStyle(subtitle) : null;
    const tinyStyle = tiny ? window.getComputedStyle(tiny) : null;

    return {
      subtitleFontSize: subtitleStyle ? parseFloat(subtitleStyle.fontSize) : 0,
      tinyFontSize: tinyStyle ? parseFloat(tinyStyle.fontSize) : 0
    };
  });

  expect(homeTypography.subtitleFontSize).toBeGreaterThanOrEqual(14);
  expect(homeTypography.tinyFontSize).toBeGreaterThanOrEqual(12);

  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator('[data-action="palette-add"][data-block-type="paragraph"]').click();
  await page.locator('[data-action="palette-add"][data-block-type="editor"]').click();
  await page.locator('[data-action="palette-add"][data-block-type="multiple_choice"]').click();
  await page.locator('[data-action="palette-add"][data-block-type="simulator"]').click();

  const editorTypography = await page.evaluate(() => {
    const paragraphInput = document.querySelector('.builder-block[data-block-kind="paragraph"] [data-block-rich-input]');
    const editorInput = document.querySelector('.builder-block[data-block-kind="editor"] [data-terminal-template]');
    const choiceInput = document.querySelector('.builder-block[data-block-kind="multiple_choice"] [data-choice-option]');
    const simulatorInput = document.querySelector('.builder-block[data-block-kind="simulator"] [data-simulator-label]');

    const paragraphStyle = paragraphInput ? window.getComputedStyle(paragraphInput) : null;
    const editorStyle = editorInput ? window.getComputedStyle(editorInput) : null;
    const choiceStyle = choiceInput ? window.getComputedStyle(choiceInput) : null;
    const simulatorStyle = simulatorInput ? window.getComputedStyle(simulatorInput) : null;

    return {
      paragraphFontSize: paragraphStyle ? parseFloat(paragraphStyle.fontSize) : 0,
      paragraphLineHeight: paragraphStyle ? parseFloat(paragraphStyle.lineHeight) : 0,
      editorFontSize: editorStyle ? parseFloat(editorStyle.fontSize) : 0,
      choiceFontSize: choiceStyle ? parseFloat(choiceStyle.fontSize) : 0,
      simulatorFontSize: simulatorStyle ? parseFloat(simulatorStyle.fontSize) : 0
    };
  });

  expect(editorTypography.paragraphFontSize).toBeGreaterThanOrEqual(15);
  expect(editorTypography.paragraphLineHeight).toBeGreaterThan(editorTypography.paragraphFontSize * 1.3);
  expect(editorTypography.editorFontSize).toBeGreaterThanOrEqual(16);
  expect(editorTypography.choiceFontSize).toBeGreaterThanOrEqual(15);
  expect(editorTypography.simulatorFontSize).toBeGreaterThanOrEqual(15);
});
