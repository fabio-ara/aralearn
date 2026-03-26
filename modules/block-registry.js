(function (global) {
  "use strict";

  const AUTHORING_BLOCK_KINDS = Object.freeze([
    "heading",
    "paragraph",
    "image",
    "table",
    "simulator",
    "editor",
    "multiple_choice",
    "flowchart"
  ]);

  const POPUP_BLOCK_KINDS = Object.freeze(AUTHORING_BLOCK_KINDS.slice());
  const SUPPORTED_BLOCK_KINDS = Object.freeze(AUTHORING_BLOCK_KINDS.concat(["button"]));

  const BLOCK_META = Object.freeze({
    heading: Object.freeze({ icon: "&#72;", label: "Título", placeholder: "Título" }),
    paragraph: Object.freeze({ icon: "&#182;", label: "Parágrafo", placeholder: "Texto" }),
    image: Object.freeze({ icon: "&#9635;", label: "Imagem", placeholder: "assets/images/arquivo.jpg" }),
    table: Object.freeze({ icon: "&#9638;", label: "Tabela", placeholder: "Título da tabela" }),
    simulator: Object.freeze({ icon: "&#8646;", label: "Simulador", placeholder: "Texto com uma lacuna interativa" }),
    editor: Object.freeze({ icon: "&gt;_", label: "Editor", placeholder: "Texto com lacunas e opções" }),
    multiple_choice: Object.freeze({ icon: "&#9718;", label: "Múltipla escolha", placeholder: "Alternativas de resposta" }),
    flowchart: Object.freeze({ icon: "&#11040;", label: "Fluxograma", placeholder: "Monte o fluxograma" }),
    button: Object.freeze({ icon: "&#10140;", label: "Botão", placeholder: "Ação final do card" })
  });

  function isHeadingKind(kind) {
    return kind === "heading";
  }

  function isParagraphKind(kind) {
    return kind === "paragraph";
  }

  function isImageKind(kind) {
    return kind === "image";
  }

  function isTableKind(kind) {
    return kind === "table";
  }

  function isSimulatorKind(kind) {
    return kind === "simulator";
  }

  function isEditorKind(kind) {
    return kind === "editor";
  }

  function isMultipleChoiceKind(kind) {
    return kind === "multiple_choice";
  }

  function isFlowchartKind(kind) {
    return kind === "flowchart";
  }

  function isButtonKind(kind) {
    return kind === "button";
  }

  function isSupportedBlockKind(kind) {
    return SUPPORTED_BLOCK_KINDS.indexOf(String(kind || "")) > -1;
  }

  function getBlockMeta(kind) {
    return BLOCK_META[String(kind || "")] || BLOCK_META.paragraph;
  }

  global.AraLearnBlockRegistry = {
    authoringKinds: AUTHORING_BLOCK_KINDS,
    popupKinds: POPUP_BLOCK_KINDS,
    supportedKinds: SUPPORTED_BLOCK_KINDS,
    meta: BLOCK_META,
    getBlockMeta: getBlockMeta,
    isHeadingKind: isHeadingKind,
    isParagraphKind: isParagraphKind,
    isImageKind: isImageKind,
    isTableKind: isTableKind,
    isSimulatorKind: isSimulatorKind,
    isEditorKind: isEditorKind,
    isMultipleChoiceKind: isMultipleChoiceKind,
    isFlowchartKind: isFlowchartKind,
    isButtonKind: isButtonKind,
    isSupportedBlockKind: isSupportedBlockKind
  };
})(window);
