import { test, expect } from "@playwright/test";
import { resetApp, openFirstCourse, openFirstLesson, insertStepAfter, saveEditor, advanceStep, waitForFlowchartReady } from "./helpers/app.mjs";

test("fluxograma com lacunas abre popup, fecha ao tocar fora e permite ver a resposta", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator('[data-action="palette-add"][data-block-type="flowchart"]').click();
  const flowBlock = page.locator('.builder-block[data-block-kind="flowchart"]').first();
  await expect(flowBlock).toBeVisible();

  await page.locator("[data-flowchart-node-card]").first().locator('[data-action="flowchart-add-node-shape-option"]').click();
  await page.locator("[data-flowchart-node-card]").first().locator("[data-flowchart-node-shape-option='true']").selectOption("process");
  await page.locator("[data-flowchart-node-card]").first().locator('[data-action="flowchart-add-node-text-option"]').click();
  await expect(page.locator("[data-flowchart-node-card]").first().locator("[data-flowchart-node-text-option='true']")).toBeVisible();
  await page.locator("[data-flowchart-node-card]").first().locator("[data-flowchart-node-text-option='true']").fill("Texto incorreto");

  await saveEditor(page);
  await advanceStep(page);
  await waitForFlowchartReady(page);

  const shapeButton = page.locator('[data-action="flowchart-open-shape"]').first();
  const textButton = page.locator('[data-action="flowchart-open-text"]').first();
  await expect(shapeButton).toBeVisible();
  await expect(textButton).toBeVisible();

  await shapeButton.click();
  await expect(page.locator("[data-flowchart-popup='true']")).toBeVisible();
  await page.locator(".flowchart-board").click({ position: { x: 10, y: 10 } });
  await expect(page.locator("[data-flowchart-popup='true']")).toHaveCount(0);

  await shapeButton.click();
  await page.locator(".flowchart-popup-option").nth(1).click();
  await textButton.click();
  await page.locator(".token-option").nth(1).click();

  await page.locator('[data-action="step-button-click"]').click();
  await expect(page.locator(".inline-feedback.err")).toContainText("Fluxograma incorreto");

  await page.locator('[data-action="flowchart-view-answer"]').click();
  await expect(page.locator(".inline-feedback.ok")).toContainText("Correto");
});
