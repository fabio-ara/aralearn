(function (global) {
  "use strict";

  function normalizeInteractionMode(value) {
    return String(value || "").toLowerCase() === "input" ? "input" : "choice";
  }

  function normalizeVariants(list) {
    if (!Array.isArray(list)) return [];

    return list.map(function (item, index) {
      const source =
        item && typeof item === "object" && !Array.isArray(item)
          ? item
          : { value: item };
      return {
        id: String(source.id || "variant-" + index),
        value: String(source.value || "").replace(/\r/g, ""),
        regex: !!source.regex
      };
    });
  }

  function tightenCodeSpacing(text) {
    return String(text || "").replace(/\s*([()[\]{}.,:;+\-*/=<>])\s*/g, "$1");
  }

  function normalizeComparableText(text) {
    return tightenCodeSpacing(
      String(text || "")
        .replace(/\r/g, "")
        .replace(/\n+/g, " ")
        .replace(/[ \t\u00a0]+/g, " ")
        .trim()
    );
  }

  function matchesTypedSlot(actualRaw, matcher) {
    const source = matcher && typeof matcher === "object" ? matcher : {};
    const value = String(source.value || "");
    if (!value.trim()) return false;

    if (source.regex) {
      try {
        return new RegExp(value).test(String(actualRaw || "").replace(/\r/g, "").trim());
      } catch (_error) {
        return false;
      }
    }

    return normalizeComparableText(actualRaw) === normalizeComparableText(value);
  }

  function validateTypedAttempt(config) {
    const source = config && typeof config === "object" ? config : {};
    const slots = Array.isArray(source.slots) ? source.slots : [];
    const matchersBySlot = Array.isArray(source.matchersBySlot) ? source.matchersBySlot : [];

    const incomplete = slots.some(function (value) {
      return value === null || value === undefined || String(value).trim() === "";
    });
    if (incomplete) return { status: "incomplete" };

    const slotOk = matchersBySlot.every(function (matchers, index) {
      const currentMatchers = Array.isArray(matchers) ? matchers : [];
      return currentMatchers.some(function (matcher) {
        return matchesTypedSlot(slots[index], matcher);
      });
    });

    return {
      status: slotOk ? "correct" : "incorrect",
      comparison: "slot_text"
    };
  }

  global.AraLearnCodeInput = {
    normalizeInteractionMode: normalizeInteractionMode,
    normalizeVariants: normalizeVariants,
    normalizeComparableText: normalizeComparableText,
    validateTypedAttempt: validateTypedAttempt
  };
})(window);
