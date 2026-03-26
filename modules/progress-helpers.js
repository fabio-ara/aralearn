(function (global) {
  "use strict";

  function createProgressHelpers(deps) {
    const clamp = deps.clamp;

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

    // Indica se existe progresso registrado.
    function hasProgressEntries(progressStore) {
      return !!(progressStore && progressStore.lessons && Object.keys(progressStore.lessons).length);
    }

    // Gera chave unica hierarquica de progresso por licao.
    function lessonProgressKey(courseId, moduleId, lessonId) {
      return String(courseId) + "::" + String(moduleId) + "::" + String(lessonId);
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
    function serializeProgressForJson(progressStore) {
      const lessons = (progressStore && progressStore.lessons) || {};
      const records = Object.keys(lessons)
        .map(function (key) { return lessons[key]; })
        .filter(Boolean)
        .sort(function (a, b) {
          const keyA = a.courseId + "::" + a.moduleId + "::" + a.lessonId;
          const keyB = b.courseId + "::" + b.moduleId + "::" + b.lessonId;
          return keyA.localeCompare(keyB);
        });

      return { lessons: records };
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

    // Resolve indice valido por ID de step, hint e fallback.
    function resolveProgressIndex(steps, stepId, indexHint, fallbackIndex) {
      if (!Array.isArray(steps) || !steps.length) return 0;
      const maxIndex = steps.length - 1;

      if (stepId) {
        const byId = steps.findIndex(function (step) { return step.id === stepId; });
        if (byId > -1) return byId;
      }

      const hint = normalizeIndexHint(indexHint);
      if (hint !== null) return clamp(hint, 0, maxIndex);

      return clamp(fallbackIndex || 0, 0, maxIndex);
    }

    // Valida e normaliza indice numerico armazenado.
    function normalizeIndexHint(value) {
      const number = Number(value);
      if (!Number.isInteger(number) || number < 0) return null;
      return number;
    }

    return {
      normalizeProgressStore: normalizeProgressStore,
      hasProgressEntries: hasProgressEntries,
      lessonProgressKey: lessonProgressKey,
      normalizeImportedProgress: normalizeImportedProgress,
      serializeProgressForJson: serializeProgressForJson,
      normalizeProgressRecordForLesson: normalizeProgressRecordForLesson,
      resolveProgressIndex: resolveProgressIndex,
      normalizeIndexHint: normalizeIndexHint
    };
  }

  global.AraLearnProgressHelpers = {
    createProgressHelpers: createProgressHelpers
  };
})(window);
