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

  const nodeCard = page.locator("[data-flowchart-node-card]").first();
  await nodeCard.locator('[data-action="flowchart-add-node-text-option"]').click();
  await expect(nodeCard.locator("[data-flowchart-node-text-option='true']")).toBeVisible();
  await nodeCard.locator("[data-flowchart-node-text-option='true']").fill("Texto incorreto");

  await saveEditor(page);
  await advanceStep(page);
  await waitForFlowchartReady(page);

  const textButton = page.locator('[data-action="flowchart-open-text"]').first();
  await expect(textButton).toBeVisible();

  await textButton.click();
  await expect(page.locator("[data-flowchart-popup='true']")).toBeVisible();
  await page.locator(".flowchart-board").click({ position: { x: 10, y: 10 } });
  await expect(page.locator("[data-flowchart-popup='true']")).toHaveCount(0);

  await textButton.click();
  await page.locator('.token-option', { hasText: "Texto incorreto" }).click();

  await page.locator('[data-action="step-button-click"]').click();
  await expect(page.locator(".inline-feedback.err")).toContainText("Fluxograma incorreto");

  await page.locator('[data-action="flowchart-view-answer"]').click();
  await expect(page.locator(".inline-feedback.ok")).toContainText("Correto");
});
