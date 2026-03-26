import { test, expect } from "@playwright/test";
import { createSampleProjectSnapshot, openFirstCourse, openFirstLesson, seedProject } from "./helpers/app.mjs";

test("editor em modo digitação permite escrever direto na lacuna e valida a resposta", async ({ page }) => {
  const snapshot = createSampleProjectSnapshot();
  snapshot.content.courses[0].modules[0].lessons[0].steps = [
    {
      id: "typed-step",
      type: "content",
      title: "COMPLETE THE CODE",
      blocks: [
        { id: "typed-heading", kind: "heading", value: "COMPLETE THE CODE" },
        {
          id: "typed-paragraph",
          kind: "paragraph",
          value: "Display 4 divided by 2.",
          richText: "Display <span class=\"inline-tone-gold\">4</span> divided by <span class=\"inline-tone-gold\">2</span>."
        },
        {
          id: "typed-editor",
          kind: "editor",
          interactionMode: "input",
          value: "<span class=\"inline-tone-gold\">print</span>([[4/2]])",
          options: [
            {
              id: "typed-answer",
              value: "4/2",
              enabled: true,
              displayOrder: 0,
              regex: false,
              variants: [
                { id: "typed-variant", value: "1 + 1", regex: false }
              ]
            }
          ],
        },
        {
          id: "typed-button",
          kind: "button",
          popupEnabled: true,
          popupBlocks: [
            { id: "typed-popup-heading", kind: "heading", value: "Boa!" },
            { id: "typed-popup-output", kind: "editor", value: "2.0", options: [] }
          ]
        }
      ]
    }
  ];
  await seedProject(page, snapshot);

  await openFirstCourse(page);
  await openFirstLesson(page);

  const inlineInput = page.locator('[data-terminal-inline-input="true"]').first();
  const inlineSlot = page.locator('[data-terminal-inline-input="true"]').first().locator("xpath=ancestor::span[contains(@class,'terminal-slot')][1]");
  await expect(inlineInput).toBeVisible();
  await expect(inlineInput).not.toHaveAttribute("list", /.+/);
  await expect(inlineSlot).toHaveClass(/empty/);
  await inlineInput.fill("1 + 1");
  await expect(inlineSlot).toHaveClass(/filled/);

  await page.locator('[data-action="step-button-click"]').click();
  await expect(page.locator(".inline-popup")).toBeVisible();
  await expect(page.locator(".inline-popup .terminal-box")).toContainText("2.0");
});
