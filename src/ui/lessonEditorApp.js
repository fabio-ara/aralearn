import { renderLessonScreen } from "./renderLessonScreen.js";
import { renderCardEditorOverlay } from "./renderCardEditorOverlay.js";
import { renderCardCommentOverlay } from "./renderCardCommentOverlay.js";
import { renderEntityEditorOverlay } from "./renderEntityEditorOverlay.js";

const CARD_HISTORY_STORAGE_KEY = "aralearn.card-history.v1";
const CARD_COMMENT_STORAGE_KEY = "aralearn.card-comments.v1";
const MAX_ASSIST_DEPENDENCIES = 5;
const DEFAULT_ASSIST_DEPENDENCIES = 3;
const MAX_CARD_SNAPSHOTS = 6;

function fail(message) {
  throw new Error(message);
}

function readCardText(card) {
  if (card && card.data && typeof card.data.text === "string") {
    return card.data.text;
  }

  return "";
}

function readHistoryStorage() {
  if (!globalThis.localStorage) {
    return {};
  }

  try {
    const rawValue = globalThis.localStorage.getItem(CARD_HISTORY_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeHistoryStorage(historyMap) {
  if (!globalThis.localStorage) {
    return;
  }

  try {
    globalThis.localStorage.setItem(CARD_HISTORY_STORAGE_KEY, JSON.stringify(historyMap));
  } catch {
    // Evita quebrar a edição se a quota local estiver indisponível.
  }
}

function readCommentStorage() {
  if (!globalThis.localStorage) {
    return {};
  }

  try {
    const rawValue = globalThis.localStorage.getItem(CARD_COMMENT_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCommentStorage(commentMap) {
  if (!globalThis.localStorage) {
    return;
  }

  try {
    globalThis.localStorage.setItem(CARD_COMMENT_STORAGE_KEY, JSON.stringify(commentMap));
  } catch {
    // Evita quebrar a anotação se a quota local estiver indisponível.
  }
}

function buildCardPathKey(selection) {
  return [
    selection.courseKey,
    selection.moduleKey,
    selection.lessonKey,
    selection.microsequenceKey,
    selection.cardKey
  ].join("::");
}

function collectAssistDependencies(course, moduleValue, lesson, microsequence) {
  if (!course || !moduleValue || !lesson || !microsequence) {
    return [];
  }

  const dependencies = [];
  const seenKeys = new Set();

  function pushDependency(item, scope) {
    if (!item || !item.key || item.key === microsequence.key || seenKeys.has(item.key)) {
      return;
    }

    seenKeys.add(item.key);
    dependencies.push({
      key: item.key,
      title: item.title || item.key,
      scope
    });
  }

  const lessonMicrosequences = lesson.microsequences || [];
  const currentIndex = lessonMicrosequences.findIndex((item) => item.key === microsequence.key);
  lessonMicrosequences.slice(0, Math.max(0, currentIndex)).forEach((item) => pushDependency(item, "Lição"));

  (moduleValue.lessons || []).forEach((moduleLesson) => {
    if (moduleLesson.key === lesson.key) {
      return;
    }

    (moduleLesson.microsequences || []).forEach((item) => pushDependency(item, "Módulo"));
  });

  (course.modules || []).forEach((courseModule) => {
    if (courseModule.key === moduleValue.key) {
      return;
    }

    (courseModule.lessons || []).forEach((courseLesson) => {
      (courseLesson.microsequences || []).forEach((item) => pushDependency(item, "Curso"));
    });
  });

  return dependencies;
}

function getDefaultDependencyKeys(dependencies) {
  return dependencies.slice(0, DEFAULT_ASSIST_DEPENDENCIES).map((item) => item.key);
}

function getFirstPath(project) {
  const course = project.course;
  const moduleValue = course.modules[0];
  const lesson = moduleValue.lessons[0];
  const microsequence = lesson.microsequences[0];
  const card = (microsequence.cards || [])[0] || null;

  return {
    courseKey: course.key,
    moduleKey: moduleValue.key,
    lessonKey: lesson.key,
    microsequenceKey: microsequence.key,
    cardKey: card ? card.key : null,
    cardIndex: 0
  };
}

function findCourse(project, courseKey) {
  if (project.course && project.course.key === courseKey) {
    return project.course;
  }

  return null;
}

function findModule(project, courseKey, moduleKey) {
  const course = findCourse(project, courseKey);
  if (!course) return null;
  return (course.modules || []).find((item) => item.key === moduleKey) || null;
}

function findLesson(project, courseKey, moduleKey, lessonKey) {
  const moduleValue = findModule(project, courseKey, moduleKey);
  if (!moduleValue) return null;
  return (moduleValue.lessons || []).find((item) => item.key === lessonKey) || null;
}

function findMicrosequence(project, courseKey, moduleKey, lessonKey, microsequenceKey) {
  const lesson = findLesson(project, courseKey, moduleKey, lessonKey);
  if (!lesson) return null;
  return (lesson.microsequences || []).find((item) => item.key === microsequenceKey) || null;
}

function findCard(microsequence, cardKey) {
  return (microsequence.cards || []).find((item) => item.key === cardKey) || null;
}

function collectLessonCards(lesson) {
  const entries = [];
  (lesson?.microsequences || []).forEach((microsequence) => {
    (microsequence.cards || []).forEach((card, cardIndex) => {
      entries.push({
        microsequenceKey: microsequence.key,
        microsequenceTitle: microsequence.title || microsequence.key,
        cardKey: card.key,
        card,
        cardIndex
      });
    });
  });
  return entries;
}

function makeEntityEditorModel(state) {
  const { project, selection, entityEditor } = state;
  if (!entityEditor) return null;

  if (entityEditor.kind === "course") {
    const course = findCourse(project, selection.courseKey);
    if (!course) return null;
    return {
      title: "Curso",
      fields: [
        { name: "title", label: "Título", type: "text", value: course.title || "" },
        { name: "description", label: "Descrição", type: "textarea", value: course.description || "" }
      ]
    };
  }

  if (entityEditor.kind === "module") {
    const moduleValue = findModule(project, selection.courseKey, entityEditor.moduleKey);
    if (!moduleValue) return null;
    return {
      title: "Módulo",
      fields: [
        { name: "title", label: "Título", type: "text", value: moduleValue.title || "" },
        { name: "description", label: "Descrição", type: "textarea", value: moduleValue.description || "" }
      ]
    };
  }

  if (entityEditor.kind === "lesson") {
    const lesson = findLesson(project, selection.courseKey, entityEditor.moduleKey, entityEditor.lessonKey);
    if (!lesson) return null;
    return {
      title: "Lição",
      fields: [
        { name: "title", label: "Título", type: "text", value: lesson.title || "" },
        { name: "description", label: "Descrição", type: "textarea", value: lesson.description || "" }
      ]
    };
  }

  if (entityEditor.kind === "microsequence") {
    const microsequence = findMicrosequence(
      project,
      selection.courseKey,
      entityEditor.moduleKey,
      entityEditor.lessonKey,
      entityEditor.microsequenceKey
    );
    if (!microsequence) return null;
    return {
      title: "Microssequência",
      fields: [
        { name: "title", label: "Título", type: "text", value: microsequence.title || "" },
        { name: "objective", label: "Objetivo", type: "textarea", value: microsequence.objective || "" }
      ]
    };
  }

  return null;
}

export function createLessonEditorApp({ root, storage, editor }) {
  if (!root) fail("Raiz inválida.");
  if (!storage || typeof storage.loadProject !== "function") fail("Storage inválido.");
  if (!editor) fail("Editor inválido.");

  const state = {
    project: storage.loadProject(),
    view: "courses",
    selection: null,
    cardEditorOpen: false,
    cardCommentOpen: false,
    entityEditor: null,
    microsequenceMode: "play",
    cardHistory: readHistoryStorage(),
    cardComments: readCommentStorage(),
    cardCommentDraft: "",
    assistDraft: {
      selectedMode: "edit-card",
      promptText: "",
      dependencyKeys: [],
      pendingDependencyKey: "",
      versionKey: "current",
      lastRequest: null
    }
  };

  state.selection = getFirstPath(state.project);

  function setProject(nextProject) {
    state.project = nextProject;
  }

  function openCourse(courseKey) {
    const course = findCourse(state.project, courseKey);
    if (!course) return;
    state.selection.courseKey = course.key;
    state.view = "course";
    state.cardEditorOpen = false;
    state.cardCommentOpen = false;
    state.entityEditor = null;
    state.microsequenceMode = "play";
    render();
  }

  function openLesson(moduleKey, lessonKey) {
    const lesson = findLesson(state.project, state.selection.courseKey, moduleKey, lessonKey);
    if (!lesson) return;
    const firstMicrosequence = (lesson.microsequences || [])[0] || null;
    const firstCard = firstMicrosequence && firstMicrosequence.cards ? firstMicrosequence.cards[0] || null : null;

    state.selection.moduleKey = moduleKey;
    state.selection.lessonKey = lessonKey;
    state.selection.microsequenceKey = firstMicrosequence ? firstMicrosequence.key : null;
    state.selection.cardKey = firstCard ? firstCard.key : null;
    state.selection.cardIndex = 0;
    state.view = "lesson";
    state.cardEditorOpen = false;
    state.cardCommentOpen = false;
    state.entityEditor = null;
    state.microsequenceMode = "play";
    render();
  }

  function saveCardHistory() {
    writeHistoryStorage(state.cardHistory);
  }

  function getCurrentCardHistory() {
    const pathKey = buildCardPathKey(state.selection);
    return Array.isArray(state.cardHistory[pathKey]) ? state.cardHistory[pathKey] : [];
  }

  function recordCurrentCardSnapshot(label, source) {
    const context = getRenderContext();
    if (!context.card) {
      return;
    }

    const pathKey = buildCardPathKey(state.selection);
    const history = getCurrentCardHistory();
    const snapshot = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      label,
      source,
      title: context.card.title || "",
      text: readCardText(context.card),
      savedAt: new Date().toISOString()
    };

    if (history[0] && history[0].title === snapshot.title && history[0].text === snapshot.text) {
      return;
    }

    state.cardHistory[pathKey] = [snapshot, ...history].slice(0, MAX_CARD_SNAPSHOTS);
    saveCardHistory();
  }

  function ensureCurrentCardSnapshot() {
    const context = getRenderContext();
    if (!context.card) {
      return;
    }

    if (!getCurrentCardHistory().length) {
      recordCurrentCardSnapshot("Inicial", "base");
    }
  }

  function getAssistDependencies() {
    const context = getRenderContext();
    return collectAssistDependencies(context.course, context.moduleValue, context.lesson, context.microsequence);
  }

  function syncAssistDraft() {
    const dependencies = getAssistDependencies();
    const allowedKeys = new Set(dependencies.map((item) => item.key));
    const filteredKeys = state.assistDraft.dependencyKeys.filter((key) => allowedKeys.has(key));
    state.assistDraft.dependencyKeys =
      filteredKeys.length > 0 ? filteredKeys.slice(0, MAX_ASSIST_DEPENDENCIES) : getDefaultDependencyKeys(dependencies);

    const availableKeys = dependencies
      .filter((item) => !state.assistDraft.dependencyKeys.includes(item.key))
      .map((item) => item.key);
    if (!availableKeys.includes(state.assistDraft.pendingDependencyKey)) {
      state.assistDraft.pendingDependencyKey = availableKeys[0] || "";
    }

    const allowedVersionKeys = new Set(getCurrentCardHistory().map((item) => item.id));
    if (state.assistDraft.versionKey !== "current" && !allowedVersionKeys.has(state.assistDraft.versionKey)) {
      state.assistDraft.versionKey = "current";
    }
  }

  function applyCardContent({ title, text }) {
    const microsequence = findMicrosequence(
      state.project,
      state.selection.courseKey,
      state.selection.moduleKey,
      state.selection.lessonKey,
      state.selection.microsequenceKey
    );
    if (!microsequence) return;

    const card = state.selection.cardKey ? findCard(microsequence, state.selection.cardKey) : null;
    if (!card) return;

    try {
      const nextProject = editor.updateCard({
        moduleKey: state.selection.moduleKey,
        lessonKey: state.selection.lessonKey,
        microsequenceKey: microsequence.key,
        cardKey: card.key,
        title,
        data: {
          ...(card.data || {}),
          text
        }
      });

      setProject(nextProject);
    } catch {
      // Evita perder foco do editor em estados transitórios.
    }
  }

  function restoreCardVersion(versionKey) {
    if (!versionKey || versionKey === "current") {
      return;
    }

    const version = getCurrentCardHistory().find((item) => item.id === versionKey);
    if (!version) {
      return;
    }

    recordCurrentCardSnapshot("Antes de retomar", "manual");
    applyCardContent({
      title: version.title,
      text: version.text
    });
    state.assistDraft.versionKey = "current";
    state.assistDraft.lastRequest = {
      title: "Versão retomada",
      description: `Editor voltou para ${version.label.toLowerCase()}.`,
      timestamp: new Date().toISOString()
    };
    render();
  }

  function openMicrosequenceScreen(microsequenceKey, targetIndex = 0, mode = "play") {
    const microsequence = findMicrosequence(
      state.project,
      state.selection.courseKey,
      state.selection.moduleKey,
      state.selection.lessonKey,
      microsequenceKey
    );
    if (!microsequence) return;

    const cards = microsequence.cards || [];
    const safeIndex = Math.max(0, Math.min(targetIndex, Math.max(0, cards.length - 1)));
    const card = cards[safeIndex] || null;

    state.selection.microsequenceKey = microsequence.key;
    state.selection.cardIndex = safeIndex;
    state.selection.cardKey = card ? card.key : null;
    state.view = "microsequence";
    state.microsequenceMode = mode;
    ensureCurrentCardSnapshot();
    syncAssistDraft();
    state.cardEditorOpen = false;
    state.cardCommentOpen = false;
    state.entityEditor = null;
    render();
  }

  function openCardByIndex(targetIndex) {
    const lesson = findLesson(
      state.project,
      state.selection.courseKey,
      state.selection.moduleKey,
      state.selection.lessonKey
    );
    if (!lesson) return;

    if (state.view === "microsequence" && state.microsequenceMode === "play") {
      const lessonCards = collectLessonCards(lesson);
      const currentIndex = Math.max(
        0,
        lessonCards.findIndex((entry) => entry.cardKey === state.selection.cardKey)
      );
      const safeIndex = Math.max(0, Math.min(targetIndex, Math.max(0, lessonCards.length - 1)));
      const entry = lessonCards[safeIndex] || lessonCards[currentIndex] || null;
      if (!entry) return;
      state.selection.microsequenceKey = entry.microsequenceKey;
      state.selection.cardKey = entry.cardKey;
      state.selection.cardIndex = entry.cardIndex;
    } else {
      const microsequence = findMicrosequence(
        state.project,
        state.selection.courseKey,
        state.selection.moduleKey,
        state.selection.lessonKey,
        state.selection.microsequenceKey
      );
      if (!microsequence) return;

      const cards = microsequence.cards || [];
      const safeIndex = Math.max(0, Math.min(targetIndex, Math.max(0, cards.length - 1)));
      const card = cards[safeIndex] || null;
      state.selection.cardIndex = safeIndex;
      state.selection.cardKey = card ? card.key : null;
    }

    ensureCurrentCardSnapshot();
    syncAssistDraft();
    render();
  }

  function stepCard(delta) {
    const lesson = findLesson(
      state.project,
      state.selection.courseKey,
      state.selection.moduleKey,
      state.selection.lessonKey
    );
    if (!lesson) return;

    if (state.view === "microsequence" && state.microsequenceMode === "play") {
      const lessonCards = collectLessonCards(lesson);
      const currentIndex = Math.max(
        0,
        lessonCards.findIndex((entry) => entry.cardKey === state.selection.cardKey)
      );
      openCardByIndex(currentIndex + delta);
      return;
    }

    openCardByIndex((Number.isInteger(state.selection.cardIndex) ? state.selection.cardIndex : 0) + delta);
  }

  function openCardComment() {
    const pathKey = buildCardPathKey(state.selection);
    state.cardCommentDraft = typeof state.cardComments[pathKey] === "string" ? state.cardComments[pathKey] : "";
    state.cardCommentOpen = true;
    state.cardEditorOpen = false;
    state.entityEditor = null;
    render();
  }

  function closeCardComment() {
    state.cardCommentOpen = false;
    render();
  }

  function saveCardComment() {
    const pathKey = buildCardPathKey(state.selection);
    const nextValue = state.cardCommentDraft.trim();

    if (nextValue) {
      state.cardComments[pathKey] = state.cardCommentDraft;
    } else {
      delete state.cardComments[pathKey];
    }

    writeCommentStorage(state.cardComments);
    state.cardCommentOpen = false;
    render();
  }

  function openEntityEditor(kind, target = {}) {
    state.entityEditor = {
      kind,
      moduleKey: target.moduleKey || state.selection.moduleKey,
      lessonKey: target.lessonKey || state.selection.lessonKey,
      microsequenceKey: target.microsequenceKey || state.selection.microsequenceKey
    };
    state.cardEditorOpen = false;
    state.cardCommentOpen = false;
    render();
  }

  function closeEntityEditor() {
    state.entityEditor = null;
    render();
  }

  function openCardEditor() {
    state.cardEditorOpen = true;
    state.cardCommentOpen = false;
    state.entityEditor = null;
    render();
  }

  function closeCardEditor() {
    state.cardEditorOpen = false;
    render();
  }

  function goBack() {
    state.cardEditorOpen = false;
    state.cardCommentOpen = false;
    state.entityEditor = null;

    if (state.view === "microsequence") {
      state.view = "lesson";
      state.microsequenceMode = "play";
    } else if (state.view === "lesson") {
      state.view = "course";
    } else if (state.view === "course") {
      state.view = "courses";
    }

    render();
  }

  function updateEntityDraft(payload) {
    if (!state.entityEditor) return;

    try {
      let nextProject = null;
      if (state.entityEditor.kind === "course") {
        nextProject = editor.updateCourse({
          courseKey: state.selection.courseKey,
          title: payload.title,
          description: payload.description
        });
      } else if (state.entityEditor.kind === "module") {
        nextProject = editor.updateModule({
          courseKey: state.selection.courseKey,
          moduleKey: state.entityEditor.moduleKey,
          title: payload.title,
          description: payload.description
        });
      } else if (state.entityEditor.kind === "lesson") {
        nextProject = editor.updateLesson({
          moduleKey: state.entityEditor.moduleKey,
          lessonKey: state.entityEditor.lessonKey,
          title: payload.title,
          description: payload.description
        });
      } else if (state.entityEditor.kind === "microsequence") {
        nextProject = editor.updateMicrosequence({
          moduleKey: state.entityEditor.moduleKey,
          lessonKey: state.entityEditor.lessonKey,
          microsequenceKey: state.entityEditor.microsequenceKey,
          title: payload.title,
          objective: payload.objective
        });
      }

      if (nextProject) {
        setProject(nextProject);
      }
    } catch {
      // Evita quebrar a digitação durante estados transitórios inválidos.
    }
  }

  function updateCardDraft({ title, text }) {
    const microsequence = findMicrosequence(
      state.project,
      state.selection.courseKey,
      state.selection.moduleKey,
      state.selection.lessonKey,
      state.selection.microsequenceKey
    );
    if (!microsequence) return;

    const card = state.selection.cardKey ? findCard(microsequence, state.selection.cardKey) : null;
    if (!card) return;

    applyCardContent({ title, text });
  }

  function getRenderContext() {
    const course = findCourse(state.project, state.selection.courseKey);
    const moduleValue = findModule(state.project, state.selection.courseKey, state.selection.moduleKey);
    const lesson = findLesson(state.project, state.selection.courseKey, state.selection.moduleKey, state.selection.lessonKey);
    const microsequence = findMicrosequence(
      state.project,
      state.selection.courseKey,
      state.selection.moduleKey,
      state.selection.lessonKey,
      state.selection.microsequenceKey
    );
    const cards = microsequence ? microsequence.cards || [] : [];
    const card = microsequence && state.selection.cardKey ? findCard(microsequence, state.selection.cardKey) : cards[0] || null;
    const dependencies = [];
    dependencies.push(...collectAssistDependencies(course, moduleValue, lesson, microsequence));

    return { course, moduleValue, lesson, microsequence, cards, card, dependencies };
  }

  function render() {
    const context = getRenderContext();
    const entityEditorModel = makeEntityEditorModel(state);
    const currentVersions = [
      {
        key: "current",
        label: "Atual",
        source: "draft"
      },
      ...getCurrentCardHistory().map((item) => ({
        key: item.id,
        label: item.label,
        source: item.source,
        savedAt: item.savedAt
      }))
    ];

    root.innerHTML =
      '<div class="app-shell">' +
      renderLessonScreen({
        project: state.project,
        view: state.view,
        selection: state.selection,
        course: context.course,
        moduleValue: context.moduleValue,
        lesson: context.lesson,
        microsequence: context.microsequence,
        cards: context.cards,
        card: context.card,
        microsequenceMode: state.microsequenceMode,
        editorSupport: {
          progress: storage.loadProgress(),
          dependencies: context.dependencies,
          selectedDependencyKeys: state.assistDraft.dependencyKeys,
          pendingDependencyKey: state.assistDraft.pendingDependencyKey,
          selectedMode: state.assistDraft.selectedMode,
          promptText: state.assistDraft.promptText,
          selectedVersionKey: state.assistDraft.versionKey,
          lastRequest: state.assistDraft.lastRequest,
          versionOptions: currentVersions,
          modeOptions: [
            {
              value: "edit-card",
              label: "Ajustar este card",
              hint: "",
              buttonLabel: "Enviar"
            },
            {
              value: "review-dependencies",
              label: "Ajustar tags",
              hint: "",
              buttonLabel: "Enviar"
            },
            {
              value: "compose-microsequence",
              label: "Montar microssequência",
              hint: "",
              buttonLabel: "Enviar"
            },
            {
              value: "check-continuity",
              label: "Checar continuidade",
              hint: "",
              buttonLabel: "Enviar"
            }
          ]
        }
      }) +
      (state.cardEditorOpen
        ? renderCardEditorOverlay({
            cards: context.cards,
            card: context.card,
            selection: state.selection
          })
        : "") +
      (state.cardCommentOpen
        ? renderCardCommentOverlay({
            value: state.cardCommentDraft
          })
        : "") +
      (entityEditorModel ? renderEntityEditorOverlay(entityEditorModel) : "") +
      "</div>";

    root.querySelector("[data-action='go-back']")?.addEventListener("click", () => goBack());

    root.querySelectorAll("[data-action='open-course']").forEach((node) => {
      node.addEventListener("click", () => openCourse(state.selection.courseKey));
    });

    root.querySelectorAll("[data-action='open-lesson']").forEach((node) => {
      node.addEventListener("click", () => {
        const moduleKey = node.getAttribute("data-module-key");
        const lessonKey = node.getAttribute("data-lesson-key");
        if (!moduleKey || !lessonKey) return;
        openLesson(moduleKey, lessonKey);
      });
    });

    root.querySelectorAll("[data-action='open-microsequence']").forEach((node) => {
      node.addEventListener("click", () => {
        const microsequenceKey = node.getAttribute("data-microsequence-key");
        if (!microsequenceKey) return;
        openMicrosequenceScreen(microsequenceKey, 0, "edit");
      });
    });

    root.querySelectorAll("[data-action='play-microsequence']").forEach((node) => {
      node.addEventListener("click", () => {
        const microsequenceKey = node.getAttribute("data-microsequence-key");
        if (!microsequenceKey) return;
        openMicrosequenceScreen(microsequenceKey, 0, "play");
      });
    });

    root.querySelectorAll("[data-action='open-microsequence-card']").forEach((node) => {
      node.addEventListener("click", () => {
        const microsequenceKey = node.getAttribute("data-microsequence-key");
        const index = Number.parseInt(node.getAttribute("data-card-index") || "0", 10);
        if (!microsequenceKey || !Number.isFinite(index)) return;
        openMicrosequenceScreen(microsequenceKey, index, "play");
      });
    });

    root.querySelectorAll("[data-action='open-card']").forEach((node) => {
      node.addEventListener("click", () => {
        const index = Number.parseInt(node.getAttribute("data-card-index") || "0", 10);
        if (!Number.isFinite(index)) return;
        openCardByIndex(index);
      });
    });

    root.querySelector("[data-action='prev-card']")?.addEventListener("click", () => stepCard(-1));
    root.querySelector("[data-action='next-card']")?.addEventListener("click", () => stepCard(1));
    root.querySelector("[data-action='close-study']")?.addEventListener("click", () => goBack());
    root.querySelector("[data-action='go-home']")?.addEventListener("click", () => goBack());
    root.querySelector("[data-action='open-card-comment']")?.addEventListener("click", () => openCardComment());

    root.querySelector("[data-action='open-editor']")?.addEventListener("click", () => openCardEditor());
    root.querySelector("[data-action='editor-close']")?.addEventListener("click", () => closeCardEditor());
    root.querySelector("[data-action='editor-save']")?.addEventListener("click", () => closeCardEditor());
    root.querySelector("[data-action='editor-prev-card']")?.addEventListener("click", () => openCardByIndex(state.selection.cardIndex - 1));
    root.querySelector("[data-action='editor-next-card']")?.addEventListener("click", () => openCardByIndex(state.selection.cardIndex + 1));

    root.querySelectorAll("[data-action='open-card-index']").forEach((node) => {
      node.addEventListener("click", () => {
        const index = Number.parseInt(node.getAttribute("data-card-index") || "0", 10);
        if (!Number.isFinite(index)) return;
        openCardByIndex(index);
      });
    });

    root.querySelector("[data-action='edit-course']")?.addEventListener("click", () => openEntityEditor("course"));
    root.querySelectorAll("[data-action='edit-module']").forEach((node) => {
      node.addEventListener("click", () => {
        const moduleKey = node.getAttribute("data-module-key");
        if (!moduleKey) return;
        openEntityEditor("module", { moduleKey });
      });
    });
    root.querySelectorAll("[data-action='edit-lesson']").forEach((node) => {
      node.addEventListener("click", () => {
        const moduleKey = node.getAttribute("data-module-key") || state.selection.moduleKey;
        const lessonKey = node.getAttribute("data-lesson-key") || state.selection.lessonKey;
        openEntityEditor("lesson", { moduleKey, lessonKey });
      });
    });
    root.querySelector("[data-action='edit-microsequence']")?.addEventListener("click", () =>
      openEntityEditor("microsequence", {
        moduleKey: state.selection.moduleKey,
        lessonKey: state.selection.lessonKey,
        microsequenceKey: state.selection.microsequenceKey
      })
    );
    root.querySelector("[data-action='switch-microsequence-edit']")?.addEventListener("click", () => {
      state.microsequenceMode = "edit";
      render();
    });

    root.querySelector("[data-action='entity-editor-close']")?.addEventListener("click", () => closeEntityEditor());
    root.querySelector("[data-action='entity-editor-save']")?.addEventListener("click", () => closeEntityEditor());
    root.querySelector("[data-action='comment-close']")?.addEventListener("click", () => closeCardComment());
    root.querySelector("[data-action='comment-save']")?.addEventListener("click", () => saveCardComment());

    const cardTitleInput = root.querySelector("[data-field='card-title']");
    const cardTextInput = root.querySelector("[data-field='card-text']");
    const cardCommentInput = root.querySelector("[data-field='card-comment']");
    if (cardTitleInput && cardTextInput && context.card) {
      cardTitleInput.value = context.card.title || "";
      cardTextInput.value =
        context.card.data && typeof context.card.data.text === "string" ? context.card.data.text : "";
      const handler = () => updateCardDraft({ title: cardTitleInput.value, text: cardTextInput.value });
      cardTitleInput.addEventListener("input", handler);
      cardTextInput.addEventListener("input", handler);
    }
    if (cardCommentInput) {
      cardCommentInput.value = state.cardCommentDraft;
      cardCommentInput.addEventListener("input", () => {
        state.cardCommentDraft = cardCommentInput.value;
      });
    }

    root.querySelector("[data-action='save-inline-card']")?.addEventListener("click", () => {
      recordCurrentCardSnapshot("Manual", "manual");
      state.microsequenceMode = "play";
      render();
    });

    const assistMode = root.querySelector("[data-field='assist-mode']");
    const assistVersion = root.querySelector("[data-field='assist-version']");
    const assistDependencyPicker = root.querySelector("[data-field='assist-dependency-picker']");
    const assistPrompt = root.querySelector("[data-field='assist-prompt']");
    if (assistMode) {
      assistMode.addEventListener("change", () => {
        state.assistDraft.selectedMode = assistMode.value;
      });
    }
    if (assistVersion) {
      assistVersion.addEventListener("change", () => {
        state.assistDraft.versionKey = assistVersion.value;
      });
    }
    if (assistDependencyPicker) {
      assistDependencyPicker.addEventListener("change", () => {
        state.assistDraft.pendingDependencyKey = assistDependencyPicker.value;
      });
    }
    if (assistPrompt) {
      assistPrompt.addEventListener("input", () => {
        state.assistDraft.promptText = assistPrompt.value;
      });
    }
    root.querySelectorAll("[data-action='remove-dependency']").forEach((node) => {
      node.addEventListener("click", () => {
        const key = node.getAttribute("data-dependency-key");
        if (!key) return;
        state.assistDraft.dependencyKeys = state.assistDraft.dependencyKeys.filter((item) => item !== key);
        syncAssistDraft();
        render();
      });
    });
    root.querySelector("[data-action='add-dependency']")?.addEventListener("click", () => {
      const key = state.assistDraft.pendingDependencyKey;
      if (!key) return;
      const current = new Set(state.assistDraft.dependencyKeys);
      if (current.size >= MAX_ASSIST_DEPENDENCIES || current.has(key)) return;
      current.add(key);
      state.assistDraft.dependencyKeys = Array.from(current).slice(0, MAX_ASSIST_DEPENDENCIES);
      syncAssistDraft();
        render();
    });
    root.querySelector("[data-action='clear-prompt']")?.addEventListener("click", () => {
      state.assistDraft.promptText = "";
      render();
    });
    root.querySelector("[data-action='apply-assist']")?.addEventListener("click", () => {
      const modeOption =
        (
          [
            { value: "edit-card", label: "Ajustar este card" },
            { value: "review-dependencies", label: "Rever dependências" },
            { value: "compose-microsequence", label: "Montar a microssequência" },
            { value: "check-continuity", label: "Checar continuidade" }
          ].find((item) => item.value === state.assistDraft.selectedMode) || null
        );
      const selectedTitles = getAssistDependencies()
        .filter((item) => state.assistDraft.dependencyKeys.includes(item.key))
        .map((item) => item.title);
      const baseOption =
        currentVersions.find((item) => item.key === state.assistDraft.versionKey) || currentVersions[0];

      recordCurrentCardSnapshot("Antes do pedido", "assist");
      state.assistDraft.lastRequest = {
        title: modeOption ? modeOption.label : "Pedido",
        description:
          "Retomar: " +
          baseOption.label +
          " • Tags: " +
          (selectedTitles.length ? selectedTitles.join(", ") : "sem dependências extras") +
          (state.assistDraft.promptText.trim() ? " • Pedido pronto." : " • Falta escrever."),
        timestamp: new Date().toISOString()
      };
      state.microsequenceMode = "edit";
      render();
    });
    root.querySelector("[data-action='restore-version']")?.addEventListener("click", () => {
      restoreCardVersion(state.assistDraft.versionKey);
    });

    if (entityEditorModel) {
      const fields = {};
      entityEditorModel.fields.forEach((field) => {
        const node = root.querySelector(`[data-field='${field.name}']`);
        if (node) {
          fields[field.name] = node;
        }
      });

      const handler = () => {
        updateEntityDraft(
          Object.fromEntries(
            Object.entries(fields).map(([name, node]) => [name, node.value])
          )
        );
      };

      Object.values(fields).forEach((node) => {
        node.addEventListener("input", handler);
      });
    }
  }

  ensureCurrentCardSnapshot();
  syncAssistDraft();
  render();
}
