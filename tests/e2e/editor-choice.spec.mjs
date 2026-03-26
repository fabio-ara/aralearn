import { test, expect } from "@playwright/test";
import { createSampleProjectSnapshot, openFirstCourse, openFirstLesson, seedProject } from "./helpers/app.mjs";

test("editor em modo opções respeita duplicatas, permite mirar lacuna e aceita preenchimento fora de ordem", async ({ page }) => {
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
  await expect(
    page.locator(".token-option").evaluateAll((nodes) => nodes.filter((node) => node.textContent.trim() === "#").length)
  ).resolves.toBe(2);

  await slot2.click();
  await expect(slot2).toHaveClass(/is-active/);
  await page.locator(".token-option", { hasText: "#" }).first().click();
  await expect(slot2).toContainText("#");
  await expect(slot0).toHaveClass(/empty/);
  await expect(
    page.locator(".token-option").evaluateAll((nodes) => nodes.filter((node) => node.textContent.trim() === "#").length)
  ).resolves.toBe(1);

  await page.locator(".token-option", { hasText: "Cookies" }).click();
  await expect(slot3).toContainText("Cookies");
  await expect(slot0).toHaveClass(/empty/);

  await page.locator(".token-option", { hasText: "Pies" }).click();
  await expect(slot1).toContainText("Pies");

  await page.locator(".token-option", { hasText: "#" }).click();
  await expect(slot0).toContainText("#");

  await page.locator('[data-action="step-button-click"]').click();
  await expect(page.locator(".inline-popup")).toBeVisible();
  await expect(page.locator(".inline-popup .terminal-box")).toContainText("Menu");
});
