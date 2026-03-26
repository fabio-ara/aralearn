import { test, expect } from "@playwright/test";
import { resetApp, openFirstCourse, openFirstLesson, advanceStep } from "./helpers/app.mjs";

test("retoma a lição no step salvo após recarregar a página", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);

  await expect(page.locator(".step-image")).toHaveCount(1);
  await advanceStep(page);
  await expect(page.locator(".lesson-title")).toContainText("FILL IN THE BLANKS");

  await page.reload();
  await openFirstCourse(page);
  await openFirstLesson(page);
  await expect(page.locator(".lesson-title")).toContainText("FILL IN THE BLANKS");
});
