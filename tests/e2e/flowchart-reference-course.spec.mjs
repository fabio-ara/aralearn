import { test, expect } from "@playwright/test";
import { resetToEmptyApp } from "./helpers/app.mjs";

test("app inicia com o curso hardcoded quando não existe snapshot salvo", async ({ page }) => {
  await resetToEmptyApp(page);
  const bundledTitle = await page.evaluate(() => window.AraLearnBundledContent.content.courses[0].title);

  await expect(page.locator(".course-card")).toHaveCount(1);
  await expect(page.locator(".course-card")).toContainText(bundledTitle);
  await expect(page.locator("text=Nenhum curso.")).toHaveCount(0);
});
