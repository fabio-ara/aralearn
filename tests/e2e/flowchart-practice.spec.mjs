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

test("texto longo do fluxograma continua legível sem invadir o bloco seguinte", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator('[data-action="palette-add"][data-block-type="flowchart"]').click();
  const nodeCards = page.locator("[data-flowchart-node-card]");
  await nodeCards.nth(0).locator("[data-flowchart-node-text='true']").fill("máquinas físicas precisam distinguir informação com confiança");
  await nodeCards.nth(1).locator("[data-flowchart-node-text='true']").fill("estados bem separados são mais robustos que estados ambíguos");

  await saveEditor(page);
  await advanceStep(page);
  await waitForFlowchartReady(page);

  const textBlocks = page.locator(".flowchart-text-fixed");
  await expect(textBlocks).toHaveCount(2);

  const metrics = await textBlocks.evaluateAll((nodes) => nodes.map((node) => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
    text: String(node.textContent || "").trim()
  })));

  for (const metric of metrics) {
    expect(metric.text.length).toBeGreaterThan(0);
    expect(metric.scrollHeight).toBeLessThanOrEqual(metric.clientHeight + 2);
  }

  const firstTextBox = await textBlocks.nth(0).boundingBox();
  const secondShapeBox = await page.locator(".flowchart-shape-fixed").nth(1).boundingBox();

  expect(firstTextBox).not.toBeNull();
  expect(secondShapeBox).not.toBeNull();
  expect(firstTextBox.y + firstTextBox.height).toBeLessThanOrEqual(secondShapeBox.y - 4);
});
