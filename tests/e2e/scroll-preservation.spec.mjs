import { test, expect } from "@playwright/test";
import {
  createSampleProjectSnapshot,
  openFirstCourse,
  openFirstLesson,
  seedProject
} from "./helpers/app.mjs";

function createLongLessonSnapshot() {
  const snapshot = createSampleProjectSnapshot();
  const longBlocks = [{ id: "long-heading", kind: "heading", value: "SCROLL LONGO" }];

  for (let index = 0; index < 28; index += 1) {
    longBlocks.push({
      id: "long-paragraph-" + index,
      kind: "paragraph",
      value: "Parágrafo longo " + (index + 1) + " para forçar rolagem interna do card.",
      richText: "Parágrafo longo " + (index + 1) + " para forçar rolagem interna do card."
    });
  }

  longBlocks.push({
    id: "long-button",
    kind: "button",
    popupEnabled: false,
    popupBlocks: []
  });

  snapshot.content.courses[0].modules[0].lessons[0].steps = [
    {
      id: "step-long-scroll",
      type: "content",
      title: "SCROLL LONGO",
      comment: "",
      blocks: longBlocks
    }
  ];

  return snapshot;
}

function createLessonTitleSpacingSnapshot(lessonTitle) {
  const snapshot = createSampleProjectSnapshot();
  snapshot.content.courses[0].modules[0].lessons[0].title = lessonTitle;
  snapshot.content.courses[0].modules[0].lessons[0].steps = [
    {
      id: "step-title-spacing",
      type: "content",
      title: "TÍTULO",
      comment: "",
      blocks: [
        { id: "title-spacing-heading", kind: "heading", value: "TÍTULO" },
        {
          id: "title-spacing-paragraph",
          kind: "paragraph",
          value: "Texto do card.",
          richText: "Texto do card."
        },
        {
          id: "title-spacing-button",
          kind: "button",
          popupEnabled: false,
          popupBlocks: []
        }
      ]
    }
  ];
  return snapshot;
}

function createWideTableSnapshot() {
  const snapshot = createSampleProjectSnapshot();
  snapshot.content.courses[0].modules[0].lessons[0].steps = [
    {
      id: "step-wide-table",
      type: "content",
      title: "TABELA LARGA",
      comment: "",
      blocks: [
        { id: "wide-table-heading", kind: "heading", value: "TABELA LARGA" },
        {
          id: "wide-table-block",
          kind: "table",
          title: "Navegação de lacunas",
          headers: [
            "Linha",
            "Contexto longo 1",
            "Contexto longo 2",
            "Contexto longo 3",
            "Coluna alvo",
            "Direita"
          ],
          rows: [
            [
              "Linha 1",
              "Texto bem longo para empurrar a rolagem horizontal para a direita.",
              "Outro trecho extenso para manter a tabela larga no mobile.",
              "Mais contexto horizontal para o teste de preservação.",
              {
                value: "Fa",
                blank: true,
                interactionMode: "choice",
                placeholder: "A1",
                options: [{ id: "a1-fa", value: "Fa" }, { id: "a1-sol", value: "Sol" }]
              },
              {
                value: "Fá",
                blank: true,
                interactionMode: "choice",
                placeholder: "B1",
                options: [{ id: "b1-fa", value: "Fá" }, { id: "b1-la", value: "Lá" }]
              }
            ],
            [
              "Linha 2",
              "Texto bem longo para empurrar a rolagem horizontal para a direita.",
              "Outro trecho extenso para manter a tabela larga no mobile.",
              "Mais contexto horizontal para o teste de preservação.",
              {
                value: "Faz",
                blank: true,
                interactionMode: "choice",
                placeholder: "A2",
                options: [{ id: "a2-faz", value: "Faz" }, { id: "a2-som", value: "Som" }]
              },
              {
                value: "Fase",
                blank: true,
                interactionMode: "choice",
                placeholder: "B2",
                options: [{ id: "b2-fase", value: "Fase" }, { id: "b2-voz", value: "Voz" }]
              }
            ]
          ]
        },
        {
          id: "wide-table-button",
          kind: "button",
          popupEnabled: false,
          popupBlocks: []
        }
      ]
    }
  ];

  return snapshot;
}

function createTallFeedbackTableSnapshot() {
  const snapshot = createSampleProjectSnapshot();
  const rows = [];

  for (let index = 0; index < 8; index += 1) {
    rows.push([
      "Linha " + (index + 1),
      "Texto largo " + (index + 1) + " para manter a tabela extensa na horizontal.",
      "Mais contexto largo " + (index + 1) + ".",
      "Coluna fixa " + (index + 1),
      {
        value: index % 2 === 0 ? "V" : "F",
        blank: true,
        interactionMode: "choice",
        placeholder: "C" + (index + 1),
        options: [{ id: "c" + index + "-v", value: "V" }, { id: "c" + index + "-f", value: "F" }]
      }
    ]);
  }

  snapshot.content.courses[0].modules[0].lessons[0].steps = [
    {
      id: "step-feedback-table",
      type: "content",
      title: "TABELA COM FEEDBACK",
      comment: "",
      blocks: [
        { id: "feedback-table-heading", kind: "heading", value: "TABELA COM FEEDBACK" },
        {
          id: "feedback-table-block",
          kind: "table",
          title: "Feedback prioritário",
          headers: ["Linha", "Contexto 1", "Contexto 2", "Contexto 3", "Resposta"],
          rows: rows
        },
        {
          id: "feedback-table-button",
          kind: "button",
          popupEnabled: false,
          popupBlocks: []
        }
      ]
    }
  ];

  return snapshot;
}

test("preserva o scroll interno do card ao re-renderizar o comentário", async ({ page }) => {
  await seedProject(page, createLongLessonSnapshot());
  await openFirstCourse(page);
  await openFirstLesson(page);

  const lessonBody = page.locator(".lesson-card-body");
  const before = await lessonBody.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
    return Math.round(node.scrollTop);
  });
  expect(before).toBeGreaterThan(80);

  await page.locator('[data-action="toggle-step-comment"]').click();
  await expect(page.locator(".step-comment-popup")).toBeVisible();

  const after = await lessonBody.evaluate((node) => Math.round(node.scrollTop));
  expect(Math.abs(after - before)).toBeLessThan(16);
});

test("reserva duas linhas para o título da lição e mantém o card na mesma altura", async ({ page }) => {
  const shortSnapshot = createLessonTitleSpacingSnapshot("Título curto");
  await seedProject(page, shortSnapshot);
  await openFirstCourse(page);
  await openFirstLesson(page);

  const shortMetaHeight = await page.locator(".lesson-stage-meta").evaluate((node) =>
    Math.round(node.getBoundingClientRect().height)
  );
  const shortCardTop = await page.locator(".lesson-card").evaluate((node) =>
    Math.round(node.getBoundingClientRect().top)
  );

  const longSnapshot = createLessonTitleSpacingSnapshot(
    "Lógica Proposicional - Negação, conjunção, disjunção e ou exclusivo"
  );
  await seedProject(page, longSnapshot);
  await openFirstCourse(page);
  await openFirstLesson(page);

  const longMetaHeight = await page.locator(".lesson-stage-meta").evaluate((node) =>
    Math.round(node.getBoundingClientRect().height)
  );
  const longCardTop = await page.locator(".lesson-card").evaluate((node) =>
    Math.round(node.getBoundingClientRect().top)
  );

  expect(Math.abs(longMetaHeight - shortMetaHeight)).toBeLessThanOrEqual(4);
  expect(Math.abs(longCardTop - shortCardTop)).toBeLessThanOrEqual(4);
});

test("mantém o card com vãos compactos entre título da lição e dock fixa", async ({ page }) => {
  await seedProject(page, createLessonTitleSpacingSnapshot("Título curto"));
  await openFirstCourse(page);
  await openFirstLesson(page);

  const metrics = await page.evaluate(() => {
    const stageMeta = document.querySelector(".lesson-stage-meta")?.getBoundingClientRect();
    const card = document.querySelector(".lesson-card")?.getBoundingClientRect();
    const footer = document.querySelector(".lesson-action-shell")?.getBoundingClientRect();
    return {
      gapMetaCard: stageMeta && card ? Math.round(card.top - stageMeta.bottom) : null,
      gapCardFooter: card && footer ? Math.round(footer.top - card.bottom) : null
    };
  });

  expect(metrics.gapMetaCard).not.toBeNull();
  expect(metrics.gapCardFooter).not.toBeNull();
  expect(metrics.gapMetaCard || 0).toBeGreaterThanOrEqual(4);
  expect(metrics.gapMetaCard || 0).toBeLessThanOrEqual(10);
  expect(metrics.gapCardFooter || 0).toBeGreaterThanOrEqual(6);
  expect(metrics.gapCardFooter || 0).toBeLessThanOrEqual(12);
});

test("preserva o scroll horizontal da tabela e avança a lacuna para baixo na coluna", async ({ page }) => {
  await seedProject(page, createWideTableSnapshot());
  await openFirstCourse(page);
  await openFirstLesson(page);

  const tableScroll = page.locator(".table-scroll");
  await expect(tableScroll).toBeVisible();

  const before = await tableScroll.evaluate((node) => {
    node.scrollLeft = node.scrollWidth;
    return Math.round(node.scrollLeft);
  });
  expect(before).toBeGreaterThan(100);

  await page.locator(".table-choice-panel .token-option", { hasText: "Fa" }).click();

  const after = await tableScroll.evaluate((node) => Math.round(node.scrollLeft));
  expect(after).toBeGreaterThan(100);
  expect(after).toBeGreaterThanOrEqual(before - 24);

  const activeSlot = page.locator(".table-choice-slot.is-active");
  await expect(activeSlot).toContainText("A2");

  const isVisibleInsideScroller = await activeSlot.evaluate((node) => {
    const scroller = node.closest(".table-scroll");
    if (!scroller) return false;
    const nodeRect = node.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    return (
      nodeRect.left >= scrollerRect.left - 1 &&
      nodeRect.right <= scrollerRect.right + 1 &&
      nodeRect.top >= scrollerRect.top - 1 &&
      nodeRect.bottom <= scrollerRect.bottom + 1
    );
  });
  expect(isVisibleInsideScroller).toBeTruthy();
});

test("prioriza a mensagem de feedback quando ela aparece no lugar da lacuna ativa", async ({ page }) => {
  await seedProject(page, createTallFeedbackTableSnapshot());
  await openFirstCourse(page);
  await openFirstLesson(page);

  const lessonBody = page.locator(".lesson-card-body");
  const tableScroll = page.locator(".table-scroll");
  await tableScroll.evaluate((node) => {
    node.scrollLeft = node.scrollWidth;
  });

  await page.locator(".table-choice-panel .token-option", { hasText: "V" }).click();
  await page.locator('[data-action="step-button-click"]').click();

  const feedback = page.locator('.inline-feedback.err[data-feedback-block-id="feedback-table-block"]');
  await expect(feedback).toBeVisible();

  const isFeedbackVisibleInsideCard = await feedback.evaluate((node) => {
    const scroller = node.closest(".lesson-card-body");
    if (!scroller) return false;
    const nodeRect = node.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    return nodeRect.top >= scrollerRect.top - 1 && nodeRect.bottom <= scrollerRect.bottom + 1;
  });
  expect(isFeedbackVisibleInsideCard).toBeTruthy();

  const scrollTop = await lessonBody.evaluate((node) => Math.round(node.scrollTop));
  expect(scrollTop).toBeGreaterThan(40);
});

test("mantém respostas já preenchidas da tabela após validação incompleta", async ({ page }) => {
  await seedProject(page, createTallFeedbackTableSnapshot());
  await openFirstCourse(page);
  await openFirstLesson(page);

  await page.locator(".table-choice-panel .token-option", { hasText: "V" }).click();
  await page.locator('[data-action="step-button-click"]').click();

  await expect(page.locator('.inline-feedback.err[data-feedback-block-id="feedback-table-block"]'))
    .toContainText("Preencha todas as lacunas da tabela.");
  await expect(page.locator(".table-choice-slot.filled").first()).toContainText("V");

  await page.locator('[data-action="step-button-click"]').click();
  await expect(page.locator(".table-choice-slot.filled").first()).toContainText("V");
});
