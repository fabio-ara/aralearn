
(function () {
  "use strict";

  // ============================================================================
  // ARALEARN (HTML + CSS + JS PURO)
  // ----------------------------------------------------------------------------
  // Como ler este arquivo (guia rapido para iniciantes):
  // 1) Estado global: objeto "state" concentra tudo o que a tela precisa.
  // 2) Renderizacao: funcoes "render*" montam HTML de cada parte da interface.
  // 3) Eventos: funcoes "on*" escutam cliques/inputs e alteram o estado.
  // 4) Persistencia: progresso e salvo no localStorage e no JSON exportado.
  // 5) Normalizacao: funcoes "normalize*" garantem formato consistente dos dados.
  //
  // Regra geral deste app: alterou estado -> chamar renderApp() para refletir na UI.
  // ============================================================================

  // Elemento raiz onde toda a aplicacao sera renderizada.
  const root = document.getElementById("app-root");
  if (!root) throw new Error("#app-root not found.");
  const appUtils = window.AraLearnAppUtils;
  const blockRegistry = window.AraLearnBlockRegistry;
  const codeInputTools = window.AraLearnCodeInput;
  const createFileHelpers = window.AraLearnFileHelpers && window.AraLearnFileHelpers.createFileHelpers;
  const createContentModelTools =
    window.AraLearnContentModel && window.AraLearnContentModel.createContentModelTools;
  const createProgressHelpers =
    window.AraLearnProgressHelpers && window.AraLearnProgressHelpers.createProgressHelpers;
  const flowchartShapeLibrary = window.AraLearnFlowchartShapes;
  const createRenderStateTools =
    window.AraLearnRenderState && window.AraLearnRenderState.createRenderStateTools;
  const createFlowchartLayoutEngine =
    window.AraLearnFlowchartLayout && window.AraLearnFlowchartLayout.createFlowchartLayoutEngine;
  if (
    !appUtils ||
    !blockRegistry ||
    !codeInputTools ||
    !createFileHelpers ||
    !createContentModelTools ||
    !createProgressHelpers ||
    !flowchartShapeLibrary ||
    !createRenderStateTools ||
    !createFlowchartLayoutEngine
  ) {
    throw new Error("AraLearn modules not loaded.");
  }
  const idTools = appUtils.createIdTools();
  const clean = appUtils.clean;
  const clamp = appUtils.clamp;
  const clone = appUtils.clone;
  const safeHtml = appUtils.safeHtml;
  const esc = appUtils.esc;
  const escAttr = appUtils.escAttr;
  const cssEsc = appUtils.cssEsc;
  const uid = idTools.uid;
  const slug = idTools.slug;
  const fileHelpers = createFileHelpers();
  const progressHelpers = createProgressHelpers({ clamp: clamp });
  const renderStateTools = createRenderStateTools();
  const AUTHORING_BLOCK_KINDS = blockRegistry.authoringKinds;
  const POPUP_BLOCK_KINDS = blockRegistry.popupKinds;
  const SUPPORTED_BLOCK_KINDS = blockRegistry.supportedKinds;
  const BLOCK_META = blockRegistry.meta;
  const getBlockMeta = blockRegistry.getBlockMeta;
  const isHeadingKind = blockRegistry.isHeadingKind;
  const isParagraphKind = blockRegistry.isParagraphKind;
  const isImageKind = blockRegistry.isImageKind;
  const isTableKind = blockRegistry.isTableKind;
  const isSimulatorKind = blockRegistry.isSimulatorKind;
  const isEditorKind = blockRegistry.isEditorKind;
  const isMultipleChoiceKind = blockRegistry.isMultipleChoiceKind;
  const isFlowchartKind = blockRegistry.isFlowchartKind;
  const isButtonKind = blockRegistry.isButtonKind;
  const normalizeEditorInteractionMode = codeInputTools.normalizeInteractionMode;
  const normalizeCodeInputVariants = codeInputTools.normalizeVariants;
  const validateTypedCodeInputAttempt = codeInputTools.validateTypedAttempt;

  // Tipos de step suportados pela licao.
  const STEP_TYPES = ["content", "lesson_complete"];
  // Nome padrao exibido para o app quando nenhum titulo personalizado foi salvo.
  const DEFAULT_APP_TITLE = "AraLearn";
  // Chave principal de persistencia completa do projeto (conteudo + progresso).
  const PROJECT_STORAGE_KEY = "aralearn_project_v1";
  // Chave de armazenamento do progresso no navegador.
  const PROGRESS_STORAGE_KEY = "aralearn_progress_v1";
  // Nome do manifesto JSON dentro do pacote ZIP do projeto.
  const PROJECT_PACKAGE_JSON_FILE_NAME = "project.json";
  // Nome sugerido do pacote exportado pelo app.
  const DEFAULT_EXPORT_FILE_NAME = "aralearn-project.zip";
  // Formato atual dos pacotes ZIP/JSON exportados pelo app.
  const PACKAGE_FORMAT = "aralearn-package-v3";
  const INLINE_TONE_CLASSES = [
    "inline-tone-gold",
    "inline-tone-mint",
    "inline-tone-coral",
    "inline-tone-blue",
    "inline-tone-red"
  ];
  const FLOWCHART_COLUMNS = ["left", "center", "right"];
  const FLOWCHART_SHAPES = flowchartShapeLibrary.pickerShapes || flowchartShapeLibrary.shapes;
  const normalizeFlowchartShapeKey = flowchartShapeLibrary.normalizeShapeKey;
  const getFlowchartShapeMeta = flowchartShapeLibrary.getShapeMeta;
  const getFlowchartShapeLabel = flowchartShapeLibrary.getShapeLabel;
  const getFlowchartShapePickerLabel = flowchartShapeLibrary.getShapePickerLabel;
  const renderFlowchartShapeSvg = flowchartShapeLibrary.renderShapeSvg;
  const utf8Encode = fileHelpers.utf8Encode;
  const utf8Decode = fileHelpers.utf8Decode;
  const blobToDataUrl = fileHelpers.blobToDataUrl;
  const dataUrlMimeType = fileHelpers.dataUrlMimeType;
  const dataUrlToBytes = fileHelpers.dataUrlToBytes;
  const bytesToDataUrl = fileHelpers.bytesToDataUrl;
  const bytesToBase64 = fileHelpers.bytesToBase64;
  const isAndroidHostAvailable = fileHelpers.isAndroidHostAvailable;
  const mimeToExtension = fileHelpers.mimeToExtension;
  const mimeFromExtension = fileHelpers.mimeFromExtension;
  const inferExtensionFromPath = fileHelpers.inferExtensionFromPath;
  const cleanAssetExtension = fileHelpers.cleanAssetExtension;
  const normalizeZipPath = fileHelpers.normalizeZipPath;
  const createZip = fileHelpers.createZip;
  const parseZip = fileHelpers.parseZip;
  const FLOWCHART_LAYOUT = {
    columns: 3,
    cellWidth: 104,
    cellHeight: 98,
    gapX: 12,
    gapY: 18,
    shapeWidth: 80,
    shapeHeight: 48,
    textWidth: 96,
    textHeight: 84,
    textTop: 56,
    boardPaddingX: 32,
    boardPaddingY: 24,
    routeStep: 10,
    routePortOffset: 18,
    routeTurnPenalty: 4,
    routeReusePenalty: 3
  };
  const contentModelTools = createContentModelTools({
    STEP_TYPES: STEP_TYPES,
    DEFAULT_APP_TITLE: DEFAULT_APP_TITLE,
    clone: clone,
    clean: clean,
    uid: uid,
    slug: slug,
    safeHtml: safeHtml,
    esc: esc,
    isHeadingKind: isHeadingKind,
    isParagraphKind: isParagraphKind,
    isImageKind: isImageKind,
    isEditorKind: isEditorKind,
    isFlowchartKind: isFlowchartKind,
    isSimulatorKind: isSimulatorKind,
    isButtonKind: isButtonKind,
    SUPPORTED_BLOCK_KINDS: SUPPORTED_BLOCK_KINDS,
    normalizeEditorOptions: normalizeEditorOptions,
    normalizeTerminalEditorBlock: normalizeTerminalEditorBlock,
    normalizeFlowchartNode: normalizeFlowchartNode,
    normalizeFlowchartLink: normalizeFlowchartLink,
    normalizeFlowchartShapeOptions: normalizeFlowchartShapeOptions,
    normalizeFlowchartTextOptions: normalizeFlowchartTextOptions,
    normalizeFlowchartEditorBlock: normalizeFlowchartEditorBlock,
    ensureEditorButtonBlock: ensureEditorButtonBlock,
    isTableKind: isTableKind,
    isMultipleChoiceKind: isMultipleChoiceKind,
    normalizeSimulatorBlock: normalizeSimulatorBlock,
    normalizeTableBlock: normalizeTableBlock,
    normalizeMultipleChoiceBlock: normalizeMultipleChoiceBlock,
    normalizePopupBlocks: normalizePopupBlocks
  });
  const normalizeContent = contentModelTools.normalizeContent;
  const normalizeCourse = contentModelTools.normalizeCourse;
  const normalizeModule = contentModelTools.normalizeModule;
  const normalizeLesson = contentModelTools.normalizeLesson;
  const normalizeStep = contentModelTools.normalizeStep;
  const normalizeStepBlock = contentModelTools.normalizeStepBlock;
  const defaultCourse = contentModelTools.defaultCourse;
  const defaultModule = contentModelTools.defaultModule;
  const defaultLesson = contentModelTools.defaultLesson;
  const defaultContentStep = contentModelTools.defaultContentStep;
  const defaultCompleteStep = contentModelTools.defaultCompleteStep;
  const textToInlineRichTextHtml = contentModelTools.textToInlineRichTextHtml;
  const sanitizeInlineRichText = contentModelTools.sanitizeInlineRichText;
  const inlineRichTextToPlainText = contentModelTools.inlineRichTextToPlainText;
  const normalizeParagraphBlockData = contentModelTools.normalizeParagraphBlockData;
  const normalizeStepComment = contentModelTools.normalizeStepComment;
  const firstValue = contentModelTools.firstValue;
  const emptyContent = contentModelTools.emptyContent;
  const hasProgressEntries = progressHelpers.hasProgressEntries;
  const lessonProgressKey = progressHelpers.lessonProgressKey;
  const normalizeImportedProgress = progressHelpers.normalizeImportedProgress;
  const normalizeProgressRecordForLesson = progressHelpers.normalizeProgressRecordForLesson;
  const resolveProgressIndex = progressHelpers.resolveProgressIndex;
  const normalizeIndexHint = progressHelpers.normalizeIndexHint;
  // Controle simples para salvar em tempo real sem bloquear a digitacao.
  let persistTimer = null;
  // Conteudo inicial ja considerando recuperacao persistida.
  const bootstrap = loadProjectBootstrap();
  const initialContent = normalizeContent(bootstrap.content || emptyContent());
  const storedProgress = loadProgressStore();
  const bootstrapProgress = normalizeImportedProgress(bootstrap.progress);
  const initialProgress = hasProgressEntries(storedProgress) ? storedProgress : bootstrapProgress;

  // Estado central da aplicacao (single source of truth da UI).
  // Sempre que este objeto muda, a interface e re-renderizada via renderApp().
  const state = {
    content: initialContent,
    progress: initialProgress,
    assets: normalizeAssetStore(bootstrap.assets),
    currentView: "main_menu",
    currentCourseId: null,
    currentLessonId: null,
    currentStepIndex: 0,
    inlinePopupOpen: null,
    flowchartPopupOpen: null,
    tokenByStepId: {},
    ui: {
      sideOpen: false,
      contextMenu: null,
      lessonQuickOpen: false,
      stepComment: null,
      pendingScrollReveal: null,
      pendingImport: null,
      flowchartLayoutCacheByBlockId: {},
      flowchartViewportByKey: {},
      flowchartPinch: null,
      tonePicker: null
    },
    editor: {
      open: false,
      mode: "edit",
      anchorIndex: 0,
      activeBlockId: null,
      activeTableCell: null,
      pendingTableFocus: null,
      editingStepId: null,
      keepStepId: null,
      draftByStepId: {},
      form: null,
      popupBuilder: {
        open: false,
        ownerBlockId: null,
        mainForm: null,
        saving: false,
        pendingPromise: null
      },
      dragType: null,
      pointerDrag: null,
      blockDragId: null,
      imageTarget: null,
      pendingScrollBlockId: null,
      terminalGuardByBlockId: {},
      dragOverTargetId: null,
      dragOverPosition: null
    }
  };

  // Normaliza valores de inset vindos do wrapper Android antes de expor ao CSS.
  function normalizeAndroidInsetValue(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.round(numeric));
  }

  function normalizeAndroidInsetFlag(value) {
    return value === true || value === "true" || value === 1 || value === "1";
  }

  function normalizeAndroidCssPixelValue(value) {
    const numeric = Number.parseFloat(String(value || "0"));
    return normalizeAndroidInsetValue(Number.isFinite(numeric) ? numeric : 0);
  }

  let browserSafeAreaProbe = null;

  function ensureBrowserSafeAreaProbe() {
    if (typeof document === "undefined") return null;
    if (browserSafeAreaProbe && browserSafeAreaProbe.isConnected) return browserSafeAreaProbe;

    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:fixed;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none;" +
      "padding:env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);";
    (document.body || document.documentElement).appendChild(probe);
    browserSafeAreaProbe = probe;
    return probe;
  }

  function readBrowserSafeAreaInsets() {
    if (typeof window !== "undefined" && window.__AraLearnSafeAreaOverride__) {
      const override = window.__AraLearnSafeAreaOverride__;
      return {
        left: normalizeAndroidInsetValue(override.left),
        top: normalizeAndroidInsetValue(override.top),
        right: normalizeAndroidInsetValue(override.right),
        bottom: normalizeAndroidInsetValue(override.bottom)
      };
    }

    if (typeof window === "undefined") {
      return { left: 0, top: 0, right: 0, bottom: 0 };
    }

    const probe = ensureBrowserSafeAreaProbe();
    if (!probe) {
      return { left: 0, top: 0, right: 0, bottom: 0 };
    }

    const computed = window.getComputedStyle(probe);
    return {
      left: normalizeAndroidCssPixelValue(computed.paddingLeft),
      top: normalizeAndroidCssPixelValue(computed.paddingTop),
      right: normalizeAndroidCssPixelValue(computed.paddingRight),
      bottom: normalizeAndroidCssPixelValue(computed.paddingBottom)
    };
  }

  function resolveAndroidSafeAreaInsets(normalized) {
    const browserSafe = readBrowserSafeAreaInsets();
    const prefersWebViewSafeArea = !!normalized.supportsSafeAreaInsets;
    return {
      left: prefersWebViewSafeArea && browserSafe.left > 0 ? browserSafe.left : normalized.left,
      top: prefersWebViewSafeArea && browserSafe.top > 0 ? browserSafe.top : normalized.top,
      right: prefersWebViewSafeArea && browserSafe.right > 0 ? browserSafe.right : normalized.right,
      bottom: prefersWebViewSafeArea && browserSafe.bottom > 0 ? browserSafe.bottom : normalized.bottom
    };
  }

  function applyResolvedAndroidSafeArea(normalized) {
    if (typeof document === "undefined" || !document.documentElement || !document.documentElement.style) {
      return null;
    }

    const resolvedSafeArea = resolveAndroidSafeAreaInsets(normalized);
    const tappableBottom = Math.max(resolvedSafeArea.bottom, normalized.extraGestureBottom);
    const style = document.documentElement.style;
    style.setProperty("--safe-left", resolvedSafeArea.left + "px");
    style.setProperty("--safe-top", resolvedSafeArea.top + "px");
    style.setProperty("--safe-right", resolvedSafeArea.right + "px");
    style.setProperty("--safe-bottom", resolvedSafeArea.bottom + "px");
    style.setProperty("--safe-bottom-tappable", tappableBottom + "px");
    return {
      left: resolvedSafeArea.left,
      top: resolvedSafeArea.top,
      right: resolvedSafeArea.right,
      bottom: resolvedSafeArea.bottom,
      tappableBottom: tappableBottom
    };
  }

  // Espelha insets do host nativo em variáveis CSS para o layout web reagir sem re-render.
  function applyAndroidHostInsets(payload) {
    if (typeof document === "undefined" || !document.documentElement || !document.documentElement.style) {
      return null;
    }

    const safePayload = payload && typeof payload === "object" ? payload : {};
    const normalized = {
      left: normalizeAndroidInsetValue(safePayload.left),
      top: normalizeAndroidInsetValue(safePayload.top),
      right: normalizeAndroidInsetValue(safePayload.right),
      bottom: normalizeAndroidInsetValue(safePayload.bottom),
      extraGestureBottom: normalizeAndroidInsetValue(safePayload.extraGestureBottom),
      imeBottom: normalizeAndroidInsetValue(safePayload.imeBottom),
      supportsSafeAreaInsets: normalizeAndroidInsetFlag(safePayload.supportsSafeAreaInsets),
      supportsImeViewportResize: normalizeAndroidInsetFlag(safePayload.supportsImeViewportResize),
      webViewMajorVersion: normalizeAndroidInsetValue(safePayload.webViewMajorVersion)
    };

    const style = document.documentElement.style;
    style.setProperty("--android-safe-left", normalized.left + "px");
    style.setProperty("--android-safe-top", normalized.top + "px");
    style.setProperty("--android-safe-right", normalized.right + "px");
    style.setProperty("--android-safe-bottom", normalized.bottom + "px");
    style.setProperty("--android-extra-gesture-bottom", normalized.extraGestureBottom + "px");
    style.setProperty("--android-ime-bottom", normalized.imeBottom + "px");
    const resolvedSafeArea = applyResolvedAndroidSafeArea(normalized);

    if (typeof window !== "undefined") {
      window.__AraLearnAndroidInsets__ = normalized;
      window.__AraLearnResolvedSafeArea__ = resolvedSafeArea;
    }

    return normalized;
  }

  // Reage a atualizações de insets emitidas pelo wrapper Android em tempo real.
  function onAndroidInsetsEvent(event) {
    const detail = event && event.detail ? event.detail : null;
    applyAndroidHostInsets(detail);
  }

  function refreshAndroidHostInsets() {
    if (typeof window === "undefined" || !window.__AraLearnAndroidInsets__) return;
    applyAndroidHostInsets(window.__AraLearnAndroidInsets__);
  }

  const bundledSeedChanged = applyBundledProjectSeed();
  pruneProgressStore();
  // Regrava logo no boot o snapshot canônico para estabilizar round-trip de importação/exportação.
  saveProgressStore();
  persistProjectSnapshot();


  // ============================================================================
  // Renderizacao de Telas
  // ============================================================================
  // Renderiza a tela principal conforme o estado atual e injeta overlays (menu lateral, contexto, editor etc.).
  function renderApp() {
    const renderSnapshot = renderStateTools.captureRenderState(root);
    const body =
      state.currentView === "main_menu"
        ? renderMainMenu()
        : state.currentView === "course_menu"
          ? renderCourseMenu()
          : renderLessonView();

    root.innerHTML =
      '<input id="import-json-file" class="hidden-input" type="file" accept=".zip,.json,application/zip,application/json">' +
      '<input id="editor-image-file" class="hidden-input" type="file" accept="image/*">' +
      '<div class="app-shell">' +
      body +
      renderSideMenu() +
      renderContextMenu() +
      renderLessonQuickPanel() +
      (state.editor.open ? renderEditorOverlay() : "") +
      (state.editor.popupBuilder && state.editor.popupBuilder.open ? renderPopupBuilderOverlay() : "") +
      renderTonePicker() +
      "</div>";

    renderStateTools.restoreRenderState(root, renderSnapshot);
    syncEditorActiveBlockVisualState();
    if (state.editor.open) syncAllTableEditorColumnWidths();
    if (state.editor.open && state.editor.activeBlockId) syncBlockAlignTools(state.editor.activeBlockId);
    if (state.editor.open && state.editor.activeBlockId) syncBlockTextStyleTools(state.editor.activeBlockId);
    if (state.editor.open && state.editor.activeTableCell && state.editor.activeTableCell.blockId) {
      syncTableFormatTools(state.editor.activeTableCell.blockId);
    }

    if (state.currentView === "lesson_step") updateProgressBar();
    if (state.editor.open && state.editor.pendingScrollBlockId) {
      const blockId = state.editor.pendingScrollBlockId;
      state.editor.pendingScrollBlockId = null;
      requestAnimationFrame(function () {
        scrollEditorBlockIntoView(blockId);
      });
    }
    if (state.editor.open && state.editor.pendingTableFocus) {
      const cellRef = clone(state.editor.pendingTableFocus);
      state.editor.pendingTableFocus = null;
      requestAnimationFrame(function () {
        focusTableEditorCell(cellRef);
      });
    }
    if (state.ui.pendingScrollReveal) syncPendingScrollReveal();

    // Persistencia em tempo real: sempre que renderizamos apos mudanca de estado, agendamos salvamento.
    scheduleProjectPersist();
  }

  // Monta a tela inicial com todos os cursos cadastrados.
  function renderMainMenu() {
    const cards = state.content.courses
      .map(function (course) {
        const progress = getCourseProgressStats(course);
        return (
          '<article class="clean-card course-card progress-card">' +
          renderCardProgressLayer(progress.percent) +
          '<div class="course-copy">' +
          '<h3 class="card-title">' +
          esc(course.title) +
          "</h3>" +
          '<p class="card-subtitle">' +
          esc(course.description || "Sem descricao") +
          "</p>" +
          '<p class="muted tiny progress-meta">' +
          "Progresso " +
          progress.completed +
          "/" +
          progress.total +
          "</p>" +
          "</div>" +
          '<div class="course-actions">' +
          '<button class="icon-ghost corner-btn" data-action="open-context" data-kind="course" data-course-id="' +
          escAttr(course.id) +
          '" title="Ações do curso" aria-label="Ações do curso">&ctdot;</button>' +
          '<button class="open-main" data-action="open-course" data-course-id="' +
          escAttr(course.id) +
          '" title="Abrir curso" aria-label="Abrir curso">&#9654;</button>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    return (
      '<section class="screen">' +
      renderTopBar({ title: state.content.appTitle || DEFAULT_APP_TITLE, showBack: false, showBrandMark: true }) +
      '<main class="screen-content">' +
      (cards || '<article class="clean-card"><p class="card-subtitle">Nenhum curso.</p></article>') +
      "</main>" +
      "</section>"
    );
  }

  // Monta a tela de um curso com modulos e licoes.
  function renderCourseMenu() {
    const course = getCurrentCourse();
    if (!course) return renderError("Curso não encontrado.");

    const modules = course.modules
      .map(function (moduleItem) {
        const moduleProgress = getModuleProgressStats(course.id, moduleItem);
        const lessons = moduleItem.lessons
          .map(function (lesson) {
            const lessonProgress = getLessonProgressStats(course.id, moduleItem.id, lesson);
            return (
              '<li class="lesson-item progress-row">' +
              renderRowProgressLayer(lessonProgress.percent) +
              '<div class="lesson-copy">' +
              '<strong>' +
              esc(lesson.title) +
              "</strong>" +
              (lesson.subtitle
                ? '<p class="muted tiny">' + esc(lesson.subtitle) + "</p>"
                : "") +
              '<p class="muted tiny progress-meta">' +
              lessonProgress.completed +
              "/" +
              lessonProgress.total +
              "</p>" +
              "</div>" +
              '<div class="lesson-actions">' +
              '<button class="icon-ghost" data-action="open-context" data-kind="lesson" data-module-id="' +
              escAttr(moduleItem.id) +
              '" data-course-id="' +
              escAttr(course.id) +
              '" data-lesson-id="' +
              escAttr(lesson.id) +
              '" title="Ações da lição" aria-label="Ações da lição">&ctdot;</button>' +
              '<button class="open-mini" data-action="open-lesson" data-lesson-id="' +
              escAttr(lesson.id) +
              '" title="Abrir lição" aria-label="Abrir lição">&#9654;</button>' +
              "</div>" +
              "</li>"
            );
          })
          .join("");

        return (
          '<article class="clean-card module-card progress-card">' +
          renderCardProgressLayer(moduleProgress.percent) +
          '<div class="module-head">' +
          '<h3 class="card-title">' +
          esc(moduleItem.title) +
          "</h3>" +
          '<button class="icon-ghost" data-action="open-context" data-kind="module" data-module-id="' +
          escAttr(moduleItem.id) +
          '" data-course-id="' +
          escAttr(course.id) +
          '" title="Ações do módulo" aria-label="Ações do módulo">&ctdot;</button>' +
          "</div>" +
          '<p class="muted tiny progress-meta">' +
          "Progresso " +
          moduleProgress.completed +
          "/" +
          moduleProgress.total +
          "</p>" +
          '<ul class="lesson-list">' +
          (lessons || '<li class="lesson-item"><p class="muted tiny">Sem lições.</p></li>') +
          "</ul>" +
          "</article>"
        );
      })
      .join("");

    return (
      '<section class="screen">' +
      renderTopBar({ title: course.title, showBack: true }) +
      '<main class="screen-content">' +
      (modules || '<article class="clean-card"><p class="card-subtitle">Sem módulos.</p></article>') +
      "</main>" +
      "</section>"
    );
  }

  // Desenha a camada visual de progresso para cards (curso/modulo).
  function renderCardProgressLayer(percent) {
    const value = clamp(Number(percent) || 0, 0, 100);
    return '<div class="card-progress-fill" style="width:' + value + '%"></div>';
  }

  // Desenha a camada visual de progresso para linhas (licoes).
  function renderRowProgressLayer(percent) {
    const value = clamp(Number(percent) || 0, 0, 100);
    return '<div class="row-progress-fill" style="width:' + value + '%"></div>';
  }

  // Renderiza a tela de estudo da licao (topo, progresso e card atual).
  function renderLessonView() {
    const lessonEntry = getCurrentLessonEntry();
    if (!lessonEntry) return renderError("Lição não encontrada.");
    const step = getCurrentStep();
    if (!step) return renderError("Card não encontrado.");
    const exerciseLayout = isExerciseDrivenStep(step);
    const stepHtml = renderStepContent(step);

    return (
      '<section class="screen lesson-screen">' +
      '<header class="lesson-topbar">' +
      '<div class="lesson-nav-left">' +
      '<button class="icon-ghost" data-action="lesson-home" title="Módulos" aria-label="Módulos">&#8962;</button>' +
      '<button class="icon-ghost" data-action="back-step" title="Voltar" aria-label="Voltar">&larr;</button>' +
      "</div>" +
      '<div class="progress-wrap"><div class="progress-track"><div id="progress-fill" class="progress-fill"></div></div></div>' +
      '<div class="lesson-top-actions">' +
      '<button class="icon-ghost" data-action="toggle-lesson-quick" title="Ações da lição" aria-label="Ações da lição">&#9998;</button>' +
      '<button class="icon-ghost" data-action="exit-lesson" title="Sair" aria-label="Sair">&times;</button>' +
      "</div>" +
      "</header>" +
      '<main class="screen-content' + (exerciseLayout ? " lesson-exercise-layout" : "") + '">' +
      '<section class="lesson-stage">' +
      '<p class="muted tiny lesson-stage-meta">' +
      esc(lessonEntry.module.title + " - " + lessonEntry.lesson.title) +
      "</p>" +
      renderStepCommentPopup() +
      stepHtml +
      "</section>" +
      "</main>" +
      renderStepActionDock(step) +
      "</section>"
    );
  }

  // Renderiza um card de conteudo comum.
  function renderStepContent(step) {
    const completeClass = step.type === "lesson_complete" ? " complete" : "";
    const exerciseClass = stepHasEditorExercise(step) ? " exercise-card" : "";
    return (
      '<article class="clean-card lesson-card' +
      completeClass +
      exerciseClass +
      '">' +
      '<div class="lesson-card-body">' +
      (step.type === "lesson_complete" ? '<div class="complete-mark">&#10003;</div>' : "") +
      renderStepBlocks(step) +
      "</div>" +
      "</article>"
    );
  }

  // Monta o topo padrao das telas de menu.
  function renderTopBar(config) {
    const showBrandMark = !!config.showBrandMark;
    const titleHtml = showBrandMark
      ? '<span class="brand-title"><span class="brand-mark" aria-hidden="true">荒</span><span class="brand-text">' +
        esc(config.title || "") +
        "</span></span>"
      : esc(config.title || "");

    return (
      '<header class="topbar">' +
      (config.showBack
        ? '<button class="icon-ghost" data-action="go-main" title="Menu principal" aria-label="Menu principal">&larr;</button>'
        : '<div class="topbar-space"></div>') +
      '<h1 class="topbar-title">' +
      titleHtml +
      "</h1>" +
      '<button class="icon-ghost" data-action="toggle-side" title="Ações" aria-label="Ações">&#9776;</button>' +
      "</header>"
    );
  }

  // Monta o menu lateral com acoes globais do app.
  function renderSideMenu() {
    const actions = getSideActions()
      .map(function (action) {
        const disabled = !!action.disabled;
        return (
          '<button class="side-icon' +
          (disabled ? " disabled-icon" : "") +
          '" data-action="' +
          escAttr(action.action) +
          '" title="' +
          escAttr(action.label) +
          '" aria-label="' +
          escAttr(action.label) +
          '"' +
          (disabled ? " disabled aria-disabled=\"true\"" : "") +
          ">" +
          action.icon +
          "</button>"
        );
      })
      .join("");

    return (
      '<section class="side-overlay ' +
      (state.ui.sideOpen ? "open" : "") +
      '">' +
      '<aside class="side-menu">' +
      '<div class="side-grid">' +
      actions +
      "</div>" +
      "</aside>" +
      "</section>"
    );
  }

  // Define quais acoes aparecem no menu lateral de acordo com a tela atual.
  function getSideActions() {
    const list = [];

    list.push({ action: "create-course", label: "Novo curso", icon: "&#43;" });
    if (state.currentView === "main_menu") {
      list.push({ action: "edit-app-title", label: "Editar título", icon: "&#9998;" });
    }
    if (state.currentView === "course_menu") {
      list.push({ action: "create-module", label: "Novo módulo", icon: "&#9638;" });
    }
    list.push({ action: "import-json-trigger", label: "Importar", icon: "&#8681;" });
    list.push({ action: "export-json", label: "Exportar", icon: "&#8679;" });

    return list;
  }

  // Renderiza o menu contextual de cada card (botao ...).
  function renderContextMenu() {
    if (!state.ui.contextMenu) return "";

    const items = getContextMenuActions(state.ui.contextMenu)
      .map(function (item) {
        const disabled = !!item.disabled;
        return (
          '<button class="context-icon' +
          (disabled ? " disabled-icon" : "") +
          '" data-action="' +
          escAttr(item.action) +
          '" title="' +
          escAttr(item.label) +
          '" aria-label="' +
          escAttr(item.label) +
          '"' +
          (disabled ? " disabled aria-disabled=\"true\"" : "") +
          ">" +
          item.icon +
          "</button>"
        );
      })
      .join("");

    return '<section class="context-overlay"><div class="context-menu">' + items + "</div></section>";
  }

  // Define os icones/acoes do menu contextual para curso, modulo ou licao.
  function getContextMenuActions(context) {
    if (context.kind === "course") {
      return [
        { action: "context-edit", label: "Editar curso", icon: "&#9998;" },
        { action: "context-import-course", label: "Importar", icon: "&#8681;" },
        { action: "context-export-course", label: "Exportar", icon: "&#8679;" },
        { action: "context-reset", label: "Zerar progresso do curso", icon: "&#8635;" },
        { action: "context-delete", label: "Excluir curso", icon: "&#128465;" }
      ];
    }

    if (context.kind === "module") {
      const move = getModuleMoveState(context.moduleId);
      return [
        { action: "context-module-up", label: "Mover módulo para cima", icon: "&uarr;", disabled: !move.canMoveUp },
        { action: "context-module-down", label: "Mover módulo para baixo", icon: "&darr;", disabled: !move.canMoveDown },
        { action: "context-edit", label: "Editar módulo", icon: "&#9998;" },
        { action: "context-create-lesson", label: "Nova lição", icon: "&#43;" },
        { action: "context-import-module", label: "Importar", icon: "&#8681;" },
        { action: "context-export-module", label: "Exportar", icon: "&#8679;" },
        { action: "context-reset", label: "Zerar progresso do módulo", icon: "&#8635;" },
        { action: "context-delete", label: "Excluir módulo", icon: "&#128465;" }
      ];
    }

    if (context.kind === "lesson") {
      const move = getLessonMoveState(context.moduleId, context.lessonId);
      return [
        { action: "context-move-up", label: "Mover lição para cima", icon: "&uarr;", disabled: !move.canMoveUp },
        { action: "context-move-down", label: "Mover lição para baixo", icon: "&darr;", disabled: !move.canMoveDown },
        { action: "context-edit", label: "Editar lição", icon: "&#9998;" },
        { action: "context-import-lesson", label: "Importar", icon: "&#8681;" },
        { action: "context-export-lesson", label: "Exportar", icon: "&#8679;" },
        { action: "context-reset", label: "Zerar progresso da lição", icon: "&#8635;" },
        { action: "context-delete", label: "Excluir lição", icon: "&#128465;" }
      ];
    }

    return [
      { action: "context-edit", label: "Editar item", icon: "&#9998;" }
    ];
  }

  // Calcula se o modulo pode subir/descer dentro do curso atual.
  function getModuleMoveState(moduleId) {
    const course = getCurrentCourse();
    if (!course) return { canMoveUp: false, canMoveDown: false };

    const moduleIndex = course.modules.findIndex(function (moduleItem) {
      return moduleItem.id === moduleId;
    });
    if (moduleIndex === -1) return { canMoveUp: false, canMoveDown: false };

    return {
      canMoveUp: moduleIndex > 0,
      canMoveDown: moduleIndex < course.modules.length - 1
    };
  }

  // Calcula se a licao pode subir/descer dentro do modulo.
  function getLessonMoveState(moduleId, lessonId) {
    const moduleEntry = findModule(state.currentCourseId, moduleId);
    if (!moduleEntry) return { canMoveUp: false, canMoveDown: false };

    const lessonIndex = moduleEntry.module.lessons.findIndex(function (lesson) {
      return lesson.id === lessonId;
    });
    if (lessonIndex === -1) return { canMoveUp: false, canMoveDown: false };

    return {
      canMoveUp: lessonIndex > 0,
      canMoveDown: lessonIndex < moduleEntry.module.lessons.length - 1
    };
  }

  // Renderiza painel rapido da licao (inserir, editar, excluir card).
  function renderLessonQuickPanel() {
    if (!(state.currentView === "lesson_step" && state.ui.lessonQuickOpen)) return "";

    return (
      '<section class="quick-overlay">' +
      '<div class="quick-panel">' +
      '<button class="quick-icon" data-action="step-insert-before" title="Inserir antes" aria-label="Inserir antes">&#8679;&#43;</button>' +
      '<button class="quick-icon" data-action="step-insert-after" title="Inserir depois" aria-label="Inserir depois">&#8681;&#43;</button>' +
      '<button class="quick-icon" data-action="step-edit" title="Editar card" aria-label="Editar card">&#9998;</button>' +
      '<button class="quick-icon" data-action="step-delete" title="Excluir card" aria-label="Excluir card">&#128465;</button>' +
      "</div>" +
      "</section>"
    );
  }
  // Renderiza a camada do editor visual de card.
  function renderEditorOverlay() {
    const form = state.editor.form || blankEditorForm("content");
    const navigator = renderEditorStepNavigator();
    const content = renderCanvasEditor(form);

    return (
      '<section class="editor-overlay">' +
      '<article class="editor-sheet">' +
      '<header class="editor-head">' +
      '<button class="icon-ghost" data-action="editor-close" title="Fechar" aria-label="Fechar">&times;</button>' +
      '<p class="tiny muted editor-title">Editor de card</p>' +
      '<button class="icon-ghost" data-action="editor-save" title="Salvar" aria-label="Salvar">&#10003;</button>' +
      "</header>" +
      '<div class="editor-body">' +
      navigator +
      content +
      "</div>" +
      "</article>" +
      "</section>"
    );
  }

  // Renderiza navegacao entre cards quando o editor esta no modo "editar".
  function renderEditorStepNavigator() {
    if (!(state.editor.open && state.editor.mode === "edit")) return "";

    const lessonEntry = getCurrentLessonEntry();
    if (!lessonEntry) return "";

    const steps = lessonEntry.lesson.steps || [];
    if (!steps.length) return "";

    const activeIndex = getEditorStepIndex(lessonEntry);
    const prevDisabled = activeIndex <= 0;
    const nextDisabled = activeIndex >= steps.length - 1;

    const chips = steps
      .map(function (step, index) {
        const label = clean(step.title, "Card " + String(index + 1));
        return (
          '<button class="editor-step-chip' +
          (index === activeIndex ? " active" : "") +
          '" data-action="editor-open-step" data-editor-step-index="' +
          index +
          '" title="' +
          escAttr("Card " + String(index + 1) + ": " + label) +
          '" aria-label="' +
          escAttr("Abrir card " + String(index + 1)) +
          '">' +
          '<span class="chip-index">' +
          String(index + 1) +
          "</span>" +
          '<span class="chip-text">' +
          esc(label) +
          "</span>" +
          "</button>"
        );
      })
      .join("");

    return (
      '<section class="editor-step-nav">' +
      '<div class="editor-step-nav-head">' +
      '<button class="icon-ghost tiny-icon" data-action="editor-prev-step" title="Card anterior" aria-label="Card anterior" ' +
      (prevDisabled ? "disabled aria-disabled=\"true\"" : "") +
      '>&larr;</button>' +
      '<p class="tiny muted">Card ' +
      String(activeIndex + 1) +
      " de " +
      String(steps.length) +
      "</p>" +
      '<button class="icon-ghost tiny-icon" data-action="editor-next-step" title="Próximo card" aria-label="Próximo card" ' +
      (nextDisabled ? "disabled aria-disabled=\"true\"" : "") +
      '>&rarr;</button>' +
      "</div>" +
      '<div class="editor-step-strip">' +
      chips +
      "</div>" +
      "</section>"
    );
  }

  // Renderiza editor dedicado para os blocos que vivem dentro do popup do botão.
  function renderPopupBuilderOverlay() {
    return (
      '<section class="editor-overlay popup-builder-overlay">' +
      '<article class="editor-sheet popup-builder-sheet">' +
      '<header class="editor-head">' +
      '<button class="icon-ghost" data-action="popup-builder-close" title="Fechar">&times;</button>' +
      '<p class="tiny muted editor-title">Conteúdo do popup</p>' +
      '<button class="icon-ghost" data-action="popup-builder-save" title="Salvar">&#10003;</button>' +
      '</header>' +
      '<div class="editor-body popup-builder-body">' +
      renderCanvasEditor(state.editor.form || blankEditorForm("content"), {
        paletteTypes: POPUP_BLOCK_KINDS,
        hideFinalButton: true,
        popupMode: true
      }) +
      '<footer class="popup-builder-footer-preview">' +
      '<div class="block-fixed block-fixed-button popup-builder-button-shell">' +
      '<div class="lesson-next-wrap">' +
      '<button class="next-icon step-main-btn" type="button" disabled aria-disabled="true" tabindex="-1" title="Continuar" aria-label="Continuar">&#10140;</button>' +
      "</div>" +
      "</div>" +
      "</footer>" +
      "</div>" +
      "</article>" +
      "</section>"
    );
  }

  // Renderiza paleta simples de cores para o trecho selecionado.
  function renderTonePicker() {
    const picker = state.ui.tonePicker;
    if (!picker || !state.editor.open) return "";

    const tones = [
      { id: "tone-default", label: "Padrão", swatchClass: "tone-swatch-default" },
      { id: "tone-gold", label: "Dourado", swatchClass: "tone-swatch-gold" },
      { id: "tone-mint", label: "Menta", swatchClass: "tone-swatch-mint" },
      { id: "tone-coral", label: "Coral", swatchClass: "tone-swatch-coral" }
    ];

    return (
      '<section class="tone-picker-overlay">' +
      '<button class="tone-picker-backdrop" data-action="tone-picker-close" aria-label="Fechar paleta"></button>' +
      '<article class="tone-picker-sheet">' +
      '<div class="tone-picker-grid">' +
      tones.map(function (tone) {
        return (
          '<button class="tone-picker-option" data-action="tone-picker-apply" data-block-id="' +
          escAttr(picker.blockId || "") +
          '" data-tone-id="' +
          escAttr(tone.id) +
          '">' +
          '<span class="tone-swatch ' + tone.swatchClass + '" aria-hidden="true"></span>' +
          '<span class="tiny">' + esc(tone.label) + "</span>" +
          "</button>"
        );
      }).join("") +
      "</div>" +
      "</article>" +
      "</section>"
    );
  }

  // Compara duas referências de célula da tabela.
  function isSameTableCellRef(left, right) {
    return !!left &&
      !!right &&
      left.blockId === right.blockId &&
      left.role === right.role &&
      Number(left.rowIndex) === Number(right.rowIndex) &&
      Number(left.columnIndex) === Number(right.columnIndex);
  }

  // Retorna a célula atualmente ativa da tabela, com fallback para o primeiro cabeçalho.
  function getActiveTableCellRef(blockId, table) {
    const width = table && Array.isArray(table.headers) && table.headers.length ? table.headers.length : 1;
    const fallback = {
      blockId: blockId,
      role: "title",
      rowIndex: -1,
      columnIndex: 0
    };
    const current = state.editor.activeTableCell;
    if (!current || current.blockId !== blockId) return fallback;
    if (current.role === "title") {
      return {
        blockId: blockId,
        role: "title",
        rowIndex: -1,
        columnIndex: 0
      };
    }
    const role = current.role === "body" ? "body" : "header";
    const safeColumn = clamp(Number(current.columnIndex) || 0, 0, width - 1);
    if (role === "body") {
      const rowCount = table && Array.isArray(table.rows) && table.rows.length ? table.rows.length : 1;
      return {
        blockId: blockId,
        role: "body",
        rowIndex: clamp(Number(current.rowIndex) || 0, 0, rowCount - 1),
        columnIndex: safeColumn
      };
    }
    return {
      blockId: blockId,
      role: "header",
      rowIndex: -1,
      columnIndex: safeColumn
    };
  }

  // Busca a célula estilizada da tabela a partir da referência ativa.
  function getTableCellFromDraft(table, cellRef) {
    if (!table) return createBlankTableCell("body");
    if (cellRef && cellRef.role === "title") {
      return normalizeTableCell(table.titleStyle, "header");
    }
    if (cellRef && cellRef.role === "body") {
      return normalizeTableCell(
        table.rows[cellRef.rowIndex] && table.rows[cellRef.rowIndex][cellRef.columnIndex],
        "body"
      );
    }
    return normalizeTableCell(table.headers[cellRef && cellRef.columnIndex], "header");
  }

  // Desenha ícone simples de alinhamento para os controles da tabela.
  function renderAlignGlyph(align) {
    const mode =
      align === "left" || align === "center" || align === "right"
        ? align
        : "left";
    const x = mode === "left" ? ["1", "1", "1"] : mode === "center" ? ["3", "1", "2"] : ["5", "3", "1"];
    return (
      '<svg class="table-align-glyph table-align-glyph-' +
      escAttr(mode) +
      '" viewBox="0 0 16 12" aria-hidden="true" focusable="false">' +
      '<rect x="' + x[0] + '" y="1" width="10" height="1.5" rx="0.75"></rect>' +
      '<rect x="' + x[1] + '" y="5" width="14" height="1.5" rx="0.75"></rect>' +
      '<rect x="' + x[2] + '" y="9" width="12" height="1.5" rx="0.75"></rect>' +
      "</svg>"
    );
  }

  // Sincroniza os botões de formatação da tabela conforme a célula ativa no DOM.
  function syncTableFormatTools(blockId) {
    if (!state.editor.open || !blockId) return;
    const blockNode = getEditorDomScope().querySelector('.builder-block[data-block-id="' + cssEsc(blockId) + '"]');
    if (!blockNode) return;

    const activeField = getTableEditorCellField(state.editor.activeTableCell);
    blockNode.querySelectorAll("[data-table-header-cell], [data-table-cell], [data-table-title]").forEach(function (field) {
      field.classList.toggle("is-active-cell", !!activeField && field === activeField);
    });
    if (!activeField) return;

    const bold = activeField.getAttribute("data-table-bold") === "1";
    const italic = activeField.getAttribute("data-table-italic") === "1";
    const tone = activeField.getAttribute("data-table-tone") || "default";
    const align = activeField.getAttribute("data-table-align") || "left";

    const setActive = function (selector, value) {
      const button = blockNode.querySelector(selector);
      if (button) button.classList.toggle("active", !!value);
    };

    setActive('[data-action="table-style-bold"]', bold);
    setActive('[data-action="table-style-italic"]', italic);
    setActive('[data-action="table-open-tone-picker"]', tone !== "default");
    setActive('[data-action="table-align-left"]', align === "left");
    setActive('[data-action="table-align-center"]', align === "center");
    setActive('[data-action="table-align-right"]', align === "right");
  }

  // Mantém o painel de lacunas da tabela sincronizado com a célula ativa sem rerender completo.
  function syncTableExerciseTools(blockId) {
    if (!state.editor.open || !blockId) return;
    const blockNode = getEditorDomScope().querySelector('.builder-block[data-block-id="' + cssEsc(blockId) + '"]');
    if (!blockNode) return;

    const existing = blockNode.querySelector(".table-cell-exercise-tools");
    const anchor = blockNode.querySelector(".table-editor-scroll") || blockNode.querySelector(".table-format-tools");
    if (!anchor) return;

    const html = renderTableExerciseTools({ id: blockId }, collectTableDraftFromBlockNode(blockNode));
    if (!html) {
      if (existing) existing.remove();
      return;
    }

    if (existing) {
      existing.outerHTML = html;
      return;
    }

    anchor.insertAdjacentHTML("afterend", html);
  }

  // Renderiza a barra de formatação por célula da tabela.
  function renderTableFormatTools(block, table) {
    const activeCell = getActiveTableCellRef(block.id, table);
    const cell = getTableCellFromDraft(table, activeCell);
    return (
      '<div class="builder-subtools builder-subtools-text table-format-tools">' +
      '<button class="icon-ghost tiny-icon text-style-toggle' +
      (cell.bold ? " active" : "") +
      '" data-action="table-style-bold" data-block-id="' +
      escAttr(block.id) +
      '" title="Aplicar negrito" aria-label="Aplicar negrito"><span class="text-style-glyph text-style-glyph-bold">B</span></button>' +
      '<button class="icon-ghost tiny-icon text-style-toggle' +
      (cell.italic ? " active" : "") +
      '" data-action="table-style-italic" data-block-id="' +
      escAttr(block.id) +
      '" title="Aplicar itálico" aria-label="Aplicar itálico"><span class="text-style-glyph text-style-glyph-italic">I</span></button>' +
      '<button class="icon-ghost tiny-icon text-style-toggle text-style-toggle-tone' +
      (cell.tone !== "default" ? " active" : "") +
      '" data-action="table-open-tone-picker" data-block-id="' +
      escAttr(block.id) +
      '" title="Escolher cor" aria-label="Escolher cor"><span class="text-style-glyph">A</span></button>' +
      '<button class="icon-ghost tiny-icon text-style-toggle' +
      (cell.align === "left" ? " active" : "") +
      '" data-action="table-align-left" data-block-id="' +
      escAttr(block.id) +
      '" title="Alinhar à esquerda" aria-label="Alinhar à esquerda">' +
      renderAlignGlyph("left") +
      "</button>" +
      '<button class="icon-ghost tiny-icon text-style-toggle' +
      (cell.align === "center" ? " active" : "") +
      '" data-action="table-align-center" data-block-id="' +
      escAttr(block.id) +
      '" title="Centralizar" aria-label="Centralizar">' +
      renderAlignGlyph("center") +
      "</button>" +
      '<button class="icon-ghost tiny-icon text-style-toggle' +
      (cell.align === "right" ? " active" : "") +
      '" data-action="table-align-right" data-block-id="' +
      escAttr(block.id) +
      '" title="Alinhar à direita" aria-label="Alinhar à direita">' +
      renderAlignGlyph("right") +
      "</button>" +
      "</div>"
    );
  }

  // Monta classes extras da célula de tabela no editor quando ela vira lacuna.
  function getTableBuilderCellClassNames(cell) {
    const classes = [getTableCellClassNames(cell)];
    if (tableCellUsesChoiceBlank(cell)) classes.push("is-table-blank", "is-table-blank-choice");
    if (tableCellUsesInputBlank(cell)) classes.push("is-table-blank", "is-table-blank-input");
    return classes.filter(Boolean).join(" ");
  }

  // Serializa metadados de exercício da célula em atributos HTML do editor.
  function renderTableCellExerciseAttrs(cell) {
    const normalized = normalizeTableCell(cell, "body");
    return (
      ' data-table-blank="' +
      (normalized.blank ? "1" : "0") +
      '" data-table-interaction-mode="' +
      escAttr(normalized.interactionMode) +
      '" data-table-placeholder="' +
      escAttr(normalized.placeholder || "") +
      '" data-table-options="' +
      escAttr(JSON.stringify(normalized.options || [])) +
      '"'
    );
  }

  // Renderiza painel da célula ativa para transformar a tabela em exercício.
  function renderTableExerciseTools(block, table) {
    const activeCell = getActiveTableCellRef(block.id, table);
    if (!activeCell || activeCell.role === "title") return "";

    const cell = getTableCellFromDraft(table, activeCell);
    const optionRows = normalizeTableChoiceOptions(cell.options).map(function (option) {
      return (
        '<div class="choice-row choice-row-simulator table-choice-row" data-table-choice-option-row="true" data-option-id="' +
        escAttr(option.id) +
        '">' +
        '<input class="block-input" type="text" data-table-choice-option-input="true" data-block-id="' +
        escAttr(block.id) +
        '" data-option-id="' +
        escAttr(option.id) +
        '" value="' +
        escAttr(option.value || "") +
        '" placeholder="Opção da célula">' +
        '<button class="icon-ghost tiny-icon" data-action="table-choice-remove-option" data-block-id="' +
        escAttr(block.id) +
        '" data-option-id="' +
        escAttr(option.id) +
        '" title="Remover opção">&times;</button>' +
        "</div>"
      );
    }).join("");

    return (
      '<section class="editor-mode-config table-cell-exercise-tools">' +
      '<p class="tiny muted table-cell-exercise-label">' +
      esc(getTableCellLabel(activeCell)) +
      "</p>" +
      '<div class="editor-mode-choice-options table-cell-exercise-state" role="radiogroup" aria-label="Tipo da célula">' +
      '<label class="editor-mode-option">' +
      '<input type="radio" name="table-cell-blank-mode-' +
      escAttr(block.id) +
      '" data-table-cell-blank-mode="true" data-block-id="' +
      escAttr(block.id) +
      '" value="static"' +
      (cell.blank ? "" : " checked") +
      '>' +
      "<span>Texto</span>" +
      "</label>" +
      '<label class="editor-mode-option">' +
      '<input type="radio" name="table-cell-blank-mode-' +
      escAttr(block.id) +
      '" data-table-cell-blank-mode="true" data-block-id="' +
      escAttr(block.id) +
      '" value="blank"' +
      (cell.blank ? " checked" : "") +
      '>' +
      "<span>Lacuna</span>" +
      "</label>" +
      "</div>" +
      (cell.blank
        ? '<div class="editor-mode-choice-options table-cell-exercise-modes" role="radiogroup" aria-label="Modo da lacuna">' +
          '<label class="editor-mode-option">' +
          '<input type="radio" name="table-cell-interaction-' +
          escAttr(block.id) +
          '" data-table-cell-interaction="true" data-block-id="' +
          escAttr(block.id) +
          '" value="choice"' +
          (cell.interactionMode === "input" ? "" : " checked") +
          '>' +
          "<span>Opções</span>" +
          "</label>" +
          '<label class="editor-mode-option">' +
          '<input type="radio" name="table-cell-interaction-' +
          escAttr(block.id) +
          '" data-table-cell-interaction="true" data-block-id="' +
          escAttr(block.id) +
          '" value="input"' +
          (cell.interactionMode === "input" ? " checked" : "") +
          '>' +
          "<span>Digitação</span>" +
          "</label>" +
          "</div>" +
          '<input class="block-input" type="text" data-table-cell-placeholder-input="true" data-block-id="' +
          escAttr(block.id) +
          '" value="' +
          escAttr(cell.placeholder || "") +
          '" placeholder="Placeholder opcional da lacuna">' +
          (cell.interactionMode === "choice"
            ? '<section class="terminal-config table-choice-config">' +
              '<div class="config-actions">' +
              '<button class="icon-ghost tiny-icon" data-action="table-choice-add-option" data-block-id="' +
              escAttr(block.id) +
              '" title="Adicionar opção">+</button>' +
              "</div>" +
              '<div class="choice-list">' +
              optionRows +
              "</div>" +
              "</section>"
            : '<p class="tiny muted table-cell-exercise-tip">A resposta esperada continua sendo o texto da própria célula.</p>')
        : '<p class="tiny muted table-cell-exercise-tip">Sem lacuna, a célula continua só expositiva no runtime.</p>') +
      "</section>"
    );
  }

  // Renderiza UI de edição do bloco de tabela como grade direta.
  function renderTableBuilder(block) {
    const table = normalizeTableDraft(block);
    const activeCell = getActiveTableCellRef(block.id, table);
    const columnWidths = getTableEditorColumnWidths(table);
    const colgroupHtml =
      '<col class="table-editor-row-control-col" style="width:22px">' +
      columnWidths.map(function (widthCh, columnIndex) {
        return (
          '<col data-table-column-width="true" data-column-index="' +
          String(columnIndex) +
          '" style="width:' +
          "calc(" + String(widthCh) + "ch + 1.1rem)" +
          '">'
        );
      }).join("") +
      '<col class="table-editor-add-control-col" style="width:22px">';

    const headerHtml = table.headers.map(function (header, columnIndex) {
      const cellRef = {
        blockId: block.id,
        role: "header",
        rowIndex: -1,
        columnIndex: columnIndex
      };
      const activeClass = isSameTableCellRef(activeCell, cellRef) ? " is-active-cell" : "";
      return (
        "<th>" +
        '<div class="table-editor-cell-shell table-editor-header-shell">' +
        '<input class="block-input table-editor-input ' +
        getTableBuilderCellClassNames(header) +
        activeClass +
        '" type="text" data-table-header-cell="true" data-column-index="' +
        String(columnIndex) +
        '" data-table-cell-role="header" data-table-align="' +
        escAttr(header.align) +
        '" data-table-bold="' +
        (header.bold ? "1" : "0") +
        '" data-table-italic="' +
        (header.italic ? "1" : "0") +
        '" data-table-tone="' +
        escAttr(header.tone) +
        '"' +
        renderTableCellExerciseAttrs(header) +
        ' value="' +
        escAttr(header.value || "") +
        '" placeholder="Coluna">' +
        '<button class="icon-ghost tiny-icon table-editor-remove table-editor-remove-column" data-action="table-remove-column" data-block-id="' +
        escAttr(block.id) +
        '" data-column-index="' +
        String(columnIndex) +
        '" title="Remover coluna" aria-label="Remover coluna"><span class="table-editor-remove-glyph" aria-hidden="true">&times;</span></button>' +
        "</div>" +
        "</th>"
      );
    }).join("");

    const rowsHtml = table.rows.map(function (row, rowIndex) {
      const cellsHtml = row.map(function (cell, columnIndex) {
        const cellRef = {
          blockId: block.id,
          role: "body",
          rowIndex: rowIndex,
          columnIndex: columnIndex
        };
        const activeClass = isSameTableCellRef(activeCell, cellRef) ? " is-active-cell" : "";
        return (
          "<td>" +
          '<div class="table-editor-cell-shell">' +
          '<input class="block-input table-editor-input ' +
          getTableBuilderCellClassNames(cell) +
          activeClass +
          '" type="text" data-table-cell="true" data-row-index="' +
          String(rowIndex) +
          '" data-column-index="' +
          String(columnIndex) +
          '" data-table-cell-role="body" data-table-align="' +
          escAttr(cell.align) +
          '" data-table-bold="' +
          (cell.bold ? "1" : "0") +
          '" data-table-italic="' +
          (cell.italic ? "1" : "0") +
          '" data-table-tone="' +
          escAttr(cell.tone) +
          '"' +
          renderTableCellExerciseAttrs(cell) +
          ' value="' +
          escAttr(cell.value || "") +
          '" placeholder="Valor">' +
          "</div>" +
          "</td>"
        );
      }).join("");

      return (
        '<tr data-table-body-row="true" data-row-index="' +
        String(rowIndex) +
        '">' +
        '<th class="table-editor-row-head">' +
        '<div class="table-editor-row-head-shell">' +
        '<button class="icon-ghost tiny-icon table-editor-remove" data-action="table-remove-row" data-block-id="' +
        escAttr(block.id) +
        '" data-row-index="' +
        String(rowIndex) +
        '" title="Remover linha" aria-label="Remover linha"><span class="table-editor-remove-glyph" aria-hidden="true">&times;</span></button>' +
        "</div>" +
        "</th>" +
        cellsHtml +
        '<td class="table-editor-side-spacer" aria-hidden="true"><div class="table-editor-cell-shell"></div></td>' +
        "</tr>"
      );
    }).join("");

    const addRowSpacerHtml = table.headers.map(function () {
      return '<td class="table-editor-add-row-spacer" aria-hidden="true"><div class="table-editor-cell-shell"></div></td>';
    }).join("");
    const titleActiveClass = activeCell.role === "title" ? " is-active-cell" : "";

    return (
      '<section class="table-config">' +
      renderTableFormatTools(block, table) +
      '<input class="block-input table-editor-input table-editor-title-input ' +
      getTableCellClassNames(table.titleStyle) +
      titleActiveClass +
      '" type="text" data-table-title="true" data-table-cell-role="title" data-table-align="' +
      escAttr(table.titleStyle.align) +
      '" data-table-bold="' +
      (table.titleStyle.bold ? "1" : "0") +
      '" data-table-italic="' +
      (table.titleStyle.italic ? "1" : "0") +
      '" data-table-tone="' +
      escAttr(table.titleStyle.tone) +
      '" value="' +
      escAttr(table.title || "") +
      '" placeholder="Título">' +
      '<div class="table-editor-scroll">' +
      '<table class="table-editor-grid">' +
      "<colgroup>" +
      colgroupHtml +
      "</colgroup>" +
      "<thead>" +
      "<tr>" +
      '<th class="table-editor-corner" aria-hidden="true"><div class="table-editor-row-head-shell table-editor-corner-shell"></div></th>' +
      headerHtml +
      '<th class="table-editor-add-head"><div class="table-editor-row-head-shell"><button class="icon-ghost tiny-icon table-editor-add" data-action="table-add-column" data-block-id="' +
      escAttr(block.id) +
      '" title="Adicionar coluna" aria-label="Adicionar coluna"><span class="table-editor-remove-glyph" aria-hidden="true">+</span></button></div></th>' +
      "</tr>" +
      "</thead>" +
      "<tbody>" +
      rowsHtml +
      '<tr class="table-editor-add-row">' +
      '<th class="table-editor-row-head table-editor-row-head-add"><div class="table-editor-row-head-shell"><button class="icon-ghost tiny-icon table-editor-add" data-action="table-add-row" data-block-id="' +
      escAttr(block.id) +
      '" title="Adicionar linha" aria-label="Adicionar linha"><span class="table-editor-remove-glyph" aria-hidden="true">+</span></button></div></th>' +
      addRowSpacerHtml +
      '<td class="table-editor-add-corner" aria-hidden="true"><div class="table-editor-cell-shell"></div></td>' +
      "</tr>" +
      "</tbody>" +
      "</table>" +
      "</div>" +
      renderTableExerciseTools(block, table) +
      "</section>"
    );
  }

  // Renderiza UI de edição do bloco de múltipla escolha.
  function renderMultipleChoiceBuilder(block) {
    const normalized = normalizeMultipleChoiceBlock(block);
    const answerState = normalized.answerState;
    const optionsHtml = normalized.options.map(function (option, optionIndex) {
      const answer = !!option.answer;
      return (
        '<div class="choice-row choice-row-multiple" data-choice-option-row="true" data-option-id="' +
        escAttr(option.id || "") +
        '" data-option-answer="' +
        (answer ? "1" : "0") +
        '">' +
        '<button class="icon-ghost tiny-icon option-toggle' +
        (answer ? " active" : "") +
        '" data-action="choice-toggle-answer" data-block-id="' +
        escAttr(block.id) +
        '" data-option-id="' +
        escAttr(option.id || "") +
        '" title="' +
        escAttr(answer ? "Desmarcar resposta" : "Marcar como resposta") +
        '">' +
        (answer ? "&#9679;" : "&#9675;") +
        "</button>" +
        '<input type="text" data-choice-option="true" data-block-id="' +
        escAttr(block.id) +
        '" data-option-id="' +
        escAttr(option.id || "") +
        '" value="' +
        escAttr(option.value || "") +
        '" placeholder="Alternativa">' +
        '<button class="icon-ghost tiny-icon" data-action="choice-remove-option" data-block-id="' +
        escAttr(block.id) +
        '" data-option-id="' +
        escAttr(option.id || "") +
        '" title="Remover alternativa">&times;</button>' +
        "</div>"
      );
    }).join("");

    return (
      '<section class="multiple-choice-config">' +
      '<div class="editor-mode-choice-options choice-answer-mode-options" role="radiogroup" aria-label="Tipo de resposta">' +
      '<label class="editor-mode-option choice-answer-option">' +
      '<input type="radio" name="choice-answer-state-' +
      escAttr(block.id) +
      '" data-choice-answer-state="true" data-block-id="' +
      escAttr(block.id) +
      '" value="correct"' +
      (answerState === "correct" ? " checked" : "") +
      ">" +
      '<span>Corretas</span>' +
      "</label>" +
      '<label class="editor-mode-option choice-answer-option">' +
      '<input type="radio" name="choice-answer-state-' +
      escAttr(block.id) +
      '" data-choice-answer-state="true" data-block-id="' +
      escAttr(block.id) +
      '" value="incorrect"' +
      (answerState === "incorrect" ? " checked" : "") +
      ">" +
      '<span>Incorretas</span>' +
      "</label>" +
      "</div>" +
      '<div class="config-actions">' +
      '<button class="icon-ghost tiny-icon" data-action="choice-add-option" data-block-id="' +
      escAttr(block.id) +
      '" title="Adicionar alternativa">+</button>' +
      "</div>" +
      '<div class="choice-list">' +
      optionsHtml +
      "</div>" +
      "</section>"
    );
  }

  // Renderiza UI de edição do bloco de opções com resultado.
  function renderSimulatorBuilder(block) {
    const normalized = normalizeSimulatorBlock(block);
    const optionsHtml = normalized.options.map(function (option, optionIndex) {
      return (
        '<div class="choice-row choice-row-simulator" data-simulator-row="true" data-option-id="' +
        escAttr(option.id || "") +
        '">' +
        '<div class="simulator-fields">' +
        '<input type="text" class="block-input" data-simulator-label="true" data-block-id="' +
        escAttr(block.id) +
        '" data-option-id="' +
        escAttr(option.id || "") +
        '" value="' +
        escAttr(option.value || "") +
        '" placeholder="Opção">' +
        '<textarea class="block-input" rows="3" data-simulator-output="true" data-block-id="' +
        escAttr(block.id) +
        '" data-option-id="' +
        escAttr(option.id || "") +
        '" placeholder="Resultado exibido no painel inferior">' +
        esc(option.result || "") +
        "</textarea>" +
        "</div>" +
        '<button class="icon-ghost tiny-icon" data-action="simulator-remove-option" data-block-id="' +
        escAttr(block.id) +
        '" data-option-id="' +
        escAttr(option.id || "") +
        '" title="Remover opção">&times;</button>' +
        "</div>"
      );
    }).join("");

    return (
      '<section class="simulator-config">' +
      renderTemplateBuilderInput(normalized) +
      '<div class="config-actions">' +
      '<button class="icon-ghost tiny-icon" data-action="simulator-add-option" data-block-id="' +
      escAttr(block.id) +
      '" title="Adicionar opção">+</button>' +
      "</div>" +
      '<div class="choice-list">' +
      optionsHtml +
      "</div>" +
      "</section>"
    );
  }

  // Renderiza configuracoes essenciais do bloco Editor sem expor estrategia tecnica demais ao autor.
  function renderEditorModeBuilder(block) {
    const normalizedBlock = clone(block);
    normalizeTerminalEditorBlock(normalizedBlock);
    const interactionMode = getEditorInteractionMode(normalizedBlock);

    return (
      '<section class="editor-mode-config">' +
      '<div class="editor-mode-choice-options" role="radiogroup" aria-label="Modo do editor">' +
      '<label class="editor-mode-option">' +
      '<input type="radio" name="editor-interaction-' + escAttr(block.id) + '" data-editor-interaction="true" data-block-id="' + escAttr(block.id) + '" value="choice"' +
      (interactionMode === "choice" ? " checked" : "") +
      ">" +
      "<span>Opções</span>" +
      "</label>" +
      '<label class="editor-mode-option">' +
      '<input type="radio" name="editor-interaction-' + escAttr(block.id) + '" data-editor-interaction="true" data-block-id="' + escAttr(block.id) + '" value="input"' +
      (interactionMode === "input" ? " checked" : "") +
      ">" +
      "<span>Digitação</span>" +
      "</label>" +
      "</div>" +
      "</section>"
    );
  }

  // Localiza uma opção do Editor pelo id.
  function getEditorOptionById(options, optionId) {
    return normalizeEditorOptions(options).find(function (option) {
      return option.id === optionId;
    }) || null;
  }

  // Normaliza variantes do modo Digitação preservando linhas vazias enquanto o autor edita.
  function normalizeEditorInputVariantsForAuthor(list) {
    return normalizeCodeInputVariants(list).map(function (variant, index) {
      return {
        id: String(variant.id || "variant-" + index),
        value: String(variant.value || ""),
        regex: !!variant.regex
      };
    });
  }

  // Renderiza o toggle visual de regex como um pequeno chip "(.*)".
  function renderEditorRegexToggleButton(config) {
    const options = config || {};
    const isActive = !!options.active;
    const action = String(options.action || "");
    const blockId = String(options.blockId || "");
    const optionId = String(options.optionId || "");
    const slotIndex = Number.isInteger(options.slotIndex) ? options.slotIndex : 0;
    const variantIndex = Number.isInteger(options.variantIndex) ? options.variantIndex : null;
    const disabled = !!options.disabled;
    const label = "(.*)";

    return (
      '<button class="icon-ghost tiny-icon editor-regex-toggle' +
      (isActive ? " active" : "") +
      '" data-action="' +
      escAttr(action) +
      '" data-block-id="' +
      escAttr(blockId) +
      '"' +
      (optionId ? ' data-option-id="' + escAttr(optionId) + '"' : ' data-slot-index="' + escAttr(String(slotIndex)) + '"') +
      (variantIndex !== null
        ? ' data-variant-index="' + escAttr(String(variantIndex)) + '"'
        : "") +
      ' title="' +
      escAttr(disabled ? "Ative a lacuna para usar regex" : (isActive ? "Desativar regex" : "Ativar regex")) +
      '" aria-pressed="' +
      (isActive ? "true" : "false") +
      '"' +
      (disabled ? ' disabled aria-disabled="true"' : "") +
      '">' +
      esc(label) +
      "</button>"
    );
  }

  // Monta as linhas do modo Digitação reaproveitando a mesma estrutura visual do modo Opções.
  function buildEditorInputAnswerRowsHtml(block) {
    const options = sortEditorOptionsForDisplay(block && block.options);
    if (!options.length) {
      return "";
    }
    return options.map(function (option) {
      const enabled = option.enabled !== false;
      const variants = normalizeEditorInputVariantsForAuthor(option.variants);
      const variantHtml = variants.map(function (variant, variantIndex) {
        return (
          '<div class="choice-row choice-row-editor-variant" data-editor-slot-variant-row="true" data-slot-index="' +
          escAttr(String(option.displayOrder || 0)) +
          '" data-option-id="' +
          escAttr(option.id || "") +
          '" data-variant-index="' +
          escAttr(String(variantIndex)) +
          '">' +
          '<span class="choice-row-spacer" aria-hidden="true"></span>' +
          '<span class="choice-row-spacer" aria-hidden="true"></span>' +
          renderEditorRegexToggleButton({
            active: !!variant.regex,
            action: "editor-slot-toggle-variant-regex",
            blockId: block.id,
            optionId: option.id,
            variantIndex: variantIndex
          }) +
          '<input type="text" data-editor-slot-variant="true" data-block-id="' +
          escAttr(block.id) +
          '" data-option-id="' +
          escAttr(option.id || "") +
          '" data-variant-index="' +
          escAttr(String(variantIndex)) +
           '" value="' +
           escAttr(variant.value || "") +
           '" placeholder="Variante">' +
           '<span class="choice-row-spacer" aria-hidden="true"></span>' +
           '<button class="icon-ghost tiny-icon" data-action="editor-slot-remove-variant" data-block-id="' +
          escAttr(block.id) +
          '" data-option-id="' +
          escAttr(option.id || "") +
          '" data-variant-index="' +
          escAttr(String(variantIndex)) +
          '" title="Remover variante">&times;</button>' +
          "</div>"
        );
      }).join("");

      return (
        '<div class="editor-input-slot-group" data-editor-option-group="true" data-option-id="' +
        escAttr(option.id || "") +
        '">' +
        '<div class="choice-row choice-row-editor-input" data-editor-slot-row="true" data-slot-index="' +
        escAttr(String(option.displayOrder || 0)) +
        '" data-terminal-option-row="true" data-option-id="' +
        escAttr(option.id || "") +
        '" data-option-enabled="' +
        (enabled ? "1" : "0") +
        '" data-option-display-order="' +
        escAttr(String(option.displayOrder || 0)) +
        '">' +
        '<button class="icon-ghost tiny-icon option-drag-handle" draggable="true" data-action="terminal-start-drag" data-block-id="' +
        escAttr(block.id) +
        '" data-option-id="' +
        escAttr(option.id || "") +
        '" title="Arrastar opção">&#9776;</button>' +
        '<button class="icon-ghost tiny-icon option-toggle' +
        (enabled ? " active" : "") +
        '" data-action="terminal-toggle-option" data-block-id="' +
        escAttr(block.id) +
        '" data-option-id="' +
        escAttr(option.id || "") +
        '" title="' +
        escAttr(enabled ? "Desabilitar lacuna" : "Habilitar lacuna") +
        '">' +
        (enabled ? "&#9679;" : "&#9675;") +
        "</button>" +
        renderEditorRegexToggleButton({
          active: !!option.regex,
          action: "editor-slot-toggle-regex",
          blockId: block.id,
          optionId: option.id,
          disabled: !enabled
        }) +
        '<input type="text" data-editor-slot-answer="true" data-block-id="' +
        escAttr(block.id) +
        '" data-option-id="' +
        escAttr(option.id || "") +
        '" value="' +
        escAttr(option.value || "") +
        '" placeholder="Opção">' +
        '<button class="icon-ghost tiny-icon" data-action="editor-slot-add-variant" data-block-id="' +
        escAttr(block.id) +
        '" data-option-id="' +
        escAttr(option.id || "") +
        '" title="Adicionar variante"' +
        (enabled ? "" : ' disabled aria-disabled="true"') +
        ">+</button>" +
        '<button class="icon-ghost tiny-icon" data-action="terminal-remove-option" data-block-id="' +
        escAttr(block.id) +
        '" data-option-id="' +
        escAttr(option.id || "") +
        '" title="Remover opção">&times;</button>' +
        "</div>" +
        (enabled ? variantHtml : "") +
        "</div>"
      );
    }).join("");
  }

  // Renderiza a configuração do modo Digitação logo abaixo do preview, com a mesma lógica visual de Opções.
  function renderEditorInputAnswerBuilder(block) {
    const normalizedBlock = clone(block);
    normalizeTerminalEditorBlock(normalizedBlock);

    return (
      '<section class="terminal-config terminal-config-input">' +
      '<div class="config-actions">' +
      '<button class="icon-ghost tiny-icon" data-action="terminal-add-option" data-block-id="' +
      escAttr(block.id) +
      '" title="Adicionar opção">+</button>' +
      "</div>" +
      '<div class="choice-list" data-editor-slot-list="true">' +
      buildEditorInputAnswerRowsHtml(normalizedBlock) +
      "</div>" +
      "</section>"
    );
  }

  // Renderiza controles de alinhamento para blocos textuais inteiros.
  function renderBlockAlignTools(block) {
    const align = normalizeTextBlockAlign(block && block.align);
    return (
      '<div class="builder-subtools builder-subtools-text block-align-tools">' +
      '<button class="icon-ghost tiny-icon text-style-toggle' +
      (align === "left" ? " active" : "") +
      '" data-action="block-align-left" data-block-id="' +
      escAttr(block.id) +
      '" title="Alinhar à esquerda" aria-label="Alinhar à esquerda">' +
      renderAlignGlyph("left") +
      "</button>" +
      '<button class="icon-ghost tiny-icon text-style-toggle' +
      (align === "center" ? " active" : "") +
      '" data-action="block-align-center" data-block-id="' +
      escAttr(block.id) +
      '" title="Centralizar" aria-label="Centralizar">' +
      renderAlignGlyph("center") +
      "</button>" +
      '<button class="icon-ghost tiny-icon text-style-toggle' +
      (align === "right" ? " active" : "") +
      '" data-action="block-align-right" data-block-id="' +
      escAttr(block.id) +
      '" title="Alinhar à direita" aria-label="Alinhar à direita">' +
      renderAlignGlyph("right") +
      "</button>" +
      "</div>"
    );
  }

  // Renderiza a area de montagem (paleta lateral e canvas de blocos).
  function renderCanvasEditor(form, options) {
    const renderOptions = options || {};
    const paletteTypes = Array.isArray(renderOptions.paletteTypes) && renderOptions.paletteTypes.length
      ? renderOptions.paletteTypes
      : AUTHORING_BLOCK_KINDS;
    const hideFinalButton = !!renderOptions.hideFinalButton;

    const palette = paletteTypes.map(function (type) {
      const meta = getBlockMeta(type);
      return (
        '<button class="palette-icon' +
        (renderOptions.popupMode ? " popup-palette-icon" : "") +
        '" draggable="true" data-action="palette-add" data-block-type="' +
        escAttr(type) +
        '" title="' +
        escAttr(meta.label) +
        '" aria-label="' +
        escAttr(meta.label) +
        '">' +
        meta.icon +
        "</button>"
      );
    }).join("");

    const blocks = (form.blocks || [])
      .map(function (block) {
        if (hideFinalButton && block.kind === "button") return "";
        if (isEditorKind(block.kind)) {
          normalizeTerminalEditorBlock(block);
          state.editor.terminalGuardByBlockId[block.id] = block.value;
        }
        if (isHeadingKind(block.kind)) {
          normalizeHeadingEditorBlock(block);
        }
        if (isFlowchartKind(block.kind)) {
          normalizeFlowchartEditorBlock(block);
        }
        const paragraphTextBlock = isParagraphKind(block.kind);
        if (paragraphTextBlock) {
          normalizeParagraphEditorBlock(block);
        }
        const meta = isEditorKind(block.kind)
          ? getBlockMeta("editor")
          : isFlowchartKind(block.kind)
            ? getBlockMeta("flowchart")
            : paragraphTextBlock
              ? getBlockMeta("paragraph")
              : getBlockMeta(block.kind);
        const multiline = isEditorKind(block.kind);
        let input = "";

        if (isFlowchartKind(block.kind)) {
          input = renderFlowchartBuilder(block);
        } else if (isTableKind(block.kind)) {
          input = renderTableBuilder(block);
        } else if (isMultipleChoiceKind(block.kind)) {
          input = renderMultipleChoiceBuilder(block);
        } else if (isSimulatorKind(block.kind)) {
          input = renderSimulatorBuilder(block);
        } else if (paragraphTextBlock) {
          input = '<div class="block-rich-input block-input block-align-' +
            escAttr(normalizeTextBlockAlign(block.align)) +
            '" data-block-input="true" data-block-rich-input="true" contenteditable="true" spellcheck="true" tabindex="0" role="textbox" aria-multiline="true" data-placeholder="' +
            escAttr(meta.placeholder) +
            '">' +
            (block.richText || "") +
            "</div>";
        } else if (isHeadingKind(block.kind)) {
          input = '<input class="block-input title-block-input block-align-' +
            escAttr(normalizeTextBlockAlign(block.align)) +
            '" data-block-input="true" data-heading-input="true" type="text" value="' +
            escAttr(block.value || "") +
            '" placeholder="' +
            escAttr(meta.placeholder) +
            '">';
        } else if (isEditorKind(block.kind)) {
          input = renderTemplateBuilderInput(block);
        } else if (multiline) {
          input = '<textarea class="block-input" data-block-input="true" rows="' +
            (isEditorKind(block.kind) ? "5" : "4") +
            (isEditorKind(block.kind)
              ? '" data-terminal-template="true" data-block-id="' + escAttr(block.id)
              : "") +
            '" placeholder="' +
            escAttr(meta.placeholder) +
            '">' +
            esc(block.value || "") +
            "</textarea>";
        } else if (isButtonKind(block.kind)) {
          input = '<div class="block-fixed block-fixed-button">' +
            '<div class="lesson-next-wrap"><button class="next-icon step-main-btn" type="button" disabled aria-disabled="true" tabindex="-1">&#10140;</button></div>' +
            "</div>";
        } else {
          input = '<input class="block-input" data-block-input="true" type="text" value="' +
            escAttr(block.value || "") +
            '" placeholder="' +
            escAttr(meta.placeholder) +
            '">';
        }

        const imageUpload =
          isImageKind(block.kind)
            ? '<button class="icon-ghost tiny-icon" data-action="block-pick-image" data-block-id="' +
              escAttr(block.id) +
              '" title="Upload de imagem">&#8682;</button>'
            : "";

        const textStyleTools =
          paragraphTextBlock || isEditorKind(block.kind) || isSimulatorKind(block.kind)
            ? '<div class="builder-subtools builder-subtools-text">' +
              '<button class="icon-ghost tiny-icon text-style-toggle" data-action="block-style-bold" data-block-id="' +
              escAttr(block.id) +
              '" title="Aplicar negrito" aria-label="Aplicar negrito"><span class="text-style-glyph text-style-glyph-bold">B</span></button>' +
              '<button class="icon-ghost tiny-icon text-style-toggle" data-action="block-style-italic" data-block-id="' +
              escAttr(block.id) +
              '" title="Aplicar itálico" aria-label="Aplicar itálico"><span class="text-style-glyph text-style-glyph-italic">I</span></button>' +
              '<button class="icon-ghost tiny-icon text-style-toggle text-style-toggle-tone" data-action="open-tone-picker" data-block-id="' +
              escAttr(block.id) +
              '" title="Escolher cor" aria-label="Escolher cor"><span class="text-style-glyph">A</span></button>' +
              ((isEditorKind(block.kind) || isSimulatorKind(block.kind))
                ? '<button class="icon-ghost tiny-icon text-style-toggle text-style-toggle-indent" data-action="block-style-indent" data-block-id="' +
                  escAttr(block.id) +
                  '" title="Aplicar indentação" aria-label="Aplicar indentação"><span class="text-style-glyph text-style-glyph-indent">&gt;&gt;</span></button>'
                : "") +
              (paragraphTextBlock ? renderBlockAlignTools(block) : "") +
              "</div>"
            : "";

        const headingAlignTools = isHeadingKind(block.kind)
          ? renderBlockAlignTools(block)
          : "";

        const editorModeConfig = isEditorKind(block.kind)
          ? renderEditorModeBuilder(block)
          : "";

        const editorInputConfig =
          isEditorKind(block.kind) && getEditorInteractionMode(block) === "input"
            ? renderEditorInputAnswerBuilder(block)
            : "";

        const terminalOptions = isEditorKind(block.kind)
          && getEditorInteractionMode(block) === "choice"
          ? (sortEditorOptionsForDisplay(block.options).map(function (option) {
            const enabled = option.enabled !== false;
            return (
              '<div class="choice-row choice-row-editor" data-terminal-option-row="true" data-option-id="' +
              escAttr(option.id || "") +
              '" data-option-enabled="' +
              (enabled ? "1" : "0") +
              '" data-option-display-order="' +
              escAttr(String(option.displayOrder || 0)) +
              '">' +
              '<button class="icon-ghost tiny-icon option-drag-handle" draggable="true" data-action="terminal-start-drag" data-block-id="' +
              escAttr(block.id) +
              '" data-option-id="' +
              escAttr(option.id || "") +
              '" title="Arrastar opção">&#9776;</button>' +
              '<button class="icon-ghost tiny-icon option-toggle' +
              (enabled ? " active" : "") +
              '" data-action="terminal-toggle-option" data-block-id="' +
              escAttr(block.id) +
              '" data-option-id="' +
              escAttr(option.id || "") +
              '" title="' +
              escAttr(enabled ? "Desabilitar lacuna" : "Habilitar lacuna") +
              '">' +
              (enabled ? "&#9679;" : "&#9675;") +
              "</button>" +
              '<input type="text" data-terminal-option="true" data-block-id="' +
              escAttr(block.id) +
              '" data-option-id="' +
              escAttr(option.id || "") +
              '" value="' +
              escAttr(option.value || "") +
              '" placeholder="Opção">' +
              '<button class="icon-ghost tiny-icon" data-action="terminal-remove-option" data-block-id="' +
              escAttr(block.id) +
              '" data-option-id="' +
              escAttr(option.id || "") +
              '" title="Remover opção">&times;</button>' +
              "</div>"
            );
          }).join(""))
          : "";

        const terminalConfig =
          isEditorKind(block.kind) && getEditorInteractionMode(block) === "choice"
            ? '<section class="terminal-config">' +
              '<div class="config-actions">' +
              '<button class="icon-ghost tiny-icon" data-action="terminal-add-option" data-block-id="' +
              escAttr(block.id) +
              '" title="Adicionar opção">+</button>' +
              "</div>" +
              '<div class="choice-list">' +
              terminalOptions +
              "</div>" +
              "</section>"
            : "";

        const buttonConfig =
          isButtonKind(block.kind)
            ? '<section class="button-config">' +
              '<label class="toggle-row tiny">' +
              '<input type="checkbox" data-button-popup="true" ' +
              (block.popupEnabled ? "checked" : "") +
              "> Abrir popup antes de avançar" +
              "</label>" +
              '<div class="button-popup-meta' +
              (block.popupEnabled ? "" : " disabled") +
              '">' +
              '<p class="tiny muted">' +
              String(getButtonPopupBlockCount(block)) +
              " bloco" +
              (getButtonPopupBlockCount(block) === 1 ? "" : "s") +
              "</p>" +
              '<button class="icon-ghost tiny-icon' +
              (block.popupEnabled ? "" : " disabled-icon") +
              '" data-action="button-edit-popup" data-block-id="' +
              escAttr(block.id) +
              '" ' +
              (block.popupEnabled ? "" : "disabled aria-disabled=\"true\"") +
              ' title="Editar conteúdo do popup" aria-label="Editar conteúdo do popup">&#9998;</button>' +
              "</div>" +
              "</section>"
            : "";

        const draggingThisBlock =
          (state.editor.pointerDrag && state.editor.pointerDrag.active && state.editor.pointerDrag.blockId === block.id) ||
          state.editor.blockDragId === block.id;
        const activeBlockId = state.editor.activeBlockId;
        const isActiveBlock = !!activeBlockId && activeBlockId === block.id;
        const muteThisBlock = !!activeBlockId && activeBlockId !== block.id && !draggingThisBlock;

        return (
          '<article class="builder-block ' +
          'builder-block-kind-' + escAttr(block.kind) + ' ' +
          (draggingThisBlock ? "drag-source " : "") +
          (isActiveBlock ? "is-active " : "") +
          (muteThisBlock ? "is-muted " : "") +
          '" data-block-id="' +
          escAttr(block.id) +
          '" data-block-kind="' +
          escAttr(block.kind) +
          '">' +
          '<div class="builder-tools">' +
          (isButtonKind(block.kind)
            ? '<button class="icon-ghost tiny-icon builder-tool-handle disabled-icon" type="button" disabled title="Bloco fixo">&#128274;</button>'
            : '<button class="icon-ghost tiny-icon builder-tool-handle" draggable="true" data-action="block-start-drag" data-block-id="' +
              escAttr(block.id) +
              '" title="Arrastar bloco">&#9776;</button>') +
          '<div class="builder-meta">' +
          '<span class="builder-kind-pill">' +
          meta.label +
          "</span>" +
          "</div>" +
          '<div class="builder-tool-right">' +
          (isButtonKind(block.kind)
            ? ""
            : '<button class="icon-ghost tiny-icon" data-action="block-up" data-block-id="' +
              escAttr(block.id) +
              '" title="Subir">&uarr;</button>' +
              '<button class="icon-ghost tiny-icon" data-action="block-down" data-block-id="' +
              escAttr(block.id) +
              '" title="Descer">&darr;</button>') +
          imageUpload +
          (isButtonKind(block.kind)
            ? ""
            : '<button class="icon-ghost tiny-icon" data-action="block-remove" data-block-id="' +
              escAttr(block.id) +
              '" title="Remover bloco">&times;</button>') +
          "</div>" +
          "</div>" +
          headingAlignTools +
          editorModeConfig +
          textStyleTools +
          input +
          editorInputConfig +
          terminalConfig +
          buttonConfig +
          '<input class="block-id-hidden" type="hidden" value="' +
          escAttr(block.id) +
          '">' +
          '<input class="block-kind-hidden" type="hidden" value="' +
          escAttr(block.kind) +
          '">' +
          "</article>"
        );
      })
      .join("");

    return (
      '<div class="builder-layout">' +
      '<aside class="palette-col">' +
      palette +
      "</aside>" +
      '<section class="canvas-col" data-dropzone="canvas">' +
      (blocks || '<div class="canvas-empty"></div>') +
      "</section>" +
      "</div>"
    );
  }

  // Renderiza imagem opcional do step.
  function renderImage(path) {
    if (!path) return "";
    const source = state.assets[path] || path;
    return '<img class="step-image" src="' + escAttr(source) + '" alt="Imagem" loading="lazy">';
  }

  // Renderiza bloco visual de terminal somente leitura.
  function renderTerminal(text) {
    if (!text) return "";
    return '<pre class="terminal-box">' + renderTerminalRichText(text) + "</pre>";
  }

  // Decodifica uma unica camada de entidades HTML usadas em sintaxe literal.
  function decodeTerminalLiteralEntities(text) {
    return String(text || "")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&#x27;/gi, "'")
      .replace(/&#96;/gi, "`")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&");
  }

  // Lê entidades HTML no texto do terminal sem tratar tags reais como markup estrutural.
  function consumeTerminalEntity(source, index) {
    const rest = source.slice(index);
    const entities = [
      ["&lt;", "<"],
      ["&gt;", ">"],
      ["&quot;", '"'],
      ["&#39;", "'"],
      ["&#x27;", "'"],
      ["&#96;", "`"],
      ["&nbsp;", " "],
      ["&amp;", "&"]
    ];

    for (const entry of entities) {
      const token = entry[0];
      if (rest.slice(0, token.length).toLowerCase() === token.toLowerCase()) {
        return { length: token.length, value: entry[1] };
      }
    }

    return null;
  }

  // Preserva apenas markup inline aprovado; o resto aparece como codigo literal visivel.
  function consumeAllowedTerminalInlineTag(source, index, tagState) {
    const rest = source.slice(index);

    let match = rest.match(/^<br\s*\/?>/i);
    if (match) return { length: match[0].length, html: "<br>" };

    match = rest.match(/^<(strong|b)>/i);
    if (match) {
      tagState.strong += 1;
      return { length: match[0].length, html: "<strong>" };
    }

    match = rest.match(/^<\/(strong|b)>/i);
    if (match && tagState.strong > 0) {
      tagState.strong -= 1;
      return { length: match[0].length, html: "</strong>" };
    }

    match = rest.match(/^<(em|i)>/i);
    if (match) {
      tagState.em += 1;
      return { length: match[0].length, html: "<em>" };
    }

    match = rest.match(/^<\/(em|i)>/i);
    if (match && tagState.em > 0) {
      tagState.em -= 1;
      return { length: match[0].length, html: "</em>" };
    }

    match = rest.match(/^<span class="(inline-tone-gold|inline-tone-mint|inline-tone-coral|inline-tone-blue|inline-tone-red)">/i);
    if (match) {
      const toneClass = String(match[1] || "").toLowerCase();
      tagState.spans += 1;
      return { length: match[0].length, html: '<span class="' + toneClass + '">' };
    }

    match = rest.match(/^<\/span>/i);
    if (match && tagState.spans > 0) {
      tagState.spans -= 1;
      return { length: match[0].length, html: "</span>" };
    }

    return null;
  }

  // Renderiza terminal/editor exibindo sintaxe literal e preservando so o inline aprovado.
  function renderTerminalLiteralRichText(text) {
    const source = String(text || "").replace(/\r/g, "");
    const tagState = { strong: 0, em: 0, spans: 0 };
    let html = "";
    let index = 0;

    while (index < source.length) {
      const allowedTag = consumeAllowedTerminalInlineTag(source, index, tagState);
      if (allowedTag) {
        html += allowedTag.html;
        index += allowedTag.length;
        continue;
      }

      const entity = consumeTerminalEntity(source, index);
      if (entity) {
        html += esc(entity.value);
        index += entity.length;
        continue;
      }

      const char = source[index];
      if (char === "\n") {
        html += "<br>";
      } else {
        html += esc(char);
      }
      index += 1;
    }

    let previous = "";
    while (previous !== html) {
      previous = html;
      html = html
        .replace(/<strong><\/strong>/g, "")
        .replace(/<em><\/em>/g, "")
        .replace(/<span class="(?:inline-tone-gold|inline-tone-mint|inline-tone-coral|inline-tone-blue|inline-tone-red)"><\/span>/g, "");
    }

    return html;
  }

  // Sanitiza texto do Editor/terminal preservando apenas formatação inline aprovada e quebras.
  function renderTerminalRichText(text) {
    return renderTerminalLiteralRichText(text);
  }

  // Projeta cada trecho do template autoral com o mesmo renderer literal do runtime.
  function renderTemplateSegmentRichText(text) {
    return renderTerminalRichText(text);
  }

  // Define como a lacuna aparece para o autor conforme o tipo de bloco e o modo de interação.
  function getAuthorPlaceholderDisplayStyle(block) {
    if (block && isSimulatorKind(block.kind)) return "empty";
    return "value";
  }

  // Renderiza chip visual de placeholder no editor autoral.
  function renderAuthorPlaceholderChip(value, options) {
    const config = options || {};
    const mode = config.mode === "simulator" ? "simulator" : "editor";
    const editable = !!config.editable;
    const actualValue = String(mode === "simulator" ? "" : value || "");
    const displayStyle = String(config.displayStyle || "");
    const safeValue = String(mode === "simulator" ? "" : actualValue);
    return (
      '<span class="author-placeholder author-placeholder-' +
      mode +
      (editable ? " author-placeholder-editable" : "") +
      '" data-template-placeholder="true"' +
      ' data-template-value="' +
      escAttr(actualValue) +
      '"' +
      (editable ? "" : ' contenteditable="false"') +
      ">" +
      '<span class="author-placeholder-value' +
      (safeValue ? "" : " is-empty") +
      '">' +
      (safeValue ? esc(safeValue) : "&nbsp;") +
      "</span>" +
      "</span>"
    );
  }

  // Converte valor bruto do template em HTML de autoria com destaque visual dos placeholders.
  function renderAuthorTemplateHtml(text, options) {
    const source = String(text || "").replace(/\r/g, "");
    const markers = parseOptionMarkers(source);
    if (!markers.length) return renderTemplateSegmentRichText(source);

    let html = "";
    let last = 0;
    markers.forEach(function (marker, markerIndex) {
      html += renderTemplateSegmentRichText(source.slice(last, marker.start));
      html += renderAuthorPlaceholderChip(marker.value, Object.assign({}, options, {
        slotIndex: markerIndex
      }));
      last = marker.end;
    });
    html += renderTemplateSegmentRichText(source.slice(last));
    return html;
  }

  // Serializa o HTML do template autoral de volta para o formato salvo com [[...]].
  const LITERAL_HTML_VOID_TAGS = {
    area: true,
    base: true,
    col: true,
    embed: true,
    hr: true,
    img: true,
    input: true,
    link: true,
    meta: true,
    param: true,
    source: true,
    track: true,
    wbr: true
  };

  function serializeAuthorLiteralElement(node, inner) {
    const tag = String((node && node.tagName) || "").toLowerCase();
    if (!tag) return inner;
    const attrs = Array.from((node && node.attributes) || [])
      .filter(function (attr) {
        const name = String((attr && attr.name) || "").toLowerCase();
        return name && name !== "data-template-placeholder" && name !== "contenteditable";
      })
      .map(function (attr) {
        return " " + String(attr.name || "").toLowerCase() + '="' + escAttr(String(attr.value || "")) + '"';
      })
      .join("");
    if (LITERAL_HTML_VOID_TAGS[tag]) return "<" + tag + attrs + ">";
    return "<" + tag + attrs + ">" + inner + "</" + tag + ">";
  }

  function serializeAuthorTemplateNode(node) {
    if (!node) return "";
    if (node.nodeType === 3) return String(node.textContent || "");
    if (node.nodeType !== 1) return "";

    const tag = String(node.tagName || "").toLowerCase();
    if (node.hasAttribute("data-template-placeholder")) {
      return "[[" + String(node.getAttribute("data-template-value") || node.textContent || "").replace(/\u00a0/g, " ") + "]]";
    }
    if (tag === "br") return "\n";

    const inner = Array.from(node.childNodes || []).map(serializeAuthorTemplateNode).join("");
    if (tag === "strong" || tag === "b") return "<strong>" + inner + "</strong>";
    if (tag === "em" || tag === "i") return "<em>" + inner + "</em>";
    if (tag === "span") {
      const toneClass = Array.from(node.classList || []).find(function (className) {
        return INLINE_TONE_CLASSES.indexOf(className) > -1;
      });
      if (toneClass) return '<span class="' + toneClass + '">' + inner + "</span>";
      return serializeAuthorLiteralElement(node, inner);
    }
    if (tag === "p" || tag === "div" || tag === "li") return inner + "\n";
    return serializeAuthorLiteralElement(node, inner);
  }

  // Serializa o contêiner rico de template autoral.
  function serializeAuthorTemplateHtml(node) {
    return Array.from((node && node.childNodes) || [])
      .map(serializeAuthorTemplateNode)
      .join("")
      .replace(/\r/g, "")
      .replace(/\u00a0/g, " ");
  }

  // Regras visuais do campo rico de template por tipo de bloco.
  function getTemplateBuilderOptions(kind) {
    if (isSimulatorKind(kind)) {
      return {
        mode: "simulator",
        editablePlaceholders: false,
        placeholder: "Escreva o enunciado e mantenha uma única lacuna."
      };
    }
    return {
      mode: "editor",
      editablePlaceholders: false,
      placeholder: "Digite o texto do terminal e use lacunas para as respostas."
    };
  }

  // Renderiza o campo rico do template de Editor/Simulador na autoria.
  function renderTemplateBuilderInput(block) {
    const config = getTemplateBuilderOptions(block.kind);
    return (
      '<div class="block-rich-input block-input block-template-input" data-block-input="true" data-template-rich-input="true" contenteditable="true" spellcheck="true" tabindex="0" role="textbox" aria-multiline="true" data-block-id="' +
      escAttr(block.id) +
      '" data-template-mode="' +
      escAttr(config.mode) +
      (config.mode === "editor" ? '" data-terminal-template="true' : '" data-simulator-template="true') +
      '" data-placeholder="' +
      escAttr(config.placeholder) +
      '">' +
      renderAuthorTemplateHtml(block.value || "", {
        mode: config.mode,
        editable: config.editablePlaceholders,
        displayStyle: getAuthorPlaceholderDisplayStyle(block)
      }) +
      "</div>"
    );
  }

  // Identifica o contêiner textual de parágrafo.
  function isParagraphTextKind(kind) {
    return isParagraphKind(kind);
  }

  // Normaliza alinhamento textual de blocos e campos inteiros.
  function normalizeTextBlockAlign(value) {
    const safe = String(value || "").trim().toLowerCase();
    return safe === "center" || safe === "right" ? safe : "left";
  }

  // Normaliza alinhamento de célula de tabela para um dos três valores aceitos.
  function normalizeTableCellAlign(value) {
    const safe = String(value || "").trim().toLowerCase();
    return safe === "center" || safe === "right" ? safe : "left";
  }

  // Normaliza cor semântica de texto usada em células de tabela.
  function normalizeTableCellTone(value) {
    const safe = String(value || "").trim().toLowerCase();
    if (safe === "gold" || safe === "mint" || safe === "coral") return safe;
    if (safe === "tone-gold") return "gold";
    if (safe === "tone-mint") return "mint";
    if (safe === "tone-coral") return "coral";
    return "default";
  }

  // Normaliza o modo de interação de lacunas de tabela.
  function normalizeTableCellInteractionMode(value) {
    return String(value || "").trim().toLowerCase() === "input" ? "input" : "choice";
  }

  // Normaliza opção individual usada em células com lacuna por escolha.
  function normalizeTableChoiceOption(raw) {
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return {
        id: String(raw.id || uid("opt")),
        value: String(raw.value || raw.text || raw.label || "").trim()
      };
    }

    return {
      id: uid("opt"),
      value: String(raw || "").trim()
    };
  }

  // Normaliza lista de opções de uma lacuna da tabela.
  function normalizeTableChoiceOptions(options) {
    return (Array.isArray(options) ? options : []).map(normalizeTableChoiceOption);
  }

  // Cria célula vazia no formato canônico da tabela.
  function createBlankTableCell(role) {
    return {
      value: "",
      bold: role === "header",
      italic: false,
      tone: "default",
      align: "left",
      blank: false,
      interactionMode: "choice",
      placeholder: "",
      options: []
    };
  }

  // Normaliza célula individual da tabela com estilo por célula inteira.
  function normalizeTableCell(raw, role) {
    const cellRole = role === "header" ? "header" : "body";
    const fallback = createBlankTableCell(cellRole);

    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return {
        value: String(raw.value || raw.text || "").trim(),
        bold: raw.bold === undefined ? fallback.bold : !!raw.bold,
        italic: !!raw.italic,
        tone: normalizeTableCellTone(raw.tone),
        align: normalizeTableCellAlign(raw.align),
        blank: !!(raw.blank || raw.exercise === true),
        interactionMode: normalizeTableCellInteractionMode(raw.interactionMode || raw.responseMode || raw.inputMode),
        placeholder: String(raw.placeholder || "").trim(),
        options: normalizeTableChoiceOptions(raw.options)
      };
    }

    return {
      value: String(raw || "").trim(),
      bold: fallback.bold,
      italic: false,
      tone: "default",
      align: "left",
      blank: false,
      interactionMode: "choice",
      placeholder: "",
      options: []
    };
  }

  // Indica se a célula funciona como lacuna interativa.
  function tableCellUsesBlank(cell) {
    return !!normalizeTableCell(cell, "body").blank;
  }

  // Indica se a célula usa lacuna com opções.
  function tableCellUsesChoiceBlank(cell) {
    const normalized = normalizeTableCell(cell, "body");
    return normalized.blank && normalized.interactionMode === "choice";
  }

  // Indica se a célula usa lacuna digitável.
  function tableCellUsesInputBlank(cell) {
    const normalized = normalizeTableCell(cell, "body");
    return normalized.blank && normalized.interactionMode === "input";
  }

  // Verifica se a célula realmente contém texto útil.
  function tableCellHasContent(cell) {
    const normalized = normalizeTableCell(cell, "body");
    if (normalized.value) return true;
    return normalized.blank;
  }

  // Compacta opção da tabela no formato salvo em JSON.
  function serializeTableChoiceOption(raw) {
    const normalized = normalizeTableChoiceOption(raw);
    return {
      id: normalized.id,
      value: normalized.value
    };
  }

  // Compacta célula de tabela preservando apenas os metadados relevantes.
  function serializeTableCell(raw, role) {
    const normalized = normalizeTableCell(raw, role);
    const cell = {
      value: normalized.value,
      bold: normalized.bold,
      italic: normalized.italic,
      tone: normalized.tone,
      align: normalized.align
    };
    const filledOptions = normalized.options.filter(function (option) {
      return !!String(option.value || "").trim();
    });

    if (normalized.blank) cell.blank = true;
    if (normalized.interactionMode !== "choice") cell.interactionMode = normalized.interactionMode;
    if (normalized.placeholder) cell.placeholder = normalized.placeholder;
    if (filledOptions.length) {
      cell.options = filledOptions.map(serializeTableChoiceOption);
    }

    return cell;
  }

  // Produz um rótulo humano para a posição de uma célula da tabela.
  function getTableCellLabel(cellRef) {
    if (!cellRef) return "célula";
    if (cellRef.role === "header") return "cabeçalho da coluna " + String(Number(cellRef.columnIndex) + 1);
    return "linha " + String(Number(cellRef.rowIndex) + 1) + ", coluna " + String(Number(cellRef.columnIndex) + 1);
  }

  // Gera HTML inline seguro para a célula já com os estilos globais da própria célula.
  function renderTableCellStyledValue(cell) {
    const normalized = normalizeTableCell(cell, "body");
    let html = esc(normalized.value || "").replace(/\n/g, "<br>");
    if (!html) return "";
    if (normalized.bold) html = "<strong>" + html + "</strong>";
    if (normalized.italic) html = "<em>" + html + "</em>";
    if (normalized.tone !== "default") {
      html = '<span class="inline-tone-' + normalized.tone + '">' + html + "</span>";
    }
    return html;
  }

  // Monta classes utilitárias da célula de tabela para autoria e runtime.
  function getTableCellClassNames(cell) {
    const normalized = normalizeTableCell(cell, "body");
    return [
      "table-align-" + normalized.align,
      normalized.bold ? "is-bold" : "",
      normalized.italic ? "is-italic" : "",
      normalized.tone !== "default" ? "tone-" + normalized.tone : ""
    ].filter(Boolean).join(" ");
  }

  // Normaliza cabeçalhos da tabela preservando colunas intermediárias vazias.
  function normalizeTableHeaders(headers) {
    const normalized = (Array.isArray(headers) ? headers : []).map(function (item) {
      return normalizeTableCell(item, "header");
    });
    while (normalized.length && !tableCellHasContent(normalized[normalized.length - 1])) normalized.pop();
    return normalized;
  }

  // Normaliza linhas da tabela mantendo células preenchidas e aparando excesso de colunas vazias.
  function normalizeTableRows(rows) {
    const list = Array.isArray(rows) ? rows : [];
    return list
      .map(function (row) {
        const cells = Array.isArray(row) ? row : [];
        const normalized = cells.map(function (cell) {
          return normalizeTableCell(cell, "body");
        });
        while (normalized.length && !tableCellHasContent(normalized[normalized.length - 1])) normalized.pop();
        return normalized;
      })
      .filter(function (row) {
        return row.some(tableCellHasContent);
      });
  }

  // Preserva a grade autoral da tabela, mesmo quando existem células vazias em edição.
  function normalizeTableDraft(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const headers = (Array.isArray(source.headers) ? source.headers : []).map(function (item) {
      return normalizeTableCell(item, "header");
    });
    const rows = (Array.isArray(source.rows) ? source.rows : []).map(function (row) {
      return (Array.isArray(row) ? row : []).map(function (cell) {
        return normalizeTableCell(cell, "body");
      });
    });

    let width = headers.length;
    rows.forEach(function (row) {
      if (row.length > width) width = row.length;
    });
    if (width < 1) width = 1;

    const draftHeaders = headers.slice(0, width);
    while (draftHeaders.length < width) draftHeaders.push(createBlankTableCell("header"));

    const draftRows = rows.length
      ? rows.map(function (row) {
        const cells = row.slice(0, width);
        while (cells.length < width) cells.push(createBlankTableCell("body"));
        return cells;
      })
      : [Array.from({ length: width }, function () { return createBlankTableCell("body"); })];

    return {
      id: source.id || uid("block"),
      kind: "table",
      title: String(source.title || source.value || "").trim(),
      titleStyle: normalizeTableCell(source.titleStyle, "header"),
      headers: draftHeaders,
      rows: draftRows
    };
  }

  // Calcula larguras autorais da tabela com base no conteúdo mais largo de cada coluna.
  function getTableEditorColumnWidths(raw) {
    const table = normalizeTableDraft(raw);
    return table.headers.map(function (header, columnIndex) {
      let maxLength = String((header && header.value) || "").trim().length;
      table.rows.forEach(function (row) {
        const cellLength = String((row && row[columnIndex] && row[columnIndex].value) || "").trim().length;
        if (cellLength > maxLength) maxLength = cellLength;
      });
      return Math.max(3, Math.min(24, maxLength || 1));
    });
  }

  // Garante estrutura consistente do bloco de tabela.
  function normalizeTableBlock(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const headers = normalizeTableHeaders(source.headers);
    const rows = normalizeTableRows(source.rows);
    let width = headers.length;
    rows.forEach(function (row) {
      if (row.length > width) width = row.length;
    });
    if (width < 1) width = 1;

    const alignedHeaders = headers.slice(0, width);
    while (alignedHeaders.length < width) alignedHeaders.push(createBlankTableCell("header"));

    const alignedRows = (rows.length ? rows : [Array.from({ length: width }, function () { return createBlankTableCell("body"); })])
      .map(function (row) {
        const cells = row.slice(0, width);
        while (cells.length < width) cells.push(createBlankTableCell("body"));
        return cells;
      });

    return {
      id: source.id || uid("block"),
      kind: "table",
      title: String(source.title || source.value || "").trim(),
      titleStyle: normalizeTableCell(source.titleStyle, "header"),
      headers: alignedHeaders.map(function (cell) {
        return serializeTableCell(cell, "header");
      }),
      rows: alignedRows.map(function (row) {
        return row.map(function (cell) {
          return serializeTableCell(cell, "body");
        });
      })
    };
  }

  // Normaliza o estado visual das respostas da múltipla escolha.
  function normalizeMultipleChoiceAnswerState(value) {
    return String(value || "").trim().toLowerCase() === "incorrect" ? "incorrect" : "correct";
  }

  // Normaliza lista de opções da múltipla escolha.
  function normalizeMultipleChoiceOptions(options) {
    if (!Array.isArray(options)) return [];

    return options.map(function (item) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return {
          id: String(item.id || uid("opt")),
          value: String(item.value || ""),
          answer: !!(item.answer || item.correct)
        };
      }
      return {
        id: uid("opt"),
        value: String(item || ""),
        answer: false
      };
    });
  }

  // Garante estrutura consistente do bloco de múltipla escolha.
  function normalizeMultipleChoiceBlock(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      id: source.id || uid("block"),
      kind: "multiple_choice",
      value: "",
      answerState: normalizeMultipleChoiceAnswerState(source.answerState),
      options: normalizeMultipleChoiceOptions(source.options)
    };
  }

  // Normaliza lista de pares opção -> resultado.
  function normalizeSimulatorOptions(options) {
    if (!Array.isArray(options)) return [];

    return options.map(function (item) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return {
          id: String(item.id || uid("opt")),
          value: String(item.value || item.label || "").trim(),
          result: String(item.result || "").replace(/\r/g, "")
        };
      }
      return {
        id: uid("opt"),
        value: String(item || "").trim(),
        result: ""
      };
    });
  }

  // Garante estrutura consistente do bloco de opções com resultado.
  function normalizeSimulatorBlock(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      id: source.id || uid("block"),
      kind: "simulator",
      value: normalizeSimulatorTemplateValue(source.value || source.prompt || ""),
      options: normalizeSimulatorOptions(source.options)
    };
  }

  // Normaliza blocos permitidos dentro do popup do botão.
  function normalizePopupBlocks(blocks) {
    const list = Array.isArray(blocks) ? blocks : [];
    return list.map(function (item) {
      if (!item || typeof item !== "object") return null;

      if (isParagraphTextKind(item.kind)) {
        return normalizeParagraphBlockData(item);
      }
      if (item.kind === "heading") {
        return {
          id: item.id || uid("block"),
          kind: "heading",
          value: String(item.value || "").trim(),
          align: normalizeTextBlockAlign(item.align)
        };
      }
      if (item.kind === "image") {
        return {
          id: item.id || uid("block"),
          kind: "image",
          value: String(item.value || "")
        };
      }
      if (isTableKind(item.kind)) {
        return normalizeTableBlock(item);
      }
      if (isEditorKind(item.kind)) {
        const block = {
          id: item.id || uid("block"),
          kind: "editor",
          value: String(item.value || ""),
          options: normalizeEditorOptions(item.options),
          interactionMode: item.interactionMode
        };
        normalizeTerminalEditorBlock(block);
        return block;
      }
      if (isMultipleChoiceKind(item.kind)) {
        return normalizeMultipleChoiceBlock(item);
      }
      if (isSimulatorKind(item.kind)) {
        return normalizeSimulatorBlock(item);
      }
      if (isFlowchartKind(item.kind)) {
        const block = {
          id: item.id || uid("block"),
          kind: "flowchart",
          value: "",
          nodes: Array.isArray(item.nodes) ? item.nodes.map(normalizeFlowchartNode) : [],
          links: Array.isArray(item.links) ? item.links.map(normalizeFlowchartLink).filter(Boolean) : [],
          shapeOptions: normalizeFlowchartShapeOptions(item.shapeOptions),
          textOptions: normalizeFlowchartTextOptions(item.textOptions)
        };
        normalizeFlowchartEditorBlock(block);
        return block;
      }
      return null;
    }).filter(Boolean);
  }

  // Normaliza blocos de parágrafo para o formato atual com texto rico inline.
  function normalizeParagraphEditorBlock(block) {
    if (!block || !isParagraphTextKind(block.kind)) return block;
    const normalized = normalizeParagraphBlockData(block);
    block.kind = "paragraph";
    block.value = normalized.value;
    block.richText = normalized.richText;
    block.align = normalizeTextBlockAlign(normalized.align);
    return block;
  }

  // Normaliza bloco de título para manter alinhamento canônico.
  function normalizeHeadingEditorBlock(block) {
    if (!block || !isHeadingKind(block.kind)) return block;
    block.kind = "heading";
    block.value = String(block.value || "");
    block.align = normalizeTextBlockAlign(block.align);
    return block;
  }

  // Normaliza coluna em uma das tres faixas fixas do fluxograma.
  function normalizeFlowchartColumn(value) {
    if (typeof value === "number") {
      return FLOWCHART_COLUMNS[clamp(value, 0, FLOWCHART_COLUMNS.length - 1)] || "center";
    }
    const source = String(value || "").toLowerCase();
    if (source === "0" || source === "left" || source === "esquerda") return "left";
    if (source === "2" || source === "right" || source === "direita") return "right";
    return "center";
  }

  // Normaliza lista de símbolos extras do popup do fluxograma.
  function normalizeFlowchartShapeOptions(options) {
    const list = Array.isArray(options) ? options : [];
    const result = [];

    list.forEach(function (item) {
      const key = normalizeFlowchartShapeKey(item);
      if (result.indexOf(key) === -1) result.push(key);
    });

    return result;
  }

  // Retorna array de opções do bloco Editor no formato padrao { id, value, enabled }.
  function normalizeEditorOptions(options) {
    if (!Array.isArray(options)) return [];

    return options.map(function (item, index) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return {
          id: String(item.id || uid("opt")),
          value: String(item.value || ""),
          enabled: item.enabled !== false,
          displayOrder: Number.isFinite(Number(item.displayOrder)) ? Number(item.displayOrder) : index,
          slotOrder: Number.isFinite(Number(item.slotOrder)) ? Number(item.slotOrder) : index,
          regex: !!item.regex,
          variants: normalizeCodeInputVariants(item.variants)
        };
      }
      return {
        id: uid("opt"),
        value: String(item || ""),
        enabled: true,
        displayOrder: index,
        slotOrder: index,
        regex: false,
        variants: []
      };
    });
  }

  // Ordena opções do Editor pela ordem visível definida pelo autor.
  function sortEditorOptionsForDisplay(options) {
    return normalizeEditorOptions(options).slice().sort(function (a, b) {
      const orderA = Number.isFinite(Number(a.displayOrder)) ? Number(a.displayOrder) : 0;
      const orderB = Number.isFinite(Number(b.displayOrder)) ? Number(b.displayOrder) : 0;
      if (orderA !== orderB) return orderA - orderB;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
  }

  // Ordena opções pela ordem estrutural das lacunas, independente do embaralhamento visual.
  function sortEditorOptionsBySlotOrder(options) {
    return normalizeEditorOptions(options).slice().sort(function (a, b) {
      const orderA = Number.isFinite(Number(a.slotOrder)) ? Number(a.slotOrder) : 0;
      const orderB = Number.isFinite(Number(b.slotOrder)) ? Number(b.slotOrder) : 0;
      if (orderA !== orderB) return orderA - orderB;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
  }

  // Identifica como o bloco Editor coleta resposta do estudante.
  function getEditorInteractionMode(block) {
    return normalizeEditorInteractionMode(block && block.interactionMode);
  }

  // Indica se o bloco Editor usa digitação livre nas lacunas.
  function isTypedEditorBlock(block) {
    return !!block && isEditorKind(block.kind) && getEditorInteractionMode(block) === "input";
  }

  // Normaliza lista de opções de texto do fluxograma.
  function normalizeFlowchartTextOptions(options) {
    return normalizeEditorOptions(options).map(function (option) {
      return {
        id: option.id || uid("opt"),
        value: String(option.value || "").trim(),
        enabled: option.enabled !== false
      };
    });
  }

  // Normaliza lista extra de opções de símbolo por nó.
  function normalizeFlowchartNodeShapeOptions(options, currentShape) {
    const current = normalizeFlowchartShapeKey(currentShape);
    return normalizeFlowchartShapeOptions(options).filter(function (shape) {
      return shape !== current;
    });
  }

  // Normaliza lista extra de opções de texto por nó.
  function normalizeFlowchartNodeTextOptions(options, currentText) {
    const current = String(currentText || "").trim();
    return normalizeFlowchartTextOptions(options).filter(function (option) {
      return option.value !== current;
    });
  }

  // Cria nó padrão de fluxograma.
  function createFlowchartNode(row, column, shape, text, shapeBlank, textBlank) {
    return {
      id: uid("flow-node"),
      row: Math.max(0, Number(row) || 0),
      column: normalizeFlowchartColumn(column),
      shape: normalizeFlowchartShapeKey(shape),
      text: String(text || "").trim(),
      shapeBlank: !!shapeBlank,
      textBlank: !!textBlank,
      shapeOptions: [],
      textOptions: []
    };
  }

  // Calcula a próxima linha lógica do nó a partir da maior linha já usada.
  function getNextFlowchartRow(nodes) {
    return (Array.isArray(nodes) ? nodes : []).reduce(function (maxRow, node, index) {
      const value = Math.max(0, Number(node && node.row));
      return Math.max(maxRow, Number.isFinite(value) ? value : index);
    }, -1) + 1;
  }

  // Normaliza nó de fluxograma lido do JSON/editor.
  function normalizeFlowchartNode(raw, index) {
    const fallbackRow = Math.max(0, Number(index) || 0);
    return {
      id: raw && raw.id ? String(raw.id) : uid("flow-node"),
      row: Math.max(0, Number(raw && raw.row) || fallbackRow),
      column: normalizeFlowchartColumn(raw && raw.column),
      shape: normalizeFlowchartShapeKey(raw && raw.shape),
      text: String(raw && raw.text ? raw.text : "").trim(),
      shapeBlank: raw && Object.prototype.hasOwnProperty.call(raw, "shapeBlank") ? !!raw.shapeBlank : true,
      textBlank: raw && Object.prototype.hasOwnProperty.call(raw, "textBlank") ? !!raw.textBlank : true,
      shapeOptions: normalizeFlowchartNodeShapeOptions(raw && raw.shapeOptions, raw && raw.shape),
      textOptions: normalizeFlowchartNodeTextOptions(raw && raw.textOptions, raw && raw.text)
    };
  }

  // Normaliza seta/conexao do fluxograma.
  function normalizeFlowchartLink(raw) {
    if (!raw || typeof raw !== "object") return null;
    const slot = Number(raw.outputSlot);
    return {
      id: raw.id || uid("flow-link"),
      fromNodeId: String(raw.fromNodeId || ""),
      toNodeId: String(raw.toNodeId || ""),
      outputSlot: slot === 0 || slot === 1 ? slot : null,
      label: String(raw.label || "").trim()
    };
  }

  // Lista indices de opções atualmente habilitadas para gerar lacunas no texto.
  function getEnabledOptionIndexes(options) {
    const list = normalizeEditorOptions(options);
    return list
      .map(function (option, index) {
        return { option: option, index: index };
      })
      .filter(function (entry) {
        return entry.option.enabled !== false;
      })
      .sort(function (a, b) {
        const orderA = Number.isFinite(Number(a.option.slotOrder)) ? Number(a.option.slotOrder) : 0;
        const orderB = Number.isFinite(Number(b.option.slotOrder)) ? Number(b.option.slotOrder) : 0;
        if (orderA !== orderB) return orderA - orderB;
        return String(a.option.id || "").localeCompare(String(b.option.id || ""));
      })
      .map(function (entry) {
        return entry.index;
      });
  }

  // Renderiza todos os blocos estruturados de um step.
  function renderStepBlocks(step) {
    const blocks = Array.isArray(step.blocks) ? step.blocks : [];
    let html = "";

    blocks.forEach(function (block) {
      if (block.kind === "heading") {
        if (String(block.value || "").trim()) {
          html += '<h2 class="lesson-title block-align-' + escAttr(normalizeTextBlockAlign(block.align)) + '">' + esc(block.value) + "</h2>";
        }
        return;
      }

      if (isParagraphKind(block.kind)) {
        html += renderTextBlock(block);
        return;
      }

      if (isImageKind(block.kind)) {
        html += renderImage(block.value);
        return;
      }

      if (isTableKind(block.kind)) {
        html += renderTableBlock(step, block);
        return;
      }

      if (isEditorKind(block.kind)) {
        html += renderTerminalBlock(step, block);
        return;
      }

      if (isMultipleChoiceKind(block.kind)) {
        html += renderMultipleChoiceBlock(step, block);
        return;
      }

      if (isSimulatorKind(block.kind)) {
        html += renderSimulatorBlock(step, block);
        return;
      }

      if (isFlowchartKind(block.kind)) {
        html += renderFlowchartBlock(step, block);
        return;
      }

      if (isButtonKind(block.kind)) {
        return;
      }
    });

    return html;
  }

  // Gera chave única do exercício de tabela.
  function tableExerciseKey(stepId, blockId) {
    return "table::" + stepId + "::" + blockId;
  }

  // Serializa uma referência de célula em uma chave estável.
  function getTableExerciseCellKey(cellRef) {
    if (!cellRef) return "";
    return cellRef.role === "header"
      ? "h:" + String(Number(cellRef.columnIndex) || 0)
      : "b:" + String(Number(cellRef.rowIndex) || 0) + ":" + String(Number(cellRef.columnIndex) || 0);
  }

  // Lista as células de tabela que realmente exigem resposta do estudante.
  function getTableExerciseCellEntries(table) {
    const normalizedTable = normalizeTableBlock(table);
    const entries = [];

    normalizedTable.headers.forEach(function (header, columnIndex) {
      const normalizedHeader = normalizeTableCell(header, "header");
      if (!tableCellUsesBlank(normalizedHeader)) return;
      entries.push({
        ref: { role: "header", rowIndex: -1, columnIndex: columnIndex },
        cell: normalizedHeader
      });
    });

    normalizedTable.rows.forEach(function (row, rowIndex) {
      row.forEach(function (cell, columnIndex) {
        const normalizedCell = normalizeTableCell(cell, "body");
        if (!tableCellUsesBlank(normalizedCell)) return;
        entries.push({
          ref: { role: "body", rowIndex: rowIndex, columnIndex: columnIndex },
          cell: normalizedCell
        });
      });
    });

    return entries;
  }

  // Indica se o valor digitado/selecionado na tabela ainda está vazio.
  function isTableExerciseValueEmpty(value) {
    return value === null || value === undefined || String(value) === "";
  }

  // Normaliza resposta digitada/selecionada na tabela antes da validação.
  function normalizeTableExerciseAttemptValue(value) {
    return String(value || "").replace(/\r/g, "").trim();
  }

  // Ordena lacunas por coluna para avançar para baixo antes de seguir para a direita.
  function getOrderedTableChoiceEntries(table) {
    return getTableExerciseCellEntries(table)
      .filter(function (entry) {
        return tableCellUsesChoiceBlank(entry.cell);
      })
      .sort(function (left, right) {
        const leftColumn = Number(left.ref.columnIndex) || 0;
        const rightColumn = Number(right.ref.columnIndex) || 0;
        if (leftColumn !== rightColumn) return leftColumn - rightColumn;

        const leftRow = left.ref.role === "header" ? -1 : Number(left.ref.rowIndex) || 0;
        const rightRow = right.ref.role === "header" ? -1 : Number(right.ref.rowIndex) || 0;
        if (leftRow !== rightRow) return leftRow - rightRow;

        return 0;
      });
  }

  // Retorna a próxima lacuna de escolha vazia respeitando a ordem de navegação por coluna.
  function getNextEmptyTableChoiceCellKey(table, exercise, currentCellKey) {
    const entries = getOrderedTableChoiceEntries(table);
    if (!entries.length) return null;

    let startIndex = 0;
    if (currentCellKey) {
      const currentIndex = entries.findIndex(function (entry) {
        return getTableExerciseCellKey(entry.ref) === currentCellKey;
      });
      if (currentIndex > -1) startIndex = currentIndex + 1;
    }

    for (let index = startIndex; index < entries.length; index += 1) {
      const cellKey = getTableExerciseCellKey(entries[index].ref);
      if (isTableExerciseValueEmpty(exercise.values[cellKey])) return cellKey;
    }

    for (let index = 0; index < startIndex && index < entries.length; index += 1) {
      const cellKey = getTableExerciseCellKey(entries[index].ref);
      if (isTableExerciseValueEmpty(exercise.values[cellKey])) return cellKey;
    }

    return null;
  }

  // Retorna a próxima célula de escolha ainda vazia.
  function getFirstEmptyTableChoiceCellKey(table, exercise) {
    return getNextEmptyTableChoiceCellKey(table, exercise, null);
  }

  // Obtém ou cria o estado da tabela interativa.
  function getTableExerciseState(step, block) {
    const table = normalizeTableBlock(block);
    const key = tableExerciseKey(step.id, block.id);

    if (!state.tokenByStepId[key]) {
      state.tokenByStepId[key] = { values: {}, feedback: null, activeCellKey: null };
    }

    const current = state.tokenByStepId[key];
    if (!current.values || typeof current.values !== "object") current.values = {};

    const activeEntries = getTableExerciseCellEntries(table);
    const activeKeys = {};
    activeEntries.forEach(function (entry) {
      const cellKey = getTableExerciseCellKey(entry.ref);
      activeKeys[cellKey] = true;
      if (!Object.prototype.hasOwnProperty.call(current.values, cellKey)) current.values[cellKey] = "";
    });

    Object.keys(current.values).forEach(function (cellKey) {
      if (!activeKeys[cellKey]) delete current.values[cellKey];
    });

    const choiceKey = getFirstEmptyTableChoiceCellKey(table, current);
    if (!current.activeCellKey || !activeKeys[current.activeCellKey]) {
      current.activeCellKey = choiceKey;
    } else if (!choiceKey && current.activeCellKey !== null) {
      const stillChoice = activeEntries.some(function (entry) {
        return tableCellUsesChoiceBlank(entry.cell) && getTableExerciseCellKey(entry.ref) === current.activeCellKey;
      });
      if (!stillChoice) current.activeCellKey = null;
    }

    return current;
  }

  // Monta o contexto da tabela interativa do step atual.
  function getCurrentTableExercise(blockId) {
    const entry = findCurrentStepBlockById(blockId, function (item) {
      return isTableKind(item.kind);
    });
    if (!entry) return null;

    const table = normalizeTableBlock(entry.block);
    const exerciseEntries = getTableExerciseCellEntries(table);
    if (!exerciseEntries.length) return null;

    return {
      step: entry.step,
      block: entry.block,
      table: table,
      entries: exerciseEntries,
      exercise: getTableExerciseState(entry.step, entry.block)
    };
  }

  // Procura a entrada de célula ativa na tabela interativa.
  function getActiveTableChoiceEntry(table, exercise) {
    if (!exercise || !exercise.activeCellKey) return null;
    return getTableExerciseCellEntries(table).find(function (entry) {
      return tableCellUsesChoiceBlank(entry.cell) && getTableExerciseCellKey(entry.ref) === exercise.activeCellKey;
    }) || null;
  }

  // Resume quais modos de preenchimento aparecem nas lacunas da tabela atual.
  function getTableExerciseModeSummary(table) {
    const summary = { hasChoice: false, hasInput: false };
    getTableExerciseCellEntries(table).forEach(function (entry) {
      if (tableCellUsesChoiceBlank(entry.cell)) summary.hasChoice = true;
      if (tableCellUsesInputBlank(entry.cell)) summary.hasInput = true;
    });
    return summary;
  }

  // Mostra um guia curto para o estudante reconhecer como a tabela deve ser preenchida.
  function renderTableExerciseGuide(table) {
    const summary = getTableExerciseModeSummary(table);
    if (!summary.hasChoice && !summary.hasInput) return "";

    const badges = [];
    if (summary.hasChoice) badges.push('<span class="exercise-mode-badge">Opções</span>');
    if (summary.hasInput) badges.push('<span class="exercise-mode-badge">Digitação</span>');

    let description = "";
    if (summary.hasChoice && summary.hasInput) {
      description = "Algumas lacunas usam opções. Outras são preenchidas por digitação direta na própria célula.";
    } else if (summary.hasChoice) {
      description = "Toque numa lacuna destacada e escolha a resposta nas opções abaixo.";
    } else {
      description = "Digite diretamente nas lacunas destacadas da tabela.";
    }

    return (
      '<div class="table-exercise-guide">' +
      '<div class="exercise-mode-badges">' +
      badges.join("") +
      "</div>" +
      '<p class="tiny muted">' + esc(description) + "</p>" +
      "</div>"
    );
  }

  // Renderiza célula individual da tabela no runtime, com lacuna quando necessário.
  function renderTableRuntimeCell(step, block, exercise, cellRef, cell, tagName) {
    const normalized = normalizeTableCell(cell, cellRef.role === "header" ? "header" : "body");
    const baseClass = getTableCellClassNames(normalized);
    const cellKey = getTableExerciseCellKey(cellRef);
    const currentValue =
      exercise && Object.prototype.hasOwnProperty.call(exercise.values, cellKey)
        ? (exercise.values[cellKey] === null || exercise.values[cellKey] === undefined
          ? ""
          : String(exercise.values[cellKey]))
        : "";

    if (!exercise || !tableCellUsesBlank(normalized)) {
      return (
        "<" + tagName + ' class="' + escAttr(baseClass) + '">' +
        '<div class="table-cell-content">' +
        renderTableCellStyledValue(normalized) +
        "</div>" +
        "</" + tagName + ">"
      );
    }

    if (tableCellUsesInputBlank(normalized)) {
      return (
        "<" + tagName + ' class="' + escAttr(baseClass + " table-cell-exercise table-cell-exercise-input") + '">' +
        '<div class="table-cell-content">' +
        '<span class="table-inline-input-wrap ' + (currentValue ? "filled" : "empty") + '">' +
        '<input class="table-inline-input ' +
        escAttr(getTableCellClassNames(normalized)) +
        '" type="text" data-table-inline-input="true" data-block-id="' +
        escAttr(block.id) +
        '" data-cell-key="' +
        escAttr(cellKey) +
        '" value="' +
        escAttr(currentValue) +
        '" placeholder="' +
        escAttr(normalized.placeholder || "") +
        '" autocomplete="off" autocapitalize="off" spellcheck="false">' +
        "</span>" +
        "</div>" +
        "</" + tagName + ">"
      );
    }

    return (
      "<" + tagName + ' class="' + escAttr(baseClass + " table-cell-exercise table-cell-exercise-choice") + '">' +
      '<div class="table-cell-content">' +
      '<button class="table-choice-slot ' +
      (currentValue ? "filled" : "empty") +
      (exercise.activeCellKey === cellKey ? " is-active" : "") +
      '" type="button" data-action="table-choice-cell" data-block-id="' +
      escAttr(block.id) +
      '" data-cell-key="' +
      escAttr(cellKey) +
      '">' +
      (currentValue
        ? renderTableCellStyledValue(Object.assign({}, normalized, { value: currentValue }))
        : normalized.placeholder
          ? esc(normalized.placeholder)
          : '<span class="slot-placeholder">&#9633;</span>') +
      "</button>" +
      "</div>" +
      "</" + tagName + ">"
    );
  }

  // Renderiza a faixa de opções da célula de escolha ativa da tabela.
  function renderTableChoiceOptions(block, table, exercise) {
    const activeEntry = getActiveTableChoiceEntry(table, exercise);
    if (!activeEntry) return "";

    const optionHtml = normalizeTableChoiceOptions(activeEntry.cell.options)
      .filter(function (option) {
        return !!String(option.value || "").trim();
      })
      .map(function (option) {
        return (
          '<button class="token-option" data-action="table-choice-option" data-block-id="' +
          escAttr(block.id) +
          '" data-option-id="' +
          escAttr(option.id) +
          '" data-option-value="' +
          encodeURIComponent(option.value || "") +
          '">' +
          esc(option.value || "") +
          "</button>"
        );
      }).join("");

    return (
      '<div class="table-choice-panel">' +
      '<p class="tiny muted">Complete a ' +
      esc(getTableCellLabel(activeEntry.ref)) +
      ".</p>" +
      '<div class="token-options">' +
      (optionHtml || '<p class="muted tiny">Sem opções disponíveis.</p>') +
      "</div>" +
      "</div>"
    );
  }

  // Renderiza feedback inline da tabela interativa.
  function renderTableExerciseFeedback(block, exercise) {
    if (!exercise || !exercise.feedback) return "";

    if (exercise.feedback === "correct") {
      return '<div class="inline-feedback ok" data-feedback-block-id="' + escAttr(block.id) + '"><p class="tiny">Correto.</p></div>';
    }

    if (exercise.feedback === "incomplete") {
      return '<div class="inline-feedback err" data-feedback-block-id="' + escAttr(block.id) + '"><p class="tiny">Preencha todas as lacunas da tabela.</p></div>';
    }

    return (
      '<div class="inline-feedback err" data-feedback-block-id="' +
      escAttr(block.id) +
      '">' +
      '<p class="tiny">Algumas células não correspondem ao esperado.</p>' +
      '<div class="feedback-icons">' +
      '<button class="icon-pill" data-action="table-view-answer" data-block-id="' +
      escAttr(block.id) +
      '" title="Ver resposta">&#128065;</button>' +
      '<button class="icon-pill primary" data-action="table-try-again" data-block-id="' +
      escAttr(block.id) +
      '" title="Tentar de novo">&#8635;</button>' +
      "</div>" +
      "</div>"
    );
  }

  // Seleciona a célula de escolha da tabela ou limpa o valor atual para trocá-lo.
  function tableChoiceCellClick(blockId, cellKey) {
    const entry = getCurrentTableExercise(blockId);
    if (!entry || !cellKey) return;

    const target = entry.entries.find(function (item) {
      return getTableExerciseCellKey(item.ref) === cellKey && tableCellUsesChoiceBlank(item.cell);
    });
    if (!target) return;

    if (!isTableExerciseValueEmpty(entry.exercise.values[cellKey])) {
      entry.exercise.values[cellKey] = "";
    }
    entry.exercise.activeCellKey = cellKey;
    entry.exercise.feedback = null;
    scheduleTableChoiceCellReveal(blockId, cellKey);
    renderApp();
  }

  // Aplica uma opção visível à célula de escolha atualmente ativa.
  function tableChoiceOptionClick(blockId, value) {
    const entry = getCurrentTableExercise(blockId);
    if (!entry) return;

    const activeEntry = getActiveTableChoiceEntry(entry.table, entry.exercise);
    if (!activeEntry) return;

    const currentCellKey = getTableExerciseCellKey(activeEntry.ref);
    entry.exercise.values[currentCellKey] = String(value || "");
    entry.exercise.feedback = null;
    entry.exercise.activeCellKey = getNextEmptyTableChoiceCellKey(entry.table, entry.exercise, currentCellKey);
    scheduleTableChoiceCellReveal(blockId, entry.exercise.activeCellKey || currentCellKey);
    renderApp();
  }

  // Atualiza em tempo real a resposta digitada em uma célula da tabela.
  function setTableInputDraft(blockId, cellKey, value) {
    const entry = getCurrentTableExercise(blockId);
    if (!entry || !cellKey) return;

    const target = entry.entries.find(function (item) {
      return getTableExerciseCellKey(item.ref) === cellKey && tableCellUsesInputBlank(item.cell);
    });
    if (!target) return;

    entry.exercise.values[cellKey] = String(value || "");
    entry.exercise.feedback = null;
  }

  // Valida uma tabela interativa comparando cada lacuna com a resposta esperada da célula.
  function validateTableExerciseBlock(step, block) {
    const table = normalizeTableBlock(block);
    const entries = getTableExerciseCellEntries(table);
    if (!entries.length) return "none";

    const exercise = getTableExerciseState(step, block);
    const hasEmpty = entries.some(function (entry) {
      return isTableExerciseValueEmpty(exercise.values[getTableExerciseCellKey(entry.ref)]);
    });
    if (hasEmpty) {
      exercise.feedback = "incomplete";
      scheduleFeedbackReveal(block.id);
      return "incomplete";
    }

    const ok = entries.every(function (entry) {
      const cellKey = getTableExerciseCellKey(entry.ref);
      return normalizeTableExerciseAttemptValue(exercise.values[cellKey]) === normalizeTableExerciseAttemptValue(entry.cell.value);
    });
    exercise.feedback = ok ? "correct" : "incorrect";
    scheduleFeedbackReveal(block.id);
    return exercise.feedback;
  }

  // Mostra todas as respostas corretas da tabela interativa.
  function tableViewAnswer(blockId) {
    const entry = getCurrentTableExercise(blockId);
    if (!entry) return;

    entry.entries.forEach(function (item) {
      entry.exercise.values[getTableExerciseCellKey(item.ref)] = item.cell.value;
    });
    entry.exercise.feedback = "correct";
    entry.exercise.activeCellKey = null;
    scheduleFeedbackReveal(blockId);
    renderApp();
  }

  // Fecha o feedback de erro da tabela interativa.
  function tableTryAgain(blockId) {
    const entry = getCurrentTableExercise(blockId);
    if (!entry) return;
    entry.exercise.feedback = null;
    scheduleTableChoiceCellReveal(
      blockId,
      entry.exercise.activeCellKey || getFirstEmptyTableChoiceCellKey(entry.table, entry.exercise)
    );
    renderApp();
  }

  // Renderiza tabela responsiva com título opcional e lacunas por célula quando configuradas.
  function renderTableBlock(stepOrBlock, maybeBlock) {
    const step = maybeBlock ? stepOrBlock : null;
    const block = maybeBlock || stepOrBlock;
    const table = normalizeTableBlock(block);
    const headers = table.headers.length ? table.headers : [createBlankTableCell("header")];
    const rows = table.rows.length ? table.rows : [[createBlankTableCell("body")]];
    const hasExercise = !!step && getTableExerciseCellEntries(table).length > 0;
    const exercise = hasExercise ? getTableExerciseState(step, block) : null;

    const headHtml = headers.map(function (header, columnIndex) {
      return renderTableRuntimeCell(step, block, exercise, {
        role: "header",
        rowIndex: -1,
        columnIndex: columnIndex
      }, header, "th");
    }).join("");

    const rowHtml = rows.map(function (row, rowIndex) {
      const cells = headers.map(function (_header, columnIndex) {
        return renderTableRuntimeCell(step, block, exercise, {
          role: "body",
          rowIndex: rowIndex,
          columnIndex: columnIndex
        }, row[columnIndex], "td");
      }).join("");
      return "<tr>" + cells + "</tr>";
    }).join("");

    const exerciseFooter = hasExercise
      ? renderTableExerciseGuide(table) + renderTableChoiceOptions(block, table, exercise) + renderTableExerciseFeedback(block, exercise)
      : "";

    return (
      '<section class="table-block' + (hasExercise ? " table-block-exercise" : "") + '">' +
      (table.title
        ? '<p class="table-block-title ' +
          escAttr(getTableCellClassNames(table.titleStyle)) +
          '"><span class="table-cell-content">' +
          renderTableCellStyledValue(Object.assign({}, table.titleStyle, { value: table.title })) +
          "</span></p>"
        : "") +
      '<div class="table-scroll">' +
      '<table class="lesson-table">' +
      "<thead><tr>" + headHtml + "</tr></thead>" +
      "<tbody>" + rowHtml + "</tbody>" +
      "</table>" +
      "</div>" +
      (exerciseFooter ? '<div class="table-exercise-footer">' + exerciseFooter + "</div>" : "") +
      "</section>"
    );
  }

  // Gera chave única do bloco de opções com resultado.
  function simulatorExerciseKey(stepId, blockId) {
    return "simulator::" + stepId + "::" + blockId;
  }

  // Obtém ou cria estado do bloco de opções com resultado.
  function getSimulatorState(step, block) {
    const key = simulatorExerciseKey(step.id, block.id);
    const options = normalizeSimulatorOptions(block.options).filter(function (option) {
      return !!String(option.value || "").trim();
    });
    if (!state.tokenByStepId[key]) {
      state.tokenByStepId[key] = { selected: null };
    }

    const current = state.tokenByStepId[key];
    const validIds = options.map(function (option) { return option.id; });
    if (current.selected && validIds.indexOf(current.selected) === -1) {
      current.selected = null;
    }
    return current;
  }

  // Obtém contexto do bloco de opções com resultado atualmente renderizado.
  function getCurrentSimulatorEntry(blockId) {
    const entry = findCurrentStepBlockById(blockId, function (item) {
      return isSimulatorKind(item.kind);
    });
    if (!entry) return null;

    const options = normalizeSimulatorOptions(entry.block.options).filter(function (option) {
      return !!String(option.value || "").trim();
    });

    return {
      step: entry.step,
      block: entry.block,
      options: options,
      exercise: getSimulatorState(entry.step, entry.block)
    };
  }

  // Seleciona uma opção e atualiza o painel de resultado associado.
  function simulatorSelect(blockId, optionId) {
    const entry = getCurrentSimulatorEntry(blockId);
    if (!entry || !optionId) return;
    if (!entry.options.some(function (option) { return option.id === optionId; })) return;
    entry.exercise.selected = optionId;
    renderApp();
  }

  // Renderiza o bloco de opções com resultado associado no painel inferior.
  function renderSimulatorBlock(step, block) {
    const normalized = normalizeSimulatorBlock(block);
    normalized.options = normalized.options.filter(function (option) {
      return !!String(option.value || "").trim();
    });
    const exercise = getSimulatorState(step, normalized);
    const selectedOption = normalized.options.find(function (option) {
      return option.id === exercise.selected;
    }) || null;

    const templateHtml = parseTerminalTemplate(normalized.value || "").parts
      .map(function (part) {
        if (part.type === "text") return renderTerminalRichText(part.value);
        return '<span class="simulator-slot">' + esc(selectedOption ? selectedOption.value : "") + "</span>";
      })
      .join("");

    const optionsHtml = normalized.options.map(function (option) {
      const selected = selectedOption && option.id === selectedOption.id;
      return (
        '<button class="token-option' +
        (selected ? " active" : "") +
        '" data-action="simulator-select" data-block-id="' +
        escAttr(block.id) +
        '" data-option-id="' +
        escAttr(option.id) +
        '">' +
        esc(option.value) +
        "</button>"
      );
    }).join("");

    const resultHtml =
      selectedOption && String(selectedOption.result || "")
        ? '<pre class="terminal-box simulator-output">' + renderTerminalRichText(selectedOption.result) + "</pre>"
        : '<pre class="terminal-box simulator-output simulator-output-empty"><span class="muted tiny">Sem resultado.</span></pre>';

    return (
      '<section class="simulator-exercise">' +
      '<div class="terminal-box simulator-template">' +
      templateHtml +
      "</div>" +
      '<div class="token-options simulator-list">' +
      optionsHtml +
      "</div>" +
      '<div class="simulator-output-wrap">' +
      resultHtml +
      "</div>" +
      "</section>"
    );
  }

  // Gera chave única do exercício de múltipla escolha.
  function multipleChoiceExerciseKey(stepId, blockId) {
    return "multiple-choice::" + stepId + "::" + blockId;
  }

  // Obtém ou cria estado do exercício de múltipla escolha.
  function getMultipleChoiceExerciseState(step, block) {
    const key = multipleChoiceExerciseKey(step.id, block.id);
    const options = normalizeMultipleChoiceOptions(block.options);
    if (!state.tokenByStepId[key]) {
      state.tokenByStepId[key] = { selected: [], feedback: null };
    }

    const current = state.tokenByStepId[key];
    if (!Array.isArray(current.selected)) current.selected = [];
    const validIds = options.map(function (option) { return option.id; });
    current.selected = current.selected.filter(function (id) {
      return validIds.indexOf(id) > -1;
    });
    return current;
  }

  // Procura um bloco interativo pelo ID tanto no card principal quanto no popup aberto.
  function findCurrentStepBlockById(blockId, predicate) {
    const step = getCurrentStep();
    if (!step || !blockId) return null;

    const accept = typeof predicate === "function" ? predicate : function () { return true; };
    const mainBlock = (step.blocks || []).find(function (item) {
      return item && item.id === blockId && accept(item);
    });
    if (mainBlock) return { step: step, block: mainBlock };

    if (!state.inlinePopupOpen || state.inlinePopupOpen.stepId !== step.id) return null;

    const buttonBlock = (step.blocks || []).find(function (item) {
      return item && item.id === state.inlinePopupOpen.blockId && isButtonKind(item.kind);
    });
    if (!buttonBlock || !Array.isArray(buttonBlock.popupBlocks)) return null;

    const popupBlocks = normalizePopupBlocks(buttonBlock.popupBlocks);
    const popupBlock = popupBlocks.find(function (item) {
      return item && item.id === blockId && accept(item);
    });
    return popupBlock ? { step: step, block: popupBlock } : null;
  }

  // Alterna uma alternativa selecionada na múltipla escolha.
  function multipleChoiceToggleOption(blockId, optionId) {
    const entry = getCurrentMultipleChoiceExercise(blockId);
    if (!entry || !optionId) return;

    const index = entry.exercise.selected.indexOf(optionId);
    if (index > -1) entry.exercise.selected.splice(index, 1);
    else entry.exercise.selected.push(optionId);
    entry.exercise.feedback = null;
    renderApp();
  }

  // Obtém contexto do exercício de múltipla escolha.
  function getCurrentMultipleChoiceExercise(blockId) {
    const entry = findCurrentStepBlockById(blockId, function (item) {
      return isMultipleChoiceKind(item.kind);
    });
    if (!entry) return null;

    return {
      step: entry.step,
      block: entry.block,
      options: normalizeMultipleChoiceOptions(entry.block.options),
      exercise: getMultipleChoiceExerciseState(entry.step, entry.block)
    };
  }

  // Resolve o estado visual esperado de uma alternativa selecionada.
  function multipleChoiceSelectionState(answerState) {
    return normalizeMultipleChoiceAnswerState(answerState) === "incorrect" ? "incorrect" : "correct";
  }

  // Valida um bloco de múltipla escolha pelo conjunto exato de alternativas marcadas como resposta.
  function validateMultipleChoiceExerciseBlock(step, block) {
    const options = normalizeMultipleChoiceOptions(block.options);
    const exercise = getMultipleChoiceExerciseState(step, block);
    const selected = exercise.selected.slice().sort();
    const expected = options.filter(function (option) { return option.answer; }).map(function (option) { return option.id; }).sort();

    if (!selected.length) {
      exercise.feedback = "incomplete";
      scheduleFeedbackReveal(block.id);
      return "incomplete";
    }

    const ok =
      selected.length === expected.length &&
      selected.every(function (value, index) { return value === expected[index]; });
    exercise.feedback = ok ? "correct" : "incorrect";
    scheduleFeedbackReveal(block.id);
    return exercise.feedback;
  }

  // Mostra o conjunto esperado de respostas na múltipla escolha.
  function multipleChoiceViewAnswer(blockId) {
    const entry = getCurrentMultipleChoiceExercise(blockId);
    if (!entry) return;

    entry.exercise.selected = entry.options
      .filter(function (option) { return option.answer; })
      .map(function (option) { return option.id; });
    entry.exercise.feedback = "correct";
    scheduleFeedbackReveal(blockId);
    renderApp();
  }

  // Limpa feedback da múltipla escolha.
  function multipleChoiceTryAgain(blockId) {
    const entry = getCurrentMultipleChoiceExercise(blockId);
    if (!entry) return;
    entry.exercise.feedback = null;
    renderApp();
  }

  // Renderiza feedback inline da múltipla escolha.
  function renderMultipleChoiceFeedback(step, block) {
    const exercise = getMultipleChoiceExerciseState(step, block);
    if (!exercise.feedback) return "";

    if (exercise.feedback === "correct") {
      return '<div class="inline-feedback ok" data-feedback-block-id="' + escAttr(block.id) + '"><p class="tiny">Correto.</p></div>';
    }

    if (exercise.feedback === "incomplete") {
      return '<div class="inline-feedback err" data-feedback-block-id="' + escAttr(block.id) + '"><p class="tiny">Selecione pelo menos uma resposta.</p></div>';
    }

    return (
      '<div class="inline-feedback err" data-feedback-block-id="' +
      escAttr(block.id) +
      '">' +
      '<p class="tiny">As respostas marcadas não correspondem ao conjunto esperado.</p>' +
      '<div class="feedback-icons">' +
      '<button class="icon-pill" data-action="multiple-choice-view-answer" data-block-id="' +
      escAttr(block.id) +
      '" title="Ver resposta">&#128065;</button>' +
      '<button class="icon-pill primary" data-action="multiple-choice-try-again" data-block-id="' +
      escAttr(block.id) +
      '" title="Tentar de novo">&#8635;</button>' +
      "</div>" +
      "</div>"
    );
  }

  // Renderiza exercício de múltipla escolha.
  function renderMultipleChoiceBlock(step, block) {
    const normalized = normalizeMultipleChoiceBlock(block);
    const exercise = getMultipleChoiceExerciseState(step, normalized);
    const optionsHtml = normalized.options.map(function (option) {
      const selected = exercise.selected.indexOf(option.id) > -1;
      const selectedState = selected ? multipleChoiceSelectionState(normalized.answerState) : "";
      const stateClass = selectedState ? " selected-" + selectedState : "";
      const mark = selectedState === "correct" ? "&#10003;" : selectedState === "incorrect" ? "&times;" : "";
      return (
        '<button class="multiple-choice-option' +
        (selected ? " active" : "") +
        stateClass +
        '" data-action="multiple-choice-toggle" data-block-id="' +
        escAttr(block.id) +
        '" data-option-id="' +
        escAttr(option.id) +
        '">' +
        '<span class="multiple-choice-mark">' +
        mark +
        "</span>" +
        '<span class="multiple-choice-label">' +
        esc(option.value) +
        "</span>" +
        "</button>"
      );
    }).join("");

    return (
      '<section class="multiple-choice-exercise">' +
      '<div class="multiple-choice-list">' +
      optionsHtml +
      "</div>" +
      renderMultipleChoiceFeedback(step, normalized) +
      "</section>"
    );
  }

  // Renderiza blocos de conteúdo dentro do popup do botão.
  function renderPopupBlocks(step, blocks) {
    return normalizePopupBlocks(blocks).map(function (block) {
      if (block.kind === "heading") {
        return '<h3 class="popup-block-heading block-align-' + escAttr(normalizeTextBlockAlign(block.align)) + '">' + esc(block.value || "") + "</h3>";
      }
      if (block.kind === "image") {
        return renderImage(block.value);
      }
      if (isTableKind(block.kind)) {
        return renderTableBlock(step, block);
      }
      if (isEditorKind(block.kind)) {
        return renderTerminalBlock(step, block);
      }
      if (isMultipleChoiceKind(block.kind)) {
        return renderMultipleChoiceBlock(step, block);
      }
      if (isSimulatorKind(block.kind)) {
        return renderSimulatorBlock(step, block);
      }
      if (isFlowchartKind(block.kind)) {
        return renderFlowchartBlock(step, block);
      }
      return renderTextBlock(block);
    }).join("");
  }

  // Renderiza bloco textual do tipo parágrafo com texto rico inline.
  function renderTextBlock(block) {
    if (!block) return "";

    const normalized = normalizeParagraphBlockData(block);
    if (!normalized.richText) return "";
    return '<div class="rich-text block-align-' + escAttr(normalizeTextBlockAlign(normalized.align)) + '"><p>' + normalized.richText + "</p></div>";
  }

  // Resume quantos contêineres reais existem no popup do botão.
  function getButtonPopupBlockCount(block) {
    if (!block || !isButtonKind(block.kind)) return 0;
    return normalizePopupBlocks(block.popupBlocks).length;
  }

  // Constrói os blocos iniciais do editor de popup.
  function getButtonPopupBuilderSeedBlocks(block) {
    if (!block || !isButtonKind(block.kind)) return [];
    return normalizePopupBlocks(block.popupBlocks);
  }

  // Lê comentário opcional do card no formato canônico.
  function getStepCommentValue(step) {
    return normalizeStepComment(step && step.comment);
  }

  // Indica se o popover fixo de comentário está aberto para o card informado.
  function isStepCommentOpen(step) {
    return !!(step && state.ui.stepComment && state.ui.stepComment.stepId === step.id);
  }

  // Renderiza o ícone fixo de comentário ao lado do avanço do card.
  function renderStepCommentButton(step) {
    if (!step) return "";
    const open = isStepCommentOpen(step);
    const hasComment = !!getStepCommentValue(step);
    const label = open ? "Fechar comentário do card" : "Comentário do card";
    return (
      '<button class="next-icon next-icon-secondary step-comment-btn' +
      (hasComment ? " has-comment" : "") +
      (open ? " is-open" : "") +
      '" data-action="toggle-step-comment" title="' +
      escAttr(label) +
      '" aria-label="' +
      escAttr(label) +
      '" aria-pressed="' +
      (open ? "true" : "false") +
      '">' +
      '<span class="comment-glyph" aria-hidden="true"></span>' +
      "</button>"
    );
  }

  // Renderiza o comentário do card no fluxo normal da tela para não disputar o viewport com o IME.
  function renderStepCommentPopup() {
    if (!(state.currentView === "lesson_step" && state.ui.stepComment && state.ui.stepComment.stepId)) return "";

    const step = getCurrentStep();
    if (!step || step.id !== state.ui.stepComment.stepId) return "";

    const draft = String(state.ui.stepComment.draft || "");
    const dialogLabel = 'Comentário do card: ' + clean(step.title, "Card atual");

    return (
      '<section class="step-comment-layer">' +
      '<div class="step-comment-shell">' +
      '<article class="clean-card step-comment-popup" data-step-comment-popup="true" role="group" aria-label="' +
      escAttr(dialogLabel) +
      '">' +
      '<textarea class="block-input step-comment-input" rows="5" data-step-comment-input="true" aria-label="' +
      escAttr(dialogLabel) +
      '" placeholder="">' +
      esc(draft) +
      "</textarea>" +
      "</article>" +
      "</div>" +
      "</section>"
    );
  }

  // Agenda a rolagem mínima necessária para manter um alvo ativo visível após o re-render.
  function scheduleScrollReveal(target) {
    state.ui.pendingScrollReveal = target ? clone(target) : null;
  }

  // Agenda a célula ativa da tabela para continuar visível dentro do contêiner rolável.
  function scheduleTableChoiceCellReveal(blockId, cellKey) {
    if (!blockId || !cellKey) return;
    scheduleScrollReveal({
      kind: "table-choice-cell",
      blockId: blockId,
      cellKey: cellKey
    });
  }

  // Agenda o bloco de feedback para receber a prioridade de visibilidade após o re-render.
  function scheduleFeedbackReveal(blockId) {
    if (!blockId) return;
    scheduleScrollReveal({
      kind: "feedback-block",
      blockId: blockId
    });
  }

  // Reaplica a visibilidade do alvo ativo depois que o DOM e os scrolls foram restaurados.
  function syncPendingScrollReveal() {
    const pending = state.ui.pendingScrollReveal;
    if (!pending) return;
    state.ui.pendingScrollReveal = null;

    requestAnimationFrame(function () {
      let target = null;

      if (pending.kind === "table-choice-cell") {
        target = root.querySelector(
          '.table-choice-slot[data-block-id="' +
          cssEsc(pending.blockId) +
          '"][data-cell-key="' +
          cssEsc(pending.cellKey) +
          '"]'
        );
      } else if (pending.kind === "feedback-block") {
        target = root.querySelector(
          '.inline-feedback[data-feedback-block-id="' +
          cssEsc(pending.blockId) +
          '"]'
        );
      }

      if (!target || typeof target.scrollIntoView !== "function") return;
      try {
        target.scrollIntoView({ block: "nearest", inline: "nearest" });
      } catch (_error) {
        target.scrollIntoView();
      }
    });
  }

  // Renderiza a faixa fixa de ações da lição, fora da área rolável do card.
  function renderStepActionDock(step) {
    const actionHtml = renderStepDockActions(step);
    if (!actionHtml) return "";
    return '<footer class="lesson-action-shell"><div class="lesson-action-dock"><div class="lesson-action-stack">' + actionHtml + "</div></div></footer>";
  }

  // Escolhe quais ações fixas devem aparecer no rodapé da lição.
  function renderStepDockActions(step) {
    if (!step) return "";

    if (Array.isArray(step.blocks) && step.blocks.length) {
      const buttonBlock = step.blocks.find(function (block) {
        return block && isButtonKind(block.kind);
      });
      if (buttonBlock) return renderStepButton(step, buttonBlock);
    }

    const action =
      step.type === "lesson_complete"
        ? "complete-continue"
        : stepHasEditorExercise(step)
          ? "step-button-click"
          : "continue-step";

    return (
      '<div class="lesson-next-wrap">' +
      renderStepCommentButton(step) +
      '<button class="next-icon" data-action="' +
      action +
      '" data-popup="0" title="Continuar" aria-label="Continuar">&#10140;</button>' +
      "</div>"
    );
  }

  // Renderiza o botao final do card e controla popup opcional.
  function renderStepButton(step, block) {
    const popupEnabled = !!block.popupEnabled;
    const popupOpen =
      state.inlinePopupOpen &&
      state.inlinePopupOpen.stepId === step.id &&
      state.inlinePopupOpen.blockId === block.id;
    const gate = getStepEditorGate(step);
    const showReset = gate.requiresSolve;
    const popupHasExercise =
      popupEnabled &&
      Array.isArray(block.popupBlocks) &&
      collectInteractiveExerciseBlocks(block.popupBlocks).length > 0;
    const popupContent = Array.isArray(block.popupBlocks) && block.popupBlocks.length
      ? renderPopupBlocks(step, block.popupBlocks)
      : '<p class="muted tiny">Sem conteúdo no popup.</p>';
    const popupActions =
      '<div class="lesson-next-wrap popup-next-wrap">' +
      (popupHasExercise
        ? '<button class="next-icon next-icon-secondary" data-action="step-editor-reset" data-step-id="' +
          escAttr(step.id) +
          '" title="Limpar" aria-label="Limpar">&#8635;</button>'
        : "") +
      renderStepCommentButton(step) +
      '<button class="next-icon" data-action="popup-continue" data-popup-block-id="' +
      escAttr(block.id) +
      '" title="Continuar" aria-label="Continuar">&#10140;</button>' +
      "</div>";

    if (popupEnabled && popupOpen) {
      return (
        '<div class="lesson-next-wrap lesson-next-wrap-popup-open">' +
        '<div class="inline-popup inline-popup-docked">' +
        '<div class="popup-copy card-subtitle popup-content-blocks">' +
        popupContent +
        "</div>" +
        popupActions +
        "</div>" +
        "</div>"
      );
    }

    return (
      '<div class="lesson-next-wrap">' +
      (showReset
        ? '<button class="next-icon next-icon-secondary" data-action="step-editor-reset" data-step-id="' +
          escAttr(step.id) +
          '" title="Limpar" aria-label="Limpar">&#8635;</button>'
        : "") +
      renderStepCommentButton(step) +
      '<button class="next-icon step-main-btn" data-action="step-button-click" data-block-id="' +
      escAttr(block.id) +
      '" data-popup="' +
      (popupEnabled ? "1" : "0") +
      '" title="Continuar" aria-label="Continuar">&#10140;</button>' +
      "</div>"
    );
  }

  // Indica se o step usa layout de exercício com área fixa.
  function isExerciseDrivenStep(step) {
    return !!step && stepHasEditorExercise(step);
  }

  // Filtra apenas os blocos interativos que realmente exigem resposta do estudante.
  function collectInteractiveExerciseBlocks(blocks) {
    return (Array.isArray(blocks) ? blocks : []).filter(function (block) {
      if (isTableKind(block.kind)) {
        return getTableExerciseCellEntries(block).length > 0;
      }
      if (isEditorKind(block.kind)) {
        return parseTerminalTemplate(block.value || "").answers.length > 0;
      }
      if (isMultipleChoiceKind(block.kind)) {
        return normalizeMultipleChoiceOptions(block.options).length > 0;
      }
      if (isFlowchartKind(block.kind)) {
        normalizeFlowchartEditorBlock(block);
        return (block.nodes || []).some(function (node) {
          return flowchartNodeUsesShapeBlank(node) || flowchartNodeUsesTextBlank(node);
        });
      }
      return false;
    });
  }

  // Retorna os blocos interativos do popup atualmente aberto, quando existirem.
  function getOpenPopupInteractiveBlocks(step) {
    if (!step || !state.inlinePopupOpen || state.inlinePopupOpen.stepId !== step.id) return [];
    const buttonBlock = (step.blocks || []).find(function (block) {
      return block.id === state.inlinePopupOpen.blockId && isButtonKind(block.kind);
    });
    if (!buttonBlock || !Array.isArray(buttonBlock.popupBlocks)) return [];
    return collectInteractiveExerciseBlocks(buttonBlock.popupBlocks);
  }

  // Verifica se o step contem algum bloco interativo (editor ou fluxograma).
  function stepHasEditorExercise(step) {
    return collectInteractiveExerciseBlocks(step && step.blocks).length > 0;
  }

  // Define se o step exige resposta correta dos blocos interativos para liberar o botao final.
  function getStepEditorGate(step) {
    const exerciseBlocks = collectInteractiveExerciseBlocks(step && step.blocks);

    if (!exerciseBlocks.length) return { requiresSolve: false, solved: true };

    const solved = exerciseBlocks.every(function (block) {
      if (isTableKind(block.kind)) {
        const exercise = getTableExerciseState(step, block);
        return exercise.feedback === "correct";
      }
      if (isEditorKind(block.kind)) {
        const parsed = parseTerminalTemplate(block.value || "");
        const exercise = getTerminalExerciseState(step, block, parsed.answers.length);
        return exercise.feedback === "correct";
      }
      if (isMultipleChoiceKind(block.kind)) {
        const exercise = getMultipleChoiceExerciseState(step, block);
        return exercise.feedback === "correct";
      }
      const exercise = getFlowchartExerciseState(step, block);
      return exercise.feedback === "correct";
    });
    return { requiresSolve: true, solved: solved };
  }

  // Calcula largura inline confortável para lacunas digitáveis.
  function getTerminalInlineInputWidthCh(value) {
    const length = String(value || "").length;
    return Math.max(2, Math.min(28, length + 0.35));
  }

  // Ajusta a largura visual da lacuna digitável conforme o texto atual.
  function syncTerminalInlineInputWidth(input) {
    if (!input) return;
    const wrap = input.closest(".terminal-slot");
    const hasValue = !!String(input.value || "");
    if (wrap) {
      wrap.classList.toggle("filled", hasValue);
      wrap.classList.toggle("empty", !hasValue);
    }
    input.style.width = getTerminalInlineInputWidthCh(input.value) + "ch";
  }

  // Renderiza uma lacuna digitável diretamente dentro do preview do terminal.
  function renderTerminalInlineInput(block, slotIndex, currentValue) {
    return (
      '<span class="terminal-slot terminal-slot-input-wrap ' +
      (currentValue ? "filled" : "empty") +
      '">' +
      '<input class="terminal-slot-input" type="text" data-terminal-inline-input="true" data-block-id="' +
      escAttr(block.id) +
      '" data-slot-index="' +
      escAttr(String(slotIndex)) +
      '" value="' +
      escAttr(currentValue || "") +
      '" style="width:' +
      escAttr(String(getTerminalInlineInputWidthCh(currentValue))) +
      'ch" autocomplete="off" autocapitalize="off" spellcheck="false">' +
      "</span>"
    );
  }

  // Renderiza bloco terminal com lacunas e opções interativas.
  function renderTerminalBlock(step, block) {
    const parsed = parseTerminalTemplate(block.value || "");
    const normalizedOptions = normalizeEditorOptions(block.options);
    const options = mergeTerminalOptions(normalizedOptions, parsed.answers);
    const interactionMode = getEditorInteractionMode(block);

    if (!parsed.answers.length) {
      return renderTerminal(block.value);
    }

    const exercise = getTerminalExerciseState(step, block, parsed.answers.length);
    const slotHtml = parsed.parts
      .map(function (part) {
        if (part.type === "text") return renderTerminalRichText(part.value);

        const current = String(exercise.slots[part.index] || "");
        if (interactionMode === "input") {
          return renderTerminalInlineInput(block, part.index, current);
        }

        return (
          '<button class="terminal-slot ' +
          (current ? "filled" : "empty") +
          (exercise.activeSlot === part.index ? " is-active" : "") +
          '" data-action="terminal-slot" data-block-id="' +
          escAttr(block.id) +
          '" data-slot-index="' +
          part.index +
          '">' +
          (current ? esc(current) : '<span class="slot-placeholder">&#9633;</span>') +
          "</button>"
        );
      })
      .join("");

    if (interactionMode === "input") {
      return (
        '<section class="terminal-exercise terminal-exercise-input">' +
        '<div class="terminal-box terminal-inline exercise-terminal">' +
        slotHtml +
        "</div>" +
        renderTerminalFeedback(step, block, parsed.answers) +
        "</section>"
      );
    }

    if (!options.length) {
      return renderTerminal(block.value);
    }

    const available = getAvailableOptionsFromList(options, exercise.slots);
    const optionsHtml = available
      .map(function (option) {
        return (
          '<button class="token-option" data-action="terminal-option" data-block-id="' +
          escAttr(block.id) +
          '" data-option="' +
          encodeURIComponent(option) +
          '">' +
          esc(option) +
          "</button>"
        );
      })
      .join("");

    return (
      '<section class="terminal-exercise">' +
      '<div class="terminal-box terminal-inline exercise-terminal">' +
      slotHtml +
      "</div>" +
      '<div class="token-options">' +
      (optionsHtml || '<p class="muted tiny">Sem opções disponiveis.</p>') +
      "</div>" +
      renderTerminalFeedback(step, block, parsed.answers) +
      "</section>"
    );
  }

  // Renderiza feedback inline do exercicio de terminal.
  function renderTerminalFeedback(step, block, answers) {
    const exercise = getTerminalExerciseState(step, block, answers.length);
    if (!exercise.feedback) return "";

    if (exercise.feedback === "correct") {
      return '<div class="inline-feedback ok" data-feedback-block-id="' + escAttr(block.id) + '"><p class="tiny">Correto.</p></div>';
    }

    if (exercise.feedback === "incomplete") {
      return '<div class="inline-feedback err" data-feedback-block-id="' + escAttr(block.id) + '"><p class="tiny">Preencha todas as lacunas.</p></div>';
    }

    return (
      '<div class="inline-feedback err" data-feedback-block-id="' +
      escAttr(block.id) +
      '">' +
      '<p class="tiny">Incorreto.</p>' +
      '<div class="feedback-icons">' +
      '<button class="icon-pill" data-action="terminal-view-answer" data-block-id="' +
      escAttr(block.id) +
      '" title="Ver resposta">&#128065;</button>' +
      '<button class="icon-pill primary" data-action="terminal-try-again" data-block-id="' +
      escAttr(block.id) +
      '" title="Tentar de novo">&#8635;</button>' +
      "</div>" +
      "</div>"
    );
  }

  // Interpreta texto com marcadores [[...]] para gerar lacunas e respostas.
  function parseTerminalTemplate(text) {
    const source = String(text || "");
    const pattern = /\[\[([\s\S]*?)\]\]/g;
    const parts = [];
    const answers = [];
    let last = 0;
    let match = pattern.exec(source);

    while (match) {
      const before = source.slice(last, match.index);
      if (before) parts.push({ type: "text", value: before });

      const answer = decodeTerminalLiteralEntities(String(match[1] || ""));
      answers.push(answer);
      parts.push({ type: "slot", index: answers.length - 1 });

      last = match.index + match[0].length;
      match = pattern.exec(source);
    }

    const tail = source.slice(last);
    if (tail) parts.push({ type: "text", value: tail });
    if (!parts.length) parts.push({ type: "text", value: source });

    return { parts: parts, answers: answers };
  }

  // Monta lista final de opções do terminal sem duplicacao.
  function mergeTerminalOptions(list, answers) {
    const merged = [];

    const sourceList = Array.isArray(list) ? list : [];
    const orderedList = sourceList.some(function (item) {
      return item && typeof item === "object" && "displayOrder" in item;
    })
      ? sortEditorOptionsForDisplay(sourceList)
      : sourceList;
    const availableCountByValue = Object.create(null);
    const requiredCountByValue = Object.create(null);

    orderedList.forEach(function (item) {
      const rawValue = typeof item === "string" ? item : String(item && item.value ? item.value : "");
      const value = decodeTerminalLiteralEntities(rawValue);
      if (!value) return;
      merged.push(value);
      availableCountByValue[value] = (availableCountByValue[value] || 0) + 1;
    });

    answers.forEach(function (answer) {
      if (!answer) return;
      const nextRequiredCount = (requiredCountByValue[answer] || 0) + 1;
      requiredCountByValue[answer] = nextRequiredCount;
      if ((availableCountByValue[answer] || 0) >= nextRequiredCount) return;
      merged.push(answer);
      availableCountByValue[answer] = (availableCountByValue[answer] || 0) + 1;
    });
    return merged;
  }

  // Lista os marcadores [[...]] encontrados no texto.
  function parseOptionMarkers(text) {
    const source = String(text || "");
    const regex = /\[\[([\s\S]*?)\]\]/g;
    const markers = [];
    let match = regex.exec(source);

    while (match) {
      markers.push({
        start: match.index,
        end: regex.lastIndex,
        value: String(match[1] || "")
      });
      match = regex.exec(source);
    }

    return markers;
  }

  // Garante exatamente uma lacuna no template do Simulador.
  function normalizeSimulatorTemplateValue(value) {
    let source = String(value || "").replace(/\r/g, "");
    let markers = parseOptionMarkers(source);

    if (!markers.length) {
      const cleanValue = source.trim();
      return cleanValue
        ? cleanValue + (/\s$/.test(cleanValue) ? "" : " ") + "[[]]"
        : "[[]]";
    }

    if (String(markers[0].value || "")) {
      source = replaceMarkerAtIndex(source, 0, "");
      markers = parseOptionMarkers(source);
    }

    while (markers.length > 1) {
      source = removeMarkerAtIndex(source, markers.length - 1);
      markers = parseOptionMarkers(source);
    }
    return source;
  }

  // Troca o conteudo de um marcador [[...]] em posicao especifica.
  function replaceMarkerAtIndex(text, index, value) {
    const source = String(text || "");
    const markers = parseOptionMarkers(source);
    if (index < 0 || index >= markers.length) return source;

    const target = markers[index];
    return source.slice(0, target.start) + "[[" + value + "]]" + source.slice(target.end);
  }

  // Remove um marcador [[...]] em posicao especifica.
  function removeMarkerAtIndex(text, index) {
    const source = String(text || "");
    const markers = parseOptionMarkers(source);
    if (index < 0 || index >= markers.length) return source;

    const target = markers[index];
    return source.slice(0, target.start) + source.slice(target.end);
  }

  // Insere um marcador [[...]] em uma posicao relativa da lista de marcadores.
  function insertMarkerAtIndex(text, index, value) {
    const source = String(text || "");
    const markers = parseOptionMarkers(source);
    const marker = "[[" + String(value || "") + "]]";

    if (!markers.length || index >= markers.length) {
      return source + (source && !/\s$/.test(source) ? " " : "") + marker;
    }
    if (index <= 0) {
      return marker + source;
    }

    const target = markers[index];
    return source.slice(0, target.start) + marker + source.slice(target.start);
  }

  // Sincroniza texto do terminal e lista de opções do editor.
  function normalizeTerminalEditorBlock(block) {
    if (!block || !isEditorKind(block.kind)) return;

    block.kind = "editor";
    block.value = String(block.value || "");
    block.options = normalizeEditorOptions(block.options).map(function (option, index) {
      return Object.assign({}, option, {
        displayOrder: Number.isFinite(Number(option.displayOrder)) ? Number(option.displayOrder) : index,
        slotOrder: Number.isFinite(Number(option.slotOrder)) ? Number(option.slotOrder) : index
      });
    });
    block.interactionMode = normalizeEditorInteractionMode(
      block.interactionMode || block.responseMode || block.inputMode
    );

    let markers = parseOptionMarkers(block.value);

    markers.forEach(function (marker, markerIndex) {
      const plainMarkerValue = decodeTerminalLiteralEntities(String(marker.value || ""));
      if (plainMarkerValue !== String(marker.value || "")) {
        block.value = replaceMarkerAtIndex(block.value, markerIndex, plainMarkerValue);
      }
    });
    markers = parseOptionMarkers(block.value);

    const enabledIndexes = getEnabledOptionIndexes(block.options);

    // Garante 1 marcador para cada opção habilitada.
    while (markers.length < enabledIndexes.length) {
      const option = block.options[enabledIndexes[markers.length]];
      const seed = String(option && option.value ? option.value : "");
      block.value += (block.value && !/\s$/.test(block.value) ? " " : "") + "[[" + seed + "]]";
      markers = parseOptionMarkers(block.value);
    }

    // Remove marcadores excedentes (sem opção habilitada correspondente).
    while (markers.length > enabledIndexes.length) {
      block.value = removeMarkerAtIndex(block.value, markers.length - 1);
      markers = parseOptionMarkers(block.value);
    }

    // Sincroniza valor de opção habilitada <-> texto do marcador.
    enabledIndexes.forEach(function (optionIndex, markerIndex) {
      const option = block.options[optionIndex];
      const marker = markers[markerIndex];
      if (!option || !marker) return;

      const optionValue = String(option.value || "");
      const markerValue = String(marker.value || "");
      if (optionValue !== markerValue) {
        block.value = replaceMarkerAtIndex(block.value, markerIndex, optionValue);
      }
    });

    markers = parseOptionMarkers(block.value);
    enabledIndexes.forEach(function (optionIndex, markerIndex) {
      const marker = markers[markerIndex];
      if (!marker || !block.options[optionIndex]) return;
      block.options[optionIndex].value = String(marker.value || "");
    });

  }

  // Antes de salvar, remove lacunas vazias do Editor e descarta linhas sem valor útil.
  function pruneEmptyEditorPlaceholders(block) {
    if (!block || !isEditorKind(block.kind)) return;

    block.options = normalizeEditorOptions(block.options);
    const enabledIndexes = getEnabledOptionIndexes(block.options);

    for (let i = enabledIndexes.length - 1; i >= 0; i -= 1) {
      const optionIndex = enabledIndexes[i];
      const option = block.options[optionIndex];
      if (!option || String(option.value || "").trim()) continue;
      option.enabled = false;
      block.value = removeMarkerAtIndex(String(block.value || ""), i);
    }

    block.options = block.options.filter(function (option) {
      return String(option.value || "").trim().length > 0;
    });
    normalizeTerminalEditorBlock(block);
  }

  // Monta lista final de símbolos disponíveis no popup do fluxograma.
  function mergeFlowchartShapeOptions(list, nodes) {
    const merged = [];

    (Array.isArray(list) ? list : []).forEach(function (item) {
      const raw = String(item || "").trim();
      if (!raw) return;
      const key = normalizeFlowchartShapeKey(raw);
      if (merged.indexOf(key) === -1) merged.push(key);
    });

    getFlowchartAutoShapeOptions(nodes).forEach(function (key) {
      if (merged.indexOf(key) === -1) merged.push(key);
    });

    if (!merged.length) {
      merged.push("terminal", "process", "decision");
    }

    return merged;
  }

  // Monta lista final de opções de texto do fluxograma.
  function mergeFlowchartTextOptions(list, nodes) {
    const merged = [];

    normalizeFlowchartTextOptions(list).forEach(function (item) {
      if (!item.value || item.enabled === false) return;
      if (merged.indexOf(item.value) === -1) merged.push(item.value);
    });

    getFlowchartAutoTextOptions(nodes).forEach(function (value) {
      if (value && merged.indexOf(value) === -1) merged.push(value);
    });

    return merged;
  }

  // Normaliza bloco de fluxograma com defaults seguros.
  function normalizeFlowchartEditorBlock(block) {
    if (!block || !isFlowchartKind(block.kind)) return;

    block.kind = "flowchart";
    block.value = "";

    const hasExplicitNodes = Array.isArray(block.nodes);
    const nodes = hasExplicitNodes ? block.nodes.map(normalizeFlowchartNode) : [];
    block.nodes = nodes.length
      ? nodes
      : hasExplicitNodes
        ? []
        : [
          createFlowchartNode(0, "center", "terminal", "Início"),
          createFlowchartNode(1, "center", "process", "Passo")
        ];

    const sharedShapeOptions = normalizeFlowchartShapeOptions(block.shapeOptions);
    const sharedTextOptions = normalizeFlowchartTextOptions(block.textOptions);
    block.nodes.forEach(function (node) {
      node.shapeOptions = normalizeFlowchartNodeShapeOptions(
        node.shapeOptions && node.shapeOptions.length ? node.shapeOptions : sharedShapeOptions,
        node.shape
      );
      node.textOptions = normalizeFlowchartNodeTextOptions(
        node.textOptions && node.textOptions.length ? node.textOptions : sharedTextOptions,
        node.text
      );
    });

    const nodeIds = block.nodes.map(function (node) { return node.id; });
    const hasExplicitLinks = Array.isArray(block.links);
    const rawLinks = (hasExplicitLinks ? block.links.map(normalizeFlowchartLink).filter(Boolean) : [])
      .filter(function (link) {
        return (
          link.fromNodeId &&
          link.toNodeId &&
          link.fromNodeId !== link.toNodeId &&
          nodeIds.indexOf(link.fromNodeId) > -1 &&
          nodeIds.indexOf(link.toNodeId) > -1
        );
      });
    const linkGroups = rawLinks.reduce(function (acc, link) {
      if (!acc[link.fromNodeId]) acc[link.fromNodeId] = [];
      acc[link.fromNodeId].push(link);
      return acc;
    }, {});
    block.links = [];

    Object.keys(linkGroups).forEach(function (fromNodeId) {
      getFlowchartNodeOutputLinks(linkGroups[fromNodeId], fromNodeId).forEach(function (link, slot) {
        if (!link || !link.toNodeId) return;
        block.links.push({
          id: link.id || uid("flow-link"),
          fromNodeId: fromNodeId,
          toNodeId: link.toNodeId,
          outputSlot: slot,
          label: String(link.label || "").trim()
        });
      });
    });

    if (!hasExplicitLinks && !block.links.length && block.nodes.length > 1) {
      block.links.push({
        id: uid("flow-link"),
        fromNodeId: block.nodes[0].id,
        toNodeId: block.nodes[1].id,
        outputSlot: 0,
        label: ""
      });
    }

    block.shapeOptions = [];
    block.textOptions = [];
  }

  // Cria bloco inicial de fluxograma para o editor visual.
  function defaultFlowchartBlock() {
    const start = createFlowchartNode(0, "center", "terminal", "Início", false, false);
    const action = createFlowchartNode(1, "center", "process", "Executar ação", false, false);
    const block = {
      id: uid("block"),
      kind: "flowchart",
      value: "",
      nodes: [start, action],
      links: [
        {
          id: uid("flow-link"),
          fromNodeId: start.id,
          toNodeId: action.id,
          outputSlot: 0,
          label: ""
        }
      ],
      shapeOptions: [],
      textOptions: []
    };
    normalizeFlowchartEditorBlock(block);
    return block;
  }

  // Cria bloco inicial de tabela para autoria.
  function defaultTableBlock() {
    return normalizeTableBlock({
      id: uid("block"),
      kind: "table",
      title: "",
      headers: [createBlankTableCell("header")],
      rows: [[createBlankTableCell("body")]]
    });
  }

  // Cria bloco inicial de múltipla escolha para autoria.
  function defaultMultipleChoiceBlock() {
    return normalizeMultipleChoiceBlock({
      id: uid("block"),
      kind: "multiple_choice",
      answerState: "correct",
      options: [
        { id: uid("opt"), value: "Resposta 1", answer: true },
        { id: uid("opt"), value: "Resposta 2", answer: false }
      ]
    });
  }

  // Cria bloco inicial de opções com resultado para autoria.
  function defaultSimulatorBlock() {
    return normalizeSimulatorBlock({
      id: uid("block"),
      kind: "simulator",
      value: "Resultado de [[]]",
      options: [
        { id: uid("opt"), value: "Opção 1", result: "Resultado da opção 1" },
        { id: uid("opt"), value: "Opção 2", result: "Resultado da opção 2" }
      ]
    });
  }

  // Cria bloco padrão para o editor de conteúdo do popup.
  function createPopupContentBlock(kind) {
    if (kind === "table") return defaultTableBlock();
    if (kind === "simulator") return defaultSimulatorBlock();
    if (kind === "editor") {
      return {
        id: uid("block"),
        kind: "editor",
        value: "",
        options: [],
        interactionMode: "choice"
      };
    }
    return {
      id: uid("block"),
      kind: kind,
      value: kind === "heading" ? "Título do popup" : "",
      richText: kind === "paragraph" ? "" : undefined
    };
  }

  // Retorna nós na ordem em que aparecem no editor.
  function getFlowchartSortedNodes(nodes) {
    return Array.isArray(nodes) ? nodes.slice() : [];
  }

  // Gera mapa rápido de nós por ID.
  function getFlowchartNodeMap(nodes) {
    return (Array.isArray(nodes) ? nodes : []).reduce(function (acc, node) {
      acc[node.id] = node;
      return acc;
    }, {});
  }

  // Retorna título curto de um nó para UI do editor.
  function flowchartNodeTitle(nodes, nodeId) {
    const list = getFlowchartSortedNodes(nodes);
    const index = list.findIndex(function (node) {
      return node.id === nodeId;
    });
    return "Bloco " + String(index > -1 ? index + 1 : 1);
  }

  // Renderiza opções de destino para uma saída do fluxograma.
  function renderFlowchartOutputOptions(nodes, currentNodeId, currentTargetId) {
    const options = ['<option value=""' + (!currentTargetId ? " selected" : "") + ">Sem ligação</option>"];

    nodes.forEach(function (node) {
      if (node.id === currentNodeId) return;
      options.push(
        '<option value="' +
        escAttr(node.id) +
        '"' +
        (node.id === currentTargetId ? " selected" : "") +
        ">" +
        esc(flowchartNodeTitle(nodes, node.id)) +
        "</option>"
      );
    });

    return options.join("");
  }

  // Indica se o símbolo do bloco deve virar lacuna para o aluno.
  function flowchartNodeUsesShapeBlank(node) {
    return mergeFlowchartNodeShapeOptions(node).length > 1;
  }

  // Indica se o texto do bloco deve virar lacuna para o aluno.
  function flowchartNodeUsesTextBlank(node) {
    return mergeFlowchartNodeTextOptions(node).length > 1;
  }

  // Lista símbolos corretos que entram automaticamente no popup.
  function getFlowchartAutoShapeOptions(nodes) {
    const list = [];

    (Array.isArray(nodes) ? nodes : []).forEach(function (node) {
      if (!flowchartNodeUsesShapeBlank(node)) return;
      const key = normalizeFlowchartShapeKey(node.shape);
      if (list.indexOf(key) === -1) list.push(key);
    });

    return list;
  }

  // Lista textos corretos que entram automaticamente no popup.
  function getFlowchartAutoTextOptions(nodes) {
    const list = [];

    (Array.isArray(nodes) ? nodes : []).forEach(function (node) {
      if (!flowchartNodeUsesTextBlank(node)) return;
      const value = String(node.text || "").trim();
      if (value && list.indexOf(value) === -1) list.push(value);
    });

    return list;
  }

  // Monta as opções de símbolo de um nó para o popup.
  function mergeFlowchartNodeShapeOptions(node) {
    const merged = normalizeFlowchartNodeShapeOptions(node && node.shapeOptions, node && node.shape);
    const current = normalizeFlowchartShapeKey(node && node.shape);
    // Mantém a opção correta disponível sem entregá-la automaticamente na primeira posição.
    if (merged.indexOf(current) === -1) merged.push(current);
    return merged;
  }

  // Monta as opções de texto de um nó para o popup.
  function mergeFlowchartNodeTextOptions(node) {
    const merged = normalizeFlowchartNodeTextOptions(node && node.textOptions, node && node.text)
      .map(function (option) { return option.value; })
      .filter(Boolean);
    const current = String(node && node.text ? node.text : "").trim();
    if (current && merged.indexOf(current) === -1) merged.push(current);
    return merged;
  }

  // Lista opções de texto do editor preservando extras vazias para que o autor consiga preenchê-las.
  function getFlowchartNodeTextEditorOptions(node) {
    const current = String(node && node.text ? node.text : "").trim();
    const extras = normalizeFlowchartNodeTextOptions(node && node.textOptions, current);
    return [{ id: "current", value: current }].concat(
      extras.map(function (option) {
        return {
          id: String(option.id || uid("opt")),
          value: String(option.value || "")
        };
      })
    );
  }

  // Retorna as duas saídas principais do nó, preservando a ordem dos slots salvos.
  function getFlowchartNodeOutputLinks(links, nodeId) {
    const slots = [null, null];
    const extras = [];

    (Array.isArray(links) ? links : []).forEach(function (item) {
      const link = normalizeFlowchartLink(item);
      if (!link || link.fromNodeId !== nodeId || !link.toNodeId) return;
      if (link.outputSlot === 0 || link.outputSlot === 1) {
        if (!slots[link.outputSlot] && !slots.some(function (current) { return current && current.toNodeId === link.toNodeId; })) {
          slots[link.outputSlot] = link;
          return;
        }
      }
      extras.push(link);
    });

    extras.forEach(function (link) {
      if (slots.some(function (current) { return current && current.toNodeId === link.toNodeId; })) return;
      if (!slots[0]) {
        link.outputSlot = 0;
        slots[0] = link;
        return;
      }
      if (!slots[1]) {
        link.outputSlot = 1;
        slots[1] = link;
      }
    });

    return slots;
  }

  // Retorna até duas saídas já configuradas para um bloco do fluxograma.
  function getFlowchartNodeOutputTargets(links, nodeId) {
    return getFlowchartNodeOutputLinks(links, nodeId).map(function (link) {
      return link && link.toNodeId ? link.toNodeId : "";
    });
  }

  // Retorna rótulo editorial sugerido para ramos de decisão.
  function getFlowchartEditorOutputLabel(node, slot) {
    if (!node || normalizeFlowchartShapeKey(node.shape) !== "decision") return "";
    return slot === 0 ? "Não" : slot === 1 ? "Sim" : "";
  }

  // Retorna rótulo padrão para saídas de decisões com duas setas.
  function getFlowchartDefaultOutputLabel(node, slot, links) {
    if (!node || normalizeFlowchartShapeKey(node.shape) !== "decision") return "";
    const active = getFlowchartNodeOutputLinks(links, node.id).filter(function (link) {
      return !!(link && link.toNodeId);
    });
    if (active.length < 2) return "";
    return getFlowchartEditorOutputLabel(node, slot);
  }

  // Verifica se a ligação é válida no fluxograma.
  function isFlowchartLinkAllowed(link, nodeMap) {
    const from = nodeMap[link && link.fromNodeId];
    const to = nodeMap[link && link.toNodeId];
    return !!(from && to && from.id !== to.id);
  }

  const flowchartLayoutEngine = createFlowchartLayoutEngine({
    layoutConfig: FLOWCHART_LAYOUT,
    getFlowchartSortedNodes: getFlowchartSortedNodes,
    getFlowchartNodeMap: getFlowchartNodeMap,
    normalizeFlowchartLink: normalizeFlowchartLink,
    isFlowchartLinkAllowed: isFlowchartLinkAllowed,
    getFlowchartNodeOutputLinks: getFlowchartNodeOutputLinks,
    normalizeFlowchartShapeKey: normalizeFlowchartShapeKey,
    getFlowchartDefaultOutputLabel: getFlowchartDefaultOutputLabel
  });
  const buildFlowchartLinkRenderData = flowchartLayoutEngine.buildFlowchartLinkRenderData;
  const getFlowchartBoardLayout = flowchartLayoutEngine.getFlowchartBoardLayout;
  const computeFlowchartBoardLayout = flowchartLayoutEngine.computeFlowchartBoardLayout;

  // Gera ID seguro para uso em marker SVG.
  function safeSvgId(value) {
    return String(value || "shape").replace(/[^a-zA-Z0-9_-]/g, "");
  }

  // Diminui a densidade tipográfica quando o texto do nó fica longo demais.
  function getFlowchartTextFitClass(text) {
    const compact = String(text || "").replace(/\s+/g, " ").trim();
    if (!compact) return "";
    if (compact.length >= 72) return " flowchart-text-fit-3";
    if (compact.length >= 56) return " flowchart-text-fit-2";
    if (compact.length >= 40) return " flowchart-text-fit-1";
    return "";
  }

  // Resume a topologia do fluxograma para reaproveitar layout enquanto o grafo não muda.
  function getFlowchartTopologySignature(nodes, links) {
    const normalizedNodes = getFlowchartSortedNodes(nodes).map(function (node) {
      return {
        id: String(node.id || ""),
        shape: normalizeFlowchartShapeKey(node.shape),
        order: String(node.id || "")
      };
    });
    const normalizedLinks = (Array.isArray(links) ? links : [])
      .map(normalizeFlowchartLink)
      .filter(Boolean)
      .sort(function (a, b) {
        if (a.fromNodeId !== b.fromNodeId) return a.fromNodeId < b.fromNodeId ? -1 : 1;
        if ((a.outputSlot || 0) !== (b.outputSlot || 0)) return (a.outputSlot || 0) - (b.outputSlot || 0);
        if (a.toNodeId !== b.toNodeId) return a.toNodeId < b.toNodeId ? -1 : 1;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      })
      .map(function (link) {
        return {
          from: String(link.fromNodeId || ""),
          to: String(link.toNodeId || ""),
          slot: link.outputSlot === 1 ? 1 : 0
        };
      });

    return JSON.stringify({
      nodes: normalizedNodes,
      links: normalizedLinks
    });
  }

  // Garante que exista um layout calculado ou em cálculo para o bloco visível.
  function ensureFlowchartLayout(blockId, nodes, links) {
    const signature = getFlowchartTopologySignature(nodes, links);
    const cache = state.ui.flowchartLayoutCacheByBlockId[blockId];

    if (cache && cache.signature === signature && (cache.status === "pending" || cache.status === "ready")) {
      return cache;
    }

    const requestId = uid("flow-layout");
    const nextCache = {
      signature: signature,
      status: "pending",
      requestId: requestId,
      layout: cache && cache.signature === signature ? cache.layout : null,
      error: ""
    };
    state.ui.flowchartLayoutCacheByBlockId[blockId] = nextCache;

    Promise.resolve(computeFlowchartBoardLayout(nodes, links))
      .then(function (layout) {
        const current = state.ui.flowchartLayoutCacheByBlockId[blockId];
        if (!current || current.requestId !== requestId) return;
        state.ui.flowchartLayoutCacheByBlockId[blockId] = {
          signature: signature,
          status: "ready",
          requestId: requestId,
          layout: layout,
          error: ""
        };
        renderApp();
      })
      .catch(function (error) {
        const current = state.ui.flowchartLayoutCacheByBlockId[blockId];
        if (!current || current.requestId !== requestId) return;
        state.ui.flowchartLayoutCacheByBlockId[blockId] = {
          signature: signature,
          status: "error",
          requestId: requestId,
          layout: null,
          error: error && error.message ? String(error.message) : "Erro ao organizar fluxograma."
        };
        renderApp();
      });

    return nextCache;
  }

  // Consulta o layout já pronto do fluxograma sem forçar cálculo novo.
  function getReadyFlowchartLayout(blockId, nodes, links) {
    const signature = getFlowchartTopologySignature(nodes, links);
    const cache = ((state.ui || {}).flowchartLayoutCacheByBlockId || {})[blockId];
    if (!cache || cache.signature !== signature || cache.status !== "ready" || !cache.layout) return null;
    return cache.layout;
  }

  // Retorna o último layout conhecido do bloco, útil para operações de zoom fora do ciclo de render.
  function getAnyCachedFlowchartLayout(blockId) {
    const cache = ((state.ui || {}).flowchartLayoutCacheByBlockId || {})[blockId];
    return cache && cache.layout ? cache.layout : null;
  }

  // Chave estável para lembrar o zoom de cada quadro de fluxograma em editor/prática.
  function getFlowchartViewportKey(blockId, mode) {
    return String(blockId || "") + "::" + String(mode === "practice" ? "practice" : "editor");
  }

  // Detecta desktop com ponteiro fino para ajustar o enquadramento inicial sem deixar o fluxograma minúsculo.
  function isDesktopFlowchartViewport() {
    if (typeof window === "undefined") return false;
    const width = Number(window.innerWidth || 0);
    if (width < 900) return false;
    if (typeof window.matchMedia === "function") {
      return window.matchMedia("(pointer: fine)").matches;
    }
    return true;
  }

  // Calcula um zoom inicial que tenta mostrar o máximo do fluxograma no celular sem sacrificar legibilidade.
  function getFlowchartDefaultViewportScale(layout) {
    if (!layout || !layout.width || !layout.height) return 1;

    const viewportWidth =
      typeof window !== "undefined" && window.innerWidth
        ? Math.max(220, Math.min(window.innerWidth - 92, 760))
        : 320;
    const viewportHeight =
      typeof window !== "undefined" && window.innerHeight
        ? Math.max(220, Math.round(window.innerHeight * 0.42))
        : 320;

    const widthFitScale = Math.min(1, viewportWidth / layout.width);
    const heightFitScale = Math.min(1, viewportHeight / layout.height);
    const preferredScale = isDesktopFlowchartViewport()
      ? Math.max(0.38, Math.min(widthFitScale, heightFitScale))
      : widthFitScale;

    return normalizeFlowchartViewportScale(preferredScale);
  }

  // Limita o zoom a uma faixa útil: permite visão global menor que 65%, mas nunca passa de 100%.
  function normalizeFlowchartViewportScale(value) {
    return clamp(Number(value) || 1, 0.2, 1);
  }

  // Consulta o zoom salvo para um quadro específico.
  function getFlowchartViewportScale(blockId, mode, fallbackScale) {
    const key = getFlowchartViewportKey(blockId, mode);
    const entry = ((state.ui || {}).flowchartViewportByKey || {})[key];
    return normalizeFlowchartViewportScale(entry && typeof entry.scale === "number" ? entry.scale : fallbackScale);
  }

  // Atualiza visualmente o zoom do quadro sem precisar renderizar a tela inteira.
  function applyFlowchartViewportScaleToNode(scrollNode, nextScale, anchorClientX, anchorClientY) {
    if (!scrollNode) return;

    const stage = scrollNode.querySelector("[data-flowchart-stage='true']");
    const board = scrollNode.querySelector("[data-flowchart-board='true']");
    if (!stage || !board) return;

    const baseWidth = Number(board.getAttribute("data-base-width") || 0);
    const baseHeight = Number(board.getAttribute("data-base-height") || 0);
    if (!baseWidth || !baseHeight) return;

    const currentScale = normalizeFlowchartViewportScale(scrollNode.getAttribute("data-flowchart-scale"));
    const safeScale = normalizeFlowchartViewportScale(nextScale);
    const rect = scrollNode.getBoundingClientRect();
    const offsetX =
      typeof anchorClientX === "number"
        ? clamp(anchorClientX - rect.left, 0, scrollNode.clientWidth)
        : scrollNode.clientWidth / 2;
    const offsetY =
      typeof anchorClientY === "number"
        ? clamp(anchorClientY - rect.top, 0, scrollNode.clientHeight)
        : scrollNode.clientHeight / 2;
    const contentX = (scrollNode.scrollLeft + offsetX) / currentScale;
    const contentY = (scrollNode.scrollTop + offsetY) / currentScale;

    stage.style.width = Math.max(1, Math.round(baseWidth * safeScale)) + "px";
    stage.style.height = Math.max(1, Math.round(baseHeight * safeScale)) + "px";
    board.style.transform = "scale(" + safeScale.toFixed(3) + ")";
    scrollNode.setAttribute("data-flowchart-scale", safeScale.toFixed(3));
    const zoomValue = scrollNode.parentElement && scrollNode.parentElement.querySelector(".flowchart-zoom-value");
    if (zoomValue) zoomValue.textContent = Math.round(safeScale * 100) + "%";

    requestAnimationFrame(function () {
      scrollNode.scrollLeft = Math.max(0, contentX * safeScale - offsetX);
      scrollNode.scrollTop = Math.max(0, contentY * safeScale - offsetY);
    });
  }

  // Atualiza o estado de zoom e, se o quadro estiver montado no DOM, aplica a escala imediatamente.
  function setFlowchartViewportScale(blockId, mode, nextScale, anchorClientX, anchorClientY) {
    const key = getFlowchartViewportKey(blockId, mode);
    const safeScale = normalizeFlowchartViewportScale(nextScale);

    state.ui.flowchartViewportByKey[key] = { scale: safeScale };

    const scrollNode = root.querySelector('[data-flowchart-key="' + cssEsc(key) + '"]');
    if (!scrollNode) {
      renderApp();
      return;
    }

    applyFlowchartViewportScaleToNode(scrollNode, safeScale, anchorClientX, anchorClientY);
  }

  // Renderiza o quadro do fluxograma em modo editor ou prática.
  function renderFlowchartBoard(block, options) {
    normalizeFlowchartEditorBlock(block);

    const mode = options && options.mode === "practice" ? "practice" : "editor";
    const viewportKey = getFlowchartViewportKey(block.id, mode);
    const exercise = options && options.exercise ? options.exercise : { shapes: {}, texts: {} };
    const popup = options && options.popup ? options.popup : null;
    const nodes = getFlowchartSortedNodes(block.nodes);
    const nodeMap = getFlowchartNodeMap(nodes);
    const cachedLayout = getReadyFlowchartLayout(block.id, nodes, block.links);
    const layoutState = cachedLayout
      ? { status: "ready", layout: cachedLayout }
      : ensureFlowchartLayout(block.id, nodes, block.links);
    const layout = layoutState && layoutState.layout ? layoutState.layout : getFlowchartBoardLayout(nodes, block.links);
    const layoutStatus = layoutState && layoutState.status ? layoutState.status : "fallback";
    const viewportScale = getFlowchartViewportScale(block.id, mode, getFlowchartDefaultViewportScale(layout));
    const scaledWidth = Math.max(1, Math.round(layout.width * viewportScale));
    const scaledHeight = Math.max(1, Math.round(layout.height * viewportScale));
    const markerId = "flow-arrow-" + safeSvgId(block.id + "-" + mode);
    const routedLinks = buildFlowchartLinkRenderData(block.links, nodeMap, layout);
    const linksSvg = routedLinks.map(function (route) {
      return (
        '<polyline points="' +
        route.points.map(function (point) {
          return point[0] + "," + point[1];
        }).join(" ") +
        '" marker-end="url(#' +
        markerId +
        ')"></polyline>'
      );
    }).join("");
    const labelsHtml = routedLinks.map(function (route) {
      if (!route.label || !route.labelPos) return "";
      const anchorClass =
        route.labelPos.anchor === "start"
          ? " flowchart-link-label-start"
          : route.labelPos.anchor === "end"
            ? " flowchart-link-label-end"
            : "";
      return (
        '<div class="flowchart-link-label' +
        anchorClass +
        '" style="left:' +
        route.labelPos.x +
        "px;top:" +
        route.labelPos.y +
        'px;">' +
        esc(route.label) +
        "</div>"
      );
    }).join("");

    const nodesHtml = nodes.map(function (node) {
      const pos = layout.positions[node.id];
      const shapeBlank = flowchartNodeUsesShapeBlank(node);
      const textBlank = flowchartNodeUsesTextBlank(node);
      const currentShape = mode === "practice" && shapeBlank ? String(exercise.shapes[node.id] || "") : node.shape;
      const currentText = mode === "practice" && textBlank ? String(exercise.texts[node.id] || "") : node.text;
      const textFitClass = getFlowchartTextFitClass(currentText);
      const shapeHtml = currentShape
        ? renderFlowchartShapeSvg(currentShape)
        : '<div class="flowchart-shape-placeholder" aria-hidden="true"></div>';
      const shapeActive = shapeBlank && popup && popup.nodeId === node.id && popup.kind === "shape";
      const textActive = textBlank && popup && popup.nodeId === node.id && popup.kind === "text";

      return (
        '<div class="flowchart-node flowchart-node-' +
        mode +
        '" style="left:' +
        pos.left +
        "px;top:" +
        pos.top +
        'px;">' +
        (mode === "practice" && shapeBlank
          ? '<button class="flowchart-shape-button' +
            (shapeActive ? " active" : "") +
            '" data-action="flowchart-open-shape" data-block-id="' +
            escAttr(block.id) +
            '" data-node-id="' +
            escAttr(node.id) +
            '" title="Escolher símbolo" aria-label="Escolher símbolo">' +
            shapeHtml +
            "</button>"
          : mode === "editor"
            ? '<button class="flowchart-shape-fixed flowchart-board-jump" data-action="flowchart-focus-node-shape" data-block-id="' +
              escAttr(block.id) +
              '" data-node-id="' +
              escAttr(node.id) +
              '" title="Ir para símbolo do bloco" aria-label="Ir para símbolo do bloco">' +
              shapeHtml +
              "</button>"
            : '<div class="flowchart-shape-fixed">' + shapeHtml + "</div>") +
        (mode === "practice" && textBlank
          ? '<button class="flowchart-text-button' +
            textFitClass +
            (textActive ? " active" : "") +
            (currentText ? " filled" : "") +
            '" data-action="flowchart-open-text" data-block-id="' +
            escAttr(block.id) +
            '" data-node-id="' +
            escAttr(node.id) +
            '" title="Escolher texto" aria-label="Escolher texto">' +
            (currentText ? esc(currentText) : "&nbsp;") +
            "</button>"
          : mode === "editor"
            ? '<button class="flowchart-text-fixed flowchart-board-jump' +
              textFitClass +
              (currentText ? " filled" : "") +
              '" data-action="flowchart-focus-node-text" data-block-id="' +
              escAttr(block.id) +
              '" data-node-id="' +
              escAttr(node.id) +
              '" title="Ir para texto do bloco" aria-label="Ir para texto do bloco">' +
              (currentText ? esc(currentText) : "&nbsp;") +
              "</button>"
            : '<div class="flowchart-text-fixed' +
              textFitClass +
              (currentText ? " filled" : "") +
              '">' +
              (currentText ? esc(currentText) : "&nbsp;") +
              "</div>") +
        "</div>"
      );
    }).join("");

    return (
      '<div class="flowchart-view-shell">' +
      '<div class="flowchart-zoom-controls" data-flowchart-zoom-controls="true">' +
      '<button class="icon-ghost tiny-icon" data-action="flowchart-zoom-out" data-block-id="' +
      escAttr(block.id) +
      '" data-flowchart-mode="' +
      escAttr(mode) +
      '" title="Diminuir zoom" aria-label="Diminuir zoom">-</button>' +
      '<button class="icon-ghost tiny-icon flowchart-zoom-value" data-action="flowchart-zoom-reset" data-block-id="' +
      escAttr(block.id) +
      '" data-flowchart-mode="' +
      escAttr(mode) +
      '" title="Voltar ao ajuste automático" aria-label="Voltar ao ajuste automático">' +
      Math.round(viewportScale * 100) +
      "%</button>" +
      '<button class="icon-ghost tiny-icon" data-action="flowchart-zoom-in" data-block-id="' +
      escAttr(block.id) +
      '" data-flowchart-mode="' +
      escAttr(mode) +
      '" title="Aumentar zoom" aria-label="Aumentar zoom">+</button>' +
      "</div>" +
      '<div class="flowchart-scroll" data-flowchart-scroll="true" data-flowchart-key="' +
      escAttr(viewportKey) +
      '" data-block-id="' +
      escAttr(block.id) +
      '" data-flowchart-mode="' +
      escAttr(mode) +
      '" data-flowchart-scale="' +
      viewportScale.toFixed(3) +
      '" data-flowchart-layout-status="' +
      escAttr(layoutStatus) +
      '">' +
      '<div class="flowchart-stage" data-flowchart-stage="true" style="width:' +
      scaledWidth +
      "px;height:" +
      scaledHeight +
      'px;">' +
      '<div class="flowchart-board flowchart-board-' +
      mode +
      '" data-flowchart-board="true" data-base-width="' +
      layout.width +
      '" data-base-height="' +
      layout.height +
      '" style="width:' +
      layout.width +
      "px;height:" +
      layout.height +
      "px;transform:scale(" +
      viewportScale.toFixed(3) +
      ');transform-origin:top left;">' +
      (layoutStatus === "pending" ? '<div class="flowchart-layout-overlay" aria-hidden="true"></div>' : "") +
      '<svg class="flowchart-links" viewBox="0 0 ' +
      layout.width +
      " " +
      layout.height +
      '" aria-hidden="true" focusable="false">' +
      '<defs><marker id="' +
      markerId +
      '" markerWidth="6" markerHeight="6" refX="5.6" refY="3" orient="auto"><path d="M0.7,0.7 L5.6,3 L0.7,5.3"></path></marker></defs>' +
      linksSvg +
      "</svg>" +
      '<div class="flowchart-link-label-layer">' +
      labelsHtml +
      "</div>" +
      nodesHtml +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  // Renderiza painel do fluxo no modo editor.
  function renderFlowchartBuilder(block) {
    normalizeFlowchartEditorBlock(block);

    const nodes = getFlowchartSortedNodes(block.nodes);

    const nodesHtml = nodes.map(function (node) {
      const outputLinks = getFlowchartNodeOutputLinks(block.links, node.id);
      const currentOutputs = outputLinks.map(function (link) {
        return link && link.toNodeId ? link.toNodeId : "";
      });

      const shapeRows = mergeFlowchartNodeShapeOptions(node).map(function (shape, index) {
        const optionChoices = FLOWCHART_SHAPES.map(function (item) {
          return (
            '<option value="' +
            escAttr(item.key) +
            '"' +
            (item.key === shape ? " selected" : "") +
            ">" +
            esc(getFlowchartShapePickerLabel(item.key)) +
            "</option>"
          );
        }).join("");

        return (
          '<div class="choice-row' +
          (index === 0 ? " flowchart-main-choice" : "") +
          '"' +
          (index === 0
            ? ""
            : ' data-flowchart-node-shape-option-row="true" data-option-index="' + String(index - 1) + '"') +
          ">" +
          '<button class="icon-ghost tiny-icon option-toggle' +
          (index === 0 ? " active" : "") +
          '" data-action="flowchart-select-node-shape-answer" data-block-id="' +
          escAttr(block.id) +
          '" data-node-id="' +
          escAttr(node.id) +
          '" data-option-index="' +
          index +
          '" title="Marcar símbolo correto">' +
          (index === 0 ? "&#9679;" : "&#9675;") +
          "</button>" +
          (index === 0
            ? '<select class="block-select flowchart-shape-select" data-flowchart-node-shape="true">'
            : '<select class="block-select flowchart-shape-select" data-flowchart-node-shape-option="true" data-option-index="' +
              String(index - 1) +
              '">') +
          optionChoices +
          "</select>" +
          (index === 0
            ? '<span class="choice-row-spacer" aria-hidden="true"></span>'
            : '<button class="icon-ghost tiny-icon" data-action="flowchart-remove-node-shape-option" data-block-id="' +
              escAttr(block.id) +
              '" data-node-id="' +
              escAttr(node.id) +
              '" data-option-index="' +
              String(index - 1) +
              '" title="Remover opção de símbolo">&times;</button>') +
          "</div>"
        );
      }).join("");

      const textRows = getFlowchartNodeTextEditorOptions(node).map(function (option, index) {
        const value = String(option.value || "");
        const optionId = option.id || "current";
        return (
          '<div class="choice-row' +
          (index === 0 ? " flowchart-main-choice" : "") +
          '"' +
          (index === 0
            ? ""
            : ' data-flowchart-node-text-option-row="true" data-option-id="' + escAttr(optionId) + '" data-option-index="' + String(index - 1) + '"') +
          '">' +
          '<button class="icon-ghost tiny-icon option-toggle' +
          (index === 0 ? " active" : "") +
          '" data-action="flowchart-select-node-text-answer" data-block-id="' +
          escAttr(block.id) +
          '" data-node-id="' +
          escAttr(node.id) +
          '" data-option-index="' +
          index +
          '" title="Marcar texto correto">' +
          (index === 0 ? "&#9679;" : "&#9675;") +
          "</button>" +
          (index === 0
            ? '<input type="text" class="block-input" data-flowchart-node-text="true" value="' +
              escAttr(value) +
              '" placeholder="Texto do bloco">'
            : '<input type="text" class="block-input" data-flowchart-node-text-option="true" data-option-index="' +
              String(index - 1) +
              '" value="' +
              escAttr(value) +
              '" placeholder="Outra opção de texto">') +
          (index === 0
            ? '<span class="choice-row-spacer" aria-hidden="true"></span>'
            : '<button class="icon-ghost tiny-icon" data-action="flowchart-remove-node-text-option" data-block-id="' +
              escAttr(block.id) +
              '" data-node-id="' +
              escAttr(node.id) +
              '" data-option-index="' +
              String(index - 1) +
              '" title="Remover opção de texto">&times;</button>') +
          "</div>"
        );
      }).join("");

      const outputRows = [0, 1].map(function (slot) {
        const editorLabel = getFlowchartEditorOutputLabel(node, slot);
        const defaultLabel = editorLabel || getFlowchartDefaultOutputLabel(node, slot, block.links);
        const currentLabel = outputLinks[slot] ? String(outputLinks[slot].label || "") : "";
        const effectiveLabel = currentLabel || defaultLabel;
        const labelPlaceholder = defaultLabel || "Rótulo";
        const rowLabel = editorLabel || ("Saída " + String(slot + 1));

        return (
          '<div class="flowchart-output-row" data-flowchart-node-output-row="true" data-output-slot="' +
          slot +
          '">' +
          '<label class="tiny muted">' +
          esc(rowLabel) +
          "</label>" +
          '<select class="block-select" data-flowchart-node-output="true" data-output-slot="' +
          slot +
          '">' +
          renderFlowchartOutputOptions(nodes, node.id, currentOutputs[slot]) +
          "</select>" +
          '<input type="text" class="block-input" data-flowchart-node-output-label="true" data-output-slot="' +
          slot +
          '" value="' +
          escAttr(effectiveLabel) +
          '" placeholder="' +
          escAttr(labelPlaceholder) +
          '">' +
          "</div>"
        );
      }).join("");

      return (
        '<article class="flowchart-node-card" data-flowchart-node-card="true" data-flowchart-node-id="' +
        escAttr(node.id) +
        '">' +
        '<div class="flowchart-node-card-head">' +
        '<p class="tiny muted">' +
        esc(flowchartNodeTitle(nodes, node.id)) +
        "</p>" +
        '<div class="flowchart-node-card-actions">' +
        '<button class="icon-ghost tiny-icon" data-action="flowchart-move-node-up" data-block-id="' +
        escAttr(block.id) +
        '" data-node-id="' +
        escAttr(node.id) +
        '" title="Subir bloco">&uarr;</button>' +
        '<button class="icon-ghost tiny-icon" data-action="flowchart-move-node-down" data-block-id="' +
        escAttr(block.id) +
        '" data-node-id="' +
        escAttr(node.id) +
        '" title="Descer bloco">&darr;</button>' +
        '<button class="icon-ghost tiny-icon" data-action="flowchart-remove-node" data-block-id="' +
        escAttr(block.id) +
        '" data-node-id="' +
        escAttr(node.id) +
        '" title="Remover bloco">&times;</button>' +
        "</div>" +
        "</div>" +
        '<div class="flowchart-field-grid">' +
        '<p class="tiny muted">Conexões</p>' +
        outputRows +
        "</div>" +
        '<section class="flowchart-config-section">' +
        '<div class="flowchart-config-head">' +
        '<p class="tiny muted">Símbolo</p>' +
        '<button class="icon-ghost tiny-icon" data-action="flowchart-add-node-shape-option" data-block-id="' +
        escAttr(block.id) +
        '" data-node-id="' +
        escAttr(node.id) +
        '" title="Adicionar outra opção de símbolo">+</button>' +
        "</div>" +
        '<div class="choice-list">' +
        shapeRows +
        "</div>" +
        "</section>" +
        '<section class="flowchart-config-section">' +
        '<div class="flowchart-config-head">' +
        '<p class="tiny muted">Texto</p>' +
        '<button class="icon-ghost tiny-icon" data-action="flowchart-add-node-text-option" data-block-id="' +
        escAttr(block.id) +
        '" data-node-id="' +
        escAttr(node.id) +
        '" title="Adicionar outra opção de texto">+</button>' +
        "</div>" +
        '<div class="choice-list">' +
        textRows +
        "</div>" +
        "</section>" +
        "</article>"
      );
    }).join("");

    return (
      '<section class="flowchart-builder">' +
      renderFlowchartBoard(block, { mode: "editor" }) +
      '<section class="flowchart-config">' +
      '<div class="config-actions">' +
      '<button class="icon-ghost tiny-icon" data-action="flowchart-add-node" data-block-id="' +
      escAttr(block.id) +
      '" title="Adicionar bloco">+</button>' +
      "</div>" +
      (nodesHtml || "") +
      "</section>" +
      "</section>"
    );
  }

  // Renderiza popup de escolha de símbolo/texto do fluxograma.
  function renderFlowchartPopup(step, block, popup, exercise) {
    if (!popup || popup.stepId !== step.id || popup.blockId !== block.id) return "";

    const nodes = getFlowchartSortedNodes(block.nodes);
    const node = nodes.find(function (item) {
      return item.id === popup.nodeId;
    });
    if (!node) return "";

    if (popup.kind === "shape") {
      const options = mergeFlowchartNodeShapeOptions(node);
      const current = String(exercise.shapes[node.id] || "");
      const optionsHtml = options.map(function (shape) {
        return (
          '<button class="flowchart-popup-option flowchart-popup-shape' +
          (shape === current ? " active" : "") +
          '" data-action="flowchart-set-shape" data-block-id="' +
          escAttr(block.id) +
          '" data-node-id="' +
          escAttr(node.id) +
          '" data-shape="' +
          escAttr(shape) +
          '">' +
          renderFlowchartShapeSvg(shape) +
          '<span class="tiny">' +
          esc(getFlowchartShapeLabel(shape)) +
          "</span>" +
          "</button>"
        );
      }).join("");

      return (
        '<section class="flowchart-popup" data-flowchart-popup="true">' +
        '<p class="tiny muted">Escolha o símbolo de ' +
        esc(flowchartNodeTitle(nodes, node.id)) +
        "</p>" +
        '<div class="flowchart-popup-grid">' +
        optionsHtml +
        "</div>" +
        '<div class="flowchart-popup-actions">' +
        '<button class="icon-pill" data-action="flowchart-clear-choice" data-block-id="' +
        escAttr(block.id) +
        '" data-node-id="' +
        escAttr(node.id) +
        '" data-choice-kind="shape" title="Limpar escolha" aria-label="Limpar escolha">&#8635;</button>' +
        "</div>" +
        "</section>"
      );
    }

    const textOptions = mergeFlowchartNodeTextOptions(node);
    const currentText = String(exercise.texts[node.id] || "");
    const textHtml = textOptions.map(function (value) {
      return (
        '<button class="token-option' +
        (value === currentText ? " active" : "") +
        '" data-action="flowchart-set-text" data-block-id="' +
        escAttr(block.id) +
        '" data-node-id="' +
        escAttr(node.id) +
        '" data-text="' +
        encodeURIComponent(value) +
        '">' +
        esc(value) +
        "</button>"
      );
    }).join("");

    return (
      '<section class="flowchart-popup" data-flowchart-popup="true">' +
      '<p class="tiny muted">Escolha o texto de ' +
      esc(flowchartNodeTitle(nodes, node.id)) +
      "</p>" +
      '<div class="token-options">' +
      textHtml +
      "</div>" +
      '<div class="flowchart-popup-actions">' +
      '<button class="icon-pill" data-action="flowchart-clear-choice" data-block-id="' +
      escAttr(block.id) +
      '" data-node-id="' +
      escAttr(node.id) +
      '" data-choice-kind="text" title="Limpar escolha" aria-label="Limpar escolha">&#8635;</button>' +
      "</div>" +
      "</section>"
    );
  }

  // Renderiza feedback do exercício de fluxograma.
  function renderFlowchartFeedback(step, block) {
    const exercise = getFlowchartExerciseState(step, block);
    if (!exercise.feedback) return "";

    if (exercise.feedback === "correct") {
      return '<div class="inline-feedback ok" data-feedback-block-id="' + escAttr(block.id) + '"><p class="tiny">Correto.</p></div>';
    }

    if (exercise.feedback === "incomplete") {
      return '<div class="inline-feedback err" data-feedback-block-id="' + escAttr(block.id) + '"><p class="tiny">Preencha todos os blocos e textos.</p></div>';
    }

    return (
      '<div class="inline-feedback err" data-feedback-block-id="' +
      escAttr(block.id) +
      '">' +
      '<p class="tiny">Fluxograma incorreto.</p>' +
      '<div class="feedback-icons">' +
      '<button class="icon-pill" data-action="flowchart-view-answer" data-block-id="' +
      escAttr(block.id) +
      '" title="Ver resposta">&#128065;</button>' +
      '<button class="icon-pill primary" data-action="flowchart-try-again" data-block-id="' +
      escAttr(block.id) +
      '" title="Tentar de novo">&#8635;</button>' +
      "</div>" +
      "</div>"
    );
  }

  // Renderiza exercício de fluxograma.
  function renderFlowchartBlock(step, block) {
    normalizeFlowchartEditorBlock(block);
    const exercise = getFlowchartExerciseState(step, block);
    const popup =
      state.flowchartPopupOpen &&
      state.flowchartPopupOpen.stepId === step.id &&
      state.flowchartPopupOpen.blockId === block.id
        ? state.flowchartPopupOpen
        : null;

    return (
      '<section class="flowchart-exercise">' +
      renderFlowchartBoard(block, { mode: "practice", exercise: exercise, popup: popup }) +
      renderFlowchartPopup(step, block, popup, exercise) +
      renderFlowchartFeedback(step, block) +
      "</section>"
    );
  }

  // Renderiza tela simples de erro para estados invalidos.
  function renderError(message) {
    return (
      '<section class="screen">' +
      renderTopBar({ title: "Erro", showBack: true }) +
      '<main class="screen-content">' +
      '<article class="clean-card"><p class="card-subtitle">' +
      esc(message) +
      "</p></article>" +
      "</main></section>"
    );
  }


  // ============================================================================
  // Editor de Card (Montagem Visual)
  // ============================================================================
  // Cria estrutura base de formulario para novo card.
  function blankEditorForm(type) {
    return {
      stepType: type || "content",
      comment: "",
      blocks: [defaultButtonBlock()]
    };
  }

  // Cria bloco padrao de botao (sempre presente no final).
  function defaultButtonBlock() {
    return {
      id: uid("block"),
      kind: "button",
      popupEnabled: false,
      popupBlocks: []
    };
  }

  // Garante que exista exatamente um botao final no card.
  function ensureEditorButtonBlock(blocks) {
    const source = Array.isArray(blocks) ? blocks.slice() : [];
    let button = null;

    const list = source.filter(function (block) {
      if (!block || !isButtonKind(block.kind)) return true;
      if (!button) button = block;
      return false;
    });

    if (!button) {
      button = defaultButtonBlock();
    } else {
      button = {
        id: button.id || uid("block"),
        kind: "button",
        popupEnabled: !!button.popupEnabled,
        popupBlocks: normalizePopupBlocks(button.popupBlocks)
      };
    }

    list.push(button);
    return list;
  }

  // Converte step salvo para formato editavel no construtor visual.
  function toEditorForm(step) {
    const stepType = step.type === "lesson_complete" ? "lesson_complete" : "content";
    const form = blankEditorForm(stepType);
    form.comment = getStepCommentValue(step);
    form.blocks = Array.isArray(step.blocks)
      ? step.blocks.map(function (block) {
        const next = {
          id: block.id || uid("block"),
          kind: block.kind || "paragraph"
        };

        if (!isButtonKind(next.kind)) {
          next.value = String(block.value || "");
        }

        if (isHeadingKind(block.kind)) {
          next.align = normalizeTextBlockAlign(block.align);
        }

        if (isParagraphTextKind(block.kind)) {
          next.richText = typeof block.richText === "string" ? block.richText : "";
          next.align = normalizeTextBlockAlign(block.align);
          normalizeParagraphEditorBlock(next);
        }
        if (isEditorKind(block.kind)) {
          next.kind = "editor";
          next.options = normalizeEditorOptions(block.options);
          next.interactionMode = block.interactionMode;
          normalizeTerminalEditorBlock(next);
        }
        if (isFlowchartKind(block.kind)) {
          next.kind = "flowchart";
          next.value = "";
          next.nodes = Array.isArray(block.nodes) ? block.nodes.map(normalizeFlowchartNode) : [];
          next.links = Array.isArray(block.links) ? block.links.map(normalizeFlowchartLink).filter(Boolean) : [];
          next.shapeOptions = normalizeFlowchartShapeOptions(block.shapeOptions);
          next.textOptions = normalizeFlowchartTextOptions(block.textOptions);
          normalizeFlowchartEditorBlock(next);
        }
        if (isTableKind(block.kind)) {
          const normalizedTable = normalizeTableBlock(block);
          next.kind = "table";
          next.value = "";
          next.title = normalizedTable.title;
          next.titleStyle = normalizedTable.titleStyle;
          next.headers = normalizedTable.headers;
          next.rows = normalizedTable.rows;
        }
        if (isMultipleChoiceKind(block.kind)) {
          const normalizedChoice = normalizeMultipleChoiceBlock(block);
          next.kind = "multiple_choice";
          next.value = "";
          next.answerState = normalizedChoice.answerState;
          next.options = normalizedChoice.options;
        }
        if (isSimulatorKind(block.kind)) {
          const normalizedSimulator = normalizeSimulatorBlock(block);
          next.kind = "simulator";
          next.value = normalizedSimulator.value;
          next.options = normalizedSimulator.options;
        }
        if (isButtonKind(block.kind)) {
          next.popupEnabled = !!block.popupEnabled;
          next.popupBlocks = normalizePopupBlocks(block.popupBlocks);
        }

        return next;
      })
      : [];
    form.blocks = ensureEditorButtonBlock(form.blocks);
    return form;
  }

  // Converte formulario do editor para step valido no JSON interno.
  function buildStepFromEditor(form, keepId) {
    const id = keepId || uid("step");
    let blocks = (form.blocks || [])
      .filter(function (block) { return block && block.kind && SUPPORTED_BLOCK_KINDS.indexOf(block.kind) > -1; })
      .map(function (block) {
        const next = {
          id: block.id || uid("block"),
          kind: block.kind
        };

        if (!isButtonKind(block.kind)) {
          next.value = String(block.value || "");
        }

        if (isHeadingKind(block.kind)) {
          next.align = normalizeTextBlockAlign(block.align);
        }

        if (isParagraphTextKind(block.kind)) {
          next.richText = typeof block.richText === "string" ? block.richText : "";
          next.align = normalizeTextBlockAlign(block.align);
          normalizeParagraphEditorBlock(next);
        }

        if (isEditorKind(block.kind)) {
          next.kind = "editor";
          next.interactionMode = normalizeEditorInteractionMode(block.interactionMode);
          next.options = normalizeEditorOptions(block.options)
            .map(function (option, index) {
              const serialized = {
                id: option.id || uid("opt"),
                value: String(option.value || ""),
                enabled: option.enabled !== false,
                displayOrder: Number.isFinite(Number(option.displayOrder)) ? Number(option.displayOrder) : 0,
                slotOrder: Number.isFinite(Number(option.slotOrder)) ? Number(option.slotOrder) : index
              };
              const variants = normalizeEditorInputVariantsForAuthor(option.variants)
                .map(function (variant) {
                  return {
                    id: variant.id || uid("variant"),
                    value: String(variant.value || ""),
                    regex: !!variant.regex
                  };
                })
                .filter(function (variant) {
                  return variant.value.length > 0;
                });
              if (next.interactionMode === "input" && option.regex) serialized.regex = true;
              if (next.interactionMode === "input" && variants.length) serialized.variants = variants;
              return serialized;
            })
            .filter(function (option) {
              return option.value.length > 0;
            });
        }

        if (isFlowchartKind(block.kind)) {
          next.kind = "flowchart";
          next.value = "";
          next.nodes = Array.isArray(block.nodes) ? block.nodes.map(normalizeFlowchartNode) : [];
          next.links = Array.isArray(block.links) ? block.links.map(normalizeFlowchartLink).filter(Boolean) : [];
          next.shapeOptions = normalizeFlowchartShapeOptions(block.shapeOptions);
          next.textOptions = normalizeFlowchartTextOptions(block.textOptions)
            .filter(function (option) {
              return option.value.length > 0;
            });
          normalizeFlowchartEditorBlock(next);
        }

        if (isTableKind(block.kind)) {
          const normalizedTable = normalizeTableBlock(block);
          next.kind = "table";
          next.value = "";
          next.title = normalizedTable.title;
          next.titleStyle = normalizedTable.titleStyle;
          next.headers = normalizedTable.headers;
          next.rows = normalizedTable.rows;
        }

        if (isMultipleChoiceKind(block.kind)) {
          const normalizedChoice = normalizeMultipleChoiceBlock(block);
          next.kind = "multiple_choice";
          next.value = "";
          next.answerState = normalizedChoice.answerState;
          next.options = normalizedChoice.options
            .map(function (option) {
              return {
                id: option.id || uid("opt"),
                value: String(option.value || "").trim(),
                answer: !!option.answer
              };
            })
            .filter(function (option) {
              return option.value.length > 0;
            });
          normalizeTerminalEditorBlock(next);
        }

        if (isSimulatorKind(block.kind)) {
          const normalizedSimulator = normalizeSimulatorBlock(block);
          next.kind = "simulator";
          next.value = normalizedSimulator.value;
          next.options = normalizedSimulator.options
            .map(function (option) {
              return {
                id: option.id || uid("opt"),
                value: String(option.value || "").trim(),
                result: String(option.result || "").replace(/\r/g, "")
              };
            })
            .filter(function (option) {
              return option.value.length > 0;
            });
        }

        if (isButtonKind(block.kind)) {
          next.popupEnabled = !!block.popupEnabled;
          next.popupBlocks = normalizePopupBlocks(block.popupBlocks);
        }

        return next;
      });

    blocks = ensureEditorButtonBlock(blocks);

    for (let i = 0; i < blocks.length; i += 1) {
      if (!isEditorKind(blocks[i].kind)) continue;

      normalizeTerminalEditorBlock(blocks[i]);
      pruneEmptyEditorPlaceholders(blocks[i]);
      const markers = parseOptionMarkers(blocks[i].value);
      const options = normalizeEditorOptions(blocks[i].options);
      const interactionMode = getEditorInteractionMode(blocks[i]);
      const enabledCount = getEnabledOptionIndexes(options).length;
      if (markers.length !== enabledCount) {
        window.alert("Editor com lacunas inconsistentes. Revise as opções habilitadas.");
        return null;
      }

      const hasAnyExercise = markers.length > 0 || options.length > 0;
      const hasBlankMarker = markers.some(function (marker) { return !String(marker.value || "").trim(); });
      const hasBlankOption = options.some(function (option) { return !String(option.value || "").trim(); });
      if (hasAnyExercise && (hasBlankMarker || hasBlankOption)) {
        window.alert(
          interactionMode === "choice"
            ? "Preencha todos os textos dentro de [[...]] e das opções do Editor."
            : "Preencha todas as respostas esperadas das lacunas do Editor digitado."
        );
        return null;
      }
    }

    for (let i = 0; i < blocks.length; i += 1) {
      if (!isFlowchartKind(blocks[i].kind)) continue;

      normalizeFlowchartEditorBlock(blocks[i]);
      const flowNodes = getFlowchartSortedNodes(blocks[i].nodes);
      if (!flowNodes.length) {
        window.alert("Adicione pelo menos um bloco ao fluxograma.");
        return null;
      }

      for (let j = 0; j < flowNodes.length; j += 1) {
        const node = flowNodes[j];
        if (!String(node.text || "").trim()) {
          window.alert("Preencha o texto correto de todos os blocos do fluxograma.");
          return null;
        }
        if ((node.textOptions || []).some(function (option) { return !String(option.value || "").trim(); })) {
          window.alert("Preencha ou remova todas as opções extras de texto do fluxograma.");
          return null;
        }
      }

      const nodeMap = getFlowchartNodeMap(flowNodes);
      const outgoingCount = {};
      for (let j = 0; j < blocks[i].links.length; j += 1) {
        const link = blocks[i].links[j];
        if (!nodeMap[link.fromNodeId] || !nodeMap[link.toNodeId]) {
          window.alert("Há uma seta do fluxograma apontando para um bloco inexistente.");
          return null;
        }
        outgoingCount[link.fromNodeId] = (outgoingCount[link.fromNodeId] || 0) + 1;
        if (outgoingCount[link.fromNodeId] > 2) {
          window.alert("Cada bloco do fluxograma pode ter no máximo duas saídas.");
          return null;
        }
        if (!isFlowchartLinkAllowed(link, nodeMap)) {
          window.alert("As setas do fluxograma precisam ligar um bloco a outro bloco válido.");
          return null;
        }
      }
    }

    for (let i = 0; i < blocks.length; i += 1) {
      if (!isTableKind(blocks[i].kind)) continue;

      const table = normalizeTableBlock(blocks[i]);
      const exerciseEntries = getTableExerciseCellEntries(table);

      for (let j = 0; j < exerciseEntries.length; j += 1) {
        const entry = exerciseEntries[j];
        const label = getTableCellLabel(entry.ref);
        const answer = String(entry.cell.value || "").trim();
        const targetCell =
          entry.ref.role === "header"
            ? table.headers[entry.ref.columnIndex]
            : table.rows[entry.ref.rowIndex] && table.rows[entry.ref.rowIndex][entry.ref.columnIndex];

        if (!answer) {
          window.alert("Preencha a resposta esperada da " + label + " da tabela.");
          return null;
        }

        if (tableCellUsesChoiceBlank(entry.cell)) {
          const filledOptions = normalizeTableChoiceOptions(entry.cell.options).filter(function (option) {
            return !!String(option.value || "").trim();
          });

          if (!filledOptions.length) {
            window.alert("Adicione pelo menos uma opção para a " + label + " da tabela.");
            return null;
          }

          if (!filledOptions.some(function (option) { return option.value === answer; })) {
            window.alert("Inclua a resposta esperada entre as opções da " + label + " da tabela.");
            return null;
          }

          if (targetCell) targetCell.options = filledOptions.map(serializeTableChoiceOption);
        }
      }

      blocks[i] = table;
    }

    for (let i = 0; i < blocks.length; i += 1) {
      if (!isMultipleChoiceKind(blocks[i].kind)) continue;

      const choice = normalizeMultipleChoiceBlock(blocks[i]);
      const filledOptions = choice.options.filter(function (option) {
        return String(option.value || "").trim();
      });
      const answerCount = filledOptions.filter(function (option) { return option.answer; }).length;

      if (!filledOptions.length) {
        window.alert("Adicione pelo menos uma alternativa na múltipla escolha.");
        return null;
      }
      if (answerCount < 1) {
        window.alert("Marque ao menos uma alternativa como resposta na múltipla escolha.");
        return null;
      }
    }

    for (let i = 0; i < blocks.length; i += 1) {
      if (!isSimulatorKind(blocks[i].kind)) continue;

      const simulator = normalizeSimulatorBlock(blocks[i]);
      if (parseOptionMarkers(simulator.value).length !== 1) {
        window.alert("O Simulador precisa ter exatamente uma lacuna no template.");
        return null;
      }
      const filledOptions = simulator.options.filter(function (option) {
        return String(option.value || "").trim();
      });

      if (!filledOptions.length) {
        window.alert("Adicione pelo menos uma opção no bloco Simulador.");
        return null;
      }
    }

    if (!blocks.length) {
      window.alert("Adicione pelo menos um bloco antes de salvar.");
      return null;
    }

    const heading = firstValue(blocks, "heading");
    const stepTypeBase = form.stepType === "lesson_complete" ? "lesson_complete" : "content";
    const base = {
      id: id,
      type: stepTypeBase,
      title: clean(heading, stepTypeBase === "lesson_complete" ? "Lição concluída" : "Novo card"),
      blocks: blocks
    };
    const comment = normalizeStepComment(form && form.comment);
    if (comment) base.comment = comment;

    if (stepTypeBase === "lesson_complete") {
      const firstParagraph = blocks.find(function (block) {
        return isParagraphKind(block.kind) && String(block.value || "").trim();
      });
      if (firstParagraph) base.subtitle = firstParagraph.value.trim();
    }

    return base;
  }

  // Retorna indice do card atualmente em foco no editor.
  function getEditorStepIndex(lessonEntry) {
    if (!lessonEntry || !lessonEntry.lesson) return 0;
    if (state.editor.mode !== "edit") return clamp(state.editor.anchorIndex, 0, lessonEntry.lesson.steps.length - 1);

    const byId = lessonEntry.lesson.steps.findIndex(function (step) {
      return step.id === state.editor.editingStepId;
    });
    if (byId > -1) return byId;
    return clamp(state.editor.anchorIndex, 0, lessonEntry.lesson.steps.length - 1);
  }

  // Salva rascunho do card atual em memoria enquanto o editor esta aberto.
  function snapshotEditorDraft() {
    if (!(state.editor.open && state.editor.mode === "edit" && state.editor.editingStepId)) return;

    snapshotEditorFromDom();
    state.editor.draftByStepId[state.editor.editingStepId] = clone(state.editor.form || blankEditorForm("content"));
  }

  // Troca o card em foco no editor (modo edicao), preservando rascunhos.
  function switchEditorStepByIndex(targetIndex) {
    if (!(state.editor.open && state.editor.mode === "edit")) return;
    const lessonEntry = getCurrentLessonEntry();
    if (!lessonEntry || !Array.isArray(lessonEntry.lesson.steps) || !lessonEntry.lesson.steps.length) return;
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= lessonEntry.lesson.steps.length) return;

    snapshotEditorDraft();

    const targetStep = lessonEntry.lesson.steps[targetIndex];
    const cached = state.editor.draftByStepId[targetStep.id];
    state.editor.editingStepId = targetStep.id;
    state.editor.anchorIndex = targetIndex;
    state.editor.keepStepId = targetStep.id;
    state.editor.form = cached ? clone(cached) : toEditorForm(targetStep);
    state.editor.activeBlockId = null;
    state.editor.dragType = null;
    state.editor.pointerDrag = null;
    state.editor.blockDragId = null;
    state.editor.imageTarget = null;
    resetPopupBuilderState();
    state.editor.pendingScrollBlockId = null;
    state.editor.terminalGuardByBlockId = {};
    state.editor.dragOverTargetId = null;
    state.editor.dragOverPosition = null;
    renderApp();
  }

  // Abre editor de card no modo editar/inserir antes/inserir depois.
  function openStepEditor(mode) {
    const step = getCurrentStep();
    if (!step) return;

    const initialForm = mode === "edit" ? toEditorForm(step) : blankEditorForm("content");
    state.editor.open = true;
    state.editor.mode = mode;
    state.editor.anchorIndex = state.currentStepIndex;
    state.editor.editingStepId = mode === "edit" ? step.id : null;
    state.editor.keepStepId = mode === "edit" ? step.id : null;
    state.editor.draftByStepId = {};
    state.editor.form = initialForm;
    state.editor.activeBlockId = null;
    if (mode === "edit") {
      state.editor.draftByStepId[step.id] = clone(initialForm);
    }
    state.editor.dragType = null;
    state.editor.pointerDrag = null;
    state.editor.blockDragId = null;
    state.editor.imageTarget = null;
    resetPopupBuilderState();
    state.editor.pendingScrollBlockId = null;
    state.editor.terminalGuardByBlockId = {};
    state.editor.dragOverTargetId = null;
    state.editor.dragOverPosition = null;
    state.ui.lessonQuickOpen = false;
    renderApp();
  }

  // Fecha editor e limpa estado temporario de edicao.
  function closeEditor(shouldRender) {
    state.editor.open = false;
    state.editor.mode = "edit";
    state.editor.anchorIndex = 0;
    state.editor.editingStepId = null;
    state.editor.keepStepId = null;
    state.editor.draftByStepId = {};
    state.editor.form = null;
    state.editor.activeBlockId = null;
    state.editor.activeTableCell = null;
    state.editor.dragType = null;
    state.editor.pointerDrag = null;
    state.editor.blockDragId = null;
    state.editor.imageTarget = null;
    resetPopupBuilderState();
    state.editor.pendingScrollBlockId = null;
    state.editor.pendingTableFocus = null;
    state.editor.terminalGuardByBlockId = {};
    state.editor.dragOverTargetId = null;
    state.editor.dragOverPosition = null;
    if (shouldRender !== false) renderApp();
  }

  // Adiciona novo bloco no canvas do editor.
  function addBlock(kind, targetId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();
    const availableTypes =
      state.editor.popupBuilder && state.editor.popupBuilder.open
        ? POPUP_BLOCK_KINDS
        : AUTHORING_BLOCK_KINDS;
    if (availableTypes.indexOf(kind) === -1) return;

    const block =
      kind === "flowchart"
        ? defaultFlowchartBlock()
        : kind === "table"
          ? defaultTableBlock()
          : kind === "multiple_choice"
            ? defaultMultipleChoiceBlock()
            : kind === "simulator"
              ? defaultSimulatorBlock()
            : { id: uid("block"), kind: kind, value: "", richText: kind === "paragraph" ? "" : undefined };
    if (kind === "editor") {
      block.options = [];
      block.interactionMode = "choice";
    }
    const blocks = ensureEditorButtonBlock(state.editor.form.blocks || []);
    const buttonIndex = blocks.findIndex(function (item) { return item.kind === "button"; });
    const insertAtEnd = buttonIndex > -1 ? buttonIndex : blocks.length;
    const defaultTargetId =
      !targetId && state.editor.activeBlockId
        ? getNextInsertTarget(state.editor.activeBlockId)
        : null;
    const desiredTargetId = targetId || defaultTargetId;

    if (!desiredTargetId) {
      blocks.splice(insertAtEnd, 0, block);
    } else {
      const targetIndex = blocks.findIndex(function (item) { return item.id === desiredTargetId; });
      if (targetIndex === -1) {
        blocks.splice(insertAtEnd, 0, block);
      } else {
        const safeIndex = blocks[targetIndex] && blocks[targetIndex].kind === "button" ? targetIndex : targetIndex;
        blocks.splice(safeIndex, 0, block);
      }
    }

    state.editor.form.blocks = ensureEditorButtonBlock(blocks);
    state.editor.activeBlockId = block.id;
    state.editor.pendingScrollBlockId = block.id;
    renderApp();
  }

  // Registra o último bloco em edição para orientar destaque visual e inserções.
  function setActiveEditorBlock(blockId) {
    if (!state.editor.open) return;
    state.editor.activeBlockId = blockId || null;
    syncEditorActiveBlockVisualState();
  }

  // Reflete no DOM qual bloco está ativo para destacar o foco autoral sem re-render completo.
  function syncEditorActiveBlockVisualState() {
    const domScope = getEditorDomScope();
    if (!domScope || !domScope.querySelectorAll) return;

    const activeBlockId = state.editor && state.editor.open ? state.editor.activeBlockId : null;
    domScope.querySelectorAll(".builder-block").forEach(function (node) {
      const blockId = node.getAttribute("data-block-id") || "";
      const isDragSource =
        node.classList.contains("drag-source") ||
        (state.editor.pointerDrag && state.editor.pointerDrag.active && state.editor.pointerDrag.blockId === blockId) ||
        state.editor.blockDragId === blockId;
      const isActive = !!activeBlockId && activeBlockId === blockId;
      const shouldMute = !!activeBlockId && activeBlockId !== blockId && !isDragSource;
      node.classList.toggle("is-active", isActive);
      node.classList.toggle("is-muted", shouldMute);
    });
  }

  // Retorna o container DOM do editor atualmente ativo.
  function getEditorDomScope() {
    if (!(state.editor && state.editor.open)) return root;

    if (state.editor.popupBuilder && state.editor.popupBuilder.open) {
      return root.querySelector(".popup-builder-overlay") || root;
    }

    const overlays = Array.from(root.querySelectorAll(".editor-overlay"));
    return overlays.find(function (node) {
      return !node.classList.contains("popup-builder-overlay");
    }) || root;
  }

  // Retorna o editor rico de um bloco de parágrafo.
  function getParagraphRichInput(blockId) {
    if (!blockId) return null;
    return getEditorDomScope().querySelector(
      '.builder-block[data-block-id="' + cssEsc(blockId) + '"] [data-block-rich-input]'
    );
  }

  // Retorna o campo rico do template do bloco Editor.
  function getEditorTemplateInput(blockId) {
    if (!blockId) return null;
    return getEditorDomScope().querySelector(
      '.builder-block[data-block-id="' + cssEsc(blockId) + '"] [data-terminal-template]'
    );
  }

  // Retorna o campo rico do template do bloco Simulador.
  function getSimulatorTemplateInput(blockId) {
    if (!blockId) return null;
    return getEditorDomScope().querySelector(
      '.builder-block[data-block-id="' + cssEsc(blockId) + '"] [data-simulator-template]'
    );
  }

  // Tenta focar um campo textual sem deslocar a página inteira.
  function focusFieldNoScroll(field) {
    if (!field || typeof field.focus !== "function") return;
    try {
      field.focus({ preventScroll: true });
    } catch (error) {
      field.focus();
    }
  }

  // Posiciona o cursor no fim do primeiro campo focado quando o autor clica na superfície do contêiner.
  function moveCaretToFieldEnd(field) {
    if (!field) return;

    if (
      typeof field.setSelectionRange === "function" &&
      typeof field.value === "string" &&
      !field.matches("[type='checkbox'], [type='radio']")
    ) {
      const end = field.value.length;
      try {
        field.setSelectionRange(end, end);
      } catch (error) {
        // Alguns tipos de input não aceitam seleção programática.
      }
      return;
    }

    if (field.isContentEditable) {
      const selection = window.getSelection ? window.getSelection() : null;
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(field);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  // Descobre o primeiro campo editável útil de um contêiner no editor.
  function getPrimaryEditorField(blockNode) {
    if (!blockNode || !blockNode.querySelector) return null;

    if (blockNode.getAttribute("data-block-kind") === "table") {
      return (
        blockNode.querySelector("[data-table-title]") ||
        blockNode.querySelector("[data-table-header-cell]") ||
        blockNode.querySelector("[data-table-cell]") ||
        null
      );
    }

    const selectors = [
      "[data-block-input]:not([disabled])",
      "[data-button-popup]:not([disabled])",
      "input:not([type='hidden']):not([disabled])",
      "textarea:not([disabled])",
      "select:not([disabled])",
      "[contenteditable='true']",
      "button:not([disabled])"
    ];

    for (let i = 0; i < selectors.length; i += 1) {
      const field = blockNode.querySelector(selectors[i]);
      if (field) return field;
    }
    return null;
  }

  // Resolve o campo real da tabela mais próximo do clique dentro do bloco.
  function getNearestTableEditorField(target, blockNode) {
    if (!target || !blockNode || blockNode.getAttribute("data-block-kind") !== "table") return null;

    const directField = target.closest("[data-table-title], [data-table-header-cell], [data-table-cell]");
    if (directField && blockNode.contains(directField)) return directField;

    const tableArea = target.closest("th, td, .table-editor-cell-shell, .table-editor-header-shell, .table-editor-row-head-shell");
    if (!tableArea || !blockNode.contains(tableArea)) return null;

    return tableArea.querySelector("[data-table-title], [data-table-header-cell], [data-table-cell]");
  }

  // Ativa o contêiner clicado e, se o clique caiu na superfície, foca o primeiro campo dele.
  function handleEditorBlockSurfaceClick(event) {
    if (!state.editor.open) return;
    const target = event.target;
    if (!target || !target.closest) return;

    const blockNode = target.closest(".builder-block");
    if (!blockNode) return;
    const isTableBlock = blockNode.getAttribute("data-block-kind") === "table";

    setActiveEditorBlock(blockNode.getAttribute("data-block-id"));

    const tableField = getNearestTableEditorField(target, blockNode);
    if (tableField) {
      focusFieldNoScroll(tableField);
      if (target !== tableField) {
        moveCaretToFieldEnd(tableField);
      }
      setActiveTableCell(getTableCellRefFromField(tableField));
      return;
    }

    if (isTableBlock && target.closest(".table-config")) {
      return;
    }

    if (target.closest("[data-action], input, textarea, select, button, label, [contenteditable='true']")) {
      return;
    }

    const field = getPrimaryEditorField(blockNode);
    if (!field) return;
    focusFieldNoScroll(field);
    moveCaretToFieldEnd(field);
  }

  // Converte a seleção atual de um contenteditable em offsets lineares de texto.
  function getEditableSelectionOffsets(input) {
    const selection = window.getSelection ? window.getSelection() : null;
    if (!input || !selection || !selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    if (!input.contains(range.startContainer) || !input.contains(range.endContainer)) return null;

    const toOffset = function (container, offset) {
      const probe = document.createRange();
      try {
        probe.setStart(input, 0);
        probe.setEnd(container, offset);
      } catch (_error) {
        return null;
      }
      return probe.toString().length;
    };

    const start = toOffset(range.startContainer, range.startOffset);
    const end = toOffset(range.endContainer, range.endOffset);
    if (start === null || end === null) return null;

    return {
      start: Math.min(start, end),
      end: Math.max(start, end)
    };
  }

  // Resolve um offset linear de texto para um nó e posição válidos no contenteditable.
  function resolveEditableOffsetPosition(input, wantedOffset) {
    const walker = document.createTreeWalker(input, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    let consumed = 0;

    while (current) {
      const length = String(current.textContent || "").length;
      if (wantedOffset <= consumed + length) {
        return {
          node: current,
          offset: Math.max(0, wantedOffset - consumed)
        };
      }
      consumed += length;
      current = walker.nextNode();
    }

    if (input.lastChild && input.lastChild.nodeType === 3) {
      return {
        node: input.lastChild,
        offset: String(input.lastChild.textContent || "").length
      };
    }

    return {
      node: input,
      offset: input.childNodes ? input.childNodes.length : 0
    };
  }

  // Restaura seleção capturada anteriormente dentro do contenteditable.
  function restoreEditableSelectionOffsets(input, selectionState) {
    if (!input || !selectionState) return;
    const selection = window.getSelection ? window.getSelection() : null;
    if (!selection) return;

    const start = resolveEditableOffsetPosition(input, Math.max(0, selectionState.start || 0));
    const end = resolveEditableOffsetPosition(input, Math.max(0, selectionState.end || 0));
    const range = document.createRange();

    try {
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
    } catch (_error) {
      return;
    }

    selection.removeAllRanges();
    selection.addRange(range);
  }

  // Reaplica a seleção capturada quando o clique na toolbar ou o foco a deslocam do contenteditable.
  function ensureEditableSelectionState(input, selectionState) {
    if (!input || !selectionState) return;
    const current = getEditableSelectionOffsets(input);
    if (
      current &&
      current.start === Math.max(0, selectionState.start || 0) &&
      current.end === Math.max(0, selectionState.end || 0)
    ) {
      return;
    }
    restoreEditableSelectionOffsets(input, selectionState);
  }

  // Captura a seleção atual do bloco textual antes de abrir a paleta de cor.
  function captureBlockSelectionState(blockId) {
    const block = getEditorBlock(blockId);
    if (!block) return null;

    if (isEditorKind(block.kind)) {
      const input = getEditorTemplateInput(blockId);
      const offsets = getEditableSelectionOffsets(input);
      return offsets
        ? {
            mode: "contenteditable",
            start: offsets.start,
            end: offsets.end
          }
        : null;
    }

    if (isSimulatorKind(block.kind)) {
      const input = getSimulatorTemplateInput(blockId);
      const offsets = getEditableSelectionOffsets(input);
      return offsets
        ? {
            mode: "contenteditable",
            start: offsets.start,
            end: offsets.end
          }
        : null;
    }

    if (isParagraphTextKind(block.kind)) {
      const input = getParagraphRichInput(blockId);
      const offsets = getEditableSelectionOffsets(input);
      return offsets
        ? {
            mode: "contenteditable",
            start: offsets.start,
            end: offsets.end
          }
        : null;
    }

    return null;
  }

  // Restaura a seleção capturada para reaplicar estilo após a abertura da paleta.
  function restoreBlockSelectionState(blockId, selectionState) {
    const block = getEditorBlock(blockId);
    if (!block || !selectionState) return;

    if (selectionState.mode === "contenteditable" && isEditorKind(block.kind)) {
      const input = getEditorTemplateInput(blockId);
      if (!input) return;
      focusFieldNoScroll(input);
      restoreEditableSelectionOffsets(input, selectionState);
      return;
    }

    if (selectionState.mode === "contenteditable" && isSimulatorKind(block.kind)) {
      const input = getSimulatorTemplateInput(blockId);
      if (!input) return;
      focusFieldNoScroll(input);
      restoreEditableSelectionOffsets(input, selectionState);
      return;
    }

    if (selectionState.mode === "contenteditable" && isParagraphTextKind(block.kind)) {
      const input = getParagraphRichInput(blockId);
      if (!input) return;
      focusFieldNoScroll(input);
      restoreEditableSelectionOffsets(input, selectionState);
    }
  }

  // Lê as opções configuradas no bloco Editor a partir do DOM atual.
  function collectTerminalOptionsFromBlockNode(blockNode) {
    if (!blockNode) return [];
    const groups = Array.from(blockNode.querySelectorAll("[data-editor-option-group]"));
    const currentBlock = getEditorBlock(blockNode.getAttribute("data-block-id") || "");
    if (!groups.length) {
      return Array.from(blockNode.querySelectorAll("[data-terminal-option-row]")).map(function (row, visualIndex) {
        const inputNode = row.querySelector("[data-terminal-option]");
        const base = getEditorOptionById(currentBlock && currentBlock.options, row.getAttribute("data-option-id") || "") || {};
        return {
          id: row.getAttribute("data-option-id") || uid("opt"),
          value: inputNode ? String(inputNode.value || "") : String(base.value || ""),
          enabled: row.getAttribute("data-option-enabled") !== "0",
          displayOrder: visualIndex,
          slotOrder: Number.isFinite(Number(base.slotOrder)) ? Number(base.slotOrder) : visualIndex,
          regex: !!base.regex,
          variants: normalizeEditorInputVariantsForAuthor(base.variants)
        };
      });
    }
    const baseOptions = normalizeEditorOptions(currentBlock && currentBlock.options).reduce(function (acc, option) {
      acc[option.id] = option;
      return acc;
    }, {});

    const collected = groups.map(function (groupNode, visualIndex) {
      const row = groupNode.querySelector("[data-terminal-option-row]");
      const inputNode = row ? row.querySelector("[data-terminal-option]") : null;
      const id = (row ? row.getAttribute("data-option-id") : groupNode.getAttribute("data-option-id")) || uid("opt");
      const base = baseOptions[id] || {};
      const variantRows = Array.from(groupNode.querySelectorAll("[data-editor-slot-variant-row]"));
      const baseVariants = normalizeEditorInputVariantsForAuthor(base.variants);
      return {
        id: id,
        value: inputNode ? String(inputNode.value || "") : String(base.value || ""),
        enabled: row ? row.getAttribute("data-option-enabled") !== "0" : base.enabled !== false,
        displayOrder: visualIndex,
        slotOrder: Number.isFinite(Number(base.slotOrder)) ? Number(base.slotOrder) : visualIndex,
        regex: !!base.regex,
        variants: variantRows.length
          ? variantRows.map(function (variantRow, variantIndex) {
              const variantInput = variantRow.querySelector("[data-editor-slot-variant]");
              const variantBase = baseVariants[variantIndex] || {};
              return {
                id: String(variantBase.id || uid("variant")),
                value: variantInput ? String(variantInput.value || "") : String(variantBase.value || ""),
                regex: !!variantBase.regex
              };
            })
          : baseVariants
      };
    });

    const missing = normalizeEditorOptions(currentBlock && currentBlock.options).filter(function (option) {
      return !collected.some(function (item) { return item.id === option.id; });
    }).map(function (option, index) {
      return Object.assign({}, option, {
        displayOrder: collected.length + index
      });
    });

    return collected.concat(missing);
  }

  // Lê a grade da tabela diretamente do DOM do editor sem colapsar colunas vazias.
  function parseTableChoiceOptionsAttr(value) {
    if (!value) return [];
    try {
      return normalizeTableChoiceOptions(JSON.parse(String(value)));
    } catch (_error) {
      return [];
    }
  }

  // Coleta uma célula de tabela do DOM do editor, incluindo metadados de lacuna.
  function collectTableCellDraftFromField(field, role) {
    return normalizeTableCell({
      value: field ? String(field.value || "") : "",
      bold: field ? field.getAttribute("data-table-bold") === "1" : role === "header",
      italic: field ? field.getAttribute("data-table-italic") === "1" : false,
      tone: field ? field.getAttribute("data-table-tone") || "default" : "default",
      align: field ? field.getAttribute("data-table-align") || "left" : "left",
      blank: field ? field.getAttribute("data-table-blank") === "1" : false,
      interactionMode: field ? field.getAttribute("data-table-interaction-mode") || "choice" : "choice",
      placeholder: field ? field.getAttribute("data-table-placeholder") || "" : "",
      options: field ? parseTableChoiceOptionsAttr(field.getAttribute("data-table-options")) : []
    }, role);
  }

  // Lê a grade da tabela diretamente do DOM do editor sem colapsar colunas vazias.
  function collectTableDraftFromBlockNode(blockNode) {
    if (!blockNode) return normalizeTableDraft({});

    const titleField = blockNode.querySelector("[data-table-title]");
    const headerFields = Array.from(blockNode.querySelectorAll("[data-table-header-cell]"));
    const rowNodes = Array.from(blockNode.querySelectorAll("[data-table-body-row]"));

    return normalizeTableDraft({
      kind: "table",
      title: titleField ? titleField.value : "",
      titleStyle: titleField
        ? {
            bold: titleField.getAttribute("data-table-bold") === "1",
            italic: titleField.getAttribute("data-table-italic") === "1",
            tone: titleField.getAttribute("data-table-tone") || "default",
            align: titleField.getAttribute("data-table-align") || "left"
          }
        : undefined,
      headers: headerFields.map(function (field) {
        return collectTableCellDraftFromField(field, "header");
      }),
      rows: rowNodes.map(function (rowNode) {
        return Array.from(rowNode.querySelectorAll("[data-table-cell]")).map(function (field) {
          return collectTableCellDraftFromField(field, "body");
        });
      })
    });
  }

  // Mede o texto com a mesma tipografia do campo para ajustar a coluna ao conteúdo real.
  function measureTableEditorTextWidth(field, text) {
    if (!field || typeof window === "undefined" || !window.getComputedStyle) return 0;
    const value = String(text || "");
    const style = window.getComputedStyle(field);
    const canvas = measureTableEditorTextWidth.canvas || (measureTableEditorTextWidth.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    if (!context) return 0;

    const font = style.font && style.font !== ""
      ? style.font
      : [
          style.fontStyle,
          style.fontVariant,
          style.fontWeight,
          style.fontSize + "/" + style.lineHeight,
          style.fontFamily
        ].join(" ");
    context.font = font;

    const horizontalPadding =
      (parseFloat(style.paddingLeft) || 0) +
      (parseFloat(style.paddingRight) || 0) +
      (parseFloat(style.borderLeftWidth) || 0) +
      (parseFloat(style.borderRightWidth) || 0);

    return Math.ceil(context.measureText(value || " ").width + horizontalPadding + 6);
  }

  // Recalcula as larguras das colunas da tabela direto no DOM do editor.
  function syncTableEditorColumnWidths(blockNode) {
    if (!blockNode) return;
    const widthNodes = Array.from(blockNode.querySelectorAll("[data-table-column-width]"));
    if (!widthNodes.length) return;

    widthNodes.forEach(function (node, index) {
      const headerInput = blockNode.querySelector('[data-table-header-cell][data-column-index="' + String(index) + '"]');
      const cellInputs = Array.from(blockNode.querySelectorAll('[data-table-cell][data-column-index="' + String(index) + '"]'));
      const fields = (headerInput ? [headerInput] : []).concat(cellInputs);
      let width = 44;
      let hasRealContent = false;

      fields.forEach(function (field) {
        const sampleText = String(field.value || "");
        if (sampleText.trim()) {
          hasRealContent = true;
          width = Math.max(width, measureTableEditorTextWidth(field, sampleText));
        }
      });

      if (!hasRealContent && headerInput) {
        width = Math.max(width, measureTableEditorTextWidth(headerInput, " "));
      }

      const removeButton = headerInput
        ? headerInput.parentElement && headerInput.parentElement.querySelector(".table-editor-remove-column")
        : null;
      const removeWidth = removeButton ? Math.ceil(removeButton.getBoundingClientRect().width || 22) : 0;
      const gapWidth = removeButton ? 4 : 0;
      node.style.width = String(width + removeWidth + gapWidth) + "px";
    });
  }

  // Aplica o recalculo de largura em todas as tabelas abertas no editor.
  function syncAllTableEditorColumnWidths() {
    if (!state.editor.open) return;
    Array.from(getEditorDomScope().querySelectorAll('.builder-block[data-block-kind="table"]')).forEach(syncTableEditorColumnWidths);
  }

  // Lê as alternativas configuradas no bloco de múltipla escolha a partir do DOM.
  function collectMultipleChoiceOptionsFromBlockNode(blockNode) {
    if (!blockNode) return [];
    return Array.from(blockNode.querySelectorAll("[data-choice-option-row]"))
      .map(function (row, optionIndex) {
        const inputNode = row.querySelector("[data-choice-option]");
        return {
          id: row.getAttribute("data-option-id") || uid("opt"),
          value: inputNode ? String(inputNode.value || "") : "",
          answer: row.getAttribute("data-option-answer") === "1",
          indexHint: optionIndex
        };
      })
      .sort(function (a, b) { return a.indexHint - b.indexHint; })
      .map(function (item) {
        return { id: item.id, value: item.value, answer: item.answer };
      });
  }

  // Lê os pares opção -> resultado configurados no bloco correspondente.
  function collectSimulatorOptionsFromBlockNode(blockNode) {
    if (!blockNode) return [];
    return Array.from(blockNode.querySelectorAll("[data-simulator-row]"))
      .map(function (row, optionIndex) {
        const labelNode = row.querySelector("[data-simulator-label]");
        const outputNode = row.querySelector("[data-simulator-output]");
        return {
          id: row.getAttribute("data-option-id") || uid("opt"),
          value: labelNode ? String(labelNode.value || "").trim() : "",
          result: outputNode ? String(outputNode.value || "").replace(/\r/g, "") : "",
          indexHint: optionIndex
        };
      })
      .sort(function (a, b) { return a.indexHint - b.indexHint; })
      .map(function (item) {
        return { id: item.id, value: item.value, result: item.result };
      });
  }

  // Reflete no DOM as opções do bloco Editor após sincronização/normalização.
  function syncTerminalOptionRowsFromBlockNode(blockNode, options) {
    const rows = Array.from(blockNode ? blockNode.querySelectorAll("[data-terminal-option-row]") : []);
    const byId = normalizeEditorOptions(options).reduce(function (acc, option) {
      acc[option.id] = option;
      return acc;
    }, {});
    rows.forEach(function (row, index) {
      const option = byId[row.getAttribute("data-option-id") || ""] || null;
      if (!option) return;

      const enabled = option.enabled !== false;
      row.setAttribute("data-option-id", option.id || "");
      row.setAttribute("data-option-enabled", enabled ? "1" : "0");
      row.setAttribute("data-option-display-order", String(option.displayOrder || index));

      const inputNode = row.querySelector("[data-terminal-option]");
      if (inputNode) inputNode.value = String(option.value || "");

      const toggle = row.querySelector("[data-action='terminal-toggle-option']");
      if (toggle) {
        toggle.classList.toggle("active", enabled);
        toggle.innerHTML = enabled ? "&#9679;" : "&#9675;";
        toggle.title = enabled ? "Desabilitar lacuna" : "Habilitar lacuna";
      }
    });
  }

  // Reflete no DOM as respostas esperadas do modo Digitação na mesma ordem das lacunas do preview.
  function syncTerminalInputAnswerRowsFromBlockNode(blockNode, block) {
    const listNode = blockNode ? blockNode.querySelector("[data-editor-slot-list]") : null;
    if (!listNode || !block) return;
    const html = buildEditorInputAnswerRowsHtml(block);
    if (listNode.innerHTML !== html) listNode.innerHTML = html;
  }

  // Reaplica no DOM a visualização rica do template após sincronização do bloco.
  function refreshTemplateInputFromBlock(blockNode, block, selectionState) {
    if (!blockNode || !block) return;
    const field = isEditorKind(block.kind)
      ? blockNode.querySelector("[data-terminal-template]")
      : isSimulatorKind(block.kind)
        ? blockNode.querySelector("[data-simulator-template]")
        : null;
    if (!field) return;

    const config = getTemplateBuilderOptions(block.kind);
    const html = renderAuthorTemplateHtml(block.value || "", {
      mode: config.mode,
      editable: config.editablePlaceholders,
      displayStyle: getAuthorPlaceholderDisplayStyle(block)
    });
    if (field.innerHTML !== html) field.innerHTML = html;
    if (selectionState) restoreEditableSelectionOffsets(field, selectionState);
  }

  // Sincroniza o template rico do Editor com o estado em memória sem re-renderizar tudo.
  function syncTerminalTemplateBlockFromNode(blockId, field, options) {
    const blockNode = field ? field.closest(".builder-block") : null;
    const block = getEditorBlock(blockId);
    if (!blockNode || !block || !isEditorKind(block.kind)) return;

    const config = options || {};
    const preserveSelection = config.preserveSelection !== false;
    const selectionState = preserveSelection ? getEditableSelectionOffsets(field) : null;
    const interactionMode = getEditorInteractionMode(block);
    const nextValue = serializeAuthorTemplateHtml(field);
    const nextOptions = interactionMode === "choice"
      ? collectTerminalOptionsFromBlockNode(blockNode)
      : normalizeEditorOptions(block.options);
    if (
      interactionMode === "choice" &&
      parseOptionMarkers(nextValue).length !== getEnabledOptionIndexes(nextOptions).length
    ) {
      const fallback = state.editor.terminalGuardByBlockId[blockId];
      refreshTemplateInputFromBlock(blockNode, {
        kind: "editor",
        value: typeof fallback === "string" ? fallback : String(block.value || "")
      }, selectionState);
      return;
    }

    block.kind = "editor";
    block.value = nextValue;
    block.options = nextOptions;
    normalizeTerminalEditorBlock(block);

    refreshTemplateInputFromBlock(blockNode, block, selectionState);
    if (interactionMode === "choice") {
      syncTerminalOptionRowsFromBlockNode(blockNode, block.options);
    } else {
      syncTerminalInputAnswerRowsFromBlockNode(blockNode, block);
    }
    state.editor.terminalGuardByBlockId[blockId] = block.value;
  }

  // Sincroniza a resposta esperada de uma lacuna do modo Digitação com o preview do template.
  function syncTerminalInputAnswerToTemplate(blockId, optionId, value) {
    if (!optionId) return;
    const blockNode = getEditorDomScope().querySelector('.builder-block[data-block-id="' + cssEsc(blockId) + '"]');
    const block = getEditorBlock(blockId);
    if (!blockNode || !block || !isEditorKind(block.kind)) return;

    block.kind = "editor";
    block.options = normalizeEditorOptions(block.options);
    const optionIndex = getEditorOptionIndexById(block.options, optionId);
    if (optionIndex < 0) return;
    block.options[optionIndex].value = String(value || "");
    if (block.options[optionIndex].enabled !== false) {
      const slotIndex = getEnabledOptionIndexes(block.options).indexOf(optionIndex);
      if (slotIndex > -1) {
        block.value = replaceMarkerAtIndex(String(block.value || ""), slotIndex, String(value || ""));
      }
    }

    normalizeTerminalEditorBlock(block);
    refreshTemplateInputFromBlock(blockNode, block, null);
    state.editor.terminalGuardByBlockId[blockId] = block.value;
  }

  // Atualiza uma variante aceita da lacuna sem mexer na resposta principal do preview.
  function syncTerminalInputVariant(blockId, optionId, variantIndex, value) {
    if (!optionId || !Number.isInteger(variantIndex) || variantIndex < 0) return;
    const block = getEditorBlock(blockId);
    if (!block || !isEditorKind(block.kind)) return;
    block.options = normalizeEditorOptions(block.options);
    const optionIndex = getEditorOptionIndexById(block.options, optionId);
    if (optionIndex < 0) return;
    const currentVariants = normalizeEditorInputVariantsForAuthor(block.options[optionIndex].variants);
    while (currentVariants.length <= variantIndex) {
      currentVariants.push({ id: uid("variant"), value: "", regex: false });
    }
    currentVariants[variantIndex] = Object.assign({}, currentVariants[variantIndex], {
      value: String(value || "")
    });
    block.options[optionIndex].variants = currentVariants;
  }

  // Adiciona uma nova variante aceita para a lacuna.
  function addEditorInputVariant(blockId, optionId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isEditorKind(block.kind)) return;
    block.options = normalizeEditorOptions(block.options);
    const optionIndex = getEditorOptionIndexById(block.options, optionId);
    if (optionIndex < 0) return;
    const currentVariants = normalizeEditorInputVariantsForAuthor(block.options[optionIndex].variants);
    currentVariants.push({ id: uid("variant"), value: "", regex: false });
    block.options[optionIndex].variants = currentVariants;
    renderApp();
  }

  // Remove uma variante aceita da lacuna.
  function removeEditorInputVariant(blockId, optionId, variantIndex) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isEditorKind(block.kind)) return;
    block.options = normalizeEditorOptions(block.options);
    const optionIndex = getEditorOptionIndexById(block.options, optionId);
    if (optionIndex < 0) return;
    const currentVariants = normalizeEditorInputVariantsForAuthor(block.options[optionIndex].variants);
    if (variantIndex < 0 || variantIndex >= currentVariants.length) return;
    currentVariants.splice(variantIndex, 1);
    block.options[optionIndex].variants = currentVariants;
    renderApp();
  }

  // Alterna se a resposta principal da lacuna deve ser tratada como regex.
  function toggleEditorInputPrimaryRegex(blockId, optionId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isEditorKind(block.kind)) return;
    block.options = normalizeEditorOptions(block.options);
    const optionIndex = getEditorOptionIndexById(block.options, optionId);
    if (optionIndex < 0 || block.options[optionIndex].enabled === false) return;
    block.options[optionIndex].regex = !block.options[optionIndex].regex;
    renderApp();
  }

  // Alterna se uma variante da lacuna deve ser tratada como regex.
  function toggleEditorInputVariantRegex(blockId, optionId, variantIndex) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isEditorKind(block.kind)) return;
    block.options = normalizeEditorOptions(block.options);
    const optionIndex = getEditorOptionIndexById(block.options, optionId);
    if (optionIndex < 0) return;
    const currentVariants = normalizeEditorInputVariantsForAuthor(block.options[optionIndex].variants);
    if (variantIndex < 0 || variantIndex >= currentVariants.length) return;
    currentVariants[variantIndex] = Object.assign({}, currentVariants[variantIndex], {
      regex: !currentVariants[variantIndex].regex
    });
    block.options[optionIndex].variants = currentVariants;
    renderApp();
  }

  // Sincroniza o template rico do Simulador, garantindo exatamente uma lacuna.
  function syncSimulatorTemplateBlockFromNode(blockId, field, options) {
    const blockNode = field ? field.closest(".builder-block") : null;
    const block = getEditorBlock(blockId);
    if (!blockNode || !block || !isSimulatorKind(block.kind)) return;

    const config = options || {};
    const preserveSelection = config.preserveSelection !== false;
    const selectionState = preserveSelection ? getEditableSelectionOffsets(field) : null;
    const rawValue = serializeAuthorTemplateHtml(field);
    const markerCount = parseOptionMarkers(rawValue).length;
    const fallback = state.editor.terminalGuardByBlockId[blockId] || String(block.value || "");

    block.kind = "simulator";
    block.options = collectSimulatorOptionsFromBlockNode(blockNode);
    block.value = markerCount === 1 ? rawValue : normalizeSimulatorTemplateValue(fallback);
    block.value = normalizeSimulatorTemplateValue(block.value);

    refreshTemplateInputFromBlock(blockNode, block, selectionState);
    state.editor.terminalGuardByBlockId[blockId] = block.value;
  }

  // Sincroniza o conteúdo rico do DOM para o bloco correspondente sem re-renderizar tudo.
  function syncParagraphBlockFromNode(blockId, node) {
    const block = getEditorBlock(blockId);
    if (!block || !node) return;

    block.kind = "paragraph";
    block.richText = sanitizeInlineRichText(node.innerHTML);
    block.value = inlineRichTextToPlainText(block.richText);
  }

  // Remove qualquer span de cor inline, preservando o conteúdo e outras marcações válidas.
  function stripToneMarkup(text) {
    return String(text || "")
      .replace(/<span class="inline-tone-(?:gold|mint|coral|blue|red)">/g, "")
      .replace(/<\/span>/g, "");
  }

  // Remove tons inline de um fragmento DOM antes de reaplicar outra cor ou voltar ao padrão.
  function stripToneNodes(node) {
    if (!node || !node.childNodes) return;

    Array.from(node.childNodes).forEach(function (child) {
      if (child.nodeType !== 1) return;
      stripToneNodes(child);

      const tag = String(child.tagName || "").toLowerCase();
      if (tag !== "span") return;
      const toneClass = Array.from(child.classList || []).find(function (className) {
        return INLINE_TONE_CLASSES.indexOf(className) > -1;
      });
      if (!toneClass) return;

      while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
      child.remove();
    });
  }

  // Mede o intervalo textual ocupado por um nó dentro de um contenteditable.
  function getEditableNodeOffsets(input, node) {
    if (!input || !node || !input.contains(node)) return null;

    const contentRange = document.createRange();
    const beforeRange = document.createRange();
    try {
      contentRange.selectNodeContents(node);
      beforeRange.setStart(input, 0);
      beforeRange.setEnd(contentRange.startContainer, contentRange.startOffset);
    } catch (_error) {
      return null;
    }

    const start = beforeRange.toString().length;
    const end = start + contentRange.toString().length;
    return { start: start, end: end };
  }

  // Remove spans de tom que estejam totalmente cobertos pela seleção atual.
  function unwrapToneSpansWithinSelection(input) {
    const selectionState = getEditableSelectionOffsets(input);
    if (!input || !selectionState || selectionState.start === selectionState.end) return false;

    const toneSpans = Array.from(input.querySelectorAll("span")).filter(function (span) {
      return Array.from(span.classList || []).some(function (className) {
        return INLINE_TONE_CLASSES.indexOf(className) > -1;
      });
    });

    let changed = false;
    toneSpans.forEach(function (span) {
      const offsets = getEditableNodeOffsets(input, span);
      if (!offsets) return;
      if (offsets.start < selectionState.start || offsets.end > selectionState.end) return;
      while (span.firstChild) span.parentNode.insertBefore(span.firstChild, span);
      span.remove();
      changed = true;
    });

    if (changed) {
      restoreEditableSelectionOffsets(input, selectionState);
    }
    return changed;
  }

  // Remove wrappers inline totalmente cobertos pela seleção atual.
  function unwrapInlineStyleWithinSelection(input, styleKind) {
    const selectionState = getEditableSelectionOffsets(input);
    if (!input || !selectionState || selectionState.start === selectionState.end) return false;

    const selector =
      styleKind === "bold"
        ? "strong, b"
        : styleKind === "italic"
          ? "em, i"
          : "span";
    const inlineNodes = Array.from(input.querySelectorAll(selector)).filter(function (node) {
      return inlineStyleNodeMatches(node, styleKind);
    });

    let changed = false;
    inlineNodes.forEach(function (node) {
      const offsets = getEditableNodeOffsets(input, node);
      if (!offsets) return;
      if (offsets.start < selectionState.start || offsets.end > selectionState.end) return;
      while (node.firstChild) node.parentNode.insertBefore(node.firstChild, node);
      node.remove();
      changed = true;
    });

    if (changed) {
      restoreEditableSelectionOffsets(input, selectionState);
    }
    return changed;
  }

  // Verifica se um elemento DOM representa exatamente o estilo inline solicitado.
  function inlineStyleNodeMatches(node, styleKind) {
    if (!node || node.nodeType !== 1) return false;
    const tag = String(node.tagName || "").toLowerCase();
    if (styleKind === "bold") return tag === "strong" || tag === "b";
    if (styleKind === "italic") return tag === "em" || tag === "i";
    if (styleKind.indexOf("tone-") === 0) {
      return tag === "span" && node.classList && node.classList.contains("inline-" + styleKind);
    }
    return false;
  }

  // Descobre se um nó textual está contido por uma marcação inline específica.
  function nodeHasInlineStyleAncestor(node, input, styleKind) {
    let current = node && node.nodeType === 3 ? node.parentNode : node;
    while (current && current !== input) {
      if (inlineStyleNodeMatches(current, styleKind)) return true;
      current = current.parentNode;
    }
    return false;
  }

  // Lista nós de texto realmente interceptados pela seleção atual dentro do contenteditable.
  function getIntersectingEditableTextNodes(input, range) {
    if (!input || !range) return [];
    const walker = document.createTreeWalker(input, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let current = walker.nextNode();
    while (current) {
      if (String(current.textContent || "").trim()) {
        try {
          if (range.intersectsNode(current)) nodes.push(current);
        } catch (_error) {
          // Ignora nós transitórios que possam sair do DOM durante a interação.
        }
      }
      current = walker.nextNode();
    }
    return nodes;
  }

  // Lê se a seleção atual inteira está coberta por um estilo inline específico.
  function selectionUsesInlineStyle(input, styleKind) {
    const selection = window.getSelection ? window.getSelection() : null;
    if (!input || !selection || !selection.rangeCount) return false;

    const range = selection.getRangeAt(0);
    if (!input.contains(range.startContainer) || !input.contains(range.endContainer)) return false;

    if (selection.isCollapsed) {
      return range.startContainer.nodeType === 3
        ? nodeHasInlineStyleAncestor(range.startContainer, input, styleKind)
        : false;
    }

    const textNodes = getIntersectingEditableTextNodes(input, range);
    if (textNodes.length) {
      return textNodes.every(function (node) {
        return nodeHasInlineStyleAncestor(node, input, styleKind);
      });
    }

    return nodeHasInlineStyleAncestor(range.commonAncestorContainer, input, styleKind);
  }

  // Descobre o tom inline dominante da seleção, se houver um único tom comum.
  function getSelectionInlineTone(input) {
    const toneKind = INLINE_TONE_CLASSES
      .map(function (className) { return className.replace(/^inline-/, ""); })
      .find(function (styleKind) {
        return selectionUsesInlineStyle(input, styleKind);
      });
    return toneKind || "tone-default";
  }

  // Remove wrappers inline do estilo informado preservando o texto e outras marcações.
  function unwrapInlineStyleNodes(node, styleKind) {
    if (!node || !node.childNodes) return;

    Array.from(node.childNodes).forEach(function (child) {
      if (child.nodeType !== 1) return;
      unwrapInlineStyleNodes(child, styleKind);
      if (!inlineStyleNodeMatches(child, styleKind)) return;

      while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
      child.remove();
    });
  }

  // Retorna a marcação inline correspondente ao estilo solicitado.
  function getInlineStyleMarkup(styleKind) {
    if (styleKind === "bold") {
      return {
        tagName: "strong",
        openTag: "<strong>",
        closeTag: "</strong>"
      };
    }
    if (styleKind === "italic") {
      return {
        tagName: "em",
        openTag: "<em>",
        closeTag: "</em>"
      };
    }
    if (styleKind === "tone-gold" || styleKind === "blue") {
      return {
        tagName: "span",
        className: styleKind === "blue" ? "inline-tone-blue" : "inline-tone-gold",
        openTag: '<span class="' + (styleKind === "blue" ? "inline-tone-blue" : "inline-tone-gold") + '">',
        closeTag: "</span>"
      };
    }
    if (styleKind === "tone-mint") {
      return {
        tagName: "span",
        className: "inline-tone-mint",
        openTag: '<span class="inline-tone-mint">',
        closeTag: "</span>"
      };
    }
    if (styleKind === "tone-coral" || styleKind === "red") {
      return {
        tagName: "span",
        className: styleKind === "red" ? "inline-tone-red" : "inline-tone-coral",
        openTag: '<span class="' + (styleKind === "red" ? "inline-tone-red" : "inline-tone-coral") + '">',
        closeTag: "</span>"
      };
    }
    return null;
  }

  // Envolve a seleção atual dentro de um contenteditable com uma marcação inline segura.
  function wrapEditableSelection(input, styleKind) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) return;
    if (!input.contains(selection.anchorNode) || !input.contains(selection.focusNode)) return;
    const shouldRemoveStyle =
      (styleKind === "bold" || styleKind === "italic") &&
      selectionUsesInlineStyle(input, styleKind);
    if (shouldRemoveStyle && unwrapInlineStyleWithinSelection(input, styleKind)) {
      return;
    }

    if (styleKind.indexOf("tone-") === 0) {
      const removedExistingTone = unwrapToneSpansWithinSelection(input);
      if (styleKind === "tone-default" && removedExistingTone) {
        return;
      }
    }

    const range = selection.getRangeAt(0);
    const previewFragment = range.cloneContents();
    if (previewFragment && previewFragment.querySelector && previewFragment.querySelector("[data-template-placeholder]")) {
      return;
    }
    const fragment = range.extractContents();
    const fragmentNodes = Array.from(fragment ? fragment.childNodes || [] : []);
    if (!fragment || !String(fragment.textContent || "").trim()) {
      range.insertNode(fragment || document.createTextNode(""));
      return;
    }

    let insertedNode = null;
    if (styleKind.indexOf("tone-") === 0) {
      stripToneNodes(fragment);
      if (styleKind === "tone-default") {
        range.insertNode(fragment);
        insertedNode = fragmentNodes[fragmentNodes.length - 1] || null;
      } else {
        const toneMarkup = getInlineStyleMarkup(styleKind);
        if (!toneMarkup) {
          range.insertNode(fragment);
          insertedNode = fragmentNodes[fragmentNodes.length - 1] || null;
          return;
        }
        const toneWrapper = document.createElement("span");
        toneWrapper.className = toneMarkup.className;
        toneWrapper.appendChild(fragment);
        range.insertNode(toneWrapper);
        insertedNode = toneWrapper;
      }
    } else {
      const markup = getInlineStyleMarkup(styleKind);
      if (!markup) {
        range.insertNode(fragment);
        insertedNode = fragmentNodes[fragmentNodes.length - 1] || null;
        return;
      }
      if (shouldRemoveStyle) {
        unwrapInlineStyleNodes(fragment, styleKind);
        range.insertNode(fragment);
        insertedNode = fragmentNodes[fragmentNodes.length - 1] || null;
      } else {
        const wrapper = document.createElement(markup.tagName);
        if (markup.className) wrapper.className = markup.className;
        wrapper.appendChild(fragment);
        range.insertNode(wrapper);
        insertedNode = wrapper;
      }
    }

    selection.removeAllRanges();
    if (insertedNode && insertedNode.parentNode) {
      const nextRange = document.createRange();
      nextRange.setStartAfter(insertedNode);
      nextRange.collapse(true);
      selection.addRange(nextRange);
    }
  }

  // Aplica formatação inline ao trecho selecionado de um bloco contenteditable.
  function applyEditableTextStyle(input, styleKind, syncFn, blockId) {
    if (!state.editor.open || !input || typeof syncFn !== "function" || !blockId) return;
    const selectionState = getEditableSelectionOffsets(input);
    focusFieldNoScroll(input);
    ensureEditableSelectionState(input, selectionState);
    wrapEditableSelection(input, styleKind);
    syncFn(blockId, input);
  }

  // Aplica formatação ao trecho selecionado dentro do contêiner de parágrafo.
  function toggleParagraphBlockStyle(blockId, styleKind) {
    applyEditableTextStyle(getParagraphRichInput(blockId), styleKind, syncParagraphBlockFromNode, blockId);
  }

  // Aplica indentação simples no template rico mantendo o cursor após os espaços.
  function indentTemplateSelection(input, syncFn, blockId) {
    const selection = window.getSelection ? window.getSelection() : null;
    if (!input || !selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!input.contains(range.startContainer) || !input.contains(range.endContainer)) return;

    const indentNode = document.createTextNode("  ");
    range.insertNode(indentNode);
    const nextRange = document.createRange();
    nextRange.setStartAfter(indentNode);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    syncFn(blockId, input);
  }

  // Aplica formatação inline ou indentação ao template rico do Editor.
  function toggleEditorBlockStyle(blockId, styleKind) {
    if (!state.editor.open) return;

    const input = getEditorTemplateInput(blockId);
    if (!input) return;

    if (styleKind === "indent") {
      focusFieldNoScroll(input);
      indentTemplateSelection(input, syncTerminalTemplateBlockFromNode, blockId);
      return;
    }

    applyEditableTextStyle(input, styleKind, syncTerminalTemplateBlockFromNode, blockId);
  }

  // Direciona a ação de formatação para o contêiner textual correto.
  function applyBlockTextStyle(blockId, styleKind) {
    const block = getEditorBlock(blockId);
    if (!block) return;

    if (isEditorKind(block.kind)) {
      toggleEditorBlockStyle(blockId, styleKind);
      return;
    }

    if (isSimulatorKind(block.kind)) {
      if (styleKind === "indent") {
        const input = getSimulatorTemplateInput(blockId);
        if (!input) return;
        focusFieldNoScroll(input);
        indentTemplateSelection(input, syncSimulatorTemplateBlockFromNode, blockId);
        return;
      }
      applyEditableTextStyle(getSimulatorTemplateInput(blockId), styleKind, syncSimulatorTemplateBlockFromNode, blockId);
      return;
    }

    if (styleKind === "indent") return;
    toggleParagraphBlockStyle(blockId, styleKind);
  }

  // Atualiza os botões de alinhamento do bloco ativo sem re-render completo.
  function syncBlockAlignTools(blockId) {
    const block = getEditorBlock(blockId);
    const blockNode = getEditorDomScope().querySelector('.builder-block[data-block-id="' + cssEsc(blockId) + '"]');
    if (!block || !blockNode) return;
    const align = normalizeTextBlockAlign(block.align);
    const setActive = function (selector, value) {
      const button = blockNode.querySelector(selector);
      if (button) button.classList.toggle("active", !!value);
    };
    setActive('[data-action="block-align-left"]', align === "left");
    setActive('[data-action="block-align-center"]', align === "center");
    setActive('[data-action="block-align-right"]', align === "right");
  }

  // Sincroniza negrito/itálico/cor da toolbar conforme a seleção atual do bloco ativo.
  function syncBlockTextStyleTools(blockId) {
    if (!state.editor.open || !blockId) return;
    const block = getEditorBlock(blockId);
    const blockNode = getEditorDomScope().querySelector('.builder-block[data-block-id="' + cssEsc(blockId) + '"]');
    if (!block || !blockNode) return;
    if (!(isEditorKind(block.kind) || isSimulatorKind(block.kind) || isParagraphTextKind(block.kind))) return;

    const input = isEditorKind(block.kind)
      ? blockNode.querySelector("[data-terminal-template]")
      : isSimulatorKind(block.kind)
        ? blockNode.querySelector("[data-simulator-template]")
        : blockNode.querySelector("[data-block-rich-input]");
    if (!input) return;

    const setActive = function (selector, value) {
      const button = blockNode.querySelector(selector);
      if (button) button.classList.toggle("active", !!value);
    };

    setActive('[data-action="block-style-bold"]', selectionUsesInlineStyle(input, "bold"));
    setActive('[data-action="block-style-italic"]', selectionUsesInlineStyle(input, "italic"));
    setActive('[data-action="open-tone-picker"]', getSelectionInlineTone(input) !== "tone-default");
  }

  // Define alinhamento global de bloco textual simples.
  function setBlockAlign(blockId, align) {
    const block = getEditorBlock(blockId);
    if (!block) return;
    if (!(isHeadingKind(block.kind) || isParagraphTextKind(block.kind))) return;
    block.align = normalizeTextBlockAlign(align);

    const blockNode = getEditorDomScope().querySelector('.builder-block[data-block-id="' + cssEsc(blockId) + '"]');
    if (blockNode) {
      const field = isHeadingKind(block.kind)
        ? blockNode.querySelector("[data-heading-input]")
        : blockNode.querySelector("[data-block-rich-input]");
      if (field) {
        field.classList.remove("block-align-left", "block-align-center", "block-align-right");
        field.classList.add("block-align-" + block.align);
      }
    }
    syncBlockAlignTools(blockId);
  }

  // Abre a paleta de cores simplificada para o bloco textual selecionado.
  function openTonePicker(blockId) {
    const block = getEditorBlock(blockId);
    if (!block) return;
    if (!(isEditorKind(block.kind) || isSimulatorKind(block.kind) || isParagraphTextKind(block.kind))) return;

    state.ui.tonePicker = {
      blockId: blockId,
      selection: captureBlockSelectionState(blockId)
    };
    renderApp();
  }

  // Abre a paleta de cor da célula ativa da tabela.
  function openTableTonePicker(blockId) {
    snapshotEditorFromDom();
    const block = getEditorTableBlock(blockId);
    if (!block) return;
    state.ui.tonePicker = {
      mode: "table-cell",
      blockId: blockId,
      cell: getActiveTableCellRef(blockId, block)
    };
    renderApp();
  }

  // Fecha a paleta de cores sem aplicar mudanças.
  function closeTonePicker() {
    state.ui.tonePicker = null;
    renderApp();
  }

  // Aplica a cor escolhida e fecha a paleta.
  function applyTonePicker(blockId, toneId) {
    const picker = state.ui.tonePicker;
    if (!blockId || !toneId || !picker) return;

    if (picker.mode === "table-cell") {
      state.ui.tonePicker = null;
      setActiveTableCellTone(picker.blockId, toneId);
      return;
    }

    if (picker.blockId === blockId) {
      restoreBlockSelectionState(blockId, state.ui.tonePicker.selection);
    }
    applyBlockTextStyle(blockId, toneId);
    state.ui.tonePicker = null;
    renderApp();
  }

  // Remove bloco do editor (exceto botao final).
  function removeBlock(blockId) {
    snapshotEditorFromDom();
    const current = getEditorBlock(blockId);
    if (!current || current.kind === "button") return;

    state.editor.form.blocks = ensureEditorButtonBlock((state.editor.form.blocks || []).filter(function (item) {
      return item.id !== blockId;
    }));
    renderApp();
  }

  // Move bloco para cima/baixo no editor.
  function moveBlock(blockId, direction) {
    snapshotEditorFromDom();
    const blocks = state.editor.form.blocks || [];
    const index = blocks.findIndex(function (item) { return item.id === blockId; });
    if (index === -1) return;
    if (blocks[index].kind === "button") return;

    const next = direction === "up" ? index - 1 : index + 1;
    if (next < 0 || next >= blocks.length) return;
    if (blocks[next].kind === "button") return;

    const temp = blocks[index];
    blocks[index] = blocks[next];
    blocks[next] = temp;
    state.editor.form.blocks = ensureEditorButtonBlock(blocks);
    renderApp();
  }

  // Atalho para mover bloco antes de outro bloco.
  function reorderBlock(dragId, targetId) {
    return reorderBlockRelative(dragId, targetId, "before");
  }

  // Move bloco relativo a outro bloco (antes/depois).
  function reorderBlockRelative(dragId, targetId, position) {
    if (!dragId || !targetId || dragId === targetId) return false;
    const blocks = state.editor.form.blocks || [];
    const fromIndex = blocks.findIndex(function (item) { return item.id === dragId; });
    const toIndex = blocks.findIndex(function (item) { return item.id === targetId; });
    if (fromIndex === -1 || toIndex === -1) return false;
    if (blocks[fromIndex].kind === "button") return false;

    const moved = blocks.splice(fromIndex, 1)[0];
    const targetIndex = blocks.findIndex(function (item) { return item.id === targetId; });
    if (targetIndex === -1) {
      blocks.push(moved);
      state.editor.form.blocks = ensureEditorButtonBlock(blocks);
      return true;
    }

    let insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
    const buttonIndex = blocks.findIndex(function (item) { return item.kind === "button"; });
    if (buttonIndex > -1 && insertIndex > buttonIndex) insertIndex = buttonIndex;

    blocks.splice(insertIndex, 0, moved);
    state.editor.form.blocks = ensureEditorButtonBlock(blocks);
    return true;
  }

  // Busca bloco do editor pelo ID.
  function getEditorBlock(blockId) {
    return (state.editor.form.blocks || []).find(function (block) {
      return block.id === blockId;
    });
  }

  // Busca bloco de tabela no formato de grade usado pela autoria.
  function getEditorTableBlock(blockId) {
    const block = getEditorBlock(blockId);
    if (!block || !isTableKind(block.kind)) return null;
    const draft = normalizeTableDraft(block);
    block.kind = "table";
    block.value = "";
    block.title = draft.title;
    block.titleStyle = draft.titleStyle;
    block.headers = draft.headers;
    block.rows = draft.rows;
    return block;
  }

  // Resolve um campo visual da tabela a partir da referência persistida no estado do editor.
  function getTableEditorCellField(cellRef) {
    if (!cellRef || !cellRef.blockId) return null;
    const blockNode = getEditorDomScope().querySelector('.builder-block[data-block-id="' + cssEsc(cellRef.blockId) + '"]');
    if (!blockNode) return null;
    if (cellRef.role === "title") {
      return blockNode.querySelector("[data-table-title]");
    }
    if (cellRef.role === "body") {
      return blockNode.querySelector(
        '[data-table-cell="true"][data-row-index="' +
        String(cellRef.rowIndex) +
        '"][data-column-index="' +
        String(cellRef.columnIndex) +
        '"]'
      );
    }
    return blockNode.querySelector(
      '[data-table-header-cell="true"][data-column-index="' +
      String(cellRef.columnIndex) +
      '"]'
    );
  }

  // Foca a célula da tabela depois de um rerender, preservando a continuidade da edição.
  function focusTableEditorCell(cellRef) {
    const field = getTableEditorCellField(cellRef);
    if (!field) return;
    focusFieldNoScroll(field);
    moveCaretToFieldEnd(field);
  }

  // Atualiza a referência da célula ativa na tabela.
  function setActiveTableCell(cellRef) {
    if (!cellRef || !cellRef.blockId) return;
    state.editor.activeTableCell = {
      blockId: cellRef.blockId,
      role: cellRef.role === "title" ? "title" : cellRef.role === "body" ? "body" : "header",
      rowIndex: cellRef.role === "body" ? Math.max(0, Number(cellRef.rowIndex) || 0) : -1,
      columnIndex: Math.max(0, Number(cellRef.columnIndex) || 0)
    };
    syncTableFormatTools(state.editor.activeTableCell.blockId);
    syncTableExerciseTools(state.editor.activeTableCell.blockId);
  }

  // Lê a referência de célula a partir de um campo do editor da tabela.
  function getTableCellRefFromField(field) {
    if (!field || !field.closest) return null;
    const blockNode = field.closest(".builder-block");
    if (!blockNode) return null;
    return {
      blockId: blockNode.getAttribute("data-block-id") || "",
      role:
        field.getAttribute("data-table-cell-role") === "title"
          ? "title"
          : field.getAttribute("data-table-cell-role") === "body"
            ? "body"
            : "header",
      rowIndex: Number(field.getAttribute("data-row-index")),
      columnIndex: Number(field.getAttribute("data-column-index"))
    };
  }

  // Atualiza estilos de uma célula específica da tabela no rascunho autoral.
  function updateTableCellDraft(blockId, cellRef, updater) {
    const block = getEditorTableBlock(blockId);
    if (!block || !cellRef || typeof updater !== "function") return null;
    const target =
      cellRef.role === "title"
        ? block.titleStyle
        : cellRef.role === "body"
        ? block.rows[cellRef.rowIndex] && block.rows[cellRef.rowIndex][cellRef.columnIndex]
        : block.headers[cellRef.columnIndex];
    if (!target) return null;
    updater(target);
    return target;
  }

  // Inverte um estilo booleano da célula atualmente ativa.
  function toggleActiveTableCellFlag(blockId, key) {
    snapshotEditorFromDom();
    const block = getEditorTableBlock(blockId);
    if (!block) return;
    const cellRef = getActiveTableCellRef(blockId, block);
    updateTableCellDraft(blockId, cellRef, function (cell) {
      cell[key] = !cell[key];
    });
    setActiveTableCell(cellRef);
    state.editor.pendingTableFocus = clone(cellRef);
    renderApp();
  }

  // Define o alinhamento da célula atualmente ativa.
  function setActiveTableCellAlign(blockId, align) {
    snapshotEditorFromDom();
    const block = getEditorTableBlock(blockId);
    if (!block) return;
    const cellRef = getActiveTableCellRef(blockId, block);
    updateTableCellDraft(blockId, cellRef, function (cell) {
      cell.align = normalizeTableCellAlign(align);
    });
    setActiveTableCell(cellRef);
    state.editor.pendingTableFocus = clone(cellRef);
    renderApp();
  }

  // Define a cor semântica da célula atualmente ativa.
  function setActiveTableCellTone(blockId, toneId) {
    snapshotEditorFromDom();
    const block = getEditorTableBlock(blockId);
    if (!block) return;
    const cellRef = getActiveTableCellRef(blockId, block);
    updateTableCellDraft(blockId, cellRef, function (cell) {
      cell.tone = normalizeTableCellTone(toneId);
    });
    setActiveTableCell(cellRef);
    state.editor.pendingTableFocus = clone(cellRef);
    renderApp();
  }

  // Sincroniza no DOM os metadados de lacuna da célula atualmente editada.
  function syncTableCellExerciseAttrsOnField(field, cell) {
    if (!field) return;
    const normalized = normalizeTableCell(cell, field.getAttribute("data-table-cell-role") === "header" ? "header" : "body");
    field.setAttribute("data-table-blank", normalized.blank ? "1" : "0");
    field.setAttribute("data-table-interaction-mode", normalized.interactionMode);
    field.setAttribute("data-table-placeholder", normalized.placeholder || "");
    field.setAttribute("data-table-options", JSON.stringify(normalized.options || []));
    field.classList.toggle("is-table-blank", normalized.blank);
    field.classList.toggle("is-table-blank-choice", tableCellUsesChoiceBlank(normalized));
    field.classList.toggle("is-table-blank-input", tableCellUsesInputBlank(normalized));
  }

  // Atualiza a configuração de exercício da célula ativa da tabela no editor.
  function mutateActiveTableCellExerciseConfig(blockId, updater, shouldRender) {
    const block = getEditorTableBlock(blockId);
    if (!block || typeof updater !== "function") return null;

    const cellRef = getActiveTableCellRef(blockId, block);
    if (!cellRef || cellRef.role === "title") return null;

    const updated = updateTableCellDraft(blockId, cellRef, function (cell) {
      const draft = normalizeTableCell(cell, cellRef.role === "header" ? "header" : "body");
      updater(draft);
      cell.blank = !!draft.blank;
      cell.interactionMode = normalizeTableCellInteractionMode(draft.interactionMode);
      cell.placeholder = String(draft.placeholder || "").trim();
      cell.options = normalizeTableChoiceOptions(draft.options);
    });

    syncTableCellExerciseAttrsOnField(getTableEditorCellField(cellRef), updated);
    if (shouldRender !== false) {
      setActiveTableCell(cellRef);
      state.editor.pendingTableFocus = clone(cellRef);
      renderApp();
    }
    return updated;
  }

  // Define explicitamente se a célula ativa fica expositiva ou vira lacuna.
  function setActiveTableCellBlankState(blockId, blank) {
    snapshotEditorFromDom();
    mutateActiveTableCellExerciseConfig(blockId, function (cell) {
      cell.blank = !!blank;
      if (cell.blank && normalizeTableCellInteractionMode(cell.interactionMode) === "choice" && !cell.options.length) {
        cell.options = [{ id: uid("opt"), value: String(cell.value || "") }];
      }
    });
  }

  // Define o modo de interação da lacuna ativa da tabela.
  function setActiveTableCellInteractionMode(blockId, mode) {
    snapshotEditorFromDom();
    mutateActiveTableCellExerciseConfig(blockId, function (cell) {
      cell.blank = true;
      cell.interactionMode = normalizeTableCellInteractionMode(mode);
      if (cell.interactionMode === "choice" && !cell.options.length) {
        cell.options = [{ id: uid("opt"), value: String(cell.value || "") }];
      }
    });
  }

  // Atualiza o placeholder da célula ativa sem exigir rerender imediato.
  function syncActiveTableCellPlaceholderValue(blockId, value) {
    mutateActiveTableCellExerciseConfig(blockId, function (cell) {
      cell.placeholder = String(value || "");
    }, false);
  }

  // Adiciona opção visível à célula ativa em modo escolha.
  function addActiveTableCellOption(blockId) {
    snapshotEditorFromDom();
    mutateActiveTableCellExerciseConfig(blockId, function (cell) {
      cell.blank = true;
      cell.interactionMode = "choice";
      cell.options = normalizeTableChoiceOptions(cell.options);
      cell.options.push({ id: uid("opt"), value: "" });
    });
  }

  // Remove opção da célula ativa em modo escolha.
  function removeActiveTableCellOption(blockId, optionId) {
    snapshotEditorFromDom();
    mutateActiveTableCellExerciseConfig(blockId, function (cell) {
      cell.options = normalizeTableChoiceOptions(cell.options).filter(function (option) {
        return option.id !== optionId;
      });
    });
  }

  // Atualiza o texto de uma opção da célula ativa sem rerender completo.
  function syncActiveTableCellOptionValue(blockId, optionId, value) {
    mutateActiveTableCellExerciseConfig(blockId, function (cell) {
      cell.options = normalizeTableChoiceOptions(cell.options).map(function (option) {
        return option.id === optionId
          ? { id: option.id, value: String(value || "") }
          : option;
      });
    }, false);
  }

  // Adiciona uma nova coluna vazia ao fim da grade da tabela.
  function addTableColumn(blockId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorTableBlock(blockId);
    if (!block) return;

    block.headers.push(createBlankTableCell("header"));
    block.rows = block.rows.map(function (row) {
      return row.concat(createBlankTableCell("body"));
    });
    setActiveTableCell({
      blockId: blockId,
      role: "header",
      rowIndex: -1,
      columnIndex: block.headers.length - 1
    });
    state.editor.pendingTableFocus = clone(state.editor.activeTableCell);
    renderApp();
  }

  // Remove coluna da grade da tabela, preservando pelo menos uma coluna vazia.
  function removeTableColumn(blockId, columnIndex) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorTableBlock(blockId);
    const safeIndex = Number(columnIndex);
    if (!block || !Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= block.headers.length) return;

    if (block.headers.length <= 1) {
      block.headers = [createBlankTableCell("header")];
      block.rows = block.rows.map(function () {
        return [createBlankTableCell("body")];
      });
      setActiveTableCell({
        blockId: blockId,
        role: "header",
        rowIndex: -1,
        columnIndex: 0
      });
      state.editor.pendingTableFocus = clone(state.editor.activeTableCell);
      renderApp();
      return;
    }

    block.headers.splice(safeIndex, 1);
    block.rows = block.rows.map(function (row) {
      const cells = row.slice();
      cells.splice(safeIndex, 1);
      return cells;
    });
    setActiveTableCell({
      blockId: blockId,
      role: "header",
      rowIndex: -1,
      columnIndex: Math.max(0, Math.min(safeIndex, block.headers.length - 1))
    });
    state.editor.pendingTableFocus = clone(state.editor.activeTableCell);
    renderApp();
  }

  // Adiciona nova linha vazia ao fim da grade da tabela.
  function addTableRow(blockId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorTableBlock(blockId);
    if (!block) return;

    block.rows.push(Array.from({ length: block.headers.length || 1 }, function () { return createBlankTableCell("body"); }));
    setActiveTableCell({
      blockId: blockId,
      role: "body",
      rowIndex: block.rows.length - 1,
      columnIndex: 0
    });
    state.editor.pendingTableFocus = clone(state.editor.activeTableCell);
    renderApp();
  }

  // Remove linha da grade da tabela, preservando pelo menos uma linha vazia.
  function removeTableRow(blockId, rowIndex) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorTableBlock(blockId);
    const safeIndex = Number(rowIndex);
    if (!block || !Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= block.rows.length) return;

    if (block.rows.length <= 1) {
      block.rows = [Array.from({ length: block.headers.length || 1 }, function () { return createBlankTableCell("body"); })];
      setActiveTableCell({
        blockId: blockId,
        role: "body",
        rowIndex: 0,
        columnIndex: 0
      });
      state.editor.pendingTableFocus = clone(state.editor.activeTableCell);
      renderApp();
      return;
    }

    block.rows.splice(safeIndex, 1);
    setActiveTableCell({
      blockId: blockId,
      role: "body",
      rowIndex: Math.max(0, Math.min(safeIndex, block.rows.length - 1)),
      columnIndex: 0
    });
    state.editor.pendingTableFocus = clone(state.editor.activeTableCell);
    renderApp();
  }

  // Busca nó interno de um bloco de fluxograma.
  function getFlowchartEditorNode(blockId, nodeId) {
    const block = getEditorBlock(blockId);
    if (!block || !isFlowchartKind(block.kind)) return null;
    normalizeFlowchartEditorBlock(block);
    return (block.nodes || []).find(function (node) {
      return node.id === nodeId;
    }) || null;
  }

  // Adiciona novo bloco interno ao fluxograma.
  function addFlowchartNode(blockId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isFlowchartKind(block.kind)) return;

    normalizeFlowchartEditorBlock(block);
    block.nodes.push(createFlowchartNode(getNextFlowchartRow(block.nodes), "center", "process", "Novo bloco"));
    renderApp();
  }

  // Remove bloco interno do fluxograma e suas setas associadas.
  function removeFlowchartNode(blockId, nodeId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isFlowchartKind(block.kind)) return;

    block.nodes = (block.nodes || []).filter(function (node) {
      return node.id !== nodeId;
    });
    block.links = (block.links || []).filter(function (link) {
      return link.fromNodeId !== nodeId && link.toNodeId !== nodeId;
    });
    normalizeFlowchartEditorBlock(block);
    renderApp();
  }

  // Move bloco interno do fluxograma para cima ou para baixo na lista do editor.
  function moveFlowchartNode(blockId, nodeId, direction) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isFlowchartKind(block.kind)) return;

    const nodes = Array.isArray(block.nodes) ? block.nodes.slice() : [];
    const index = nodes.findIndex(function (node) {
      return node.id === nodeId;
    });
    if (index < 0) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= nodes.length) return;

    const moved = nodes[index];
    nodes[index] = nodes[targetIndex];
    nodes[targetIndex] = moved;
    block.nodes = nodes;
    normalizeFlowchartEditorBlock(block);
    renderApp();
  }

  // Marca uma opção de símbolo como resposta correta do nó.
  function selectFlowchartNodeShapeAnswer(blockId, nodeId, answerIndex) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const node = getFlowchartEditorNode(blockId, nodeId);
    if (!node) return;

    const merged = mergeFlowchartNodeShapeOptions(node);
    const safeIndex = Number(answerIndex);
    if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= merged.length) return;

    node.shape = normalizeFlowchartShapeKey(merged[safeIndex]);
    node.shapeOptions = merged.filter(function (shape, index) {
      return index !== safeIndex && shape !== node.shape;
    });
    renderApp();
  }

  // Marca uma opção de texto como resposta correta do nó.
  function selectFlowchartNodeTextAnswer(blockId, nodeId, answerIndex) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const node = getFlowchartEditorNode(blockId, nodeId);
    if (!node) return;

    const merged = mergeFlowchartNodeTextOptions(node);
    const safeIndex = Number(answerIndex);
    if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= merged.length) return;

    node.text = String(merged[safeIndex] || "").trim();
    node.textOptions = merged
      .filter(function (value, index) {
        return index !== safeIndex && String(value || "").trim() && String(value || "").trim() !== node.text;
      })
      .map(function (value) {
        return {
          id: uid("opt"),
          value: String(value || "").trim(),
          enabled: true
        };
      });
    renderApp();
  }

  // Adiciona nova opção extra de símbolo ao nó.
  function addFlowchartNodeShapeOption(blockId, nodeId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const node = getFlowchartEditorNode(blockId, nodeId);
    if (!node) return;

    node.shapeOptions = normalizeFlowchartNodeShapeOptions(node.shapeOptions, node.shape);
    const nextShape = FLOWCHART_SHAPES.find(function (item) {
      return item.key !== node.shape && node.shapeOptions.indexOf(item.key) === -1;
    });
    if (!nextShape) return;
    node.shapeOptions.push(nextShape.key);
    renderApp();
  }

  // Remove opção extra de símbolo do nó.
  function removeFlowchartNodeShapeOption(blockId, nodeId, index) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const node = getFlowchartEditorNode(blockId, nodeId);
    if (!node) return;

    node.shapeOptions = normalizeFlowchartNodeShapeOptions(node.shapeOptions, node.shape);
    if (!Number.isInteger(index) || index < 0 || index >= node.shapeOptions.length) return;
    node.shapeOptions.splice(index, 1);
    renderApp();
  }

  // Adiciona nova opção extra de texto ao nó.
  function addFlowchartNodeTextOption(blockId, nodeId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const node = getFlowchartEditorNode(blockId, nodeId);
    if (!node) return;

    node.textOptions = normalizeFlowchartNodeTextOptions(node.textOptions, node.text);
    node.textOptions.push({ id: uid("opt"), value: "", enabled: true });
    renderApp();
  }

  // Remove opção extra de texto do nó.
  function removeFlowchartNodeTextOption(blockId, nodeId, index) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const node = getFlowchartEditorNode(blockId, nodeId);
    if (!node) return;

    node.textOptions = normalizeFlowchartNodeTextOptions(node.textOptions, node.text);
    if (!Number.isInteger(index) || index < 0 || index >= node.textOptions.length) return;
    node.textOptions.splice(index, 1);
    renderApp();
  }

  // Calcula a posição estrutural para inserir uma nova lacuna no Editor.
  function getEditorEnabledInsertIndex(options, markerPosition) {
    const enabledIndexes = getEnabledOptionIndexes(options);
    if (!enabledIndexes.length) return 0;
    if (markerPosition <= 0) return 0;
    if (markerPosition >= enabledIndexes.length) return enabledIndexes.length;
    return markerPosition;
  }

  // Cria nó DOM temporário do placeholder do template rico.
  function createAuthorPlaceholderNode(value, options) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = renderAuthorPlaceholderChip(value, options);
    return wrapper.firstElementChild;
  }

  // Insere um nó de placeholder na seleção atual do template rico.
  function insertNodeAtTemplateSelection(field, node) {
    if (!field || !node) return null;
    const selection = window.getSelection ? window.getSelection() : null;
    if (!selection || !selection.rangeCount) {
      field.appendChild(node);
      return node;
    }

    const range = selection.getRangeAt(0);
    if (!field.contains(range.startContainer) || !field.contains(range.endContainer)) {
      field.appendChild(node);
      return node;
    }

    range.deleteContents();
    range.insertNode(node);
    const nextRange = document.createRange();
    nextRange.setStartAfter(node);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    return node;
  }

  // Adiciona opção/lacuna no bloco terminal do editor.
  function addTerminalOption(blockId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();
    const block = getEditorBlock(blockId);
    const textField = getEditorTemplateInput(blockId);
    if (!block || !isEditorKind(block.kind) || !textField) return;

    block.kind = "editor";
    block.options = normalizeEditorOptions(block.options);
    const placeholderNode = createAuthorPlaceholderNode("", { mode: "editor", editable: false });
    insertNodeAtTemplateSelection(textField, placeholderNode);
    const markerPosition = Array.from(textField.querySelectorAll("[data-template-placeholder]")).indexOf(placeholderNode);
    const newOption = {
      id: uid("opt"),
      value: "",
      enabled: true,
      displayOrder: sortEditorOptionsForDisplay(block.options).length,
      slotOrder: 0,
      regex: false,
      variants: []
    };
    const insertIndex = getEditorEnabledInsertIndex(
      block.options,
      markerPosition === -1 ? getEnabledOptionIndexes(block.options).length : markerPosition
    );
    block.options = normalizeEditorOptions(block.options).map(function (option) {
      if (option.enabled !== false && Number(option.slotOrder) >= insertIndex) {
        return Object.assign({}, option, { slotOrder: Number(option.slotOrder) + 1 });
      }
      return option;
    });
    newOption.slotOrder = insertIndex;
    block.options.push(newOption);
    block.value = serializeAuthorTemplateHtml(textField);
    normalizeTerminalEditorBlock(block);
    setActiveEditorBlock(block.id);
    state.editor.pendingScrollBlockId = block.id;
    renderApp();
  }

  // Remove opção/lacuna do bloco terminal do editor.
  function removeTerminalOption(blockId, optionId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isEditorKind(block.kind)) return;

    block.kind = "editor";
    block.options = normalizeEditorOptions(block.options);
    const index = getEditorOptionIndexById(block.options, optionId);
    if (index < 0) return;

    const enabledIndexes = getEnabledOptionIndexes(block.options);
    const markerIndex = enabledIndexes.indexOf(index);
    block.options.splice(index, 1);
    if (markerIndex > -1) {
      block.value = removeMarkerAtIndex(String(block.value || ""), markerIndex);
    }
    normalizeTerminalEditorBlock(block);
    renderApp();
  }

  // Habilita/desabilita uma opção para virar lacuna [[...]] no texto do Editor.
  function toggleTerminalOption(blockId, optionId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isEditorKind(block.kind)) return;

    block.kind = "editor";
    block.options = normalizeEditorOptions(block.options);
    const index = getEditorOptionIndexById(block.options, optionId);
    if (index < 0) return;

    const option = block.options[index];
    const enabledIndexes = getEnabledOptionIndexes(block.options);
    const markerIndex = enabledIndexes.indexOf(index);

    if (option.enabled === false) {
      option.enabled = true;
      const enabledAfter = getEnabledOptionIndexes(block.options);
      const markerInsertIndex = enabledAfter.indexOf(index);
      block.value = insertMarkerAtIndex(String(block.value || ""), markerInsertIndex, String(option.value || ""));
    } else {
      option.enabled = false;
      if (markerIndex > -1) block.value = removeMarkerAtIndex(String(block.value || ""), markerIndex);
    }

    normalizeTerminalEditorBlock(block);
    renderApp();
  }

  // Reordena apenas a ordem visível das opções do Editor, sem alterar as lacunas no texto.
  function reorderTerminalOptionDisplay(blockId, draggedOptionId, targetOptionId, position) {
    if (!blockId || !draggedOptionId || !targetOptionId || draggedOptionId === targetOptionId) return false;
    const block = getEditorBlock(blockId);
    if (!block || !isEditorKind(block.kind)) return false;

    block.options = normalizeEditorOptions(block.options);
    const ordered = sortEditorOptionsForDisplay(block.options);
    const fromIndex = ordered.findIndex(function (option) { return option.id === draggedOptionId; });
    const targetIndex = ordered.findIndex(function (option) { return option.id === targetOptionId; });
    if (fromIndex < 0 || targetIndex < 0) return false;

    const moved = ordered.splice(fromIndex, 1)[0];
    const safeTargetIndex = ordered.findIndex(function (option) { return option.id === targetOptionId; });
    const insertIndex = position === "after" ? safeTargetIndex + 1 : safeTargetIndex;
    ordered.splice(insertIndex, 0, moved);

    const orderMap = ordered.reduce(function (acc, option, index) {
      acc[option.id] = index;
      return acc;
    }, {});

    block.options = ordered.map(function (option, index) {
      const current = normalizeEditorOptions(block.options).find(function (item) {
        return item.id === option.id;
      }) || option;
      return {
        id: current.id || uid("opt"),
        value: String(current.value || ""),
        enabled: current.enabled !== false,
        displayOrder: Object.prototype.hasOwnProperty.call(orderMap, current.id) ? orderMap[current.id] : index,
        slotOrder: Number.isFinite(Number(current.slotOrder)) ? Number(current.slotOrder) : index,
        regex: !!current.regex,
        variants: normalizeEditorInputVariantsForAuthor(current.variants)
      };
    });
    normalizeTerminalEditorBlock(block);
    return true;
  }

  // Adiciona alternativa no bloco de múltipla escolha.
  function addMultipleChoiceOption(blockId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isMultipleChoiceKind(block.kind)) return;

    block.options = normalizeMultipleChoiceOptions(block.options);
    block.options.push({ id: uid("opt"), value: "", answer: block.options.length === 0 });
    renderApp();
  }

  // Marca ou desmarca uma alternativa como resposta no bloco de múltipla escolha.
  function toggleMultipleChoiceOptionAnswer(blockId, optionId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isMultipleChoiceKind(block.kind)) return;

    block.options = normalizeMultipleChoiceOptions(block.options);
    const index = block.options.findIndex(function (option) { return option.id === optionId; });
    if (index < 0) return;
    block.options[index].answer = !block.options[index].answer;
    renderApp();
  }

  // Define se as respostas do bloco devem ser tratadas como corretas ou incorretas.
  function setMultipleChoiceAnswerState(blockId, answerState) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isMultipleChoiceKind(block.kind)) return;

    block.answerState = normalizeMultipleChoiceAnswerState(answerState);
    renderApp();
  }

  // Remove alternativa do bloco de múltipla escolha.
  function removeMultipleChoiceOption(blockId, optionId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isMultipleChoiceKind(block.kind)) return;

    block.options = normalizeMultipleChoiceOptions(block.options);
    const index = block.options.findIndex(function (option) { return option.id === optionId; });
    if (index < 0) return;
    block.options.splice(index, 1);
    renderApp();
  }

  // Adiciona opção no bloco de opções com resultado.
  function addSimulatorOption(blockId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isSimulatorKind(block.kind)) return;

    block.options = normalizeSimulatorOptions(block.options);
    block.options.push({ id: uid("opt"), value: "", result: "" });
    renderApp();
  }

  // Remove opção do bloco de opções com resultado.
  function removeSimulatorOption(blockId, optionId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isSimulatorKind(block.kind)) return;

    block.options = normalizeSimulatorOptions(block.options);
    const index = block.options.findIndex(function (option) { return option.id === optionId; });
    if (index < 0) return;
    block.options.splice(index, 1);
    renderApp();
  }

  // Captura valores atuais do DOM do editor para o estado em memoria.
  function snapshotEditorFromDom() {
    if (!state.editor.open || !state.editor.form) return;

    const domScope = getEditorDomScope();
    const nodeList = domScope.querySelectorAll(".builder-block");
    const nextBlocks = [];
    nodeList.forEach(function (node) {
      const blockId = node.getAttribute("data-block-id");
      const kind = node.getAttribute("data-block-kind");
      const input = node.querySelector("[data-block-input]");
      const templateRichInput = node.querySelector("[data-template-rich-input]");
      const richInput = node.querySelector("[data-block-rich-input]:not([data-template-rich-input])");
      const next = {
        id: blockId || uid("block"),
        kind: kind || "paragraph",
        value: templateRichInput
          ? serializeAuthorTemplateHtml(templateRichInput)
          : richInput
          ? inlineRichTextToPlainText(richInput.innerHTML)
          : input && typeof input.value === "string"
            ? input.value
            : ""
      };
      const currentBlock = getEditorBlock(next.id);

      if (richInput) {
        next.kind = "paragraph";
        next.richText = sanitizeInlineRichText(richInput.innerHTML);
        next.value = inlineRichTextToPlainText(next.richText);
        next.align = normalizeTextBlockAlign(currentBlock && currentBlock.align);
      }

      if (isEditorKind(next.kind)) {
        next.kind = "editor";
        const domOptions = collectTerminalOptionsFromBlockNode(node);
        next.options = domOptions.length
          ? domOptions
          : currentBlock && Array.isArray(currentBlock.options)
            ? normalizeEditorOptions(currentBlock.options)
            : [];
        next.interactionMode = normalizeEditorInteractionMode(
          (node.querySelector("[data-editor-interaction]:checked") || {}).value ||
          (currentBlock && currentBlock.interactionMode)
        );
        normalizeTerminalEditorBlock(next);
        state.editor.terminalGuardByBlockId[next.id] = next.value;
      }

      if (isFlowchartKind(next.kind)) {
        next.kind = "flowchart";
        next.value = "";
        const nodeCards = Array.from(node.querySelectorAll("[data-flowchart-node-card]"));
        const linkAccumulator = [];

        next.nodes = nodeCards
          .map(function (card, nodeIndex) {
            const cardNodeId = card.getAttribute("data-flowchart-node-id") || uid("flow-node");
            const currentShape = normalizeFlowchartShapeKey((card.querySelector("[data-flowchart-node-shape]") || {}).value);
            const outputRows = Array.from(card.querySelectorAll("[data-flowchart-node-output-row]"));

            outputRows.forEach(function (rowNode) {
              const slot = Number(rowNode.getAttribute("data-output-slot"));
              const selectNode = rowNode.querySelector("[data-flowchart-node-output]");
              const labelNode = rowNode.querySelector("[data-flowchart-node-output-label]");
              const targetId = String(selectNode ? selectNode.value || "" : "").trim();
              const label = String(labelNode ? labelNode.value || "" : "").trim();
              if (!targetId) return;

              linkAccumulator.push({
                id: uid("flow-link"),
                fromNodeId: cardNodeId,
                toNodeId: targetId,
                outputSlot: slot === 1 ? 1 : 0,
                label: label || getFlowchartEditorOutputLabel({ shape: currentShape }, slot)
              });
            });

            return normalizeFlowchartNode({
              id: cardNodeId,
              row: nodeIndex,
              column: "center",
              shape: currentShape,
              text: (card.querySelector("[data-flowchart-node-text]") || {}).value,
              shapeBlank: !!card.querySelector("[data-flowchart-node-shape-option-row]"),
              textBlank: !!card.querySelector("[data-flowchart-node-text-option-row]"),
              shapeOptions: Array.from(card.querySelectorAll("[data-flowchart-node-shape-option-row]"))
                .map(function (row) {
                  const selectNode = row.querySelector("[data-flowchart-node-shape-option]");
                  return String(selectNode ? selectNode.value || "" : "").trim();
                })
                .filter(Boolean),
              textOptions: Array.from(card.querySelectorAll("[data-flowchart-node-text-option-row]"))
                .map(function (row) {
                  const inputNode = row.querySelector("[data-flowchart-node-text-option]");
                  return {
                    id: row.getAttribute("data-option-id") || uid("opt"),
                    value: inputNode ? String(inputNode.value || "").trim() : "",
                    enabled: true
                  };
                })
            }, nodeIndex);
          });
        next.links = linkAccumulator.filter(function (link, linkIndex, source) {
          if (!link.fromNodeId || !link.toNodeId || link.fromNodeId === link.toNodeId) return false;
          const key = link.fromNodeId + "::" + String(link.outputSlot);
          return source.findIndex(function (item) {
            return item.fromNodeId + "::" + String(item.outputSlot) === key;
          }) === linkIndex;
        });
        next.shapeOptions = [];
        next.textOptions = [];
        normalizeFlowchartEditorBlock(next);
      }

      if (isTableKind(next.kind)) {
        const draftTable = collectTableDraftFromBlockNode(node);
        next.kind = "table";
        next.value = "";
        next.title = draftTable.title;
        next.titleStyle = draftTable.titleStyle;
        next.headers = draftTable.headers;
        next.rows = draftTable.rows;
      }

      if (isMultipleChoiceKind(next.kind)) {
        next.kind = "multiple_choice";
        next.value = "";
        const answerStateNode = node.querySelector("[data-choice-answer-state]:checked");
        next.answerState = normalizeMultipleChoiceAnswerState(answerStateNode ? answerStateNode.value : "");
        next.options = collectMultipleChoiceOptionsFromBlockNode(node);
      }

      if (isSimulatorKind(next.kind)) {
        next.kind = "simulator";
        next.value = normalizeSimulatorTemplateValue(serializeAuthorTemplateHtml(templateRichInput));
        next.options = collectSimulatorOptionsFromBlockNode(node);
        state.editor.terminalGuardByBlockId[next.id] = next.value;
      }

      if (next.kind === "button") {
        const popupToggle = node.querySelector("[data-button-popup]");
        delete next.value;
        next.popupEnabled = popupToggle ? popupToggle.checked : false;
        next.popupBlocks = normalizePopupBlocks(currentBlock && currentBlock.popupBlocks);
      }

      if (isParagraphTextKind(next.kind)) {
        normalizeParagraphEditorBlock(next);
      }

      if (isHeadingKind(next.kind)) {
        next.align = normalizeTextBlockAlign(currentBlock && currentBlock.align);
      }

      nextBlocks.push(next);
    });
    state.editor.form.blocks = ensureEditorButtonBlock(nextBlocks);
  }

  // Reseta o estado auxiliar usado quando o editor do popup está aberto.
  function resetPopupBuilderState() {
    state.editor.popupBuilder = {
      open: false,
      ownerBlockId: null,
      mainForm: null,
      saving: false,
      pendingPromise: null
    };
  }

  // Prepara um mini formulário de card para editar o conteúdo do popup com o mesmo motor do editor principal.
  function buildPopupEditorForm(blocks) {
    return {
      stepType: "content",
      blocks: ensureEditorButtonBlock(normalizePopupBlocks(blocks).map(clone))
    };
  }

  // Extrai somente os contêineres reais do popup, descartando o botão interno temporário.
  function extractPopupContentBlocks(form) {
    const blocks = Array.isArray(form && form.blocks) ? form.blocks : [];
    return normalizePopupBlocks(blocks.filter(function (block) {
      return block && block.kind !== "button";
    }));
  }

  // Abre o editor dedicado de conteúdo do popup do botão.
  function openPopupBuilder(buttonBlockId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const buttonBlock = getEditorBlock(buttonBlockId);
    if (!buttonBlock || buttonBlock.kind !== "button" || !buttonBlock.popupEnabled) return;

    const popupBlocks = getButtonPopupBuilderSeedBlocks(buttonBlock);

    state.editor.popupBuilder = {
      open: true,
      ownerBlockId: buttonBlockId,
      mainForm: state.editor.form,
      saving: false,
      pendingPromise: null
    };
    state.editor.form = buildPopupEditorForm(popupBlocks);
    state.editor.imageTarget = null;
    state.ui.tonePicker = null;
    renderApp();
  }

  // Fecha o editor de popup sem salvar mudanças.
  function closePopupBuilder() {
    if (state.editor.popupBuilder && state.editor.popupBuilder.open && state.editor.popupBuilder.mainForm) {
      state.editor.form = state.editor.popupBuilder.mainForm;
    }
    resetPopupBuilderState();
    state.editor.imageTarget = null;
    state.ui.tonePicker = null;
    renderApp();
  }

  // Salva o rascunho do popup de volta no botão dono sem persistir o card final.
  async function savePopupBuilder() {
    if (!(state.editor.popupBuilder && state.editor.popupBuilder.open)) return;
    if (state.editor.popupBuilder.pendingPromise) {
      await state.editor.popupBuilder.pendingPromise;
      return;
    }

    const popupState = state.editor.popupBuilder;
    popupState.saving = true;
    popupState.pendingPromise = (async function () {
      snapshotEditorFromDom();

      const mainForm = popupState.mainForm;
      if (!mainForm || !Array.isArray(mainForm.blocks)) {
        closePopupBuilder();
        return;
      }

      const buttonBlock = (mainForm.blocks || []).find(function (block) {
        return block.id === popupState.ownerBlockId && isButtonKind(block.kind);
      });
      if (!buttonBlock) {
        closePopupBuilder();
        return;
      }

      buttonBlock.popupBlocks = extractPopupContentBlocks(state.editor.form);
      state.editor.form = mainForm;
      resetPopupBuilderState();
      state.editor.imageTarget = null;
      state.ui.tonePicker = null;
      renderApp();
    })();

    try {
      await popupState.pendingPromise;
    } finally {
      if (state.editor.popupBuilder === popupState) {
        popupState.saving = false;
        popupState.pendingPromise = null;
      }
    }
  }

  // Converte caminhos/links de imagem em assets internos no formato assets/images/arquivo.ext.
  async function materializeFormAssets(form) {
    if (!form || !Array.isArray(form.blocks)) return true;

    for (let i = 0; i < form.blocks.length; i += 1) {
      const block = form.blocks[i];
      if (!block || block.kind !== "image") continue;

      const rawValue = String(block.value || "").trim();
      if (!rawValue) continue;

      const result = await materializeImageValue(rawValue);
      if (!result.ok) {
        window.alert(result.message || "Não foi possível salvar a imagem.");
        return false;
      }
      block.value = result.path;
    }

    for (let i = 0; i < form.blocks.length; i += 1) {
      const block = form.blocks[i];
      if (!block || block.kind !== "button" || !Array.isArray(block.popupBlocks)) continue;
      if (!(await materializePopupBlocksAssets(block.popupBlocks))) return false;
    }

    return true;
  }

  // Materializa imagens usadas dentro do conteúdo do popup.
  async function materializePopupBlocksAssets(blocks) {
    if (!Array.isArray(blocks)) return true;

    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i];
      if (!block || block.kind !== "image") continue;

      const result = await materializeImageValue(String(block.value || "").trim());
      if (!result.ok) {
        window.alert(result.message || "Não foi possível salvar a imagem do popup.");
        return false;
      }
      block.value = result.path;
    }

    return true;
  }

  // Materializa um valor de imagem para asset interno (copia para pacote lógico assets/images).
  async function materializeImageValue(value) {
    const input = String(value || "").trim();
    if (!input) return { ok: true, path: "" };

    if (/^assets\/images\//i.test(input)) {
      return { ok: true, path: input };
    }

    if (state.assets[input]) {
      return { ok: true, path: input };
    }

    if (/^data:image\//i.test(input)) {
      return { ok: true, path: registerAssetDataUrl(input) };
    }

    // Link web ou caminho local digitado manualmente: tentamos buscar e copiar.
    let source = input;
    if (/^[a-zA-Z]:\\/.test(source)) {
      source = "file:///" + source.replace(/\\/g, "/");
    }
    if (!/^(https?:\/\/|file:\/\/\/|\/|\.\/|\.\.\/)/i.test(source)) {
      // Se parece domínio web sem protocolo, assume HTTPS.
      if (/^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(source)) {
        source = "https://" + source;
      } else {
        // Caso contrário, trata como caminho relativo local.
        source = "./" + source.replace(/^\.?\//, "");
      }
    }

    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error("HTTP " + String(response.status));
      const blob = await response.blob();
      if (!String(blob.type || "").toLowerCase().startsWith("image/")) {
        return { ok: false, message: "O recurso informado não é uma imagem válida." };
      }
      const dataUrl = await blobToDataUrl(blob);
      const preferredExt = inferExtensionFromPath(input) || mimeToExtension(blob.type);
      return { ok: true, path: registerAssetDataUrl(dataUrl, preferredExt) };
    } catch (_error) {
      return {
        ok: false,
        message: "Não foi possível copiar essa imagem. Use upload local ou link público com CORS."
      };
    }
  }

  // Registra data URL de imagem no dicionário de assets e retorna o caminho lógico.
  function registerAssetDataUrl(dataUrl, preferredExt) {
    const existing = Object.keys(state.assets).find(function (path) {
      return state.assets[path] === dataUrl;
    });
    if (existing) return existing;

    const ext = cleanAssetExtension(preferredExt || mimeToExtension(dataUrlMimeType(dataUrl)) || "png");
    const path =
      "assets/images/img-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 8) +
      "." +
      ext;
    state.assets[path] = dataUrl;
    return path;
  }

  // Salva alteracoes do editor no step atual da licao.
  async function saveEditor() {
    if (!state.editor.open) return;
    if (state.editor.popupBuilder && state.editor.popupBuilder.pendingPromise) {
      await state.editor.popupBuilder.pendingPromise;
    }
    if (state.editor.popupBuilder && state.editor.popupBuilder.open) return;

    const lessonEntry = getCurrentLessonEntry();
    if (!lessonEntry) return;

    const steps = lessonEntry.lesson.steps;
    const anchor = state.editor.anchorIndex;

    if (state.editor.mode === "edit") {
      snapshotEditorDraft();

      const builtByStepId = {};
      for (let i = 0; i < steps.length; i += 1) {
        const targetStep = steps[i];
        const draft = state.editor.draftByStepId[targetStep.id];
        if (!draft) continue;

        const assetOk = await materializeFormAssets(draft);
        if (!assetOk) {
          window.alert("Não foi possível salvar imagens do card " + String(i + 1) + ".");
          return;
        }

        const built = buildStepFromEditor(draft, targetStep.id);
        if (!built) {
          window.alert("Não foi possível salvar o card " + String(i + 1) + ". Revise os campos.");
          return;
        }
        builtByStepId[targetStep.id] = built;
      }

      for (let i = 0; i < steps.length; i += 1) {
        const currentStep = steps[i];
        if (builtByStepId[currentStep.id]) steps[i] = builtByStepId[currentStep.id];
      }

      state.currentStepIndex = getEditorStepIndex(lessonEntry);
    } else if (state.editor.mode === "insert_before") {
      snapshotEditorFromDom();
      if (!(await materializeFormAssets(state.editor.form))) return;
      const beforeStep = buildStepFromEditor(state.editor.form, state.editor.keepStepId);
      if (!beforeStep) return;
      steps.splice(anchor, 0, beforeStep);
      state.currentStepIndex = anchor + 1;
    } else {
      snapshotEditorFromDom();
      if (!(await materializeFormAssets(state.editor.form))) return;
      const afterStep = buildStepFromEditor(state.editor.form, state.editor.keepStepId);
      if (!afterStep) return;
      steps.splice(anchor + 1, 0, afterStep);
      state.currentStepIndex = anchor;
    }

    reconcileLessonProgress(lessonEntry);
    resetTransient();
    closeEditor(false);
    renderApp();
    // Salvar um card precisa refletir imediatamente no snapshot persistido.
    persistProjectSnapshot();
  }

  // Salva edicao atual e abre card anterior/proximo no editor.
  function moveEditorCardFocus(offset) {
    if (!(state.editor.open && state.editor.mode === "edit")) return;
    const lessonEntry = getCurrentLessonEntry();
    if (!lessonEntry) return;

    const currentIndex = getEditorStepIndex(lessonEntry);
    const targetIndex = currentIndex + offset;
    switchEditorStepByIndex(targetIndex);
  }

  // Exclui card atual da licao com ajuste de progresso.
  function deleteCurrentStep() {
    const lessonEntry = getCurrentLessonEntry();
    if (!lessonEntry || !getCurrentStep()) return;
    if (!window.confirm("Excluir este card da lição?")) return;

    const removedStep = lessonEntry.lesson.steps[state.currentStepIndex];
    const removedIndex = state.currentStepIndex;
    lessonEntry.lesson.steps.splice(state.currentStepIndex, 1);
    if (!lessonEntry.lesson.steps.length) lessonEntry.lesson.steps.push(defaultCompleteStep());
    state.currentStepIndex = clamp(removedIndex - 1, 0, lessonEntry.lesson.steps.length - 1);

    reconcileLessonProgress(lessonEntry, removedStep ? removedStep.id : null);
    saveLessonProgress(lessonEntry, state.currentStepIndex);
    resetTransient();
    closeEditor(false);
    renderApp();
  }

  // ============================================================================
  // Ações de Contexto (Menu ...)
  // ============================================================================
  // Executa acao de editar conforme contexto (curso/modulo/licao).
  function contextActionEdit() {
    const context = state.ui.contextMenu;
    if (!context) return;
    state.ui.contextMenu = null;
    renderApp();

    if (context.kind === "course") {
      editCourse(context.courseId);
    } else if (context.kind === "module") {
      editModule(context.moduleId);
    } else {
      editLesson(context.moduleId, context.lessonId);
    }
  }

  // Executa acao de excluir conforme contexto (curso/modulo/licao).
  function contextActionDelete() {
    const context = state.ui.contextMenu;
    if (!context) return;
    state.ui.contextMenu = null;
    renderApp();

    if (context.kind === "course") {
      deleteCourse(context.courseId);
    } else if (context.kind === "module") {
      deleteModule(context.moduleId);
    } else {
      deleteLesson(context.moduleId, context.lessonId);
    }
  }

  // Executa reset de progresso conforme contexto (curso/modulo/licao).
  function contextActionReset() {
    const context = state.ui.contextMenu;
    if (!context) return;
    state.ui.contextMenu = null;
    renderApp();

    if (context.kind === "course") {
      resetCourseProgress(context.courseId);
      return;
    }
    if (context.kind === "module") {
      resetModuleProgress(state.currentCourseId, context.moduleId);
      return;
    }
    resetLessonProgress(state.currentCourseId, context.moduleId, context.lessonId);
  }

  // Move licao para cima ou para baixo no modulo.
  function contextActionMove(direction) {
    const context = state.ui.contextMenu;
    if (!context || context.kind !== "lesson") return;
    state.ui.contextMenu = null;

    moveLessonInModule(context.moduleId, context.lessonId, direction);
    renderApp();
  }

  // Move modulo para cima ou para baixo dentro do curso.
  function contextActionMoveModule(direction) {
    const context = state.ui.contextMenu;
    if (!context || context.kind !== "module") return;
    state.ui.contextMenu = null;

    moveModuleInCourse(context.moduleId, direction);
    renderApp();
  }

  // Cria nova licao a partir do menu contextual do modulo.
  function contextActionCreateLesson() {
    const context = state.ui.contextMenu;
    if (!context || context.kind !== "module") return;
    state.ui.contextMenu = null;
    renderApp();
    createLesson(context.moduleId);
  }

  // Reordena licao dentro do array de licoes do modulo.
  function moveLessonInModule(moduleId, lessonId, direction) {
    const moduleEntry = findModule(state.currentCourseId, moduleId);
    if (!moduleEntry) return false;

    const lessons = moduleEntry.module.lessons;
    const index = lessons.findIndex(function (lesson) { return lesson.id === lessonId; });
    if (index === -1) return false;

    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= lessons.length) return false;

    const temp = lessons[index];
    lessons[index] = lessons[target];
    lessons[target] = temp;
    return true;
  }

  // Reordena modulo dentro do array de modulos do curso atual.
  function moveModuleInCourse(moduleId, direction) {
    const course = getCurrentCourse();
    if (!course) return false;

    const modules = course.modules;
    const index = modules.findIndex(function (item) { return item.id === moduleId; });
    if (index === -1) return false;

    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= modules.length) return false;

    const temp = modules[index];
    modules[index] = modules[target];
    modules[target] = temp;
    return true;
  }

  // Abre/fecha menu lateral.
  function toggleSideMenu() {
    closeStepCommentEditor({ render: false });
    state.ui.sideOpen = !state.ui.sideOpen;
    state.ui.contextMenu = null;
    renderApp();
  }

  // Abre/fecha painel rapido da licao.
  function toggleLessonQuick() {
    closeStepCommentEditor({ render: false });
    state.ui.lessonQuickOpen = !state.ui.lessonQuickOpen;
    state.ui.contextMenu = null;
    renderApp();
  }

  // Abre menu contextual de curso/modulo/licao.
  function openContextMenu(data) {
    closeStepCommentEditor({ render: false });
    state.ui.contextMenu = data;
    state.ui.sideOpen = false;
    renderApp();
  }

  // Busca o step-alvo do comentário aberto dentro da lição atual.
  function getOpenStepCommentTarget(stepId) {
    const currentStep = getCurrentStep();
    if (currentStep && currentStep.id === stepId) return currentStep;

    const lessonEntry = getCurrentLessonEntry();
    if (!lessonEntry || !Array.isArray(lessonEntry.lesson.steps)) return null;
    return lessonEntry.lesson.steps.find(function (step) {
      return step && step.id === stepId;
    }) || null;
  }

  // Persiste comentário normalizado no próprio step, removendo o campo quando vazio.
  function setStepCommentValue(step, value) {
    if (!step) return;
    const normalized = normalizeStepComment(value);
    if (normalized) {
      step.comment = normalized;
      return;
    }
    delete step.comment;
  }

  // Move o foco para o textarea do comentário após renderizações.
  function focusStepCommentInput() {
    requestAnimationFrame(function () {
      const input = document.querySelector("[data-step-comment-input='true']");
      if (!input || typeof input.focus !== "function") return;
      const panel = input.closest(".step-comment-layer");
      if (panel && typeof panel.scrollIntoView === "function") {
        try {
          panel.scrollIntoView({ block: "nearest", inline: "nearest" });
        } catch (_error) {
          panel.scrollIntoView();
        }
      }
      try {
        input.focus();
      } catch (_error) {
        input.focus();
      }
      if (typeof input.setSelectionRange === "function") {
        const length = String(input.value || "").length;
        input.setSelectionRange(length, length);
      }
    });
  }

  // Abre o popover fixo de comentário do card atual.
  function openStepCommentEditor(step) {
    if (!step) return;
    closeStepCommentEditor({ render: false });
    state.inlinePopupOpen = null;
    state.flowchartPopupOpen = null;
    state.ui.lessonQuickOpen = false;
    state.ui.stepComment = {
      stepId: step.id,
      draft: getStepCommentValue(step)
    };
    renderApp();
    focusStepCommentInput();
  }

  // Fecha o editor de comentário salvando o rascunho no próprio step.
  function closeStepCommentEditor(options) {
    const editor = state.ui.stepComment;
    if (!editor) return false;

    const targetStep = getOpenStepCommentTarget(editor.stepId);
    if (targetStep) setStepCommentValue(targetStep, editor.draft);

    state.ui.stepComment = null;
    if (!options || options.render !== false) renderApp();
    return true;
  }

  // Alterna o comentário do step atual sem disputar espaço com o popup de progressão.
  function toggleStepCommentEditor() {
    const step = getCurrentStep();
    if (!step) return;
    if (isStepCommentOpen(step)) {
      closeStepCommentEditor();
      return;
    }
    openStepCommentEditor(step);
  }

  // Atualiza o rascunho do comentário em memória enquanto o usuário digita.
  function updateStepCommentDraft(value) {
    if (!state.ui.stepComment) return;
    state.ui.stepComment.draft = String(value || "").replace(/\r/g, "");
  }

  // Fecha overlays ativos (contexto, lateral, popup etc.).
  function closeOverlays() {
    let changed = false;

    if (state.ui.sideOpen) {
      state.ui.sideOpen = false;
      changed = true;
    }
    if (state.ui.contextMenu) {
      state.ui.contextMenu = null;
      changed = true;
    }
    if (state.ui.lessonQuickOpen) {
      state.ui.lessonQuickOpen = false;
      changed = true;
    }
    if (state.inlinePopupOpen) {
      state.inlinePopupOpen = null;
      changed = true;
    }
    if (state.ui.stepComment) {
      closeStepCommentEditor({ render: false });
      changed = true;
    }

    if (changed) renderApp();
  }


  // ============================================================================
  // Navegacao e Controle de Fluxo
  // ============================================================================
  // Navega para menu principal e preserva progresso atual quando necessario.
  function goMain() {
    closeStepCommentEditor({ render: false });
    persistCurrentLessonProgress();
    state.currentView = "main_menu";
    state.currentLessonId = null;
    state.currentStepIndex = 0;
    resetTransient();
    closeEditor(false);
    renderApp();
  }

  // Navega para menu de curso (lista de modulos/licoes).
  function goCourse(courseId) {
    closeStepCommentEditor({ render: false });
    persistCurrentLessonProgress();
    const course = getCourse(courseId || state.currentCourseId);
    if (!course) return goMain();

    state.currentView = "course_menu";
    state.currentCourseId = course.id;
    state.currentLessonId = null;
    state.currentStepIndex = 0;
    resetTransient();
    closeEditor(false);
    renderApp();
  }

  // Abre licao no ponto salvo de progresso (retomada).
  function openLesson(lessonId) {
    closeStepCommentEditor({ render: false });
    const entry = findLesson(state.currentCourseId, lessonId);
    if (!entry) return;
    state.currentView = "lesson_step";
    state.currentLessonId = lessonId;
    state.currentStepIndex = getResumeIndex(entry);
    resetTransient();
    closeEditor(false);
    saveLessonProgress(entry, state.currentStepIndex);
    renderApp();
  }

  // Avanca para proximo card da licao e salva progresso.
  function nextStep() {
    closeStepCommentEditor({ render: false });
    const lessonEntry = getCurrentLessonEntry();
    if (!lessonEntry) return;

    state.inlinePopupOpen = null;
    state.flowchartPopupOpen = null;

    if (state.currentStepIndex < lessonEntry.lesson.steps.length - 1) {
      state.currentStepIndex += 1;
      saveLessonProgress(lessonEntry, state.currentStepIndex);
      renderApp();
      return;
    }

    saveLessonProgress(lessonEntry, state.currentStepIndex);
    goCourse(state.currentCourseId);
  }

  // Volta para card anterior e salva progresso.
  function prevStep() {
    closeStepCommentEditor({ render: false });
    const lessonEntry = getCurrentLessonEntry();
    if (!lessonEntry) return;

    state.inlinePopupOpen = null;
    state.flowchartPopupOpen = null;

    if (state.currentStepIndex > 0) {
      state.currentStepIndex -= 1;
      saveLessonProgress(lessonEntry, state.currentStepIndex);
      renderApp();
      return;
    }

    saveLessonProgress(lessonEntry, state.currentStepIndex);
    goCourse(state.currentCourseId);
  }


  // ============================================================================
  // Progresso e Persistencia
  // ============================================================================
  // Carrega snapshot completo do projeto (conteúdo + progresso + assets) quando existir.
  function loadProjectBootstrap() {
    try {
      const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY);
      if (!raw) return { content: null, progress: null, assets: {} };
      const parsed = JSON.parse(raw);
      return {
        content: parsed && parsed.content ? parsed.content : null,
        progress: parsed && parsed.progress ? parsed.progress : null,
        assets: normalizeAssetStore(parsed && parsed.assets)
      };
    } catch (_error) {
      return { content: null, progress: null, assets: {} };
    }
  }

  // Lê o conteúdo hardcoded gerado em arquivo separado, sem misturar com o motor.
  function loadBundledProjectSeed() {
    try {
      const bundled = window.AraLearnBundledContent;
      if (!bundled || typeof bundled !== "object") return { content: null, assets: {} };
      return {
        content: bundled.content ? normalizeContent(bundled.content) : null,
        assets: normalizeAssetStore(bundled.assets)
      };
    } catch (_error) {
      return { content: null, assets: {} };
    }
  }

  // Injeta o hardcoded inicial apenas como complemento do storage local, preservando edições do usuário.
  function applyBundledProjectSeed() {
    const bundled = loadBundledProjectSeed();
    if (!bundled.content) return false;

    const summary = createImportMergeSummary();
    let changed = false;
    const incomingTitle = clean(bundled.content.appTitle, DEFAULT_APP_TITLE);
    if (
      (!String(state.content.appTitle || "").trim() || state.content.appTitle === DEFAULT_APP_TITLE) &&
      incomingTitle &&
      incomingTitle !== DEFAULT_APP_TITLE
    ) {
      state.content.appTitle = incomingTitle;
      changed = true;
    }

    bundled.content.courses.forEach(function (bundledCourse) {
      const match = findImportMatch(state.content.courses, bundledCourse);
      if (!match) {
        state.content.courses.push(clone(bundledCourse));
        summary.coursesAdded += 1;
        changed = true;
        return;
      }

      if (mergeCourseModules(match.item, bundledCourse, [], summary)) {
        changed = true;
      }
    });

    if (mergeMissingAssets(bundled.assets)) {
      changed = true;
    }

    return changed;
  }

  // Normaliza mapa de assets (caminho lógico -> data URL da imagem).
  function normalizeAssetStore(rawAssets) {
    if (!rawAssets || typeof rawAssets !== "object") return {};

    const assets = {};
    Object.keys(rawAssets).forEach(function (path) {
      const value = rawAssets[path];
      if (typeof value !== "string") return;
      if (!/^assets\/images\//i.test(path)) return;
      if (!/^data:image\//i.test(value)) return;
      assets[path] = value;
    });
    return assets;
  }

  // Agenda gravacao em tempo real no localStorage (com pequeno debounce para performance).
  function scheduleProjectPersist() {
    if (persistTimer) window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(function () {
      persistTimer = null;
      persistProjectSnapshot();
    }, 120);
  }

  // Persiste snapshot completo do projeto para recuperar tudo apos reinicio/reload.
  function persistProjectSnapshot() {
    try {
      pruneUnusedAssetsStore();
      const snapshot = {
        content: state.content,
        progress: serializeProgressRecords(getProgressRecordsList(state.progress)),
        assets: state.assets,
        updatedAt: new Date().toISOString()
      };
      window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (_error) {
      // Silencioso: se estourar limite de armazenamento, o app continua funcionando.
    }
  }

  // Carrega progresso salvo no localStorage.
  function loadProgressStore() {
    try {
      const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (!raw) return { lessons: {} };
      return normalizeImportedProgress(JSON.parse(raw));
    } catch (_error) {
      return { lessons: {} };
    }
  }

  // Persiste progresso atual no localStorage.
  function saveProgressStore() {
    try {
      window.localStorage.setItem(
        PROGRESS_STORAGE_KEY,
        JSON.stringify(serializeProgressRecords(getProgressRecordsList(state.progress)))
      );
    } catch (_error) {
      // Silencioso para manter o app funcional mesmo com storage bloqueado.
    }
  }

  // Busca registro de progresso de uma licao especifica.
  function getLessonProgressRecord(courseId, moduleId, lessonId) {
    const key = lessonProgressKey(courseId, moduleId, lessonId);
    return (state.progress.lessons || {})[key] || null;
  }

  // Salva progresso atual de uma licao em memoria/persistencia.
  function saveLessonProgress(entry, stepIndex) {
    if (!entry || !entry.lesson || !Array.isArray(entry.lesson.steps) || !entry.lesson.steps.length) return;

    const key = lessonProgressKey(entry.course.id, entry.module.id, entry.lesson.id);
    const previous = getLessonProgressRecord(entry.course.id, entry.module.id, entry.lesson.id);
    const safeIndex = clamp(stepIndex, 0, entry.lesson.steps.length - 1);
    const safeStepId = entry.lesson.steps[safeIndex].id;

    let furthestIndex = safeIndex;
    if (previous) {
      furthestIndex = resolveProgressIndex(
        entry.lesson.steps,
        previous.furthestStepId,
        previous.furthestIndexHint,
        safeIndex
      );
      if (furthestIndex < safeIndex) furthestIndex = safeIndex;
    }

    state.progress.lessons[key] = {
      courseId: entry.course.id,
      moduleId: entry.module.id,
      lessonId: entry.lesson.id,
      currentStepId: safeStepId,
      currentIndexHint: safeIndex,
      furthestStepId: entry.lesson.steps[furthestIndex].id,
      furthestIndexHint: furthestIndex,
      updatedAt: new Date().toISOString()
    };
    saveProgressStore();
  }

  // Salva progresso da licao em tela antes de trocar de view.
  function persistCurrentLessonProgress() {
    if (state.currentView !== "lesson_step" || !state.currentLessonId || !state.currentCourseId) return;
    const entry = getCurrentLessonEntry();
    if (!entry) return;
    saveLessonProgress(entry, state.currentStepIndex);
  }

  // Calcula indice de retomada da licao.
  function getResumeIndex(entry) {
    if (!entry || !entry.lesson || !Array.isArray(entry.lesson.steps) || !entry.lesson.steps.length) return 0;
    const record = getLessonProgressRecord(entry.course.id, entry.module.id, entry.lesson.id);
    if (!record) return 0;
    return resolveProgressIndex(entry.lesson.steps, record.currentStepId, record.currentIndexHint, 0);
  }

  // Reconcilia progresso da licao apos insercao/exclusao/edicao de cards.
  function reconcileLessonProgress(entry) {
    if (!entry || !entry.lesson) return;

    const key = lessonProgressKey(entry.course.id, entry.module.id, entry.lesson.id);
    const current = (state.progress.lessons || {})[key];
    if (!current) return;

    const normalized = normalizeProgressRecordForLesson(
      current,
      entry.course.id,
      entry.module.id,
      entry.lesson.id,
      entry.lesson.steps
    );
    if (!normalized) {
      delete state.progress.lessons[key];
    } else {
      state.progress.lessons[key] = normalized;
    }
    saveProgressStore();
  }

  // Remove progresso orfao (curso/modulo/licao que não existe mais).
  function pruneProgressStore() {
    const currentLessons = (state.progress && state.progress.lessons) || {};
    const nextLessons = {};

    state.content.courses.forEach(function (course) {
      course.modules.forEach(function (moduleItem) {
        moduleItem.lessons.forEach(function (lesson) {
          const key = lessonProgressKey(course.id, moduleItem.id, lesson.id);
          if (!currentLessons[key]) return;

          const normalized = normalizeProgressRecordForLesson(
            currentLessons[key],
            course.id,
            moduleItem.id,
            lesson.id,
            lesson.steps
          );
          if (normalized) nextLessons[key] = normalized;
        });
      });
    });

    const previousSerialized = JSON.stringify(currentLessons);
    const nextSerialized = JSON.stringify(nextLessons);
    state.progress = { lessons: nextLessons };
    if (previousSerialized !== nextSerialized) saveProgressStore();
  }

  // Apaga progresso de uma licao.
  function clearLessonProgressRecord(courseId, moduleId, lessonId) {
    const key = lessonProgressKey(courseId, moduleId, lessonId);
    if (!(key in (state.progress.lessons || {}))) return false;
    delete state.progress.lessons[key];
    saveProgressStore();
    return true;
  }

  // Apaga progresso de todas as licoes de um modulo.
  function clearModuleProgressRecords(courseId, moduleId) {
    let changed = false;
    Object.keys(state.progress.lessons || {}).forEach(function (key) {
      const item = state.progress.lessons[key];
      if (!item) return;
      if (item.courseId === courseId && item.moduleId === moduleId) {
        delete state.progress.lessons[key];
        changed = true;
      }
    });
    if (changed) saveProgressStore();
    return changed;
  }

  // Apaga progresso de todas as licoes de um curso.
  function clearCourseProgressRecords(courseId) {
    let changed = false;
    Object.keys(state.progress.lessons || {}).forEach(function (key) {
      const item = state.progress.lessons[key];
      if (!item) return;
      if (item.courseId === courseId) {
        delete state.progress.lessons[key];
        changed = true;
      }
    });
    if (changed) saveProgressStore();
    return changed;
  }

  // Confirma e zera progresso de uma licao.
  function resetLessonProgress(courseId, moduleId, lessonId) {
    const lessonEntry = findLesson(courseId, lessonId);
    if (!lessonEntry || lessonEntry.module.id !== moduleId) return;
    if (!window.confirm('Zerar progresso da lição "' + lessonEntry.lesson.title + '"?')) return;

    clearLessonProgressRecord(courseId, moduleId, lessonId);
    renderApp();
  }

  // Confirma e zera progresso de um modulo.
  function resetModuleProgress(courseId, moduleId) {
    const moduleEntry = findModule(courseId, moduleId);
    if (!moduleEntry) return;
    if (!window.confirm('Zerar progresso de todas as lições do módulo "' + moduleEntry.module.title + '"?')) return;

    clearModuleProgressRecords(courseId, moduleId);
    renderApp();
  }

  // Confirma e zera progresso de um curso.
  function resetCourseProgress(courseId) {
    const course = getCourse(courseId);
    if (!course) return;
    if (!window.confirm('Zerar progresso de todo o curso "' + course.title + '"?')) return;

    clearCourseProgressRecords(courseId);
    renderApp();
  }

  // Calcula progresso agregado de uma licao.
  function getLessonProgressStats(courseId, moduleId, lesson) {
    const total = Array.isArray(lesson.steps) ? lesson.steps.length : 0;
    if (!total) return { completed: 0, total: 0, percent: 0 };

    const record = getLessonProgressRecord(courseId, moduleId, lesson.id);
    if (!record) return { completed: 0, total: total, percent: 0 };

    const normalized = normalizeProgressRecordForLesson(record, courseId, moduleId, lesson.id, lesson.steps);
    if (!normalized) return { completed: 0, total: total, percent: 0 };

    const completed = clamp(normalized.furthestIndexHint + 1, 0, total);
    return {
      completed: completed,
      total: total,
      percent: Math.round((completed / total) * 100)
    };
  }

  // Calcula progresso agregado de um modulo.
  function getModuleProgressStats(courseId, moduleItem) {
    let total = 0;
    let completed = 0;

    (moduleItem.lessons || []).forEach(function (lesson) {
      const lessonStats = getLessonProgressStats(courseId, moduleItem.id, lesson);
      total += lessonStats.total;
      completed += lessonStats.completed;
    });

    if (!total) return { completed: 0, total: 0, percent: 0 };
    return {
      completed: completed,
      total: total,
      percent: Math.round((completed / total) * 100)
    };
  }

  // Calcula progresso agregado de um curso.
  function getCourseProgressStats(course) {
    let total = 0;
    let completed = 0;

    (course.modules || []).forEach(function (moduleItem) {
      const moduleStats = getModuleProgressStats(course.id, moduleItem);
      total += moduleStats.total;
      completed += moduleStats.completed;
    });

    if (!total) return { completed: 0, total: 0, percent: 0 };
    return {
      completed: completed,
      total: total,
      percent: Math.round((completed / total) * 100)
    };
  }

  // Limpa estados temporarios de interacao da UI.
  function resetTransient() {
    state.ui.stepComment = null;
    state.inlinePopupOpen = null;
    state.flowchartPopupOpen = null;
    state.tokenByStepId = {};
    state.ui.sideOpen = false;
    state.ui.contextMenu = null;
    state.ui.lessonQuickOpen = false;
  }

  // ============================================================================
  // Exercícios interativos
  // ============================================================================
  // Calcula opções livres removendo as ja usadas nas lacunas.
  function getAvailableOptionsFromList(options, slots) {
    const selected = slots.filter(Boolean).slice();
    return (options || []).filter(function (item) {
      const index = selected.indexOf(item);
      if (index > -1) {
        selected.splice(index, 1);
        return false;
      }
      return true;
    });
  }

  // Gera chave unica para estado de exercicio do bloco terminal.
  function terminalExerciseKey(stepId, blockId) {
    return "terminal::" + stepId + "::" + blockId;
  }

  // Obtem/cria estado de exercicio do bloco terminal.
  function getTerminalExerciseState(step, block, slotCount) {
    const key = terminalExerciseKey(step.id, block.id);
    if (!state.tokenByStepId[key]) {
      state.tokenByStepId[key] = {
        slots: Array(slotCount).fill(null),
        feedback: null,
        activeSlot: slotCount > 0 ? 0 : null
      };
    }

    const current = state.tokenByStepId[key];
    if (!Array.isArray(current.slots)) current.slots = Array(slotCount).fill(null);
    if (current.slots.length !== slotCount) {
      const next = Array(slotCount).fill(null);
      current.slots.slice(0, slotCount).forEach(function (value, index) {
        next[index] = value;
      });
      current.slots = next;
    }
    const firstEmptySlot = getFirstEmptyTerminalSlotIndex(current.slots);
    if (firstEmptySlot === -1) {
      current.activeSlot = null;
      return current;
    }
    if (
      !Number.isInteger(current.activeSlot) ||
      current.activeSlot < 0 ||
      current.activeSlot >= slotCount ||
      !isTerminalSlotEmpty(current.slots[current.activeSlot])
    ) {
      current.activeSlot = firstEmptySlot;
    }
    return current;
  }

  // Monta contexto do exercicio terminal no step atual.
  function getCurrentTerminalExercise(blockId) {
    const entry = findCurrentStepBlockById(blockId, function (item) {
      return isEditorKind(item.kind);
    });
    if (!entry) return null;

    const parsed = parseTerminalTemplate(entry.block.value || "");
    if (!parsed.answers.length) return null;

    const exercise = getTerminalExerciseState(entry.step, entry.block, parsed.answers.length);
    const options = mergeTerminalOptions(entry.block.options, parsed.answers);
    return { step: entry.step, block: entry.block, parsed: parsed, exercise: exercise, options: options };
  }

  // Monta a lista de respostas aceitas por lacuna a partir das opções habilitadas do Editor digitado.
  function getEnabledEditorInputMatchers(options) {
    return sortEditorOptionsBySlotOrder(options)
      .filter(function (option) {
        return option.enabled !== false;
      })
      .map(function (option) {
        return [{
          value: decodeTerminalLiteralEntities(String(option.value || "")),
          regex: !!option.regex
        }].concat(
          normalizeEditorInputVariantsForAuthor(option.variants)
            .filter(function (variant) {
              return String(variant.value || "").trim().length > 0;
            })
            .map(function (variant) {
              return {
                value: decodeTerminalLiteralEntities(String(variant.value || "")),
                regex: !!variant.regex
              };
            })
        );
      });
  }

  // Lista lacunas vazias, preservando a ordem visual do template.
  function getEmptyTerminalSlotIndexes(slots) {
    return (Array.isArray(slots) ? slots : []).reduce(function (acc, value, index) {
      if (isTerminalSlotEmpty(value)) acc.push(index);
      return acc;
    }, []);
  }

  // Indica se a lacuna do terminal ainda está vazia.
  function isTerminalSlotEmpty(value) {
    return value === null || value === undefined || String(value) === "";
  }

  // Retorna a primeira lacuna vazia na ordem visual do template.
  function getFirstEmptyTerminalSlotIndex(slots) {
    const emptyIndexes = getEmptyTerminalSlotIndexes(slots);
    return emptyIndexes.length ? emptyIndexes[0] : -1;
  }

  // Resolve qual lacuna do modo choice deve receber a opção clicada.
  function resolveTerminalChoiceTargetIndex(entry, value) {
    if (!entry || !entry.exercise) return -1;
    const slots = Array.isArray(entry.exercise.slots) ? entry.exercise.slots : [];
    const activeSlot = entry.exercise.activeSlot;
    if (
      Number.isInteger(activeSlot) &&
      activeSlot >= 0 &&
      activeSlot < slots.length &&
      isTerminalSlotEmpty(slots[activeSlot])
    ) {
      return activeSlot;
    }

    return getFirstEmptyTerminalSlotIndex(slots);
  }

  // Seleciona opção no exercicio de terminal.
  function terminalOptionClick(blockId, value) {
    const entry = getCurrentTerminalExercise(blockId);
    if (!entry) return;

    const targetIndex = resolveTerminalChoiceTargetIndex(entry, value);
    if (targetIndex === -1) return;

    entry.exercise.slots[targetIndex] = value;
    entry.exercise.feedback = null;
    entry.exercise.activeSlot = getFirstEmptyTerminalSlotIndex(entry.exercise.slots);
    renderApp();
  }

  // Atualiza em tempo real o texto digitado para a lacuna ativa.
  function setTerminalInputDraft(blockId, index, value) {
    const entry = getCurrentTerminalExercise(blockId);
    if (!entry || !isTypedEditorBlock(entry.block)) return;
    if (!Number.isInteger(index) || index < 0 || index >= entry.exercise.slots.length) return;

    entry.exercise.slots[index] = String(value || "");
    entry.exercise.feedback = null;
  }

  // Remove opção de lacuna no exercicio de terminal.
  function terminalSlotClick(blockId, index) {
    const entry = getCurrentTerminalExercise(blockId);
    if (!entry) return;
    if (!Number.isInteger(index) || index < 0 || index >= entry.exercise.slots.length) return;
    const currentValue = entry.exercise.slots[index];
    if (isTerminalSlotEmpty(currentValue)) {
      entry.exercise.activeSlot = index;
      entry.exercise.feedback = null;
      renderApp();
      return;
    }

    entry.exercise.slots[index] = null;
    entry.exercise.activeSlot = index;
    entry.exercise.feedback = null;
    renderApp();
  }

  // Limpa lacunas do exercicio terminal.
  function terminalReset(blockId) {
    const entry = getCurrentTerminalExercise(blockId);
    if (!entry) return;

    entry.exercise.slots = Array(entry.parsed.answers.length).fill(null);
    entry.exercise.feedback = null;
    entry.exercise.activeSlot = getFirstEmptyTerminalSlotIndex(entry.exercise.slots);
    renderApp();
  }

  // Verifica se todas as posições de resposta receberam algum valor.
  function isFilled(values) {
    return Array.isArray(values) && values.every(function (value) {
      return value !== null && value !== undefined && String(value) !== "";
    });
  }

  // Valida um bloco Editor conforme o modo de interação configurado.
  function validateTerminalExerciseBlock(step, block) {
    const parsed = parseTerminalTemplate(block.value || "");
    const exercise = getTerminalExerciseState(step, block, parsed.answers.length);
    if (!isFilled(exercise.slots)) {
      exercise.feedback = "incomplete";
      scheduleFeedbackReveal(block.id);
      return "incomplete";
    }

    let status = "incorrect";
    if (isTypedEditorBlock(block)) {
      const result = validateTypedCodeInputAttempt({
        slots: exercise.slots,
        matchersBySlot: getEnabledEditorInputMatchers(block.options)
      });
      status = result.status;
    } else {
      status = exercise.slots.every(function (value, index) {
        return value === parsed.answers[index];
      })
        ? "correct"
        : "incorrect";
    }

    exercise.feedback = status;
    scheduleFeedbackReveal(block.id);
    return status;
  }

  // Valida exercicio terminal.
  function terminalCheck(blockId) {
    const entry = getCurrentTerminalExercise(blockId);
    if (!entry) return;
    if (!isFilled(entry.exercise.slots)) return;

    validateTerminalExerciseBlock(entry.step, entry.block);
    renderApp();
  }

  // Valida uma coleção arbitrária de blocos interativos dentro do mesmo step lógico.
  function validateInteractiveBlocks(step, blocks) {
    const exerciseBlocks = collectInteractiveExerciseBlocks(blocks);
    if (!exerciseBlocks.length) return { hasExercise: false, status: "none" };

    let hasIncomplete = false;
    let hasIncorrect = false;

    exerciseBlocks.forEach(function (block) {
      let status = "none";

      if (isTableKind(block.kind)) {
        status = validateTableExerciseBlock(step, block);
      } else if (isEditorKind(block.kind)) {
        status = validateTerminalExerciseBlock(step, block);
      } else if (isMultipleChoiceKind(block.kind)) {
        status = validateMultipleChoiceExerciseBlock(step, block);
      } else if (isFlowchartKind(block.kind)) {
        status = validateFlowchartExerciseBlock(step, block);
      }

      if (status === "incorrect") hasIncorrect = true;
      if (status === "incomplete") hasIncomplete = true;
    });

    if (hasIncorrect) return { hasExercise: true, status: "incorrect" };
    if (hasIncomplete) return { hasExercise: true, status: "incomplete" };
    return { hasExercise: true, status: "correct" };
  }

  // Limpa respostas e feedbacks de uma coleção de blocos interativos.
  function resetInteractiveBlocks(step, blocks) {
    collectInteractiveExerciseBlocks(blocks).forEach(function (block) {
      if (isTableKind(block.kind)) {
        const table = normalizeTableBlock(block);
        const exercise = getTableExerciseState(step, block);
        getTableExerciseCellEntries(table).forEach(function (entry) {
          exercise.values[getTableExerciseCellKey(entry.ref)] = "";
        });
        exercise.feedback = null;
        exercise.activeCellKey = getFirstEmptyTableChoiceCellKey(table, exercise);
        return;
      }

      if (isEditorKind(block.kind)) {
        const parsed = parseTerminalTemplate(block.value || "");
        const exercise = getTerminalExerciseState(step, block, parsed.answers.length);
        exercise.slots = Array(parsed.answers.length).fill(null);
        exercise.feedback = null;
        exercise.activeSlot = null;
        return;
      }

      if (isMultipleChoiceKind(block.kind)) {
        const exercise = getMultipleChoiceExerciseState(step, block);
        exercise.selected = [];
        exercise.feedback = null;
        return;
      }

      if (isFlowchartKind(block.kind)) {
        const exercise = getFlowchartExerciseState(step, block);
        getFlowchartSortedNodes(block.nodes).forEach(function (node) {
          if (flowchartNodeUsesShapeBlank(node)) exercise.shapes[node.id] = null;
          if (flowchartNodeUsesTextBlank(node)) exercise.texts[node.id] = null;
        });
        exercise.feedback = null;
      }
    });
  }

  // Valida todos os blocos interativos do step atual (usado no botao Continuar do card).
  function validateStepEditorExercises(step) {
    if (!step) return { hasExercise: false, status: "none" };
    return validateInteractiveBlocks(step, step.blocks);
  }

  // Limpa todos os blocos interativos do step atual.
  function resetStepEditorExercises(step) {
    if (!step || !Array.isArray(step.blocks)) return;
    resetInteractiveBlocks(step, step.blocks);
    resetInteractiveBlocks(step, getOpenPopupInteractiveBlocks(step));
    state.flowchartPopupOpen = null;
  }

  // Mostra resposta correta no exercicio terminal.
  function terminalViewAnswer(blockId) {
    const entry = getCurrentTerminalExercise(blockId);
    if (!entry) return;

    entry.exercise.slots = entry.parsed.answers.slice();
    entry.exercise.feedback = "correct";
    entry.exercise.activeSlot = null;
    scheduleFeedbackReveal(blockId);
    renderApp();
  }

  // Fecha feedback de erro do exercicio terminal.
  function terminalTryAgain(blockId) {
    const entry = getCurrentTerminalExercise(blockId);
    if (!entry) return;
    entry.exercise.feedback = null;
    renderApp();
  }

  // Gera chave unica para estado do exercicio de fluxograma.
  function flowchartExerciseKey(stepId, blockId) {
    return "flowchart::" + stepId + "::" + blockId;
  }

  // Obtem/cria estado de exercicio do bloco de fluxograma.
  function getFlowchartExerciseState(step, block) {
    const key = flowchartExerciseKey(step.id, block.id);
    const nodes = getFlowchartSortedNodes(block.nodes);

    if (!state.tokenByStepId[key]) {
      state.tokenByStepId[key] = { shapes: {}, texts: {}, feedback: null };
    }

    const current = state.tokenByStepId[key];
    if (!current.shapes || typeof current.shapes !== "object") current.shapes = {};
    if (!current.texts || typeof current.texts !== "object") current.texts = {};

    const activeIds = {};
    nodes.forEach(function (node) {
      activeIds[node.id] = true;
      if (!Object.prototype.hasOwnProperty.call(current.shapes, node.id)) current.shapes[node.id] = null;
      if (!Object.prototype.hasOwnProperty.call(current.texts, node.id)) current.texts[node.id] = null;
    });

    Object.keys(current.shapes).forEach(function (nodeId) {
      if (!activeIds[nodeId]) delete current.shapes[nodeId];
    });
    Object.keys(current.texts).forEach(function (nodeId) {
      if (!activeIds[nodeId]) delete current.texts[nodeId];
    });

    return current;
  }

  // Monta contexto do exercicio de fluxograma no step atual.
  function getCurrentFlowchartExercise(blockId) {
    const entry = findCurrentStepBlockById(blockId, function (item) {
      return isFlowchartKind(item.kind);
    });
    if (!entry) return null;

    normalizeFlowchartEditorBlock(entry.block);
    return {
      step: entry.step,
      block: entry.block,
      exercise: getFlowchartExerciseState(entry.step, entry.block)
    };
  }

  // Abre popup de seleção do fluxograma para um nó específico.
  function flowchartOpenPopup(blockId, nodeId, kind) {
    const entry = getCurrentFlowchartExercise(blockId);
    if (!entry) return;
    state.flowchartPopupOpen = {
      stepId: entry.step.id,
      blockId: entry.block.id,
      nodeId: nodeId,
      kind: kind === "shape" ? "shape" : "text"
    };
    renderApp();
  }

  // Define símbolo selecionado no fluxograma.
  function flowchartSetShape(blockId, nodeId, shape) {
    const entry = getCurrentFlowchartExercise(blockId);
    if (!entry) return;
    entry.exercise.shapes[nodeId] = normalizeFlowchartShapeKey(shape);
    entry.exercise.feedback = null;
    state.flowchartPopupOpen = null;
    renderApp();
  }

  // Define texto selecionado no fluxograma.
  function flowchartSetText(blockId, nodeId, text) {
    const entry = getCurrentFlowchartExercise(blockId);
    if (!entry) return;
    entry.exercise.texts[nodeId] = String(text || "");
    entry.exercise.feedback = null;
    state.flowchartPopupOpen = null;
    renderApp();
  }

  // Limpa símbolo ou texto de um nó do fluxograma.
  function flowchartClearChoice(blockId, nodeId, kind) {
    const entry = getCurrentFlowchartExercise(blockId);
    if (!entry) return;
    if (kind === "shape") {
      entry.exercise.shapes[nodeId] = null;
    } else {
      entry.exercise.texts[nodeId] = null;
    }
    entry.exercise.feedback = null;
    state.flowchartPopupOpen = null;
    renderApp();
  }

  // Valida um bloco de fluxograma e retorna status consolidado.
  function validateFlowchartExerciseBlock(step, block) {
    const exercise = getFlowchartExerciseState(step, block);
    const nodes = getFlowchartSortedNodes(block.nodes);
    if (!nodes.length) {
      exercise.feedback = null;
      return "none";
    }

    const hasAnyBlank = nodes.some(function (node) {
      return flowchartNodeUsesShapeBlank(node) || flowchartNodeUsesTextBlank(node);
    });
    if (!hasAnyBlank) {
      exercise.feedback = null;
      return "none";
    }

    let incomplete = false;
    let incorrect = false;

    nodes.forEach(function (node) {
      const selectedShape = String(exercise.shapes[node.id] || "").trim();
      const selectedText = String(exercise.texts[node.id] || "").trim();

      if (flowchartNodeUsesShapeBlank(node)) {
        if (!selectedShape) {
          incomplete = true;
          return;
        }
        if (selectedShape !== normalizeFlowchartShapeKey(node.shape)) {
          incorrect = true;
        }
      }

      if (flowchartNodeUsesTextBlank(node)) {
        if (!selectedText) {
          incomplete = true;
          return;
        }
        if (selectedText !== String(node.text || "").trim()) {
          incorrect = true;
        }
      }
    });

    exercise.feedback = incorrect ? "incorrect" : incomplete ? "incomplete" : "correct";
    scheduleFeedbackReveal(block.id);
    return exercise.feedback;
  }

  // Limpa respostas do fluxograma.
  function flowchartReset(blockId) {
    const entry = getCurrentFlowchartExercise(blockId);
    if (!entry) return;

    const nodes = getFlowchartSortedNodes(entry.block.nodes);
    nodes.forEach(function (node) {
      if (flowchartNodeUsesShapeBlank(node)) entry.exercise.shapes[node.id] = null;
      if (flowchartNodeUsesTextBlank(node)) entry.exercise.texts[node.id] = null;
    });
    entry.exercise.feedback = null;
    state.flowchartPopupOpen = null;
    renderApp();
  }

  // Mostra resposta correta do fluxograma.
  function flowchartViewAnswer(blockId) {
    const entry = getCurrentFlowchartExercise(blockId);
    if (!entry) return;

    getFlowchartSortedNodes(entry.block.nodes).forEach(function (node) {
      if (flowchartNodeUsesShapeBlank(node)) {
        entry.exercise.shapes[node.id] = normalizeFlowchartShapeKey(node.shape);
      }
      if (flowchartNodeUsesTextBlank(node)) {
        entry.exercise.texts[node.id] = String(node.text || "").trim();
      }
    });
    entry.exercise.feedback = "correct";
    state.flowchartPopupOpen = null;
    scheduleFeedbackReveal(blockId);
    renderApp();
  }

  // Fecha feedback de erro do fluxograma para tentar novamente.
  function flowchartTryAgain(blockId) {
    const entry = getCurrentFlowchartExercise(blockId);
    if (!entry) return;
    entry.exercise.feedback = null;
    renderApp();
  }


  // ============================================================================
  // CRUD de Curso / Modulo / Licao
  // ============================================================================
  // Cria novo curso.
  function createCourse() {
    const title = window.prompt("Nome do novo curso:", "Novo curso");
    if (title === null) return;
    if (!title.trim()) return window.alert("Informe um nome.");

    const course = defaultCourse(title.trim());
    state.content.courses.push(course);
    goCourse(course.id);
  }

  // Edita titulo/descricao de curso.
  function editCourse(courseId) {
    const course = getCourse(courseId);
    if (!course) return;

    const title = window.prompt("Título do curso:", course.title);
    if (title === null) return;
    const description = window.prompt("Descricao do curso:", course.description || "");
    if (description === null) return;

    course.title = title.trim() || course.title;
    course.description = description.trim();
    renderApp();
  }

  // Exclui curso e progresso associado.
  function deleteCourse(courseId) {
    const course = getCourse(courseId);
    if (!course) return;
    if (!window.confirm('Excluir o curso "' + course.title + '"?')) return;

    clearCourseProgressRecords(courseId);
    state.content.courses = state.content.courses.filter(function (item) { return item.id !== courseId; });
    pruneProgressStore();
    state.currentCourseId = state.content.courses.length ? state.content.courses[0].id : null;
    goMain();
  }

  // Cria novo modulo no curso atual.
  function createModule() {
    const course = getCurrentCourse();
    if (!course) return;

    const title = window.prompt("Nome do novo módulo:", "Novo módulo");
    if (title === null) return;

    course.modules.push(defaultModule(title.trim() || "Novo módulo"));
    renderApp();
  }

  // Edita titulo de modulo.
  function editModule(moduleId) {
    const entry = findModule(state.currentCourseId, moduleId);
    if (!entry) return;

    const title = window.prompt("Título do módulo:", entry.module.title);
    if (title === null) return;

    entry.module.title = title.trim() || entry.module.title;
    renderApp();
  }

  // Exclui modulo e progresso associado.
  function deleteModule(moduleId) {
    const course = getCurrentCourse();
    if (!course) return;

    const entry = findModule(state.currentCourseId, moduleId);
    if (!entry) return;
    if (!window.confirm('Excluir o módulo "' + entry.module.title + '"?')) return;

    clearModuleProgressRecords(state.currentCourseId, moduleId);
    course.modules.splice(entry.moduleIndex, 1);
    pruneProgressStore();
    if (state.currentView === "lesson_step" && !getCurrentLessonEntry()) return goCourse(state.currentCourseId);

    renderApp();
  }

  // Cria nova licao dentro de um modulo.
  function createLesson(moduleId) {
    const entry = findModule(state.currentCourseId, moduleId);
    if (!entry) return;

    const title = window.prompt("Nome da nova lição:", "Nova lição");
    if (title === null) return;

    entry.module.lessons.push(defaultLesson(title.trim() || "Nova lição"));
    renderApp();
  }

  // Edita titulo/subtitulo da licao.
  function editLesson(moduleId, lessonId) {
    const entry = findLesson(state.currentCourseId, lessonId);
    if (!entry || entry.module.id !== moduleId) return;

    const title = window.prompt("Título da lição:", entry.lesson.title);
    if (title === null) return;
    const subtitle = window.prompt("Subtítulo da lição:", entry.lesson.subtitle || "");
    if (subtitle === null) return;

    entry.lesson.title = title.trim() || entry.lesson.title;
    entry.lesson.subtitle = subtitle.trim();
    renderApp();
  }

  // Exclui licao e progresso associado.
  function deleteLesson(moduleId, lessonId) {
    const moduleEntry = findModule(state.currentCourseId, moduleId);
    if (!moduleEntry) return;

    const index = moduleEntry.module.lessons.findIndex(function (lesson) { return lesson.id === lessonId; });
    if (index === -1) return;
    if (!window.confirm('Excluir a lição "' + moduleEntry.module.lessons[index].title + '"?')) return;

    clearLessonProgressRecord(state.currentCourseId, moduleId, lessonId);
    moduleEntry.module.lessons.splice(index, 1);
    pruneProgressStore();
    if (state.currentLessonId === lessonId) return goCourse(state.currentCourseId);

    renderApp();
  }

  // Edita titulo global exibido no topo do app.
  function editAppTitle() {
    const title = window.prompt("Título do app:", state.content.appTitle || DEFAULT_APP_TITLE);
    if (title === null) return;

    state.content.appTitle = clean(title, DEFAULT_APP_TITLE);
    renderApp();
  }


  // ============================================================================
  // Importacao e Exportacao ZIP/JSON
  // ============================================================================
  // Nome amigavel de cada escopo usado nas mensagens de importacao/exportacao.
  function getPackageScopeLabel(scope) {
    if (scope === "course") return "curso";
    if (scope === "module") return "módulo";
    if (scope === "lesson") return "lição";
    if (scope === "app") return "aplicação inteira";
    return "arquivo incompatível";
  }

  // Cria metadados do pacote para validar importacoes por escopo.
  function buildPackageMeta(scope, source) {
    return {
      format: PACKAGE_FORMAT,
      scope: scope,
      exportedAt: new Date().toISOString(),
      appTitle: state.content.appTitle || DEFAULT_APP_TITLE,
      source: clone(source || {})
    };
  }

  // Serializa progresso em lista ordenada e sem campos redundantes.
  function serializeProgressRecords(records) {
    const list = (Array.isArray(records) ? records : [])
      .filter(Boolean)
      .map(function (record) {
        return {
          courseId: String(record.courseId || ""),
          moduleId: String(record.moduleId || ""),
          lessonId: String(record.lessonId || ""),
          currentStepId: String(record.currentStepId || ""),
          currentIndexHint: normalizeIndexHint(record.currentIndexHint),
          furthestStepId: String(record.furthestStepId || record.currentStepId || ""),
          furthestIndexHint: normalizeIndexHint(record.furthestIndexHint),
          updatedAt: String(record.updatedAt || "")
        };
      })
      .filter(function (record) {
        return record.courseId && record.moduleId && record.lessonId;
      })
      .sort(function (a, b) {
        const keyA = a.courseId + "::" + a.moduleId + "::" + a.lessonId;
        const keyB = b.courseId + "::" + b.moduleId + "::" + b.lessonId;
        return keyA.localeCompare(keyB);
      })
      .map(function (record) {
        if (record.currentIndexHint === null) delete record.currentIndexHint;
        if (record.furthestIndexHint === null) delete record.furthestIndexHint;
        return record;
      });

    return { lessons: list };
  }

  // Extrai registros do armazenamento de progresso interno no formato de lista.
  function getProgressRecordsList(progressStore) {
    const lessons = (progressStore && progressStore.lessons) || {};
    return Object.keys(lessons).map(function (key) { return lessons[key]; }).filter(Boolean);
  }

  // Acumula assets realmente referenciados por blocos, incluindo imagens dentro de popups estruturados.
  function collectBlockAssetPaths(blocks, bucket, assetStore) {
    if (!Array.isArray(blocks) || !bucket) return;

    const addPath = function (rawPath) {
      const path = String(rawPath || "").trim();
      if (!/^assets\/images\//i.test(path)) return;
      if (assetStore && !assetStore[path]) return;
      bucket.add(path);
    };

    blocks.forEach(function (block) {
      if (!block) return;
      if (block.kind === "image") addPath(block.value);
      if (block.kind === "button" && Array.isArray(block.popupBlocks)) {
        collectBlockAssetPaths(block.popupBlocks, bucket, assetStore);
      }
    });
  }

  // Acumula assets realmente referenciados por um step.
  function collectStepAssetPaths(step, bucket, assetStore) {
    if (!step || !bucket) return;

    const addPath = function (rawPath) {
      const path = String(rawPath || "").trim();
      if (!/^assets\/images\//i.test(path)) return;
      if (assetStore && !assetStore[path]) return;
      bucket.add(path);
    };

    addPath(step.image);
    collectBlockAssetPaths(step.blocks, bucket, assetStore);
    if (Array.isArray(step.popupBlocks)) {
      collectBlockAssetPaths(step.popupBlocks, bucket, assetStore);
    }
  }

  // Coleta assets referenciados por uma licao.
  function collectLessonAssetPaths(lesson, assetStore) {
    const bucket = new Set();
    if (!lesson || !Array.isArray(lesson.steps)) return [];
    lesson.steps.forEach(function (step) {
      collectStepAssetPaths(step, bucket, assetStore);
    });
    return Array.from(bucket).sort();
  }

  // Coleta assets referenciados por um modulo.
  function collectModuleAssetPaths(moduleItem, assetStore) {
    const bucket = new Set();
    if (!moduleItem || !Array.isArray(moduleItem.lessons)) return [];
    moduleItem.lessons.forEach(function (lesson) {
      collectLessonAssetPaths(lesson, assetStore).forEach(function (path) {
        bucket.add(path);
      });
    });
    return Array.from(bucket).sort();
  }

  // Coleta assets referenciados por um curso.
  function collectCourseAssetPaths(course, assetStore) {
    const bucket = new Set();
    if (!course || !Array.isArray(course.modules)) return [];
    course.modules.forEach(function (moduleItem) {
      collectModuleAssetPaths(moduleItem, assetStore).forEach(function (path) {
        bucket.add(path);
      });
    });
    return Array.from(bucket).sort();
  }

  // Coleta todos os assets ainda usados no conteudo atual.
  function collectContentAssetPaths(content, assetStore) {
    const bucket = new Set();
    const courses = content && Array.isArray(content.courses) ? content.courses : [];
    courses.forEach(function (course) {
      collectCourseAssetPaths(course, assetStore).forEach(function (path) {
        bucket.add(path);
      });
    });
    return Array.from(bucket).sort();
  }

  // Coleta assets que ainda estão apenas em rascunhos do editor, antes do salvamento final do card.
  function collectEditorDraftAssetPaths(assetStore) {
    const bucket = new Set();

    const collectForm = function (form) {
      if (!form || !Array.isArray(form.blocks)) return;
      collectBlockAssetPaths(form.blocks, bucket, assetStore);
    };

    collectForm(state.editor && state.editor.form);
    collectForm(state.editor && state.editor.popupBuilder && state.editor.popupBuilder.mainForm);

    const drafts = state.editor && state.editor.draftByStepId ? state.editor.draftByStepId : {};
    Object.keys(drafts).forEach(function (stepId) {
      collectForm(drafts[stepId]);
    });

    return Array.from(bucket).sort();
  }

  // Remove do armazenamento local imagens orfas para evitar JSONs com sobra.
  function pruneUnusedAssetsStore() {
    const next = {};
    const referenced = new Set();

    collectContentAssetPaths(state.content, state.assets).forEach(function (path) {
      referenced.add(path);
    });
    collectEditorDraftAssetPaths(state.assets).forEach(function (path) {
      referenced.add(path);
    });

    Array.from(referenced).forEach(function (path) {
      if (state.assets[path]) next[path] = state.assets[path];
    });
    state.assets = next;
    return Object.keys(next).sort();
  }

  // Monta payload completo do projeto (conteúdo + progresso + assets referenciados).
  function buildProjectPayload() {
    pruneProgressStore();
    const assetPaths = pruneUnusedAssetsStore();
    return {
      appTitle: state.content.appTitle,
      courses: clone(state.content.courses),
      progress: serializeProgressRecords(getProgressRecordsList(state.progress)),
      assets: assetPaths,
      packageMeta: {
        format: PACKAGE_FORMAT,
        scope: "app",
        exportedAt: new Date().toISOString(),
        appTitle: state.content.appTitle || DEFAULT_APP_TITLE
      }
    };
  }

  // Monta payload de curso individual para backup/restore localizado.
  function buildCoursePayload(courseId) {
    const course = getCourse(courseId);
    if (!course) return null;

    return {
      course: clone(course),
      progress: serializeProgressRecords(getProgressRecordsList(state.progress).filter(function (record) {
        return record.courseId === course.id;
      })),
      assets: collectCourseAssetPaths(course, state.assets),
      packageMeta: buildPackageMeta("course", {
        courseId: course.id,
        courseTitle: course.title
      })
    };
  }

  // Monta payload de modulo individual com suas licoes e progresso relacionado.
  function buildModulePayload(courseId, moduleId) {
    const entry = findModule(courseId, moduleId);
    if (!entry) return null;

    return {
      module: clone(entry.module),
      progress: serializeProgressRecords(getProgressRecordsList(state.progress).filter(function (record) {
        return record.courseId === entry.course.id && record.moduleId === entry.module.id;
      })),
      assets: collectModuleAssetPaths(entry.module, state.assets),
      packageMeta: buildPackageMeta("module", {
        courseId: entry.course.id,
        courseTitle: entry.course.title,
        moduleId: entry.module.id,
        moduleTitle: entry.module.title
      })
    };
  }

  // Monta payload de licao individual com seus cards, imagens e progresso.
  function buildLessonPayload(courseId, moduleId, lessonId) {
    const moduleEntry = findModule(courseId, moduleId);
    if (!moduleEntry) return null;

    const lesson = (moduleEntry.module.lessons || []).find(function (item) {
      return item.id === lessonId;
    });
    if (!lesson) return null;

    return {
      lesson: clone(lesson),
      progress: serializeProgressRecords(getProgressRecordsList(state.progress).filter(function (record) {
        return (
          record.courseId === moduleEntry.course.id &&
          record.moduleId === moduleEntry.module.id &&
          record.lessonId === lesson.id
        );
      })),
      assets: collectLessonAssetPaths(lesson, state.assets),
      packageMeta: buildPackageMeta("lesson", {
        courseId: moduleEntry.course.id,
        courseTitle: moduleEntry.course.title,
        moduleId: moduleEntry.module.id,
        moduleTitle: moduleEntry.module.title,
        lessonId: lesson.id,
        lessonTitle: lesson.title
      })
    };
  }

  // Resolve payload conforme o escopo pedido pelo menu atual.
  function buildScopedPayload(scope, context) {
    if (scope === "course") return buildCoursePayload(context && context.courseId);
    if (scope === "module") {
      return buildModulePayload((context && context.courseId) || state.currentCourseId, context && context.moduleId);
    }
    if (scope === "lesson") {
      return buildLessonPayload(
        (context && context.courseId) || state.currentCourseId,
        context && context.moduleId,
        context && context.lessonId
      );
    }
    return buildProjectPayload();
  }

  // Coleta caminhos de imagem do escopo exportado, incluindo assets estáticos ainda não materializados.
  function collectScopedAssetPaths(scope, context) {
    if (scope === "course") {
      const courseItem = getCourse(context && context.courseId);
      return collectCourseAssetPaths(courseItem, null);
    }

    if (scope === "module") {
      const entry = findModule((context && context.courseId) || state.currentCourseId, context && context.moduleId);
      return entry ? collectModuleAssetPaths(entry.module, null) : [];
    }

    if (scope === "lesson") {
      const entry = findModule((context && context.courseId) || state.currentCourseId, context && context.moduleId);
      if (!entry) return [];
      const lessonItem = (entry.module.lessons || []).find(function (item) {
        return item && item.id === (context && context.lessonId);
      });
      return lessonItem ? collectLessonAssetPaths(lessonItem, null) : [];
    }

    return collectContentAssetPaths(state.content, null);
  }

  // Materializa assets estáticos do projeto em data URLs para que possam entrar em exportações ZIP.
  async function ensureAssetDataAvailable(assetPaths) {
    const paths = Array.isArray(assetPaths) ? assetPaths : [];

    for (let i = 0; i < paths.length; i += 1) {
      const path = String(paths[i] || "").trim();
      if (!/^assets\/images\//i.test(path)) continue;
      if (state.assets[path]) continue;

      try {
        const response = await fetch(path);
        if (!response.ok) continue;
        const blob = await response.blob();
        if (!String(blob.type || "").toLowerCase().startsWith("image/")) continue;
        state.assets[path] = await blobToDataUrl(blob);
      } catch (_error) {
        // Mantém silencioso: se o asset não puder ser materializado, a exportação apenas o omitirá.
      }
    }
  }

  // Resolve titulo principal do pacote para nomear o arquivo exportado.
  function getPackageTitle(payload) {
    const scope = payload && payload.packageMeta ? payload.packageMeta.scope : "app";
    if (scope === "course") return payload && payload.course ? payload.course.title : "curso";
    if (scope === "module") return payload && payload.module ? payload.module.title : "modulo";
    if (scope === "lesson") return payload && payload.lesson ? payload.lesson.title : "licao";
    return state.content.appTitle || DEFAULT_APP_TITLE;
  }

  // Sugere nome de arquivo claro para cada backup ZIP.
  function buildPackageFileName(scope, title) {
    if (scope === "app") return DEFAULT_EXPORT_FILE_NAME;
    const safeTitle = slug(String(title || scope), scope).replace(/^-+|-+$/g, "") || scope;
    return "aralearn-" + scope + "-" + safeTitle + ".zip";
  }

  // Constroi entradas fisicas do ZIP a partir do JSON e dos assets declarados.
  function buildPackageZipEntries(payload) {
    const jsonBytes = utf8Encode(JSON.stringify(payload, null, 2));
    const entries = [{ path: PROJECT_PACKAGE_JSON_FILE_NAME, bytes: jsonBytes }];
    const assetPaths = Array.isArray(payload && payload.assets) ? payload.assets : [];

    assetPaths.forEach(function (assetPath) {
      const parsed = dataUrlToBytes(state.assets[assetPath]);
      if (!parsed) return;
      entries.push({ path: assetPath, bytes: parsed.bytes });
    });
    return entries;
  }

  // Gera o pacote ZIP completo do projeto atual para exportação.
  async function buildProjectArchiveBytes() {
    await ensureAssetDataAvailable(collectContentAssetPaths(state.content, null));
    return createZip(buildPackageZipEntries(buildProjectPayload()));
  }

  // Exporta pacote .zip no escopo pedido (app, curso, modulo ou licao).
  async function exportScopedPackage(scope, context) {
    await ensureAssetDataAvailable(collectScopedAssetPaths(scope || "app", context || null));
    const payload = buildScopedPayload(scope || "app", context || null);
    if (!payload) {
      window.alert("Não foi possível montar o pacote de " + getPackageScopeLabel(scope || "app") + ".");
      return;
    }

    const zipBytes = createZip(buildPackageZipEntries(payload));
    const fileName = buildPackageFileName(payload.packageMeta.scope, getPackageTitle(payload));
    const androidExportStatus = tryAndroidExport(zipBytes, fileName, "application/zip");
    if (androidExportStatus !== "unsupported") return;

    const blob = new Blob([zipBytes], { type: "application/zip" });
    saveBlobDownload(blob, fileName);
  }

  // Exporta pacote .zip contendo o projeto inteiro.
  function exportJson() {
    exportScopedPackage("app", null);
  }

  // Tenta delegar a exportacao para o host Android nativo quando o app roda no APK.
  function tryAndroidExport(bytes, fileName, mimeType) {
    if (!isAndroidHostAvailable()) return "unsupported";

    try {
      const handled = window.AndroidHost.saveExportFile(
        bytesToBase64(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || [])),
        String(fileName || DEFAULT_EXPORT_FILE_NAME),
        String(mimeType || "application/octet-stream")
      );
      if (handled === false) {
        window.alert("Nao foi possivel abrir o seletor de exportacao no Android.");
        return "error";
      }
      return "handled";
    } catch (_error) {
      window.alert("Falha ao exportar no Android.");
      return "error";
    }
  }

  // Salva blob via download normal do navegador quando nao estamos no host Android.
  function saveBlobDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = String(fileName || DEFAULT_EXPORT_FILE_NAME);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Abre seletor de arquivo para importar pacote no contêiner atual.
  function triggerImport(targetScope, context) {
    state.ui.pendingImport = Object.assign({ scope: targetScope || "app" }, context || {});
    state.ui.contextMenu = null;
    state.ui.sideOpen = false;
    renderApp();

    const input = document.getElementById("import-json-file");
    if (!input) return;
    input.value = "";
    input.click();
  }

  function readFileAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function (event) {
        resolve(event.target.result);
      };
      reader.onerror = function () {
        reject(reader.error || new Error("Falha ao ler arquivo."));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function parseJsonBytes(bytes, sourceLabel) {
    try {
      return JSON.parse(utf8Decode(bytes));
    } catch (_error) {
      const label = String(sourceLabel || "o arquivo importado");
      throw new Error("JSON inválido em " + label + ".");
    }
  }

  function parsePackageBytes(bytes, fileName) {
    const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    const lowerName = String(fileName || "").toLowerCase();
    const looksLikeZip = lowerName.endsWith(".zip") || isZipBytes(source);
    return looksLikeZip
      ? parseProjectZip(source)
      : normalizeImportedPackagePayload(parseJsonBytes(source, fileName || "o arquivo importado"), {});
  }

  async function parsePackageFile(file) {
    const buffer = await readFileAsArrayBuffer(file);
    return parsePackageBytes(new Uint8Array(buffer), file && file.name ? file.name : "");
  }

  function syncCurrentSelectionAfterContentChange() {
    if (!state.content.courses.length) {
      state.currentCourseId = null;
      state.currentLessonId = null;
      state.currentStepIndex = 0;
      state.currentView = "main_menu";
      return;
    }

    if (!getCourse(state.currentCourseId)) {
      state.currentCourseId = state.content.courses[0].id;
    }

    if (state.currentLessonId && !getCurrentLessonEntry()) {
      state.currentLessonId = null;
      state.currentStepIndex = 0;
      if (state.currentView === "lesson_step") {
        state.currentView = "course_menu";
      }
    }
  }

  function hasWorkspaceContent() {
    return !!(
      (state.content && Array.isArray(state.content.courses) && state.content.courses.length) ||
      (state.content && String(state.content.appTitle || DEFAULT_APP_TITLE) !== DEFAULT_APP_TITLE) ||
      hasProgressEntries(state.progress) ||
      Object.keys(state.assets || {}).length
    );
  }

  function finalizeImportedState(target, importedScope) {
    pruneUnusedAssetsStore();
    pruneProgressStore();
    saveProgressStore();
    persistProjectSnapshot();
    resetTransient();
    closeEditor(false);

    if ((target && target.scope) === "app" && importedScope === "app") {
      state.currentView = "main_menu";
      state.currentCourseId = state.content.courses.length ? state.content.courses[0].id : null;
      state.currentLessonId = null;
      state.currentStepIndex = 0;
      return;
    }

    syncCurrentSelectionAfterContentChange();
  }

  function replaceCurrentProject(imported) {
    if (!imported || imported.scope !== "app") {
      throw new Error("O app inteiro só pode ser substituído por um pacote de aplicação.");
    }
    state.content = imported.content;
    state.progress = normalizeImportedProgress(imported.progress);
    state.assets = normalizeAssetStore(imported.assets);
    finalizeImportedState({ scope: "app" }, "app");
  }

  // Detecta o escopo logico do pacote recebido.
  function detectPackageScope(parsed) {
    const metaScope =
      parsed &&
      parsed.packageMeta &&
      String(parsed.packageMeta.scope || "").trim().toLowerCase();
    if (metaScope === "app" || metaScope === "course" || metaScope === "module" || metaScope === "lesson") {
      return metaScope;
    }

    if (parsed && Array.isArray(parsed.courses)) return "app";
    if (parsed && parsed.course) return "course";
    if (parsed && parsed.module) return "module";
    if (parsed && parsed.lesson) return "lesson";
    return "";
  }

  // Limita os assets importados ao conjunto explicitamente declarado no pacote.
  function normalizeImportedPackageAssets(rawAssets, extractedAssets) {
    if (rawAssets && typeof rawAssets === "object" && !Array.isArray(rawAssets)) {
      return normalizeAssetStore(rawAssets);
    }

    const fromZip = normalizeAssetStore(extractedAssets);
    if (!Array.isArray(rawAssets)) return fromZip;

    const picked = {};
    rawAssets.forEach(function (path) {
      if (fromZip[path]) picked[path] = fromZip[path];
    });
    return picked;
  }

  function collectImportedPackageAssetPaths(imported) {
    if (!imported) return [];
    if (imported.scope === "app") return collectContentAssetPaths(imported.content, null);
    if (imported.scope === "course") return collectCourseAssetPaths(imported.course, null);
    if (imported.scope === "module") return collectModuleAssetPaths(imported.module, null);
    if (imported.scope === "lesson") return collectLessonAssetPaths(imported.lesson, null);
    return [];
  }

  function validateImportedPackageAssets(imported) {
    const assetStore = normalizeAssetStore(imported && imported.assets);
    const missing = collectImportedPackageAssetPaths(imported).filter(function (path) {
      return !assetStore[path];
    });
    if (!missing.length) return;
    throw new Error('Pacote inválido. Asset ausente: "' + missing[0] + '".');
  }

  // Converte o JSON importado em um pacote interno normalizado, independente do escopo.
  function normalizeImportedPackagePayload(parsed, extractedAssets) {
    const scope = detectPackageScope(parsed);
    if (!scope) throw new Error("Estrutura do pacote inválida. O arquivo não informa se é app, curso, módulo ou lição.");

    const progress = normalizeImportedProgress(parsed && parsed.progress);
    const assets = normalizeImportedPackageAssets(parsed && parsed.assets, extractedAssets);
    let imported = null;

    if (scope === "app") {
      imported = {
        scope: "app",
        content: normalizeContent(parsed),
        progress: progress,
        assets: assets,
        packageMeta: parsed && parsed.packageMeta ? parsed.packageMeta : {}
      };
      validateImportedPackageAssets(imported);
      return imported;
    }

    if (scope === "course") {
      const course = normalizeCourse(parsed && parsed.course);
      if (!course) throw new Error('Estrutura do pacote inválida: campo "course" ausente ou inválido.');
      imported = {
        scope: "course",
        course: course,
        progress: progress,
        assets: assets,
        packageMeta: parsed && parsed.packageMeta ? parsed.packageMeta : {}
      };
      validateImportedPackageAssets(imported);
      return imported;
    }

    if (scope === "module") {
      const moduleItem = normalizeModule(parsed && parsed.module);
      if (!moduleItem) throw new Error('Estrutura do pacote inválida: campo "module" ausente ou inválido.');
      imported = {
        scope: "module",
        module: moduleItem,
        progress: progress,
        assets: assets,
        packageMeta: parsed && parsed.packageMeta ? parsed.packageMeta : {}
      };
      validateImportedPackageAssets(imported);
      return imported;
    }

    const lesson = normalizeLesson(parsed && parsed.lesson);
    if (!lesson) throw new Error('Estrutura do pacote inválida: campo "lesson" ausente ou inválido.');
    imported = {
      scope: "lesson",
      lesson: lesson,
      progress: progress,
      assets: assets,
      packageMeta: parsed && parsed.packageMeta ? parsed.packageMeta : {}
    };
    validateImportedPackageAssets(imported);
    return imported;
  }

  function createImportMergeSummary() {
    return {
      coursesAdded: 0,
      modulesAdded: 0,
      lessonsAdded: 0,
      stepsAdded: 0,
      blocksAdded: 0,
      popupBlocksAdded: 0,
      assetsUpdated: 0
    };
  }

  function formatImportMergeCount(count, singular, plural) {
    return count + " " + (count === 1 ? singular : plural);
  }

  function buildImportMergeSummary(summary) {
    const parts = [];
    if (summary.coursesAdded) parts.push(formatImportMergeCount(summary.coursesAdded, "curso novo", "cursos novos"));
    if (summary.modulesAdded) parts.push(formatImportMergeCount(summary.modulesAdded, "módulo novo", "módulos novos"));
    if (summary.lessonsAdded) parts.push(formatImportMergeCount(summary.lessonsAdded, "lição nova", "lições novas"));
    if (summary.stepsAdded) parts.push(formatImportMergeCount(summary.stepsAdded, "card novo", "cards novos"));
    if (summary.blocksAdded) parts.push(formatImportMergeCount(summary.blocksAdded, "bloco novo", "blocos novos"));
    if (summary.popupBlocksAdded) {
      parts.push(formatImportMergeCount(summary.popupBlocksAdded, "bloco de popup novo", "blocos de popup novos"));
    }
    if (summary.assetsUpdated) parts.push(formatImportMergeCount(summary.assetsUpdated, "asset atualizado", "assets atualizados"));
    return parts.join(", ");
  }

  function buildImportMergeMessage(prefix, summary) {
    const details = buildImportMergeSummary(summary);
    return details ? prefix + " com " + details + "." : prefix + ".";
  }

  function cloneWithoutIds(value) {
    if (Array.isArray(value)) {
      return value.map(function (item) {
        return cloneWithoutIds(item);
      });
    }

    if (!value || typeof value !== "object") return value;

    const next = {};
    Object.keys(value).forEach(function (key) {
      if (key === "id") return;
      next[key] = cloneWithoutIds(value[key]);
    });
    return next;
  }

  function getBlockMergeSignature(block) {
    if (!block || typeof block !== "object") return "";
    const source = cloneWithoutIds(block);
    if (isButtonKind(source.kind)) {
      source.popupBlocks = [];
      source.popupEnabled = false;
    }
    return JSON.stringify(source);
  }

  function findBlockMergeMatch(blocks, importedBlock) {
    const list = Array.isArray(blocks) ? blocks : [];
    const importedId = String(importedBlock && importedBlock.id ? importedBlock.id : "").trim();
    if (importedId) {
      const idIndex = list.findIndex(function (block) {
        return String(block && block.id ? block.id : "") === importedId;
      });
      if (idIndex > -1) return { item: list[idIndex], index: idIndex, reason: "id" };
    }

    if (isButtonKind(importedBlock && importedBlock.kind)) {
      const buttonIndex = list.findIndex(function (block) {
        return isButtonKind(block && block.kind);
      });
      if (buttonIndex > -1) return { item: list[buttonIndex], index: buttonIndex, reason: "button" };
    }

    const signature = getBlockMergeSignature(importedBlock);
    if (!signature) return null;

    const signatureIndex = list.findIndex(function (block) {
      return getBlockMergeSignature(block) === signature;
    });
    return signatureIndex > -1 ? { item: list[signatureIndex], index: signatureIndex, reason: "signature" } : null;
  }

  function insertMergedStep(targetLesson, importedStep) {
    const steps = Array.isArray(targetLesson.steps) ? targetLesson.steps : [];
    const stepClone = clone(importedStep);
    const completionIndex = importedStep.type === "lesson_complete"
      ? -1
      : steps.findIndex(function (step) {
        return step && step.type === "lesson_complete";
      });
    const insertIndex = completionIndex > -1 ? completionIndex : steps.length;
    steps.splice(insertIndex, 0, stepClone);
    targetLesson.steps = steps;
  }

  function insertMergedBlock(targetBlocks, importedBlock) {
    const blocks = Array.isArray(targetBlocks) ? targetBlocks : [];
    const blockClone = clone(importedBlock);
    if (isButtonKind(importedBlock && importedBlock.kind)) {
      blocks.push(blockClone);
      return blocks;
    }

    const finalButtonIndex = blocks.findIndex(function (block) {
      return isButtonKind(block && block.kind);
    });
    const insertIndex = finalButtonIndex > -1 ? finalButtonIndex : blocks.length;
    blocks.splice(insertIndex, 0, blockClone);
    return blocks;
  }

  function mergePopupBlocks(targetButton, importedButton, summary) {
    if (!targetButton || !importedButton) return false;

    let changed = false;
    const targetPopupBlocks = Array.isArray(targetButton.popupBlocks) ? targetButton.popupBlocks : [];
    const importedPopupBlocks = Array.isArray(importedButton.popupBlocks) ? importedButton.popupBlocks : [];

    importedPopupBlocks.forEach(function (popupBlock) {
      if (findBlockMergeMatch(targetPopupBlocks, popupBlock)) return;
      targetPopupBlocks.push(clone(popupBlock));
      summary.popupBlocksAdded += 1;
      changed = true;
    });

    targetButton.popupBlocks = targetPopupBlocks;
    if ((importedButton.popupEnabled || targetPopupBlocks.length) && !targetButton.popupEnabled) {
      targetButton.popupEnabled = true;
      changed = true;
    }
    return changed;
  }

  function mergeStepBlocks(targetStep, importedStep, summary) {
    if (!targetStep || !importedStep) return false;

    let changed = false;
    let targetBlocks = Array.isArray(targetStep.blocks) ? targetStep.blocks : [];
    const importedBlocks = Array.isArray(importedStep.blocks) ? importedStep.blocks : [];

    importedBlocks.forEach(function (importedBlock) {
      const match = findBlockMergeMatch(targetBlocks, importedBlock);
      if (match) {
        if (isButtonKind(importedBlock && importedBlock.kind) && mergePopupBlocks(match.item, importedBlock, summary)) {
          changed = true;
        }
        return;
      }

      targetBlocks = insertMergedBlock(targetBlocks, importedBlock);
      summary.blocksAdded += 1;
      changed = true;
    });

    targetStep.blocks = ensureEditorButtonBlock(targetBlocks);
    if (!String(targetStep.title || "").trim() && String(importedStep.title || "").trim()) {
      targetStep.title = importedStep.title;
      changed = true;
    }
    if (!String(targetStep.subtitle || "").trim() && String(importedStep.subtitle || "").trim()) {
      targetStep.subtitle = importedStep.subtitle;
      changed = true;
    }
    if (!getStepCommentValue(targetStep) && getStepCommentValue(importedStep)) {
      targetStep.comment = getStepCommentValue(importedStep);
      changed = true;
    }
    return changed;
  }

  function mergeLessonSteps(targetLesson, importedLesson, summary) {
    if (!targetLesson || !importedLesson) return false;

    let changed = false;
    const targetSteps = Array.isArray(targetLesson.steps) ? targetLesson.steps : [];
    const importedSteps = Array.isArray(importedLesson.steps) ? importedLesson.steps : [];

    importedSteps.forEach(function (importedStep) {
      const match = findImportMatch(targetSteps, importedStep);
      if (!match) {
        insertMergedStep(targetLesson, importedStep);
        summary.stepsAdded += 1;
        changed = true;
        return;
      }

      if (mergeStepBlocks(match.item, importedStep, summary)) {
        changed = true;
      }
    });

    if (!String(targetLesson.subtitle || "").trim() && String(importedLesson.subtitle || "").trim()) {
      targetLesson.subtitle = importedLesson.subtitle;
      changed = true;
    }
    return changed;
  }

  function mergeModuleLessons(targetCourse, targetModule, importedModule, importedProgressRecords, sourceMeta, summary) {
    if (!targetCourse || !targetModule || !importedModule) return false;

    let changed = false;
    const targetLessons = Array.isArray(targetModule.lessons) ? targetModule.lessons : [];
    const importedLessons = Array.isArray(importedModule.lessons) ? importedModule.lessons : [];
    const sourceCourseId = String(sourceMeta && sourceMeta.courseId ? sourceMeta.courseId : "");
    const sourceModuleId = String(sourceMeta && sourceMeta.moduleId ? sourceMeta.moduleId : "");

    importedLessons.forEach(function (importedLesson) {
      const match = findImportMatch(targetLessons, importedLesson);
      if (!match) {
        const inserted = cloneLessonForPlacement(importedLesson, null);
        targetLessons.push(inserted.lesson);
        mergeProgressRecords(remapLessonProgressToPlacement(
          importedProgressRecords,
          sourceCourseId,
          sourceModuleId,
          inserted,
          targetCourse.id,
          targetModule.id
        ));
        summary.lessonsAdded += 1;
        changed = true;
        return;
      }

      if (mergeLessonSteps(match.item, importedLesson, summary)) {
        changed = true;
      }
    });

    targetModule.lessons = targetLessons;
    return changed;
  }

  function mergeCourseModules(targetCourse, importedCourse, importedProgressRecords, summary) {
    if (!targetCourse || !importedCourse) return false;

    let changed = false;
    const targetModules = Array.isArray(targetCourse.modules) ? targetCourse.modules : [];
    const importedModules = Array.isArray(importedCourse.modules) ? importedCourse.modules : [];

    importedModules.forEach(function (importedModule) {
      const match = findImportMatch(targetModules, importedModule);
      if (!match) {
        const inserted = cloneModuleForPlacement(importedModule, null);
        targetModules.push(inserted.module);
        mergeProgressRecords(remapModuleProgressToPlacement(
          importedProgressRecords,
          importedCourse.id,
          inserted,
          targetCourse.id
        ));
        summary.modulesAdded += 1;
        changed = true;
        return;
      }

      if (mergeModuleLessons(targetCourse, match.item, importedModule, importedProgressRecords, {
        courseId: importedCourse.id,
        moduleId: importedModule.id
      }, summary)) {
        changed = true;
      }
    });

    if (!String(targetCourse.description || "").trim() && String(importedCourse.description || "").trim()) {
      targetCourse.description = importedCourse.description;
      changed = true;
    }
    targetCourse.modules = targetModules;
    return changed;
  }

  function normalizeImportChoice(value) {
    const text = String(value || "").trim().toLocaleLowerCase("pt-BR");
    if (text === "m" || text === "mesclar") return "merge";
    if (text === "s" || text === "substituir") return "replace";
    if (text === "d" || text === "duplicar") return "duplicate";
    return "cancel";
  }

  function normalizeImportTitleKey(value) {
    return String(value || "").trim().toLocaleLowerCase("pt-BR");
  }

  function findImportMatch(items, importedItem) {
    const list = Array.isArray(items) ? items : [];
    const importedId = String(importedItem && importedItem.id ? importedItem.id : "").trim();
    if (importedId) {
      const idIndex = list.findIndex(function (item) {
        return String(item && item.id ? item.id : "") === importedId;
      });
      if (idIndex > -1) return { item: list[idIndex], index: idIndex, reason: "id" };
    }

    const importedTitle = normalizeImportTitleKey(importedItem && importedItem.title);
    if (!importedTitle) return null;

    const titleIndex = list.findIndex(function (item) {
      return normalizeImportTitleKey(item && item.title) === importedTitle;
    });
    return titleIndex > -1 ? { item: list[titleIndex], index: titleIndex, reason: "title" } : null;
  }

  function getImportChoicePromptLabel(choice) {
    if (choice === "merge") return "mesclar";
    if (choice === "replace") return "substituir";
    if (choice === "duplicate") return "duplicar";
    return "cancelar";
  }

  function promptImportChoice(scope, existingTitle, importedTitle, locationLabel, allowedChoices, defaultChoice) {
    const label = getPackageScopeLabel(scope);
    const location = locationLabel ? " em " + locationLabel : "";
    const choices = Array.isArray(allowedChoices) && allowedChoices.length
      ? allowedChoices
      : ["merge", "replace", "duplicate", "cancel"];
    const promptChoices = choices.map(getImportChoicePromptLabel).join(", ");
    const answer = window.prompt(
      'Já existe ' +
        label +
        ' "' +
        String(existingTitle || importedTitle || label) +
        '"' +
        location +
        '. Digite ' +
        promptChoices +
        ".",
      getImportChoicePromptLabel(defaultChoice || choices[0] || "merge")
    );
    const choice = normalizeImportChoice(answer);
    return choices.indexOf(choice) > -1 ? choice : "cancel";
  }

  function cloneCourseForDuplicate(sourceCourse) {
    const course = clone(sourceCourse);
    const oldCourseId = String(course.id || "");
    course.id = uid("course");
    return {
      course: course,
      oldCourseId: oldCourseId,
      newCourseId: String(course.id || "")
    };
  }

  function cloneLessonForPlacement(sourceLesson, fixedLessonId) {
    const lesson = clone(sourceLesson);
    const oldLessonId = String(lesson.id || "");
    const stepIdMap = {};

    lesson.id = fixedLessonId || uid("lesson");
    lesson.steps = (Array.isArray(lesson.steps) ? lesson.steps : []).map(function (step) {
      const next = clone(step);
      const oldStepId = String(next.id || "");
      next.id = uid("step");
      if (oldStepId) stepIdMap[oldStepId] = next.id;
      return next;
    });

    return {
      lesson: lesson,
      oldLessonId: oldLessonId,
      newLessonId: String(lesson.id || ""),
      stepIdMap: stepIdMap
    };
  }

  function cloneModuleForPlacement(sourceModule, fixedModuleId) {
    const moduleItem = clone(sourceModule);
    const oldModuleId = String(moduleItem.id || "");
    const lessonMaps = [];

    moduleItem.id = fixedModuleId || uid("module");
    moduleItem.lessons = (Array.isArray(moduleItem.lessons) ? moduleItem.lessons : []).map(function (lesson) {
      const lessonClone = cloneLessonForPlacement(lesson, null);
      lessonMaps.push(lessonClone);
      return lessonClone.lesson;
    });

    return {
      module: moduleItem,
      oldModuleId: oldModuleId,
      newModuleId: String(moduleItem.id || ""),
      lessonMaps: lessonMaps
    };
  }

  function remapProgressRecords(records, overrides) {
    const stepIdMap = overrides && overrides.stepIdMap ? overrides.stepIdMap : {};
    return serializeProgressRecords((Array.isArray(records) ? records : []).map(function (record) {
      const currentStepId = stepIdMap[record.currentStepId] || record.currentStepId;
      const furthestSource = record.furthestStepId || record.currentStepId || "";
      return {
        courseId: overrides.courseId || record.courseId,
        moduleId: overrides.moduleId || record.moduleId,
        lessonId: overrides.lessonId || record.lessonId,
        currentStepId: currentStepId,
        currentIndexHint: record.currentIndexHint,
        furthestStepId: stepIdMap[furthestSource] || furthestSource || currentStepId,
        furthestIndexHint: record.furthestIndexHint,
        updatedAt: record.updatedAt || new Date().toISOString()
      };
    })).lessons;
  }

  function remapLessonProgressToPlacement(records, sourceCourseId, sourceModuleId, lessonClone, targetCourseId, targetModuleId) {
    return remapProgressRecords(
      (Array.isArray(records) ? records : []).filter(function (record) {
        return (
          record.courseId === sourceCourseId &&
          record.moduleId === sourceModuleId &&
          record.lessonId === lessonClone.oldLessonId
        );
      }),
      {
        courseId: targetCourseId,
        moduleId: targetModuleId,
        lessonId: lessonClone.newLessonId,
        stepIdMap: lessonClone.stepIdMap
      }
    );
  }

  function remapModuleProgressToPlacement(records, sourceCourseId, moduleClone, targetCourseId) {
    const lessonMapById = {};
    moduleClone.lessonMaps.forEach(function (item) {
      lessonMapById[item.oldLessonId] = item;
    });

    return serializeProgressRecords((Array.isArray(records) ? records : []).filter(function (record) {
      return record.courseId === sourceCourseId && record.moduleId === moduleClone.oldModuleId;
    }).map(function (record) {
      const lessonClone = lessonMapById[record.lessonId];
      return lessonClone
        ? remapProgressRecords([record], {
          courseId: targetCourseId,
          moduleId: moduleClone.newModuleId,
          lessonId: lessonClone.newLessonId,
          stepIdMap: lessonClone.stepIdMap
        })[0]
        : null;
    }).filter(Boolean)).lessons;
  }

  function buildImportScopeError(targetScope, importedScope) {
    if (targetScope === "app") {
      return (
        "Este ponto aceita pacote de aplicação inteira ou de curso. " +
        "Para importar " +
        getPackageScopeLabel(importedScope) +
        ", abra primeiro o contêiner que vai receber esse conteúdo."
      );
    }

    if (targetScope === "course") {
      return (
        "Este curso aceita pacote de curso ou de módulo. " +
        "Para importar " +
        getPackageScopeLabel(importedScope) +
        ", abra primeiro o contêiner compatível."
      );
    }

    if (targetScope === "module") {
      return (
        "Este módulo aceita pacote de módulo ou de lição. " +
        "Para importar " +
        getPackageScopeLabel(importedScope) +
        ", abra primeiro o contêiner compatível."
      );
    }

    return (
      "Esta lição aceita apenas pacote de lição. " +
      "Abra um contêiner compatível para importar " +
      getPackageScopeLabel(importedScope) +
      "."
    );
  }

  // Mescla registros de progresso importados ao armazenamento principal.
  function mergeProgressRecords(records) {
    (Array.isArray(records) ? records : []).forEach(function (record) {
      const key = lessonProgressKey(record.courseId, record.moduleId, record.lessonId);
      state.progress.lessons[key] = record;
    });
  }

  // Mescla assets importados ao armazenamento do app antes da poda final.
  function mergeImportedAssets(assets) {
    let changed = 0;
    Object.keys(assets || {}).forEach(function (path) {
      if (state.assets[path] === assets[path]) return;
      state.assets[path] = assets[path];
      changed += 1;
    });
    return changed;
  }

  // Mescla apenas assets ainda ausentes, usada no bootstrap do conteúdo hardcoded.
  function mergeMissingAssets(assets) {
    let changed = 0;
    Object.keys(assets || {}).forEach(function (path) {
      if (state.assets[path]) return;
      state.assets[path] = assets[path];
      changed += 1;
    });
    return changed;
  }

  function importCourseIntoApp(importedCourse, importedProgress, importedAssets) {
    const match = findImportMatch(state.content.courses, importedCourse);
    const importedProgressRecords = getProgressRecordsList(importedProgress);

    if (!match) {
      state.content.courses.push(clone(importedCourse));
      mergeProgressRecords(importedProgressRecords);
      mergeImportedAssets(importedAssets);
      return {
        changed: true,
        message: 'Curso "' + importedCourse.title + '" importado no app.'
      };
    }

    const choice = promptImportChoice("course", match.item.title, importedCourse.title, "app");
    if (choice === "cancel") return { changed: false };

    if (choice === "merge") {
      const summary = createImportMergeSummary();
      const changed = mergeCourseModules(match.item, importedCourse, importedProgressRecords, summary);
      summary.assetsUpdated += mergeImportedAssets(importedAssets);
      if (!changed && !summary.assetsUpdated) return { changed: false };
      return {
        changed: true,
        message: buildImportMergeMessage('Curso "' + importedCourse.title + '" mesclado no app', summary)
      };
    }

    if (choice === "replace") {
      const nextCourse = clone(importedCourse);
      nextCourse.id = match.item.id;
      state.content.courses[match.index] = nextCourse;
      clearCourseProgressRecords(match.item.id);
      mergeProgressRecords(remapProgressRecords(importedProgressRecords, {
        courseId: match.item.id
      }));
      mergeImportedAssets(importedAssets);
      return {
        changed: true,
        message: 'Curso "' + importedCourse.title + '" substituiu "' + match.item.title + '".'
      };
    }

    const duplicated = cloneCourseForDuplicate(importedCourse);
    state.content.courses.splice(match.index + 1, 0, duplicated.course);
    mergeProgressRecords(remapProgressRecords(importedProgressRecords, {
      courseId: duplicated.newCourseId
    }));
    mergeImportedAssets(importedAssets);
    return {
      changed: true,
      message: 'Curso "' + importedCourse.title + '" importado como cópia.'
    };
  }

  function importCourseIntoCourseTarget(imported, target) {
    const index = state.content.courses.findIndex(function (course) {
      return course.id === target.courseId;
    });
    if (index === -1) throw new Error("Curso de destino não encontrado para importação.");

    const currentCourse = state.content.courses[index];
    const importedProgressRecords = getProgressRecordsList(imported.progress);
    const choice = promptImportChoice("course", currentCourse.title, imported.course.title, "app");
    if (choice === "cancel") return { changed: false };

    if (choice === "merge") {
      const summary = createImportMergeSummary();
      const changed = mergeCourseModules(currentCourse, imported.course, importedProgressRecords, summary);
      summary.assetsUpdated += mergeImportedAssets(imported.assets);
      if (!changed && !summary.assetsUpdated) return { changed: false };
      return {
        changed: true,
        message: buildImportMergeMessage(
          'Curso "' + imported.course.title + '" mesclado em "' + currentCourse.title + '"',
          summary
        )
      };
    }

    if (choice === "replace") {
      const nextCourse = clone(imported.course);
      nextCourse.id = currentCourse.id;
      state.content.courses[index] = nextCourse;
      clearCourseProgressRecords(currentCourse.id);
      mergeProgressRecords(remapProgressRecords(importedProgressRecords, {
        courseId: currentCourse.id
      }));
      mergeImportedAssets(imported.assets);
      return {
        changed: true,
        message: 'Curso "' + imported.course.title + '" substituiu "' + currentCourse.title + '".'
      };
    }

    const duplicated = cloneCourseForDuplicate(imported.course);
    state.content.courses.splice(index + 1, 0, duplicated.course);
    mergeProgressRecords(remapProgressRecords(importedProgressRecords, {
      courseId: duplicated.newCourseId
    }));
    mergeImportedAssets(imported.assets);
    return {
      changed: true,
      message: 'Curso "' + imported.course.title + '" importado como cópia.'
    };
  }

  function importModuleIntoCourseTarget(imported, target) {
    const course = getCourse((target && target.courseId) || state.currentCourseId);
    if (!course) throw new Error("Curso de destino não encontrado para importação.");

    const match = findImportMatch(course.modules, imported.module);
    const importedProgressRecords = getProgressRecordsList(imported.progress);
    const sourceMeta = imported.packageMeta && imported.packageMeta.source ? imported.packageMeta.source : {};
    if (!match) {
      const inserted = cloneModuleForPlacement(imported.module, null);
      course.modules.push(inserted.module);
      mergeProgressRecords(remapModuleProgressToPlacement(
        importedProgressRecords,
        String(sourceMeta.courseId || ""),
        inserted,
        course.id
      ));
      mergeImportedAssets(imported.assets);
      return {
        changed: true,
        message: 'Módulo "' + imported.module.title + '" importado em "' + course.title + '".'
      };
    }

    const choice = promptImportChoice("module", match.item.title, imported.module.title, 'curso "' + course.title + '"');
    if (choice === "cancel") return { changed: false };

    if (choice === "merge") {
      const summary = createImportMergeSummary();
      const changed = mergeModuleLessons(course, match.item, imported.module, importedProgressRecords, {
        courseId: String(sourceMeta.courseId || ""),
        moduleId: imported.module.id
      }, summary);
      summary.assetsUpdated += mergeImportedAssets(imported.assets);
      if (!changed && !summary.assetsUpdated) return { changed: false };
      return {
        changed: true,
        message: buildImportMergeMessage(
          'Módulo "' + imported.module.title + '" mesclado em "' + course.title + '"',
          summary
        )
      };
    }

    if (choice === "replace") {
      const replaced = cloneModuleForPlacement(imported.module, match.item.id);
      course.modules[match.index] = replaced.module;
      clearModuleProgressRecords(course.id, match.item.id);
      mergeProgressRecords(remapModuleProgressToPlacement(
        importedProgressRecords,
        String(sourceMeta.courseId || ""),
        replaced,
        course.id
      ));
      mergeImportedAssets(imported.assets);
      return {
        changed: true,
        message: 'Módulo "' + imported.module.title + '" substituiu "' + match.item.title + '".'
      };
    }

    const duplicated = cloneModuleForPlacement(imported.module, null);
    course.modules.splice(match.index + 1, 0, duplicated.module);
    mergeProgressRecords(remapModuleProgressToPlacement(
      importedProgressRecords,
      String(sourceMeta.courseId || ""),
      duplicated,
      course.id
    ));
    mergeImportedAssets(imported.assets);
    return {
      changed: true,
      message: 'Módulo "' + imported.module.title + '" importado como cópia em "' + course.title + '".'
    };
  }

  function importModuleIntoModuleTarget(imported, target) {
    const entry = findModule((target && target.courseId) || state.currentCourseId, target && target.moduleId);
    if (!entry) throw new Error("Módulo de destino não encontrado para importação.");

    const importedProgressRecords = getProgressRecordsList(imported.progress);
    const sourceMeta = imported.packageMeta && imported.packageMeta.source ? imported.packageMeta.source : {};
    const choice = promptImportChoice("module", entry.module.title, imported.module.title, 'curso "' + entry.course.title + '"');
    if (choice === "cancel") return { changed: false };

    if (choice === "merge") {
      const summary = createImportMergeSummary();
      const changed = mergeModuleLessons(entry.course, entry.module, imported.module, importedProgressRecords, {
        courseId: String(sourceMeta.courseId || ""),
        moduleId: imported.module.id
      }, summary);
      summary.assetsUpdated += mergeImportedAssets(imported.assets);
      if (!changed && !summary.assetsUpdated) return { changed: false };
      return {
        changed: true,
        message: buildImportMergeMessage(
          'Módulo "' + imported.module.title + '" mesclado em "' + entry.module.title + '"',
          summary
        )
      };
    }

    if (choice === "replace") {
      const replaced = cloneModuleForPlacement(imported.module, entry.module.id);
      entry.course.modules[entry.moduleIndex] = replaced.module;
      clearModuleProgressRecords(entry.course.id, entry.module.id);
      mergeProgressRecords(remapModuleProgressToPlacement(
        importedProgressRecords,
        String(sourceMeta.courseId || ""),
        replaced,
        entry.course.id
      ));
      mergeImportedAssets(imported.assets);
      return {
        changed: true,
        message: 'Módulo "' + imported.module.title + '" substituiu "' + entry.module.title + '".'
      };
    }

    const duplicated = cloneModuleForPlacement(imported.module, null);
    entry.course.modules.splice(entry.moduleIndex + 1, 0, duplicated.module);
    mergeProgressRecords(remapModuleProgressToPlacement(
      importedProgressRecords,
      String(sourceMeta.courseId || ""),
      duplicated,
      entry.course.id
    ));
    mergeImportedAssets(imported.assets);
    return {
      changed: true,
      message: 'Módulo "' + imported.module.title + '" importado como cópia em "' + entry.course.title + '".'
    };
  }

  function importLessonIntoModuleTarget(imported, target) {
    const moduleEntry = findModule((target && target.courseId) || state.currentCourseId, target && target.moduleId);
    if (!moduleEntry) throw new Error("Módulo de destino não encontrado para importação.");

    const match = findImportMatch(moduleEntry.module.lessons, imported.lesson);
    const sourceMeta = imported.packageMeta && imported.packageMeta.source ? imported.packageMeta.source : {};
    const importedProgressRecords = getProgressRecordsList(imported.progress);
    if (!match) {
      const inserted = cloneLessonForPlacement(imported.lesson, null);
      moduleEntry.module.lessons.push(inserted.lesson);
      mergeProgressRecords(remapLessonProgressToPlacement(
        importedProgressRecords,
        String(sourceMeta.courseId || ""),
        String(sourceMeta.moduleId || ""),
        inserted,
        moduleEntry.course.id,
        moduleEntry.module.id
      ));
      mergeImportedAssets(imported.assets);
      return {
        changed: true,
        message: 'Lição "' + imported.lesson.title + '" importada em "' + moduleEntry.module.title + '".'
      };
    }

    const choice = promptImportChoice("lesson", match.item.title, imported.lesson.title, 'módulo "' + moduleEntry.module.title + '"');
    if (choice === "cancel") return { changed: false };

    if (choice === "merge") {
      const summary = createImportMergeSummary();
      const changed = mergeLessonSteps(match.item, imported.lesson, summary);
      summary.assetsUpdated += mergeImportedAssets(imported.assets);
      if (!changed && !summary.assetsUpdated) return { changed: false };
      return {
        changed: true,
        message: buildImportMergeMessage(
          'Lição "' + imported.lesson.title + '" mesclada em "' + moduleEntry.module.title + '"',
          summary
        )
      };
    }

    if (choice === "replace") {
      const replaced = cloneLessonForPlacement(imported.lesson, match.item.id);
      moduleEntry.module.lessons[match.index] = replaced.lesson;
      clearLessonProgressRecord(moduleEntry.course.id, moduleEntry.module.id, match.item.id);
      mergeProgressRecords(remapLessonProgressToPlacement(
        importedProgressRecords,
        String(sourceMeta.courseId || ""),
        String(sourceMeta.moduleId || ""),
        replaced,
        moduleEntry.course.id,
        moduleEntry.module.id
      ));
      mergeImportedAssets(imported.assets);
      return {
        changed: true,
        message: 'Lição "' + imported.lesson.title + '" substituiu "' + match.item.title + '".'
      };
    }

    const duplicated = cloneLessonForPlacement(imported.lesson, null);
    moduleEntry.module.lessons.splice(match.index + 1, 0, duplicated.lesson);
    mergeProgressRecords(remapLessonProgressToPlacement(
      importedProgressRecords,
      String(sourceMeta.courseId || ""),
      String(sourceMeta.moduleId || ""),
      duplicated,
      moduleEntry.course.id,
      moduleEntry.module.id
    ));
    mergeImportedAssets(imported.assets);
    return {
      changed: true,
      message: 'Lição "' + imported.lesson.title + '" importada como cópia em "' + moduleEntry.module.title + '".'
    };
  }

  function importLessonIntoLessonTarget(imported, target) {
    const moduleEntry = findModule((target && target.courseId) || state.currentCourseId, target && target.moduleId);
    if (!moduleEntry) throw new Error("Módulo da lição de destino não encontrado.");

    const lessonIndex = moduleEntry.module.lessons.findIndex(function (lessonItem) {
      return lessonItem.id === target.lessonId;
    });
    if (lessonIndex === -1) throw new Error("Lição de destino não encontrada para importação.");

    const currentLesson = moduleEntry.module.lessons[lessonIndex];
    const sourceMeta = imported.packageMeta && imported.packageMeta.source ? imported.packageMeta.source : {};
    const importedProgressRecords = getProgressRecordsList(imported.progress);
    const choice = promptImportChoice("lesson", currentLesson.title, imported.lesson.title, 'módulo "' + moduleEntry.module.title + '"');
    if (choice === "cancel") return { changed: false };

    if (choice === "merge") {
      const summary = createImportMergeSummary();
      const changed = mergeLessonSteps(currentLesson, imported.lesson, summary);
      summary.assetsUpdated += mergeImportedAssets(imported.assets);
      if (!changed && !summary.assetsUpdated) return { changed: false };
      return {
        changed: true,
        message: buildImportMergeMessage(
          'Lição "' + imported.lesson.title + '" mesclada em "' + currentLesson.title + '"',
          summary
        )
      };
    }

    if (choice === "replace") {
      const replaced = cloneLessonForPlacement(imported.lesson, currentLesson.id);
      moduleEntry.module.lessons[lessonIndex] = replaced.lesson;
      clearLessonProgressRecord(moduleEntry.course.id, moduleEntry.module.id, currentLesson.id);
      mergeProgressRecords(remapLessonProgressToPlacement(
        importedProgressRecords,
        String(sourceMeta.courseId || ""),
        String(sourceMeta.moduleId || ""),
        replaced,
        moduleEntry.course.id,
        moduleEntry.module.id
      ));
      mergeImportedAssets(imported.assets);
      return {
        changed: true,
        message: 'Lição "' + imported.lesson.title + '" substituiu "' + currentLesson.title + '".'
      };
    }

    const duplicated = cloneLessonForPlacement(imported.lesson, null);
    moduleEntry.module.lessons.splice(lessonIndex + 1, 0, duplicated.lesson);
    mergeProgressRecords(remapLessonProgressToPlacement(
      importedProgressRecords,
      String(sourceMeta.courseId || ""),
      String(sourceMeta.moduleId || ""),
      duplicated,
      moduleEntry.course.id,
      moduleEntry.module.id
    ));
    mergeImportedAssets(imported.assets);
    return {
      changed: true,
      message: 'Lição "' + imported.lesson.title + '" importada como cópia em "' + moduleEntry.module.title + '".'
    };
  }

  function mergeAppPackageIntoWorkspace(imported) {
    const summary = createImportMergeSummary();
    let changed = false;
    const importedProgressRecords = getProgressRecordsList(imported.progress);
    const importedContent = imported && imported.content ? imported.content : emptyContent();
    const importedCourses = Array.isArray(importedContent.courses) ? importedContent.courses : [];
    const incomingTitle = clean(importedContent.appTitle, DEFAULT_APP_TITLE);

    if (
      (!String(state.content.appTitle || "").trim() || state.content.appTitle === DEFAULT_APP_TITLE) &&
      incomingTitle &&
      incomingTitle !== DEFAULT_APP_TITLE
    ) {
      state.content.appTitle = incomingTitle;
      changed = true;
    }

    importedCourses.forEach(function (importedCourse) {
      const match = findImportMatch(state.content.courses, importedCourse);
      if (!match) {
        state.content.courses.push(clone(importedCourse));
        mergeProgressRecords(importedProgressRecords.filter(function (record) {
          return record.courseId === importedCourse.id;
        }));
        summary.coursesAdded += 1;
        changed = true;
        return;
      }

      if (mergeCourseModules(match.item, importedCourse, importedProgressRecords, summary)) {
        changed = true;
      }
    });

    summary.assetsUpdated += mergeImportedAssets(imported.assets);
    if (!changed && !summary.assetsUpdated) return { changed: false };
    return {
      changed: true,
      message: buildImportMergeMessage("Projeto mesclado", summary)
    };
  }

  // Aplica um pacote no contêiner atual, adaptando-se ao escopo real do arquivo.
  function applyImportedPackage(imported, target) {
    const targetScope = (target && target.scope) || "app";

    if (targetScope === "app") {
      if (imported.scope === "app") {
        if (!hasWorkspaceContent()) {
          state.content = imported.content;
          state.progress = normalizeImportedProgress(imported.progress);
          state.assets = normalizeAssetStore(imported.assets);
          return { changed: true, importedScope: "app" };
        }

        const choice = promptImportChoice(
          "app",
          state.content.appTitle || DEFAULT_APP_TITLE,
          imported.content.appTitle || DEFAULT_APP_TITLE,
          "app",
          ["merge", "replace", "cancel"],
          "merge"
        );
        if (choice === "cancel") return { changed: false };
        if (choice === "merge") {
          return Object.assign({ importedScope: "app" }, mergeAppPackageIntoWorkspace(imported));
        }

        state.content = imported.content;
        state.progress = normalizeImportedProgress(imported.progress);
        state.assets = normalizeAssetStore(imported.assets);
        return { changed: true, importedScope: "app" };
      }
      if (imported.scope === "course") {
        return Object.assign({ importedScope: "course" }, importCourseIntoApp(imported.course, imported.progress, imported.assets));
      }
      throw new Error(buildImportScopeError(targetScope, imported.scope));
    }

    if (targetScope === "course") {
      if (imported.scope === "course") {
        return Object.assign({ importedScope: "course" }, importCourseIntoCourseTarget(imported, target));
      }
      if (imported.scope === "module") {
        return Object.assign({ importedScope: "module" }, importModuleIntoCourseTarget(imported, target));
      }
      throw new Error(buildImportScopeError(targetScope, imported.scope));
    }

    if (targetScope === "module") {
      if (imported.scope === "module") {
        return Object.assign({ importedScope: "module" }, importModuleIntoModuleTarget(imported, target));
      }
      if (imported.scope === "lesson") {
        return Object.assign({ importedScope: "lesson" }, importLessonIntoModuleTarget(imported, target));
      }
      throw new Error(buildImportScopeError(targetScope, imported.scope));
    }

    if (imported.scope !== "lesson") {
      throw new Error(buildImportScopeError(targetScope, imported.scope));
    }
    return Object.assign({ importedScope: "lesson" }, importLessonIntoLessonTarget(imported, target));
  }

  // Importa ZIP (preferencial) ou JSON, detecta o escopo e adapta ao contêiner atual.
  function importJson(file) {
    if (!file) {
      state.ui.pendingImport = null;
      return;
    }

    const pendingImport = clone(state.ui.pendingImport || { scope: "app" });

    parsePackageFile(file)
      .then(function (imported) {
        const result = applyImportedPackage(imported, pendingImport);
        state.ui.pendingImport = null;
        if (!result || !result.changed) return;
        finalizeImportedState(pendingImport, result.importedScope || imported.scope);
        renderApp();
        if (result.message) window.alert(result.message);
      })
      .catch(function (error) {
        state.ui.pendingImport = null;
        window.alert((error && error.message) || "Arquivo inválido. Use pacote ZIP/JSON exportado pelo app.");
        renderApp();
      });
  }

  // Verifica assinatura PK inicial de arquivo ZIP.
  function isZipBytes(value) {
    const bytes = value instanceof Uint8Array
      ? value
      : (value instanceof ArrayBuffer ? new Uint8Array(value) : null);
    if (!bytes) return false;
    return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  }

  // Extrai pacote completo de um ZIP exportado pelo app.
  function parseProjectZip(zipBytes) {
    const entries = parseZip(zipBytes);
    const byPath = {};
    entries.forEach(function (entry) {
      byPath[entry.path] = entry;
    });

    const jsonEntry =
      byPath[PROJECT_PACKAGE_JSON_FILE_NAME] ||
      entries.find(function (entry) {
        return entry.path.toLowerCase() === PROJECT_PACKAGE_JSON_FILE_NAME;
      });
    if (!jsonEntry) throw new Error("ZIP válido, mas faltou o arquivo project.json.");

    const parsed = parseJsonBytes(jsonEntry.bytes, jsonEntry.path || PROJECT_PACKAGE_JSON_FILE_NAME);
    const assets = {};
    entries.forEach(function (entry) {
      if (!/^assets\/images\//i.test(entry.path)) return;
      const mime = mimeFromExtension(entry.path) || "image/png";
      assets[entry.path] = bytesToDataUrl(entry.bytes, mime);
    });

    return normalizeImportedPackagePayload(parsed, assets);
  }

  // Abre seletor de imagem para bloco de imagem no editor.
  function pickEditorImage() {
    const input = document.getElementById("editor-image-file");
    if (!input) return;
    input.value = "";
    input.click();
  }

  // Lê imagem selecionada e aplica ao bloco de imagem.
  function importEditorImage(file) {
    if (!file || !state.editor.open || !state.editor.imageTarget) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const data = String(event.target.result || "");
      const target = state.editor.imageTarget || {};
      const block = (state.editor.form && Array.isArray(state.editor.form.blocks) ? state.editor.form.blocks : []).find(function (item) {
        return item.id === target.blockId;
      });
      if (block) block.value = data;
      state.editor.imageTarget = null;
      renderApp();
    };
    reader.readAsDataURL(file);
  }

  // ============================================================================
  // Eventos da Interface (Clique, Input e Drag)
  // ============================================================================
  // Roteia todos os cliques da interface via data-action.
  function onRootClick(event) {
    handleEditorBlockSurfaceClick(event);
    const trigger = event.target.closest("[data-action]");
    if (!trigger) return;
    if (
      (typeof trigger.matches === "function" && trigger.matches(":disabled")) ||
      trigger.getAttribute("aria-disabled") === "true"
    ) {
      return;
    }

    const action = trigger.getAttribute("data-action");

    switch (action) {
      case "toggle-side": toggleSideMenu(); return;
      case "go-main": goMain(); return;
      case "open-course": goCourse(trigger.getAttribute("data-course-id")); return;
      case "open-lesson": openLesson(trigger.getAttribute("data-lesson-id")); return;
      case "lesson-home": goCourse(state.currentCourseId); return;
      case "back-step": prevStep(); return;
      case "exit-lesson": goCourse(state.currentCourseId); return;
      case "continue-step": nextStep(); return;
      case "complete-continue": goCourse(state.currentCourseId); return;
      case "toggle-step-comment": toggleStepCommentEditor(); return;
      case "toggle-lesson-quick": toggleLessonQuick(); return;
      case "step-button-click": {
        const step = getCurrentStep();
        if (!step) return;
        const gate = getStepEditorGate(step);
        if (gate.requiresSolve && !gate.solved) {
          const validation = validateStepEditorExercises(step);
          renderApp();
          if (validation.hasExercise && validation.status !== "correct") return;
        }
        const popup = trigger.getAttribute("data-popup") === "1";
        closeStepCommentEditor({ render: false });
        if (popup) {
          state.inlinePopupOpen = { stepId: step.id, blockId: trigger.getAttribute("data-block-id") || "" };
          renderApp();
          return;
        }
        if (step.type === "lesson_complete") {
          goCourse(state.currentCourseId);
          return;
        }
        nextStep();
        return;
      }
      case "popup-continue": {
        closeStepCommentEditor({ render: false });
        const step = getCurrentStep();
        if (step) {
          const popupValidation = validateInteractiveBlocks(step, getOpenPopupInteractiveBlocks(step));
          if (popupValidation.hasExercise && popupValidation.status !== "correct") {
            renderApp();
            return;
          }

          const gate = getStepEditorGate(step);
          if (gate.requiresSolve && !gate.solved) {
            const validation = validateStepEditorExercises(step);
            renderApp();
            if (validation.hasExercise && validation.status !== "correct") return;
          }
        }
        if (step && step.type === "lesson_complete") {
          goCourse(state.currentCourseId);
          return;
        }
        nextStep();
        return;
      }
      case "step-editor-reset": {
        const step = getCurrentStep();
        if (!step) return;
        resetStepEditorExercises(step);
        renderApp();
        return;
      }
      case "table-choice-cell":
        tableChoiceCellClick(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-cell-key")
        );
        return;
      case "table-choice-option":
        tableChoiceOptionClick(
          trigger.getAttribute("data-block-id"),
          decodeURIComponent(trigger.getAttribute("data-option-value") || "")
        );
        return;
      case "table-view-answer":
        tableViewAnswer(trigger.getAttribute("data-block-id"));
        return;
      case "table-try-again":
        tableTryAgain(trigger.getAttribute("data-block-id"));
        return;
      case "terminal-option":
        terminalOptionClick(trigger.getAttribute("data-block-id"), decodeURIComponent(trigger.getAttribute("data-option") || ""));
        return;
      case "terminal-slot":
        terminalSlotClick(trigger.getAttribute("data-block-id"), Number(trigger.getAttribute("data-slot-index")));
        return;
      case "terminal-reset":
        terminalReset(trigger.getAttribute("data-block-id"));
        return;
      case "terminal-view-answer":
        terminalViewAnswer(trigger.getAttribute("data-block-id"));
        return;
      case "terminal-try-again":
        terminalTryAgain(trigger.getAttribute("data-block-id"));
        return;
      case "flowchart-open-shape":
        flowchartOpenPopup(trigger.getAttribute("data-block-id"), trigger.getAttribute("data-node-id"), "shape");
        return;
      case "flowchart-open-text":
        flowchartOpenPopup(trigger.getAttribute("data-block-id"), trigger.getAttribute("data-node-id"), "text");
        return;
      case "flowchart-zoom-in":
        setFlowchartViewportScale(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-flowchart-mode"),
          getFlowchartViewportScale(
            trigger.getAttribute("data-block-id"),
            trigger.getAttribute("data-flowchart-mode"),
            getFlowchartDefaultViewportScale(getAnyCachedFlowchartLayout(trigger.getAttribute("data-block-id")))
          ) * 1.16
        );
        return;
      case "flowchart-zoom-out":
        setFlowchartViewportScale(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-flowchart-mode"),
          getFlowchartViewportScale(
            trigger.getAttribute("data-block-id"),
            trigger.getAttribute("data-flowchart-mode"),
            getFlowchartDefaultViewportScale(getAnyCachedFlowchartLayout(trigger.getAttribute("data-block-id")))
          ) / 1.16
        );
        return;
      case "flowchart-zoom-reset":
        setFlowchartViewportScale(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-flowchart-mode"),
          getFlowchartDefaultViewportScale(getAnyCachedFlowchartLayout(trigger.getAttribute("data-block-id")))
        );
        return;
      case "flowchart-focus-node-shape":
        focusFlowchartNodeField(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-node-id"),
          "shape"
        );
        return;
      case "flowchart-focus-node-text":
        focusFlowchartNodeField(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-node-id"),
          "text"
        );
        return;
      case "flowchart-set-shape":
        flowchartSetShape(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-node-id"),
          trigger.getAttribute("data-shape")
        );
        return;
      case "flowchart-set-text":
        flowchartSetText(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-node-id"),
          decodeURIComponent(trigger.getAttribute("data-text") || "")
        );
        return;
      case "flowchart-clear-choice":
        flowchartClearChoice(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-node-id"),
          trigger.getAttribute("data-choice-kind")
        );
        return;
      case "flowchart-view-answer":
        flowchartViewAnswer(trigger.getAttribute("data-block-id"));
        return;
      case "flowchart-try-again":
        flowchartTryAgain(trigger.getAttribute("data-block-id"));
        return;
      case "open-context":
        openContextMenu({
          kind: trigger.getAttribute("data-kind"),
          courseId: trigger.getAttribute("data-course-id"),
          moduleId: trigger.getAttribute("data-module-id"),
          lessonId: trigger.getAttribute("data-lesson-id")
        });
        return;
      case "context-edit": contextActionEdit(); return;
      case "context-module-up": contextActionMoveModule("up"); return;
      case "context-module-down": contextActionMoveModule("down"); return;
      case "context-move-up": contextActionMove("up"); return;
      case "context-move-down": contextActionMove("down"); return;
      case "context-reset": contextActionReset(); return;
      case "context-delete": contextActionDelete(); return;
      case "context-create-lesson": contextActionCreateLesson(); return;
      case "context-import-course":
        triggerImport("course", state.ui.contextMenu);
        return;
      case "context-export-course":
        exportScopedPackage("course", state.ui.contextMenu);
        state.ui.contextMenu = null;
        renderApp();
        return;
      case "context-import-module":
        triggerImport("module", state.ui.contextMenu);
        return;
      case "context-export-module":
        exportScopedPackage("module", state.ui.contextMenu);
        state.ui.contextMenu = null;
        renderApp();
        return;
      case "context-import-lesson":
        triggerImport("lesson", state.ui.contextMenu);
        return;
      case "context-export-lesson":
        exportScopedPackage("lesson", state.ui.contextMenu);
        state.ui.contextMenu = null;
        renderApp();
        return;
      case "step-insert-before": openStepEditor("insert_before"); return;
      case "step-insert-after": openStepEditor("insert_after"); return;
      case "step-edit": openStepEditor("edit"); return;
      case "step-delete": deleteCurrentStep(); return;
      case "editor-close": closeEditor(); return;
      case "editor-save": saveEditor(); return;
      case "editor-prev-step": moveEditorCardFocus(-1); return;
      case "editor-next-step": moveEditorCardFocus(1); return;
      case "editor-open-step":
        switchEditorStepByIndex(Number(trigger.getAttribute("data-editor-step-index")));
        return;
      case "palette-add":
        addBlock(trigger.getAttribute("data-block-type"));
        return;
      case "block-style-bold":
        applyBlockTextStyle(trigger.getAttribute("data-block-id"), "bold");
        return;
      case "block-style-italic":
        applyBlockTextStyle(trigger.getAttribute("data-block-id"), "italic");
        return;
      case "open-tone-picker":
        openTonePicker(trigger.getAttribute("data-block-id"));
        return;
      case "tone-picker-close":
        closeTonePicker();
        return;
      case "tone-picker-apply":
        applyTonePicker(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-tone-id")
        );
        return;
      case "block-style-indent":
        applyBlockTextStyle(trigger.getAttribute("data-block-id"), "indent");
        return;
      case "block-align-left":
        setBlockAlign(trigger.getAttribute("data-block-id"), "left");
        return;
      case "block-align-center":
        setBlockAlign(trigger.getAttribute("data-block-id"), "center");
        return;
      case "block-align-right":
        setBlockAlign(trigger.getAttribute("data-block-id"), "right");
        return;
      case "table-add-column":
        addTableColumn(trigger.getAttribute("data-block-id"));
        return;
      case "table-remove-column":
        removeTableColumn(
          trigger.getAttribute("data-block-id"),
          Number(trigger.getAttribute("data-column-index"))
        );
        return;
      case "table-add-row":
        addTableRow(trigger.getAttribute("data-block-id"));
        return;
      case "table-remove-row":
        removeTableRow(
          trigger.getAttribute("data-block-id"),
          Number(trigger.getAttribute("data-row-index"))
        );
        return;
      case "table-style-bold":
        toggleActiveTableCellFlag(trigger.getAttribute("data-block-id"), "bold");
        return;
      case "table-style-italic":
        toggleActiveTableCellFlag(trigger.getAttribute("data-block-id"), "italic");
        return;
      case "table-choice-add-option":
        addActiveTableCellOption(trigger.getAttribute("data-block-id"));
        return;
      case "table-choice-remove-option":
        removeActiveTableCellOption(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-option-id")
        );
        return;
      case "table-open-tone-picker":
        openTableTonePicker(trigger.getAttribute("data-block-id"));
        return;
      case "table-align-left":
        setActiveTableCellAlign(trigger.getAttribute("data-block-id"), "left");
        return;
      case "table-align-center":
        setActiveTableCellAlign(trigger.getAttribute("data-block-id"), "center");
        return;
      case "table-align-right":
        setActiveTableCellAlign(trigger.getAttribute("data-block-id"), "right");
        return;
      case "choice-add-option":
        addMultipleChoiceOption(trigger.getAttribute("data-block-id"));
        return;
      case "choice-toggle-answer":
        toggleMultipleChoiceOptionAnswer(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-option-id")
        );
        return;
      case "choice-remove-option":
        removeMultipleChoiceOption(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-option-id")
        );
        return;
      case "simulator-add-option":
        addSimulatorOption(trigger.getAttribute("data-block-id"));
        return;
      case "simulator-remove-option":
        removeSimulatorOption(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-option-id")
        );
        return;
      case "multiple-choice-toggle":
        multipleChoiceToggleOption(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-option-id")
        );
        return;
      case "simulator-select":
        simulatorSelect(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-option-id")
        );
        return;
      case "multiple-choice-view-answer":
        multipleChoiceViewAnswer(trigger.getAttribute("data-block-id"));
        return;
      case "multiple-choice-try-again":
        multipleChoiceTryAgain(trigger.getAttribute("data-block-id"));
        return;
      case "button-edit-popup":
        openPopupBuilder(trigger.getAttribute("data-block-id"));
        return;
      case "popup-builder-close":
        closePopupBuilder();
        return;
      case "popup-builder-save":
        savePopupBuilder();
        return;
      case "terminal-add-option":
        addTerminalOption(trigger.getAttribute("data-block-id"));
        return;
      case "terminal-toggle-option":
        toggleTerminalOption(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-option-id")
        );
        return;
      case "terminal-remove-option":
        removeTerminalOption(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-option-id")
        );
        return;
      case "editor-slot-add-variant":
        addEditorInputVariant(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-option-id")
        );
        return;
      case "editor-slot-toggle-regex":
        toggleEditorInputPrimaryRegex(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-option-id")
        );
        return;
      case "editor-slot-toggle-variant-regex":
        toggleEditorInputVariantRegex(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-option-id"),
          Number(trigger.getAttribute("data-variant-index"))
        );
        return;
      case "editor-slot-remove-variant":
        removeEditorInputVariant(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-option-id"),
          Number(trigger.getAttribute("data-variant-index"))
        );
        return;
      case "flowchart-add-node":
        addFlowchartNode(trigger.getAttribute("data-block-id"));
        return;
      case "flowchart-move-node-up":
        moveFlowchartNode(trigger.getAttribute("data-block-id"), trigger.getAttribute("data-node-id"), "up");
        return;
      case "flowchart-move-node-down":
        moveFlowchartNode(trigger.getAttribute("data-block-id"), trigger.getAttribute("data-node-id"), "down");
        return;
      case "flowchart-select-node-shape-answer":
        selectFlowchartNodeShapeAnswer(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-node-id"),
          Number(trigger.getAttribute("data-option-index"))
        );
        return;
      case "flowchart-select-node-text-answer":
        selectFlowchartNodeTextAnswer(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-node-id"),
          Number(trigger.getAttribute("data-option-index"))
        );
        return;
      case "flowchart-add-node-shape-option":
        addFlowchartNodeShapeOption(trigger.getAttribute("data-block-id"), trigger.getAttribute("data-node-id"));
        return;
      case "flowchart-remove-node-shape-option":
        removeFlowchartNodeShapeOption(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-node-id"),
          Number(trigger.getAttribute("data-option-index"))
        );
        return;
      case "flowchart-add-node-text-option":
        addFlowchartNodeTextOption(trigger.getAttribute("data-block-id"), trigger.getAttribute("data-node-id"));
        return;
      case "flowchart-remove-node-text-option":
        removeFlowchartNodeTextOption(
          trigger.getAttribute("data-block-id"),
          trigger.getAttribute("data-node-id"),
          Number(trigger.getAttribute("data-option-index"))
        );
        return;
      case "flowchart-remove-node":
        removeFlowchartNode(trigger.getAttribute("data-block-id"), trigger.getAttribute("data-node-id"));
        return;
      case "block-remove": removeBlock(trigger.getAttribute("data-block-id")); return;
      case "block-up": moveBlock(trigger.getAttribute("data-block-id"), "up"); return;
      case "block-down": moveBlock(trigger.getAttribute("data-block-id"), "down"); return;
      case "block-pick-image":
        snapshotEditorFromDom();
        state.editor.imageTarget = {
          scope: "main",
          blockId: trigger.getAttribute("data-block-id")
        };
        pickEditorImage();
        return;
      case "create-course": createCourse(); return;
      case "edit-app-title": editAppTitle(); return;
      case "create-module": createModule(); return;
      case "import-json-trigger": triggerImport("app", null); return;
      case "export-json": exportJson(); return;
      default: return;
    }
  }

  // Trata eventos change (checkboxes, importacao etc.).
  function onRootChange(event) {
    const target = event.target;
    if (!target) return;

    if (target.matches("[data-button-popup]")) {
      const node = target.closest(".builder-block");
      if (node) {
        syncButtonPopupFields(node, target.checked);
      }
      return;
    }

    if (state.editor.open && target.matches("[data-choice-answer-state]")) {
      setActiveEditorBlock(target.getAttribute("data-block-id"));
      setMultipleChoiceAnswerState(target.getAttribute("data-block-id"), target.value);
      return;
    }

    if (state.editor.open && target.matches("[data-table-cell-blank-mode]")) {
      setActiveEditorBlock(target.getAttribute("data-block-id"));
      setActiveTableCellBlankState(target.getAttribute("data-block-id"), target.value === "blank");
      return;
    }

    if (state.editor.open && target.matches("[data-table-cell-interaction]")) {
      setActiveEditorBlock(target.getAttribute("data-block-id"));
      setActiveTableCellInteractionMode(target.getAttribute("data-block-id"), target.value);
      return;
    }

    if (
      state.editor.open &&
      target.matches("[data-editor-interaction]")
    ) {
      setActiveEditorBlock(target.getAttribute("data-block-id"));
      snapshotEditorFromDom();
      renderApp();
      return;
    }

    if (
      state.editor.open &&
      target.matches(
        "[data-flowchart-node-shape], [data-flowchart-node-text], [data-flowchart-node-output], [data-flowchart-node-output-label], [data-flowchart-node-shape-option], [data-flowchart-node-text-option]"
      )
    ) {
      snapshotEditorFromDom();
      renderApp();
      return;
    }

    if (target.id === "import-json-file") {
      importJson(target.files && target.files[0]);
      return;
    }

    if (target.id === "editor-image-file") {
      importEditorImage(target.files && target.files[0]);
    }
  }

  // Trata eventos input para sincronizacao em tempo real no editor.
  function onRootInput(event) {
    const target = event.target;
    if (!target) return;

    if (target.matches("[data-step-comment-input]")) {
      updateStepCommentDraft(target.value);
      return;
    }

    if (target.matches("[data-table-inline-input]")) {
      setTableInputDraft(
        target.getAttribute("data-block-id"),
        target.getAttribute("data-cell-key"),
        target.value
      );
      return;
    }

    if (target.matches("[data-terminal-inline-input]")) {
      setTerminalInputDraft(
        target.getAttribute("data-block-id"),
        Number(target.getAttribute("data-slot-index")),
        target.value
      );
      syncTerminalInlineInputWidth(target);
      return;
    }

    if (!state.editor.open) return;

    if (target.matches("[data-template-rich-input]")) {
      const blockId = target.getAttribute("data-block-id");
      setActiveEditorBlock(blockId);
      if (target.matches("[data-terminal-template]")) {
        syncTerminalTemplateBlockFromNode(blockId, target);
      } else if (target.matches("[data-simulator-template]")) {
        syncSimulatorTemplateBlockFromNode(blockId, target);
      }
      syncBlockTextStyleTools(blockId);
      return;
    }

    if (target.matches("[data-block-rich-input]")) {
      const blockNode = target.closest(".builder-block");
      if (!blockNode) return;
      const blockId = blockNode.getAttribute("data-block-id");
      setActiveEditorBlock(blockId);
      syncParagraphBlockFromNode(blockId, target);
      syncBlockTextStyleTools(blockId);
      return;
    }

    if (target.matches("[data-terminal-option]")) {
      const blockId = target.getAttribute("data-block-id");
      setActiveEditorBlock(blockId);
      syncTerminalOptionToTemplate(blockId, target.getAttribute("data-option-id"), target.value);
      return;
    }

    if (target.matches("[data-editor-slot-answer]")) {
      const blockId = target.getAttribute("data-block-id");
      setActiveEditorBlock(blockId);
      syncTerminalInputAnswerToTemplate(
        blockId,
        target.getAttribute("data-option-id"),
        target.value
      );
      return;
    }

    if (target.matches("[data-editor-slot-variant]")) {
      const blockId = target.getAttribute("data-block-id");
      setActiveEditorBlock(blockId);
      syncTerminalInputVariant(
        blockId,
        target.getAttribute("data-option-id"),
        Number(target.getAttribute("data-variant-index")),
        target.value
      );
      return;
    }

    if (target.matches("[data-choice-option], [data-simulator-label], [data-simulator-output]")) {
      setActiveEditorBlock(target.getAttribute("data-block-id"));
      return;
    }

    if (target.matches("[data-table-cell-placeholder-input]")) {
      setActiveEditorBlock(target.getAttribute("data-block-id"));
      syncActiveTableCellPlaceholderValue(target.getAttribute("data-block-id"), target.value);
      return;
    }

    if (target.matches("[data-table-choice-option-input]")) {
      setActiveEditorBlock(target.getAttribute("data-block-id"));
      syncActiveTableCellOptionValue(
        target.getAttribute("data-block-id"),
        target.getAttribute("data-option-id"),
        target.value
      );
      return;
    }

    if (target.matches("[data-table-header-cell], [data-table-cell], [data-table-title]")) {
      const blockNode = target.closest(".builder-block");
      if (!blockNode) return;
      setActiveEditorBlock(blockNode.getAttribute("data-block-id"));
      if (target.matches("[data-table-header-cell], [data-table-cell], [data-table-title]")) {
        setActiveTableCell(getTableCellRefFromField(target));
      }
      syncTableEditorColumnWidths(blockNode);
      return;
    }

  }

  // Habilita/desabilita campos de popup do bloco botao.
  function syncButtonPopupFields(blockNode, enabled) {
    const popupMeta = blockNode ? blockNode.querySelector(".button-popup-meta") : null;
    if (popupMeta) popupMeta.classList.toggle("disabled", !enabled);

    const editButton = blockNode ? blockNode.querySelector('[data-action="button-edit-popup"]') : null;
    if (editButton) {
      editButton.disabled = !enabled;
      editButton.classList.toggle("disabled-icon", !enabled);
      if (enabled) editButton.removeAttribute("aria-disabled");
      else editButton.setAttribute("aria-disabled", "true");
    }

    const blockId = blockNode ? blockNode.getAttribute("data-block-id") : "";
    const block = getEditorBlock(blockId);
    if (block && block.kind === "button") block.popupEnabled = !!enabled;
  }

  // Busca índice estrutural de uma opção do Editor pelo ID estável.
  function getEditorOptionIndexById(options, optionId) {
    return normalizeEditorOptions(options).findIndex(function (option) {
      return option.id === optionId;
    });
  }

  // Sincroniza input de opção para o texto [[...]] correspondente.
  function syncTerminalOptionToTemplate(blockId, optionId, value) {
    if (!optionId) return;

    const blockNode = getEditorDomScope().querySelector('.builder-block[data-block-id="' + cssEsc(blockId) + '"]');
    const block = getEditorBlock(blockId);
    if (!blockNode || !block || !isEditorKind(block.kind)) return;

    block.kind = "editor";
    block.options = collectTerminalOptionsFromBlockNode(blockNode);
    const optionIndex = getEditorOptionIndexById(block.options, optionId);
    if (optionIndex < 0) return;

    const enabledIndexes = getEnabledOptionIndexes(block.options);
    const markerIndex = enabledIndexes.indexOf(optionIndex);
    block.options[optionIndex].value = String(value || "");
    if (markerIndex > -1) {
      block.value = replaceMarkerAtIndex(String(block.value || ""), markerIndex, String(value || ""));
    }
    normalizeTerminalEditorBlock(block);

    const templateField = blockNode.querySelector("[data-terminal-template]");
    refreshTemplateInputFromBlock(blockNode, block, templateField ? getEditableSelectionOffsets(templateField) : null);
    syncTerminalOptionRowsFromBlockNode(blockNode, block.options);
    state.editor.terminalGuardByBlockId[blockId] = block.value;
  }

  // Inicia drag and drop no editor.
  function onRootDragStart(event) {
    if (!state.editor.open) return;
    clearDragIndicators();
    clearTerminalOptionDragIndicators();

    const palette = event.target.closest("[data-block-type]");
    if (palette) {
      state.editor.dragType = palette.getAttribute("data-block-type");
      state.editor.blockDragId = null;
      if (event.dataTransfer) {
        event.dataTransfer.setData("text/plain", state.editor.dragType);
        event.dataTransfer.setData("application/x-editor-drag", "add");
      }
      return;
    }

    const optionHandle = event.target.closest("[data-action='terminal-start-drag']");
    if (optionHandle) {
      snapshotEditorFromDom();
      setActiveEditorBlock(optionHandle.getAttribute("data-block-id"));
      if (event.dataTransfer) {
        event.dataTransfer.setData("application/x-editor-drag", "move-option");
        event.dataTransfer.setData("application/x-editor-option-block-id", optionHandle.getAttribute("data-block-id") || "");
        event.dataTransfer.setData("application/x-editor-option-id", optionHandle.getAttribute("data-option-id") || "");
      }
      return;
    }

    const blockNode = event.target.closest(".builder-block");
    if (!blockNode) return;
    if (blockNode.getAttribute("data-block-kind") === "button") return;

    snapshotEditorFromDom();
    state.editor.blockDragId = blockNode.getAttribute("data-block-id");
    state.editor.dragType = null;
    state.editor.pointerDrag = null;
    document.body.classList.remove("dragging-block");
    if (event.dataTransfer) {
      event.dataTransfer.setData("application/x-editor-drag", "move");
      event.dataTransfer.setData("application/x-editor-block-id", state.editor.blockDragId || "");
    }

    blockNode.classList.add("drag-source");
  }

  // Atualiza alvo visual durante arraste no editor.
  function onRootDragOver(event) {
    if (!state.editor.open) return;

    const optionMode = event.dataTransfer ? event.dataTransfer.getData("application/x-editor-drag") : "";
    const optionRow = event.target.closest("[data-terminal-option-row]");
    if (optionMode === "move-option" && optionRow) {
      event.preventDefault();
      const draggedOptionId = event.dataTransfer ? event.dataTransfer.getData("application/x-editor-option-id") : "";
      const targetOptionId = optionRow.getAttribute("data-option-id") || "";
      if (!draggedOptionId || !targetOptionId || draggedOptionId === targetOptionId) {
        clearTerminalOptionDragIndicators();
        return;
      }
      const rect = optionRow.getBoundingClientRect();
      const position = event.clientY > rect.top + rect.height / 2 ? "after" : "before";
      setTerminalOptionDragIndicator(optionRow, position);
      return;
    }

    const canvas = event.target.closest("[data-dropzone='canvas']");
    const blockNode = event.target.closest(".builder-block");
    if (!canvas && !blockNode) return;

    event.preventDefault();
    if (!blockNode) {
      clearDragIndicators();
      return;
    }

    const targetId = blockNode.getAttribute("data-block-id");
    const sourceId = state.editor.blockDragId;
    if (!targetId || (sourceId && sourceId === targetId)) {
      clearDragIndicators();
      return;
    }

    const position = event.clientY > blockNode.getBoundingClientRect().top + blockNode.getBoundingClientRect().height / 2
      ? "after"
      : "before";
    setDragIndicator(targetId, position);
  }

  // Finaliza drop no editor para mover/adicionar bloco.
  function onRootDrop(event) {
    if (!state.editor.open) return;

    const optionRow = event.target.closest("[data-terminal-option-row]");
    const optionMode = event.dataTransfer ? event.dataTransfer.getData("application/x-editor-drag") : "";
    if (optionRow && optionMode === "move-option") {
      event.preventDefault();
      snapshotEditorFromDom();
      clearTerminalOptionDragIndicators();

      const blockId = event.dataTransfer ? event.dataTransfer.getData("application/x-editor-option-block-id") : "";
      const draggedOptionId = event.dataTransfer ? event.dataTransfer.getData("application/x-editor-option-id") : "";
      const targetOptionId = optionRow.getAttribute("data-option-id") || "";
      const rect = optionRow.getBoundingClientRect();
      const position = event.clientY > rect.top + rect.height / 2 ? "after" : "before";
      if (reorderTerminalOptionDisplay(blockId, draggedOptionId, targetOptionId, position)) {
        renderApp();
      }
      return;
    }

    const canvas = event.target.closest("[data-dropzone='canvas']");
    const blockNode = event.target.closest(".builder-block");
    if (!canvas && !blockNode) return;

    event.preventDefault();
    const targetId = blockNode ? blockNode.getAttribute("data-block-id") : null;
    const position = blockNode
      ? (event.clientY > blockNode.getBoundingClientRect().top + blockNode.getBoundingClientRect().height / 2 ? "after" : "before")
      : "after";
    const mode = event.dataTransfer ? event.dataTransfer.getData("application/x-editor-drag") : "";

    clearDragIndicators();
    if (mode === "move" || state.editor.blockDragId) {
      snapshotEditorFromDom();
      const dragBlockId = state.editor.blockDragId || (event.dataTransfer ? event.dataTransfer.getData("application/x-editor-block-id") : "");
      if (!dragBlockId) return;

      if (!targetId) {
        const blocks = state.editor.form.blocks || [];
        const fromIndex = blocks.findIndex(function (item) { return item.id === dragBlockId; });
        if (fromIndex > -1 && blocks[fromIndex].kind !== "button") {
          const moved = blocks.splice(fromIndex, 1)[0];
          const buttonIndex = blocks.findIndex(function (item) { return item.kind === "button"; });
          const insertIndex = buttonIndex > -1 ? buttonIndex : blocks.length;
          blocks.splice(insertIndex, 0, moved);
          state.editor.form.blocks = ensureEditorButtonBlock(blocks);
        }
      } else if (targetId !== dragBlockId) {
        reorderBlockRelative(dragBlockId, targetId, position);
      }

      state.editor.blockDragId = null;
      renderApp();
      return;
    }

    const dragType = state.editor.dragType || (event.dataTransfer ? event.dataTransfer.getData("text/plain") : "");
    if (!dragType) return;
    addBlock(dragType, targetId && position === "after" ? getNextInsertTarget(targetId) : targetId);
    state.editor.dragType = null;
  }

  // Limpa estado de drag ao terminar arraste.
  function onRootDragEnd() {
    state.editor.blockDragId = null;
    state.editor.dragType = null;
    clearDragIndicators();
    clearTerminalOptionDragIndicators();
  }

  // Inicia arraste por ponteiro (mouse/toque) no botao de arrastar.
  function onRootPointerDown(event) {
    const actionTrigger = event.target && typeof event.target.closest === "function"
      ? event.target.closest(
        "[data-action='step-button-click'], [data-action='popup-continue'], [data-action='continue-step'], [data-action='complete-continue']"
      )
      : null;
    if (actionTrigger && state.ui.stepComment && state.currentView === "lesson_step") {
      closeStepCommentEditor({ render: false });
    }

    if (state.editor.open) {
      const blockNode = event.target.closest ? event.target.closest(".builder-block") : null;
      const tableField = getNearestTableEditorField(event.target, blockNode);
      if (tableField) {
        setActiveEditorBlock(blockNode ? blockNode.getAttribute("data-block-id") : "");
        focusFieldNoScroll(tableField);
        if (event.target !== tableField) moveCaretToFieldEnd(tableField);
        setActiveTableCell(getTableCellRefFromField(tableField));
        return;
      }
    }

    const textTool = event.target.closest(
      "[data-action='block-style-bold'], [data-action='block-style-italic'], [data-action='block-style-indent'], [data-action='open-tone-picker']"
    );
    if (textTool && state.editor.open) {
      event.preventDefault();
      return;
    }

    const handle = event.target.closest("[data-action='block-start-drag']");
    if (!handle || !state.editor.open) return;
    clearDragIndicators();

    snapshotEditorFromDom();
    state.editor.pointerDrag = {
      blockId: handle.getAttribute("data-block-id"),
      targetId: null,
      targetPosition: null,
      active: true
    };

    document.body.classList.add("dragging-block");
    event.preventDefault();
  }

  // Permite zoom por Ctrl+roda do mouse dentro do quadro de fluxograma no desktop.
  function onRootWheel(event) {
    const scrollNode = event.target.closest("[data-flowchart-scroll='true']");
    if (!scrollNode || !(event.ctrlKey || event.metaKey)) return;

    event.preventDefault();
    const blockId = scrollNode.getAttribute("data-block-id") || "";
    const mode = scrollNode.getAttribute("data-flowchart-mode") || "editor";
    const currentScale = getFlowchartViewportScale(blockId, mode);
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;

    setFlowchartViewportScale(blockId, mode, currentScale * factor, event.clientX, event.clientY);
  }

  // Mede a distância entre dois toques para o gesto de pinça.
  function getTouchDistance(touchA, touchB) {
    if (!touchA || !touchB) return 0;
    const dx = touchA.clientX - touchB.clientX;
    const dy = touchA.clientY - touchB.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Calcula o ponto médio entre dois toques ativos.
  function getTouchMidpoint(touchA, touchB) {
    return {
      x: (touchA.clientX + touchB.clientX) / 2,
      y: (touchA.clientY + touchB.clientY) / 2
    };
  }

  // Inicia gesto de pinça apenas quando o usuário usa dois dedos dentro da área do fluxograma.
  function onRootTouchStart(event) {
    const scrollNode = event.target.closest("[data-flowchart-scroll='true']");
    if (!scrollNode || !event.touches || event.touches.length < 2) return;

    const touchA = event.touches[0];
    const touchB = event.touches[1];
    const blockId = scrollNode.getAttribute("data-block-id") || "";
    const mode = scrollNode.getAttribute("data-flowchart-mode") || "editor";

    state.ui.flowchartPinch = {
      blockId: blockId,
      mode: mode,
      startScale: getFlowchartViewportScale(blockId, mode),
      startDistance: getTouchDistance(touchA, touchB)
    };
    event.preventDefault();
  }

  // Atualiza o zoom por pinça mantendo o ponto médio dos dedos como âncora visual.
  function onRootTouchMove(event) {
    const pinch = state.ui.flowchartPinch;
    if (!pinch || !event.touches || event.touches.length < 2) return;

    const touchA = event.touches[0];
    const touchB = event.touches[1];
    const distance = getTouchDistance(touchA, touchB);
    if (!distance || !pinch.startDistance) return;

    const midpoint = getTouchMidpoint(touchA, touchB);
    const nextScale = pinch.startScale * (distance / pinch.startDistance);
    setFlowchartViewportScale(pinch.blockId, pinch.mode, nextScale, midpoint.x, midpoint.y);
    event.preventDefault();
  }

  // Encerra o gesto quando restam menos de dois toques ativos.
  function onRootTouchEnd(event) {
    if (state.ui.flowchartPinch && (!event.touches || event.touches.length < 2)) {
      state.ui.flowchartPinch = null;
    }
  }

  // Normaliza o HTML do parágrafo rico ao perder foco.
  function onRootFocusOut(event) {
    const target = event.target;
    if (target && target.matches && target.matches("[data-template-rich-input]")) {
      const blockId = target.getAttribute("data-block-id") || "";
      if (target.matches("[data-terminal-template]")) {
        syncTerminalTemplateBlockFromNode(blockId, target, { preserveSelection: false });
      }
      if (target.matches("[data-simulator-template]")) {
        syncSimulatorTemplateBlockFromNode(blockId, target, { preserveSelection: false });
      }
      return;
    }
    if (
      !target ||
      !target.matches ||
      !target.matches("[data-block-rich-input]") ||
      target.matches("[data-template-rich-input]")
    ) {
      return;
    }

    const safeHtmlValue = sanitizeInlineRichText(target.innerHTML);
    if (target.innerHTML !== safeHtmlValue) {
      target.innerHTML = safeHtmlValue;
    }

    const blockNode = target.closest(".builder-block");
    if (blockNode) syncParagraphBlockFromNode(blockNode.getAttribute("data-block-id"), target);
  }

  // Atualiza o bloco ativo quando o foco entra em um campo de autoria.
  function onRootFocusIn(event) {
    const target = event.target;
    if (!target || !state.editor.open) return;
    const blockNode = target.closest ? target.closest(".builder-block") : null;
    if (!blockNode) return;
    const blockId = blockNode.getAttribute("data-block-id");
    setActiveEditorBlock(blockId);
    syncBlockAlignTools(blockId);
    syncBlockTextStyleTools(blockId);
    if (target.matches && target.matches("[data-table-header-cell], [data-table-cell]")) {
      setActiveTableCell(getTableCellRefFromField(target));
    } else if (target.matches && target.matches("[data-table-title]")) {
      setActiveTableCell(getTableCellRefFromField(target));
    }
  }

  // Mantém a toolbar inline em sincronia quando o autor apenas muda a seleção.
  function onDocumentSelectionChange() {
    if (!state.editor.open) return;
    const selection = window.getSelection ? window.getSelection() : null;
    if (!selection || !selection.rangeCount) {
      if (state.editor.activeBlockId) syncBlockTextStyleTools(state.editor.activeBlockId);
      return;
    }

    const probe = selection.anchorNode
      ? (selection.anchorNode.nodeType === 1 ? selection.anchorNode : selection.anchorNode.parentElement)
      : null;
    const blockNode = probe && probe.closest ? probe.closest(".builder-block") : null;
    const blockId = blockNode ? blockNode.getAttribute("data-block-id") : state.editor.activeBlockId;
    if (blockId) syncBlockTextStyleTools(blockId);
  }

  // Processa movimento de arraste por ponteiro.
  function onDocumentPointerMove(event) {
    if (!state.editor.pointerDrag || !state.editor.pointerDrag.active) return;

    const node = document.elementFromPoint(event.clientX, event.clientY);
    const target = node && node.closest ? node.closest(".builder-block") : null;
    if (!target) return;

    const targetId = target.getAttribute("data-block-id");
    const dragId = state.editor.pointerDrag.blockId;
    if (!targetId || targetId === dragId) return;
    const rect = target.getBoundingClientRect();
    const position = event.clientY > rect.top + rect.height / 2 ? "after" : "before";

    if (
      state.editor.pointerDrag.targetId === targetId &&
      state.editor.pointerDrag.targetPosition === position
    ) {
      return;
    }

    snapshotEditorFromDom();
    const moved = reorderBlockRelative(dragId, targetId, position);
    if (!moved) return;

    state.editor.pointerDrag.targetId = targetId;
    state.editor.pointerDrag.targetPosition = position;
    renderApp();
  }

  // Finaliza arraste por ponteiro.
  function onDocumentPointerUp() {
    if (!state.editor.pointerDrag || !state.editor.pointerDrag.active) return;
    state.editor.pointerDrag = null;
    document.body.classList.remove("dragging-block");
    clearDragIndicators();
  }

  // Marca visualmente posicao de drop antes/depois de um bloco.
  function setDragIndicator(blockId, position) {
    clearDragIndicators();
    const node = getEditorDomScope().querySelector('.builder-block[data-block-id="' + cssEsc(blockId) + '"]');
    if (!node) return;
    node.classList.add(position === "after" ? "drop-after" : "drop-before");
    state.editor.dragOverTargetId = blockId;
    state.editor.dragOverPosition = position;
  }

  // Marca visualmente a posição de drop entre opções do Editor.
  function setTerminalOptionDragIndicator(rowNode, position) {
    clearTerminalOptionDragIndicators();
    if (!rowNode) return;
    rowNode.classList.add(position === "after" ? "option-drop-after" : "option-drop-before");
  }

  // Limpa indicadores visuais de arraste entre opções do Editor.
  function clearTerminalOptionDragIndicators() {
    getEditorDomScope().querySelectorAll("[data-terminal-option-row].option-drop-before, [data-terminal-option-row].option-drop-after").forEach(function (node) {
      node.classList.remove("option-drop-before", "option-drop-after");
    });
  }

  // Limpa indicadores visuais de arraste.
  function clearDragIndicators() {
    getEditorDomScope().querySelectorAll(".builder-block.drop-before, .builder-block.drop-after").forEach(function (node) {
      node.classList.remove("drop-before", "drop-after");
    });
    state.editor.dragOverTargetId = null;
    state.editor.dragOverPosition = null;
  }

  // Calcula alvo para inserir bloco apos um bloco especifico.
  function getNextInsertTarget(targetId) {
    const blocks = state.editor.form.blocks || [];
    const index = blocks.findIndex(function (item) { return item.id === targetId; });
    if (index === -1) return null;
    if (index + 1 >= blocks.length) return null;
    return blocks[index + 1].id;
  }

  // Fecha overlays/popup ao clicar fora deles.
  function onDocumentClick(event) {
    const inSide = event.target.closest(".side-menu");
    const onSideToggle = event.target.closest("[data-action='toggle-side']");
    if (state.ui.sideOpen && !inSide && !onSideToggle) {
      state.ui.sideOpen = false;
      renderApp();
      return;
    }

    const inContext = event.target.closest(".context-menu");
    const onContextTrigger = event.target.closest("[data-action='open-context']");
    if (state.ui.contextMenu && !inContext && !onContextTrigger) {
      state.ui.contextMenu = null;
      renderApp();
      return;
    }

    const inQuick = event.target.closest(".quick-panel");
    const onQuickToggle = event.target.closest("[data-action='toggle-lesson-quick']");
    if (state.ui.lessonQuickOpen && !inQuick && !onQuickToggle) {
      state.ui.lessonQuickOpen = false;
      renderApp();
      return;
    }

    if (state.inlinePopupOpen && state.currentView === "lesson_step") {
      const inPopup = event.target.closest(".inline-popup");
      const onLegacyPopupButton = event.target.closest("[data-action='popup-open']");
      const onStepButton = event.target.closest("[data-action='step-button-click']");
      if (!inPopup && !onLegacyPopupButton && !onStepButton) {
        state.inlinePopupOpen = null;
        renderApp();
        return;
      }
    }

    if (state.flowchartPopupOpen && state.currentView === "lesson_step") {
      const inPopup = event.target.closest("[data-flowchart-popup='true']");
      const onShapeTrigger = event.target.closest("[data-action='flowchart-open-shape']");
      const onTextTrigger = event.target.closest("[data-action='flowchart-open-text']");
      if (!inPopup && !onShapeTrigger && !onTextTrigger) {
        state.flowchartPopupOpen = null;
        renderApp();
      }
    }
  }

  // ============================================================================
  // Consulta de Entidades Atuais
  // ============================================================================
  // Retorna curso atual em foco no estado.
  function getCurrentCourse() {
    return getCourse(state.currentCourseId);
  }

  // Busca curso por ID.
  function getCourse(courseId) {
    return state.content.courses.find(function (course) { return course.id === courseId; });
  }

  // Busca modulo por ID dentro de um curso.
  function findModule(courseId, moduleId) {
    const course = getCourse(courseId);
    if (!course) return null;

    for (let i = 0; i < course.modules.length; i += 1) {
      if (course.modules[i].id === moduleId) {
        return {
          course: course,
          module: course.modules[i],
          moduleIndex: i
        };
      }
    }

    return null;
  }

  // Busca licao por ID dentro de um curso.
  function findLesson(courseId, lessonId) {
    const course = getCourse(courseId);
    if (!course) return null;

    for (let m = 0; m < course.modules.length; m += 1) {
      const index = course.modules[m].lessons.findIndex(function (lesson) {
        return lesson.id === lessonId;
      });
      if (index > -1) {
        return {
          course: course,
          module: course.modules[m],
          moduleIndex: m,
          lesson: course.modules[m].lessons[index],
          lessonIndex: index
        };
      }
    }

    return null;
  }

  // Retorna referencia completa da licao atual.
  function getCurrentLessonEntry() {
    return findLesson(state.currentCourseId, state.currentLessonId);
  }

  // Retorna step atual com base no indice da licao.
  function getCurrentStep() {
    const lessonEntry = getCurrentLessonEntry();
    return lessonEntry ? lessonEntry.lesson.steps[state.currentStepIndex] || null : null;
  }

  // Atualiza barra de progresso no topo da licao.
  function updateProgressBar() {
    const entry = getCurrentLessonEntry();
    if (!entry) return;

    const fill = document.getElementById("progress-fill");
    if (!fill) return;

    const total = entry.lesson.steps.length;
    const pct = Math.max(0, Math.min(100, Math.round(((state.currentStepIndex + 1) / total) * 100)));
    fill.style.width = pct + "%";
  }

  // Le valor de input por ID com fallback.
  function getValue(id, fallback) {
    const element = document.getElementById(id);
    return element ? element.value : fallback;
  }

  // Trata o botao fisico/gesto de voltar do Android de forma mais natural.
  function handleAndroidBackPress() {
    if (state.editor.open) {
      closeEditor();
      return true;
    }

    let changed = false;
    if (state.ui.stepComment) {
      closeStepCommentEditor({ render: false });
      changed = true;
    }
    if (state.inlinePopupOpen) {
      state.inlinePopupOpen = null;
      changed = true;
    }
    if (state.flowchartPopupOpen) {
      state.flowchartPopupOpen = null;
      changed = true;
    }
    if (state.ui.contextMenu) {
      state.ui.contextMenu = null;
      changed = true;
    }
    if (state.ui.lessonQuickOpen) {
      state.ui.lessonQuickOpen = false;
      changed = true;
    }
    if (state.ui.sideOpen) {
      state.ui.sideOpen = false;
      changed = true;
    }
    if (changed) {
      renderApp();
      return true;
    }

    if (state.currentView === "lesson_step") {
      prevStep();
      return true;
    }

    if (state.currentView === "course_menu") {
      goMain();
      return true;
    }

    return false;
  }

  // Destaca temporariamente o card do nó para orientar o autor da lição.
  function flashFlowchartNodeCard(card) {
    if (!card) return;
    card.classList.remove("focus-target");
    void card.offsetWidth;
    card.classList.add("focus-target");
    window.setTimeout(function () {
      card.classList.remove("focus-target");
    }, 900);
  }

  // Leva do esquema do fluxograma ao campo correspondente no editor.
  function focusFlowchartNodeField(blockId, nodeId, kind) {
    if (!blockId || !nodeId || !state.editor.open) return;

    scrollEditorBlockIntoView(blockId);
    window.setTimeout(function () {
      const blockNode = getEditorDomScope().querySelector(
        '.builder-block[data-block-id="' + cssEsc(blockId) + '"]'
      );
      if (!blockNode) return;

      const card = blockNode.querySelector(
        '[data-flowchart-node-card="true"][data-flowchart-node-id="' + cssEsc(nodeId) + '"]'
      );
      if (!card) return;

      try {
        card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      } catch (error) {
        card.scrollIntoView();
      }

      flashFlowchartNodeCard(card);

      const selector = kind === "text" ? "[data-flowchart-node-text]" : "[data-flowchart-node-shape]";
      const field = card.querySelector(selector);
      if (!field || typeof field.focus !== "function") return;

      try {
        field.focus({ preventScroll: true });
      } catch (error) {
        field.focus();
      }

      if (kind === "text" && typeof field.select === "function") {
        field.select();
      }
    }, 150);
  }

  // Rola editor ate o bloco recem-criado/alterado.
  function scrollEditorBlockIntoView(blockId) {
    const node = getEditorDomScope().querySelector('.builder-block[data-block-id="' + cssEsc(blockId) + '"]');
    if (!node) return;

    const containers = [node.closest(".canvas-col"), node.closest(".editor-sheet")].filter(Boolean);
    containers.forEach(function (container) {
      const containerRect = container.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      const currentTop = container.scrollTop;
      const targetTop = currentTop + (nodeRect.top - containerRect.top) - 18;
      const targetBottom = targetTop + nodeRect.height + 36;

      if (nodeRect.top < containerRect.top + 18) {
        container.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
        return;
      }
      if (nodeRect.bottom > containerRect.bottom - 18) {
        container.scrollTo({
          top: Math.max(0, targetBottom - container.clientHeight),
          behavior: "smooth"
        });
      }
    });

    node.classList.add("new-block");
    window.setTimeout(function () {
      node.classList.remove("new-block");
    }, 700);
  }

  // Expõe API minima para o wrapper Android consultar navegacao interna.
  if (typeof window !== "undefined") {
    window.AraLearnAndroid = window.AraLearnAndroid || {};
    window.AraLearnAndroid.applyInsets = applyAndroidHostInsets;
    window.AraLearnAndroid.handleBackPress = handleAndroidBackPress;
    window.addEventListener("aralearn:android-insets", onAndroidInsetsEvent);
    window.addEventListener("resize", refreshAndroidHostInsets);
    if (window.visualViewport && window.visualViewport.addEventListener) {
      window.visualViewport.addEventListener("resize", refreshAndroidHostInsets);
    }
    if (window.__AraLearnAndroidInsets__) {
      applyAndroidHostInsets(window.__AraLearnAndroidInsets__);
    }
  }

  root.addEventListener("click", onRootClick);
  root.addEventListener("change", onRootChange);
  root.addEventListener("input", onRootInput);
  root.addEventListener("dragstart", onRootDragStart);
  root.addEventListener("dragover", onRootDragOver);
  root.addEventListener("drop", onRootDrop);
  root.addEventListener("dragend", onRootDragEnd);
  root.addEventListener("pointerdown", onRootPointerDown);
  root.addEventListener("wheel", onRootWheel, { passive: false });
  root.addEventListener("touchstart", onRootTouchStart, { passive: false });
  root.addEventListener("touchmove", onRootTouchMove, { passive: false });
  root.addEventListener("touchend", onRootTouchEnd, { passive: false });
  root.addEventListener("touchcancel", onRootTouchEnd, { passive: false });
  root.addEventListener("focusin", onRootFocusIn, true);
  root.addEventListener("focusout", onRootFocusOut, true);
  document.addEventListener("pointermove", onDocumentPointerMove);
  document.addEventListener("pointerup", onDocumentPointerUp);
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("selectionchange", onDocumentSelectionChange);

  if (state.content.courses.length) state.currentCourseId = state.content.courses[0].id;
  renderApp();
})();

