import { test, expect } from "@playwright/test";
import { resetApp, openFirstCourse, openFirstLesson, insertStepAfter, saveEditor, advanceStep, openEditorForCurrentStep, selectAllRichText, selectRichTextRange, seedProject, createSampleProjectSnapshot } from "./helpers/app.mjs";

test("novo bloco entra após o bloco ativo e o editor destaca o contêiner em edição", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator('[data-action="palette-add"][data-block-type="heading"]').click();
  await page.locator('[data-action="palette-add"][data-block-type="paragraph"]').click();

  const nonButtonBlocks = page.locator('.builder-block:not([data-block-kind="button"])');
  await expect(nonButtonBlocks).toHaveCount(2);

  const headingBlock = page.locator('.builder-block[data-block-kind="heading"]').first();
  const paragraphBlock = page.locator('.builder-block[data-block-kind="paragraph"]').first();
  await headingBlock.locator('[data-block-input="true"]').click();

  await expect(headingBlock).toHaveClass(/is-active/);
  await expect(paragraphBlock).toHaveClass(/is-muted/);

  await page.locator('[data-action="palette-add"][data-block-type="table"]').click();

  const blockKinds = await nonButtonBlocks.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-block-kind"))
  );
  expect(blockKinds).toEqual(["heading", "table", "paragraph"]);
  await expect(page.locator('.builder-block[data-block-kind="table"]').first()).toHaveClass(/is-active/);
});

test("a paleta de cor permite voltar ao tom padrão no contêiner de parágrafo", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator('[data-action="palette-add"][data-block-type="paragraph"]').click();
  const paragraphBlock = page.locator('.builder-block[data-block-kind="paragraph"]').first();
  const richInput = paragraphBlock.locator("[data-block-rich-input]").first();
  await richInput.fill("Texto com tom temporário");

  await selectAllRichText(richInput);
  await paragraphBlock.locator('[data-action="open-tone-picker"]').click();
  await page.locator('.tone-picker-option[data-tone-id="tone-gold"]').click();
  await expect(paragraphBlock.locator(".inline-tone-gold")).toContainText("Texto com tom temporário");
  const collapsedSelection = await page.evaluate(() => {
    const selection = window.getSelection();
    return !selection || selection.isCollapsed;
  });
  expect(collapsedSelection).toBeTruthy();

  await selectAllRichText(richInput);
  await paragraphBlock.locator('[data-action="open-tone-picker"]').click();
  await page.locator('.tone-picker-option[data-tone-id="tone-default"]').click();
  await expect(paragraphBlock.locator(".inline-tone-gold")).toHaveCount(0);
  await expect(paragraphBlock.locator("[data-block-rich-input]")).toContainText("Texto com tom temporário");

  await saveEditor(page);
  await advanceStep(page);
  await expect(page.locator(".lesson-card .inline-tone-gold")).toHaveCount(0);

  const snapshotJson = await page.evaluate(() => localStorage.getItem("aralearn_project_v1") || "");
  expect(snapshotJson).not.toContain("inline-tone-gold");
});

test("usa negrito, itálico e paleta de cor dentro do contêiner de parágrafo e persiste ao reabrir o editor", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await expect(page.locator('.palette-icon[title="Negrito"]')).toHaveCount(0);
  await expect(page.locator('.palette-icon[title="Itálico"]')).toHaveCount(0);

  await page.locator('[data-action="palette-add"][data-block-type="paragraph"]').click();
  await page.locator('[data-action="palette-add"][data-block-type="paragraph"]').click();
  await page.locator('[data-action="palette-add"][data-block-type="paragraph"]').click();
  const paragraphBlocks = page.locator('.builder-block[data-block-kind="paragraph"]');
  await expect(paragraphBlocks).toHaveCount(3);

  const boldBlock = paragraphBlocks.nth(0);
  await expect(boldBlock.locator(".builder-tools [data-action='block-style-bold']")).toHaveCount(0);
  await expect(boldBlock.locator(".builder-subtools-text [data-action='block-style-bold']")).toHaveCount(1);
  const boldInput = boldBlock.locator("[data-block-rich-input]").first();
  await boldInput.fill("Texto em destaque");
  await selectAllRichText(boldInput);
  await boldBlock.locator('[data-action="block-style-bold"]').click();
  await expect(boldBlock.locator("strong, b")).toContainText("Texto em destaque");
  await selectAllRichText(boldInput);
  await expect(boldBlock.locator('[data-action="block-style-bold"]')).toHaveClass(/active/);
  await boldBlock.locator('[data-action="block-style-bold"]').click();
  await expect(boldBlock.locator("strong, b")).toHaveCount(0);
  await expect(boldInput).toContainText("Texto em destaque");
  await selectAllRichText(boldInput);
  await boldBlock.locator('[data-action="block-style-bold"]').click();
  await expect(boldBlock.locator("strong, b")).toContainText("Texto em destaque");

  const italicBlock = paragraphBlocks.nth(1);
  await expect(italicBlock.locator(".builder-tools [data-action='block-style-italic']")).toHaveCount(0);
  await expect(italicBlock.locator(".builder-subtools-text [data-action='block-style-italic']")).toHaveCount(1);
  const italicInput = italicBlock.locator("[data-block-rich-input]").first();
  await italicInput.fill("Texto em itálico");
  await selectAllRichText(italicInput);
  await italicBlock.locator('[data-action="block-style-italic"]').click();
  await expect(italicBlock.locator("em, i")).toContainText("Texto em itálico");
  await selectAllRichText(italicInput);
  await expect(italicBlock.locator('[data-action="block-style-italic"]')).toHaveClass(/active/);
  await italicBlock.locator('[data-action="block-style-italic"]').click();
  await expect(italicBlock.locator("em, i")).toHaveCount(0);
  await expect(italicInput).toContainText("Texto em itálico");
  await selectAllRichText(italicInput);
  await italicBlock.locator('[data-action="block-style-italic"]').click();
  await expect(italicBlock.locator("em, i")).toContainText("Texto em itálico");

  const toneBlock = paragraphBlocks.nth(2);
  const toneInput = toneBlock.locator("[data-block-rich-input]").first();
  await toneInput.fill("Texto dourado");
  await selectAllRichText(toneInput);
  await toneBlock.locator('[data-action="open-tone-picker"]').click();
  await page.locator('.tone-picker-option[data-tone-id="tone-gold"]').click();
  await expect(toneBlock.locator(".inline-tone-gold")).toContainText("Texto dourado");
  await selectAllRichText(toneInput);
  await expect(toneBlock.locator('[data-action="open-tone-picker"]')).toHaveClass(/active/);
  await toneBlock.locator('[data-action="open-tone-picker"]').click();
  await page.locator('.tone-picker-option[data-tone-id="tone-default"]').click();
  await expect(toneBlock.locator(".inline-tone-gold")).toHaveCount(0);
  await expect(toneInput).toContainText("Texto dourado");
  await selectAllRichText(toneInput);
  await toneBlock.locator('[data-action="open-tone-picker"]').click();
  await page.locator('.tone-picker-option[data-tone-id="tone-gold"]').click();
  await expect(toneBlock.locator(".inline-tone-gold")).toContainText("Texto dourado");

  await saveEditor(page);
  await advanceStep(page);
  await expect(page.locator(".lesson-card strong")).toContainText("Texto em destaque");
  await expect(page.locator(".lesson-card em")).toContainText("Texto em itálico");
  await expect(page.locator(".lesson-card .inline-tone-gold")).toContainText("Texto dourado");

  await openEditorForCurrentStep(page);
  const reopenedParagraphs = page.locator('.builder-block[data-block-kind="paragraph"]');
  await expect(reopenedParagraphs.nth(0).locator("strong")).toContainText("Texto em destaque");
  await expect(reopenedParagraphs.nth(1).locator("em")).toContainText("Texto em itálico");
  await expect(reopenedParagraphs.nth(2).locator(".inline-tone-gold")).toContainText("Texto dourado");
});

test("usa negrito, itálico, cor via paleta e indentação dentro do contêiner de editor e persiste ao reabrir", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator('[data-action="palette-add"][data-block-type="editor"]').click();
  const editorBlock = page.locator('.builder-block[data-block-kind="editor"]').first();
  await expect(editorBlock.locator(".builder-tools [data-action='block-style-bold']")).toHaveCount(0);
  await expect(editorBlock.locator(".builder-subtools-text [data-action='block-style-bold']")).toHaveCount(1);
  await expect(editorBlock.locator(".builder-subtools-text [data-action='block-style-italic']")).toHaveCount(1);
  await expect(editorBlock.locator(".builder-subtools-text [data-action='block-style-indent']")).toHaveCount(1);
  const previousSiblingClass = await editorBlock.locator("[data-terminal-template]").first().evaluate((node) =>
    node.previousElementSibling ? node.previousElementSibling.className : ""
  );
  expect(previousSiblingClass).toContain("builder-subtools-text");

  const editorInput = editorBlock.locator("[data-terminal-template]").first();
  await editorInput.fill("echo 'ok'");
  await selectRichTextRange(editorInput, 0, 4);
  await editorBlock.locator('[data-action="block-style-bold"]').click();
  await expect(editorInput).toContainText("echo 'ok'");
  await expect(editorInput.evaluate((node) => node.innerHTML)).resolves.toMatch(/<strong>echo<\/strong> 'ok'/);
  await selectRichTextRange(editorInput, 0, 4);
  await expect(editorBlock.locator('[data-action="block-style-bold"]')).toHaveClass(/active/);
  await editorBlock.locator('[data-action="block-style-bold"]').click();
  await expect(editorInput.evaluate((node) => node.innerHTML)).resolves.not.toMatch(/<strong>echo<\/strong>/);
  await selectRichTextRange(editorInput, 0, 4);
  await editorBlock.locator('[data-action="block-style-bold"]').click();
  await expect(editorInput.evaluate((node) => node.innerHTML)).resolves.toMatch(/<strong>echo<\/strong> 'ok'/);

  const editorValueAfterBold = await editorInput.evaluate((node) => node.textContent || "");
  const okStart = editorValueAfterBold.indexOf("'ok'");
  await selectRichTextRange(editorInput, okStart, okStart + 4);
  await editorBlock.locator('[data-action="block-style-italic"]').click();
  await expect(editorInput.evaluate((node) => node.innerHTML)).resolves.toMatch(/<strong>echo<\/strong> <em>'ok'<\/em>/);

  const valueBeforeColor = await editorInput.evaluate((node) => node.textContent || "");
  await selectRichTextRange(editorInput, 0, valueBeforeColor.length);
  await editorBlock.locator('[data-action="open-tone-picker"]').click();
  await page.locator('.tone-picker-option[data-tone-id="tone-coral"]').click();
  const editorHtmlAfterTone = await editorInput.evaluate((node) => node.innerHTML);
  expect(editorHtmlAfterTone).toMatch(/<span class="inline-tone-coral">.*<strong>echo<\/strong>.*<em>'ok'<\/em>.*<\/span>/);
  await selectRichTextRange(editorInput, 0, valueBeforeColor.length);
  await expect(editorBlock.locator('[data-action="open-tone-picker"]')).toHaveClass(/active/);
  await editorBlock.locator('[data-action="open-tone-picker"]').click();
  await page.locator('.tone-picker-option[data-tone-id="tone-default"]').click();
  await expect(editorInput.evaluate((node) => node.innerHTML)).resolves.not.toMatch(/inline-tone-coral/);
  await selectRichTextRange(editorInput, 0, valueBeforeColor.length);
  await editorBlock.locator('[data-action="open-tone-picker"]').click();
  await page.locator('.tone-picker-option[data-tone-id="tone-coral"]').click();
  await expect(editorInput.evaluate((node) => node.innerHTML)).resolves.toMatch(/inline-tone-coral/);

  const currentValue = await editorInput.evaluate((node) => node.textContent || "");
  await selectRichTextRange(editorInput, 0, currentValue.length);
  await editorBlock.locator('[data-action="block-style-indent"]').click();
  await expect(editorInput).toContainText("echo 'ok'");

  await saveEditor(page);
  await advanceStep(page);
  await expect(page.locator(".lesson-card .terminal-box strong")).toContainText("echo");
  await expect(page.locator(".lesson-card .terminal-box em")).toContainText("'ok'");
  await expect(page.locator(".lesson-card .terminal-box .inline-tone-coral")).toContainText("echo");
  await page.waitForTimeout(250);

  const snapshotJson = await page.evaluate(() => localStorage.getItem("aralearn_project_v1") || "");
  expect(snapshotJson).toMatch(/<strong>\s*echo<\/strong>/);
  expect(snapshotJson).toContain("<em>'ok'</em>");
  expect(snapshotJson).toContain("inline-tone-coral");
  expect(snapshotJson).toContain("\"kind\":\"editor\"");

  await openEditorForCurrentStep(page);
  const reopenedEditor = page.locator('.builder-block[data-block-kind="editor"]').first().locator("[data-terminal-template]").first();
  await expect(reopenedEditor).toContainText("echo 'ok'");
});

test("depois de digitar no editor autoral do terminal, ainda dá para focar e editar outro contêiner", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator('[data-action="palette-add"][data-block-type="editor"]').click();
  await page.locator('[data-action="palette-add"][data-block-type="paragraph"]').click();

  const editorBlock = page.locator('.builder-block[data-block-kind="editor"]').first();
  const paragraphBlock = page.locator('.builder-block[data-block-kind="paragraph"]').first();
  const editorInput = editorBlock.locator("[data-terminal-template]").first();
  const paragraphInput = paragraphBlock.locator("[data-block-rich-input]").first();

  await editorInput.click();
  await page.keyboard.type('print("ok")');
  await expect(editorInput).toContainText('print("ok")');

  await paragraphInput.click();
  await page.keyboard.type("Texto livre");

  await expect(paragraphInput).toContainText("Texto livre");
  await expect(paragraphBlock).toHaveClass(/is-active/);
  await expect(editorBlock).toHaveClass(/is-muted/);
});

test("clicar na superfície de outro contêiner ativa o bloco e foca o primeiro campo editável", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator('[data-action="palette-add"][data-block-type="paragraph"]').click();
  await page.locator('[data-action="palette-add"][data-block-type="table"]').click();

  const paragraphBlock = page.locator('.builder-block[data-block-kind="paragraph"]').first();
  const tableBlock = page.locator('.builder-block[data-block-kind="table"]').first();
  await paragraphBlock.locator("[data-block-rich-input]").first().click();

  await expect(paragraphBlock).toHaveClass(/is-active/);
  await expect(tableBlock).toHaveClass(/is-muted/);

  await tableBlock.dispatchEvent("click");

  await expect(tableBlock).toHaveClass(/is-active/);
  await expect(paragraphBlock).toHaveClass(/is-muted/);
  await expect(tableBlock.locator("[data-table-title]")).toBeFocused();
});

test("controles de alinhamento da tabela acompanham a célula ativa ao trocar de foco", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator('[data-action="palette-add"][data-block-type="table"]').click();
  const tableBlock = page.locator('.builder-block[data-block-kind="table"]').first();

  await tableBlock.locator('[data-table-header-cell]').first().click();
  await tableBlock.locator('[data-action="table-align-left"]').click();
  await expect(tableBlock.locator('[data-action="table-align-left"]')).toHaveClass(/active/);
  await expect(tableBlock.locator('[data-action="table-align-right"]')).not.toHaveClass(/active/);

  await tableBlock.locator('[data-action="table-add-column"]').click();
  await tableBlock.locator('[data-table-header-cell]').nth(1).click();

  await expect(tableBlock.locator('[data-action="table-align-left"]')).toHaveClass(/active/);
  await expect(tableBlock.locator('[data-action="table-align-right"]')).not.toHaveClass(/active/);
});

test("alternar entre Opções e Digitação preserva a configuração já editada dos dois modos", async ({ page }) => {
  const snapshot = createSampleProjectSnapshot();
  snapshot.content.courses[0].modules[0].lessons[0].steps[0] = {
    id: "step-editor-mode-switch",
    type: "content",
    title: "MODE SWITCH",
    blocks: [
      { id: "block-switch-heading", kind: "heading", value: "MODE SWITCH" },
      {
        id: "block-switch-editor",
        kind: "editor",
        interactionMode: "choice",
        value: 'print([[Ada]])',
        options: [
          { id: "opt-switch-ada", value: '"Ada Lovelace"', enabled: true, displayOrder: 0 }
        ]
      },
      { id: "block-switch-button", kind: "button", popupEnabled: false, popupBlocks: [] }
    ]
  };

  await seedProject(page, snapshot);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await openEditorForCurrentStep(page);

  const editorBlock = page.locator('.builder-block[data-block-kind="editor"]').first();
  const choiceInput = editorBlock.locator('[data-terminal-option="true"]').first();
  await choiceInput.fill('"Ada Byron"');

  await editorBlock.locator('[data-editor-interaction][value="input"]').check();
  await expect(editorBlock.locator("[data-terminal-template]").first()).toContainText('"Ada Byron"');
  const slotInput = editorBlock.locator('[data-editor-slot-answer="true"]').first();
  await expect(slotInput).toHaveValue('"Ada Byron"');
  await slotInput.fill('"Ada Augusta"');

  await editorBlock.locator('[data-editor-interaction][value="choice"]').check();
  await expect(editorBlock.locator('[data-terminal-option="true"]').first()).toHaveValue('"Ada Augusta"');

  await editorBlock.locator('[data-editor-interaction][value="input"]').check();
  await expect(editorBlock.locator('[data-editor-slot-answer="true"]').first()).toHaveValue('"Ada Augusta"');
});

test("modo Digitação mantém variantes e toggle de regex por lacuna", async ({ page }) => {
  const snapshot = createSampleProjectSnapshot();
  snapshot.content.courses[0].modules[0].lessons[0].steps[0] = {
    id: "step-editor-input-variants",
    type: "content",
    title: "INPUT VARIANTS",
    blocks: [
      { id: "block-input-heading", kind: "heading", value: "INPUT VARIANTS" },
      {
        id: "block-input-editor",
        kind: "editor",
        interactionMode: "input",
        value: "print([[4/2]])",
        options: [
          { id: "opt-input-main", value: "4/2", enabled: true, displayOrder: 0, regex: false, variants: [] }
        ]
      },
      { id: "block-input-button", kind: "button", popupEnabled: false, popupBlocks: [] }
    ]
  };

  await seedProject(page, snapshot);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await openEditorForCurrentStep(page);

  const editorBlock = page.locator('.builder-block[data-block-kind="editor"]').first();
  await expect(editorBlock.locator('[data-action="terminal-start-drag"]')).toHaveCount(1);
  await expect(editorBlock.locator('[data-action="terminal-toggle-option"]')).toHaveCount(1);
  await expect(editorBlock.locator(".choice-index-pill")).toHaveCount(0);
  await editorBlock.locator('[data-action="editor-slot-add-variant"]').click();
  await expect(editorBlock.locator('[data-editor-slot-variant="true"]')).toHaveCount(1);

  const regexToggle = editorBlock.locator('[data-action="editor-slot-toggle-regex"]').first();
  await expect(regexToggle).toContainText("(.*)");
  await regexToggle.click();
  await expect(regexToggle).toHaveAttribute("aria-pressed", "true");
});

test("preserva quebra simples no parágrafo e no editor, inclusive antes da lacuna", async ({ page }) => {
  const snapshot = createSampleProjectSnapshot();
  snapshot.content.courses[0].modules[0].lessons[0].steps[0] = {
    id: "step-line-breaks",
    type: "content",
    title: "LINE BREAKS",
    blocks: [
      { id: "block-line-heading", kind: "heading", value: "LINE BREAKS" },
      {
        id: "block-line-paragraph",
        kind: "paragraph",
        value: "Line one\nLine two",
        richText: "Line oneLine two"
      },
      {
        id: "block-line-editor",
        kind: "editor",
        value: 'print(\"Ada\")\n[[print]](\"Born 1815\")',
        options: [
          { id: "opt-line-print", value: "print", enabled: true, displayOrder: 0 }
        ]
      },
      { id: "block-line-button", kind: "button", popupEnabled: false, popupBlocks: [] }
    ]
  };

  await seedProject(page, snapshot);
  await openFirstCourse(page);
  await openFirstLesson(page);

  const paragraphHtml = await page.locator(".lesson-card .rich-text p").first().evaluate((node) => node.innerHTML);
  expect(paragraphHtml).toContain("Line one<br>Line two");

  const terminal = page.locator(".lesson-card .exercise-terminal").first();
  await expect(terminal).toContainText('print("Ada")');
  const terminalHtml = await terminal.evaluate((node) => node.innerHTML);
  expect(terminalHtml).toMatch(/<br>\s*<button class="terminal-slot/);
});
