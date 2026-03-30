import { test, expect } from "@playwright/test";

test("snapshot salvo recebe o hardcoded faltante sem apagar o conteúdo do usuário", async ({ page }) => {
  await page.goto("/");
  const bundledTitles = await page.evaluate(() => window.AraLearnBundledContent.content.courses.map((course) => course.title));

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
  for (const bundledTitle of bundledTitles) {
    await expect(page.locator(`.course-card:has-text("${bundledTitle}")`)).toHaveCount(1);
  }
  await expect(page.locator(".course-card")).toHaveCount(bundledTitles.length + 1);

  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem("aralearn_project_v1") || "{}"));
  expect(snapshot.content.courses).toHaveLength(bundledTitles.length + 1);
  bundledTitles.forEach((bundledTitle) => {
    expect(snapshot.content.courses.some((course) => course.title === bundledTitle)).toBeTruthy();
  });
});

test("edições locais do curso hardcoded continuam prevalecendo no armazenamento local", async ({ page }) => {
  await page.goto("/");
  const bundledData = await page.evaluate(() => ({
    course: window.AraLearnBundledContent.content.courses[0],
    titles: window.AraLearnBundledContent.content.courses.map((item) => item.title)
  }));
  const bundledCourse = bundledData.course;
  const otherBundledTitles = bundledData.titles.filter((title) => title !== bundledCourse.title);

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
  for (const bundledTitle of otherBundledTitles) {
    await expect(page.locator(`.course-card:has-text("${bundledTitle}")`)).toHaveCount(1);
  }

  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem("aralearn_project_v1") || "{}"));
  expect(snapshot.content.courses).toHaveLength(bundledData.titles.length);
  const editedCourse = snapshot.content.courses.find((course) => course.id === bundledCourse.id);
  expect(editedCourse).toBeTruthy();
  expect(editedCourse.title).toBe("Curso hardcoded editado localmente");
  expect(editedCourse.description).toBe("Versão alterada pelo usuário");
});
