(function (global) {
  "use strict";

  function createContentModelTools(deps) {
    const STEP_TYPES = deps.STEP_TYPES;
    const clone = deps.clone;
    const clean = deps.clean;
    const uid = deps.uid;
    const slug = deps.slug;
    const safeHtml = deps.safeHtml;
    const esc = deps.esc;
    const isEditorKind = deps.isEditorKind;
    const isFlowchartKind = deps.isFlowchartKind;
    const isSimulatorKind = deps.isSimulatorKind;
    const isParagraphKind = deps.isParagraphKind;
    const isHeadingKind = deps.isHeadingKind;
    const isImageKind = deps.isImageKind;
    const isButtonKind = deps.isButtonKind;
    const SUPPORTED_BLOCK_KINDS = deps.SUPPORTED_BLOCK_KINDS;
    const normalizeEditorOptions = deps.normalizeEditorOptions;
    const normalizeTerminalEditorBlock = deps.normalizeTerminalEditorBlock;
    const normalizeFlowchartNode = deps.normalizeFlowchartNode;
    const normalizeFlowchartLink = deps.normalizeFlowchartLink;
    const normalizeFlowchartShapeOptions = deps.normalizeFlowchartShapeOptions;
    const normalizeFlowchartTextOptions = deps.normalizeFlowchartTextOptions;
    const normalizeFlowchartEditorBlock = deps.normalizeFlowchartEditorBlock;
    const ensureEditorButtonBlock = deps.ensureEditorButtonBlock;
    const isTableKind = deps.isTableKind;
    const isMultipleChoiceKind = deps.isMultipleChoiceKind;
    const normalizeSimulatorBlock = deps.normalizeSimulatorBlock;
    const normalizeTableBlock = deps.normalizeTableBlock;
    const normalizeMultipleChoiceBlock = deps.normalizeMultipleChoiceBlock;
    const normalizePopupBlocks = deps.normalizePopupBlocks;
    const DEFAULT_APP_TITLE = deps.DEFAULT_APP_TITLE;

    function emptyContent() {
      return {
        appTitle: DEFAULT_APP_TITLE,
        courses: []
      };
    }

    // Normaliza estrutura raiz de conteudo carregado.
    function normalizeContent(raw) {
      const source = raw && typeof raw === "object" ? clone(raw) : {};
      return {
        appTitle: clean(source.appTitle, DEFAULT_APP_TITLE),
        courses: Array.isArray(source.courses)
          ? source.courses.map(normalizeCourse).filter(Boolean)
          : []
      };
    }

    // Normaliza objeto de curso.
    function normalizeCourse(raw) {
      if (!raw || typeof raw !== "object") return null;

      return {
        id: raw.id || uid("course"),
        title: clean(raw.title, "Curso sem nome"),
        description: String(raw.description || ""),
        modules: Array.isArray(raw.modules)
          ? raw.modules.map(normalizeModule).filter(Boolean)
          : []
      };
    }

    // Normaliza objeto de modulo.
    function normalizeModule(raw) {
      if (!raw || typeof raw !== "object") return null;

      return {
        id: raw.id || uid("module"),
        title: clean(raw.title, "Módulo sem nome"),
        lessons: Array.isArray(raw.lessons)
          ? raw.lessons.map(normalizeLesson).filter(Boolean)
          : []
      };
    }

    // Normaliza objeto de licao.
    function normalizeLesson(raw) {
      if (!raw || typeof raw !== "object") return null;

      const lesson = {
        id: raw.id || uid("lesson"),
        title: clean(raw.title, "Lição sem nome"),
        subtitle: String(raw.subtitle || ""),
        steps: Array.isArray(raw.steps)
          ? raw.steps.map(normalizeStep).filter(Boolean)
          : []
      };

      if (!lesson.steps.length) lesson.steps.push(defaultContentStep(), defaultCompleteStep());
      return lesson;
    }

    function createDefaultBlocksForStep(raw, type) {
      const headingValue = clean(raw && raw.title, type === "lesson_complete" ? "Lição concluída" : "Novo card");
      const blocks = [
        { id: uid("block"), kind: "heading", value: headingValue }
      ];

      if (type === "lesson_complete" && raw && raw.subtitle) {
        blocks.push(normalizeParagraphBlockData({
          id: uid("block"),
          kind: "paragraph",
          value: String(raw.subtitle || "")
        }));
      }

      blocks.push({
        id: uid("block"),
        kind: "button",
        popupEnabled: false,
        popupBlocks: []
      });

      return ensureEditorButtonBlock(blocks);
    }

    // Normaliza comentário opcional do card preservando quebras, mas removendo vazio estrutural.
    function normalizeStepComment(value) {
      const comment = String(value || "").replace(/\r/g, "");
      return comment.trim() ? comment : "";
    }

    // Normaliza step conforme o modelo atual em blocos.
    function normalizeStep(raw) {
      if (!raw || typeof raw !== "object") return null;
      const type = STEP_TYPES.indexOf(raw.type) > -1 ? raw.type : "content";
      const comment = normalizeStepComment(raw.comment);
      const normalizedBlocks = Array.isArray(raw.blocks) && raw.blocks.length
        ? raw.blocks.map(normalizeStepBlock).filter(Boolean)
        : createDefaultBlocksForStep(raw, type);

      const step = {
        id: raw.id || uid("step"),
        type: type,
        title: clean(raw.title, type === "lesson_complete" ? "Lição concluída" : "Novo card"),
        blocks: ensureEditorButtonBlock(normalizedBlocks)
      };
      if (comment) step.comment = comment;

      const firstHeading = step.blocks.find(function (block) {
        return isHeadingKind(block.kind) && String(block.value || "").trim();
      });
      const firstParagraph = type === "lesson_complete"
        ? step.blocks.find(function (block) {
          return isParagraphKind(block.kind) && String(block.value || "").trim();
        })
        : null;

      if (firstHeading) step.title = firstHeading.value.trim();
      if (firstParagraph) step.subtitle = firstParagraph.value.trim();

      return step;
    }

    // Normaliza bloco individual de step (heading, paragraph etc.).
    function normalizeStepBlock(raw) {
      if (!raw || typeof raw !== "object") return null;

      const rawKind = String(raw.kind || "paragraph");
      const kind =
        isEditorKind(rawKind)
          ? "editor"
          : isFlowchartKind(rawKind)
            ? "flowchart"
            : isTableKind(rawKind)
              ? "table"
              : isMultipleChoiceKind(rawKind)
                ? "multiple_choice"
                : isSimulatorKind(rawKind)
                  ? "simulator"
                  : isParagraphKind(rawKind)
                    ? "paragraph"
                    : isHeadingKind(rawKind)
                      ? "heading"
                      : isImageKind(rawKind)
                        ? "image"
                        : isButtonKind(rawKind)
                          ? "button"
                          : rawKind;
      if (SUPPORTED_BLOCK_KINDS.indexOf(kind) === -1) return null;

      const block = {
        id: raw.id || uid("block"),
        kind: kind
      };

      if (kind !== "button") {
        block.value = String(raw.value || "");
      }

      if (kind === "heading") {
        block.align = normalizeTextBlockAlign(raw.align);
      }

      if (kind === "paragraph") {
        const normalizedParagraph = normalizeParagraphBlockData({
          id: block.id,
          kind: "paragraph",
          value: block.value,
          richText: raw.richText,
          align: raw.align
        });
        block.kind = normalizedParagraph.kind;
        block.value = normalizedParagraph.value;
        block.richText = normalizedParagraph.richText;
        block.align = normalizedParagraph.align;
      }

      if (kind === "editor") {
        block.options = normalizeEditorOptions(raw.options);
        block.interactionMode = raw.interactionMode;
        normalizeTerminalEditorBlock(block);
      }

      if (kind === "flowchart") {
        block.value = "";
        block.nodes = Array.isArray(raw.nodes) ? raw.nodes.map(normalizeFlowchartNode) : [];
        block.links = Array.isArray(raw.links) ? raw.links.map(normalizeFlowchartLink).filter(Boolean) : [];
        block.shapeOptions = normalizeFlowchartShapeOptions(raw.shapeOptions);
        block.textOptions = normalizeFlowchartTextOptions(raw.textOptions);
        normalizeFlowchartEditorBlock(block);
      }

      if (kind === "table") {
        const normalizedTable = normalizeTableBlock(raw);
        block.value = "";
        block.title = normalizedTable.title;
        block.titleStyle = normalizedTable.titleStyle;
        block.headers = normalizedTable.headers;
        block.rows = normalizedTable.rows;
      }

      if (kind === "multiple_choice") {
        const normalizedChoice = normalizeMultipleChoiceBlock(raw);
        block.value = normalizedChoice.value;
        block.answerState = normalizedChoice.answerState;
        block.options = normalizedChoice.options;
      }

      if (kind === "simulator") {
        const normalizedSimulator = normalizeSimulatorBlock(raw);
        block.value = normalizedSimulator.value;
        block.options = normalizedSimulator.options;
      }

      if (kind === "button") {
        block.popupEnabled = !!raw.popupEnabled;
        block.popupBlocks = normalizePopupBlocks(raw.popupBlocks);
      }

      return block;
    }

    // Cria curso padrao minimo.
    function defaultCourse(title) {
      return {
        id: slug(title, "curso"),
        title: title,
        description: "Descricao do curso.",
        modules: [defaultModule("Módulo 1")]
      };
    }

    // Cria modulo padrao minimo.
    function defaultModule(title) {
      return {
        id: slug(title, "modulo"),
        title: title,
        lessons: [defaultLesson("Lição 1")]
      };
    }

    // Cria licao padrao minima.
    function defaultLesson(title) {
      return {
        id: slug(title, "licao"),
        title: title,
        subtitle: "",
        steps: [defaultContentStep(), defaultCompleteStep()]
      };
    }

    // Cria card de conteudo padrao.
    function defaultContentStep() {
      return {
        id: uid("step"),
        type: "content",
        title: "Novo card",
        blocks: [
          { id: uid("block"), kind: "heading", value: "Novo card" },
          { id: uid("block"), kind: "paragraph", value: "Novo conteúdo." },
          { id: uid("block"), kind: "button", popupEnabled: false, popupBlocks: [] }
        ]
      };
    }

    // Cria card de conclusao padrao.
    function defaultCompleteStep() {
      return {
        id: uid("step"),
        type: "lesson_complete",
        title: "Lição concluída",
        subtitle: "",
        blocks: [
          { id: uid("block"), kind: "heading", value: "Lição concluída" },
          { id: uid("block"), kind: "button", popupEnabled: false, popupBlocks: [] }
        ]
      };
    }

    // Escapa texto simples para uso no HTML inline do paragrafo.
    function textToInlineRichTextHtml(text, inlineTag) {
      const content = esc(String(text || "").replace(/\r/g, "")).replace(/\n/g, "<br>");
      if (!content) return "";
      if (!inlineTag) return content;
      return "<" + inlineTag + ">" + content + "</" + inlineTag + ">";
    }

    // Sanitiza HTML inline aceitando apenas texto, <br>, <strong>, <em> e tons inline aprovados.
    function sanitizeInlineRichText(html) {
      const allowedToneClasses = [
        "inline-tone-gold",
        "inline-tone-mint",
        "inline-tone-coral",
        "inline-tone-blue",
        "inline-tone-red"
      ];
      const container = document.createElement("div");
      container.innerHTML = safeHtml(String(html || ""));

      function serializeChildren(nodeList) {
        return Array.from(nodeList || []).map(serializeNode).join("");
      }

      function serializeNode(node) {
        if (!node) return "";
        if (node.nodeType === 3) return textToInlineRichTextHtml(String(node.textContent || ""), "");
        if (node.nodeType !== 1) return "";

        const tag = String(node.tagName || "").toLowerCase();
        if (tag === "br") return "<br>";

        const inner = serializeChildren(node.childNodes);
        if (!inner) return "";

        if (tag === "strong" || tag === "b") return "<strong>" + inner + "</strong>";
        if (tag === "em" || tag === "i") return "<em>" + inner + "</em>";
        if (tag === "span") {
          const toneClass = Array.from(node.classList || []).find(function (className) {
            return allowedToneClasses.indexOf(className) > -1;
          });
          return toneClass ? '<span class="' + toneClass + '">' + inner + "</span>" : inner;
        }
        if (tag === "p" || tag === "div" || tag === "li") return inner + "<br>";
        return inner;
      }

      return serializeChildren(container.childNodes)
        .replace(/(?:<br>\s*){3,}/g, "<br><br>")
        .replace(/^(?:<br>\s*)+/, "")
        .replace(/(?:\s*<br>)+$/, "");
    }

    // Converte HTML inline sanitizado em texto simples com quebras de linha.
    function inlineRichTextToPlainText(html) {
      const safe = sanitizeInlineRichText(html);
      if (!safe) return "";

      const container = document.createElement("div");
      container.innerHTML = safe;
      Array.from(container.querySelectorAll("br")).forEach(function (node) {
        node.replaceWith("\n");
      });

      return String(container.textContent || "")
        .replace(/\r/g, "")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .trim();
    }

    function normalizeTextBlockAlign(value) {
      const safe = String(value || "").trim().toLowerCase();
      return safe === "center" || safe === "right" ? safe : "left";
    }

    // Normaliza um bloco de parágrafo para o formato com texto rico inline.
    function normalizeParagraphBlockData(raw) {
      const source = raw && typeof raw === "object" ? raw : {};
      const serializedValue = String(source.value || "").replace(/\r/g, "");
      const richTextFromValue = textToInlineRichTextHtml(serializedValue, "");
      const plainValue = inlineRichTextToPlainText(richTextFromValue);
      const richTextCandidate =
        typeof source.richText === "string" && source.richText.trim()
          ? sanitizeInlineRichText(source.richText)
          : "";
      const plainCandidate = inlineRichTextToPlainText(richTextCandidate);
      const canTrustRichText =
        !!richTextCandidate &&
        (!plainValue || plainCandidate === plainValue);
      const richText =
        canTrustRichText
          ? richTextCandidate
          : sanitizeInlineRichText(richTextFromValue);
      const value = canTrustRichText ? plainCandidate : plainValue;

      return {
        id: source.id || uid("block"),
        kind: "paragraph",
        value: value,
        richText: richText,
        align: normalizeTextBlockAlign(source.align)
      };
    }

    // Retorna primeiro valor preenchido de um tipo de bloco.
    function firstValue(blocks, kind) {
      const item = blocks.find(function (block) {
        return block.kind === kind && String(block.value || "").trim();
      });
      return item ? item.value.trim() : "";
    }

    return {
      normalizeContent: normalizeContent,
      normalizeCourse: normalizeCourse,
      normalizeModule: normalizeModule,
      normalizeLesson: normalizeLesson,
      normalizeStep: normalizeStep,
      normalizeStepBlock: normalizeStepBlock,
      emptyContent: emptyContent,
      defaultCourse: defaultCourse,
      defaultModule: defaultModule,
      defaultLesson: defaultLesson,
      defaultContentStep: defaultContentStep,
      defaultCompleteStep: defaultCompleteStep,
      normalizeStepComment: normalizeStepComment,
      textToInlineRichTextHtml: textToInlineRichTextHtml,
      sanitizeInlineRichText: sanitizeInlineRichText,
      inlineRichTextToPlainText: inlineRichTextToPlainText,
      normalizeParagraphBlockData: normalizeParagraphBlockData,
      firstValue: firstValue
    };
  }

  global.AraLearnContentModel = {
    createContentModelTools: createContentModelTools
  };
})(window);
