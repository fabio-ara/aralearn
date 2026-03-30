import { test, expect } from "@playwright/test";
import { resetToEmptyApp } from "./helpers/app.mjs";

test("app inicia com todos os cursos embarcados quando não existe snapshot salvo", async ({ page }) => {
  await resetToEmptyApp(page);
  const bundledTitles = await page.evaluate(() => window.AraLearnBundledContent.content.courses.map((course) => course.title));

  await expect(page.locator(".course-card")).toHaveCount(bundledTitles.length);
  for (const bundledTitle of bundledTitles) {
    await expect(page.locator(`.course-card:has-text("${bundledTitle}")`)).toHaveCount(1);
  }
  await expect(page.locator("text=Nenhum curso.")).toHaveCount(0);
});
