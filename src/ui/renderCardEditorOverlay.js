function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeBlocks(card) {
  if (card && card.data && Array.isArray(card.data.blocks)) {
    return card.data.blocks;
  }

  return [];
}

function renderBlockPills(blocks, limit = 4) {
  return (blocks || [])
    .slice(0, limit)
    .map((block) => {
      return (
        '<div class="block-pill-line block-pill-' +
        escapeHtml(block.kind || "text") +
        '">' +
        '<span class="block-pill-line-main">' +
        escapeHtml(block.label || block.kind || "Bloco") +
        "</span>" +
        '<span class="block-pill-line-kind">' +
        escapeHtml(block.kind || "text") +
        "</span>" +
        "</div>"
      );
    })
    .join("");
}

function renderBlockStack(blocks) {
  const labelsByKind = {
    heading: "Título",
    paragraph: "Texto",
    list: "Lista",
    choice: "Escolha",
    table: "Tabela",
    image: "Imagem",
    flowchart: "Fluxo",
    popup: "Popup"
  };

  return (blocks || [])
    .map((block) => {
      return (
        '<article class="builder-outline builder-outline-' +
        escapeHtml(block.kind || "text") +
        '">' +
        '<div class="builder-outline-kind">' +
        escapeHtml(labelsByKind[block.kind] || block.kind || "Bloco") +
        "</div>" +
        '<div class="builder-outline-label">' +
        escapeHtml(block.label || "") +
        "</div>" +
        "</article>"
      );
    })
    .join("");
}

function renderEditorCardStrip(cards, activeIndex) {
  return cards
    .map((item, index) => {
      const titleText = item.title || `Card ${index + 1}`;
      return (
        '<button class="mini-card' +
        (index === activeIndex ? " active" : "") +
        '" data-action="open-card-index" data-card-index="' +
        String(index) +
        '" type="button">' +
        '<div class="mini-card-kicker">Card ' +
        String(index + 1) +
        "</div>" +
        '<div class="mini-card-title">' +
        escapeHtml(titleText) +
        "</div>" +
        '<div class="mini-card-canvas">' +
        '<div class="mini-card-structure block-pill-stack">' +
        renderBlockPills(normalizeBlocks(item), 5) +
        "</div>" +
        "</div>" +
        "</button>"
      );
    })
    .join("");
}

export function renderInlineCardEditor({ cards, card, selection }) {
  const activeIndex = Number.isInteger(selection.cardIndex) ? selection.cardIndex : 0;
  const prevDisabled = activeIndex <= 0;
  const nextDisabled = activeIndex >= cards.length - 1;
  const chips = renderEditorCardStrip(cards, activeIndex);
  const title = card ? escapeHtml(card.title || "") : "";
  const text = card && card.data && typeof card.data.text === "string" ? escapeHtml(card.data.text) : "";
  const blocks = normalizeBlocks(card);

  const palette = [
    { type: "heading", icon: "T", label: "Título" },
    { type: "paragraph", icon: "¶", label: "Texto" },
    { type: "list", icon: "≡", label: "Lista" },
    { type: "choice", icon: "◉", label: "Escolha" },
    { type: "table", icon: "▦", label: "Tabela" },
    { type: "image", icon: "◫", label: "Imagem" },
    { type: "flowchart", icon: "⇄", label: "Fluxo" },
    { type: "popup", icon: "+", label: "Popup" }
  ]
    .map((item) => {
      return (
        '<button class="palette-icon" type="button" data-block-type="' +
        escapeHtml(item.type) +
        '" title="' +
        escapeHtml(item.label) +
        '" aria-label="' +
        escapeHtml(item.label) +
        '">' +
        escapeHtml(item.icon) +
        "</button>"
      );
    })
    .join("");

  return (
    '<section class="editor-step-nav inline-editor-step-nav" aria-label="Navegação">' +
    '<div class="editor-step-nav-head">' +
    '<button class="icon-ghost tiny-icon" type="button" data-action="editor-prev-card" ' +
    (prevDisabled ? 'disabled aria-disabled="true"' : "") +
    ' title="Card anterior" aria-label="Card anterior">&larr;</button>' +
    '<p class="chip-muted">Card ' +
    String(activeIndex + 1) +
    " de " +
    String(cards.length) +
    "</p>" +
    '<button class="icon-ghost tiny-icon" type="button" data-action="editor-next-card" ' +
    (nextDisabled ? 'disabled aria-disabled="true"' : "") +
    ' title="Próximo card" aria-label="Próximo card">&rarr;</button>' +
    "</div>" +
    '<div class="editor-step-strip card-strip compact-editor-strip">' +
    chips +
    "</div>" +
    "</section>" +
    '<section class="builder-layout inline-builder-layout">' +
    '<aside class="palette-col inline-palette-col" aria-label="Inserir contêineres">' +
    palette +
    "</aside>" +
    '<section class="inline-editor-canvas">' +
    '<article class="builder-block inline-builder-block">' +
    '<div class="builder-tools">' +
    '<div class="builder-meta"><span class="builder-kind-pill">card</span></div>' +
    '<div class="builder-tool-right">' +
    '<button class="icon-ghost tiny-icon" type="button" data-action="save-inline-card" title="Salvar card" aria-label="Salvar card">&#10003;</button>' +
    "</div>" +
    "</div>" +
    '<div class="builder-outline-stack">' +
    renderBlockStack(blocks) +
    "</div>" +
    '<div class="field compact-field">' +
    "<label>Título</label>" +
    '<input data-field="card-title" type="text" value="' +
    title +
    '">' +
    "</div>" +
    '<div class="field compact-field grow-field">' +
    "<label>Texto</label>" +
    '<textarea data-field="card-text" class="inline-editor-textarea">' +
    text +
    "</textarea>" +
    "</div>" +
    "</article>" +
    "</section>" +
    "</section>"
  );
}

export function renderCardEditorOverlay({ cards, card, selection }) {
  const activeIndex = Number.isInteger(selection.cardIndex) ? selection.cardIndex : 0;
  const prevDisabled = activeIndex <= 0;
  const nextDisabled = activeIndex >= cards.length - 1;

  const chips = renderEditorCardStrip(cards, activeIndex);

  const title = card ? escapeHtml(card.title || "") : "";
  const text = card && card.data && typeof card.data.text === "string" ? escapeHtml(card.data.text) : "";

  return (
    '<section class="editor-overlay" aria-label="Editor de card">' +
    '<article class="editor-sheet" role="dialog" aria-modal="true">' +
    '<header class="editor-head">' +
    '<button class="icon-ghost" type="button" data-action="editor-close" title="Fechar" aria-label="Fechar">&times;</button>' +
    '<p class="editor-title">Editor de card</p>' +
    '<button class="icon-ghost" type="button" data-action="editor-save" title="Salvar" aria-label="Salvar">&#10003;</button>' +
    "</header>" +
    '<div class="editor-body">' +
    '<section class="editor-step-nav" aria-label="Navegação">' +
    '<div class="editor-step-nav-head">' +
    '<button class="icon-ghost tiny-icon" type="button" data-action="editor-prev-card" ' +
    (prevDisabled ? 'disabled aria-disabled="true"' : "") +
    ' title="Card anterior" aria-label="Card anterior">&larr;</button>' +
    '<p class="chip-muted">Card ' +
    String(activeIndex + 1) +
    " de " +
    String(cards.length) +
    "</p>" +
    '<button class="icon-ghost tiny-icon" type="button" data-action="editor-next-card" ' +
    (nextDisabled ? 'disabled aria-disabled="true"' : "") +
    ' title="Próximo card" aria-label="Próximo card">&rarr;</button>' +
    "</div>" +
    '<div class="editor-step-strip card-strip">' +
    chips +
    "</div>" +
    "</section>" +
    '<div class="field">' +
    "<label>Título</label>" +
    '<input data-field="card-title" type="text" value="' +
    title +
    '">' +
    "</div>" +
    '<div class="field">' +
    "<label>Texto</label>" +
    '<textarea data-field="card-text">' +
    text +
    "</textarea>" +
    "</div>" +
    "</div>" +
    "</article></section>"
  );
}
