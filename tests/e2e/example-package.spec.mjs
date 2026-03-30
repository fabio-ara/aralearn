import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const examplePackagePath = path.resolve(__dirname, "../../examples/python-getting-started.zip");

test("importa o pacote de exemplo de Python como conteúdo semântico", async ({ page }) => {
  await page.goto("/");
  const bundledTitles = await page.evaluate(() => window.AraLearnBundledContent.content.courses.map((course) => course.title));
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
  await expect(page.locator(".course-card")).toHaveCount(bundledTitles.length);
  for (const bundledTitle of bundledTitles) {
    await expect(page.locator(`.course-card:has-text("${bundledTitle}")`)).toHaveCount(1);
  }

  await page.locator('[data-action="toggle-side"]').click();
  await page.locator('[data-action="import-json-trigger"]').click();

  const promptPromise = page.waitForEvent("dialog");
  await page.locator("#import-json-file").setInputFiles(examplePackagePath);
  const prompt = await promptPromise;
  expect(prompt.type()).toBe("prompt");
  await prompt.accept("mesclar");

  const alertPromise = page.waitForEvent("dialog");
  const alert = await alertPromise;
  expect(alert.message()).toContain("Projeto mesclado");
  await alert.accept();

  await expect(page.locator('.course-card:has-text("Python")')).toHaveCount(1);
  await page.locator('.course-card:has-text("Python") [data-action="open-course"]').click();
  await expect(page.locator(".module-card")).toContainText("Getting started");

  const snapshot = await page.evaluate(() => {
    const raw = localStorage.getItem("aralearn_project_v1");
    return raw ? JSON.parse(raw) : null;
  });

  expect(snapshot).toBeTruthy();
  expect(snapshot.content.courses).toHaveLength(bundledTitles.length + 1);
  bundledTitles.forEach((bundledTitle) => {
    expect(snapshot.content.courses.some((course) => course.title === bundledTitle)).toBeTruthy();
  });
  const pythonCourse = snapshot.content.courses.find((course) => course.title === "Python");
  expect(pythonCourse).toBeTruthy();
  expect(pythonCourse.modules).toHaveLength(1);
  expect(pythonCourse.modules[0].title).toBe("Getting started");

  const lessons = pythonCourse.modules[0].lessons;
  expect(lessons.map((lesson) => lesson.title)).toEqual([
    "Intro",
    "Strings",
    "Numbers",
    "Library",
    "Joining strings",
    "Expressions",
    "Cycling club",
    "Comments",
    "Mei's quiz"
  ]);
  expect(lessons.map((lesson) => lesson.steps.length)).toEqual([7, 14, 11, 9, 8, 7, 8, 8, 10]);
  expect(snapshot.assets).toEqual({});

  const joiningStrings = lessons.find((lesson) => lesson.title === "Joining strings");
  const joiningChoiceEditor = joiningStrings.steps
    .find((step) => step.id === "python-joining-strings-step-01")
    .blocks.find((block) => block.kind === "editor");
  expect(joiningChoiceEditor.options).toHaveLength(4);
  expect(joiningChoiceEditor.options.some((option) => option.enabled === false)).toBeTruthy();
  expect(
    joiningChoiceEditor.options.some((option) => option.enabled !== false && Number(option.displayOrder) > 0)
  ).toBeTruthy();

  const expressions = lessons.find((lesson) => lesson.title === "Expressions");
  const expressionsChoice = expressions.steps
    .find((step) => step.id === "python-expressions-step-07")
    .blocks.find((block) => block.kind === "multiple_choice");
  expect(expressionsChoice.options).toHaveLength(3);
  expect(expressionsChoice.options.some((option) => option.answer)).toBeTruthy();
  expect(expressionsChoice.options[0].answer).toBeFalsy();

  const comments = lessons.find((lesson) => lesson.title === "Comments");
  const commentsEditor = comments.steps
    .find((step) => step.id === "python-comments-step-04")
    .blocks.find((block) => block.kind === "editor");
  expect(commentsEditor.options).toHaveLength(4);
  expect(commentsEditor.options.filter((option) => option.enabled !== false)).toHaveLength(4);
  expect(commentsEditor.options.filter((option) => option.value === "#")).toHaveLength(2);

  const commentsEggs = comments.steps
    .find((step) => step.id === "python-comments-step-05")
    .blocks.find((block) => block.kind === "editor");
  expect(commentsEggs.value).toContain("[[# Eggs]]");
  expect(commentsEggs.value).toContain("[[6 * 0.25]]");
  expect(commentsEggs.options).toHaveLength(2);

  const commentsPlayerInfo = comments.steps
    .find((step) => step.id === "python-comments-step-06")
    .blocks.find((block) => block.kind === "editor");
  expect(commentsPlayerInfo.value).toContain("# [[Player info]]");
  expect(commentsPlayerInfo.value).toContain("# [[Achievements]]");
  expect(commentsPlayerInfo.value).toContain("# [[Settings]]");
  expect(commentsPlayerInfo.options).toHaveLength(3);

  const commentsPopupRichParagraph = comments.steps
    .find((step) => step.id === "python-comments-step-01")
    .blocks.find((block) => block.kind === "button")
    .popupBlocks.find((block) => block.id === "python-comments-step-01-popup-body-02");
  expect(commentsPopupRichParagraph.value).toBe("Python still runs only the print() line.");
  expect(commentsPopupRichParagraph.richText).toContain('<span class="inline-tone-gold">print()</span>');

  const cyclingClub = lessons.find((lesson) => lesson.title === "Cycling club");
  const cyclingTerrainCopy = cyclingClub.steps
    .find((step) => step.id === "python-cycling-club-step-03")
    .blocks.find((block) => block.id === "python-cycling-club-step-03-copy-02");
  expect(cyclingTerrainCopy.value).toBe("Add the missing string so the screen says Terrain: hilly.");
  expect(cyclingTerrainCopy.richText).toContain('<span class="inline-tone-gold">Terrain: hilly</span>');

  const cyclingTerrain = cyclingClub.steps
    .find((step) => step.id === "python-cycling-club-step-03")
    .blocks.find((block) => block.kind === "editor");
  expect(cyclingTerrain.value).toContain('"[[hilly]]"');
  expect(cyclingTerrain.options).toHaveLength(1);
  expect(cyclingTerrain.options[0].value).toBe("hilly");

  const cyclingTitleCopy = cyclingClub.steps
    .find((step) => step.id === "python-cycling-club-step-06")
    .blocks.find((block) => block.id === "python-cycling-club-step-06-copy-02");
  expect(cyclingTitleCopy.value).toBe("Insert the string Cycling news.");
  expect(cyclingTitleCopy.richText).toContain('<span class="inline-tone-gold">Cycling news</span>');

  const cyclingTimeEditor = cyclingClub.steps
    .find((step) => step.id === "python-cycling-club-step-04")
    .blocks.find((block) => block.kind === "editor");
  expect(cyclingTimeEditor.interactionMode).toBe("choice");
  expect(cyclingTimeEditor.value).toContain('"[[10]]" [[+]] "[[:]]" [[+]] "[[30]]"');
  expect(cyclingTimeEditor.options.filter((option) => option.enabled !== false)).toHaveLength(5);
  expect(cyclingTimeEditor.options.filter((option) => option.value === "+")).toHaveLength(2);
  expect(cyclingTimeEditor.options.some((option) => option.value === "10:30" && option.enabled === false)).toBeTruthy();

  const meisQuiz = lessons.find((lesson) => lesson.title === "Mei's quiz");
  const meisQuizCommentCopy = meisQuiz.steps
    .find((step) => step.id === "python-meis-quiz-step-01")
    .blocks.find((block) => block.id === "python-meis-quiz-step-01-copy-02");
  expect(meisQuizCommentCopy.value).toBe("Mark the line as a comment with #.");
  expect(meisQuizCommentCopy.richText).toContain('<span class="inline-tone-gold">#</span>');

  const meisQuizGenreCopy = meisQuiz.steps
    .find((step) => step.id === "python-meis-quiz-step-02")
    .blocks.find((block) => block.id === "python-meis-quiz-step-02-copy-01");
  expect(meisQuizGenreCopy.value).toBe("Display the library's third most popular genre: 3. Romance.");
  expect(meisQuizGenreCopy.richText).toContain('<span class="inline-tone-gold">3. Romance</span>');

  const meisQuizExpression = meisQuiz.steps
    .find((step) => step.id === "python-meis-quiz-step-04")
    .blocks.find((block) => block.kind === "editor");
  expect(meisQuizExpression.interactionMode).toBe("choice");
  expect(meisQuizExpression.value).toContain("[[460]] [[/]] [[2500]]");
  expect(meisQuizExpression.options).toHaveLength(4);

  const commentsEggsCopy = comments.steps
    .find((step) => step.id === "python-comments-step-05")
    .blocks.find((block) => block.id === "python-comments-step-05-copy-01");
  expect(commentsEggsCopy.value).toBe("Add a comment of Eggs and display the cost of six eggs at 25 cents each: 6 * 0.25.");
  expect(commentsEggsCopy.richText).toContain('<span class="inline-tone-gold">6 * 0.25</span>');

  const meisQuizQuotes = meisQuiz.steps
    .find((step) => step.id === "python-meis-quiz-step-06")
    .blocks.find((block) => block.kind === "editor");
  expect(meisQuizQuotes.interactionMode).toBe("choice");
  expect(meisQuizQuotes.options.filter((option) => option.value === '"')).toHaveLength(2);
  expect(meisQuizQuotes.options.filter((option) => option.value === "'")).toHaveLength(2);

  const meisQuizChoice = meisQuiz.steps
    .find((step) => step.id === "python-meis-quiz-step-10")
    .blocks.find((block) => block.kind === "multiple_choice");
  expect(meisQuizChoice.options).toHaveLength(2);
  expect(meisQuizChoice.options.some((option) => option.answer)).toBeTruthy();

  const serialized = JSON.stringify(snapshot.content);
  expect(serialized).toContain("\"kind\":\"editor\"");
  expect(serialized).toContain("\"kind\":\"simulator\"");
  expect(serialized).toContain("\"kind\":\"multiple_choice\"");
  expect(serialized).toContain("inline-tone-gold");
  expect(serialized.includes("buttonText")).toBeFalsy();
  expect(serialized.includes("\"value\":\"CONTINUAR\"")).toBeFalsy();
  expect(serialized.includes("\"value\":\"CONCLUIR\"")).toBeFalsy();
});
