import { test, expect } from "@playwright/test";
import {
  resetApp,
  advanceStep,
  insertStepAfter,
  openFirstCourse,
  openFirstLesson,
  saveEditor,
  seedProject,
  createSampleProjectSnapshot
} from "./helpers/app.mjs";

test("popup inline respeita a largura da viewport no mobile", async ({ page }, testInfo) => {
  test.skip(!/mobile/i.test(testInfo.project.name), "Somente na viewport mobile.");

  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);

  await page.locator("[data-button-popup]").check();
  await page.locator('[data-action="button-edit-popup"]').click();
  await page.locator('.popup-builder-overlay [data-action="palette-add"][data-block-type="paragraph"]').click();
  await page
    .locator('.popup-builder-overlay .builder-block[data-block-kind="paragraph"] [data-block-rich-input]')
    .first()
    .fill("Conteúdo do popup.");
  await page.locator('[data-action="popup-builder-save"]').click();
  await saveEditor(page);
  await advanceStep(page);

  const card = page.locator(".lesson-card").first();
  const cardBefore = await card.boundingBox();
  await page.locator('[data-action="step-button-click"]').click();

  const overlay = page.locator(".inline-popup").first();
  await expect(overlay).toBeVisible();
  await expect(page.locator('.lesson-action-shell [data-action="step-button-click"]')).toHaveCount(0);

  const bounds = await overlay.boundingBox();
  const cardAfter = await card.boundingBox();
  const actionButton = overlay.locator("button").last();
  await expect(actionButton).toBeVisible();
  const actionBounds = await actionButton.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(cardBefore).not.toBeNull();
  expect(cardAfter).not.toBeNull();
  expect(actionBounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect((bounds && bounds.x) || 0).toBeGreaterThanOrEqual(0);
  expect(((bounds && bounds.x) || 0) + ((bounds && bounds.width) || 0)).toBeLessThanOrEqual((viewport && viewport.width) || 0);
  expect(Math.abs((((bounds && bounds.y) || 0) + ((bounds && bounds.height) || 0)) - ((viewport && viewport.height) || 0))).toBeLessThanOrEqual(32);
  expect(Math.abs(((cardAfter && cardAfter.height) || 0) - ((cardBefore && cardBefore.height) || 0))).toBeLessThanOrEqual(1);
  expect((bounds && bounds.y) || 0).toBeLessThan((((cardAfter && cardAfter.y) || 0) + ((cardAfter && cardAfter.height) || 0)) - 12);
  expect(((actionBounds && actionBounds.x) || 0) + ((actionBounds && actionBounds.width) || 0)).toBeGreaterThan(
    (((bounds && bounds.x) || 0) + ((bounds && bounds.width) || 0)) - 70
  );
});

test("lição longa rola dentro do card enquanto o rodapé fixo permanece no lugar", async ({ page }, testInfo) => {
  test.skip(!/mobile/i.test(testInfo.project.name), "Somente na viewport mobile.");

  const snapshot = createSampleProjectSnapshot();
  snapshot.content.courses[0].modules[0].lessons[0].steps[0] = {
    id: "step-scroll-card",
    type: "content",
    title: "SCROLL",
    blocks: [
      { id: "block-scroll-heading", kind: "heading", value: "SCROLL" },
      {
        id: "block-scroll-paragraph",
        kind: "paragraph",
        value: Array.from({ length: 120 }, (_, index) => `Linha ${index + 1} do conteúdo com texto extra para forçar rolagem interna.`).join("\n"),
        richText: Array.from({ length: 120 }, (_, index) => `Linha ${index + 1} do conteúdo com texto extra para forçar rolagem interna.`).join("<br>")
      },
      { id: "block-scroll-button", kind: "button", popupEnabled: false, popupBlocks: [] }
    ]
  };

  await seedProject(page, snapshot);
  await openFirstCourse(page);
  await openFirstLesson(page);

  const footer = page.locator(".lesson-action-shell");
  const footerBefore = await footer.boundingBox();
  const metricsBefore = await page.locator(".lesson-card-body").first().evaluate((node) => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
    scrollTop: node.scrollTop
  }));

  expect(metricsBefore.scrollHeight).toBeGreaterThan(metricsBefore.clientHeight);
  expect(metricsBefore.scrollTop).toBe(0);

  await page.locator(".lesson-card-body").first().evaluate((node) => {
    node.scrollTop = 220;
  });

  const metricsAfter = await page.locator(".lesson-card-body").first().evaluate((node) => ({
    scrollTop: node.scrollTop
  }));
  const screenContentScrollTop = await page.locator(".lesson-screen .screen-content").evaluate((node) => node.scrollTop);
  const footerAfter = await footer.boundingBox();
  const viewport = page.viewportSize();

  expect(metricsAfter.scrollTop).toBeGreaterThan(0);
  expect(screenContentScrollTop).toBe(0);
  expect(footerBefore).not.toBeNull();
  expect(footerAfter).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(Math.abs((((footerAfter && footerAfter.y) || 0) + ((footerAfter && footerAfter.height) || 0)) - ((viewport && viewport.height) || 0))).toBeLessThanOrEqual(24);
  expect(Math.abs((((footerBefore && footerBefore.y) || 0) + ((footerBefore && footerBefore.height) || 0)) - (((footerAfter && footerAfter.y) || 0) + ((footerAfter && footerAfter.height) || 0)))).toBeLessThanOrEqual(1);
});
