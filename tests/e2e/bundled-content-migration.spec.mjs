import { test, expect } from "@playwright/test";

test("snapshot salvo recebe o hardcoded faltante sem apagar o conteúdo do usuário", async ({ page }) => {
  await page.goto("/");
  const bundledTitle = await page.evaluate(() => window.AraLearnBundledContent.content.courses[0].title);

  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("aralearn_project_v1", JSON.stringify({
      content: {
        appTitle: "AraLearn",
        courses: [
          {
            id: "curso-autoral",
            title: "Curso autoral",
            description: "Conteúdo do usuário",
            modules: []
          }
        ]
      },
      progress: { lessons: [] },
      assets: {},
      updatedAt: new Date().toISOString()
    }));
  });

  await page.reload();

  await expect(page.locator('.course-card:has-text("Curso autoral")')).toHaveCount(1);
  await expect(page.locator(`.course-card:has-text("${bundledTitle}")`)).toHaveCount(1);
  await expect(page.locator(".course-card")).toHaveCount(2);

  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem("aralearn_project_v1") || "{}"));
  expect(snapshot.content.courses).toHaveLength(2);
  expect(snapshot.content.courses.some((course) => course.title === bundledTitle)).toBeTruthy();
});

test("edições locais do curso hardcoded continuam prevalecendo no armazenamento local", async ({ page }) => {
  await page.goto("/");
  const bundledCourse = await page.evaluate(() => window.AraLearnBundledContent.content.courses[0]);

  await page.evaluate((course) => {
    localStorage.clear();
    localStorage.setItem("aralearn_project_v1", JSON.stringify({
      content: {
        appTitle: "AraLearn",
        courses: [
          {
            id: course.id,
            title: "Curso hardcoded editado localmente",
            description: "Versão alterada pelo usuário",
            modules: []
          }
        ]
      },
      progress: { lessons: [] },
      assets: {},
      updatedAt: new Date().toISOString()
    }));
  }, bundledCourse);

  await page.reload();

  await expect(page.locator('.course-card:has-text("Curso hardcoded editado localmente")')).toHaveCount(1);
  await expect(page.locator(`.course-card:has-text("${bundledCourse.title}")`)).toHaveCount(0);

  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem("aralearn_project_v1") || "{}"));
  expect(snapshot.content.courses).toHaveLength(1);
  expect(snapshot.content.courses[0].title).toBe("Curso hardcoded editado localmente");
  expect(snapshot.content.courses[0].description).toBe("Versão alterada pelo usuário");
});
