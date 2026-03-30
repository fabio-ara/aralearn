import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strToU8, zipSync } from "fflate";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputJsonPath = path.join(rootDir, "examples", "html-css-javascript-node-do-zero.json");
const outputZipPath = path.join(rootDir, "examples", "html-css-javascript-node-do-zero.zip");

function slug(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function escapeInlineHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripInlineMarkers(value) {
  return String(value || "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1");
}

function renderAnnotatedInlineText(value) {
  const source = String(value || "").replace(/\r/g, "");
  const placeholders = [];
  const reserve = (html) => {
    const token = `__INLINE_TOKEN_${placeholders.length}__`;
    placeholders.push({ token, html });
    return token;
  };

  const marked = source
    .replace(/`([^`]+)`/g, function (_match, inner) {
      return reserve(`<strong><span class="inline-tone-gold">${escapeInlineHtml(inner)}</span></strong>`);
    })
    .replace(/\*\*([^*]+)\*\*/g, function (_match, inner) {
      return reserve(`<strong>${escapeInlineHtml(inner)}</strong>`);
    });

  let html = escapeInlineHtml(marked).replace(/\n/g, "<br>");
  placeholders.forEach(function (entry) {
    html = html.split(entry.token).join(entry.html);
  });
  return html;
}

function cell(value, options = {}) {
  return {
    value: String(value || ""),
    bold: !!options.bold,
    italic: !!options.italic,
    tone: options.tone || "default",
    align: options.align || "left"
  };
}

function heading(value, align = "left") {
  return {
    kind: "heading",
    value: String(value || ""),
    align: align
  };
}

function paragraph(value, align = "left") {
  const source = String(value || "");
  return {
    kind: "paragraph",
    value: stripInlineMarkers(source),
    richText: renderAnnotatedInlineText(source),
    align: align
  };
}

function isCellDescriptor(value) {
  return !!(value && typeof value === "object" && !Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, "value"));
}

function looksLikeCodeCell(value) {
  const text = String(value || "").trim();
  if (!text) return false;

  return (
    /^<\/?[a-z][^>]*>$/i.test(text) ||
    /^<!DOCTYPE html>$/i.test(text) ||
    /^(?:\.|#)[a-z0-9_-]+$/i.test(text) ||
    /\b[a-z0-9_-]+\.(?:html|css|js|json|mjs|png)\b/i.test(text) ||
    /:\/\//.test(text) ||
    /[{}()[\]]/.test(text) ||
    /[a-z0-9_-]+\([^)]*\)/i.test(text) ||
    /^[a-z-]+\s*:\s*.+;?$/i.test(text) ||
    /^(?:true|false|null)$/i.test(text) ||
    /^\d+px$/i.test(text) ||
    /^@media\b/i.test(text)
  );
}

function tableCell(value, options = {}) {
  if (isCellDescriptor(value)) return cell(value.value, value);
  const autoOptions = looksLikeCodeCell(value)
    ? { bold: true, tone: "gold" }
    : {};
  return cell(value, { ...autoOptions, ...options });
}

function table(title, headers, rows) {
  return {
    kind: "table",
    title: String(title || ""),
    titleStyle: cell(title, { bold: true }),
    headers: headers.map((item) => tableCell(item, { bold: true })),
    rows: rows.map((row) => row.map((item) => tableCell(item)))
  };
}

function editor(value, optionDefs = [], interactionMode = "choice") {
  let enabledIndex = 0;
  let disabledIndex = 0;
  const total = optionDefs.length;

  return {
    kind: "editor",
    value: String(value || ""),
    interactionMode: interactionMode,
    options: optionDefs.map((option, index) => {
      const enabled = option.enabled !== false;
      const slotOrder = Object.prototype.hasOwnProperty.call(option, "slotOrder")
        ? option.slotOrder
        : enabled
          ? enabledIndex++
          : total + disabledIndex++;

      return {
        value: String(option.value || ""),
        enabled: enabled,
        displayOrder: index,
        slotOrder: slotOrder
      };
    })
  };
}

function choice(optionDefs, answerState = "correct") {
  return {
    kind: "multiple_choice",
    answerState: answerState,
    options: optionDefs.map((option) => ({
      value: String(option.value || ""),
      answer: !!option.answer
    }))
  };
}

function simulator(value, optionDefs) {
  return {
    kind: "simulator",
    value: String(value || ""),
    options: optionDefs.map((option) => ({
      value: String(option.value || ""),
      result: String(option.result || "")
    }))
  };
}

function enrichInteractiveBlock(block, blockId) {
  if (block.kind === "editor") {
    return {
      ...block,
      options: (block.options || []).map((option, index) => ({
        ...option,
        id: `${blockId}-option-${pad(index + 1)}`
      }))
    };
  }

  if (block.kind === "multiple_choice") {
    return {
      ...block,
      options: (block.options || []).map((option, index) => ({
        ...option,
        id: `${blockId}-option-${pad(index + 1)}`
      }))
    };
  }

  if (block.kind === "simulator") {
    return {
      ...block,
      options: (block.options || []).map((option, index) => ({
        ...option,
        id: `${blockId}-option-${pad(index + 1)}`
      }))
    };
  }

  if (block.kind === "button") {
    return {
      ...block,
      popupBlocks: (block.popupBlocks || []).map((popupBlock, index) => ({
        ...popupBlock,
        id: `${blockId}-popup-${pad(index + 1)}-${slug(popupBlock.kind || "block")}`
      }))
    };
  }

  return block;
}

function normalizeBlocks(stepId, bodyBlocks, popupBlocks = []) {
  const blocks = bodyBlocks.map((block, index) => {
    const blockId = `${stepId}-block-${pad(index + 1)}-${slug(block.kind || "block")}`;
    return enrichInteractiveBlock({ ...block, id: blockId }, blockId);
  });

  const buttonId = `${stepId}-block-${pad(blocks.length + 1)}-button`;
  blocks.push(enrichInteractiveBlock({
    id: buttonId,
    kind: "button",
    popupEnabled: popupBlocks.length > 0,
    popupBlocks: popupBlocks
  }, buttonId));

  return blocks;
}

function contentStep(lessonId, index, title, bodyBlocks, popupBlocks = []) {
  const stepId = `${lessonId}-step-${pad(index)}`;
  return {
    id: stepId,
    type: "content",
    title: title,
    blocks: normalizeBlocks(stepId, bodyBlocks, popupBlocks)
  };
}

function hasInteractiveBlock(blocks) {
  return blocks.some((block) => (
    block.kind === "editor" ||
    block.kind === "multiple_choice" ||
    block.kind === "simulator" ||
    block.kind === "flowchart"
  ));
}

function normalizeInlineText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function firstInteractiveBlock(blocks) {
  return blocks.find((block) => (
    block.kind === "editor" ||
    block.kind === "multiple_choice" ||
    block.kind === "simulator" ||
    block.kind === "flowchart"
  ));
}

function feedbackParagraphsForBlock(block) {
  if (!block) {
    return [
      "Confira como a solução se encaixa na estrutura técnica apresentada."
    ];
  }

  if (block.kind === "editor") {
    return [
      "Em sintaxe, cada peça precisa combinar com nome, sinais, atributo, propriedade, ordem e contexto."
    ];
  }

  if (block.kind === "multiple_choice") {
    return [
      "A definição correta mantém função, contexto e categoria; as outras opções misturam papéis, usos ou conceitos diferentes."
    ];
  }

  if (block.kind === "simulator") {
    const correctOption = (block.options || []).find((option) => /^correto\b/i.test(normalizeInlineText(option.result)))
      || (block.options || [])[0];
    const result = normalizeInlineText(correctOption?.result).replace(/^correto\.?\s*/i, "");

    return [
      result || "A opção escolhida produz o resultado esperado e confirma a leitura correta da situação apresentada."
    ];
  }

  return [
    "Confira como a solução se encaixa na estrutura técnica apresentada."
  ];
}

function defaultFeedbackPopup(title, blocks) {
  const interactiveBlock = firstInteractiveBlock(blocks);
  return feedbackParagraphsForBlock(interactiveBlock).map((text) => paragraph(text));
}

function card(lessonId, index, title, ...bodyBlocks) {
  const popupBlocks = hasInteractiveBlock(bodyBlocks) ? defaultFeedbackPopup(title, bodyBlocks) : [];
  return contentStep(lessonId, index, title, [heading(title), ...bodyBlocks], popupBlocks);
}

function completeStep(lessonId, index, text) {
  const stepId = `${lessonId}-step-${pad(index)}`;
  return {
    id: stepId,
    type: "lesson_complete",
    title: "Lição concluída",
    blocks: normalizeBlocks(stepId, [
      heading("Lição concluída", "center"),
      paragraph(text, "center")
    ])
  };
}

function lesson(id, title, subtitle, steps) {
  return {
    id: id,
    title: title,
    subtitle: subtitle,
    steps: steps
  };
}

const environmentLessonId = "web-ambiente";
const htmlLessonId = "web-html";
const cssLessonId = "web-css";
const jsBasicsLessonId = "web-javascript-fundamentos";
const jsDomLessonId = "web-javascript-dom-json";
const projectLessonId = "web-projeto-completo";

const environmentLesson = lesson(
  environmentLessonId,
  "Ambiente, arquivos, Node e servidor local",
  "Entenda o ecossistema mínimo para abrir, testar e depurar um projeto web simples.",
  [
    card(
      environmentLessonId,
      1,
      "Mapa do ecossistema",
      paragraph("Um projeto web simples como este depende de quatro peças principais: `HTML` para a estrutura, `CSS` para a aparência, `JavaScript` para o comportamento e `Node` para executar JavaScript no terminal e servir a pasta localmente quando o navegador precisa ler arquivos com `fetch`. Em volta dessas peças, ainda aparecem o navegador, o editor de código, o terminal e o endereço local do servidor.")
    ),
    card(
      environmentLessonId,
      "01a",
      "O que é uma página web",
      paragraph("Página web é um documento que o navegador interpreta e desenha na tela. Essa página nasce da cooperação entre arquivos: o `HTML` marca a estrutura, o `CSS` define a aparência, o `JavaScript` acrescenta comportamento e o navegador junta tudo para mostrar o resultado final.")
    ),
    card(
      environmentLessonId,
      2,
      "Funções das peças do projeto",
      table(
        "Visão rápida",
        ["Peça", "Nome em inglês", "Função prática"],
        [
          ["HTML", "HyperText Markup Language", "Define a estrutura da página: títulos, parágrafos, áreas e ligação com CSS e JavaScript."],
          ["CSS", "Cascading Style Sheets", "Define aparência: cores, espaçamento, bordas, fontes e largura."],
          ["JavaScript", "JavaScript", "Define comportamento: carregar JSON, montar HTML e responder a cliques."],
          ["Node", "Node.js", "Executa JavaScript fora do navegador e pode subir um servidor local simples."]
        ]
      )
    ),
    card(
      environmentLessonId,
      "02a",
      "Projeto, pasta, arquivo e extensão",
      paragraph("Projeto é o conjunto organizado de arquivos que trabalham juntos. Pasta, em inglês `folder`, é o contêiner que guarda arquivos e outras pastas. Arquivo, em inglês `file`, é cada unidade salva no disco. Extensão é o final do nome do arquivo, como `.html`, `.css`, `.js`, `.json` ou `.mjs`, e ajuda a reconhecer o papel daquele arquivo.")
    ),
    card(
      environmentLessonId,
      3,
      "Vocabulário mínimo de arquivos e navegação",
      table(
        "Inglês técnico e leitura em português",
        ["Termo em inglês", "Leitura operacional em português", "Como aparece no trabalho"],
        [
          ["browser", "navegador", "Chrome, Edge ou Firefox abrindo a página."],
          ["page", "página", "O arquivo HTML renderizado visualmente."],
          ["file", "arquivo", "index.html, styles.css, app.js e comandos-linux.json."],
          ["folder", "pasta", "A pasta trabalho ou content."],
          ["project", "projeto", "O conjunto de arquivos que trabalham juntos."]
        ]
      )
    ),
    card(
      environmentLessonId,
      "03a",
      "O que é VS Code",
      paragraph("`VS Code` significa `Visual Studio Code`. Ele é um editor de código, isto é, um programa usado para abrir a pasta do projeto, ler e editar arquivos de texto como `HTML`, `CSS`, `JavaScript` e `JSON`. Ele não é o navegador, não é o `Node` e não é o servidor: ele é o lugar em que você escreve e organiza o código.")
    ),
    card(
      environmentLessonId,
      "03b",
      "Editor, navegador, terminal e servidor não são a mesma coisa",
      table(
        "Quatro papéis diferentes",
        ["Peça", "Leitura em português", "Função real"],
        [
          ["editor", "editor de código", "Lugar em que você cria e altera arquivos."],
          ["browser", "navegador", "Programa que interpreta HTML, CSS e JavaScript e mostra a página."],
          ["terminal", "linha de comando", "Lugar textual em que você digita comandos."],
          ["server", "servidor", "Programa que entrega arquivos por um endereço http://."]
        ]
      )
    ),
    card(
      environmentLessonId,
      4,
      "Quem mostra a página na tela?",
      paragraph("No fluxo deste projeto, o navegador lê `HTML`, `CSS` e `JavaScript` e então desenha a página na tela. Com isso em mente, qual peça efetivamente mostra a página depois que você abre o endereço no computador?"),
      choice([
        { value: "O navegador", answer: true },
        { value: "O arquivo JSON sozinho", answer: false },
        { value: "O CSS sozinho", answer: false },
        { value: "O Node sozinho", answer: false }
      ])
    ),
    card(
      environmentLessonId,
      5,
      "O que é servidor neste contexto",
      paragraph("Servidor, aqui, não significa uma máquina misteriosa e distante. Servidor local é apenas um programa rodando no seu próprio computador que entrega os arquivos da pasta por um endereço `http://` para o navegador conseguir buscá-los com segurança. Ele é local porque roda na sua máquina, não em uma máquina remota da internet.")
    ),
    card(
      environmentLessonId,
      6,
      "Anatomia de um endereço local",
      table(
        "Partes de http://127.0.0.1:3000",
        ["Trecho", "Nome em inglês", "O que significa"],
        [
          ["http://", "protocol", "O protocolo de comunicação usado pelo navegador."],
          ["127.0.0.1", "host", "O próprio computador local; também é chamado de localhost."],
          ["3000", "port", "A porta em que o servidor local está ouvindo."],
          ["/index.html", "path", "O caminho opcional até um arquivo específico."]
        ]
      )
    ),
    card(
      environmentLessonId,
      "06a",
      "Protocolo, host, porta e caminho em português claro",
      paragraph("Protocolo é o conjunto de regras da conversa entre programas; `host` é o endereço da máquina que está sendo procurada; porta é o canal lógico em que um programa espera conexões; caminho, em inglês `path`, é o trecho que aponta para uma página, arquivo ou rota específica dentro daquele endereço.")
    ),
    card(
      environmentLessonId,
      "06b",
      "127.0.0.1 e localhost",
      paragraph("`127.0.0.1` é um endereço especial que aponta para o próprio computador. O apelido mais comum para esse endereço é `localhost`. Em português claro, `localhost` quer dizer algo como anfitrião local: a própria máquina em que você está trabalhando.")
    ),
    card(
      environmentLessonId,
      7,
      "O que Node realmente é",
      paragraph("`Node.js` é um ambiente de execução de `JavaScript` fora do navegador. Em português claro, ele permite rodar arquivos JavaScript pelo terminal, como o servidor local deste projeto, sem depender de abrir a página primeiro. A palavra `node`, em inglês, significa nó. No nome `Node.js`, a ideia histórica é a de um programa que pode atuar como um nó em uma rede. Na prática, para memorizar, basta lembrar que `node` é o comando que executa JavaScript no terminal.")
    ),
    card(
      environmentLessonId,
      "07a",
      "Como ler node -v",
      paragraph("No comando `node -v`, a palavra `node` chama o programa `Node.js`. O trecho `-v` é uma opção curta, também chamada de `flag`. A letra `v` vem de `version`, isto é, versão. Portanto, `node -v` quer dizer: execute o programa `Node` e mostre sua versão instalada.")
    ),
    card(
      environmentLessonId,
      8,
      "Node, terminal, comando, flag e VS Code",
      table(
        "Peças que o iniciante costuma confundir",
        ["Termo", "Tradução ou leitura", "Função real"],
        [
          ["Node.js", "ambiente de execução", "Roda JavaScript fora do navegador."],
          ["terminal", "linha de comando", "Lugar em que você digita comandos."],
          ["command", "comando", "Instrução digitada no terminal, como node server.mjs."],
          ["flag", "opção curta de comando", "Detalhe que altera o comportamento do comando, como -v para version."],
          ["server.mjs", "arquivo do servidor", "Script que cria o servidor local."],
          ["VS Code", "editor de código", "Programa usado para abrir a pasta e editar os arquivos."]
        ]
      )
    ),
    card(
      environmentLessonId,
      10,
      "Node não é navegador",
      paragraph("Lembre que, neste projeto, `Node.js` não desenha a página na tela. Ele roda JavaScript no terminal e sobe o servidor local. Com isso em mente, qual alternativa descreve melhor o papel do `Node` neste projeto?"),
      choice([
        { value: "Executar JavaScript no terminal e subir o servidor local", answer: true },
        { value: "Substituir o HTML e desenhar toda a página sozinho", answer: false },
        { value: "Virar uma folha de estilo no lugar do CSS", answer: false },
        { value: "Ser o mesmo que o navegador Chrome", answer: false }
      ])
    ),
    card(
      environmentLessonId,
      "10a",
      "Comando para ver a versão do Node",
      paragraph("Complete o comando que mostra a versão instalada do `Node` usando a forma curta da opção de versão."),
      editor(
        "node [[-v]]",
        [
          { value: "-x", enabled: false },
          { value: "server.mjs", enabled: false },
          { value: "-v", enabled: true }
        ]
      )
    ),
    card(
      environmentLessonId,
      "10b",
      "O que é terminal integrado",
      paragraph("No `VS Code`, terminal integrado é o terminal que aparece dentro da própria janela do editor. `Integrado` significa incorporado ao mesmo programa. Isso evita alternar de aplicativo toda vez que você quiser digitar um comando.")
    ),
    card(
      environmentLessonId,
      11,
      "Abrindo a pasta certa no VS Code",
      paragraph("Antes de rodar comandos, você precisa abrir a pasta do projeto no `VS Code`. Abrir a pasta certa ajuda o terminal integrado a começar no lugar correto e evita o erro de executar `node` numa pasta que nem tem o arquivo `server.mjs`. Em termos práticos, o editor passa a enxergar a árvore de arquivos daquele projeto e o terminal começa naquele diretório.")
    ),
    card(
      environmentLessonId,
      12,
      "Arquivo inicial do projeto",
      paragraph("Neste projeto, o navegador começa pela página HTML principal. Complete o nome do arquivo que funciona como entrada da página web."),
      editor(
        "trabalho/[[index.html]]",
        [
          { value: "styles.css", enabled: false },
          { value: "index.html", enabled: true },
          { value: "servidor.txt", enabled: false }
        ]
      )
    ),
    card(
      environmentLessonId,
      13,
      "O que é terminal",
      paragraph("Terminal é a interface textual em que você digita comandos. No `VS Code`, ele pode ser aberto pelo menu `Terminal > New Terminal` ou pelo atalho **Ctrl + crase**. Você não escreve `HTML` no terminal; você usa o terminal para executar comandos sobre os arquivos do projeto. O terminal lê cada linha como uma instrução para um programa, por isso ele é chamado também de linha de comando.")
    ),
    card(
      environmentLessonId,
      "13a",
      "O que é server.mjs",
      paragraph("`server.mjs` é o arquivo JavaScript que cria o servidor local deste trabalho. O nome `server` vem de servidor. A extensão `.mjs` significa `module JavaScript`, isto é, módulo JavaScript. Em termos práticos, continua sendo JavaScript; a extensão apenas indica um formato moderno de módulo.")
    ),
    card(
      environmentLessonId,
      14,
      "Subindo o servidor local",
      paragraph("Complete o comando que inicia o servidor deste projeto dentro da pasta `trabalho`. Repare que `node` atua como o programa executor e `server.mjs` é o arquivo que ele deve rodar."),
      editor(
        "node [[server.mjs]]",
        [
          { value: "index.html", enabled: false },
          { value: "server.mjs", enabled: true },
          { value: "styles.css", enabled: false }
        ]
      )
    ),
    card(
      environmentLessonId,
      15,
      "Endereço local do servidor",
      paragraph("O endereço local `http://127.0.0.1:[[]]` usa qual porta neste servidor local simples?"),
      simulator(
        "http://127.0.0.1:[[]]",
        [
          {
            value: "3000",
            result: "Correto. O servidor local deste exemplo responde em http://127.0.0.1:3000."
          },
          {
            value: "html",
            result: "Não. html não é porta; porta é um número."
          },
          {
            value: "styles.css",
            result: "Não. styles.css é um arquivo, não a porta do servidor."
          }
        ]
      )
    ),
    card(
      environmentLessonId,
      16,
      "O que é porta",
      paragraph("No endereço `http://127.0.0.1:3000`, o trecho `3000` representa o quê?"),
      choice([
        { value: "A porta em que o servidor está ouvindo", answer: true },
        { value: "O nome do navegador", answer: false },
        { value: "A extensão do arquivo HTML", answer: false },
        { value: "A cor de fundo da página", answer: false }
      ])
    ),
    card(
      environmentLessonId,
      17,
      "Por que file:// falha com fetch",
      paragraph("Quando você abre `index.html` por duplo clique, o navegador usa um endereço `file://`. Isso quer dizer que a página foi aberta diretamente do disco, fora de um servidor web. Nessa situação, muitos navegadores bloqueiam a leitura do `JSON` com `fetch` por motivos de segurança. Quando você sobe um servidor local, a URL vira `http://127.0.0.1:3000` e o navegador passa a tratar a pasta como uma origem web normal.")
    ),
    card(
      environmentLessonId,
      18,
      "Sequência correta para testar localmente",
      paragraph("Pense na rotina completa do zero: abrir a pasta certa, abrir o terminal, subir o servidor e só então abrir o endereço local no navegador. Com esse contexto, qual destas sequências está na ordem humana correta para começar a testar o projeto?"),
      choice([
        { value: "Abrir a pasta no VS Code, abrir o terminal, rodar node server.mjs e abrir http://127.0.0.1:3000", answer: true },
        { value: "Abrir styles.css no navegador, depois instalar HTML e por fim criar a pasta", answer: false },
        { value: "Rodar node no navegador e depois escrever JSON no terminal", answer: false },
        { value: "Digitar o endereço local antes mesmo de subir o servidor", answer: false }
      ])
    ),
    card(
      environmentLessonId,
      19,
      "Rotina mínima de trabalho",
      table(
        "Do zero até o teste",
        ["Ação", "O que você faz", "Por que faz"],
        [
          ["Abrir a pasta", "Open Folder no VS Code", "Para trabalhar dentro do projeto certo."],
          ["Abrir o terminal", "Terminal > New Terminal", "Para digitar comandos sem sair do editor."],
          ["Subir o servidor", "node server.mjs", "Para servir os arquivos por http://."],
          ["Abrir o navegador", "http://127.0.0.1:3000", "Para ver a página funcionando."],
          ["Parar o servidor", "Ctrl + C", "Para encerrar o processo no terminal quando terminar."]
        ]
      )
    ),
    card(
      environmentLessonId,
      20,
      "Fechamento rápido do ambiente",
      table(
        "Resumo operacional",
        ["Conceito", "Leitura prática"],
        [
          ["instalar Node", "colocar o ambiente no computador para poder usar o comando node"],
          ["rodar node -v", "conferir se a instalação existe e qual versão foi encontrada"],
          ["rodar node server.mjs", "executar o arquivo JavaScript do servidor local"],
          ["abrir http://127.0.0.1:3000", "testar o projeto no navegador de forma correta"],
          ["evitar file:// para fetch", "impedir o erro Failed to fetch ao ler o JSON"]
        ]
      )
    ),
    completeStep(
      environmentLessonId,
      21,
      "Você já reconhece o papel do navegador, do terminal, do Node, do servidor local e da sequência correta para testar um projeto web simples."
    )
  ]
);

const htmlLesson = lesson(
  htmlLessonId,
  "HTML do zero",
  "Estrutura, tags, atributos e vocabulário técnico essencial do HTML.",
  [
    card(
      htmlLessonId,
      1,
      "O que HTML quer dizer",
      paragraph("`HTML` significa `HyperText Markup Language`. Em português operacional: linguagem de marcação para hipertexto. Ela não cuida da aparência final nem do comportamento; ela organiza a estrutura da página e marca o papel de cada parte do conteúdo.")
    ),
    card(
      htmlLessonId,
      2,
      "Quebrando a sigla HTML",
      table(
        "Inglês técnico e tradução útil",
        ["Parte da sigla", "Em inglês", "Leitura em português"],
        [
          ["H", "Hyper", "hiper, isto é, com ligações entre conteúdos"],
          ["T", "Text", "texto"],
          ["M", "Markup", "marcação; você marca o papel estrutural do conteúdo"],
          ["L", "Language", "linguagem"]
        ]
      )
    ),
    card(
      htmlLessonId,
      3,
      "Tag, elemento e conteúdo",
      paragraph("Tag é a marca usada na sintaxe, como `<p>` e `</p>`. Elemento é a estrutura inteira: abertura, conteúdo e fechamento. Conteúdo é o texto ou bloco que fica dentro do elemento.")
    ),
    card(
      htmlLessonId,
      "03a",
      "Sintaxe completa de um elemento HTML",
      table(
        "Lendo <p>Olá</p> por partes",
        ["Parte", "Nome em inglês", "Função"],
        [
          ["<p>", "opening tag", "abre o elemento e informa de que tipo ele é"],
          ["Olá", "content", "conteúdo interno do elemento"],
          ["</p>", "closing tag", "fecha o elemento"],
          ["<p>Olá</p>", "element", "o elemento completo"]
        ]
      )
    ),
    card(
      htmlLessonId,
      "03b",
      "Aninhamento e hierarquia",
      paragraph("`HTML` funciona por aninhamento, isto é, um elemento pode ficar dentro de outro. Pense em caixas dentro de caixas: `html` contém `head` e `body`; `body` pode conter `main`; `main` pode conter `section`; `section` pode conter `h1` e `p`. Sem enxergar a hierarquia completa, muitos atributos e tags parecem arbitrários.")
    ),
    card(
      htmlLessonId,
      4,
      "Fechando um parágrafo",
      paragraph("O trecho mostrado já abre um parágrafo com `<p>`. Complete a tag de fechamento correta do elemento de parágrafo."),
      editor(
        "<p>Olá, mundo[[</p>]]",
        [
          { value: "</h1>", enabled: false },
          { value: "</p>", enabled: true },
          { value: "</body>", enabled: false }
        ]
      )
    ),
    card(
      htmlLessonId,
      5,
      "Para que serve a barra na tag de fechamento",
      paragraph("Na sintaxe `</p>`, o caractere `/` indica o quê?"),
      choice([
        { value: "Que a tag está fechando o elemento", answer: true },
        { value: "Que a tag virou comentário", answer: false },
        { value: "Que a tag agora é CSS", answer: false },
        { value: "Que o navegador deve apagar a linha", answer: false }
      ])
    ),
    card(
      htmlLessonId,
      6,
      "Atributo, valor e conteúdo",
      paragraph("Atributo é uma informação extra colocada dentro da tag de abertura, como `lang=\"pt-BR\"`. Valor é o dado concreto desse atributo, como `pt-BR`. Conteúdo é o que fica entre abertura e fechamento, como o texto entre `<title>` e `</title>`.")
    ),
    card(
      htmlLessonId,
      7,
      "Vocabulário estrutural do HTML",
      table(
        "Termos que não podem ser confundidos",
        ["Termo em inglês", "Leitura em português", "Exemplo"],
        [
          ["tag", "tag ou marca", "<p>"],
          ["opening tag", "tag de abertura", "<main id=\"app\">"],
          ["closing tag", "tag de fechamento", "</main>"],
          ["element", "elemento", "<p>Texto</p>"],
          ["attribute", "atributo", "href em <a href=\"...\">"],
          ["value", "valor", "\"styles.css\" em href=\"styles.css\""]
        ]
      )
    ),
    card(
      htmlLessonId,
      8,
      "Definindo o idioma da página",
      paragraph("A tag de abertura de `html` já aparece pronta, faltando só o atributo. Complete o atributo que informa o idioma principal do documento HTML."),
      editor(
        "<html [[lang=\"pt-BR\"]]>",
        [
          { value: "id=\"app\"", enabled: false },
          { value: "lang=\"pt-BR\"", enabled: true },
          { value: "href=\"pt-BR\"", enabled: false }
        ]
      )
    ),
    card(
      htmlLessonId,
      9,
      "lang é atributo ou conteúdo?",
      paragraph("No trecho `<html lang=\"pt-BR\">`, a palavra `lang` é o quê?"),
      choice([
        { value: "Um atributo", answer: true },
        { value: "O conteúdo visível da página", answer: false },
        { value: "Uma propriedade de CSS", answer: false },
        { value: "Um comando do Node", answer: false }
      ])
    ),
    card(
      htmlLessonId,
      "09a",
      "A espinha dorsal linha por linha",
      table(
        "Documento mínimo em ordem",
        ["Linha ou peça", "Leitura em português", "Por que aparece"],
        [
          ["<!DOCTYPE html>", "declaração do tipo de documento", "avisa ao navegador que o documento segue o padrão HTML5"],
          ["<html lang=\"pt-BR\">", "raiz do documento com idioma", "envolve toda a página e informa o idioma principal"],
          ["<head>...</head>", "cabeça do documento", "guarda metadados e ligações com outros arquivos"],
          ["<body>...</body>", "corpo do documento", "guarda o conteúdo visível"],
          ["</html>", "fechamento da raiz", "encerra o documento"]
        ]
      )
    ),
    card(
      htmlLessonId,
      10,
      "A espinha dorsal do documento",
      paragraph("Uma página HTML mínima costuma começar com `<!DOCTYPE html>`, depois a raiz `<html>`, e dentro dela duas áreas principais: `<head>` para metadados e `<body>` para o conteúdo visível.")
    ),
    card(
      htmlLessonId,
      11,
      "Completando o DOCTYPE",
      paragraph("A declaração inicial do documento tem uma lacuna. Complete a forma padrão do `DOCTYPE` em `HTML5`."),
      editor(
        "<!DOCTYPE [[html]]>",
        [
          { value: "css", enabled: false },
          { value: "html", enabled: true },
          { value: "javascript", enabled: false }
        ]
      )
    ),
    card(
      htmlLessonId,
      12,
      "head e body",
      table(
        "Funções diferentes",
        ["Elemento", "Leitura prática", "O que costuma guardar"],
        [
          ["head", "cabeça do documento", "title, meta, link e outras informações sobre a página"],
          ["body", "corpo do documento", "o que o usuário efetivamente vê e usa na tela"]
        ]
      )
    ),
    card(
      htmlLessonId,
      13,
      "title, meta, link e script",
      paragraph("Dentro de `head`, `<title>` define o título da aba; `<meta charset=\"UTF-8\">` ajuda com acentos; `<link>` conecta o `CSS`; e `<script src=\"app.js\"></script>` conecta o `JavaScript`.")
    ),
    card(
      htmlLessonId,
      "13a",
      "Atributos comuns de link, script, img e a",
      table(
        "Atributo e contexto",
        ["Tag", "Atributo", "Função"],
        [
          ["link", "rel", "explica a relação do arquivo ligado, como stylesheet"],
          ["link", "href", "informa o caminho do recurso a ser ligado"],
          ["script", "src", "informa o caminho do arquivo JavaScript"],
          ["img", "src", "informa o caminho da imagem"],
          ["img", "alt", "fornece texto alternativo para acessibilidade"],
          ["a", "href", "informa para onde o link aponta"]
        ]
      )
    ),
    card(
      htmlLessonId,
      14,
      "Ligando o arquivo CSS",
      paragraph("Na tag `<link rel=\"stylesheet\" ...>`, complete o atributo que aponta para o arquivo `styles.css`."),
      editor(
        "<link rel=\"stylesheet\" [[href=\"styles.css\"]]>",
        [
          { value: "src=\"styles.css\"", enabled: false },
          { value: "href=\"styles.css\"", enabled: true },
          { value: "lang=\"styles.css\"", enabled: false }
        ]
      )
    ),
    card(
      htmlLessonId,
      15,
      "Tags muito comuns na estrutura da página",
      table(
        "HTML usado na página",
        ["Tag", "Nome em inglês", "Função"],
        [
          ["<h1>", "heading level 1", "título principal da página"],
          ["<p>", "paragraph", "parágrafo de texto"],
          ["<div>", "division", "contêiner genérico"],
          ["<main>", "main content", "área principal do conteúdo"],
          ["<section>", "section", "seção temática do conteúdo"],
          ["<header>", "header", "cabeçalho de uma página ou bloco"]
        ]
      )
    ),
    card(
      htmlLessonId,
      16,
      "Listas, links e imagens",
      table(
        "Vocabulário muito frequente",
        ["Tag", "Nome em inglês", "Leitura operacional"],
        [
          ["<ol>", "ordered list", "lista ordenada, isto é, com ordem relevante"],
          ["<ul>", "unordered list", "lista não ordenada, sem ordem obrigatória"],
          ["<li>", "list item", "item da lista"],
          ["<a>", "anchor", "link clicável"],
          ["<img>", "image", "imagem embutida na página"]
        ]
      )
    ),
    card(
      htmlLessonId,
      17,
      "Atributo mais comum do link",
      paragraph("Na tag `<a ...>`, complete o atributo que informa para onde esse link aponta."),
      editor(
        "<a [[href=\"https://example.com\"]]>Site</a>",
        [
          { value: "alt=\"Site\"", enabled: false },
          { value: "href=\"https://example.com\"", enabled: true },
          { value: "src=\"https://example.com\"", enabled: false }
        ]
      )
    ),
    card(
      htmlLessonId,
      18,
      "Imagem: src e alt",
      paragraph("No elemento `img`, `src` indica o arquivo da imagem e `alt` fornece um texto alternativo importante para acessibilidade. complete o atributo `src`."),
      editor(
        "<img [[src=\"logo.png\"]] alt=\"Logo do projeto\">",
        [
          { value: "href=\"logo.png\"", enabled: false },
          { value: "src=\"logo.png\"", enabled: true },
          { value: "lang=\"logo.png\"", enabled: false }
        ]
      )
    ),
    card(
      htmlLessonId,
      19,
      "id e class",
      table(
        "Duas marcações que o iniciante mistura",
        ["Nome", "Em inglês", "Função prática"],
        [
          ["id", "identifier", "identificador único; costuma apontar para um elemento específico, como id=\"app\""],
          ["class", "class", "rótulo reutilizável; pode aparecer em vários elementos, como class=\"card\""]
        ]
      )
    ),
    card(
      htmlLessonId,
      "19a",
      "id e class em contexto completo",
      paragraph("`id` e `class` nascem no `HTML`, mas são lidos por outras camadas. O `CSS` usa `#app` para estilizar um `id` específico e `.card` para estilizar uma classe reutilizável. O `JavaScript` pode usar `getElementById(\"app\")` para localizar um elemento único. Por isso, `id` e `class` fazem ponte entre estrutura, aparência e comportamento.")
    ),
    card(
      htmlLessonId,
      20,
      "Elemento principal do projeto",
      paragraph("O elemento `main` já aparece com uma lacuna. Complete o atributo usado nesse elemento para o `JavaScript` localizar a área em que vai renderizar o conteúdo."),
      editor(
        "<main [[id=\"app\"]]>",
        [
          { value: "class=\"app\"", enabled: false },
          { value: "id=\"app\"", enabled: true },
          { value: "href=\"app\"", enabled: false }
        ]
      )
    ),
    card(
      htmlLessonId,
      "20a",
      "Montando um documento HTML mínimo",
      paragraph("toda a estrutura do documento já aparece. Complete as cinco lacunas para montar um HTML mínimo com `DOCTYPE`, idioma, título, área principal e fechamento da raiz."),
      editor(
        "<!DOCTYPE [[html]]>\n<html [[lang=\"pt-BR\"]]>\n<head>\n  <title>[[Missão Terminal Linux]]</title>\n</head>\n<body>\n  <main [[id=\"app\"]]></main>\n</body>\n[[</html>]]",
        [
          { value: "html", enabled: true },
          { value: "lang=\"pt-BR\"", enabled: true },
          { value: "Missão Terminal Linux", enabled: true },
          { value: "id=\"app\"", enabled: true },
          { value: "</html>", enabled: true },
          { value: "href=\"styles.css\"", enabled: false },
          { value: "class=\"body\"", enabled: false },
          { value: "</head>", enabled: false }
        ]
      )
    ),
    card(
      htmlLessonId,
      21,
      "Fechamento rápido do HTML",
      table(
        "O mínimo para esta página funcionar",
        ["Ponto", "Leitura prática"],
        [
          ["estrutura", "DOCTYPE, html, head e body organizam o documento"],
          ["ligação com arquivos", "link traz o CSS e script traz o JavaScript"],
          ["atributos", "lang, href, src, alt, id e class carregam metadados importantes"],
          ["listas", "ol é ordered list e ul é unordered list"],
          ["semântica", "main, section e header deixam a estrutura mais clara"]
        ]
      )
    ),
    completeStep(
      htmlLessonId,
      22,
      "Você já reconhece as tags centrais do HTML, entende atributo versus valor e consegue ler a estrutura básica da página do projeto."
    )
  ]
);

const cssLesson = lesson(
  cssLessonId,
  "CSS do zero",
  "Seletores, propriedades, valores, box model e leitura de sintaxe do CSS.",
  [
    card(
      cssLessonId,
      1,
      "O que CSS quer dizer",
      paragraph("`CSS` significa `Cascading Style Sheets`. Em português operacional: folhas de estilo em cascata. Ele descreve como os elementos `HTML` devem aparecer: cor, largura, fonte, borda, espaçamento e muito mais.")
    ),
    card(
      cssLessonId,
      2,
      "Quebrando a sigla CSS",
      table(
        "Inglês técnico e tradução útil",
        ["Parte", "Em inglês", "Leitura em português"],
        [
          ["C", "Cascading", "em cascata; regras mais específicas podem prevalecer sobre regras mais gerais"],
          ["S", "Style", "estilo, aparência"],
          ["S", "Sheets", "folhas, isto é, conjuntos organizados de regras"]
        ]
      )
    ),
    card(
      cssLessonId,
      3,
      "A forma de uma regra CSS",
      paragraph("Uma regra `CSS` típica tem seletor, chaves e declarações. Exemplo: `body { background: #f6f1e6; }`. O seletor escolhe o alvo; cada declaração tem propriedade e valor.")
    ),
    card(
      cssLessonId,
      4,
      "Seletor, declaração, propriedade e valor",
      table(
        "Peças da sintaxe",
        ["Termo em inglês", "Leitura em português", "Exemplo em body { background: #f6f1e6; }"],
        [
          ["selector", "seletor", "body"],
          ["declaration block", "bloco de declarações", "{ background: #f6f1e6; }"],
          ["property", "propriedade", "background"],
          ["value", "valor", "#f6f1e6"]
        ]
      )
    ),
    card(
      cssLessonId,
      "04a",
      "Símbolos da sintaxe CSS",
      table(
        "Pontuação que organiza a regra",
        ["Símbolo", "Nome ou leitura", "Função"],
        [
          ["{ }", "chaves", "abrem e fecham o bloco de declarações"],
          [":", "dois-pontos", "separam a propriedade do valor"],
          [";", "ponto e vírgula", "encerra cada declaração"],
          [".", "ponto", "marca seletor de classe"],
          ["#", "cerquilha ou hashtag", "marca seletor de id"]
        ]
      )
    ),
    card(
      cssLessonId,
      "04b",
      "Regra completa, linha por linha",
      paragraph("Na regra `body { background: #f6f1e6; }`, `body` é o seletor; as chaves delimitam o bloco; `background` é a propriedade; `#f6f1e6` é o valor; e o ponto e vírgula encerra a declaração. Ler a pontuação faz parte de ler o `CSS` corretamente.")
    ),
    card(
      cssLessonId,
      5,
      "Complete a propriedade",
      paragraph("Na regra `body { [[...]]: #f6f1e6; }`, complete a propriedade que define o fundo da página."),
      editor(
        "body { [[background]]: #f6f1e6; }",
        [
          { value: "color", enabled: false },
          { value: "background", enabled: true },
          { value: "font-family", enabled: false }
        ]
      )
    ),
    card(
      cssLessonId,
      6,
      "Propriedade ou valor?",
      paragraph("No trecho `body { background: #f6f1e6; }`, o código `#f6f1e6` é o quê?"),
      choice([
        { value: "O valor atribuído à propriedade background", answer: true },
        { value: "O seletor da regra", answer: false },
        { value: "Um atributo HTML", answer: false },
        { value: "O nome da pasta do projeto", answer: false }
      ])
    ),
    card(
      cssLessonId,
      7,
      "Como o CSS escolhe o alvo",
      paragraph("O seletor diz em quem a regra vai agir. `body` seleciona o elemento `body`; `.card` seleciona qualquer elemento com `class=\"card\"`; e `#app` seleciona o elemento com `id=\"app\"`.")
    ),
    card(
      cssLessonId,
      8,
      "Seletores básicos do projeto",
      table(
        "Os três que mais aparecem",
        ["Escrita no CSS", "Nome", "O que seleciona"],
        [
          ["body", "element selector", "todos os elementos body"],
          [".card", "class selector", "todos os elementos cuja classe inclui card"],
          ["#app", "id selector", "o elemento único com id app"]
        ]
      )
    ),
    card(
      cssLessonId,
      9,
      "Classe em seletor CSS",
      paragraph("Na regra `.[[...]] { border-radius: 12px; }`, complete o seletor de classe usado para estilizar cartões."),
      editor(
        ".[[card]] { border-radius: 12px; }",
        [
          { value: "app", enabled: false },
          { value: "card", enabled: true },
          { value: "body", enabled: false }
        ]
      )
    ),
    card(
      cssLessonId,
      10,
      "O que é box model",
      paragraph("Todo bloco visual pode ser lido como uma caixa. A ordem conceitual é: conteúdo, `padding`, borda e `margin`. Quando você entende isso, deixa de editar espaço no escuro.")
    ),
    card(
      cssLessonId,
      11,
      "As quatro camadas da caixa",
      table(
        "Box model em português claro",
        ["Camada", "Nome em inglês", "Leitura prática"],
        [
          ["conteúdo", "content", "o texto ou a tabela em si"],
          ["espaço interno", "padding", "o respiro entre conteúdo e borda"],
          ["borda", "border", "o contorno da caixa"],
          ["espaço externo", "margin", "a distância entre uma caixa e outra"]
        ]
      )
    ),
    card(
      cssLessonId,
      12,
      "Padding ou margin?",
      paragraph("Você quer aumentar o espaço dentro do cartão, isto é, entre o texto e a borda. Nesse caso, qual propriedade faz mais sentido?"),
      choice([
        { value: "padding", answer: true },
        { value: "margin", answer: false },
        { value: "href", answer: false },
        { value: "id", answer: false }
      ])
    ),
    card(
      cssLessonId,
      13,
      "Largura controlada",
      paragraph("`width` define largura; `max-width` define um teto de largura. Em páginas de estudo, `max-width` é útil para evitar linhas longas demais em telas grandes.")
    ),
    card(
      cssLessonId,
      14,
      "Complete a propriedade de largura máxima",
      paragraph("Na sintaxe `max-[[...]]: 900px;`, complete o nome correto da propriedade usada para limitar a largura da página."),
      editor(
        "max-[[width]]: 900px;",
        [
          { value: "height", enabled: false },
          { value: "width", enabled: true },
          { value: "font", enabled: false }
        ]
      )
    ),
    card(
      cssLessonId,
      15,
      "Propriedades muito usadas no visual",
      table(
        "Linguagem visual mínima",
        ["Propriedade", "Leitura prática", "Exemplo de valor"],
        [
          ["color", "cor do texto", "#1f1a17"],
          ["background", "fundo; pode reunir várias configurações", "#f6f1e6"],
          ["background-color", "só a cor de fundo", "#fffaf0"],
          ["border", "borda completa", "1px solid #d7c9ad"],
          ["border-radius", "cantos arredondados", "12px"]
        ]
      )
    ),
    card(
      cssLessonId,
      16,
      "A família do background",
      table(
        "Nem todo fundo é só cor",
        ["Propriedade", "O que controla", "Exemplo de uso"],
        [
          ["background-color", "apenas a cor", "background-color: #fffaf0;"],
          ["background-image", "imagem de fundo", "background-image: url(textura.png);"],
          ["background-repeat", "repetição da imagem", "background-repeat: no-repeat;"],
          ["background-size", "escala da imagem de fundo", "background-size: cover;"],
          ["background-position", "posição da imagem", "background-position: center;"],
          ["background", "atalho que pode combinar várias partes", "background: #fffaf0 url(textura.png) center / cover no-repeat;"]
        ]
      )
    ),
    card(
      cssLessonId,
      17,
      "background vai além de color",
      paragraph("Lembre que `background` pode aparecer sozinho ou como atalho para várias partes do fundo. Com esse contexto, qual alternativa descreve melhor a propriedade `background`?"),
      choice([
        { value: "Ela pode reunir cor, imagem, posição, tamanho e repetição do fundo", answer: true },
        { value: "Ela só aceita nomes de arquivo JavaScript", answer: false },
        { value: "Ela só substitui o atributo href", answer: false },
        { value: "Ela existe apenas dentro do Node", answer: false }
      ])
    ),
    card(
      cssLessonId,
      18,
      "Tipografia mínima do projeto",
      table(
        "Lendo as propriedades de texto",
        ["Propriedade", "Função", "Exemplo"],
        [
          ["font-family", "família tipográfica", "Arial, Helvetica, sans-serif"],
          ["line-height", "altura da linha", "1.5"],
          ["font-size", "tamanho do texto", "14px"],
          ["font-weight", "peso tipográfico", "bold"]
        ]
      )
    ),
    card(
      cssLessonId,
      "18a",
      "Como ler valores compostos",
      paragraph("Em `CSS`, vários valores dependem de contexto completo. `Arial, Helvetica, sans-serif` é uma lista de opções de fonte. `1px solid #d7c9ad` combina largura, estilo e cor da borda. Já `12px` informa um tamanho. O significado do valor depende da propriedade em que ele aparece.")
    ),
    card(
      cssLessonId,
      19,
      "Complete a família tipográfica",
      paragraph("Na sequência `Arial, Helvetica, [[...]]`, complete a família genérica final da pilha de fontes."),
      editor(
        "font-family: Arial, Helvetica, [[sans-serif]];",
        [
          { value: "servidor-local", enabled: false },
          { value: "sans-serif", enabled: true },
          { value: "unordered-list", enabled: false }
        ]
      )
    ),
    card(
      cssLessonId,
      20,
      "Lendo shorthand de padding",
      paragraph("Na declaração `padding: 20px 14px 40px;`, o segundo valor `14px` vale para quais lados?"),
      choice([
        { value: "Direita e esquerda", answer: true },
        { value: "Somente topo", answer: false },
        { value: "Somente baixo", answer: false },
        { value: "Somente a borda", answer: false }
      ])
    ),
    card(
      cssLessonId,
      "20a",
      "Uma, duas, três ou quatro medidas em padding",
      table(
        "Leitura de shorthand",
        ["Forma", "Como ler", "Exemplo"],
        [
          ["1 valor", "o mesmo valor em todos os lados", "padding: 12px;"],
          ["2 valores", "topo/baixo e direita/esquerda", "padding: 12px 20px;"],
          ["3 valores", "topo, laterais e baixo", "padding: 20px 14px 40px;"],
          ["4 valores", "topo, direita, baixo e esquerda", "padding: 8px 12px 16px 10px;"]
        ]
      )
    ),
    card(
      cssLessonId,
      21,
      "Responsividade básica com media query",
      paragraph("Uma `media query` deixa o `CSS` reagir ao tamanho da tela. Neste exemplo, ela ajuda a fazer botões ocuparem a largura toda no celular quando a tela fica estreita.")
    ),
    card(
      cssLessonId,
      "21a",
      "O que media query quer dizer",
      paragraph("A expressão `media query` pode ser lida como consulta de mídia. Aqui, mídia significa o meio de exibição, como uma tela larga ou estreita. Em termos práticos, a regra pergunta algo como: se a tela tiver no máximo `640px`, então aplique estas declarações.")
    ),
    card(
      cssLessonId,
      22,
      "Complete o limite da media query",
      paragraph("Na estrutura `@media (max-width: [[...]]) { }`, complete o valor de largura máxima da `media query` usada neste exemplo."),
      editor(
        "@media (max-width: [[640px]]) { }",
        [
          { value: "3000", enabled: false },
          { value: "640px", enabled: true },
          { value: "app.js", enabled: false }
        ]
      )
    ),
    card(
      cssLessonId,
      "22a",
      "Montando uma regra CSS completa",
      paragraph("Complete as quatro lacunas para formar uma regra básica de página, com fundo, cor do texto, espaço interno e largura máxima."),
      editor(
        "body {\n  [[background]]: #f6f1e6;\n  [[color]]: #1f1a17;\n  [[padding]]: 20px;\n  [[max-width]]: 900px;\n}",
        [
          { value: "background", enabled: true },
          { value: "color", enabled: true },
          { value: "padding", enabled: true },
          { value: "max-width", enabled: true },
          { value: "href", enabled: false },
          { value: "lang", enabled: false },
          { value: "border-radius", enabled: false }
        ]
      )
    ),
    card(
      cssLessonId,
      23,
      "Fechamento rápido do CSS",
      table(
        "O mínimo que você precisa reconhecer",
        ["Ponto", "Leitura prática"],
        [
          ["seletor", "escolhe o alvo da regra"],
          ["propriedade", "define o aspecto a controlar"],
          ["valor", "fornece o dado concreto da propriedade"],
          ["box model", "organiza conteúdo, padding, borda e margin"],
          ["background", "pode ser simples ou reunir vários aspectos do fundo"],
          ["media query", "permite adaptar a interface ao tamanho da tela"]
        ]
      )
    ),
    completeStep(
      cssLessonId,
      24,
      "Você já lê regras CSS básicas, diferencia seletor de propriedade e entende o box model, os fundos, a tipografia e a media query mínima do projeto."
    )
  ]
);

const jsBasicsLesson = lesson(
  jsBasicsLessonId,
  "JavaScript: sintaxe e fundamentos",
  "Variáveis, funções, objetos, arrays, if, for e o vocabulário central da linguagem.",
  [
    card(
      jsBasicsLessonId,
      1,
      "O papel do JavaScript",
      paragraph("`JavaScript` é uma linguagem de programação. No navegador, ela acrescenta comportamento à página; no `Node`, ela também pode rodar fora do navegador. Neste exemplo, o `JavaScript` não desenha a página do zero sem apoio; ele lê o `JSON`, monta uma string de `HTML`, injeta esse HTML na área principal e responde aos cliques dos quizzes.")
    ),
    card(
      jsBasicsLessonId,
      "01a",
      "O que é uma linguagem de programação",
      paragraph("Linguagem de programação é um sistema formal de escrita de instruções para o computador. Em vez de parágrafos livres, ela usa sintaxe controlada. `JavaScript` é a linguagem usada aqui para descrever ações e regras de comportamento da página.")
    ),
    card(
      jsBasicsLessonId,
      2,
      "Vocabulário mínimo da linguagem",
      table(
        "Termos centrais",
        ["Termo em inglês", "Leitura em português", "Exemplo curto"],
        [
          ["variable", "variável", "var data = null;"],
          ["value", "valor", "\"Missão Terminal Linux\""],
          ["string", "texto", "\"app\""],
          ["number", "número", "3000"],
          ["boolean", "lógico verdadeiro/falso", "true ou false"],
          ["null", "sem valor útil ainda", "var data = null;"]
        ]
      )
    ),
    card(
      jsBasicsLessonId,
      "02a",
      "Arquivo, extensão e script",
      paragraph("`app.js` é um arquivo de texto cuja extensão `.js` indica `JavaScript`. Quando o `HTML` liga esse arquivo com a tag `script`, o navegador lê o código e o executa. Por isso a palavra `script`, em inglês, pode ser lida aqui como pequeno programa ou roteiro de instruções.")
    ),
    card(
      jsBasicsLessonId,
      3,
      "JavaScript em arquivo separado",
      paragraph("Em vez de escrever todo o código dentro do `HTML`, este projeto usa um arquivo separado chamado `app.js`. Isso melhora organização, leitura e manutenção.")
    ),
    card(
      jsBasicsLessonId,
      "03a",
      "Sintaxe, palavra-chave, identificador e símbolo",
      table(
        "Peças básicas da escrita",
        ["Termo", "Leitura em português", "Exemplo"],
        [
          ["syntax", "sintaxe", "regras de escrita válidas da linguagem"],
          ["keyword", "palavra-chave", "var, function, if, for"],
          ["identifier", "identificador", "data, render, section"],
          ["symbol", "símbolo", "(), {}, [], ;, . e ="]
        ]
      )
    ),
    card(
      jsBasicsLessonId,
      4,
      "Ligando o arquivo JavaScript",
      paragraph("Na tag `<script src=\"[[...]]\"></script>`, complete o nome do arquivo JavaScript ligado ao fim do `body`."),
      editor(
        "<script src=\"[[app.js]]\"></script>",
        [
          { value: "styles.css", enabled: false },
          { value: "app.js", enabled: true },
          { value: "server.mjs", enabled: false }
        ]
      )
    ),
    card(
      jsBasicsLessonId,
      5,
      "Variável com var",
      paragraph("Neste exemplo, usamos `var` para declarar variáveis. Variável é um nome que passa a guardar um valor. Exemplo: `var data = null;` diz que existe uma variável chamada `data` e, por enquanto, ela guarda `null`.")
    ),
    card(
      jsBasicsLessonId,
      6,
      "Nome da variável de dados",
      paragraph("Na linha `var [[...]] = null;`, complete o nome da variável que passa a guardar o conteúdo lido do `JSON`."),
      editor(
        "var [[data]] = null;",
        [
          { value: "page", enabled: false },
          { value: "data", enabled: true },
          { value: "server", enabled: false }
        ]
      )
    ),
    card(
      jsBasicsLessonId,
      7,
      "O que null comunica",
      paragraph("Quando você escreve `var data = null;`, o que `null` está comunicando naquele momento?"),
      choice([
        { value: "Que a variável existe, mas ainda não recebeu o dado real", answer: true },
        { value: "Que a variável virou HTML", answer: false },
        { value: "Que o JavaScript foi desligado", answer: false },
        { value: "Que o arquivo CSS está errado", answer: false }
      ])
    ),
    card(
      jsBasicsLessonId,
      8,
      "O que é função",
      paragraph("Função é um bloco nomeado de código que você pode executar quando precisar. Ela pode receber dados de entrada, fazer trabalho e devolver um resultado. Mesmo quando não devolve nada explicitamente, ainda serve para organizar uma ação.")
    ),
    card(
      jsBasicsLessonId,
      9,
      "Função, parâmetro, argumento e retorno",
      table(
        "Quatro termos muito confundidos",
        ["Termo em inglês", "Leitura em português", "Explicação curta"],
        [
          ["function", "função", "bloco reutilizável de código"],
          ["parameter", "parâmetro", "nome que a função declara para receber um valor"],
          ["argument", "argumento", "valor real passado para a função quando ela é chamada"],
          ["return", "retorno", "valor que a função devolve"]
        ]
      )
    ),
    card(
      jsBasicsLessonId,
      "09a",
      "Declarar função não é o mesmo que chamá-la",
      table(
        "Dois momentos diferentes",
        ["Ação", "Exemplo", "O que acontece"],
        [
          ["declarar", "function render() { }", "você define a função"],
          ["chamar", "render();", "você manda a função executar"],
          ["parâmetro", "function mostrar(nome) { }", "nome que a função espera receber"],
          ["argumento", "mostrar(\"Ana\");", "valor real enviado na chamada"]
        ]
      )
    ),
    card(
      jsBasicsLessonId,
      10,
      "Nomeando uma função",
      paragraph("Na declaração `function [[...]]() { }`, complete o nome da função que monta a página neste exemplo."),
      editor(
        "function [[render]]() { }",
        [
          { value: "server", enabled: false },
          { value: "render", enabled: true },
          { value: "styles", enabled: false }
        ]
      )
    ),
    card(
      jsBasicsLessonId,
      11,
      "Objeto, array, propriedade e índice",
      paragraph("Objeto é uma estrutura com campos nomeados; `array` é uma lista ordenada de itens. Propriedade é um campo de um objeto, como `data.sections`. Índice é a posição numérica de um array, como `sections[0]`.")
    ),
    card(
      jsBasicsLessonId,
      12,
      "Lendo estruturas de dados",
      table(
        "Vocabulário estrutural",
        ["Termo", "Leitura prática", "Exemplo"],
        [
          ["object", "objeto com propriedades nomeadas", "{ title: \"Missão\" }"],
          ["property", "propriedade ou campo", "data.title"],
          ["array", "lista ordenada", "data.sections"],
          ["index", "posição numérica", "data.sections[0]"],
          ["length", "tamanho da lista", "data.sections.length"]
        ]
      )
    ),
    card(
      jsBasicsLessonId,
      13,
      "O que length está fazendo",
      paragraph("No trecho `data.sections.length`, a palavra `length` está servindo para quê?"),
      choice([
        { value: "Informar quantos itens existem no array sections", answer: true },
        { value: "Trocar o CSS do projeto", answer: false },
        { value: "Virar um atributo HTML", answer: false },
        { value: "Abrir o servidor local", answer: false }
      ])
    ),
    card(
      jsBasicsLessonId,
      14,
      "Condição com if",
      paragraph("`if` cria um desvio lógico. Em português simples: se certa condição for verdadeira, execute este bloco. No projeto, isso é usado para renderizar coisas diferentes conforme o tipo da seção.")
    ),
    card(
      jsBasicsLessonId,
      "14a",
      "Condição, expressão e booleano",
      paragraph("Dentro dos parênteses de `if` fica uma expressão condicional. Essa expressão precisa resultar em um booleano, isto é, `true` ou `false`. Em `if (section.type === \"quiz\")`, a comparação produz `true` quando a seção realmente é um quiz e `false` nos outros casos.")
    ),
    card(
      jsBasicsLessonId,
      15,
      "Operador de comparação estrita",
      paragraph("A expressão `if (section.type [[...]] \"quiz\") { }`. Complete o operador que compara `section.type` com a string `\"quiz\"`."),
      editor(
        "if (section.type [[===]] \"quiz\") { }",
        [
          { value: "=", enabled: false },
          { value: "===", enabled: true },
          { value: ":", enabled: false }
        ]
      )
    ),
    card(
      jsBasicsLessonId,
      16,
      "Atribuição não é comparação",
      paragraph("Em `JavaScript`, `=` e `===` não fazem a mesma coisa. Com esse contexto, qual alternativa diferencia melhor esses dois sinais?"),
      choice([
        { value: "= atribui valor; === compara valores de forma estrita", answer: true },
        { value: "= fecha tag HTML; === abre tag HTML", answer: false },
        { value: "= cria array; === cria objeto", answer: false },
        { value: "= roda Node; === roda o navegador", answer: false }
      ])
    ),
    card(
      jsBasicsLessonId,
      17,
      "Laço for",
      paragraph("`for` é um laço que repete uma ação de forma controlada. Neste exemplo, ele percorre a lista de `sections` uma a uma para montar o `HTML` de cada seção.")
    ),
    card(
      jsBasicsLessonId,
      "17a",
      "As três partes do for",
      table(
        "Leitura do cabeçalho do laço",
        ["Parte", "Exemplo", "Função"],
        [
          ["inicialização", "i = 0", "define de onde a contagem começa"],
          ["condição", "i < data.sections.length", "diz enquanto o laço continua"],
          ["atualização", "i += 1", "muda a variável ao fim de cada volta"]
        ]
      )
    ),
    card(
      jsBasicsLessonId,
      18,
      "Incrementando no for",
      paragraph("No cabeçalho do laço, a lacuna está em `i [[...]] 1`. Complete o operador usado para somar `1` à variável `i` no final de cada volta do laço."),
      editor(
        "for (i = 0; i < data.sections.length; i [[+=]] 1) { }",
        [
          { value: ":", enabled: false },
          { value: "+=", enabled: true },
          { value: "=>", enabled: false }
        ]
      )
    ),
    card(
      jsBasicsLessonId,
      19,
      "Escutando cliques",
      paragraph("Depois de montar a página, o projeto precisa ouvir cliques nos botões do quiz. Para isso, o `JavaScript` registra um `listener` de `click` em `document`.")
    ),
    card(
      jsBasicsLessonId,
      "19a",
      "O que é método nesta sintaxe",
      paragraph("Em `document.addEventListener(\"click\", ...)`, `document` é um objeto e `addEventListener` é um método, isto é, uma função ligada a esse objeto. O ponto entre `document` e `addEventListener` pode ser lido como: acesse o método `addEventListener` do objeto `document`.")
    ),
    card(
      jsBasicsLessonId,
      20,
      "Evento, listener, target e closest",
      table(
        "Vocabulário dos cliques",
        ["Termo em inglês", "Leitura em português", "O que faz"],
        [
          ["event", "evento", "algo que aconteceu, como um clique"],
          ["listener", "ouvinte", "função que reage ao evento"],
          ["target", "alvo", "o elemento em que o clique ocorreu"],
          ["closest", "ancestral mais próximo que combina com um seletor", "ajuda a achar o botão certo mesmo quando o clique cai num texto dentro dele"]
        ]
      )
    ),
    card(
      jsBasicsLessonId,
      21,
      "Complete o nome do evento",
      paragraph("Na linha `document.addEventListener(\"[[...]]\", function (event) { });`, complete o nome do evento escutado em `document`."),
      editor(
        "document.addEventListener(\"[[click]]\", function (event) { });",
        [
          { value: "style", enabled: false },
          { value: "click", enabled: true },
          { value: "server", enabled: false }
        ]
      )
    ),
    card(
      jsBasicsLessonId,
      "21a",
      "Montando a espinha dorsal de uma função",
      paragraph("Complete as quatro lacunas para formar a espinha dorsal de uma função que monta HTML, guarda esse conteúdo em uma variável e percorre a lista `data.sections`."),
      editor(
        "[[function]] [[render]]() {\n  var [[html]] = \"\";\n  for (i = 0; i < data.sections.length; i [[+=]] 1) {\n  }\n}",
        [
          { value: "function", enabled: true },
          { value: "render", enabled: true },
          { value: "html", enabled: true },
          { value: "+=", enabled: true },
          { value: "fetch", enabled: false },
          { value: "color", enabled: false },
          { value: "===", enabled: false }
        ]
      )
    ),
    card(
      jsBasicsLessonId,
      22,
      "Fechamento rápido dos fundamentos",
      table(
        "Resumo operacional",
        ["Ponto", "Leitura prática"],
        [
          ["variável", "nome que guarda um valor"],
          ["função", "bloco reutilizável que organiza uma ação"],
          ["objeto", "estrutura com propriedades nomeadas"],
          ["array", "lista ordenada de itens"],
          ["if", "desvio condicional"],
          ["for", "laço de repetição controlada"],
          ["evento", "ocorrência como um clique"]
        ]
      )
    ),
    completeStep(
      jsBasicsLessonId,
      23,
      "Você já reconhece a base sintática do JavaScript usada no projeto: variáveis, funções, objetos, arrays, condições, laços e eventos de clique."
    )
  ]
);

const jsDomLesson = lesson(
  jsDomLessonId,
  "JavaScript: DOM, JSON e fetch",
  "Document, element, innerHTML, atributos data-*, JSON, async/await e leitura de arquivos.",
  [
    card(
      jsDomLessonId,
      1,
      "O que DOM quer dizer",
      paragraph("`DOM` significa `Document Object Model`. Em português operacional: modelo em objetos do documento. É a forma como o navegador representa a página para o `JavaScript` conseguir ler, localizar e alterar elementos.")
    ),
    card(
      jsDomLessonId,
      2,
      "Vocabulário do DOM",
      table(
        "Termos que aparecem o tempo todo",
        ["Termo em inglês", "Leitura em português", "Exemplo no projeto"],
        [
          ["document", "documento da página", "document representa a página inteira"],
          ["element", "elemento", "main, section, button, p"],
          ["id", "identificador único", "id=\"app\""],
          ["class", "classe reutilizável", "class=\"card\""],
          ["DOM", "árvore manipulável da página", "o JavaScript lê e altera elementos por ela"]
        ]
      )
    ),
    card(
      jsDomLessonId,
      "02a",
      "Objeto, método e argumento em document.getElementById",
      paragraph("No trecho `document.getElementById(\"app\")`, `document` é o objeto principal da página, `getElementById` é o método, isto é, a função pertencente a esse objeto, e `\"app\"` é o argumento passado para a chamada. Ler esse tipo de sintaxe por partes evita decorar sem entender.")
    ),
    card(
      jsDomLessonId,
      3,
      "Localizando a área principal",
      paragraph("O projeto começa procurando o elemento que vai receber o conteúdo renderizado. Isso é feito com `document.getElementById(\"app\")`, porque no `HTML` existe um `main` com `id=\"app\"`.")
    ),
    card(
      jsDomLessonId,
      4,
      "Complete o id procurado pelo JavaScript",
      paragraph("Na chamada `document.getElementById(\"[[...]]\")`, complete o valor correto passado para `getElementById`."),
      editor(
        "var app = document.getElementById(\"[[app]]\");",
        [
          { value: "card", enabled: false },
          { value: "app", enabled: true },
          { value: "styles.css", enabled: false }
        ]
      )
    ),
    card(
      jsDomLessonId,
      5,
      "O que innerHTML faz",
      paragraph("`innerHTML` substitui o conteúdo interno de um elemento por uma string de `HTML`. Neste exemplo, a função `render` monta uma string grande e depois faz `app.innerHTML = html`.")
    ),
    card(
      jsDomLessonId,
      6,
      "innerHTML faz o quê na página",
      paragraph("Na linha `app.innerHTML = html;`, qual alternativa descreve melhor o efeito dessa atribuição?"),
      choice([
        { value: "Trocar o conteúdo dentro de #app pelo HTML montado na string", answer: true },
        { value: "Instalar o Node automaticamente", answer: false },
        { value: "Criar a pasta content no disco", answer: false },
        { value: "Transformar CSS em JSON", answer: false }
      ])
    ),
    card(
      jsDomLessonId,
      7,
      "Atributos data-*",
      paragraph("Atributos `data-*` guardam pequenas informações customizadas no `HTML` para o `JavaScript` ler depois. Neste exemplo, `data-section` e `data-option` identificam de qual pergunta e de qual alternativa veio o clique.")
    ),
    card(
      jsDomLessonId,
      8,
      "Por que usar data-section e data-option",
      table(
        "Atributos auxiliares do quiz",
        ["Atributo", "O que guarda", "Por que é útil"],
        [
          ["data-section", "o índice da seção do quiz", "permite descobrir qual pergunta foi clicada"],
          ["data-option", "o índice da opção", "permite descobrir qual alternativa foi escolhida"]
        ]
      )
    ),
    card(
      jsDomLessonId,
      9,
      "Complete o atributo data-option",
      paragraph("O atributo `data-[[...]]=\"0\"` já aparece com a lacuna no lugar certo. Complete o nome do atributo usado para guardar a opção clicada."),
      editor(
        "data-[[option]]=\"0\"",
        [
          { value: "title", enabled: false },
          { value: "option", enabled: true },
          { value: "background", enabled: false }
        ]
      )
    ),
    card(
      jsDomLessonId,
      10,
      "O que é JSON",
      paragraph("`JSON` é um formato textual para dados estruturados. Ele organiza objetos, arrays, strings, números e booleanos de forma legível e muito usada entre sistemas e arquivos de configuração.")
    ),
    card(
      jsDomLessonId,
      "10a",
      "Chave, valor, objeto e array em JSON",
      paragraph("Em `JSON`, uma chave é o nome textual de um campo, como `\"title\"`. O valor é o dado associado a essa chave, como `\"Missão Terminal Linux\"`. Um objeto reúne pares de chave e valor entre chaves. Um array reúne itens em sequência entre colchetes.")
    ),
    card(
      jsDomLessonId,
      11,
      "Peças básicas da sintaxe JSON",
      table(
        "JSON em português claro",
        ["Peça", "Leitura prática", "Exemplo"],
        [
          ["object", "objeto com chaves nomeadas", "{ \"title\": \"Missão\" }"],
          ["array", "lista ordenada", "[1, 2, 3]"],
          ["string", "texto entre aspas duplas", "\"app\""],
          ["boolean", "verdadeiro ou falso", "true ou false"]
        ]
      )
    ),
    card(
      jsDomLessonId,
      12,
      "Complete a chave principal do JSON",
      paragraph("Na linha `\"[[...]]\": \"Missão Terminal Linux\"`, complete a chave que guarda o título principal do arquivo de conteúdo."),
      editor(
        "\"[[title]]\": \"Missão Terminal Linux\"",
        [
          { value: "background", enabled: false },
          { value: "title", enabled: true },
          { value: "server", enabled: false }
        ]
      )
    ),
    card(
      jsDomLessonId,
      13,
      "O que fetch faz",
      paragraph("`fetch` é a função usada para pedir um recurso pela web. Neste exemplo, ela busca `./content/comandos-linux.json` para depois transformar a resposta em objeto JavaScript.")
    ),
    card(
      jsDomLessonId,
      "13a",
      "O que é caminho relativo em fetch",
      paragraph("No trecho `./content/comandos-linux.json`, o ponto representa a pasta atual da página. Portanto, `./content/...` quer dizer: a partir desta pasta, entre na pasta `content` e procure o arquivo `comandos-linux.json`. Esse tipo de endereço é chamado de caminho relativo porque depende do lugar em que o arquivo atual está.")
    ),
    card(
      jsDomLessonId,
      14,
      "Complete o nome do arquivo JSON",
      paragraph("Na chamada `fetch(\"./content/[[...]]\")`, complete o nome do arquivo buscado com `fetch` neste exemplo."),
      editor(
        "fetch(\"./content/[[comandos-linux.json]]\")",
        [
          { value: "index.html", enabled: false },
          { value: "comandos-linux.json", enabled: true },
          { value: "server.mjs", enabled: false }
        ]
      )
    ),
    card(
      jsDomLessonId,
      15,
      "async e await",
      paragraph("Quando uma função usa `await`, ela precisa ser marcada com `async`. `await` quer dizer espere esta operação assíncrona terminar antes de continuar. Isso aparece quando o projeto espera o `fetch` e também quando espera `response.json()`.")
    ),
    card(
      jsDomLessonId,
      "15a",
      "O que assíncrono quer dizer",
      paragraph("Assíncrono quer dizer que a operação pode demorar e terminar depois, sem travar completamente o restante do ambiente. Buscar um arquivo pela rede ou por um servidor local não é instantâneo, então o `JavaScript` precisa lidar com essa espera de modo controlado.")
    ),
    card(
      jsDomLessonId,
      16,
      "O que await comunica",
      paragraph("No contexto deste projeto, `await` aparece para esperar o resultado de operações como `fetch` e `response.json()`. Com isso em mente, qual alternativa descreve melhor o papel de `await`?"),
      choice([
        { value: "Pedir que o JavaScript espere o término da operação assíncrona antes de seguir", answer: true },
        { value: "Trocar automaticamente o CSS por HTML", answer: false },
        { value: "Criar uma nova tag dentro do JSON", answer: false },
        { value: "Fechar o terminal com Ctrl + C", answer: false }
      ])
    ),
    card(
      jsDomLessonId,
      17,
      "try e catch",
      paragraph("`try` marca o trecho em que você tenta executar uma operação que pode falhar. `catch` captura o erro caso algo dê errado. Neste exemplo, isso ajuda a mostrar uma mensagem amigável quando o `JSON` não é carregado.")
    ),
    card(
      jsDomLessonId,
      18,
      "Complete a palavra-chave do tratamento de erro",
      paragraph("Na estrutura `} [[...]] (error) {`, complete a palavra que vem depois do bloco `try` quando o código precisa capturar uma falha."),
      editor(
        "} [[catch]] (error) {",
        [
          { value: "click", enabled: false },
          { value: "catch", enabled: true },
          { value: "href", enabled: false }
        ]
      )
    ),
    card(
      jsDomLessonId,
      19,
      "Transformando resposta em dado JavaScript",
      paragraph("Depois do `fetch`, o projeto chama `response.json()`. Isso pega o corpo da resposta e o interpreta como `JSON`, produzindo um objeto JavaScript que pode ser guardado na variável `data`.")
    ),
    card(
      jsDomLessonId,
      "19a",
      "response e o método json",
      table(
        "Lendo response.json() por partes",
        ["Peça", "Leitura em português", "Função"],
        [
          ["response", "objeto de resposta", "representa a resposta devolvida pelo fetch"],
          [".", "acesso a membro", "liga o objeto ao método que pertence a ele"],
          ["json", "método json", "interpreta o corpo da resposta como JSON"],
          ["()", "chamada do método", "manda o método executar"]
        ]
      )
    ),
    card(
      jsDomLessonId,
      20,
      "Qual método lê JSON da resposta",
      paragraph("A expressão `response.[[]]()` já aparece com a lacuna na posição certa. Escolha o método correto para ler o corpo da resposta como `JSON`."),
      simulator(
        "response.[[]]()",
        [
          {
            value: "json",
            result: "Correto. response.json() interpreta a resposta como JSON e devolve um objeto JavaScript."
          },
          {
            value: "color",
            result: "Não. color é propriedade de CSS, não método de resposta."
          },
          {
            value: "section",
            result: "Não. section é termo de HTML, não método da resposta."
          }
        ]
      )
    ),
    card(
      jsDomLessonId,
      "20a",
      "Montando o fluxo mínimo de leitura",
      paragraph("O fluxo de leitura já aparece quase pronto. Complete as quatro lacunas para localizar a área principal, buscar o arquivo, manter o caminho correto e converter a resposta em objeto JavaScript."),
      editor(
        "var app = [[document.getElementById]](\"[[app]]\");\nvar response = await [[fetch]](\"[[./content/comandos-linux.json]]\");\ndata = await response.json();",
        [
          { value: "document.getElementById", enabled: true },
          { value: "app", enabled: true },
          { value: "fetch", enabled: true },
          { value: "./content/comandos-linux.json", enabled: true },
          { value: "innerHTML", enabled: false },
          { value: "styles.css", enabled: false },
          { value: "querySelectorAll", enabled: false }
        ]
      )
    ),
    card(
      jsDomLessonId,
      21,
      "Fluxo de leitura de dados",
      table(
        "Da requisição até a tela",
        ["Etapa", "O que acontece"],
        [
          ["fetch(...)", "o navegador pede o arquivo JSON"],
          ["response.json()", "o texto da resposta vira objeto JavaScript"],
          ["data = ...", "o objeto é guardado numa variável"],
          ["render()", "a página monta o HTML e injeta no DOM"],
          ["cliques", "o listener de click passa a reagir às opções do quiz"]
        ]
      )
    ),
    card(
      jsDomLessonId,
      22,
      "Fechamento rápido do DOM e do fetch",
      table(
        "Resumo operacional",
        ["Ponto", "Leitura prática"],
        [
          ["DOM", "representação manipulável da página pelo JavaScript"],
          ["getElementById", "localiza um elemento pelo id"],
          ["innerHTML", "troca o conteúdo interno de um elemento"],
          ["data-*", "guarda pequenos dados auxiliares no HTML"],
          ["JSON", "formato textual de dados estruturados"],
          ["fetch", "busca um recurso pela web"],
          ["try/catch", "trata falhas de forma controlada"]
        ]
      )
    ),
    completeStep(
      jsDomLessonId,
      23,
      "Você já consegue ler o fluxo completo do projeto: localizar elementos, carregar JSON com fetch, converter a resposta, renderizar HTML e reagir aos cliques."
    )
  ]
);

const projectLesson = lesson(
  projectLessonId,
  "Projeto web completo",
  "Amarre HTML, CSS, JSON, JavaScript e Node na ordem certa até conseguir montar o projeto inteiro.",
  [
    card(
      projectLessonId,
      1,
      "Mapa dos arquivos do projeto",
      table(
        "Quem faz o quê",
        ["Arquivo", "Responsabilidade principal"],
        [
          ["index.html", "estrutura da página"],
          ["styles.css", "aparência visual"],
          ["app.js", "comportamento e renderização"],
          ["content/comandos-linux.json", "conteúdo do objeto de aprendizagem"],
          ["server.mjs", "servidor local para testes com Node"]
        ]
      )
    ),
    card(
      projectLessonId,
      2,
      "Ordem humana de construção",
      paragraph("Para quem está começando, a ordem mais segura não é sair escrevendo `JavaScript` de cabeça. A ordem humana é: primeiro estruturar o `HTML`, depois aplicar o `CSS` básico, depois escrever o conteúdo em `JSON`, depois ligar tudo com `JavaScript` e, por fim, testar com o servidor local.")
    ),
    card(
      projectLessonId,
      3,
      "Qual é o primeiro passo?",
      paragraph("Pense no fluxo completo do zero: ainda não existe página, estilo nem script conectado. Nesse contexto, qual alternativa descreve o primeiro passo mais humano para começar este projeto?"),
      choice([
        { value: "Criar o esqueleto do index.html", answer: true },
        { value: "Começar pelo catch do app.js", answer: false },
        { value: "Editar a porta no JSON antes de haver HTML", answer: false },
        { value: "Substituir CSS por Node", answer: false }
      ])
    ),
    card(
      projectLessonId,
      4,
      "Elemento-alvo da renderização",
      paragraph("No trecho `<main [[...]]>`, complete o atributo que marca a área principal onde o `JavaScript` vai escrever o conteúdo renderizado."),
      editor(
        "<main [[id=\"app\"]]>",
        [
          { value: "class=\"render\"", enabled: false },
          { value: "id=\"app\"", enabled: true },
          { value: "href=\"app\"", enabled: false }
        ]
      )
    ),
    card(
      projectLessonId,
      5,
      "Ligação com o CSS",
      paragraph("Depois do esqueleto `HTML`, uma etapa natural é ligar o arquivo `styles.css`. Isso permite começar a ver largura, fundo, tipografia e cartões com aparência minimamente organizada.")
    ),
    card(
      projectLessonId,
      6,
      "Complete o href da folha de estilo",
      paragraph("A tag `<link rel=\"stylesheet\" href=\"[[...]]\">`. Complete o caminho do arquivo `CSS` ligado dentro de `head`."),
      editor(
        "<link rel=\"stylesheet\" href=\"[[styles.css]]\">",
        [
          { value: "app.js", enabled: false },
          { value: "styles.css", enabled: true },
          { value: "server.mjs", enabled: false }
        ]
      )
    ),
    card(
      projectLessonId,
      7,
      "O papel do arquivo JSON",
      paragraph("Quando a estrutura e a aparência mínima existem, você pode separar o conteúdo em `content/comandos-linux.json`. Isso evita deixar o texto todo espalhado no `JavaScript` e separa dados de lógica.")
    ),
    card(
      projectLessonId,
      8,
      "Array de seções no JSON",
      paragraph("Na linha `\"sections\": [[...]]`, complete a sintaxe mínima do campo `sections` quando ele nasce como uma lista."),
      editor(
        "\"sections\": [[[]]]",
        [
          { value: "{}", enabled: false },
          { value: "[]", enabled: true },
          { value: "\"\"", enabled: false }
        ]
      )
    ),
    card(
      projectLessonId,
      9,
      "Que tipos de seção o JSON usa",
      table(
        "Contrato atual do JSON",
        ["type", "Função prática"],
        [
          ["text", "explicação textual simples"],
          ["table", "consulta ou contraste em linhas e colunas"],
          ["quiz", "pergunta com opções e feedback imediato"]
        ]
      )
    ),
    card(
      projectLessonId,
      10,
      "Montando a string final da página",
      paragraph("Depois de ler o `JSON`, o `app.js` percorre `data.sections` e vai concatenando pedaços de `HTML` em uma variável chamada `html`. Só no final ele injeta o resultado no elemento `#app`.")
    ),
    card(
      projectLessonId,
      11,
      "Propriedade que injeta o HTML montado",
      paragraph("Na linha `app.[[...]] = html;`, complete a propriedade usada para substituir o conteúdo interno de `#app`."),
      editor(
        "app.[[innerHTML]] = html;",
        [
          { value: "href", enabled: false },
          { value: "innerHTML", enabled: true },
          { value: "padding", enabled: false }
        ]
      )
    ),
    card(
      projectLessonId,
      12,
      "Como o quiz sabe o que foi clicado",
      paragraph("Os botões do quiz carregam pequenos dados auxiliares no próprio `HTML`, como `data-section` e `data-option`. Assim, o evento de clique consegue descobrir qual pergunta e qual alternativa precisam ser avaliadas.")
    ),
    card(
      projectLessonId,
      13,
      "Complete um índice de opção",
      paragraph("O atributo `data-section=\"[[...]]\"`. Complete um valor numérico simples para `data-section` ou `data-option`."),
      editor(
        "data-section=\"[[0]]\"",
        [
          { value: "0", enabled: true },
          { value: "section", enabled: false },
          { value: "html", enabled: false }
        ]
      )
    ),
    card(
      projectLessonId,
      14,
      "Por que existe server.mjs",
      paragraph("Mesmo num projeto pequeno, `server.mjs` cumpre um papel importante: servir a pasta por `http://`. Isso resolve o problema do `fetch` e deixa o teste local próximo do modo como o navegador consome arquivos em uma publicação estática.")
    ),
    card(
      projectLessonId,
      15,
      "Comando de teste local",
      paragraph("No comando `node [[...]]`, complete o nome do arquivo usado para subir o servidor local a partir da pasta `trabalho`."),
      editor(
        "node [[server.mjs]]",
        [
          { value: "index.html", enabled: false },
          { value: "server.mjs", enabled: true },
          { value: "comandos-linux.json", enabled: false }
        ]
      )
    ),
    card(
      projectLessonId,
      16,
      "Por que o duplo clique não basta",
      paragraph("Lembre que abrir `index.html` por duplo clique coloca a página em `file://`, e o projeto depende de `fetch` para ler o `JSON`. Com esse contexto, qual alternativa resume melhor o problema?"),
      choice([
        { value: "A página entra em file:// e o fetch pode falhar ao tentar ler o JSON", answer: true },
        { value: "O HTML deixa de existir dentro da pasta", answer: false },
        { value: "O CSS automaticamente apaga o JavaScript", answer: false },
        { value: "O Node é desinstalado pelo navegador", answer: false }
      ])
    ),
    card(
      projectLessonId,
      17,
      "Fluxo completo de trabalho local",
      table(
        "Uma rotina realista para estudar e desenvolver",
        ["Etapa", "Ação"],
        [
          ["1", "Abrir a pasta no VS Code"],
          ["2", "Editar index.html, styles.css, app.js ou o JSON"],
          ["3", "Abrir o terminal integrado"],
          ["4", "Rodar node server.mjs"],
          ["5", "Abrir http://127.0.0.1:3000 no navegador"],
          ["6", "Salvar mudanças e atualizar a página para ver o resultado"]
        ]
      )
    ),
    card(
      projectLessonId,
      18,
      "Quem você altera para cada tipo de mudança",
      paragraph("Se você quiser mudar apenas as cores dos cartões, sem alterar texto, dados nem lógica, qual arquivo é o alvo principal?"),
      choice([
        { value: "styles.css", answer: true },
        { value: "content/comandos-linux.json", answer: false },
        { value: "server.mjs", answer: false },
        { value: "Nenhum; as cores moram no navegador", answer: false }
      ])
    ),
    card(
      projectLessonId,
      "18a",
      "Costurando o projeto inteiro",
      paragraph("Complete as quatro lacunas para costurar a área principal da página, a ligação com os arquivos e o comando de teste local."),
      editor(
        "<main [[id=\"app\"]]></main>\n<link rel=\"stylesheet\" href=\"[[styles.css]]\">\n<script src=\"[[app.js]]\"></script>\nnode [[server.mjs]]",
        [
          { value: "id=\"app\"", enabled: true },
          { value: "styles.css", enabled: true },
          { value: "app.js", enabled: true },
          { value: "server.mjs", enabled: true },
          { value: "href=\"app\"", enabled: false },
          { value: "index.css", enabled: false },
          { value: "localhost", enabled: false }
        ]
      )
    ),
    card(
      projectLessonId,
      19,
      "Dados não são aparência",
      paragraph("Se você quiser trocar o texto de uma pergunta, acrescentar uma tabela nova ou criar mais um quiz sem inventar novos tipos, o alvo principal tende a ser o arquivo `JSON`, não o `CSS`.")
    ),
    card(
      projectLessonId,
      20,
      "Autonomia para criar sua própria versão",
      table(
        "Como começar a adaptar o projeto sem copiar às cegas",
        ["Se você quer mudar...", "Arquivo principal", "Pergunta que deve fazer a si mesmo"],
        [
          ["estrutura da página", "index.html", "Quais áreas fixas preciso manter?"],
          ["aparência", "styles.css", "Que propriedade e que valor realmente controlam esse visual?"],
          ["conteúdo", "comandos-linux.json", "O novo dado respeita o formato de sections?"],
          ["comportamento", "app.js", "Que função ou evento preciso alterar?"],
          ["teste local", "server.mjs", "O servidor continua entregando os arquivos certos?"]
        ]
      )
    ),
    card(
      projectLessonId,
      21,
      "Fechamento rápido do projeto inteiro",
      table(
        "Mapa mental final",
        ["Camada", "Leitura prática"],
        [
          ["HTML", "estrutura o documento"],
          ["CSS", "define a aparência"],
          ["JSON", "guarda os dados do conteúdo"],
          ["JavaScript", "liga dados, DOM e eventos"],
          ["Node", "serve a pasta localmente para o navegador"]
        ]
      )
    ),
    completeStep(
      projectLessonId,
      22,
      "Você já tem base para ler, explicar e remontar praticamente todo o exemplo simples de ponta a ponta: arquivos, sintaxe, dados, renderização e teste local."
    )
  ]
);

const payload = {
  appTitle: "AraLearn",
  courses: [
    {
      id: "html-css-javascript-node-do-zero",
      title: "HTML, CSS, JavaScript e Node do Zero",
      description: "Curso extenso em português brasileiro para leigos completos que precisam entender, praticar e montar um projeto web simples com HTML, CSS, JavaScript, JSON, Node e servidor local. O foco é compreender a sintaxe, o vocabulário técnico em inglês e português, a ordem humana de construção e a autonomia para adaptar o projeto com criatividade.",
      modules: [
        {
          id: "m01",
          title: "Ambiente e ferramentas",
          lessons: [environmentLesson]
        },
        {
          id: "m02",
          title: "HTML",
          lessons: [htmlLesson]
        },
        {
          id: "m03",
          title: "CSS",
          lessons: [cssLesson]
        },
        {
          id: "m04",
          title: "JavaScript",
          lessons: [jsBasicsLesson, jsDomLesson]
        },
        {
          id: "m05",
          title: "Projeto completo",
          lessons: [projectLesson]
        }
      ]
    }
  ],
  progress: {
    lessons: []
  },
  assets: {},
  packageMeta: {
    format: "aralearn-package-v3",
    scope: "app",
    exportedAt: new Date().toISOString(),
    appTitle: "AraLearn",
    source: {
      type: "example-package",
      courseId: "html-css-javascript-node-do-zero",
      courseTitle: "HTML, CSS, JavaScript e Node do Zero",
      origin: "AraLearn examples",
      reconstruction: "hand-authored-course"
    }
  }
};

await mkdir(path.dirname(outputJsonPath), { recursive: true });
const jsonText = JSON.stringify(payload, null, 2);
await writeFile(outputJsonPath, jsonText, "utf8");

const zipBytes = zipSync({
  "project.json": strToU8(jsonText)
}, { level: 9 });

await writeFile(outputZipPath, Buffer.from(zipBytes));
console.log(`Curso gravado em ${outputJsonPath}`);
console.log(`Pacote ZIP gravado em ${outputZipPath}`);
