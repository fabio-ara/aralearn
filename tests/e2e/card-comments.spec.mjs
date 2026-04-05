import { expect, test } from "@playwright/test";
import { openFirstCourse, openFirstLesson, readDownloadedPackage, resetApp } from "./helpers/app.mjs";

test("salva comentário por card e o preserva no export/import do pacote", async ({ page }) => {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);

  const comment = "Comentário pessoal do card.\nLinha 2.";

  await page.locator('[data-action="toggle-step-comment"]').click();
  const commentInput = page.locator("[data-step-comment-input='true']");
  await expect(commentInput).toBeVisible();
  await expect(page.locator(".step-comment-popup")).not.toContainText("Comentário do card");
  await expect(page.locator(".step-comment-popup")).not.toContainText("Limpar");
  await expect(page.locator(".step-comment-popup")).not.toContainText("WELCOME");
  await expect(page.locator(".step-comment-popup").locator("button")).toHaveCount(0);
  const popupBox = await page.locator(".step-comment-popup").boundingBox();
  const shellBox = await page.locator(".step-comment-shell").boundingBox();
  const cardBox = await page.locator(".lesson-card").boundingBox();
  expect(popupBox).toBeTruthy();
  expect(shellBox).toBeTruthy();
  expect(cardBox).toBeTruthy();
  expect(Math.abs((shellBox && shellBox.width) - (cardBox && cardBox.width))).toBeLessThan(6);
  expect((popupBox && popupBox.width) || 0).toBeLessThanOrEqual((shellBox && shellBox.width) || 0);
  await commentInput.fill(comment);
  await page.locator('[data-action="toggle-step-comment"]').click();

  await expect(page.locator('[data-action="toggle-step-comment"]')).toHaveClass(/has-comment/);
  await expect.poll(async () => {
    return page.evaluate(() => {
      const snapshot = JSON.parse(localStorage.getItem("aralearn_project_v1") || "null");
      return snapshot &&
        snapshot.content &&
        snapshot.content.courses &&
        snapshot.content.courses[0] &&
        snapshot.content.courses[0].modules &&
        snapshot.content.courses[0].modules[0] &&
        snapshot.content.courses[0].modules[0].lessons &&
        snapshot.content.courses[0].modules[0].lessons[0] &&
        snapshot.content.courses[0].modules[0].lessons[0].steps &&
        snapshot.content.courses[0].modules[0].lessons[0].steps[0]
        ? snapshot.content.courses[0].modules[0].lessons[0].steps[0].comment || ""
        : "";
    });
  }).toBe(comment);

  await page.locator('[data-action="lesson-home"]').click();
  await page.locator('[data-action="toggle-side"]').click();

  const downloadPromise = page.waitForEvent("download");
  await page.locator('[data-action="export-json"]').click();
  const download = await downloadPromise;
  const payload = await readDownloadedPackage(download);
  expect(payload.courses[0].modules[0].lessons[0].steps[0].comment).toBe(comment);

  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();

  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();

  await page.locator('[data-action="toggle-side"]').click();
  await page.locator('[data-action="import-json-trigger"]').click();
  const promptPromise = page.waitForEvent("dialog");
  await page.locator("#import-json-file").setInputFiles(downloadPath);
  const prompt = await promptPromise;
  expect(prompt.type()).toBe("prompt");
  await prompt.accept("substituir");

  await expect.poll(async () => {
    return page.evaluate(() => {
      const snapshot = JSON.parse(localStorage.getItem("aralearn_project_v1") || "null");
      return snapshot &&
        snapshot.content &&
        snapshot.content.courses &&
        snapshot.content.courses[0] &&
        snapshot.content.courses[0].modules &&
        snapshot.content.courses[0].modules[0] &&
        snapshot.content.courses[0].modules[0].lessons &&
        snapshot.content.courses[0].modules[0].lessons[0] &&
        snapshot.content.courses[0].modules[0].lessons[0].steps &&
        snapshot.content.courses[0].modules[0].lessons[0].steps[0]
        ? snapshot.content.courses[0].modules[0].lessons[0].steps[0].comment || ""
        : "";
    });
  }, { timeout: 10000 }).toBe(comment);

  await openFirstCourse(page);
  await openFirstLesson(page);
  await page.locator('[data-action="toggle-step-comment"]').click();
  await expect(page.locator("[data-step-comment-input='true']")).toHaveValue(comment);
});
