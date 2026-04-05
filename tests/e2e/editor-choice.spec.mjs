import { test, expect } from "@playwright/test";
import { createSampleProjectSnapshot, openFirstCourse, openFirstLesson, seedProject } from "./helpers/app.mjs";

test("editor em modo opções respeita duplicatas, começa pela primeira lacuna vazia e avança em ordem", async ({ page }) => {
  const snapshot = createSampleProjectSnapshot();
  snapshot.content.courses[0].modules[0].lessons[0].steps = [
    {
      id: "choice-step",
      type: "content",
      title: "FILL IN THE BLANKS",
      blocks: [
        { id: "choice-heading", kind: "heading", value: "FILL IN THE BLANKS" },
        {
          id: "choice-paragraph",
          kind: "paragraph",
          value: "Write a comment of Pies then Cookies.",
          richText:
            "Write a comment of <span class=\"inline-tone-gold\">Pies</span> then <span class=\"inline-tone-gold\">Cookies</span>."
        },
        {
          id: "choice-editor",
          kind: "editor",
          interactionMode: "choice",
          value: '<span class="inline-tone-gold">print</span>("Menu")\n[[#]] [[Pies]]\n<span class="inline-tone-gold">print</span>(4.99)\n[[#]] [[Cookies]]\n<span class="inline-tone-gold">print</span>(2.99)',
          options: [
            { id: "opt-hash-1", value: "#", enabled: true, displayOrder: 0, slotOrder: 0 },
            { id: "opt-hash-2", value: "#", enabled: true, displayOrder: 1, slotOrder: 2 },
            { id: "opt-pies", value: "Pies", enabled: true, displayOrder: 2, slotOrder: 1 },
            { id: "opt-cookies", value: "Cookies", enabled: true, displayOrder: 3, slotOrder: 3 }
          ]
        },
        {
          id: "choice-button",
          kind: "button",
          popupEnabled: true,
          popupBlocks: [
            { id: "choice-popup-heading", kind: "heading", value: "Fantastic!" },
            { id: "choice-popup-output", kind: "editor", value: "Menu\n4.99\n2.99", options: [] }
          ]
        }
      ]
    }
  ];

  await seedProject(page, snapshot);
  await openFirstCourse(page);
  await openFirstLesson(page);

  const slot0 = page.locator('[data-action="terminal-slot"][data-slot-index="0"]');
  const slot1 = page.locator('[data-action="terminal-slot"][data-slot-index="1"]');
  const slot2 = page.locator('[data-action="terminal-slot"][data-slot-index="2"]');
  const slot3 = page.locator('[data-action="terminal-slot"][data-slot-index="3"]');

  await expect(slot0).toHaveClass(/empty/);
  await expect(slot0).toHaveClass(/is-active/);
  await expect(
    page.locator(".token-option").evaluateAll((nodes) => nodes.filter((node) => node.textContent.trim() === "#").length)
  ).resolves.toBe(2);

  await page.locator(".token-option", { hasText: "#" }).first().click();
  await expect(slot0).toContainText("#");
  await expect(slot1).toHaveClass(/is-active/);
  await expect(slot2).toHaveClass(/empty/);
  await expect(
    page.locator(".token-option").evaluateAll((nodes) => nodes.filter((node) => node.textContent.trim() === "#").length)
  ).resolves.toBe(1);

  await slot2.click();
  await expect(slot2).toHaveClass(/is-active/);
  await page.locator(".token-option", { hasText: "#" }).first().click();
  await expect(slot2).toContainText("#");
  await expect(slot1).toHaveClass(/is-active/);
  await expect(
    page.locator(".token-option").evaluateAll((nodes) => nodes.filter((node) => node.textContent.trim() === "#").length)
  ).resolves.toBe(0);

  await page.locator(".token-option", { hasText: "Pies" }).click();
  await expect(slot1).toContainText("Pies");
  await expect(slot3).toHaveClass(/is-active/);

  await page.locator(".token-option", { hasText: "Cookies" }).click();
  await expect(slot3).toContainText("Cookies");

  await page.locator('[data-action="step-button-click"]').click();
  await expect(page.locator(".inline-popup")).toBeVisible();
  await expect(page.locator(".inline-popup .terminal-box")).toContainText("Menu");
});

test("editor em modo opções preserva HTML literal visível e aceita fechamento de tag como resposta", async ({ page }) => {
  const snapshot = createSampleProjectSnapshot();
  snapshot.content.courses[0].modules[0].lessons[0].steps = [
    {
      id: "literal-html-step",
      type: "content",
      title: "Fechando um parágrafo",
      blocks: [
        { id: "literal-html-heading", kind: "heading", value: "Fechando um parágrafo" },
        {
          id: "literal-html-paragraph",
          kind: "paragraph",
          value: "Complete a tag de fechamento correta do elemento de parágrafo."
        },
        {
          id: "literal-html-editor",
          kind: "editor",
          interactionMode: "choice",
          value: "<p>Olá, mundo[[</p>]]",
          options: [
            { id: "opt-h1", value: "</h1>", enabled: false, displayOrder: 0, slotOrder: 1 },
            { id: "opt-p", value: "</p>", enabled: true, displayOrder: 1, slotOrder: 0 },
            { id: "opt-body", value: "</body>", enabled: false, displayOrder: 2, slotOrder: 2 }
          ]
        },
        {
          id: "literal-html-button",
          kind: "button",
          popupEnabled: true,
          popupBlocks: [
            { id: "literal-html-popup-heading", kind: "heading", value: "Boa!" },
            { id: "literal-html-popup-editor", kind: "editor", value: "<p>Olá, mundo</p>", options: [] }
          ]
        }
      ]
    }
  ];

  await seedProject(page, snapshot);
  await openFirstCourse(page);
  await openFirstLesson(page);

  const terminal = page.locator(".terminal-box.exercise-terminal");
  await expect(terminal).toContainText("<p>Olá, mundo");
  await expect(page.locator(".token-option", { hasText: "</p>" })).toBeVisible();

  await page.locator(".token-option", { hasText: "</p>" }).click();
  await expect(page.locator('[data-action="terminal-slot"][data-slot-index="0"]')).toContainText("</p>");

  await page.locator('[data-action="step-button-click"]').click();
  await expect(page.locator(".inline-popup")).toBeVisible();
  await expect(page.locator(".inline-popup .terminal-box")).toContainText("<p>Olá, mundo</p>");
});

test("editor em modo opções permite quebrar respostas longas dentro da própria lacuna", async ({ page }) => {
  const snapshot = createSampleProjectSnapshot();
  const longValue = "proposicao_muito_grande_sem_quebra_visual_".repeat(10);
  snapshot.content.courses[0].modules[0].lessons[0].steps = [
    {
      id: "long-wrap-step",
      type: "content",
      title: "Quebra de lacuna",
      blocks: [
        { id: "long-wrap-heading", kind: "heading", value: "Quebra de lacuna" },
        {
          id: "long-wrap-editor",
          kind: "editor",
          interactionMode: "choice",
          value: "Resultado: [[" + longValue + "]]",
          options: [
            { id: "opt-long", value: longValue, enabled: true, displayOrder: 0, slotOrder: 0 }
          ]
        },
        {
          id: "long-wrap-button",
          kind: "button",
          popupEnabled: false,
          popupBlocks: []
        }
      ]
    }
  ];

  await seedProject(page, snapshot);
  await openFirstCourse(page);
  await openFirstLesson(page);

  await page.locator(".token-option", { hasText: "proposicao_muito_grande_sem_quebra_visual_" }).click();

  const slot = page.locator('[data-action="terminal-slot"][data-slot-index="0"]');
  await expect(slot).toContainText("proposicao_muito_grande_sem_quebra_visual_");

  const metrics = await slot.evaluate((node) => ({
    height: node.getBoundingClientRect().height
  }));

  expect(metrics.height).toBeGreaterThan(44);
});

test("editor em modo opções mantém lacunas preenchidas após validação incompleta", async ({ page }) => {
  const snapshot = createSampleProjectSnapshot();
  snapshot.content.courses[0].modules[0].lessons[0].steps = [
    {
      id: "choice-incomplete-step",
      type: "content",
      title: "INCOMPLETO",
      blocks: [
        { id: "choice-incomplete-heading", kind: "heading", value: "INCOMPLETO" },
        {
          id: "choice-incomplete-editor",
          kind: "editor",
          interactionMode: "choice",
          value: "[[A]] [[B]] [[C]]",
          options: [
            { id: "opt-a", value: "A", enabled: true, displayOrder: 0, slotOrder: 0 },
            { id: "opt-b", value: "B", enabled: true, displayOrder: 1, slotOrder: 1 },
            { id: "opt-c", value: "C", enabled: true, displayOrder: 2, slotOrder: 2 }
          ]
        },
        {
          id: "choice-incomplete-button",
          kind: "button",
          popupEnabled: false,
          popupBlocks: []
        }
      ]
    }
  ];

  await seedProject(page, snapshot);
  await openFirstCourse(page);
  await openFirstLesson(page);

  await page.locator(".token-option", { hasText: "A" }).click();
  await page.locator('[data-action="step-button-click"]').click();

  await expect(page.locator(".inline-feedback.err")).toContainText("Preencha todas as lacunas.");
  await expect(page.locator('[data-action="terminal-slot"][data-slot-index="0"]')).toContainText("A");
  await expect(page.locator('[data-action="terminal-slot"][data-slot-index="1"]')).toContainText("□");

  await page.locator('[data-action="step-button-click"]').click();
  await expect(page.locator('[data-action="terminal-slot"][data-slot-index="0"]')).toContainText("A");
});
