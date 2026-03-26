import { test, expect } from "@playwright/test";
import { resetApp, openFirstCourse, openFirstLesson, insertStepAfter, saveEditor, advanceStep, openEditorForCurrentStep } from "./helpers/app.mjs";

test("adiciona nó ao fluxograma, salva e reabre o card preservando a estrutura", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator('[data-action="palette-add"][data-block-type="flowchart"]').click();
  await expect(page.locator('.builder-block[data-block-kind="flowchart"]')).toHaveCount(1);
  await expect(page.locator("[data-flowchart-node-card]")).toHaveCount(2);

  await page.locator('[data-action="flowchart-add-node"]').click();
  await expect(page.locator("[data-flowchart-node-card]")).toHaveCount(3);

  await saveEditor(page);
  await advanceStep(page);
  await expect(page.locator(".flowchart-exercise")).toHaveCount(1);

  await openEditorForCurrentStep(page);
  await expect(page.locator('.builder-block[data-block-kind="flowchart"]')).toHaveCount(1);
  await expect(page.locator("[data-flowchart-node-card]")).toHaveCount(3);
});

test("pré-preenche Não à esquerda e Sim à direita em decisões com duas saídas", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator('[data-action="palette-add"][data-block-type="flowchart"]').click();
  await page.locator('[data-action="flowchart-add-node"]').click();
  await page.locator('[data-action="flowchart-add-node"]').click();

  const cards = page.locator("[data-flowchart-node-card]");
  const decisionCard = cards.nth(1);
  const leftTargetId = await cards.nth(2).getAttribute("data-flowchart-node-id");
  const rightTargetId = await cards.nth(3).getAttribute("data-flowchart-node-id");

  await decisionCard.locator("[data-flowchart-node-shape='true']").selectOption("decision");
  await decisionCard.locator("[data-flowchart-node-output='true'][data-output-slot='0']").selectOption(leftTargetId);
  await decisionCard.locator("[data-flowchart-node-output='true'][data-output-slot='1']").selectOption(rightTargetId);

  await expect(
    decisionCard.locator("[data-flowchart-node-output-label='true'][data-output-slot='0']")
  ).toHaveValue("Não");
  await expect(
    decisionCard.locator("[data-flowchart-node-output-label='true'][data-output-slot='1']")
  ).toHaveValue("Sim");
});
