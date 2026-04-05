import { test, expect } from "@playwright/test";
import {
  createSampleProjectSnapshot,
  openFirstCourse,
  openFirstLesson,
  resetApp,
  seedProject
} from "./helpers/app.mjs";

function skipIfNoTouch(testInfo) {
  test.skip(!testInfo.project.use.hasTouch, "Cobertura focada no fluxo touch/mobile.");
}

function createPopupTouchSnapshot() {
  const snapshot = createSampleProjectSnapshot();
  snapshot.content.courses[0].modules[0].title = "Lógica Proposicional";
  snapshot.content.courses[0].modules[0].lessons[0].title = "Negação, conjunção, disjunção e ou exclusivo";
  snapshot.content.courses[0].modules[0].lessons[0].steps = [
    {
      id: "step-popup-touch",
      type: "content",
      title: "POPUP TOUCH",
      comment: "",
      blocks: [
        { id: "block-popup-heading", kind: "heading", value: "POPUP TOUCH" },
        {
          id: "block-popup-text",
          kind: "paragraph",
          value: "Use o botão final para abrir o popup no primeiro toque.",
          richText: "Use o botão final para abrir o popup no primeiro toque."
        },
        {
          id: "block-popup-button",
          kind: "button",
          popupEnabled: true,
          popupBlocks: [
            { id: "popup-heading", kind: "heading", value: "POPUP TOUCH" },
            {
              id: "popup-paragraph",
              kind: "paragraph",
              value: "Popup aberto no primeiro toque.",
              richText: "Popup aberto no primeiro toque."
            }
          ]
        }
      ]
    },
    {
      id: "step-touch-complete",
      type: "lesson_complete",
      title: "Concluído",
      blocks: [
        { id: "block-touch-complete-heading", kind: "heading", value: "Concluído" },
        { id: "block-touch-complete-button", kind: "button", popupEnabled: false, popupBlocks: [] }
      ]
    }
  ];
  return snapshot;
}

test("insets Android mantêm o rodapé compacto e o comentário no fluxo da lição", async ({ page }, testInfo) => {
  skipIfNoTouch(testInfo);

  await seedProject(page, createPopupTouchSnapshot());
  await openFirstCourse(page);
  await openFirstLesson(page);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("aralearn:android-insets", {
      detail: { left: 0, top: 24, right: 0, bottom: 0, extraGestureBottom: 24 }
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
  expect(actionPadding).toBe(24);

  const lessonTopPadding = await page.locator(".lesson-topbar").evaluate((node) =>
    Math.round(parseFloat(getComputedStyle(node).paddingTop || "0"))
  );
  expect(lessonTopPadding).toBe(24);

  await page.locator('[data-action="toggle-step-comment"]').click();
  await expect(page.locator(".step-comment-popup")).toBeVisible();

  const metrics = await page.evaluate(() => {
    const stageMeta = document.querySelector(".lesson-stage-meta")?.getBoundingClientRect();
    const comment = document.querySelector(".step-comment-popup")?.getBoundingClientRect();
    const card = document.querySelector(".lesson-card")?.getBoundingClientRect();
    return {
      stageMetaBottom: stageMeta ? Math.round(stageMeta.bottom) : null,
      commentTop: comment ? Math.round(comment.top) : null,
      commentBottom: comment ? Math.round(comment.bottom) : null,
      cardTop: card ? Math.round(card.top) : null
    };
  });

  expect(metrics.commentTop).not.toBeNull();
  expect(metrics.cardTop).not.toBeNull();
  expect((metrics.commentTop || 0) - (metrics.stageMetaBottom || 0)).toBeGreaterThanOrEqual(0);
  expect((metrics.cardTop || 0) - (metrics.commentBottom || 0)).toBeGreaterThanOrEqual(0);
});

test("WebView moderno prioriza a safe area do viewport em vez do fallback nativo", async ({ page }, testInfo) => {
  skipIfNoTouch(testInfo);

  await page.addInitScript(() => {
    window.__AraLearnSafeAreaOverride__ = { left: 0, top: 12, right: 0, bottom: 18 };
  });
  await seedProject(page, createPopupTouchSnapshot());
  await openFirstCourse(page);
  await openFirstLesson(page);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("aralearn:android-insets", {
      detail: {
        left: 0,
        top: 24,
        right: 0,
        bottom: 30,
        extraGestureBottom: 0,
        supportsSafeAreaInsets: true,
        webViewMajorVersion: 144
      }
    }));
  });

  await expect.poll(async () => {
    return page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--safe-top").trim());
  }).toBe("12px");
  await expect.poll(async () => {
    return page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--safe-bottom").trim());
  }).toBe("18px");

  const lessonTopPadding = await page.locator(".lesson-topbar").evaluate((node) =>
    Math.round(parseFloat(getComputedStyle(node).paddingTop || "0"))
  );
  expect(lessonTopPadding).toBe(12);

  const actionPadding = await page.locator(".lesson-action-shell").evaluate((node) =>
    Math.round(parseFloat(getComputedStyle(node).paddingBottom || "0"))
  );
  expect(actionPadding).toBe(18);
});

test("layout moderno da lição funciona sem bridge nativo quando a safe area já vem do viewport", async ({ page }, testInfo) => {
  skipIfNoTouch(testInfo);

  await seedProject(page, createPopupTouchSnapshot());
  await openFirstCourse(page);
  await openFirstLesson(page);

  await page.evaluate(() => {
    const style = document.documentElement.style;
    style.setProperty("--safe-top", "24px");
    style.setProperty("--safe-bottom", "24px");
    style.setProperty("--safe-bottom-tappable", "24px");
  });

  const lessonTopPadding = await page.locator(".lesson-topbar").evaluate((node) =>
    Math.round(parseFloat(getComputedStyle(node).paddingTop || "0"))
  );
  expect(lessonTopPadding).toBe(24);

  const actionPadding = await page.locator(".lesson-action-shell").evaluate((node) =>
    Math.round(parseFloat(getComputedStyle(node).paddingBottom || "0"))
  );
  expect(actionPadding).toBe(24);

  const androidBottom = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--android-extra-gesture-bottom").trim()
  );
  expect(androidBottom).toBe("0px");
});

test("comentário permanece visível perto do topo quando a viewport encolhe com o teclado", async ({ page }, testInfo) => {
  skipIfNoTouch(testInfo);

  await page.setViewportSize({ width: 360, height: 740 });
  await seedProject(page, createPopupTouchSnapshot());
  await openFirstCourse(page);
  await openFirstLesson(page);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("aralearn:android-insets", {
      detail: { left: 0, top: 24, right: 0, bottom: 0, extraGestureBottom: 24 }
    }));
  });

  await page.locator('[data-action="toggle-step-comment"]').tap();
  const popup = page.locator(".step-comment-popup");
  const input = page.locator('[data-step-comment-input="true"]');
  await expect(popup).toBeVisible();
  const topbar = page.locator(".lesson-topbar");
  const stageMeta = page.locator(".lesson-stage-meta");
  await expect(topbar).toBeVisible();
  await expect(stageMeta).toBeVisible();

  const topbarBox = await topbar.boundingBox();
  expect(topbarBox).not.toBeNull();
  const stageMetaBox = await stageMeta.boundingBox();
  expect(stageMetaBox).not.toBeNull();

  await input.focus();
  await page.setViewportSize({ width: 360, height: 420 });
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("aralearn:android-insets", {
      detail: { left: 0, top: 24, right: 0, bottom: 0, extraGestureBottom: 24, imeBottom: 420 }
    }));
  });
  await page.waitForTimeout(120);

  const after = await popup.boundingBox();
  expect(after).not.toBeNull();
  const actionPadding = await page.locator(".lesson-action-shell").evaluate((node) =>
    Math.round(parseFloat(getComputedStyle(node).paddingBottom || "0"))
  );
  expect(actionPadding).toBe(24);
  const viewportHeight = (page.viewportSize() || {}).height || 0;
  expect((after && after.y) || 0).toBeGreaterThanOrEqual(Math.round(((topbarBox && topbarBox.bottom) || 0) + 10));
  expect((after && after.y) || 0).toBeGreaterThanOrEqual(Math.round(((stageMetaBox && stageMetaBox.bottom) || 0)));
  expect(((after && after.y) || 0) + ((after && after.height) || 0)).toBeLessThanOrEqual(viewportHeight);
});

test("evento de IME do Android não cria padding extra no layout web", async ({ page }, testInfo) => {
  skipIfNoTouch(testInfo);

  await page.setViewportSize({ width: 360, height: 740 });
  await seedProject(page, createPopupTouchSnapshot());
  await openFirstCourse(page);
  await openFirstLesson(page);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("aralearn:android-insets", {
      detail: { left: 0, top: 24, right: 0, bottom: 0, extraGestureBottom: 24 }
    }));
  });

  await page.locator('[data-action="toggle-step-comment"]').tap();
  await expect(page.locator(".step-comment-popup")).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("aralearn:android-insets", {
      detail: { left: 0, top: 24, right: 0, bottom: 0, extraGestureBottom: 24, imeBottom: 420 }
    }));
  });
  await page.waitForTimeout(120);

  const actionPadding = await page.locator(".lesson-action-shell").evaluate((node) =>
    Math.round(parseFloat(getComputedStyle(node).paddingBottom || "0"))
  );
  expect(actionPadding).toBe(24);

  const commentDisplay = await page.locator(".step-comment-layer").evaluate((node) =>
    getComputedStyle(node).display
  );
  expect(commentDisplay).toBe("block");
});

test("CTA de progresso abre popup no primeiro toque mesmo com comentário aberto", async ({ page }, testInfo) => {
  skipIfNoTouch(testInfo);

  await seedProject(page, createPopupTouchSnapshot());
  await openFirstCourse(page);
  await openFirstLesson(page);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("aralearn:android-insets", {
      detail: { left: 0, top: 24, right: 0, bottom: 0, extraGestureBottom: 24 }
    }));
  });

  await page.locator('[data-action="toggle-step-comment"]').tap();
  await page.locator('[data-step-comment-input="true"]').fill("Observação no Android.");
  await page.locator('[data-action="step-button-click"]').tap();
  await expect(page.locator(".inline-popup")).toBeVisible();
  await expect(page.locator(".step-comment-popup")).toHaveCount(0);
});

test("painel rapido da licao sobe acima da barra inferior quando ha inset Android", async ({ page }, testInfo) => {
  skipIfNoTouch(testInfo);

  await resetApp(page);
  await openFirstCourse(page);
  await openFirstLesson(page);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("aralearn:android-insets", {
      detail: { left: 0, top: 24, right: 0, bottom: 0, extraGestureBottom: 24 }
    }));
  });

  await page.locator('[data-action="toggle-lesson-quick"]').tap();
  await expect(page.locator(".quick-panel")).toBeVisible();

  const quickOverlayPadding = await page.locator(".quick-overlay").evaluate((node) =>
    Math.round(parseFloat(getComputedStyle(node).paddingBottom || "0"))
  );
  expect(quickOverlayPadding).toBe(34);
});
