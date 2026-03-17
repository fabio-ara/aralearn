
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

  // Tipos de step suportados pela licao.
  const STEP_TYPES = ["content", "content_with_inline_popup", "token_fill", "lesson_complete"];
  // Tipos de bloco suportados dentro do editor visual.
  const BLOCK_TYPES = ["heading", "paragraph", "image", "editor"];
  // Nome padrao exibido para o app quando nenhum titulo personalizado foi salvo.
  const DEFAULT_APP_TITLE = "AraLearn";
  // Chave principal de persistencia completa do projeto (conteudo + progresso).
  const PROJECT_STORAGE_KEY = "aralearn_project_v1";
  // Chave de armazenamento do progresso no navegador.
  const PROGRESS_STORAGE_KEY = "aralearn_progress_v1";
  // Nome atual do arquivo JSON principal ao exportar/sincronizar.
  const DEFAULT_PROJECT_JSON_FILE_NAME = "aralearn-content.json";
  // Nome sugerido do pacote exportado pelo app.
  const DEFAULT_EXPORT_FILE_NAME = "aralearn-project.zip";
  // Identificador interno do painel explicativo inline.
  const INLINE_POPUP_BLOCK_ID = "__inline-popup__";

  // Metadados visuais/textuais usados na paleta do editor.
  const BLOCK_META = {
    heading: { icon: "&#72;", label: "Título", placeholder: "Título" },
    paragraph: { icon: "&#182;", label: "Parágrafo", placeholder: "Texto" },
    bold: { icon: "&#66;", label: "Negrito", placeholder: "Texto em negrito" },
    italic: { icon: "&#73;", label: "Itálico", placeholder: "Texto em itálico" },
    image: { icon: "&#9635;", label: "Imagem", placeholder: "assets/images/arquivo.jpg" },
    editor: { icon: "&gt;_", label: "Editor", placeholder: "Digite texto e use [[...]] para lacunas" },
    button: { icon: "&#10140;", label: "Botão", placeholder: "CONTINUAR" }
  };

  // Sequencia simples para gerar IDs unicos durante a sessao.
  let idSeq = 0;
  // Controle simples para salvar em tempo real sem bloquear a digitacao.
  let persistTimer = null;
  // Debounce/lock para sincronizacao opcional em pasta local (File System Access API).
  let fsPersistTimer = null;
  let fsPersistInFlight = false;
  let fsPersistQueued = false;
  // Conteudo inicial ja considerando recuperacao persistida.
  const bootstrap = loadProjectBootstrap();

  // Estado central da aplicacao (single source of truth da UI).
  // Sempre que este objeto muda, a interface e re-renderizada via renderApp().
  const state = {
    content: normalizeContent(bootstrap.content || window.APP_CONTENT || {}),
    progress: normalizeImportedProgress(bootstrap.progress || loadProgressStore()),
    assets: normalizeAssetStore(bootstrap.assets),
    fs: {
      supported: isFileSystemAccessSupported(),
      enabled: false,
      handle: null,
      folderName: "",
      lastError: "",
      lastSavedAt: ""
    },
    currentView: "main_menu",
    currentCourseId: null,
    currentLessonId: null,
    currentStepIndex: 0,
    inlinePopupOpen: null,
    feedback: null,
    tokenByStepId: {},
    ui: {
      sideOpen: false,
      contextMenu: null,
      lessonQuickOpen: false
    },
    editor: {
      open: false,
      mode: "edit",
      anchorIndex: 0,
      editingStepId: null,
      keepStepId: null,
      draftByStepId: {},
      form: null,
      dragType: null,
      pointerDrag: null,
      blockDragId: null,
      imageTargetBlockId: null,
      pendingScrollBlockId: null,
      terminalGuardByBlockId: {},
      dragOverTargetId: null,
      dragOverPosition: null
    }
  };

  if (!hasProgressEntries(state.progress)) {
    state.progress = normalizeImportedProgress((window.APP_CONTENT || {}).progress);
  }
  pruneProgressStore();


  // ============================================================================
  // Renderizacao de Telas
  // ============================================================================
  // Renderiza a tela principal conforme o estado atual e injeta overlays (menu lateral, contexto, editor etc.).
  function renderApp() {
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
      "</div>";

    if (state.currentView === "lesson_step") updateProgressBar();

    if (state.editor.open && state.editor.pendingScrollBlockId) {
      const blockId = state.editor.pendingScrollBlockId;
      state.editor.pendingScrollBlockId = null;
      requestAnimationFrame(function () {
        scrollEditorBlockIntoView(blockId);
      });
    }

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
      renderTopBar({ title: state.content.appTitle || DEFAULT_APP_TITLE, showBack: false }) +
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

    const hasBlocks = Array.isArray(step.blocks) && step.blocks.length > 0;
    const stepHtml =
      step.type === "token_fill" && !hasBlocks
        ? renderStepToken(step)
        : step.type === "lesson_complete" && !hasBlocks
          ? renderStepComplete(step)
          : step.type === "content_with_inline_popup" && !hasBlocks
            ? renderStepPopup(step)
            : renderStepContent(step);

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
      '<p class="muted tiny">' +
      esc(lessonEntry.module.title + " - " + lessonEntry.lesson.title) +
      "</p>" +
      stepHtml +
      "</main>" +
      "</section>"
    );
  }

  // Renderiza um card de conteudo comum.
  function renderStepContent(step) {
    if (Array.isArray(step.blocks) && step.blocks.length) {
      const completeClass = step.type === "lesson_complete" ? " complete" : "";
      const exerciseClass = stepHasEditorExercise(step) ? " exercise-card" : "";
      return (
        '<article class="clean-card lesson-card' +
        completeClass +
        exerciseClass +
        '">' +
        (step.type === "lesson_complete" ? '<div class="complete-mark">&#10003;</div>' : "") +
        renderStepBlocks(step) +
        "</article>"
      );
    }

    return (
      '<article class="clean-card lesson-card">' +
      (step.title ? '<h2 class="lesson-title">' + esc(step.title) + "</h2>" : "") +
      renderImage(step.image) +
      renderBody(step) +
      renderTerminal(step.terminal) +
      '<div class="lesson-next-wrap"><button class="next-icon" data-action="continue-step" title="Continuar" aria-label="Continuar">&#10140;</button></div>' +
      "</article>"
    );
  }

  // Renderiza um card que abre popup inline antes de avancar.
  function renderStepPopup(step) {
    if (Array.isArray(step.blocks) && step.blocks.length) {
      return renderStepContent(step);
    }

    return (
      '<article class="clean-card lesson-card">' +
      (step.title ? '<h2 class="lesson-title">' + esc(step.title) + "</h2>" : "") +
      renderImage(step.image) +
      renderBody(step) +
      renderTerminal(step.terminal) +
      '<div class="popup-actions">' +
      '<button class="icon-pill" data-action="popup-open" title="' +
      escAttr(step.popupTriggerLabel || "Abrir popup") +
      '" aria-label="' +
      escAttr(step.popupTriggerLabel || "Abrir popup") +
      '">&#9432;</button>' +
      (state.inlinePopupOpen && state.inlinePopupOpen.blockId === INLINE_POPUP_BLOCK_ID
        ? '<div class="inline-popup">' +
          '<div class="popup-copy card-subtitle">' +
          textToParagraphHtml(step.popupText || "", "") +
          "</div>" +
          '<button class="next-icon" data-action="popup-continue" title="Continuar" aria-label="Continuar">&#10140;</button>' +
          "</div>"
        : "") +
      "</div>" +
      "</article>"
    );
  }

  // Renderiza exercicio de preencher lacunas com opções.
  function renderStepToken(step) {
    const exercise = getExerciseState(step);
    const slotHtml = exercise.slots
      .map(function (value, index) {
        return (
          '<button class="token-slot ' +
          (value ? "filled" : "") +
          '" data-action="token-slot" data-slot-index="' +
          index +
          '">' +
          (value ? esc(value) : '<span class="slot-placeholder">&#9633;</span>') +
          "</button>"
        );
      })
      .join("");

    const options = getAvailableOptions(step, exercise.slots)
      .map(function (token) {
        return (
          '<button class="token-option" data-action="token-option" data-option="' +
          encodeURIComponent(token) +
          '">' +
          esc(token) +
          "</button>"
        );
      })
      .join("");

    return (
      '<article class="clean-card lesson-card token-fill-card">' +
      '<h2 class="lesson-title">' +
      esc(step.title || "PREENCHA") +
      "</h2>" +
      '<p class="card-subtitle">' +
      esc(step.prompt || "") +
      "</p>" +
      '<div class="token-area">' +
      '<div class="token-terminal-wrap"><div class="terminal-box token-terminal token-slots">' +
      slotHtml +
      "</div></div>" +
      '<div class="token-bottom">' +
      '<div class="token-options">' +
      (options || '<p class="muted tiny">Sem opções.</p>') +
      "</div>" +
      '<div class="token-actions equal-actions">' +
      '<button class="next-icon next-icon-secondary" data-action="token-reset" title="Limpar" aria-label="Limpar">&#8635;</button>' +
      '<button class="next-icon" data-action="token-continue" title="Continuar" aria-label="Continuar">&#10140;</button>' +
      "</div>" +
      "</div>" +
      "</div>" +
      "</article>" +
      renderFeedback(step)
    );
  }

  // Renderiza a tela de conclusao da licao.
  function renderStepComplete(step) {
    return (
      '<article class="clean-card lesson-card complete">' +
      '<div class="complete-mark">&#10003;</div>' +
      '<h2 class="lesson-title">' +
      esc(step.title || "Lição concluída") +
      "</h2>" +
      (step.subtitle ? '<p class="card-subtitle">' + esc(step.subtitle) + "</p>" : "") +
      renderBody(step) +
      '<div class="lesson-next-wrap"><button class="next-icon" data-action="complete-continue" title="Voltar ao curso" aria-label="Voltar ao curso">&#10140;</button></div>' +
      "</article>"
    );
  }

  // Renderiza feedback de acerto ou erro para exercicios de lacuna.
  function renderFeedback(step) {
    if (!state.feedback || state.feedback.stepId !== step.id) return "";

    if (state.feedback.type === "correct") {
      return (
        '<section class="feedback-overlay">' +
        '<div class="feedback-card">' +
        '<h3>Correto</h3>' +
        renderTerminal(step.correct && step.correct.output) +
        (step.correct && step.correct.explanation
          ? '<p class="card-subtitle">' + esc(step.correct.explanation) + "</p>"
          : "") +
        '<button class="next-icon" data-action="feedback-next" title="Próximo" aria-label="Próximo">&#10140;</button>' +
        "</div></section>"
      );
    }

    return (
      '<section class="feedback-overlay">' +
      '<div class="feedback-card">' +
      '<h3>Incorreto</h3>' +
      '<p class="card-subtitle">' +
      esc(state.feedback.message || (step.incorrect && step.incorrect.message) || "Tente novamente") +
      "</p>" +
      '<div class="feedback-icons">' +
      '<button class="icon-pill" data-action="feedback-view-answer" title="Ver resposta" aria-label="Ver resposta">&#128065;</button>' +
      '<button class="icon-pill primary" data-action="feedback-try-again" title="Tentar de novo" aria-label="Tentar de novo">&#8635;</button>' +
      "</div>" +
      "</div></section>"
    );
  }

  // Monta o topo padrao das telas de menu.
  function renderTopBar(config) {
    return (
      '<header class="topbar">' +
      (config.showBack
        ? '<button class="icon-ghost" data-action="go-main" title="Menu principal" aria-label="Menu principal">&larr;</button>'
        : '<div class="topbar-space"></div>') +
      '<h1 class="topbar-title">' +
      esc(config.title || "") +
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

    const fsStatus = state.fs.supported
      ? '<p class="tiny muted side-status">' +
        (state.fs.enabled
          ? "Pasta local: " + esc(state.fs.folderName || "(sem nome)")
          : "Pasta local: desativada") +
        "</p>" +
        (state.fs.lastError
          ? '<p class="tiny side-status-error">' + esc(state.fs.lastError) + "</p>"
          : "")
      : '<p class="tiny muted side-status">' + esc(getFileSystemUnavailableMessage()) + "</p>";

    return (
      '<section class="side-overlay ' +
      (state.ui.sideOpen ? "open" : "") +
      '">' +
      '<aside class="side-menu">' +
      '<div class="side-grid">' +
      actions +
      "</div>" +
      fsStatus +
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
    list.push({ action: "import-json-trigger", label: "Importar ZIP/JSON", icon: "&#8681;" });
    list.push({ action: "export-json", label: "Exportar ZIP", icon: "&#8679;" });

    if (state.fs.supported) {
      list.push({
        action: "fs-pick-folder",
        label: state.fs.enabled ? "Trocar pasta local" : "Ativar pasta local",
        icon: "&#128193;"
      });
      list.push({
        action: "fs-save-now",
        label: "Sincronizar agora",
        icon: "&#128190;",
        disabled: !state.fs.enabled
      });
      list.push({
        action: "fs-disconnect",
        label: "Desativar pasta local",
        icon: "&#10005;",
        disabled: !state.fs.enabled
      });
    }

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

  // Renderiza a area de montagem (paleta lateral e canvas de blocos).
  function renderCanvasEditor(form) {
    const palette = BLOCK_TYPES.map(function (type) {
      const meta = BLOCK_META[type];
      return (
        '<button class="palette-icon" draggable="true" data-action="palette-add" data-block-type="' +
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
        if (isEditorKind(block.kind)) {
          normalizeTerminalEditorBlock(block);
          state.editor.terminalGuardByBlockId[block.id] = block.value;
        }
        const meta = isEditorKind(block.kind)
          ? BLOCK_META.editor
          : (BLOCK_META[block.kind] || BLOCK_META.paragraph);
        const multiline = block.kind === "paragraph" || isEditorKind(block.kind);
        const input = multiline
          ? '<textarea class="block-input" data-block-input="true" rows="' +
            (isEditorKind(block.kind) ? "5" : "4") +
            (isEditorKind(block.kind)
              ? '" data-terminal-template="true" data-block-id="' + escAttr(block.id)
              : "") +
            '" placeholder="' +
            escAttr(meta.placeholder) +
            '">' +
            esc(block.value || "") +
            "</textarea>"
          : block.kind === "button"
            ? '<div class="block-fixed block-fixed-button">' +
              '<p class="tiny muted">Botão final fixo</p>' +
              '<div class="lesson-next-wrap"><button class="next-icon step-main-btn" type="button" disabled aria-disabled="true" tabindex="-1">&#10140;</button></div>' +
              "</div>"
            : '<input class="block-input" data-block-input="true" type="text" value="' +
            escAttr(block.value || "") +
            '" placeholder="' +
            escAttr(meta.placeholder) +
            '">';

        const imageUpload =
          block.kind === "image"
            ? '<button class="icon-ghost tiny-icon" data-action="block-pick-image" data-block-id="' +
              escAttr(block.id) +
              '" title="Upload de imagem">&#8682;</button>'
            : "";

        const terminalOptions = isEditorKind(block.kind)
          ? (normalizeEditorOptions(block.options).map(function (option, optionIndex) {
            const enabled = option.enabled !== false;
            return (
              '<div class="choice-row" data-terminal-option-row="true" data-option-id="' +
              escAttr(option.id || "") +
              '" data-option-enabled="' +
              (enabled ? "1" : "0") +
              '">' +
              '<button class="icon-ghost tiny-icon option-toggle' +
              (enabled ? " active" : "") +
              '" data-action="terminal-toggle-option" data-block-id="' +
              escAttr(block.id) +
              '" data-option-index="' +
              optionIndex +
              '" title="' +
              escAttr(enabled ? "Desabilitar lacuna" : "Habilitar lacuna") +
              '">' +
              (enabled ? "&#9679;" : "&#9675;") +
              "</button>" +
              '<input type="text" data-terminal-option="true" data-block-id="' +
              escAttr(block.id) +
              '" data-option-index="' +
              optionIndex +
              '" value="' +
              escAttr(option.value || "") +
              '" placeholder="Opção">' +
              '<button class="icon-ghost tiny-icon" data-action="terminal-remove-option" data-block-id="' +
              escAttr(block.id) +
              '" data-option-index="' +
              optionIndex +
              '" title="Remover opção">&times;</button>' +
              "</div>"
            );
          }).join(""))
          : "";

        const terminalConfig =
          isEditorKind(block.kind)
            ? '<section class="terminal-config">' +
              '<p class="tiny muted">Adicionar opção cria [[ ]] no cursor. Apenas opções habilitadas viram lacunas.</p>' +
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
          block.kind === "button"
            ? '<section class="button-config">' +
              '<label class="toggle-row tiny">' +
              '<input type="checkbox" data-button-popup="true" ' +
              (block.popupEnabled ? "checked" : "") +
              "> Abrir popup antes de avancar" +
              "</label>" +
              '<label class="tiny muted">Texto do popup</label>' +
              '<textarea rows="3" data-button-popup-text="true" ' +
              (block.popupEnabled ? "" : "disabled") +
              ' placeholder="Texto do popup">' +
              esc(block.popupText || "") +
              "</textarea>" +
              "</section>"
            : "";

        const draggingThisBlock =
          (state.editor.pointerDrag && state.editor.pointerDrag.active && state.editor.pointerDrag.blockId === block.id) ||
          state.editor.blockDragId === block.id;

        return (
          '<article class="builder-block ' +
          (draggingThisBlock ? "drag-source" : "") +
          '" data-block-id="' +
          escAttr(block.id) +
          '" data-block-kind="' +
          escAttr(block.kind) +
          '">' +
          '<div class="builder-tools">' +
          (block.kind === "button"
            ? '<button class="icon-ghost tiny-icon disabled-icon" type="button" disabled title="Bloco fixo">&#128274;</button>'
            : '<button class="icon-ghost tiny-icon" draggable="true" data-action="block-start-drag" data-block-id="' +
              escAttr(block.id) +
              '" title="Arrastar bloco">&#9776;</button>') +
          '<span class="tiny muted">' +
          meta.label +
          "</span>" +
          '<div class="builder-tool-right">' +
          (block.kind === "button"
            ? ""
            : '<button class="icon-ghost tiny-icon" data-action="block-up" data-block-id="' +
              escAttr(block.id) +
              '" title="Subir">&uarr;</button>' +
              '<button class="icon-ghost tiny-icon" data-action="block-down" data-block-id="' +
              escAttr(block.id) +
              '" title="Descer">&darr;</button>') +
          imageUpload +
          (block.kind === "button"
            ? ""
            : '<button class="icon-ghost tiny-icon" data-action="block-remove" data-block-id="' +
              escAttr(block.id) +
              '" title="Remover bloco">&times;</button>') +
          "</div>" +
          "</div>" +
          input +
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
      (blocks || '<div class="canvas-empty">Arraste ou toque nos icones para inserir blocos.</div>') +
      "</section>" +
      "</div>"
    );
  }

  // Renderiza corpo textual (HTML seguro) de um step.
  function renderBody(step) {
    const html = stepBodyHtml(step);
    return html ? '<div class="rich-text">' + html + "</div>" : "";
  }

  // Mensagem contextual para recursos de pasta local indisponiveis nesta plataforma.
  function getFileSystemUnavailableMessage() {
    if (isAndroidHostAvailable()) {
      return "Sincronizacao com pasta local indisponivel no Android. Use Importar/Exportar ZIP.";
    }
    return "File System Access API indisponivel neste navegador.";
  }

  // Gera HTML do corpo do step, priorizando bodyHtml e caindo para text[].
  function stepBodyHtml(step) {
    if (typeof step.bodyHtml === "string" && step.bodyHtml.trim()) {
      return safeHtml(step.bodyHtml);
    }
    if (Array.isArray(step.text) && step.text.length) {
      return step.text
        .map(function (line) {
          return "<p>" + esc(line) + "</p>";
        })
        .join("");
    }
    return "";
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
    return '<pre class="terminal-box">' + esc(text) + "</pre>";
  }

  // Identifica se um bloco eh do tipo "Editor".
  function isEditorKind(kind) {
    return kind === "editor";
  }

  // Retorna array de opções do bloco Editor no formato padrao { id, value, enabled }.
  function normalizeEditorOptions(options) {
    if (!Array.isArray(options)) return [];

    return options.map(function (item) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return {
          id: String(item.id || uid("opt")),
          value: String(item.value || ""),
          enabled: item.enabled !== false
        };
      }
      return {
        id: uid("opt"),
        value: String(item || ""),
        enabled: true
      };
    });
  }

  // Lista indices de opções atualmente habilitadas para gerar lacunas no texto.
  function getEnabledOptionIndexes(options) {
    const list = normalizeEditorOptions(options);
    const enabled = [];
    for (let i = 0; i < list.length; i += 1) {
      if (list[i].enabled !== false) enabled.push(i);
    }
    return enabled;
  }

  // Renderiza todos os blocos estruturados de um step.
  function renderStepBlocks(step) {
    const blocks = Array.isArray(step.blocks) ? step.blocks : [];
    let html = "";
    let hasButton = false;

    blocks.forEach(function (block) {
      if (block.kind === "heading") {
        if (String(block.value || "").trim()) {
          html += '<h2 class="lesson-title">' + esc(block.value) + "</h2>";
        }
        return;
      }

      if (block.kind === "paragraph" || block.kind === "bold" || block.kind === "italic") {
        html += renderTextBlock(block.kind, block.value);
        return;
      }

      if (block.kind === "image") {
        html += renderImage(block.value);
        return;
      }

      if (isEditorKind(block.kind)) {
        html += renderTerminalBlock(step, block);
        return;
      }

      if (block.kind === "button") {
        hasButton = true;
        html += renderStepButton(step, block);
      }
    });

    if (!hasButton) {
      const defaultAction = step.type === "lesson_complete" ? "complete-continue" : "continue-step";
      html += '<div class="lesson-next-wrap"><button class="next-icon" data-action="' +
        defaultAction +
        '" title="Continuar" aria-label="Continuar">&#10140;</button></div>';
    }

    return html;
  }

  // Renderiza bloco textual (titulo/paragrafo/negrito/italico).
  function renderTextBlock(kind, value) {
    const text = String(value || "").trim();
    if (!text) return "";

    const inlineTag = kind === "bold" ? "strong" : kind === "italic" ? "em" : "";
    return '<div class="rich-text">' + textToParagraphHtml(text, inlineTag) + "</div>";
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

    return (
      '<div class="lesson-next-wrap">' +
      (showReset
        ? '<button class="next-icon next-icon-secondary" data-action="step-editor-reset" data-step-id="' +
          escAttr(step.id) +
          '" title="Limpar" aria-label="Limpar">&#8635;</button>'
        : "") +
      '<button class="next-icon step-main-btn" data-action="step-button-click" data-block-id="' +
      escAttr(block.id) +
      '" data-popup="' +
      (popupEnabled ? "1" : "0") +
      '" title="Continuar" aria-label="Continuar">&#10140;</button>' +
      (popupEnabled && popupOpen
        ? '<div class="inline-popup">' +
          '<div class="popup-copy card-subtitle">' +
          textToParagraphHtml(block.popupText || "Explicação do popup.", "") +
          "</div>" +
          '<button class="next-icon" data-action="popup-continue" data-popup-block-id="' +
          escAttr(block.id) +
          '" title="Continuar" aria-label="Continuar">&#10140;</button>' +
          "</div>"
        : "") +
      "</div>"
    );
  }

  // Indica se o step usa layout de exercicio com area fixa (token_fill ou bloco Editor).
  function isExerciseDrivenStep(step) {
    if (!step) return false;
    if (step.type === "token_fill") return true;
    return stepHasEditorExercise(step);
  }

  // Verifica se o step contem algum bloco Editor com lacunas.
  function stepHasEditorExercise(step) {
    const blocks = Array.isArray(step && step.blocks) ? step.blocks : [];
    return blocks.some(function (block) {
      return isEditorKind(block.kind) && parseTerminalTemplate(block.value || "").answers.length > 0;
    });
  }

  // Define se o step exige resposta correta do bloco Editor para liberar o botao final.
  function getStepEditorGate(step) {
    const blocks = Array.isArray(step && step.blocks) ? step.blocks : [];
    const editorBlocks = blocks.filter(function (block) {
      return isEditorKind(block.kind) && parseTerminalTemplate(block.value || "").answers.length > 0;
    });

    if (!editorBlocks.length) return { requiresSolve: false, solved: true };

    const solved = editorBlocks.every(function (block) {
      const parsed = parseTerminalTemplate(block.value || "");
      const exercise = getTerminalExerciseState(step, block, parsed.answers.length);
      return exercise.feedback === "correct";
    });
    return { requiresSolve: true, solved: solved };
  }

  // Renderiza bloco terminal com lacunas e opções interativas.
  function renderTerminalBlock(step, block) {
    const parsed = parseTerminalTemplate(block.value || "");
    const normalizedOptions = normalizeEditorOptions(block.options);
    const options = mergeTerminalOptions(normalizedOptions, parsed.answers);

    if (!parsed.answers.length || !options.length) {
      return renderTerminal(block.value);
    }

    const exercise = getTerminalExerciseState(step, block, parsed.answers.length);
    const slotHtml = parsed.parts
      .map(function (part) {
        if (part.type === "text") return esc(part.value).replace(/\n/g, "<br>");

        const current = exercise.slots[part.index];
        return (
          '<button class="terminal-slot ' +
          (current ? "filled" : "empty") +
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
      return '<div class="inline-feedback ok"><p class="tiny">Correto.</p></div>';
    }

    if (exercise.feedback === "incomplete") {
      return '<div class="inline-feedback err"><p class="tiny">Preencha todas as lacunas.</p></div>';
    }

    return (
      '<div class="inline-feedback err">' +
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

      const answer = String(match[1] || "").trim();
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

    (Array.isArray(list) ? list : []).forEach(function (item) {
      const value = typeof item === "string" ? item : String(item && item.value ? item.value : "");
      if (value) merged.push(value);
    });

    answers.forEach(function (answer) {
      if (answer && merged.indexOf(answer) === -1) merged.push(answer);
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

  // Insere um marcador [[...]] na posicao do cursor no editor.
  function insertMarkerAtPosition(text, selectionStart, selectionEnd, value) {
    const source = String(text || "");
    const start = Number.isInteger(selectionStart) ? selectionStart : source.length;
    const end = Number.isInteger(selectionEnd) ? selectionEnd : start;
    return source.slice(0, start) + "[[" + value + "]]" + source.slice(end);
  }

  // Sincroniza texto do terminal e lista de opções do editor.
  function normalizeTerminalEditorBlock(block) {
    if (!block || !isEditorKind(block.kind)) return;

    block.kind = "editor";
    block.value = String(block.value || "");
    block.options = normalizeEditorOptions(block.options);

    let markers = parseOptionMarkers(block.value);
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
      if (optionValue && optionValue !== markerValue) {
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
      blocks: [defaultButtonBlock()]
    };
  }

  // Cria bloco padrao de botao (sempre presente no final).
  function defaultButtonBlock() {
    return {
      id: uid("block"),
      kind: "button",
      value: "CONTINUAR",
      popupEnabled: false,
      popupText: ""
    };
  }

  // Garante que exista exatamente um botao final no card.
  function ensureEditorButtonBlock(blocks) {
    const source = Array.isArray(blocks) ? blocks.slice() : [];
    let button = null;

    const list = source.filter(function (block) {
      if (!block || block.kind !== "button") return true;
      if (!button) button = block;
      return false;
    });

    if (!button) {
      button = defaultButtonBlock();
    } else {
      button = {
        id: button.id || uid("block"),
        kind: "button",
        value: "CONTINUAR",
        popupEnabled: !!button.popupEnabled,
        popupText: String(button.popupText || "")
      };
    }

    list.push(button);
    return list;
  }

  // Converte step salvo para formato editavel no construtor visual.
  function toEditorForm(step) {
    const stepType = step.type === "lesson_complete" ? "lesson_complete" : "content";
    const form = blankEditorForm(stepType);

    if (Array.isArray(step.blocks) && step.blocks.length) {
      form.blocks = step.blocks.map(function (block) {
        const next = {
          id: block.id || uid("block"),
          kind: block.kind || "paragraph",
          value: String(block.value || "")
        };
        if (isEditorKind(block.kind)) {
          next.kind = "editor";
          next.options = normalizeEditorOptions(block.options);
        }
        if (block.kind === "button") {
          next.popupEnabled = !!block.popupEnabled;
          next.popupText = String(block.popupText || "");
        }
        return next;
      });
      form.blocks = ensureEditorButtonBlock(form.blocks);
      return form;
    }

    if (step.type === "token_fill") {
      if (step.title) form.blocks.push({ id: uid("block"), kind: "heading", value: step.title });
      if (step.prompt) form.blocks.push({ id: uid("block"), kind: "paragraph", value: step.prompt });
      form.blocks.push({
        id: uid("block"),
        kind: "editor",
        value: (step.answer || []).map(function (token) { return "[[" + token + "]]"; }).join(" "),
        options: normalizeEditorOptions(Array.isArray(step.options) ? step.options : [])
      });
      form.blocks = ensureEditorButtonBlock(form.blocks);
      return form;
    }

    if (step.title) form.blocks.push({ id: uid("block"), kind: "heading", value: step.title });

    extractBodyBlocks(step).forEach(function (block) {
      form.blocks.push({ id: uid("block"), kind: block.kind, value: block.value });
    });
    if (step.type === "lesson_complete" && step.subtitle) {
      form.blocks.push({ id: uid("block"), kind: "paragraph", value: step.subtitle });
    }

    if (step.image) form.blocks.push({ id: uid("block"), kind: "image", value: step.image });
    if (step.terminal) form.blocks.push({ id: uid("block"), kind: "editor", value: step.terminal, options: [] });

    const popupEnabled = step.type === "content_with_inline_popup";
    const buttonText = popupEnabled
      ? clean(step.popupTriggerLabel || step.buttonText, "ABRIR")
      : clean(step.buttonText, "CONTINUAR");

    form.blocks.push({
      id: uid("block"),
      kind: "button",
      value: buttonText,
      popupEnabled: popupEnabled,
      popupText: popupEnabled ? String(step.popupText || "") : ""
    });
    form.blocks = ensureEditorButtonBlock(form.blocks);

    return form;
  }

  // Converte formulario do editor para step valido no JSON interno.
  function buildStepFromEditor(form, keepId) {
    const id = keepId || uid("step");
    const allowedKinds = ["heading", "paragraph", "image", "editor", "button"];
    let blocks = (form.blocks || [])
      .filter(function (block) { return block && block.kind && allowedKinds.indexOf(block.kind) > -1; })
      .map(function (block) {
        const next = {
          id: block.id || uid("block"),
          kind: block.kind,
          value: String(block.value || "")
        };

        if (isEditorKind(block.kind)) {
          next.kind = "editor";
          next.options = normalizeEditorOptions(block.options)
            .map(function (option) {
              return {
                id: option.id || uid("opt"),
                value: String(option.value || "").trim(),
                enabled: option.enabled !== false
              };
            })
            .filter(function (option) {
              return option.value.length > 0;
            });
        }

        if (block.kind === "button") {
          next.popupEnabled = !!block.popupEnabled;
          next.popupText = String(block.popupText || "");
        }

        return next;
      });

    blocks = ensureEditorButtonBlock(blocks);

    for (let i = 0; i < blocks.length; i += 1) {
      if (!isEditorKind(blocks[i].kind)) continue;

      normalizeTerminalEditorBlock(blocks[i]);
      const markers = parseOptionMarkers(blocks[i].value);
      const options = normalizeEditorOptions(blocks[i].options);
      const enabledCount = getEnabledOptionIndexes(options).length;
      if (markers.length !== enabledCount) {
        window.alert("Editor com lacunas inconsistentes. Revise as opções habilitadas.");
        return null;
      }

      const hasAnyExercise = markers.length > 0 || options.length > 0;
      const hasBlankMarker = markers.some(function (marker) { return !String(marker.value || "").trim(); });
      const hasBlankOption = options.some(function (option) { return !String(option.value || "").trim(); });
      if (hasAnyExercise && (hasBlankMarker || hasBlankOption)) {
        window.alert("Preencha todos os textos dentro de [[...]] e das opções do Editor.");
        return null;
      }
    }

    if (!blocks.length) {
      window.alert("Adicione pelo menos um bloco antes de salvar.");
      return null;
    }

    const heading = firstValue(blocks, "heading");
    const bodyBlocks = blocks.filter(function (block) {
      return block.kind === "paragraph" && String(block.value || "").trim();
    });
    const image = firstValue(blocks, "image");
    const terminal = firstValue(blocks, "editor");
    const firstButton = blocks.find(function (block) {
      return block.kind === "button" && String(block.value || "").trim();
    });

    const stepTypeBase = form.stepType === "lesson_complete" ? "lesson_complete" : "content";
    const type =
      stepTypeBase === "lesson_complete"
        ? "lesson_complete"
        : firstButton && firstButton.popupEnabled
          ? "content_with_inline_popup"
          : "content";

    const base = {
      id: id,
      type: type,
      title: clean(heading, stepTypeBase === "lesson_complete" ? "Lição concluída" : "Novo card"),
      buttonText: "CONTINUAR",
      blocks: blocks
    };

    if (bodyBlocks.length) base.bodyHtml = bodyBlocks.map(bodyBlockToHtml).join("");
    if (image) base.image = image;
    if (terminal) base.terminal = terminal;

    if (firstButton && firstButton.popupEnabled) {
      base.popupTriggerLabel = "Abrir popup";
      base.popupText = clean(firstButton.popupText, "Explique este ponto.");
    }

    if (stepTypeBase === "lesson_complete") {
      const firstParagraph = bodyBlocks.find(function (block) {
        return block.kind === "paragraph" && String(block.value || "").trim();
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
    state.editor.dragType = null;
    state.editor.pointerDrag = null;
    state.editor.blockDragId = null;
    state.editor.imageTargetBlockId = null;
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
    if (mode === "edit") {
      state.editor.draftByStepId[step.id] = clone(initialForm);
    }
    state.editor.dragType = null;
    state.editor.pointerDrag = null;
    state.editor.blockDragId = null;
    state.editor.imageTargetBlockId = null;
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
    state.editor.dragType = null;
    state.editor.pointerDrag = null;
    state.editor.blockDragId = null;
    state.editor.imageTargetBlockId = null;
    state.editor.pendingScrollBlockId = null;
    state.editor.terminalGuardByBlockId = {};
    state.editor.dragOverTargetId = null;
    state.editor.dragOverPosition = null;
    if (shouldRender !== false) renderApp();
  }

  // Adiciona novo bloco no canvas do editor.
  function addBlock(kind, targetId) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();
    if (BLOCK_TYPES.indexOf(kind) === -1) return;

    const block = { id: uid("block"), kind: kind, value: "" };
    if (kind === "editor") block.options = [];
    const blocks = ensureEditorButtonBlock(state.editor.form.blocks || []);
    const buttonIndex = blocks.findIndex(function (item) { return item.kind === "button"; });
    const insertAtEnd = buttonIndex > -1 ? buttonIndex : blocks.length;

    if (!targetId) {
      blocks.splice(insertAtEnd, 0, block);
    } else {
      const targetIndex = blocks.findIndex(function (item) { return item.id === targetId; });
      if (targetIndex === -1) {
        blocks.splice(insertAtEnd, 0, block);
      } else {
        const safeIndex = blocks[targetIndex] && blocks[targetIndex].kind === "button" ? targetIndex : targetIndex;
        blocks.splice(safeIndex, 0, block);
      }
    }

    state.editor.form.blocks = ensureEditorButtonBlock(blocks);
    state.editor.pendingScrollBlockId = block.id;
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

  // Adiciona opção/lacuna no bloco terminal do editor.
  function addTerminalOption(blockId) {
    if (!state.editor.open) return;
    const textField = root.querySelector(
      '.builder-block[data-block-id="' + cssEsc(blockId) + '"] [data-terminal-template]'
    );
    const selectionStart = textField && typeof textField.selectionStart === "number" ? textField.selectionStart : null;
    const selectionEnd = textField && typeof textField.selectionEnd === "number" ? textField.selectionEnd : null;

    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isEditorKind(block.kind)) return;

    block.kind = "editor";
    block.options = normalizeEditorOptions(block.options);
    const cursorStart = selectionStart === null ? String(block.value || "").length : selectionStart;
    const cursorEnd = selectionEnd === null ? cursorStart : selectionEnd;
    const newOption = { id: uid("opt"), value: "", enabled: true };
    block.value = insertMarkerAtPosition(String(block.value || ""), cursorStart, cursorEnd, newOption.value);
    block.options.push(newOption);
    normalizeTerminalEditorBlock(block);
    state.editor.pendingScrollBlockId = block.id;
    renderApp();
  }

  // Remove opção/lacuna do bloco terminal do editor.
  function removeTerminalOption(blockId, index) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isEditorKind(block.kind)) return;

    block.kind = "editor";
    block.options = normalizeEditorOptions(block.options);
    if (!Number.isInteger(index) || index < 0 || index >= block.options.length) return;

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
  function toggleTerminalOption(blockId, index) {
    if (!state.editor.open) return;
    snapshotEditorFromDom();

    const block = getEditorBlock(blockId);
    if (!block || !isEditorKind(block.kind)) return;

    block.kind = "editor";
    block.options = normalizeEditorOptions(block.options);
    if (!Number.isInteger(index) || index < 0 || index >= block.options.length) return;

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

  // Captura valores atuais do DOM do editor para o estado em memoria.
  function snapshotEditorFromDom() {
    if (!state.editor.open || !state.editor.form) return;

    const nodeList = root.querySelectorAll(".builder-block");
    const nextBlocks = [];
    nodeList.forEach(function (node) {
      const blockId = node.getAttribute("data-block-id");
      const kind = node.getAttribute("data-block-kind");
      const input = node.querySelector("[data-block-input]");
      const next = {
        id: blockId || uid("block"),
        kind: kind || "paragraph",
        value: input ? input.value : ""
      };

      if (isEditorKind(next.kind)) {
        next.kind = "editor";
        next.options = Array.from(node.querySelectorAll("[data-terminal-option-row]"))
          .map(function (row, optionIndex) {
            const inputNode = row.querySelector("[data-terminal-option]");
            const enabled = row.getAttribute("data-option-enabled") !== "0";
            return {
              id: row.getAttribute("data-option-id") || uid("opt"),
              value: inputNode ? String(inputNode.value || "") : "",
              enabled: enabled,
              indexHint: optionIndex
            };
          })
          .sort(function (a, b) { return a.indexHint - b.indexHint; })
          .map(function (item) {
            return { id: item.id, value: item.value, enabled: item.enabled };
          });
        normalizeTerminalEditorBlock(next);
        state.editor.terminalGuardByBlockId[next.id] = next.value;
      }

      if (next.kind === "button") {
        const popupToggle = node.querySelector("[data-button-popup]");
        const popupText = node.querySelector("[data-button-popup-text]");
        next.value = "CONTINUAR";
        next.popupEnabled = popupToggle ? popupToggle.checked : false;
        next.popupText = popupText ? popupText.value : "";
      }

      nextBlocks.push(next);
    });
    state.editor.form.blocks = ensureEditorButtonBlock(nextBlocks);
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
    state.ui.sideOpen = !state.ui.sideOpen;
    state.ui.contextMenu = null;
    renderApp();
  }

  // Abre/fecha painel rapido da licao.
  function toggleLessonQuick() {
    state.ui.lessonQuickOpen = !state.ui.lessonQuickOpen;
    state.ui.contextMenu = null;
    renderApp();
  }

  // Abre menu contextual de curso/modulo/licao.
  function openContextMenu(data) {
    state.ui.contextMenu = data;
    state.ui.sideOpen = false;
    renderApp();
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

    if (changed) renderApp();
  }


  // ============================================================================
  // Navegacao e Controle de Fluxo
  // ============================================================================
  // Navega para menu principal e preserva progresso atual quando necessario.
  function goMain() {
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
    const lessonEntry = getCurrentLessonEntry();
    if (!lessonEntry) return;

    state.inlinePopupOpen = null;
    state.feedback = null;

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
    const lessonEntry = getCurrentLessonEntry();
    if (!lessonEntry) return;

    state.inlinePopupOpen = null;
    state.feedback = null;

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
      scheduleLocalFolderPersist();
    }, 120);
  }

  // Persiste snapshot completo do projeto para recuperar tudo apos reinicio/reload.
  function persistProjectSnapshot() {
    try {
      const snapshot = {
        content: state.content,
        progress: serializeProgressForJson(),
        assets: state.assets,
        updatedAt: new Date().toISOString()
      };
      window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (_error) {
      // Silencioso: se estourar limite de armazenamento, o app continua funcionando.
    }
  }

  // Verifica se File System Access API esta disponivel neste navegador.
  function isFileSystemAccessSupported() {
    return !!(
      typeof window !== "undefined" &&
      typeof window.showDirectoryPicker === "function" &&
      typeof window.FileSystemFileHandle !== "undefined"
    );
  }

  // Agenda sincronizacao fisica em pasta local (modo opcional).
  function scheduleLocalFolderPersist() {
    if (!(state.fs && state.fs.enabled && state.fs.handle)) return;
    fsPersistQueued = true;
    if (fsPersistTimer) window.clearTimeout(fsPersistTimer);
    fsPersistTimer = window.setTimeout(function () {
      fsPersistTimer = null;
      persistProjectToLocalFolder(false);
    }, 500);
  }

  // Solicita ao usuario uma pasta local para sincronizacao automatica.
  async function chooseLocalFolderForSync() {
    if (!isFileSystemAccessSupported()) {
      window.alert("Seu navegador não suporta File System Access API.");
      return;
    }

    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      const granted = await ensureDirectoryPermission(handle);
      if (!granted) {
        window.alert("Permissão de escrita não concedida para a pasta selecionada.");
        return;
      }

      state.fs.enabled = true;
      state.fs.handle = handle;
      state.fs.folderName = String(handle.name || "");
      state.fs.lastError = "";
      renderApp();
      await persistProjectToLocalFolder(true);
    } catch (error) {
      if (error && error.name === "AbortError") return;
      state.fs.lastError = "Falha ao selecionar pasta local.";
      renderApp();
    }
  }

  // Desativa modo de sincronizacao em pasta local.
  function disconnectLocalFolderSync() {
    state.fs.enabled = false;
    state.fs.handle = null;
    state.fs.folderName = "";
    state.fs.lastError = "";
    state.fs.lastSavedAt = "";
    if (fsPersistTimer) {
      window.clearTimeout(fsPersistTimer);
      fsPersistTimer = null;
    }
    fsPersistInFlight = false;
    fsPersistQueued = false;
    renderApp();
  }

  // Garante permissao readwrite para operar no diretorio escolhido.
  async function ensureDirectoryPermission(handle) {
    if (!handle || typeof handle.queryPermission !== "function") return false;
    const mode = { mode: "readwrite" };
    let permission = await handle.queryPermission(mode);
    if (permission === "granted") return true;
    permission = await handle.requestPermission(mode);
    return permission === "granted";
  }

  // Sincroniza projeto completo para pasta local (JSON + imagens em assets/images).
  async function persistProjectToLocalFolder(showAlertOnError) {
    if (!(state.fs && state.fs.enabled && state.fs.handle)) return;

    fsPersistQueued = false;
    if (fsPersistInFlight) {
      fsPersistQueued = true;
      return;
    }

    const prevError = state.fs.lastError;
    fsPersistInFlight = true;
    try {
      const granted = await ensureDirectoryPermission(state.fs.handle);
      if (!granted) throw new Error("Permissão de escrita negada.");

      const payload = buildProjectPayload();
      const jsonText = JSON.stringify(payload, null, 2);
      await writeTextToDirectory(state.fs.handle, DEFAULT_PROJECT_JSON_FILE_NAME, jsonText);

      const assetPaths = Object.keys(state.assets).sort();
      for (let i = 0; i < assetPaths.length; i += 1) {
        const assetPath = assetPaths[i];
        const parsed = dataUrlToBytes(state.assets[assetPath]);
        if (!parsed) continue;
        await writeBytesToDirectory(state.fs.handle, assetPath, parsed.bytes);
      }

      state.fs.lastError = "";
      state.fs.lastSavedAt = new Date().toISOString();
    } catch (error) {
      state.fs.lastError = (error && error.message) ? String(error.message) : "Falha ao gravar pasta local.";
      if (showAlertOnError) window.alert(state.fs.lastError);
    } finally {
      fsPersistInFlight = false;
      if (fsPersistQueued) {
        fsPersistQueued = false;
        scheduleLocalFolderPersist();
      }
      if (prevError !== state.fs.lastError) {
        renderApp();
      }
    }
  }

  // Grava arquivo de texto em caminho relativo dentro do diretorio escolhido.
  async function writeTextToDirectory(rootHandle, relativePath, text) {
    await writeBytesToDirectory(rootHandle, relativePath, utf8Encode(String(text || "")));
  }

  // Grava bytes em caminho relativo dentro do diretorio escolhido.
  async function writeBytesToDirectory(rootHandle, relativePath, bytes) {
    const normalized = normalizeZipPath(relativePath);
    if (!normalized) throw new Error("Caminho de arquivo inválido.");

    const parts = normalized.split("/").filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) throw new Error("Nome de arquivo inválido.");

    let dir = rootHandle;
    for (let i = 0; i < parts.length; i += 1) {
      dir = await dir.getDirectoryHandle(parts[i], { create: true });
    }

    const fileHandle = await dir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    try {
      await writable.write(bytes);
    } finally {
      await writable.close();
    }
  }

  // Carrega progresso salvo no localStorage.
  function loadProgressStore() {
    try {
      const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (!raw) return { lessons: {} };
      return normalizeProgressStore(JSON.parse(raw));
    } catch (_error) {
      return { lessons: {} };
    }
  }

  // Normaliza estrutura de progresso para formato interno esperado.
  function normalizeProgressStore(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const sourceLessons = source.lessons && typeof source.lessons === "object" ? source.lessons : {};
    const lessons = {};

    Object.keys(sourceLessons).forEach(function (key) {
      const item = sourceLessons[key];
      if (!item || typeof item !== "object") return;

      const courseId = String(item.courseId || "").trim();
      const moduleId = String(item.moduleId || "").trim();
      const lessonId = String(item.lessonId || "").trim();
      if (!courseId || !moduleId || !lessonId) return;

      const currentIndexHint = normalizeIndexHint(item.currentIndexHint);
      const furthestIndexHint = normalizeIndexHint(item.furthestIndexHint);
      lessons[key] = {
        courseId: courseId,
        moduleId: moduleId,
        lessonId: lessonId,
        currentStepId: String(item.currentStepId || ""),
        currentIndexHint: currentIndexHint,
        furthestStepId: String(item.furthestStepId || item.currentStepId || ""),
        furthestIndexHint: furthestIndexHint === null ? currentIndexHint : furthestIndexHint,
        updatedAt: String(item.updatedAt || "")
      };
    });

    return { lessons: lessons };
  }

  // Persiste progresso atual no localStorage.
  function saveProgressStore() {
    try {
      window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state.progress));
    } catch (_error) {
      // Silencioso para manter o app funcional mesmo com storage bloqueado.
    }
  }

  // Indica se existe progresso registrado.
  function hasProgressEntries(progressStore) {
    return !!(progressStore && progressStore.lessons && Object.keys(progressStore.lessons).length);
  }

  // Normaliza progresso vindo de JSON importado.
  function normalizeImportedProgress(rawProgress) {
    if (!rawProgress || typeof rawProgress !== "object") return { lessons: {} };

    if (Array.isArray(rawProgress.lessons)) {
      const indexed = {};
      rawProgress.lessons.forEach(function (item) {
        if (!item || typeof item !== "object") return;
        const courseId = String(item.courseId || "").trim();
        const moduleId = String(item.moduleId || "").trim();
        const lessonId = String(item.lessonId || "").trim();
        if (!courseId || !moduleId || !lessonId) return;
        indexed[lessonProgressKey(courseId, moduleId, lessonId)] = item;
      });
      return normalizeProgressStore({ lessons: indexed });
    }

    if (rawProgress.lessons && typeof rawProgress.lessons === "object") {
      return normalizeProgressStore(rawProgress);
    }

    return { lessons: {} };
  }

  // Converte progresso interno para formato amigavel no JSON exportado.
  function serializeProgressForJson() {
    const records = Object.keys(state.progress.lessons || {})
      .map(function (key) { return state.progress.lessons[key]; })
      .filter(Boolean)
      .sort(function (a, b) {
        const keyA = a.courseId + "::" + a.moduleId + "::" + a.lessonId;
        const keyB = b.courseId + "::" + b.moduleId + "::" + b.lessonId;
        return keyA.localeCompare(keyB);
      });

    return { lessons: records };
  }

  // Gera chave unica hierarquica de progresso por licao.
  function lessonProgressKey(courseId, moduleId, lessonId) {
    return String(courseId) + "::" + String(moduleId) + "::" + String(lessonId);
  }

  // Busca registro de progresso de uma licao especifica.
  function getLessonProgressRecord(courseId, moduleId, lessonId) {
    const key = lessonProgressKey(courseId, moduleId, lessonId);
    return (state.progress.lessons || {})[key] || null;
  }

  // Ajusta registro de progresso quando estrutura da licao muda.
  function normalizeProgressRecordForLesson(record, courseId, moduleId, lessonId, steps) {
    if (!Array.isArray(steps) || !steps.length) return null;
    if (!record || typeof record !== "object") return null;

    const currentIndex = resolveProgressIndex(steps, record.currentStepId, record.currentIndexHint, 0);
    let furthestIndex = resolveProgressIndex(
      steps,
      record.furthestStepId || record.currentStepId,
      record.furthestIndexHint,
      currentIndex
    );
    if (furthestIndex < currentIndex) furthestIndex = currentIndex;

    return {
      courseId: courseId,
      moduleId: moduleId,
      lessonId: lessonId,
      currentStepId: steps[currentIndex].id,
      currentIndexHint: currentIndex,
      furthestStepId: steps[furthestIndex].id,
      furthestIndexHint: furthestIndex,
      updatedAt: String(record.updatedAt || new Date().toISOString())
    };
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

  // Resolve indice valido por ID de step, hint e fallback.
  function resolveProgressIndex(steps, stepId, indexHint, fallbackIndex) {
    if (!Array.isArray(steps) || !steps.length) return 0;
    const maxIndex = steps.length - 1;

    if (stepId) {
      const byId = steps.findIndex(function (step) { return step.id === stepId; });
      if (byId > -1) return byId;
    }

    const hint = normalizeIndexHint(indexHint);
    if (hint !== null) return clamp(hint - 1, 0, maxIndex);

    return clamp(fallbackIndex || 0, 0, maxIndex);
  }

  // Valida e normaliza indice numerico armazenado.
  function normalizeIndexHint(value) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) return null;
    return number;
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
    state.inlinePopupOpen = null;
    state.feedback = null;
    state.tokenByStepId = {};
    state.ui.sideOpen = false;
    state.ui.contextMenu = null;
    state.ui.lessonQuickOpen = false;
  }

  // ============================================================================
  // Exercicios (Token Fill e Terminal)
  // ============================================================================
  // Obtem estado em memoria do exercicio token_fill.
  function getExerciseState(step) {
    if (!state.tokenByStepId[step.id]) {
      state.tokenByStepId[step.id] = { slots: Array(step.slots).fill(null) };
    }
    return state.tokenByStepId[step.id];
  }

  // Retorna opções ainda disponiveis para preencher lacunas.
  function getAvailableOptions(step, slots) {
    return getAvailableOptionsFromList(step.options, slots);
  }

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

  // Verifica se todas as lacunas estao preenchidas.
  function isFilled(slots) {
    return slots.every(function (slot) { return slot !== null; });
  }

  // Aplica opção clicada na primeira lacuna vazia.
  function tokenOptionClick(value) {
    const step = getCurrentStep();
    if (!step || step.type !== "token_fill") return;

    const exercise = getExerciseState(step);
    const firstIndex = exercise.slots.findIndex(function (slot) { return slot === null; });
    if (firstIndex === -1) return;

    exercise.slots[firstIndex] = value;
    state.feedback = null;
    renderApp();
  }

  // Remove opção de uma lacuna preenchida.
  function tokenSlotClick(index) {
    const step = getCurrentStep();
    if (!step || step.type !== "token_fill") return;

    const exercise = getExerciseState(step);
    if (!exercise.slots[index]) return;

    exercise.slots[index] = null;
    state.feedback = null;
    renderApp();
  }

  // Limpa todas as lacunas do exercicio token_fill.
  function tokenReset() {
    const step = getCurrentStep();
    if (!step || step.type !== "token_fill") return;

    getExerciseState(step).slots = Array(step.slots).fill(null);
    state.feedback = null;
    renderApp();
  }

  // Valida resposta do exercicio token_fill.
  function tokenCheck() {
    const step = getCurrentStep();
    if (!step || step.type !== "token_fill") return;

    const exercise = getExerciseState(step);
    if (!isFilled(exercise.slots)) return;

    const ok = exercise.slots.every(function (value, index) { return value === step.answer[index]; });
    state.feedback = { type: ok ? "correct" : "incorrect", stepId: step.id };
    renderApp();
  }

  // Botao "Continuar" do token_fill: valida na primeira vez; avanca na segunda se estiver correto.
  function tokenContinue() {
    const step = getCurrentStep();
    if (!step || step.type !== "token_fill") return;

    if (state.feedback && state.feedback.stepId === step.id && state.feedback.type === "correct") {
      nextStep();
      return;
    }

    const exercise = getExerciseState(step);
    if (!isFilled(exercise.slots)) {
      state.feedback = {
        type: "incorrect",
        stepId: step.id,
        message: "Preencha todas as lacunas antes de continuar."
      };
      renderApp();
      return;
    }

    const ok = exercise.slots.every(function (value, index) { return value === step.answer[index]; });
    state.feedback = {
      type: ok ? "correct" : "incorrect",
      stepId: step.id,
      message: ok ? "" : ((step.incorrect && step.incorrect.message) || "Tente novamente.")
    };
    renderApp();
  }

  // Preenche automaticamente a resposta correta no token_fill.
  function applyAnswer() {
    const step = getCurrentStep();
    if (!step || step.type !== "token_fill") return;

    getExerciseState(step).slots = step.answer.slice(0, step.slots);
    state.feedback = null;
    renderApp();
  }

  // Gera chave unica para estado de exercicio do bloco terminal.
  function terminalExerciseKey(stepId, blockId) {
    return "terminal::" + stepId + "::" + blockId;
  }

  // Obtem/cria estado de exercicio do bloco terminal.
  function getTerminalExerciseState(step, block, slotCount) {
    const key = terminalExerciseKey(step.id, block.id);
    if (!state.tokenByStepId[key]) {
      state.tokenByStepId[key] = { slots: Array(slotCount).fill(null), feedback: null };
      return state.tokenByStepId[key];
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
    return current;
  }

  // Monta contexto do exercicio terminal no step atual.
  function getCurrentTerminalExercise(blockId) {
    const step = getCurrentStep();
    if (!step || !Array.isArray(step.blocks)) return null;

    const block = step.blocks.find(function (item) {
      return item.id === blockId && isEditorKind(item.kind);
    });
    if (!block) return null;

    const parsed = parseTerminalTemplate(block.value || "");
    if (!parsed.answers.length) return null;

    const exercise = getTerminalExerciseState(step, block, parsed.answers.length);
    const options = mergeTerminalOptions(block.options, parsed.answers);
    return { step: step, block: block, parsed: parsed, exercise: exercise, options: options };
  }

  // Seleciona opção no exercicio de terminal.
  function terminalOptionClick(blockId, value) {
    const entry = getCurrentTerminalExercise(blockId);
    if (!entry) return;

    const first = entry.exercise.slots.findIndex(function (slot) { return slot === null; });
    if (first === -1) return;

    entry.exercise.slots[first] = value;
    entry.exercise.feedback = null;
    renderApp();
  }

  // Remove opção de lacuna no exercicio de terminal.
  function terminalSlotClick(blockId, index) {
    const entry = getCurrentTerminalExercise(blockId);
    if (!entry) return;
    if (!Number.isInteger(index) || index < 0 || index >= entry.exercise.slots.length) return;
    if (!entry.exercise.slots[index]) return;

    entry.exercise.slots[index] = null;
    entry.exercise.feedback = null;
    renderApp();
  }

  // Limpa lacunas do exercicio terminal.
  function terminalReset(blockId) {
    const entry = getCurrentTerminalExercise(blockId);
    if (!entry) return;

    entry.exercise.slots = Array(entry.parsed.answers.length).fill(null);
    entry.exercise.feedback = null;
    renderApp();
  }

  // Valida exercicio terminal.
  function terminalCheck(blockId) {
    const entry = getCurrentTerminalExercise(blockId);
    if (!entry) return;
    if (!isFilled(entry.exercise.slots)) return;

    const ok = entry.exercise.slots.every(function (value, index) {
      return value === entry.parsed.answers[index];
    });
    entry.exercise.feedback = ok ? "correct" : "incorrect";
    renderApp();
  }

  // Valida todos os blocos Editor do step atual (usado no botao Continuar do card).
  function validateStepEditorExercises(step) {
    if (!step) return { hasExercise: false, status: "none" };

    const blocks = Array.isArray(step.blocks) ? step.blocks : [];
    const editorBlocks = blocks.filter(function (block) {
      return isEditorKind(block.kind) && parseTerminalTemplate(block.value || "").answers.length > 0;
    });
    if (!editorBlocks.length) return { hasExercise: false, status: "none" };

    let hasIncomplete = false;
    let hasIncorrect = false;

    editorBlocks.forEach(function (block) {
      const parsed = parseTerminalTemplate(block.value || "");
      const exercise = getTerminalExerciseState(step, block, parsed.answers.length);

      if (!isFilled(exercise.slots)) {
        exercise.feedback = "incomplete";
        hasIncomplete = true;
        return;
      }

      const ok = exercise.slots.every(function (value, index) {
        return value === parsed.answers[index];
      });
      if (ok) {
        exercise.feedback = "correct";
      } else {
        exercise.feedback = "incorrect";
        hasIncorrect = true;
      }
    });

    if (hasIncorrect) return { hasExercise: true, status: "incorrect" };
    if (hasIncomplete) return { hasExercise: true, status: "incomplete" };
    return { hasExercise: true, status: "correct" };
  }

  // Limpa todos os blocos Editor do step atual.
  function resetStepEditorExercises(step) {
    if (!step || !Array.isArray(step.blocks)) return;
    step.blocks.forEach(function (block) {
      if (!isEditorKind(block.kind)) return;
      const parsed = parseTerminalTemplate(block.value || "");
      if (!parsed.answers.length) return;
      const exercise = getTerminalExerciseState(step, block, parsed.answers.length);
      exercise.slots = Array(parsed.answers.length).fill(null);
      exercise.feedback = null;
    });
  }

  // Mostra resposta correta no exercicio terminal.
  function terminalViewAnswer(blockId) {
    const entry = getCurrentTerminalExercise(blockId);
    if (!entry) return;

    entry.exercise.slots = entry.parsed.answers.slice();
    entry.exercise.feedback = "correct";
    renderApp();
  }

  // Fecha feedback de erro do exercicio terminal.
  function terminalTryAgain(blockId) {
    const entry = getCurrentTerminalExercise(blockId);
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
    if (!state.content.courses.length) state.content.courses.push(defaultCourse("Novo curso"));
    pruneProgressStore();
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
    if (!course.modules.length) course.modules.push(defaultModule("Novo módulo"));
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
    if (!moduleEntry.module.lessons.length) moduleEntry.module.lessons.push(defaultLesson("Nova lição"));
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
  // Monta payload completo do projeto (conteúdo + progresso + assets referenciados).
  function buildProjectPayload() {
    pruneProgressStore();
    return {
      appTitle: state.content.appTitle,
      courses: clone(state.content.courses),
      progress: serializeProgressForJson(),
      assets: Object.keys(state.assets).sort(),
      packageMeta: {
        format: "aralearn-zip-v1",
        exportedAt: new Date().toISOString()
      }
    };
  }

  // Exporta pacote .zip contendo JSON completo e todas as imagens em assets/images/.
  function exportJson() {
    const payload = buildProjectPayload();
    const jsonBytes = utf8Encode(JSON.stringify(payload, null, 2));

    const entries = [
      { path: DEFAULT_PROJECT_JSON_FILE_NAME, bytes: jsonBytes }
    ];

    Object.keys(state.assets).sort().forEach(function (assetPath) {
      const parsed = dataUrlToBytes(state.assets[assetPath]);
      if (!parsed) return;
      entries.push({ path: assetPath, bytes: parsed.bytes });
    });

    const zipBytes = createZip(entries);
    const androidExportStatus = tryAndroidExport(zipBytes, DEFAULT_EXPORT_FILE_NAME, "application/zip");
    if (androidExportStatus !== "unsupported") return;

    const blob = new Blob([zipBytes], { type: "application/zip" });
    saveBlobDownload(blob, DEFAULT_EXPORT_FILE_NAME);
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

  // Abre seletor de arquivo para importar pacote ZIP/JSON.
  function triggerImport() {
    const input = document.getElementById("import-json-file");
    if (!input) return;
    input.value = "";
    input.click();
  }

  // Importa ZIP (preferencial) ou JSON de conteudo/progresso e re-renderiza app.
  function importJson(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const result = event.target.result;
        const isZip = file.name.toLowerCase().endsWith(".zip") || isZipBytes(result);

        if (isZip) {
          const imported = parseProjectZip(new Uint8Array(result));
          state.content = normalizeContent(imported.content);
          state.progress = normalizeImportedProgress(imported.progress);
          state.assets = normalizeAssetStore(imported.assets);
        } else {
          const parsed = JSON.parse(utf8Decode(new Uint8Array(result)));
          state.content = normalizeContent(parsed);
          state.progress = normalizeImportedProgress(parsed.progress);
          state.assets = normalizeAssetStore(parsed.assets);
        }

        pruneProgressStore();
        saveProgressStore();
        persistProjectSnapshot();
        goMain();
      } catch (_error) {
        window.alert("Arquivo inválido. Use ZIP exportado pelo app ou JSON válido.");
      }
    };
    if (file.name.toLowerCase().endsWith(".zip")) reader.readAsArrayBuffer(file);
    else reader.readAsArrayBuffer(file);
  }

  // Verifica assinatura PK inicial de arquivo ZIP.
  function isZipBytes(value) {
    if (!(value instanceof ArrayBuffer)) return false;
    const bytes = new Uint8Array(value);
    return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  }

  // Extrai conteúdo/progresso/assets de um ZIP exportado pelo app.
  function parseProjectZip(zipBytes) {
    const entries = parseZip(zipBytes);
    const byPath = {};
    entries.forEach(function (entry) {
      byPath[entry.path] = entry;
    });

    const jsonEntry =
      byPath[DEFAULT_PROJECT_JSON_FILE_NAME] ||
      entries.find(function (entry) {
      return entry.path.toLowerCase().endsWith(".json");
      });
    if (!jsonEntry) throw new Error("JSON principal não encontrado no ZIP.");

    const parsed = JSON.parse(utf8Decode(jsonEntry.bytes));
    const assets = {};
    entries.forEach(function (entry) {
      if (!/^assets\/images\//i.test(entry.path)) return;
      const mime = mimeFromExtension(entry.path) || "image/png";
      assets[entry.path] = bytesToDataUrl(entry.bytes, mime);
    });

    return {
      content: parsed,
      progress: parsed.progress,
      assets: assets
    };
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
    if (!file || !state.editor.open || !state.editor.imageTargetBlockId) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const data = String(event.target.result || "");
      const block = (state.editor.form.blocks || []).find(function (item) {
        return item.id === state.editor.imageTargetBlockId;
      });
      if (block) block.value = data;
      state.editor.imageTargetBlockId = null;
      renderApp();
    };
    reader.readAsDataURL(file);
  }

  // ============================================================================
  // Eventos da Interface (Clique, Input e Drag)
  // ============================================================================
  // Roteia todos os cliques da interface via data-action.
  function onRootClick(event) {
    const trigger = event.target.closest("[data-action]");
    if (!trigger) return;

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
      case "toggle-lesson-quick": toggleLessonQuick(); return;
      case "popup-open":
        state.inlinePopupOpen = { stepId: (getCurrentStep() || {}).id || "", blockId: INLINE_POPUP_BLOCK_ID };
        renderApp();
        return;
      case "step-button-click": {
        const step = getCurrentStep();
        if (!step) return;
        const gate = getStepEditorGate(step);
        if (gate.requiresSolve && !gate.solved) {
          const validation = validateStepEditorExercises(step);
          if (validation.hasExercise) {
            renderApp();
            return;
          }
        }

        if (step.type === "token_fill") {
          tokenContinue();
          return;
        }
        const popup = trigger.getAttribute("data-popup") === "1";
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
        const step = getCurrentStep();
        if (step) {
          const gate = getStepEditorGate(step);
          if (gate.requiresSolve && !gate.solved) {
            const validation = validateStepEditorExercises(step);
            if (validation.hasExercise) {
              renderApp();
              return;
            }
          }
          if (step.type === "token_fill") {
            tokenContinue();
            return;
          }
        }
        if (step && step.type === "lesson_complete") {
          goCourse(state.currentCourseId);
          return;
        }
        nextStep();
        return;
      }
      case "token-option": tokenOptionClick(decodeURIComponent(trigger.getAttribute("data-option") || "")); return;
      case "token-slot": tokenSlotClick(Number(trigger.getAttribute("data-slot-index"))); return;
      case "token-reset": tokenReset(); return;
      case "token-check": tokenCheck(); return;
      case "token-continue": tokenContinue(); return;
      case "step-editor-reset": {
        const step = getCurrentStep();
        if (!step) return;
        resetStepEditorExercises(step);
        renderApp();
        return;
      }
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
      case "feedback-next": nextStep(); return;
      case "feedback-view-answer": applyAnswer(); return;
      case "feedback-try-again": state.feedback = null; renderApp(); return;
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
      case "terminal-add-option":
        addTerminalOption(trigger.getAttribute("data-block-id"));
        return;
      case "terminal-toggle-option":
        toggleTerminalOption(
          trigger.getAttribute("data-block-id"),
          Number(trigger.getAttribute("data-option-index"))
        );
        return;
      case "terminal-remove-option":
        removeTerminalOption(
          trigger.getAttribute("data-block-id"),
          Number(trigger.getAttribute("data-option-index"))
        );
        return;
      case "block-remove": removeBlock(trigger.getAttribute("data-block-id")); return;
      case "block-up": moveBlock(trigger.getAttribute("data-block-id"), "up"); return;
      case "block-down": moveBlock(trigger.getAttribute("data-block-id"), "down"); return;
      case "block-pick-image":
        snapshotEditorFromDom();
        state.editor.imageTargetBlockId = trigger.getAttribute("data-block-id");
        pickEditorImage();
        return;
      case "create-course": createCourse(); return;
      case "edit-app-title": editAppTitle(); return;
      case "create-module": createModule(); return;
      case "import-json-trigger": triggerImport(); return;
      case "export-json": exportJson(); return;
      case "fs-pick-folder": chooseLocalFolderForSync(); return;
      case "fs-save-now": persistProjectToLocalFolder(true); return;
      case "fs-disconnect": disconnectLocalFolderSync(); return;
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
    if (!target || !state.editor.open) return;

    if (target.matches("[data-terminal-option]")) {
      const blockId = target.getAttribute("data-block-id");
      const optionIndex = Number(target.getAttribute("data-option-index"));
      syncTerminalOptionToTemplate(blockId, optionIndex, target.value);
      return;
    }

    if (target.matches("[data-terminal-template]")) {
      const blockId = target.getAttribute("data-block-id");
      syncTerminalTemplateToOptions(blockId, target);
    }
  }

  // Habilita/desabilita campos de popup do bloco botao.
  function syncButtonPopupFields(blockNode, enabled) {
    const popupText = blockNode.querySelector("[data-button-popup-text]");
    if (popupText) popupText.disabled = !enabled;
  }

  // Sincroniza input de opção para o texto [[...]] correspondente.
  function syncTerminalOptionToTemplate(blockId, optionIndex, value) {
    if (!Number.isInteger(optionIndex) || optionIndex < 0) return;

    const blockNode = root.querySelector('.builder-block[data-block-id="' + cssEsc(blockId) + '"]');
    if (!blockNode) return;

    const templateField = blockNode.querySelector("[data-terminal-template]");
    if (!templateField) return;

    const rows = Array.from(blockNode.querySelectorAll("[data-terminal-option-row]"));
    const enabledIndexes = rows
      .map(function (row, idx) { return row.getAttribute("data-option-enabled") !== "0" ? idx : -1; })
      .filter(function (idx) { return idx > -1; });
    const markerIndex = enabledIndexes.indexOf(optionIndex);
    if (markerIndex === -1) return;

    const markers = parseOptionMarkers(templateField.value);
    if (markerIndex >= markers.length) return;

    templateField.value = replaceMarkerAtIndex(templateField.value, markerIndex, value);
    state.editor.terminalGuardByBlockId[blockId] = templateField.value;
  }

  // Sincroniza texto [[...]] para a lista de opções.
  function syncTerminalTemplateToOptions(blockId, templateField) {
    const blockNode = templateField.closest(".builder-block");
    if (!blockNode) return;

    const rows = Array.from(blockNode.querySelectorAll("[data-terminal-option-row]"));
    const optionInputs = Array.from(blockNode.querySelectorAll("[data-terminal-option]"));
    const enabledIndexes = rows
      .map(function (row, idx) { return row.getAttribute("data-option-enabled") !== "0" ? idx : -1; })
      .filter(function (idx) { return idx > -1; });
    const markers = parseOptionMarkers(templateField.value);
    const expectedCount = enabledIndexes.length;

    if (markers.length !== expectedCount) {
      const fallback = state.editor.terminalGuardByBlockId[blockId];
      if (typeof fallback === "string") {
        templateField.value = fallback;
      }
      return;
    }

    markers.forEach(function (marker, enabledIndex) {
      const optionIndex = enabledIndexes[enabledIndex];
      if (Number.isInteger(optionIndex) && optionInputs[optionIndex]) {
        optionInputs[optionIndex].value = marker.value;
      }
    });
    state.editor.terminalGuardByBlockId[blockId] = templateField.value;
  }

  // Inicia drag and drop no editor.
  function onRootDragStart(event) {
    if (!state.editor.open) return;
    clearDragIndicators();

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
  }

  // Inicia arraste por ponteiro (mouse/toque) no botao de arrastar.
  function onRootPointerDown(event) {
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
    const node = root.querySelector('.builder-block[data-block-id="' + cssEsc(blockId) + '"]');
    if (!node) return;
    node.classList.add(position === "after" ? "drop-after" : "drop-before");
    state.editor.dragOverTargetId = blockId;
    state.editor.dragOverPosition = position;
  }

  // Limpa indicadores visuais de arraste.
  function clearDragIndicators() {
    root.querySelectorAll(".builder-block.drop-before, .builder-block.drop-after").forEach(function (node) {
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
      }
    }
  }

  // ============================================================================
  // Normalizacao de Conteudo
  // ============================================================================
  // Normaliza estrutura raiz de conteudo carregado.
  function normalizeContent(raw) {
    const source = raw && typeof raw === "object" ? clone(raw) : {};
    const normalized = {
      appTitle: clean(source.appTitle, DEFAULT_APP_TITLE),
      courses: Array.isArray(source.courses)
        ? source.courses.map(normalizeCourse).filter(Boolean)
        : []
    };

    if (!normalized.courses.length) normalized.courses.push(defaultCourse("Curso inicial"));
    return normalized;
  }

  // Normaliza objeto de curso.
  function normalizeCourse(raw) {
    if (!raw || typeof raw !== "object") return null;

    const course = {
      id: raw.id || uid("course"),
      title: clean(raw.title, "Curso sem nome"),
      description: String(raw.description || ""),
      modules: Array.isArray(raw.modules)
        ? raw.modules.map(normalizeModule).filter(Boolean)
        : []
    };

    if (!course.modules.length) course.modules.push(defaultModule("Módulo inicial"));
    return course;
  }

  // Normaliza objeto de modulo.
  function normalizeModule(raw) {
    if (!raw || typeof raw !== "object") return null;

    const moduleItem = {
      id: raw.id || uid("module"),
      title: clean(raw.title, "Módulo sem nome"),
      lessons: Array.isArray(raw.lessons)
        ? raw.lessons.map(normalizeLesson).filter(Boolean)
        : []
    };

    if (!moduleItem.lessons.length) moduleItem.lessons.push(defaultLesson("Nova lição"));
    return moduleItem;
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

  // Normaliza step conforme tipo (content, popup, token_fill, complete).
  function normalizeStep(raw) {
    if (!raw || typeof raw !== "object") return null;
    const type = STEP_TYPES.indexOf(raw.type) > -1 ? raw.type : "content";

    if (type === "token_fill") {
      const options = Array.isArray(raw.options) ? raw.options.map(String).filter(Boolean) : [];
      const answer = Array.isArray(raw.answer) ? raw.answer.map(String).filter(Boolean) : [];
      const slots = Math.max(1, Number(raw.slots) || answer.length || 2);

      while (answer.length < slots) answer.push(options[answer.length] || "resposta");
      answer.slice(0, slots).forEach(function (token) {
        if (options.indexOf(token) === -1) options.push(token);
      });
      if (!options.length) options.push("opção 1", "opção 2");

      return {
        id: raw.id || uid("step"),
        type: "token_fill",
        title: clean(raw.title, "PREENCHA"),
        prompt: clean(raw.prompt, "Monte o comando."),
        slots: slots,
        options: options,
        answer: answer.slice(0, slots),
        correct: {
          output: raw.correct && raw.correct.output ? String(raw.correct.output) : "",
          explanation: raw.correct && raw.correct.explanation ? String(raw.correct.explanation) : ""
        },
        incorrect: {
          message: raw.incorrect && raw.incorrect.message ? String(raw.incorrect.message) : "Tente novamente"
        }
      };
    }

    const step = {
      id: raw.id || uid("step"),
      type: type,
      title: clean(raw.title, type === "lesson_complete" ? "Lição concluída" : "Novo card"),
      buttonText: clean(raw.buttonText, "CONTINUAR")
    };

    if (Array.isArray(raw.blocks)) {
      step.blocks = raw.blocks.map(normalizeStepBlock).filter(Boolean);
      step.blocks = ensureEditorButtonBlock(step.blocks);
      const firstHeading = step.blocks.find(function (block) {
        return block.kind === "heading" && String(block.value || "").trim();
      });
      const firstButton = step.blocks.find(function (block) {
        return block.kind === "button" && String(block.value || "").trim();
      });
      if (firstHeading) step.title = firstHeading.value.trim();
      if (firstButton) step.buttonText = firstButton.value.trim();
    }

    if (raw.image) step.image = String(raw.image);
    if (raw.terminal) step.terminal = String(raw.terminal);
    if (typeof raw.bodyHtml === "string" && raw.bodyHtml.trim()) step.bodyHtml = safeHtml(raw.bodyHtml);
    else if (Array.isArray(raw.text)) {
      step.bodyHtml = raw.text.map(function (line) { return "<p>" + esc(String(line)) + "</p>"; }).join("");
    }

    if (type === "content_with_inline_popup") {
      step.popupTriggerLabel = clean(raw.popupTriggerLabel, "Abrir explicação");
      step.popupText = clean(raw.popupText, "Explique este ponto.");
    }

    if (type === "lesson_complete" && raw.subtitle) {
      step.subtitle = String(raw.subtitle);
    }

    return step;
  }

  // Normaliza bloco individual de step (heading, paragraph etc.).
  function normalizeStepBlock(raw) {
    if (!raw || typeof raw !== "object") return null;

    const rawKind = String(raw.kind || "paragraph");
    const kind = isEditorKind(rawKind) ? "editor" : rawKind;
    const allowed = ["heading", "paragraph", "bold", "italic", "image", "editor", "button"];
    if (allowed.indexOf(kind) === -1) return null;

    const block = {
      id: raw.id || uid("block"),
      kind: kind,
      value: String(raw.value || "")
    };

    if (kind === "editor") {
      block.options = normalizeEditorOptions(raw.options);
      normalizeTerminalEditorBlock(block);
    }

    if (kind === "button") {
      block.popupEnabled = !!raw.popupEnabled;
      block.popupText = String(raw.popupText || "");
    }

    return block;
  }


  // ============================================================================
  // Modelos Padrao (Defaults)
  // ============================================================================
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
      bodyHtml: "<p>Novo conteúdo.</p>",
      buttonText: "CONTINUAR",
      blocks: [
        { id: uid("block"), kind: "heading", value: "Novo card" },
        { id: uid("block"), kind: "paragraph", value: "Novo conteúdo." },
        { id: uid("block"), kind: "button", value: "CONTINUAR", popupEnabled: false, popupText: "" }
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
      buttonText: "CONTINUAR",
      blocks: [
        { id: uid("block"), kind: "heading", value: "Lição concluída" },
        { id: uid("block"), kind: "button", value: "CONTINUAR", popupEnabled: false, popupText: "" }
      ]
    };
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


  // ============================================================================
  // Transformacao de Texto e Blocos
  // ============================================================================
  // Transforma texto em lista de linhas limpas.
  function parseLines(text) {
    return String(text || "")
      .split(/\r?\n|,/)
      .map(function (item) { return item.trim(); })
      .filter(Boolean);
  }

  // Converte bodyHtml/text em blocos editaveis no editor.
  function extractBodyBlocks(step) {
    if (typeof step.bodyHtml === "string" && step.bodyHtml.trim()) {
      const container = document.createElement("div");
      container.innerHTML = step.bodyHtml;

      const blocks = [];
      const nodes = Array.from(container.childNodes).filter(function (node) {
        return node.nodeType === 1 || (node.nodeType === 3 && String(node.textContent || "").trim());
      });

      if (!nodes.length && container.textContent && container.textContent.trim()) {
        blocks.push({ kind: "paragraph", value: container.textContent.trim() });
      }

      nodes.forEach(function (node) {
        if (node.nodeType === 3) {
          const textNode = String(node.textContent || "").trim();
          if (textNode) blocks.push({ kind: "paragraph", value: textNode });
          return;
        }

        const element = node;
        const tag = element.tagName.toLowerCase();
        const text = nodeTextPreservingBreaks(element);
        if (!text) return;

        if (tag === "p") {
          const childElements = Array.from(element.children);
          const nonEmptyTextNodes = Array.from(element.childNodes).filter(function (child) {
            return child.nodeType === 3 && String(child.textContent || "").trim();
          });

          if (!nonEmptyTextNodes.length && childElements.length === 1) {
            const childTag = childElements[0].tagName.toLowerCase();
            if (childTag === "strong") {
              blocks.push({ kind: "bold", value: nodeTextPreservingBreaks(childElements[0]) });
              return;
            }
            if (childTag === "em") {
              blocks.push({ kind: "italic", value: nodeTextPreservingBreaks(childElements[0]) });
              return;
            }
          }

          blocks.push({ kind: "paragraph", value: text });
          return;
        }

        if (tag === "strong") {
          blocks.push({ kind: "bold", value: text });
          return;
        }
        if (tag === "em") {
          blocks.push({ kind: "italic", value: text });
          return;
        }

        blocks.push({ kind: "paragraph", value: text });
      });

      if (blocks.length) return blocks;
    }

    if (Array.isArray(step.text)) {
      return step.text
        .map(String)
        .map(function (line) { return line.trim(); })
        .filter(Boolean)
        .map(function (line) { return { kind: "paragraph", value: line }; });
    }

    return [];
  }

  // Extrai texto preservando quebras de linha de <br>.
  function nodeTextPreservingBreaks(node) {
    const clone = node.cloneNode(true);
    if (clone.querySelectorAll) {
      clone.querySelectorAll("br").forEach(function (br) {
        br.replaceWith("\n");
      });
    }
    return String(clone.textContent || "").replace(/\r/g, "").trim();
  }

  // Converte bloco de corpo para HTML de paragrafo.
  function bodyBlockToHtml(block) {
    if (!block || !String(block.value || "").trim()) return "";

    if (block.kind === "bold") return textToParagraphHtml(block.value, "strong");
    if (block.kind === "italic") return textToParagraphHtml(block.value, "em");
    return textToParagraphHtml(block.value, "");
  }

  // Converte texto com quebras em <p> e <br>.
  function textToParagraphHtml(text, inlineTag) {
    const chunks = String(text || "")
      .replace(/\r/g, "")
      .split(/\n\s*\n/)
      .map(function (part) { return part.trim(); })
      .filter(Boolean);

    return chunks
      .map(function (chunk) {
        const lineHtml = esc(chunk).replace(/\n/g, "<br>");
        const wrapped = inlineTag ? "<" + inlineTag + ">" + lineHtml + "</" + inlineTag + ">" : lineHtml;
        return "<p>" + wrapped + "</p>";
      })
      .join("");
  }

  // Retorna primeiro valor preenchido de um tipo de bloco.
  function firstValue(blocks, kind) {
    const item = blocks.find(function (block) {
      return block.kind === kind && String(block.value || "").trim();
    });
    return item ? item.value.trim() : "";
  }

  // Le valor de input por ID com fallback.
  function getValue(id, fallback) {
    const element = document.getElementById(id);
    return element ? element.value : fallback;
  }

  // ============================================================================
  // Utilitarios de Arquivo/ZIP/Imagem
  // ============================================================================
  // Codifica texto UTF-8 em bytes.
  function utf8Encode(text) {
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(String(text || ""));
    }

    // Fallback para navegadores antigos.
    const encoded = unescape(encodeURIComponent(String(text || "")));
    const bytes = new Uint8Array(encoded.length);
    for (let i = 0; i < encoded.length; i += 1) {
      bytes[i] = encoded.charCodeAt(i);
    }
    return bytes;
  }

  // Decodifica bytes UTF-8 para texto.
  function utf8Decode(bytes) {
    const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder("utf-8").decode(source);
    }

    // Fallback para navegadores antigos.
    let binary = "";
    for (let i = 0; i < source.length; i += 1) {
      binary += String.fromCharCode(source[i]);
    }
    try {
      return decodeURIComponent(escape(binary));
    } catch (_error) {
      return binary;
    }
  }

  // Converte Blob para Data URL (base64).
  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function (event) {
        resolve(String(event.target.result || ""));
      };
      reader.onerror = function () {
        reject(reader.error || new Error("Falha ao ler blob."));
      };
      reader.readAsDataURL(blob);
    });
  }

  // Extrai MIME de um Data URL.
  function dataUrlMimeType(dataUrl) {
    const text = String(dataUrl || "");
    const match = text.match(/^data:([^;,]+)(?:;[^,]*)?,/i);
    return match ? String(match[1]).toLowerCase() : "";
  }

  // Converte Data URL em bytes brutos.
  function dataUrlToBytes(dataUrl) {
    const text = String(dataUrl || "");
    if (!/^data:/i.test(text)) return null;

    const commaIndex = text.indexOf(",");
    if (commaIndex === -1) return null;

    const header = text.slice(5, commaIndex);
    const payload = text.slice(commaIndex + 1);
    const mime = dataUrlMimeType(text) || "application/octet-stream";
    const isBase64 = /;base64/i.test(header);

    if (!payload) return { mime: mime, bytes: new Uint8Array(0) };

    if (isBase64) {
      const cleanPayload = payload.replace(/\s+/g, "");
      const binary = window.atob(cleanPayload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return { mime: mime, bytes: bytes };
    }

    const decoded = decodeURIComponent(payload);
    return { mime: mime, bytes: utf8Encode(decoded) };
  }

  // Converte bytes em Data URL com MIME informado.
  function bytesToDataUrl(bytes, mimeType) {
    const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    const mime = String(mimeType || "application/octet-stream");
    return "data:" + mime + ";base64," + bytesToBase64(source);
  }

  // Converte bytes para base64.
  function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return window.btoa(binary);
  }

  // Detecta se o app esta rodando dentro do wrapper Android nativo.
  function isAndroidHostAvailable() {
    return !!(
      typeof window !== "undefined" &&
      window.AndroidHost &&
      typeof window.AndroidHost.saveExportFile === "function"
    );
  }

  // Mapeia MIME de imagem para extensão preferencial.
  function mimeToExtension(mimeType) {
    const mime = String(mimeType || "").toLowerCase().trim();
    if (!mime) return "";

    const map = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
      "image/bmp": "bmp",
      "image/x-icon": "ico",
      "image/vnd.microsoft.icon": "ico",
      "image/avif": "avif"
    };
    if (map[mime]) return map[mime];

    if (mime.indexOf("image/") === 0) {
      const subtype = mime.split("/")[1].split(";")[0].split("+")[0];
      return cleanAssetExtension(subtype);
    }
    return "";
  }

  // Mapeia extensão de arquivo para MIME de imagem.
  function mimeFromExtension(pathOrExt) {
    const ext = cleanAssetExtension(inferExtensionFromPath(pathOrExt) || pathOrExt);
    const map = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      bmp: "image/bmp",
      ico: "image/x-icon",
      avif: "image/avif"
    };
    return map[ext] || "";
  }

  // Extrai extensão de caminho/URL.
  function inferExtensionFromPath(path) {
    const text = String(path || "").trim();
    if (!text) return "";

    const noQuery = text.split("?")[0].split("#")[0];
    const match = noQuery.match(/\.([a-z0-9]+)$/i);
    return match ? cleanAssetExtension(match[1]) : "";
  }

  // Sanitiza extensão para uso em nome de arquivo.
  function cleanAssetExtension(ext) {
    const raw = String(ext || "")
      .toLowerCase()
      .replace(/^\./, "")
      .replace(/[^a-z0-9]/g, "");
    if (!raw) return "";
    if (raw === "jpeg") return "jpg";
    return raw;
  }

  // Converte Date para formato DOS usado em cabecalho ZIP.
  function toDosDateTime(date) {
    const d = date instanceof Date ? date : new Date();
    let year = d.getFullYear();
    if (year < 1980) year = 1980;
    if (year > 2107) year = 2107;
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours();
    const minute = d.getMinutes();
    const second = Math.floor(d.getSeconds() / 2);

    const dosDate = ((year - 1980) << 9) | (month << 5) | day;
    const dosTime = (hour << 11) | (minute << 5) | second;
    return { dosDate: dosDate, dosTime: dosTime };
  }

  // Calcula CRC32 (obrigatorio no formato ZIP).
  let crc32Table = null;
  function crc32(bytes) {
    const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    if (!crc32Table) {
      crc32Table = new Uint32Array(256);
      for (let i = 0; i < 256; i += 1) {
        let c = i;
        for (let k = 0; k < 8; k += 1) {
          c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crc32Table[i] = c >>> 0;
      }
    }

    let crc = 0xffffffff;
    for (let i = 0; i < source.length; i += 1) {
      crc = crc32Table[(crc ^ source[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  // Escreve inteiro little-endian 16 bits.
  function writeUInt16(view, offset, value) {
    view.setUint16(offset, value & 0xffff, true);
  }

  // Escreve inteiro little-endian 32 bits.
  function writeUInt32(view, offset, value) {
    view.setUint32(offset, value >>> 0, true);
  }

  // Le inteiro little-endian 16 bits de Uint8Array.
  function readUInt16(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
  }

  // Le inteiro little-endian 32 bits de Uint8Array.
  function readUInt32(bytes, offset) {
    return (
      (bytes[offset]) |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      ((bytes[offset + 3] << 24) >>> 0)
    ) >>> 0;
  }

  // Normaliza caminho interno do ZIP para evitar formatos inconsistentes.
  function normalizeZipPath(path) {
    const normalized = String(path || "")
      .replace(/\\/g, "/")
      .replace(/^\.\/+/, "")
      .replace(/^\/+/, "")
      .replace(/\/{2,}/g, "/")
      .trim();
    return normalized;
  }

  // Junta varios blocos Uint8Array em um unico buffer.
  function concatBytes(parts, totalLength) {
    const output = new Uint8Array(totalLength);
    let offset = 0;
    parts.forEach(function (part) {
      output.set(part, offset);
      offset += part.length;
    });
    return output;
  }

  // Cria ZIP simples (sem compressao) com caminhos/bytes informados.
  function createZip(entries) {
    const list = Array.isArray(entries) ? entries : [];
    const now = toDosDateTime(new Date());
    const localParts = [];
    const centralParts = [];
    const centralMeta = [];
    let localLength = 0;

    list.forEach(function (entry) {
      const path = normalizeZipPath(entry && entry.path);
      if (!path) return;

      const fileBytes =
        entry.bytes instanceof Uint8Array ? entry.bytes : new Uint8Array(entry.bytes || []);
      const nameBytes = utf8Encode(path);
      const crc = crc32(fileBytes);
      const localOffset = localLength;

      const localHeader = new Uint8Array(30);
      const localView = new DataView(localHeader.buffer);
      writeUInt32(localView, 0, 0x04034b50);
      writeUInt16(localView, 4, 20); // versao minima
      writeUInt16(localView, 6, 0x0800); // UTF-8
      writeUInt16(localView, 8, 0); // metodo: store (sem compressao)
      writeUInt16(localView, 10, now.dosTime);
      writeUInt16(localView, 12, now.dosDate);
      writeUInt32(localView, 14, crc);
      writeUInt32(localView, 18, fileBytes.length);
      writeUInt32(localView, 22, fileBytes.length);
      writeUInt16(localView, 26, nameBytes.length);
      writeUInt16(localView, 28, 0); // extra

      localParts.push(localHeader, nameBytes, fileBytes);
      localLength += localHeader.length + nameBytes.length + fileBytes.length;

      centralMeta.push({
        path: path,
        nameBytes: nameBytes,
        size: fileBytes.length,
        crc: crc,
        localOffset: localOffset
      });
    });

    let centralLength = 0;
    centralMeta.forEach(function (meta) {
      const centralHeader = new Uint8Array(46);
      const centralView = new DataView(centralHeader.buffer);
      writeUInt32(centralView, 0, 0x02014b50);
      writeUInt16(centralView, 4, 20); // versao criadora
      writeUInt16(centralView, 6, 20); // versao minima
      writeUInt16(centralView, 8, 0x0800); // UTF-8
      writeUInt16(centralView, 10, 0); // store
      writeUInt16(centralView, 12, now.dosTime);
      writeUInt16(centralView, 14, now.dosDate);
      writeUInt32(centralView, 16, meta.crc);
      writeUInt32(centralView, 20, meta.size);
      writeUInt32(centralView, 24, meta.size);
      writeUInt16(centralView, 28, meta.nameBytes.length);
      writeUInt16(centralView, 30, 0); // extra len
      writeUInt16(centralView, 32, 0); // comment len
      writeUInt16(centralView, 34, 0); // disk start
      writeUInt16(centralView, 36, 0); // internal attrs
      writeUInt32(centralView, 38, 0); // external attrs
      writeUInt32(centralView, 42, meta.localOffset);

      centralParts.push(centralHeader, meta.nameBytes);
      centralLength += centralHeader.length + meta.nameBytes.length;
    });

    const endHeader = new Uint8Array(22);
    const endView = new DataView(endHeader.buffer);
    writeUInt32(endView, 0, 0x06054b50);
    writeUInt16(endView, 4, 0); // disk number
    writeUInt16(endView, 6, 0); // central dir start disk
    writeUInt16(endView, 8, centralMeta.length);
    writeUInt16(endView, 10, centralMeta.length);
    writeUInt32(endView, 12, centralLength);
    writeUInt32(endView, 16, localLength);
    writeUInt16(endView, 20, 0); // comment len

    const totalLength = localLength + centralLength + endHeader.length;
    return concatBytes(localParts.concat(centralParts, [endHeader]), totalLength);
  }

  // Faz parse de ZIP simples (store, sem compressao).
  function parseZip(zipBytes) {
    const bytes = zipBytes instanceof Uint8Array ? zipBytes : new Uint8Array(zipBytes || []);
    if (bytes.length < 22) throw new Error("ZIP inválido (arquivo muito pequeno).");

    // Procura EOCD nos ultimos 64 KiB + cabecalho.
    const minOffset = Math.max(0, bytes.length - 65557);
    let eocdOffset = -1;
    for (let i = bytes.length - 22; i >= minOffset; i -= 1) {
      if (
        bytes[i] === 0x50 &&
        bytes[i + 1] === 0x4b &&
        bytes[i + 2] === 0x05 &&
        bytes[i + 3] === 0x06
      ) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset < 0) throw new Error("ZIP inválido (EOCD não encontrado).");

    const totalEntries = readUInt16(bytes, eocdOffset + 10);
    const centralOffset = readUInt32(bytes, eocdOffset + 16);
    if (centralOffset >= bytes.length) throw new Error("ZIP inválido (offset de diretório central).");

    let cursor = centralOffset;
    const entries = [];

    for (let index = 0; index < totalEntries; index += 1) {
      if (cursor + 46 > bytes.length) throw new Error("ZIP inválido (cabeçalho central truncado).");
      const signature = readUInt32(bytes, cursor);
      if (signature !== 0x02014b50) throw new Error("ZIP inválido (assinatura central inesperada).");

      const compression = readUInt16(bytes, cursor + 10);
      const compressedSize = readUInt32(bytes, cursor + 20);
      const fileNameLen = readUInt16(bytes, cursor + 28);
      const extraLen = readUInt16(bytes, cursor + 30);
      const commentLen = readUInt16(bytes, cursor + 32);
      const localOffset = readUInt32(bytes, cursor + 42);

      const nameStart = cursor + 46;
      const nameEnd = nameStart + fileNameLen;
      if (nameEnd > bytes.length) throw new Error("ZIP inválido (nome de arquivo truncado).");
      const path = normalizeZipPath(utf8Decode(bytes.subarray(nameStart, nameEnd)));

      cursor = nameEnd + extraLen + commentLen;

      if (localOffset + 30 > bytes.length) throw new Error("ZIP inválido (cabeçalho local truncado).");
      if (readUInt32(bytes, localOffset) !== 0x04034b50) {
        throw new Error("ZIP inválido (assinatura local inesperada).");
      }

      const localNameLen = readUInt16(bytes, localOffset + 26);
      const localExtraLen = readUInt16(bytes, localOffset + 28);
      const dataStart = localOffset + 30 + localNameLen + localExtraLen;
      const dataEnd = dataStart + compressedSize;
      if (dataEnd > bytes.length) throw new Error("ZIP inválido (dados de arquivo truncados).");

      if (compression !== 0) {
        throw new Error("ZIP com compressão não suportada. Use o ZIP exportado pelo app.");
      }

      entries.push({
        path: path,
        bytes: bytes.slice(dataStart, dataEnd)
      });
    }

    return entries;
  }


  // ============================================================================
  // Utilitarios Gerais
  // ============================================================================
  // Normaliza string com trim e fallback.
  function clean(value, fallback) {
    const text = String(value || "").trim();
    return text || fallback;
  }

  // Limita numero dentro de um intervalo minimo/maximo.
  function clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  // Gera ID unico simples para entidades em memoria.
  function uid(prefix) {
    idSeq += 1;
    return prefix + "-" + Date.now().toString(36) + "-" + idSeq.toString(36);
  }

  // Gera slug simples para IDs de negocio.
  function slug(text, fallback) {
    const base = String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return (base || fallback || "item") + "-" + Date.now().toString(36);
  }

  // Clona objeto via JSON (deep clone simples).
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  // Remove scripts/eventos inline para reduzir risco de XSS.
  function safeHtml(value) {
    return String(value)
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/\son\w+=\"[^\"]*\"/gi, "")
      .replace(/\son\w+='[^']*'/gi, "");
  }

  // Escapa texto para HTML seguro.
  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Escapa texto para atributo HTML.
  function escAttr(value) {
    return esc(value);
  }

  // Escapa texto para seletor CSS.
  function cssEsc(value) {
    if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(String(value));
    return String(value).replace(/(["\\.#:[\]])/g, "\\$1");
  }

  // Trata o botao fisico/gesto de voltar do Android de forma mais natural.
  function handleAndroidBackPress() {
    if (state.editor.open) {
      closeEditor();
      return true;
    }

    let changed = false;
    if (state.feedback) {
      state.feedback = null;
      changed = true;
    }
    if (state.inlinePopupOpen) {
      state.inlinePopupOpen = null;
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
      backStep();
      return true;
    }

    if (state.currentView === "course_menu") {
      goMain();
      return true;
    }

    return false;
  }

  // Rola editor ate o bloco recem-criado/alterado.
  function scrollEditorBlockIntoView(blockId) {
    const node = root.querySelector('.builder-block[data-block-id="' + cssEsc(blockId) + '"]');
    if (!node) return;

    node.scrollIntoView({ behavior: "smooth", block: "nearest" });
    node.classList.add("new-block");
    window.setTimeout(function () {
      node.classList.remove("new-block");
    }, 700);
  }

  // Expõe API minima para o wrapper Android consultar navegacao interna.
  if (typeof window !== "undefined") {
    window.AraLearnAndroid = window.AraLearnAndroid || {};
    window.AraLearnAndroid.handleBackPress = handleAndroidBackPress;
  }

  root.addEventListener("click", onRootClick);
  root.addEventListener("change", onRootChange);
  root.addEventListener("input", onRootInput);
  root.addEventListener("dragstart", onRootDragStart);
  root.addEventListener("dragover", onRootDragOver);
  root.addEventListener("drop", onRootDrop);
  root.addEventListener("dragend", onRootDragEnd);
  root.addEventListener("pointerdown", onRootPointerDown);
  document.addEventListener("pointermove", onDocumentPointerMove);
  document.addEventListener("pointerup", onDocumentPointerUp);
  document.addEventListener("click", onDocumentClick);

  if (state.content.courses.length) state.currentCourseId = state.content.courses[0].id;
  renderApp();
})();

