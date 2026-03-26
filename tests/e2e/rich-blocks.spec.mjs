import { test, expect } from "@playwright/test";
import {
  advanceStep,
  insertStepAfter,
  openEditorForCurrentStep,
  openFirstCourse,
  openFirstLesson,
  openQuickPanel,
  resetApp,
  saveEditor
} from "./helpers/app.mjs";

test("tela inicial mostra o logotipo com kanji antes do título do app", async ({ page }) => {
  await resetApp(page);
  await expect(page.locator(".topbar-title .brand-mark")).toHaveText("荒");
  await expect(page.locator(".topbar-title .brand-text")).toHaveText("AraLearn");
});

test("cards de curso e módulo mantêm altura natural fora da tela de lição", async ({ page }) => {
  await resetApp(page);

  const viewport = page.viewportSize();
  const courseCard = page.locator(".course-card").first();
  const courseBox = await courseCard.boundingBox();
  expect(viewport).toBeTruthy();
  expect(courseBox).toBeTruthy();
  expect(courseBox.height).toBeLessThan((viewport?.height || 0) * 0.8);

  await openFirstCourse(page);
  const moduleCard = page.locator(".module-card").first();
  const moduleBox = await moduleCard.boundingBox();
  expect(moduleBox).toBeTruthy();
  expect(moduleBox.height).toBeLessThan((viewport?.height || 0) * 0.9);
});

test("a barra lateral usa a mesma espessura compacta da barra inferior e centraliza os botões", async ({ page }) => {
  await resetApp(page);

  await page.locator('[data-action="toggle-side"]').click();
  const sideMenu = page.locator(".side-menu");
  const firstSideIcon = page.locator(".side-grid .side-icon").first();
  await expect(sideMenu).toBeVisible();
  await expect(firstSideIcon).toBeVisible();

  const sideBox = await sideMenu.boundingBox();
  const sideIconBox = await firstSideIcon.boundingBox();
  expect(sideBox).toBeTruthy();
  expect(sideIconBox).toBeTruthy();
  const sideCenterX = (sideBox?.x || 0) + (sideBox?.width || 0) / 2;
  const sideIconCenterX = (sideIconBox?.x || 0) + (sideIconBox?.width || 0) / 2;
  expect(Math.abs(sideCenterX - sideIconCenterX)).toBeLessThanOrEqual(2);

  await page.locator(".side-overlay").click({ position: { x: 20, y: 20 } });
  await openFirstCourse(page);
  await openFirstLesson(page);
  await openQuickPanel(page);
  const quickPanel = page.locator(".quick-panel");
  await expect(quickPanel).toBeVisible();
  const quickBox = await quickPanel.boundingBox();
  expect(quickBox).toBeTruthy();
  expect(Math.abs((sideBox?.width || 0) - (quickBox?.height || 0))).toBeLessThanOrEqual(2);
});

test("a lição usa rodapé fixo de ações e o editor do popup do botão mostra prévia do avanço", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);

  const footer = page.locator(".lesson-action-shell");
  await expect(footer).toBeVisible();
  const footerBox = await footer.boundingBox();
  const viewport = page.viewportSize();
  expect(footerBox).toBeTruthy();
  expect(viewport).toBeTruthy();
  expect(footerBox.y + footerBox.height).toBeGreaterThan((viewport?.height || 0) - 24);

  await insertStepAfter(page);
  const buttonBlock = page.locator('.builder-block[data-block-kind="button"]').first();
  await buttonBlock.scrollIntoViewIfNeeded();
  await expect(buttonBlock.locator("text=Abrir popup antes de avançar")).toBeVisible();
  await expect(buttonBlock.locator("text=0 blocos")).toBeVisible();

  const editPopupButton = buttonBlock.locator('[data-action="button-edit-popup"]');
  await expect(editPopupButton).toBeDisabled();

  await buttonBlock.locator("[data-button-popup]").check();
  await expect(editPopupButton).toBeEnabled();
  await editPopupButton.click();

  await expect(page.locator(".popup-builder-overlay")).toBeVisible();
  await expect(page.locator(".popup-builder-footer-preview .step-main-btn")).toBeVisible();

  await page.locator('.popup-builder-overlay [data-action="palette-add"][data-block-type="paragraph"]').click();
  await page.locator('.popup-builder-overlay .builder-block[data-block-kind="paragraph"] [data-block-rich-input]').first().fill("Resumo curto");
  await page.locator('[data-action="popup-builder-save"]').click();
  await expect(page.locator(".popup-builder-overlay")).toHaveCount(0);
  await expect(buttonBlock.locator("text=1 bloco")).toBeVisible();
});

test("popup estruturado do botão reabre no editor dedicado com os blocos salvos", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await openEditorForCurrentStep(page);
  await saveEditor(page);

  await page.evaluate(() => {
    const snapshot = JSON.parse(localStorage.getItem("aralearn_project_v1") || "null");
    const step = snapshot.content.courses[0].modules[0].lessons[0].steps[0];
    const button = Array.isArray(step.blocks)
      ? step.blocks.find((block) => block && block.kind === "button")
      : null;
    if (button) {
      button.popupEnabled = true;
      button.popupBlocks = [
        { id: "popup-heading", kind: "heading", value: "Resumo salvo" },
        { id: "popup-paragraph", kind: "paragraph", value: "Comentário atual do popup" }
      ];
    }
    localStorage.setItem("aralearn_project_v1", JSON.stringify(snapshot));
  });
  await page.reload();

  await openFirstCourse(page);
  await openFirstLesson(page);
  await openEditorForCurrentStep(page);

  const buttonBlock = page.locator('.builder-block[data-block-kind="button"]').first();
  await buttonBlock.scrollIntoViewIfNeeded();
  await expect(buttonBlock.locator("text=2 blocos")).toBeVisible();
  await expect(buttonBlock.locator("[data-button-popup]")).toBeChecked();

  await buttonBlock.locator('[data-action="button-edit-popup"]').click();
  await expect(page.locator(".popup-builder-overlay")).toBeVisible();
  await expect(
    page.locator('.popup-builder-overlay .builder-block[data-block-kind="heading"] [data-block-input="true"]').first()
  ).toHaveValue("Resumo salvo");
  await expect(
    page.locator('.popup-builder-overlay .builder-block[data-block-kind="paragraph"] [data-block-rich-input]').first()
  ).toContainText("Comentário atual do popup");
});

test("lição autoral previamente salva reabre com popup estruturado em blocos", async ({ page }) => {
  await resetApp(page);
  await page.locator('.course-card', { hasText: "Curso de teste" }).locator('[data-action="open-course"]').click();
  await page.locator('.lesson-item', { hasText: "Lição inicial" }).locator('[data-action="open-lesson"]').click();
  await advanceStep(page);
  await openEditorForCurrentStep(page);

  const buttonBlock = page.locator('.builder-block[data-block-kind="button"]').first();
  await buttonBlock.scrollIntoViewIfNeeded();
  await expect(buttonBlock.locator("text=3 blocos")).toBeVisible();
  await expect(buttonBlock.locator("[data-button-popup]")).toBeChecked();

  await buttonBlock.locator('[data-action="button-edit-popup"]').click();
  await expect(page.locator(".popup-builder-overlay")).toBeVisible();
  await expect(
    page.locator('.popup-builder-overlay .builder-block[data-block-kind="heading"] [data-block-input="true"]').first()
  ).toHaveValue("Nice!");
  await expect(
    page.locator('.popup-builder-overlay .builder-block[data-block-kind="editor"] [data-terminal-template]').first()
  ).toContainText("Ada Lovelace");
  await expect(
    page.locator('.popup-builder-overlay .builder-block[data-block-kind="paragraph"] [data-block-rich-input]').first()
  ).toContainText("first programmer");
});

test("salvar dentro do editor do popup mantém apenas o rascunho até o salvar do card", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await openEditorForCurrentStep(page);

  const buttonBlock = page.locator('.builder-block[data-block-kind="button"]').first();
  await buttonBlock.scrollIntoViewIfNeeded();
  await buttonBlock.locator("[data-button-popup]").check();
  await buttonBlock.locator('[data-action="button-edit-popup"]').click();

  await page.locator('.popup-builder-overlay [data-action="palette-add"][data-block-type="paragraph"]').click();
  await page.locator('.popup-builder-overlay .builder-block[data-block-kind="paragraph"] [data-block-rich-input]').first().fill("Rascunho temporário");
  await page.locator('[data-action="popup-builder-save"]').click();
  await expect(page.locator(".popup-builder-overlay")).toHaveCount(0);
  await expect(buttonBlock.locator("text=1 bloco")).toBeVisible();

  await page.locator('[data-action="editor-close"]').click();
  await expect(page.locator(".editor-overlay")).toHaveCount(0);

  await openEditorForCurrentStep(page);
  const reopenedButtonBlock = page.locator('.builder-block[data-block-kind="button"]').first();
  await reopenedButtonBlock.scrollIntoViewIfNeeded();
  await expect(reopenedButtonBlock.locator("text=0 blocos")).toBeVisible();
});

test("tabela, múltipla escolha e popup com blocos persistem e funcionam no fluxo da lição", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator('[data-action="palette-add"][data-block-type="table"]').click();
  await page.locator('[data-action="palette-add"][data-block-type="multiple_choice"]').click();

  const tableBlock = page.locator('.builder-block[data-block-kind="table"]').first();
  await expect(tableBlock.locator("[data-table-title]")).toHaveValue("");
  await expect(tableBlock.locator("[data-table-header-cell]")).toHaveCount(1);
  await expect(tableBlock.locator("[data-table-body-row]")).toHaveCount(1);
  await tableBlock.locator("[data-table-title]").fill("Tabela de referência");
  await tableBlock.locator('[data-table-header-cell]').nth(0).fill("Expressão");
  await tableBlock.locator('[data-action="table-add-column"]').click();
  await tableBlock.locator('[data-table-header-cell]').nth(1).fill("Tipo");
  await tableBlock.locator('[data-action="table-add-column"]').click();
  await expect(tableBlock.locator('[data-table-header-cell]')).toHaveCount(3);
  await tableBlock.locator('[data-table-header-cell]').nth(2).fill("Saída");
  const firstTableRow = tableBlock.locator('[data-table-body-row]').first();
  await firstTableRow.locator('[data-table-cell]').nth(0).fill("print()");
  await firstTableRow.locator('[data-table-cell]').nth(1).fill("função");
  await firstTableRow.locator('[data-table-cell]').nth(2).fill("texto");
  await tableBlock.locator('[data-action="table-add-row"]').click();
  await expect(tableBlock.locator('[data-table-body-row]')).toHaveCount(2);
  await tableBlock.locator('[data-table-body-row]').nth(1).locator('[data-table-cell]').nth(0).fill("int()");

  const choiceBlock = page.locator('.builder-block[data-block-kind="multiple_choice"]').first();
  let choiceRows = choiceBlock.locator("[data-choice-option-row]");
  await choiceBlock.locator('[data-choice-answer-state][value="incorrect"]').check();
  await choiceRows.nth(0).locator("[data-choice-option]").fill("C");
  await choiceRows.nth(1).locator("[data-choice-option]").fill("Python");
  await choiceBlock.locator('[data-action="choice-add-option"]').click();
  choiceRows = choiceBlock.locator("[data-choice-option-row]");
  await choiceRows.nth(2).locator("[data-choice-option]").fill("Java");
  await choiceRows.nth(2).locator('[data-action="choice-toggle-answer"]').click();

  await page.locator("[data-button-popup]").check();
  await page.locator('[data-action="button-edit-popup"]').click();
  await expect(page.locator(".popup-builder-overlay")).toBeVisible();

  for (const type of ["heading", "paragraph", "image", "table", "simulator", "editor", "multiple_choice", "flowchart"]) {
    await expect(
      page.locator(`.popup-builder-overlay [data-action="palette-add"][data-block-type="${type}"]`)
    ).toHaveCount(1);
  }
  await expect(
    page.locator('.popup-builder-overlay [data-action="palette-add"][data-block-type="button"]')
  ).toHaveCount(0);

  await page.locator('.popup-builder-overlay [data-action="palette-add"][data-block-type="heading"]').click();
  const popupHeading = page.locator('.popup-builder-overlay .builder-block[data-block-kind="heading"]').first();
  await popupHeading.locator('[data-block-input="true"]').fill("Resumo final");

  await page.locator('.popup-builder-overlay [data-action="palette-add"][data-block-type="table"]').click();
  await expect(page.locator('.popup-builder-overlay .builder-block[data-block-kind="table"]')).toHaveCount(1);

  await page.locator('.popup-builder-overlay [data-action="palette-add"][data-block-type="editor"]').click();
  const popupEditor = page.locator('.popup-builder-overlay .builder-block[data-block-kind="editor"]').first();
  await popupEditor.locator("[data-terminal-template]").fill("echo ");
  await popupEditor.locator('[data-action="terminal-add-option"]').click();
  await popupEditor.locator('[data-terminal-option]').first().fill("popup");

  await page.locator('[data-action="popup-builder-save"]').click();
  await expect(page.locator(".popup-builder-overlay")).toHaveCount(0);

  await saveEditor(page);
  await advanceStep(page);

  await expect(page.locator(".lesson-card .table-block-title").first()).toHaveText("Tabela de referência");
  await expect(page.locator(".lesson-card .lesson-table thead th")).toHaveCount(3);
  await expect(page.locator(".lesson-card .lesson-table thead th").nth(0)).toHaveText("Expressão");
  await expect(page.locator(".lesson-card .lesson-table thead th").nth(2)).toHaveText("Saída");
  await expect(page.locator(".lesson-card .lesson-table tbody tr")).toHaveCount(2);
  await expect(page.locator(".lesson-card .lesson-table tbody tr").nth(0).locator("td").nth(2)).toHaveText("texto");
  await expect(page.locator(".lesson-card .multiple-choice-option")).toHaveCount(3);

  const options = page.locator(".lesson-card .multiple-choice-option");
  await options.nth(0).click();
  await expect(options.nth(0)).toHaveClass(/selected-incorrect/);
  await expect(options.nth(0).locator(".multiple-choice-mark")).toHaveText("×");
  await page.locator('[data-action="step-button-click"]').click();
  await expect(page.locator(".lesson-card .inline-feedback.err")).toBeVisible();

  await options.nth(1).click();
  await expect(options.nth(1)).toHaveClass(/selected-incorrect/);
  await expect(options.nth(1).locator(".multiple-choice-mark")).toHaveText("×");
  await options.nth(1).click();
  await options.nth(2).click();
  await expect(options.nth(2)).toHaveClass(/selected-incorrect/);
  await expect(options.nth(2).locator(".multiple-choice-mark")).toHaveText("×");
  await page.locator('[data-action="step-button-click"]').click();
  await expect(page.locator(".inline-popup")).toBeVisible();
  await expect(page.locator('.lesson-action-shell [data-action="step-button-click"]')).toHaveCount(0);
  await expect(
    page.locator(".inline-popup .popup-block-heading").filter({ hasText: "Resumo final" }).first()
  ).toHaveText("Resumo final");
  await expect(page.locator(".inline-popup .lesson-table")).toHaveCount(1);

  await page.locator('.inline-popup [data-action="popup-continue"]').click();
  await expect(page.locator(".inline-popup .inline-feedback.err")).toContainText("Preencha todas as lacunas.");

  await page.locator('.inline-popup [data-action="terminal-option"]').first().click();
  await page.locator('.inline-popup [data-action="popup-continue"]').click();
  await expect(page.locator(".inline-popup")).toHaveCount(0);

  await page.waitForTimeout(300);
  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem("aralearn_project_v1") || "null"));
  expect(snapshot).toBeTruthy();

  const customStep = snapshot.content.courses
    .flatMap((course) => course.modules)
    .flatMap((moduleItem) => moduleItem.lessons)
    .flatMap((lesson) => lesson.steps)
    .find((step) =>
      Array.isArray(step.blocks) &&
      step.blocks.some((block) => block.kind === "table") &&
      step.blocks.some((block) => block.kind === "multiple_choice")
    );

  expect(customStep).toBeTruthy();
  expect(customStep.type).toBe("content");
  const multipleChoiceBlock = customStep.blocks.find((block) => block.kind === "multiple_choice");
  expect(multipleChoiceBlock.answerState).toBe("incorrect");
  expect(multipleChoiceBlock.options[0].answer).toBe(true);
  expect(multipleChoiceBlock.options[1].answer).toBe(false);
  expect(multipleChoiceBlock.options[2].answer).toBe(true);
  const popupButton = customStep.blocks.find((block) => block.kind === "button");
  expect(popupButton).toBeTruthy();
  expect(popupButton.popupEnabled).toBe(true);
  expect(Array.isArray(popupButton.popupBlocks)).toBeTruthy();
  expect(popupButton.popupBlocks.some((block) => block.kind === "heading")).toBeTruthy();
  expect(popupButton.popupBlocks.some((block) => block.kind === "table")).toBeTruthy();
  expect(popupButton.popupBlocks.some((block) => block.kind === "editor")).toBeTruthy();
});

test("opções com resultado persistem no JSON e trocam o painel inferior pela opção ativa", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator('[data-action="palette-add"][data-block-type="simulator"]').click();
  const optionBlock = page.locator('.builder-block[data-block-kind="simulator"]').first();
  await expect(optionBlock.locator(".author-placeholder-simulator")).toHaveText("");

  const labels = optionBlock.locator("[data-simulator-label]");
  const outputs = optionBlock.locator("[data-simulator-output]");
  await labels.nth(0).fill("+");
  await outputs.nth(0).fill("48");
  await labels.nth(1).fill("-");
  await outputs.nth(1).fill("40");

  await saveEditor(page);
  await advanceStep(page);

  const runtimeBlock = page.locator(".lesson-card .simulator-exercise").first();
  await expect(runtimeBlock.locator(".token-option.active")).toHaveText("+");
  await expect(runtimeBlock.locator(".simulator-template")).toContainText("+");
  await expect(runtimeBlock.locator(".simulator-output")).toContainText("48");

  await runtimeBlock.locator('.token-option:has-text("-")').click();
  await expect(runtimeBlock.locator(".token-option.active")).toHaveText("-");
  await expect(runtimeBlock.locator(".simulator-template")).toContainText("-");
  await expect(runtimeBlock.locator(".simulator-output")).toContainText("40");

  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem("aralearn_project_v1") || "null"));
  const customStep = snapshot.content.courses
    .flatMap((course) => course.modules)
    .flatMap((moduleItem) => moduleItem.lessons)
    .flatMap((lesson) => lesson.steps)
    .find((step) =>
      Array.isArray(step.blocks) &&
      step.blocks.some((block) => block.kind === "simulator")
    );

  expect(customStep).toBeTruthy();
  const block = customStep.blocks.find((item) => item.kind === "simulator");
  expect(block.value).toMatch(/\[\[[\s\S]*?\]\]/);
  expect(block.options).toHaveLength(2);
  expect(block.options[0].value).toBe("+");
  expect(block.options[0].result).toBe("48");
  expect(block.options[1].value).toBe("-");
  expect(block.options[1].result).toBe("40");
  expect(block.value).not.toContain("quote");
});
