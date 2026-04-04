import { test, expect } from "@playwright/test";
import { resetApp, openFirstCourse, openFirstLesson } from "./helpers/app.mjs";

function skipIfNoTouch(testInfo) {
  test.skip(!testInfo.project.use.hasTouch, "Cobertura focada no fluxo touch/mobile.");
}

test("insets Android elevam o rodapé fixo e o popover de comentário", async ({ page }, testInfo) => {
  skipIfNoTouch(testInfo);

  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("aralearn:android-insets", {
      detail: { left: 0, top: 0, right: 0, bottom: 0, extraGestureBottom: 24 }
    }));
  });

  await expect.poll(async () => {
    return page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--android-extra-gesture-bottom").trim()
    );
  }).toBe("24px");

  const actionPadding = await page.locator(".lesson-action-shell").evaluate((node) =>
    Math.round(parseFloat(getComputedStyle(node).paddingBottom || "0"))
  );
  expect(actionPadding).toBe(32);

  await page.locator('[data-action="toggle-step-comment"]').click();
  await expect(page.locator(".step-comment-popup")).toBeVisible();

  const commentPadding = await page.locator(".step-comment-layer").evaluate((node) =>
    Math.round(parseFloat(getComputedStyle(node).paddingBottom || "0"))
  );
  expect(commentPadding).toBe(100);
});

test("CTA de progresso continua abrindo popup no fluxo touch com insets Android ativos", async ({ page }, testInfo) => {
  skipIfNoTouch(testInfo);

  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("aralearn:android-insets", {
      detail: { left: 0, top: 0, right: 0, bottom: 0, extraGestureBottom: 24 }
    }));
  });

  await page.locator('[data-action="step-button-click"]').tap();
  await page.locator('[data-action="step-button-click"]').tap();
  await expect(page.locator(".inline-popup")).toBeVisible();
});
