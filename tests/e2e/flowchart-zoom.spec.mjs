import { test, expect } from "@playwright/test";
import {
  resetApp,
  openFirstCourse,
  openFirstLesson,
  insertStepAfter,
  saveEditor,
  advanceStep,
  waitForFlowchartReady
} from "./helpers/app.mjs";

async function openGeneratedFlowchartStep(page) {
  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);
  await insertStepAfter(page);
  await page.locator('[data-action="palette-add"][data-block-type="flowchart"]').click();
  for (let index = 0; index < 4; index += 1) {
    await page.locator('[data-action="flowchart-add-node"]').first().click();
  }
  await saveEditor(page);
  await advanceStep(page);
  await waitForFlowchartReady(page);
}

test("controles de zoom ampliam e restauram o quadro do fluxograma", async ({ page }) => {
  await openGeneratedFlowchartStep(page);

  const scroll = page.locator("[data-flowchart-scroll='true']").first();
  const stage = scroll.locator("[data-flowchart-stage='true']").first();
  const zoomValue = page.locator(".flowchart-zoom-value").first();
  const initialZoom = await zoomValue.textContent();

  const beforeWidth = await stage.evaluate((node) => parseFloat(getComputedStyle(node).width));

  await page.locator('[data-action="flowchart-zoom-in"]').first().click();
  await expect(zoomValue).not.toHaveText(initialZoom || "");

  const zoomedWidth = await stage.evaluate((node) => parseFloat(getComputedStyle(node).width));
  expect(zoomedWidth).toBeGreaterThan(beforeWidth);

  for (let index = 0; index < 10; index += 1) {
    await page.locator('[data-action="flowchart-zoom-in"]').first().click();
  }
  await expect(zoomValue).toHaveText("100%");

  for (let index = 0; index < 4; index += 1) {
    await page.locator('[data-action="flowchart-zoom-out"]').first().click();
  }
  const reducedZoom = await zoomValue.textContent();
  expect(Number(String(reducedZoom || "").replace("%", ""))).toBeLessThan(65);

  await page.locator('[data-action="flowchart-zoom-reset"]').first().click();
  await expect(zoomValue).toHaveText(initialZoom || "");

  const resetWidth = await stage.evaluate((node) => parseFloat(getComputedStyle(node).width));
  expect(Math.round(resetWidth)).toBe(Math.round(beforeWidth));
});

test("gesto de pinça altera o zoom do fluxograma no mobile", async ({ page }, testInfo) => {
  test.skip(!/mobile/i.test(testInfo.project.name), "Somente na viewport mobile.");

  await openGeneratedFlowchartStep(page);

  const scroll = page.locator("[data-flowchart-scroll='true']").first();
  const zoomValue = page.locator(".flowchart-zoom-value").first();
  const initialZoom = await zoomValue.textContent();
  expect(initialZoom).not.toBeNull();

  await scroll.evaluate((node) => {
    if (typeof Touch !== "function" || typeof TouchEvent !== "function") return;

    const rect = node.getBoundingClientRect();
    const makeTouch = (identifier, clientX, clientY) => new Touch({
      identifier,
      target: node,
      clientX,
      clientY,
      pageX: clientX,
      pageY: clientY,
      radiusX: 2,
      radiusY: 2,
      rotationAngle: 0,
      force: 1
    });

    const firstA = makeTouch(1, rect.left + 60, rect.top + 80);
    const firstB = makeTouch(2, rect.left + 140, rect.top + 80);
    node.dispatchEvent(new TouchEvent("touchstart", {
      touches: [firstA, firstB],
      targetTouches: [firstA, firstB],
      changedTouches: [firstA, firstB],
      bubbles: true,
      cancelable: true
    }));

    const movedB = makeTouch(2, rect.left + 190, rect.top + 80);
    node.dispatchEvent(new TouchEvent("touchmove", {
      touches: [firstA, movedB],
      targetTouches: [firstA, movedB],
      changedTouches: [movedB],
      bubbles: true,
      cancelable: true
    }));

    node.dispatchEvent(new TouchEvent("touchend", {
      touches: [],
      targetTouches: [],
      changedTouches: [firstA, movedB],
      bubbles: true,
      cancelable: true
    }));
  });

  await expect(zoomValue).not.toHaveText(initialZoom || "");
});

test("o fluxograma não cria barra horizontal na página", async ({ page }) => {
  await openGeneratedFlowchartStep(page);

  const pageWidths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));

  expect(pageWidths.scrollWidth - pageWidths.clientWidth).toBeLessThanOrEqual(1);
});

test("Ctrl+roda do mouse altera o zoom no desktop", async ({ page }, testInfo) => {
  test.skip(/mobile/i.test(testInfo.project.name), "Somente na viewport desktop.");

  await openGeneratedFlowchartStep(page);

  const scroll = page.locator("[data-flowchart-scroll='true']").first();
  const zoomValue = page.locator(".flowchart-zoom-value").first();
  const initialZoom = await zoomValue.textContent();
  expect(initialZoom).not.toBeNull();

  const box = await scroll.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move((box && box.x ? box.x : 0) + 80, (box && box.y ? box.y : 0) + 80);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -240);
  await page.keyboard.up("Control");

  await expect(zoomValue).not.toHaveText(initialZoom || "");
});
