(function (global) {
  "use strict";

  // Cria gerador simples de IDs para a sessao atual do app.
  function createIdTools() {
    let idSeq = 0;

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

    return {
      uid: uid,
      slug: slug
    };
  }

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

  global.AraLearnAppUtils = {
    createIdTools: createIdTools,
    clean: clean,
    clamp: clamp,
    clone: clone,
    safeHtml: safeHtml,
    esc: esc,
    escAttr: escAttr,
    cssEsc: cssEsc
  };
})(window);
