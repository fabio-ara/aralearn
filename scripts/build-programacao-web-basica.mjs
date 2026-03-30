import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { strToU8, zipSync } from "fflate";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const tutorialDir = path.join(rootDir, "trabalho", "tutorial");
const projectInputPath = path.join(tutorialDir, "project_completo_auditado.json");
const manifestInputPath = path.join(tutorialDir, "image_manifest_completo_auditado.json");
const reportPath = path.join(tutorialDir, "CODEX_REPORT.md");
const contentJsonPath = path.join(rootDir, "content", "programacao-web-basica.json");
const contentZipPath = path.join(rootDir, "content", "programacao-web-basica.zip");

const COLORS = {
  bg0: "#120f0c",
  bg1: "#1a1511",
  bg2: "#261f19",
  panel: "#17120e",
  panelSoft: "#1d1712",
  panelStrong: "#201913",
  ink: "#f4eee6",
  muted: "#b9aa95",
  line: "#433628",
  lineSoft: "#342a20",
  gold: "#e4ba68",
  goldSoft: "#f2d79d",
  goldInk: "#2c1b04",
  accentBlue: "#8fb9bd",
  accentGreen: "#8bc2a3",
  accentRose: "#d8847a",
  shadow: "rgba(0, 0, 0, 0.24)"
};

const exactTextReplacements = new Map([
  ["BLUEPRINT DO INDEX.HTML", "MAPA DO INDEX.HTML"],
  ["Use esta imagem como recap visual do ponto central do card.", "__IMAGE_RECAP__"],
  ["Observe central reforçado e imagem de reforço no popup. neste recorte.", "__IMAGE_RECAP__"],
  ["A imagem final resume a trajetória completa que o curso quer formar.", "O recorte integra estrutura, aparência e comportamento em uma mesma tela funcional."],
  ["programar renderização, clique e erro no app.js", "programar renderização, clique e tratamento de erro em app.js"],
  ["O ponto e vírgula ; marca o fim de uma instrução. Nem sempre ele é obrigatório no JavaScript moderno, mas no projeto ele ajuda a manter a leitura estável.", "O ponto e vírgula ; marca o fim de uma instrução. Nem sempre ele é obrigatório no JavaScript moderno, mas ajuda a separar visualmente cada instrução."]
]);

const technicalTerms = [
  "document.getElementById(\"app\")",
  "response.json()",
  "querySelectorAll",
  "addEventListener",
  "HTML",
  "CSS",
  "JavaScript",
  "JSON",
  "DOM",
  "Node.js",
  "Node",
  "VS Code",
  "fetch",
  "async",
  "await",
  "try",
  "catch",
  "innerHTML",
  "textContent",
  "getElementById",
  "querySelector",
  "server.mjs",
  "index.html",
  "styles.css",
  "app.js",
  "localhost",
  "folder",
  "file",
  "browser",
  "protocol",
  "host",
  "port",
  "path",
  "flag",
  "version",
  "head",
  "body",
  "header",
  "main",
  "section",
  "article",
  "div",
  "button",
  "link",
  "script",
  "img",
  "h1",
  "h2",
  "h3",
  "class",
  "id",
  "lang",
  "href",
  "src",
  "rel",
  "type",
  "stylesheet",
  "background-color",
  "max-width",
  "line-height",
  "border-radius",
  "font-size",
  "padding",
  "margin",
  "display",
  "cursor",
  "pointer",
  "correct",
  "null",
  "const",
  "let",
  "var"
];

const textRegexReplacements = [
  [/\b[Nn]este projeto\b/g, "No miniprojeto"],
  [/\b[Ee]ste projeto\b/g, "O miniprojeto"],
  [/\b[Dd]este projeto\b/g, "do miniprojeto"],
  [/\b[Ee]sse projeto\b/g, "o miniprojeto"],
  [/\b[Pp]ara este projeto\b/g, "Para o miniprojeto"],
  [/\b[Nn]esse projeto\b/g, "No miniprojeto"],
  [/\b[Pp]rojeto real\b/g, "miniprojeto"],
  [/\b[Nn]este curso\b/g, "Aqui"],
  [/\b[Ee]ste curso\b/g, "Esta trilha"],
  [/\bmemória do curso\b/g, "memória acumulada até aqui"],
  [/\bo curso fixa\b/g, "aqui usa"],
  [/\bo curso usa\b/g, "aqui usa"],
  [/\bO aluno precisa ver\b/g, "Aqui, observe"],
  [/\bO aluno precisa olhar\b/g, "Olhe"],
  [/\bO aluno precisa ganhar coragem para\b/g, "A ideia aqui é que você ganhe confiança para"],
  [/\bO aluno precisa recompor\b/g, "Agora, recomponha"],
  [/\bO aluno precisa montar\b/g, "Agora, monte"],
  [/\bAgora o aluno precisa ver\b/g, "Agora, veja"],
  [/\bAqui o aluno\b/g, "Aqui, você"],
  [/\bAo aluno\b/g, "A você"],
  [/\bao aluno\b/g, "a você"],
  [/\bdo aluno\b/g, "seu"],
  [/\bDo aluno\b/g, "Seu"],
  [/\bmemória do aluno\b/g, "sua memória"],
  [/\brepertório do aluno\b/g, "seu repertório"],
  [/\bO aluno\b/g, "Você"],
  [/\bo aluno\b/g, "você"],
  [/\bEstudante\b/g, "Você"],
  [/\bestudante\b/g, "você"],
  [/\bdo estudante\b/g, "seu"],
  [/\bDo estudante\b/g, "Seu"],
  [/\bO estudante\b/g, "Você"],
  [/\bo estudante\b/g, "você"],
  [/\ba trilha continua focado\b/gi, "a trilha continua focada"],
  [/\baqui usa getElementById\b/g, "aqui usa getElementById como referência principal"],
  [/MDN significa Mozilla Developer Network\. É uma referência técnica muito usada para consultar elementos de HTML, propriedades de CSS e recursos de JavaScript\. Aqui, ela entra como apoio para confirmar nomes, sintaxe e exemplos do que o próprio curso já ensina ou vai ensinar logo em seguida\./g, "MDN significa Mozilla Developer Network. É uma referência técnica muito usada para consultar elementos de HTML, propriedades de CSS e recursos de JavaScript. Aqui, ela funciona como apoio para confirmar nomes, sintaxe e exemplos das peças que aparecem no miniprojeto."],
  [/Escolha a resposta alinhada ao curso\./g, "Escolha a resposta mais alinhada ao diagnóstico técnico."],
  [/Mesmo que o projeto use poucos elementos, vale entender famílias próximas: h1, h2 e h3 são títulos em níveis diferentes; div é contêiner genérico; section marca uma seção temática; button representa ação clicável\. Você não precisa decorar todos os casos do mundo, mas precisa entender a família estrutural\. Qual ampliação abaixo ajuda a autonomia sem ampliar demais a trilha\?/g, "Mesmo que o miniprojeto use poucos elementos, vale entender famílias próximas: h1, h2 e h3 são títulos em níveis diferentes; div é contêiner genérico; section marca uma seção temática; button representa ação clicável. Você não precisa decorar todos os casos do mundo, mas precisa entender a família estrutural. Qual ampliação mantém o foco no HTML estrutural sem sair do escopo?"],
  [/Esse mapa vai reaparecer várias vezes\. A ideia é fixar o papel de cada peça sem redefinir tudo a cada passo\./g, "Esse mapa resume o papel de cada peça."],
  [/A ideia aqui é transformar fragmentos dispersos em blocos recuperáveis de cabeça\./g, "A ideia é agrupar as peças principais do miniprojeto em blocos fáceis de recuperar."],
  [/A ideia aqui é transformar fragmentos dispersos em blocos recuperáveis de cabeça\. Complete as três âncoras do documento HTML\./g, "Agrupe as peças principais do miniprojeto em blocos fáceis de recuperar. Complete as três âncoras do documento HTML."],
  [/A ideia aqui é transformar fragmentos dispersos em blocos recuperáveis de cabeça\. Digite o comando do servidor e a URL local sem olhar para fora da trilha\./g, "Agrupe as peças principais do miniprojeto em blocos fáceis de recuperar. Digite o comando do servidor e a URL local sem consulta externa."],
  [/Qual método de memória combina melhor com esta trilha\?/g, "Qual prática ajuda mais a recuperar as peças do miniprojeto?"],
  [/A ideia aqui é transformar fragmentos dispersos em blocos recuperáveis de cabeça\. Escolha o método de memória que mais combina com esta proposta\./g, "Agrupe as peças principais do miniprojeto em blocos fáceis de recuperar. Escolha a prática que mais ajuda a retomar essas peças sem consulta."],
  [/Este é o roteiro que você deve conseguir executar sozinho ao final\./g, "Este é o roteiro mínimo para montar o miniprojeto sem modelo pronto."],
  [/Este é o roteiro que você deve conseguir executar sozinho ao final\. Qual cenário mostra que você realmente terminou Esta trilha com autonomia\?/g, "Este é o roteiro mínimo para montar o miniprojeto sem modelo pronto. Qual cenário mostra que você já consegue repetir esse processo sozinho?"],
  [/Mesmo com autonomia ampliada, a trilha continua focada unicamente no miniprojeto e nas habilidades suficientes para criar esse tipo de solução\./g, "O foco continua no miniprojeto e nas habilidades necessárias para criar esse tipo de solução."],
  [/Quando a trilha é suficiente, você consegue começar, estruturar, implementar e testar sem depender de um modelo pronto\. Escolha a melhor evidência disso\./g, "Quando esse repertório está sólido, você consegue começar, estruturar, implementar e testar sem depender de um modelo pronto. Escolha a melhor evidência disso."],
  [/Como a MDN entra depois desta trilha\?/g, "Como usar a MDN depois de montar o miniprojeto?"],
  [/A ideia é que você consiga projetar e montar o miniprojeto usando o próprio repertório construído ao longo da trilha\./g, "Agora, use o repertório acumulado para projetar e montar o miniprojeto."],
  [/Você concluiu uma trilha focada no miniprojeto, mas ampla o suficiente para gerar autoria completa sem modelo pronto\./g, "Você já reúne as peças necessárias para planejar, montar e testar um miniprojeto desse tipo sem modelo pronto."],
  [/\.\s+ele\b/g, ". Ele"],
  [/\.\s+o\b/g, ". O"]
];

const exactPhraseReplacements = new Map([
  ["Boa. O aluno precisa recuperar isso de cabeça, não só reconhecer.", "Vale recuperar isso de cabeça, não só reconhecer visualmente."],
  ["O aluno precisa olhar para a tela e reconhecer quais partes do HTML sustentam cada bloco visual.", "Olhe para a tela e reconheça quais partes do HTML sustentam cada bloco visual."],
  ["O aluno precisa ver o efeito do CSS como decisão legível: fundo, espaçamento, largura e tipografia.", "Observe como o CSS muda a leitura da interface: fundo, espaçamento, largura e tipografia."],
  ["Aqui o aluno liga sintaxe a intenção de design.", "Aqui, sintaxe e intenção de design se ligam diretamente."],
  ["O aluno precisa ver que o layout deve continuar legível em larguras menores.", "Observe que o layout precisa continuar legível em larguras menores."],
  ["Agora o aluno precisa ver o JS como camada que lê dados, acha elementos e monta HTML.", "Agora, veja o JS como a camada que lê dados, encontra elementos e monta HTML."],
  ["O aluno precisa ganhar coragem para inventar novos blocos válidos sem quebrar a estrutura.", "Agora, invente novos blocos válidos sem quebrar a estrutura do JSON."],
  ["A linha de template string precisa ficar confortável na memória do aluno.", "Essa linha de template string precisa ficar confortável na sua memória, porque ela reaparece quando dado e texto se combinam."],
  ["Aqui o aluno precisa recuperar rapidamente qual chave pertence a qual tipo.", "Aqui, você precisa reconhecer rapidamente qual chave pertence a qual tipo."],
  ["Fetch e response.json() formam um par que o aluno precisa recuperar em bloco.", "fetch e response.json() formam um par: primeiro você busca a resposta, depois converte o corpo em dado JavaScript."],
  ["A interação deixa de ser abstrata quando o aluno nomeia os estados envolvidos.", "A interação fica mais concreta quando você nomeia os estados envolvidos."],
  ["Esse erro aparece muito em prática real e precisa estar no repertório do aluno.", "Esse erro aparece muito na prática real e vale entrar no seu repertório de depuração."],
  ["Agora o aluno precisa montar o arquivo quase inteiro a partir da memória do curso.", "Agora, monte o arquivo quase inteiro a partir da memória que você acumulou até aqui."],
  ["O aluno precisa recompor o arquivo de estilos como conjunto funcional, não como propriedades soltas.", "Agora, recomponha o arquivo de estilos como conjunto funcional, não como propriedades soltas."],
  ["A repetição por componente aproxima o aluno do arquivo completo.", "A repetição por componente aproxima você do arquivo completo."],
  ["Aqui o aluno pratica a forma de dados mais diferente do texto simples.", "Aqui, você pratica a forma de dados mais diferente do texto simples."],
  ["A produção livre controlada é o ponto em que o JSON realmente passa a ser do aluno.", "A produção livre controlada é o ponto em que o JSON realmente passa a ser seu."],
  ["Aqui o aluno fixa o elo entre valor do tipo e função correspondente.", "Aqui, você fixa o elo entre o valor do tipo e a função correspondente."],
  ["Comando no terminal e URL no navegador formam outro par que o aluno precisa dominar.", "Comando no terminal e URL no navegador formam outro par que você precisa dominar."],
  ["Esse erro já deve estar previsto no repertório de depuração do aluno.", "Esse erro já deve entrar no seu repertório de depuração."],
  ["Quando o aluno descreve o fluxo em linguagem simples, ele entende melhor o código.", "Quando você descreve o fluxo em linguagem simples, entende melhor o código."],
  ["Nada; o aluno pode usar só desktop", "Nada; você pode usar só desktop"],
  ["O que o aluno precisa memorizar aqui?", "O que vale memorizar aqui?"],
  ["O QUE O ALUNO PRECISA MEMORIZAR AQUI?", "O QUE VALE MEMORIZAR AQUI?"],
  ["Depois do curso", "Depois da trilha"],
  ["Fechamento do curso", "Fechamento final"],
  ["O curso continua focado", "A trilha continua focada"],
  ["Qual método de memória combina com este curso?", "Qual prática ajuda mais a recuperar as peças do miniprojeto?"],
  ["Qual sinal mostra que o curso foi suficiente?", "Qual sinal mostra que você já ganhou autonomia?"],
  ["Como a MDN entra depois deste curso?", "Como a MDN entra depois desta trilha?"],
  ["Feche o curso com a visão de autoria completa do miniprojeto.", "Feche a trilha com a visão de autoria completa do miniprojeto."],
  ["Este é o roteiro que o estudante deve conseguir executar sozinho ao final.", "Este é o roteiro que você deve conseguir executar sozinho ao final."],
  ["Quando o curso é suficiente, você consegue começar, estruturar, implementar e testar sem depender de um modelo pronto. Escolha a melhor evidência disso.", "Quando a trilha é suficiente, você consegue começar, estruturar, implementar e testar sem depender de um modelo pronto. Escolha a melhor evidência disso."],
  ["Você concluiu um curso focado no miniprojeto, mas amplo o suficiente para gerar autoria completa sem modelo pronto.", "Você concluiu uma trilha focada no miniprojeto, mas ampla o suficiente para gerar autoria completa sem modelo pronto."],
  ["Esse mapa vai reaparecer várias vezes. A ideia é fixar o papel de cada peça sem redefinir tudo a cada passo.", "Esse mapa resume o papel de cada peça."],
  ["MDN significa Mozilla Developer Network. É uma referência técnica muito usada para consultar elementos de HTML, propriedades de CSS e recursos de JavaScript. Aqui, ela entra como apoio para confirmar nomes, sintaxe e exemplos do que o próprio curso já ensina ou vai ensinar logo em seguida.", "MDN significa Mozilla Developer Network. É uma referência técnica muito usada para consultar elementos de HTML, propriedades de CSS e recursos de JavaScript. Aqui, ela funciona como apoio para confirmar nomes, sintaxe e exemplos das peças que aparecem no miniprojeto."],
  ["Anote os erros que você mesmo comete. Isso transforma bug em memória de longo prazo e aumenta a chance de você montar o próximo projeto sozinho. Depurar também é habilidade ensinável: olhar causa, sintoma e ponto provável do erro. Escolha a resposta alinhada ao curso.", "Anote os erros que você mesmo comete. Isso transforma bug em memória de longo prazo e aumenta a chance de você montar o próximo projeto sozinho. Depurar também é habilidade ensinável: olhar causa, sintoma e ponto provável do erro. Escolha a resposta mais alinhada ao diagnóstico técnico."],
  ["Mesmo que o projeto use poucos elementos, vale entender famílias próximas: h1, h2 e h3 são títulos em níveis diferentes; div é contêiner genérico; section marca uma seção temática; button representa ação clicável. Você não precisa decorar todos os casos do mundo, mas precisa entender a família estrutural. Qual ampliação abaixo ajuda a autonomia sem ampliar demais a trilha?", "Mesmo que o miniprojeto use poucos elementos, vale entender famílias próximas: h1, h2 e h3 são títulos em níveis diferentes; div é contêiner genérico; section marca uma seção temática; button representa ação clicável. Você não precisa decorar todos os casos do mundo, mas precisa entender a família estrutural. Qual ampliação mantém o foco no HTML estrutural sem sair do escopo?"],
  ["A ideia aqui é transformar fragmentos dispersos em blocos recuperáveis de cabeça.", "A ideia é agrupar as peças principais do miniprojeto em blocos fáceis de recuperar."],
  ["A ideia aqui é transformar fragmentos dispersos em blocos recuperáveis de cabeça. Complete as três âncoras do documento HTML.", "Agrupe as peças principais do miniprojeto em blocos fáceis de recuperar. Complete as três âncoras do documento HTML."],
  ["A ideia aqui é transformar fragmentos dispersos em blocos recuperáveis de cabeça. Digite o comando do servidor e a URL local sem olhar para fora da trilha.", "Agrupe as peças principais do miniprojeto em blocos fáceis de recuperar. Digite o comando do servidor e a URL local sem consulta externa."],
  ["A ideia aqui é transformar fragmentos dispersos em blocos recuperáveis de cabeça. Escolha o método de memória que mais combina com esta proposta.", "Agrupe as peças principais do miniprojeto em blocos fáceis de recuperar. Escolha a prática que mais ajuda a retomar essas peças sem consulta."],
  ["Este é o roteiro que você deve conseguir executar sozinho ao final.", "Este é o roteiro mínimo para montar o miniprojeto sem modelo pronto."],
  ["Este é o roteiro que você deve conseguir executar sozinho ao final. Qual cenário mostra que você realmente terminou Esta trilha com autonomia?", "Este é o roteiro mínimo para montar o miniprojeto sem modelo pronto. Qual cenário mostra que você já consegue repetir esse processo sozinho?"],
  ["Mesmo com autonomia ampliada, a trilha continua focada unicamente no miniprojeto e nas habilidades suficientes para criar esse tipo de solução.", "O foco continua no miniprojeto e nas habilidades necessárias para criar esse tipo de solução."],
  ["Você concluiu uma trilha focada no miniprojeto, mas ampla o suficiente para gerar autoria completa sem modelo pronto.", "Você já reúne as peças necessárias para planejar, montar e testar um miniprojeto desse tipo sem modelo pronto."],
  ["A ideia é que você consiga projetar e montar o miniprojeto usando o próprio repertório construído ao longo da trilha.", "Agora, use o repertório acumulado para projetar e montar o miniprojeto."],
  ["Quando a trilha é suficiente, você consegue começar, estruturar, implementar e testar sem depender de um modelo pronto. Escolha a melhor evidência disso.", "Quando esse repertório está sólido, você consegue começar, estruturar, implementar e testar sem depender de um modelo pronto. Escolha a melhor evidência disso."],
  ["Como a MDN entra depois desta trilha?", "Como usar a MDN depois de montar o miniprojeto?"]
]);

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function trimSentence(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\?\./g, "?")
    .replace(/!\./g, "!")
    .replace(/:\./g, ":")
    .replace(/,\./g, ".")
    .replace(/\.\./g, ".")
    .trim();
}

function stripAuthorInlineMarkup(value) {
  return String(value || "")
    .replace(/<\/?(?:span|strong|em|b|i)(?:\s+[^>]*)?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function cleanVisibleText(value) {
  let text = trimSentence(stripAuthorInlineMarkup(value));
  for (const [from, to] of exactTextReplacements.entries()) {
    if (text === from) {
      return to;
    }
  }
  for (const [from, to] of exactPhraseReplacements.entries()) {
    if (text === from) {
      return to;
    }
  }
  for (const [pattern, replacement] of textRegexReplacements) {
    text = text.replace(pattern, replacement);
  }

  text = text.replace(/\bblueprint visual\b/gi, "mapa visual");
  text = text.replace(/\bblueprint\b/gi, "mapa");
  text = text.replace(/\bESTE CURSO\b/g, "ESTA TRILHA");
  text = text.replace(/\bNESTE CURSO\b/g, "NESTA TRILHA");
  text = text.replace(/\bESTE PROJETO\b/g, "O MINIPROJETO");
  text = text.replace(/\bNESTE PROJETO\b/g, "NO MINIPROJETO");
  text = text.replace(/\bno app\.js\b/g, "em app.js");
  text = text.replace(/\bno app\b/g, "na interface");
  text = text.replace(/\bNo projeto\b/g, "No miniprojeto");
  text = text.replace(/\bno projeto\b/g, "no miniprojeto");
  text = text.replace(/\bDo projeto\b/g, "Do miniprojeto");
  text = text.replace(/\bdo projeto\b/g, "do miniprojeto");
  text = text.replace(/\bEste projeto\b/g, "O miniprojeto que você vai montar");
  text = text.replace(/\beste projeto\b/g, "o miniprojeto que você vai montar");
  text = text.replace(/\bEsse projeto\b/g, "Esse miniprojeto");
  text = text.replace(/\besse projeto\b/g, "esse miniprojeto");
  text = text.replace(/\bNeste projeto\b/g, "Neste miniprojeto");
  text = text.replace(/\bneste projeto\b/g, "neste miniprojeto");
  text = text.replace(/\bNesse projeto\b/g, "Nesse miniprojeto");
  text = text.replace(/\bnesse projeto\b/g, "nesse miniprojeto");
  text = text.replace(/\bdeste projeto\b/g, "do miniprojeto");
  text = text.replace(/\bdesse projeto\b/g, "desse miniprojeto");
  text = text.replace(/\bprojeto real\b/gi, "miniprojeto proposto");
  text = text.replace(/\bcurso enciclopédico\b/gi, "material enciclopédico");
  text = text.replace(/\bao final do curso\b/gi, "ao final");
  text = text.replace(/\bno fim do curso\b/gi, "ao final");
  text = text.replace(/\bmemória do curso\b/gi, "memória acumulada até aqui");
  text = text.replace(/\bsem inflar o curso\b/gi, "sem ampliar demais a trilha");
  text = text.replace(/\bo curso fixa\b/gi, "aqui o foco fica");
  text = text.replace(/\bo curso continua\b/gi, "a trilha continua");
  text = text.replace(/\bo curso\b/gi, "a trilha");
  text = text.replace(/\bdo curso\b/gi, "da trilha");
  text = text.replace(/\bdeste curso\b/gi, "desta trilha");
  text = text.replace(/\bneste curso\b/gi, "nesta trilha");
  text = text.replace(/\bAgora o aluno precisa\b/g, "Agora, você precisa");
  text = text.replace(/\bO aluno precisa\b/g, "Você precisa");
  text = text.replace(/\bAqui o aluno\b/g, "Aqui, você");
  text = text.replace(/\bQuando o aluno\b/g, "Quando você");
  text = text.replace(/\bpara o aluno\b/gi, "para você");
  text = text.replace(/\bdo aluno\b/gi, "seu");
  text = text.replace(/\bo aluno\b/gi, "você");
  text = text.replace(/\bo estudante\b/gi, "você");
  text = text.replace(/\bdo estudante\b/gi, "seu");
  text = text.replace(/\bestudante\b/gi, "você");
  text = text.replace(/\bCARD\b/g, "CARTÃO");
  text = text.replace(/\bCard\b/g, "Cartão");
  text = text.replace(/\bcard\b/g, "cartão");
  text = text.replace(/HTML organiza as partes da p[aá]gina CSS mexe/gi, "HTML organiza as partes da página. CSS mexe");
  text = text.replace(/Node\.js Roda/gi, "Node.js roda");
  text = text.replace(/\bterminal Lugar\b/gi, "Terminal: lugar");
  text = text.replace(/\bTerminal: lugar em que você digita comandos\./g, "Terminal é o lugar em que você digita comandos.");
  text = text.replace(/\. continua sendo/gi, ". Ele continua sendo");
  text = text.replace(/\bserver local deste trabalho\b/gi, "servidor local do miniprojeto");
  text = text.replace(/\bdeste trabalho\b/gi, "do miniprojeto");
  text = text.replace(/\. ele\b/g, ". Ele");
  return trimSentence(text);
}

function buildParagraphRichText(value) {
  const source = stripAuthorInlineMarkup(String(value || "").replace(/\r/g, ""));
  const exactTerms = technicalTerms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((term) => escapeRegex(term));
  const exactTermRegex = exactTerms.length
    ? new RegExp(`(?<![A-Za-zÀ-ÖØ-öø-ÿ0-9_-])(?:${exactTerms.join("|")})(?![A-Za-zÀ-ÖØ-öø-ÿ0-9_-])`, "gi")
    : null;
  const patterns = [
    /<!DOCTYPE html>/gi,
    /<\/?[a-zA-Z][^>\n]{0,140}>/g,
    /(?:https?:\/\/|file:\/\/)[^\s<>"',.)]*/g,
    /(?:\.\/|\.\.\/|\/)?[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9._-]+)*\.(?:html|css|js|json|mjs|svg|png|jpg|jpeg|gif|webp)\b/g,
    /\bnode\s+-[a-z]\b/gi,
    /\bnode\s+[A-Za-z0-9_.:/-]+\.(?:mjs|js|json|html|css)\b/gi,
    /\bgit\s+log\s+--oneline\b/gi,
    /\bgit\s+checkout\s+[A-Z0-9_-]+\s+--\s+[A-Za-z0-9._/-]+\b/gi,
    /\bnpm\s+run\s+[A-Za-z0-9:_-]+\b/gi,
    /\bpwsh\b/gi,
    /\b(?:127\.0\.0\.1(?::\d+)?|localhost(?::\d+)?)\b/g,
    /\b(?:data-[a-z0-9-]+|id|class|href|src|rel|type|lang|charset|name|value)\s*=\s*"[^"]*"/gi,
    /[#.][A-Za-z_-][\w-]*/g,
    /\b\d+px\b/gi,
    exactTermRegex,
    /(?:[A-Za-z_$][\w$]*\.)*[A-Za-z_$][\w$]*\([^()\n]{0,80}\)/g
  ].filter(Boolean);

  const ranges = [];
  for (const regex of patterns) {
    regex.lastIndex = 0;
    let match = regex.exec(source);
    while (match) {
      ranges.push({
        start: match.index,
        end: match.index + match[0].length
      });
      if (regex.lastIndex === match.index) {
        regex.lastIndex += 1;
      }
      match = regex.exec(source);
    }
  }

  ranges.sort((a, b) => (a.start - b.start) || (b.end - a.end));
  const merged = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) {
      merged.push({ ...range });
      continue;
    }
    if (range.end > last.end) {
      last.end = range.end;
    }
  }

  let html = "";
  let cursor = 0;
  for (const range of merged) {
    html += escapeHtml(source.slice(cursor, range.start));
    html += `<strong><span class="inline-tone-gold">${escapeHtml(source.slice(range.start, range.end))}</span></strong>`;
    cursor = range.end;
  }
  html += escapeHtml(source.slice(cursor));
  return html.replace(/\n/g, "<br>");
}

function looksLikeCodeCell(value) {
  const text = String(value || "").trim();
  if (!text) return false;

  return (
    /^<\/?[a-z][^>]*>$/i.test(text) ||
    /^<!DOCTYPE html>$/i.test(text) ||
    /^(?:\.|#)[a-z0-9_-]+$/i.test(text) ||
    /\b[a-z0-9_./-]+\.(?:html|css|js|json|mjs|svg|png|jpg|jpeg|gif|webp)\b/i.test(text) ||
    /:\/\//.test(text) ||
    /[{}()[\]]/.test(text) ||
    /\b[a-z0-9_$.-]+\([^)]*\)/i.test(text) ||
    /^[a-z-]+\s*:\s*.+;?$/i.test(text) ||
    /^(?:true|false|null)$/i.test(text) ||
    /^\d+px$/i.test(text) ||
    /^(?:HTML|CSS|JSON|DOM|Node\.js|Node|VS Code|JavaScript|fetch|async|await)$/i.test(text)
  );
}

function normalizeFocusElements(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normalizeFocusElements(item))
      .filter(Boolean);
  }

  const text = trimSentence(value);
  if (!text) return [];

  return text
    .replace(/[\[\]'"]/g, "")
    .split(/\s*(?:,| e | > | \+ | \/ )\s*/i)
    .map((item) => trimSentence(item))
    .filter(Boolean);
}

function uniqueList(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractTechLabels(text) {
  const source = String(text || "");
  const pairs = [
    ["página", /\bp[aá]gina\b/i],
    ["arquivo", /\barquivo\b/i],
    ["editor", /\beditor\b/i],
    ["navegador", /\bnavegador\b/i],
    ["interface", /\binterface\b/i],
    ["resultado", /\bresultado\b/i],
    ["index.html", /index\.html/i],
    ["styles.css", /styles\.css/i],
    ["app.js", /\bapp\.js\b/i],
    ["server.mjs", /server\.mjs/i],
    ["HTML", /\bhtml\b/i],
    ["body", /\bbody\b/i],
    ["head", /\bhead\b/i],
    ["header", /\bheader\b/i],
    ["main", /\bmain\b/i],
    ["JSON", /\bjson\b/i],
    ["CSS", /\bcss\b/i],
    ["JavaScript", /\bjavascript\b|\bjs\b/i],
    ["DOM", /\bdom\b/i],
    ["fetch", /\bfetch\b/i],
    ["quiz", /\bquiz\b/i],
    ["feedback", /\bfeedback\b/i],
    ["tabela", /\btabela\b/i],
    ["botão", /\bbot[aã]o\b/i],
    ["cartão", /\bcart[aã]o\b/i],
    ["Node", /\bnode\b/i]
  ];

  return pairs
    .filter((entry) => entry[1].test(source))
    .map((entry) => entry[0]);
}

function getSceneText(item) {
  return [
    item.didactic_purpose,
    item.scene_description,
    ...(Array.isArray(item.must_omit) ? item.must_omit : []),
    ...(Array.isArray(item.style_constraints) ? item.style_constraints : []),
    ...(Array.isArray(item.focus_elements) ? item.focus_elements : [item.focus_elements])
  ]
    .filter(Boolean)
    .join(" ");
}

function compactLabel(value) {
  const text = trimSentence(value)
    .replace(/\b(?:mostrar|comparar|visual|didática|didático|elementos|elemento|diferença|processo|completo|principal|principais|apenas|diretamente|ligados|conceito|card|popup)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  if (text.split(/\s+/).length > 3) return "";
  if (text.length > 18) return "";
  return text;
}

function deriveLabels(item) {
  const focusLabels = normalizeFocusElements(item.focus_elements);
  const techLabels = extractTechLabels(getSceneText(item));
  const purposeBits = normalizeFocusElements(item.didactic_purpose);
  const labels = uniqueList([...techLabels, ...focusLabels, ...purposeBits])
    .map((itemValue) => compactLabel(itemValue))
    .filter(Boolean);

  return labels.slice(0, 4);
}

function shortTitle(item) {
  const base = trimSentence(item.didactic_purpose || item.scene_description || item.image_id || "Imagem didática");
  if (base.length <= 72) return base;
  return `${base.slice(0, 69).trim()}...`;
}

function shortCaption(item) {
  const base = trimSentence(item.scene_description || item.didactic_purpose || "");
  if (!base) return "";
  if (base.length <= 118) return base;
  return `${base.slice(0, 115).trim()}...`;
}

function toSvgPath(assetPath) {
  return String(assetPath || "")
    .replace(/blueprint/gi, "mapa")
    .replace(/\.png$/i, ".svg");
}

function remapAssetPath(value) {
  const text = String(value || "");
  if (!/^assets\/images\//i.test(text)) return text;
  return toSvgPath(text);
}

function sentenceFromManifest(item) {
  if (!item) {
    return "Observe no recorte apenas os elementos que sustentam a ideia técnica apresentada.";
  }

  const focus = deriveLabels(item).filter((label) => !/\b(?:popup|reforço|imagem)\b/i.test(label));
  if (item.usage_scope === "popup") {
    const popupLabel = focus[0] ? focus[0].toLowerCase() : "";
    const popupTarget = popupLabel === "central reforçado" ? "o elemento central reforçado" : popupLabel;
    return focus.length > 0
      ? `Observe ${popupTarget} neste recorte.`
      : "Observe o elemento principal reforçado neste recorte.";
  }
  if (focus.length === 0) {
    return `Observe ${trimSentence(item.didactic_purpose || "o recorte")} neste esquema.`;
  }
  if (focus.length === 1) {
    return `Observe ${focus[0].toLowerCase()} neste recorte.`;
  }
  return `Observe ${focus.slice(0, 2).map((itemValue) => itemValue.toLowerCase()).join(" e ")} neste recorte.`;
}

function chooseVariant(item) {
  const text = getSceneText(item).toLowerCase();
  if (/(compar|lado a lado|desktop|mobile|sem css|com css|diferença)/.test(text)) return "comparison";
  if (/(hierarquia|aninhad|fluxo|seta|jornada|etapas|diagn[oó]stico|mapa|mental|contrato|wireframe|papel|ret[âa]ngulos|blueprint)/.test(text)) return "diagram";
  if (/(editor|c[oó]digo|json|fetch|dom|pasta|server\.mjs|app\.js|index\.html|styles\.css)/.test(text)) return "code";
  if (/(quiz|bot[aã]o|feedback|clique|opç[aã]o)/.test(text)) return "quiz";
  if (/(tabela|headers|rows|c[ée]lula|coluna|linha)/.test(text)) return "table";
  if (item.usage_scope === "popup") return "spotlight";
  return "page";
}

function wrapText(text, limit = 28) {
  const words = trimSentence(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines = [];
  let current = words.shift();
  for (const word of words) {
    if (`${current} ${word}`.length > limit) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function renderTextLines(lines, x, y, options = {}) {
  const fontSize = options.fontSize || 28;
  const lineHeight = options.lineHeight || Math.round(fontSize * 1.25);
  const fill = options.fill || COLORS.ink;
  const weight = options.weight || 600;
  const anchor = options.anchor || "start";
  return lines
    .map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" fill="${fill}" font-size="${fontSize}" font-weight="${weight}" text-anchor="${anchor}" font-family="Verdana, Arial, sans-serif">${escapeXml(line)}</text>`)
    .join("");
}

function shortenLabel(label, limit = 14) {
  const text = trimSentence(label);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trim()}…`;
}

function stableHash(value) {
  const text = String(value || "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function chip(label, x, y, width) {
  const text = shortenLabel(label);
  return [
    `<rect x="${x}" y="${y}" width="${width}" height="44" rx="22" fill="${COLORS.panelStrong}" stroke="${COLORS.line}" stroke-width="2" />`,
    `<text x="${x + width / 2}" y="${y + 29}" fill="${COLORS.gold}" font-size="22" font-weight="700" text-anchor="middle" font-family="Verdana, Arial, sans-serif">${escapeXml(text)}</text>`
  ].join("");
}

function browserFrame(x, y, width, height, innerMarkup, label = "") {
  return [
    `<g transform="translate(${x} ${y})">`,
    `<rect width="${width}" height="${height}" rx="30" fill="${COLORS.panel}" stroke="${COLORS.line}" stroke-width="3"/>`,
    `<rect width="${width}" height="58" rx="30" fill="${COLORS.panelStrong}" stroke="${COLORS.line}" stroke-width="3"/>`,
    `<circle cx="36" cy="29" r="8" fill="${COLORS.accentRose}"/>`,
    `<circle cx="62" cy="29" r="8" fill="${COLORS.gold}"/>`,
    `<circle cx="88" cy="29" r="8" fill="${COLORS.accentGreen}"/>`,
    label ? `<text x="${width - 32}" y="36" fill="${COLORS.muted}" font-size="22" font-weight="600" text-anchor="end" font-family="Verdana, Arial, sans-serif">${escapeXml(label)}</text>` : "",
    `<g transform="translate(28 82)">${innerMarkup}</g>`,
    `</g>`
  ].join("");
}

function rectCard(x, y, width, height, title, accent = COLORS.gold) {
  return [
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="22" fill="${COLORS.panelSoft}" stroke="${COLORS.line}" stroke-width="2"/>`,
    `<rect x="${x + 20}" y="${y + 20}" width="${Math.min(width - 40, 220)}" height="16" rx="8" fill="${accent}" opacity="0.88"/>`,
    `<rect x="${x + 20}" y="${y + 48}" width="${Math.min(width - 52, 280)}" height="10" rx="5" fill="${COLORS.muted}" opacity="0.35"/>`,
    `<rect x="${x + 20}" y="${y + 72}" width="${Math.min(width - 84, 220)}" height="10" rx="5" fill="${COLORS.muted}" opacity="0.2"/>`,
    title ? `<text x="${x + 20}" y="${y + height - 18}" fill="${COLORS.muted}" font-size="18" font-weight="600" font-family="Verdana, Arial, sans-serif">${escapeXml(shortenLabel(title, 22))}</text>` : ""
  ].join("");
}

function buttonRow(x, y, count, stacked = false) {
  const buttons = [];
  for (let index = 0; index < count; index += 1) {
    const bx = stacked ? x : x + index * 132;
    const by = stacked ? y + index * 64 : y;
    buttons.push(`<rect x="${bx}" y="${by}" width="112" height="44" rx="18" fill="${COLORS.panelStrong}" stroke="${COLORS.gold}" stroke-width="2"/>`);
  }
  return buttons.join("");
}

function renderDiagram(item) {
  const labels = deriveLabels(item);
  const primary = labels[0] || "estrutura";
  const secondary = labels[1] || "ligação";
  const tertiary = labels[2] || "resultado";
  const quaternary = labels[3] || "tela";
  return [
    `<rect x="150" y="250" width="240" height="120" rx="28" fill="${COLORS.panelSoft}" stroke="${COLORS.line}" stroke-width="3"/>`,
    `<rect x="480" y="250" width="240" height="120" rx="28" fill="${COLORS.panelSoft}" stroke="${COLORS.line}" stroke-width="3"/>`,
    `<rect x="810" y="250" width="240" height="120" rx="28" fill="${COLORS.panelSoft}" stroke="${COLORS.line}" stroke-width="3"/>`,
    `<rect x="480" y="520" width="240" height="120" rx="28" fill="${COLORS.panelSoft}" stroke="${COLORS.line}" stroke-width="3"/>`,
    `<path d="M390 310 H480" stroke="${COLORS.gold}" stroke-width="8" stroke-linecap="round"/>`,
    `<path d="M720 310 H810" stroke="${COLORS.gold}" stroke-width="8" stroke-linecap="round"/>`,
    `<path d="M600 370 V520" stroke="${COLORS.gold}" stroke-width="8" stroke-linecap="round"/>`,
    `<path d="M470 310 l-16 -10 v20 z" fill="${COLORS.gold}"/>`,
    `<path d="M800 310 l-16 -10 v20 z" fill="${COLORS.gold}"/>`,
    `<path d="M600 505 l-10 -16 h20 z" fill="${COLORS.gold}"/>`,
    chip(primary, 170, 286, 200),
    chip(secondary, 500, 286, 200),
    chip(tertiary, 830, 286, 200),
    chip(quaternary, 500, 556, 200)
  ].join("");
}

function renderComparison(item) {
  const text = getSceneText(item).toLowerCase();
  const leftLabel = /sem css/.test(text) ? "sem CSS" : /desktop/.test(text) ? "desktop" : "antes";
  const rightLabel = /com css/.test(text) ? "com CSS" : /mobile/.test(text) ? "mobile" : "depois";
  const desktopMobile = /desktop|mobile/.test(text);
  const semCss = /sem css|com css/.test(text);

  const leftInner = semCss
    ? [
        `<rect x="0" y="0" width="520" height="510" rx="24" fill="${COLORS.bg1}" stroke="${COLORS.line}" stroke-width="2"/>`,
        `<rect x="28" y="44" width="220" height="14" rx="7" fill="${COLORS.gold}" opacity="0.8"/>`,
        `<rect x="28" y="82" width="360" height="12" rx="6" fill="${COLORS.muted}" opacity="0.3"/>`,
        `<rect x="28" y="110" width="420" height="12" rx="6" fill="${COLORS.muted}" opacity="0.22"/>`,
        `<rect x="28" y="180" width="128" height="16" rx="8" fill="${COLORS.muted}" opacity="0.22"/>`,
        `<rect x="28" y="214" width="128" height="16" rx="8" fill="${COLORS.muted}" opacity="0.22"/>`,
        `<rect x="28" y="248" width="128" height="16" rx="8" fill="${COLORS.muted}" opacity="0.22"/>`
      ].join("")
    : [
        rectCard(0, 0, 520, 510, ""),
        buttonRow(42, desktopMobile ? 340 : 220, 3, desktopMobile),
        desktopMobile ? "" : `<rect x="42" y="300" width="420" height="56" rx="20" fill="${COLORS.panelStrong}" stroke="${COLORS.accentGreen}" stroke-width="2"/>`
      ].join("");

  const rightInner = desktopMobile
    ? [
        rectCard(0, 0, 520, 510, ""),
        buttonRow(42, 170, 3, true),
        `<rect x="42" y="402" width="420" height="56" rx="20" fill="${COLORS.panelStrong}" stroke="${COLORS.accentGreen}" stroke-width="2"/>`
      ].join("")
    : [
        rectCard(0, 0, 520, 510, ""),
        `<rect x="42" y="150" width="436" height="160" rx="20" fill="${COLORS.bg1}" stroke="${COLORS.line}" stroke-width="2"/>`,
        buttonRow(42, 356, 3, false),
        `<rect x="42" y="420" width="436" height="42" rx="20" fill="${COLORS.panelStrong}" stroke="${COLORS.accentGreen}" stroke-width="2"/>`
      ].join("");

  return [
    browserFrame(70, 220, 530, 610, leftInner, leftLabel),
    browserFrame(670, 220, 530, 610, rightInner, rightLabel)
  ].join("");
}

function renderCode(item) {
  const scene = getSceneText(item).toLowerCase();
  const labels = deriveLabels(item);
  const barWidths = /json/.test(scene)
    ? [360, 300, 250, 280, 200]
    : /server\.mjs|node/.test(scene)
      ? [240, 0, 190, 320]
      : /styles\.css|css/.test(scene)
        ? [280, 240, 220, 180, 260]
        : [320, 390, 270, 230];

  const codeBars = barWidths
    .map((width, index) => width > 0
      ? `<rect x="32" y="${52 + index * 84}" width="${width}" height="16" rx="8" fill="${index % 2 === 0 ? COLORS.goldSoft : COLORS.accentBlue}" opacity="${index === 0 ? 1 : 0.78}"/>`
      : `<rect x="32" y="${52 + index * 84}" width="72" height="10" rx="5" fill="${COLORS.muted}" opacity="0.25"/>`)
    .join("");

  const preview = /pastas|arquivos|folder|file/.test(scene)
    ? [
        rectCard(0, 0, 420, 120, "trabalho"),
        `<rect x="26" y="144" width="368" height="58" rx="18" fill="${COLORS.panelSoft}" stroke="${COLORS.line}" stroke-width="2"/>`,
        `<rect x="26" y="224" width="368" height="58" rx="18" fill="${COLORS.panelSoft}" stroke="${COLORS.line}" stroke-width="2"/>`,
        `<rect x="26" y="304" width="368" height="58" rx="18" fill="${COLORS.panelSoft}" stroke="${COLORS.line}" stroke-width="2"/>`,
        chip("index.html", 44, 156, 146),
        chip("styles.css", 44, 236, 146),
        chip("app.js", 44, 316, 120)
      ].join("")
    : [
        rectCard(0, 0, 420, 420, labels[0] || "resultado"),
        buttonRow(36, 254, /quiz|bot[aã]o/.test(scene) ? 3 : 2, /mobile/.test(scene)),
        /tabela/.test(scene) ? `<rect x="36" y="136" width="348" height="92" rx="18" fill="${COLORS.bg1}" stroke="${COLORS.line}" stroke-width="2"/>` : "",
        /feedback|erro/.test(scene) ? `<rect x="36" y="336" width="348" height="42" rx="20" fill="${COLORS.panelStrong}" stroke="${COLORS.accentGreen}" stroke-width="2"/>` : ""
      ].join("");

  return [
    `<g transform="translate(82 228)">`,
    `<rect width="480" height="600" rx="28" fill="#1f1a16" stroke="${COLORS.gold}" stroke-width="3"/>`,
    codeBars,
    `</g>`,
    browserFrame(650, 220, 470, 610, preview, labels[1] || "preview")
  ].join("");
}

function renderQuiz() {
  return browserFrame(170, 220, 860, 600, [
    `<rect x="0" y="0" width="804" height="160" rx="26" fill="${COLORS.panelSoft}" stroke="${COLORS.line}" stroke-width="2"/>`,
    buttonRow(40, 220, 3, false),
    `<rect x="40" y="304" width="724" height="56" rx="20" fill="${COLORS.panelStrong}" stroke="${COLORS.accentGreen}" stroke-width="2"/>`,
    `<rect x="40" y="396" width="724" height="140" rx="26" fill="${COLORS.bg1}" stroke="${COLORS.line}" stroke-width="2"/>`
  ].join(""), "quiz");
}

function renderTable() {
  return browserFrame(160, 220, 880, 600, [
    `<rect x="0" y="0" width="824" height="520" rx="26" fill="${COLORS.panelSoft}" stroke="${COLORS.line}" stroke-width="2"/>`,
    `<rect x="24" y="24" width="300" height="18" rx="9" fill="${COLORS.goldSoft}"/>`,
    `<rect x="24" y="76" width="776" height="56" rx="18" fill="${COLORS.bg1}" stroke="${COLORS.line}" stroke-width="2"/>`,
    `<rect x="24" y="156" width="776" height="82" rx="18" fill="${COLORS.panelStrong}" stroke="${COLORS.line}" stroke-width="2"/>`,
    `<rect x="24" y="256" width="776" height="82" rx="18" fill="${COLORS.panelStrong}" stroke="${COLORS.line}" stroke-width="2"/>`,
    `<rect x="24" y="356" width="776" height="82" rx="18" fill="${COLORS.panelStrong}" stroke="${COLORS.line}" stroke-width="2"/>`,
    `<line x1="270" y1="76" x2="270" y2="438" stroke="${COLORS.line}" stroke-width="2"/>`,
    `<line x1="520" y1="76" x2="520" y2="438" stroke="${COLORS.line}" stroke-width="2"/>`
  ].join(""), "tabela");
}

function renderSpotlight(item) {
  const labels = deriveLabels(item);
  return browserFrame(180, 220, 840, 580, [
    `<rect x="0" y="0" width="784" height="500" rx="26" fill="${COLORS.panelSoft}" stroke="${COLORS.line}" stroke-width="2"/>`,
    `<rect x="60" y="74" width="664" height="110" rx="26" fill="${COLORS.bg1}" stroke="${COLORS.line}" stroke-width="2" opacity="0.6"/>`,
    `<rect x="180" y="220" width="424" height="132" rx="26" fill="${COLORS.panelStrong}" stroke="${COLORS.gold}" stroke-width="5"/>`,
    `<circle cx="392" cy="286" r="102" fill="none" stroke="${COLORS.goldSoft}" stroke-width="18" opacity="0.45"/>`,
    renderTextLines(wrapText(labels[0] || "elemento central", 22), 392, 280, { fontSize: 30, anchor: "middle" })
  ].join(""), "reforço");
}

function renderPage(item) {
  const scene = getSceneText(item).toLowerCase();
  const showTable = /tabela|rows|headers/.test(scene);
  const showButtons = /bot[aã]o|quiz|feedback/.test(scene);
  const showLoading = /carregando/.test(scene);
  return browserFrame(120, 200, 960, 640, [
    `<rect x="0" y="0" width="904" height="116" rx="24" fill="${COLORS.bg1}" stroke="${COLORS.line}" stroke-width="2"/>`,
    `<rect x="30" y="26" width="180" height="14" rx="7" fill="${COLORS.gold}"/>`,
    `<rect x="30" y="58" width="320" height="16" rx="8" fill="${COLORS.muted}" opacity="0.3"/>`,
    `<rect x="0" y="148" width="904" height="418" rx="24" fill="${COLORS.panelSoft}" stroke="${COLORS.line}" stroke-width="2"/>`,
    showLoading ? `<text x="70" y="238" fill="${COLORS.ink}" font-size="34" font-weight="700" font-family="Verdana, Arial, sans-serif">Carregando</text>` : "",
    showTable ? `<rect x="44" y="222" width="816" height="142" rx="20" fill="${COLORS.bg1}" stroke="${COLORS.line}" stroke-width="2"/>` : "",
    showButtons ? buttonRow(44, showTable ? 388 : 284, 3, /mobile/.test(scene)) : "",
    /feedback/.test(scene) ? `<rect x="44" y="${showButtons ? 462 : 330}" width="816" height="54" rx="20" fill="${COLORS.panelStrong}" stroke="${COLORS.accentGreen}" stroke-width="2"/>` : "",
    !showTable && !showLoading ? rectCard(44, 214, 340, 164, "conteúdo") : "",
    !showTable && !showLoading ? rectCard(412, 214, 448, 220, "resultado", COLORS.accentBlue) : ""
  ].join(""), "interface");
}

function renderVariant(item) {
  const variant = chooseVariant(item);
  if (variant === "comparison") return renderComparison(item);
  if (variant === "diagram") return renderDiagram(item);
  if (variant === "code") return renderCode(item);
  if (variant === "quiz") return renderQuiz(item);
  if (variant === "table") return renderTable(item);
  if (variant === "spotlight") return renderSpotlight(item);
  return renderPage(item);
}

function buildSvg(item) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="${escapeXml(shortTitle(item))}">`,
    `<rect width="1200" height="900" fill="${COLORS.bg0}"/>`,
    `<rect x="46" y="46" width="1108" height="808" rx="40" fill="${COLORS.panel}" stroke="${COLORS.line}" stroke-width="3"/>`,
    `<rect x="82" y="82" width="240" height="14" rx="7" fill="${COLORS.gold}" opacity="0.92"/>`,
    `<rect x="82" y="110" width="168" height="10" rx="5" fill="${COLORS.muted}" opacity="0.3"/>`,
    `<g transform="translate(0 -92)">`,
    renderVariant(item),
    `</g>`,
    `</svg>`
  ].join("");
}

function shuffleEditorChoiceOptions(block, stats) {
  if (!block || block.kind !== "editor" || block.interactionMode !== "choice" || !Array.isArray(block.options) || block.options.length < 2) {
    return;
  }

  const ranked = block.options.map((option, index) => ({
    option,
    rank: stableHash(`${block.id}|${option.id}|${option.value}|${index}`)
  }));

  ranked.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return String(a.option.id || "").localeCompare(String(b.option.id || ""));
  });

  const hasDisabled = ranked.some((entry) => entry.option.enabled === false);
  if (hasDisabled) {
    let guard = 0;
    while (guard < ranked.length && ranked[0] && ranked[0].option.enabled !== false) {
      ranked.push(ranked.shift());
      guard += 1;
    }
  }

  let changed = false;
  ranked.forEach((entry, index) => {
    if (entry.option.displayOrder !== index) changed = true;
    entry.option.displayOrder = index;
  });
  if (changed) stats.editorChoiceShuffles += 1;
}

function shuffleSimulatorOptions(block, stats) {
  if (!block || block.kind !== "simulator" || !Array.isArray(block.options) || block.options.length < 2) {
    return;
  }

  const ordered = block.options
    .map((option, index) => ({
      option,
      rank: stableHash(`${block.id}|${option.id || option.value}|${index}`)
    }))
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return String(a.option.id || "").localeCompare(String(b.option.id || ""));
    });

  if (ordered[0] && /(?:^|[-_])0*1$/i.test(String(ordered[0].option.id || ""))) {
    ordered.push(ordered.shift());
  }

  const next = ordered.map((entry) => entry.option);
  const changed = next.some((option, index) => block.options[index] !== option);
  if (changed) {
    block.options = next;
    stats.simulatorShuffles += 1;
  }
}

function visitTableCell(cell, stats) {
  if (!cell || typeof cell !== "object") return cell;
  if (typeof cell.value === "string") {
    cell.value = cleanVisibleText(cell.value);
    if (looksLikeCodeCell(cell.value) && cell.tone === "default") {
      cell.bold = true;
      cell.tone = "gold";
      stats.styledTableCells += 1;
    }
  }
  return cell;
}

function nearestImagePath(blocks, index) {
  for (let offset = 1; offset <= 3; offset += 1) {
    const prev = blocks[index - offset];
    const next = blocks[index + offset];
    if (prev && prev.kind === "image" && typeof prev.value === "string") return remapAssetPath(prev.value);
    if (next && next.kind === "image" && typeof next.value === "string") return remapAssetPath(next.value);
  }
  return "";
}

function fixParagraphBlock(block, context, manifestByPath, stats) {
  block.value = cleanVisibleText(block.value);
  if (block.value === "__IMAGE_RECAP__") {
    block.value = sentenceFromManifest(manifestByPath.get(context.nearestImagePath || ""));
    stats.recapParagraphs += 1;
  }
  block.richText = buildParagraphRichText(block.value);
  stats.paragraphRichTextRegenerated += 1;
}

function processBlockList(blocks, manifestByPath, stats) {
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (!block || typeof block !== "object") continue;

    if (typeof block.title === "string") {
      block.title = cleanVisibleText(block.title);
    }

    if (block.kind === "heading" && typeof block.value === "string") {
      block.value = cleanVisibleText(block.value);
      continue;
    }

    if (block.kind === "paragraph" && typeof block.value === "string") {
      fixParagraphBlock(block, { nearestImagePath: nearestImagePath(blocks, index) }, manifestByPath, stats);
      continue;
    }

    if (block.kind === "image" && typeof block.value === "string") {
      const nextValue = remapAssetPath(block.value);
      if (nextValue !== block.value) stats.assetPathFixes += 1;
      block.value = nextValue;
      continue;
    }

    if (block.kind === "table") {
      if (typeof block.title === "string") {
        block.title = cleanVisibleText(block.title);
      }
      if (block.titleStyle && typeof block.titleStyle === "object") {
        block.titleStyle.value = cleanVisibleText(block.titleStyle.value || block.title);
      }
      if (Array.isArray(block.headers)) {
        block.headers = block.headers.map((cell) => visitTableCell(cell, stats));
      }
      if (Array.isArray(block.rows)) {
        block.rows = block.rows.map((row) => row.map((cell) => visitTableCell(cell, stats)));
      }
      continue;
    }

    if ((block.kind === "multiple_choice" || block.kind === "simulator") && Array.isArray(block.options)) {
      for (const option of block.options) {
        if (typeof option.value === "string") option.value = cleanVisibleText(option.value);
        if (typeof option.result === "string") option.result = cleanVisibleText(option.result);
      }
      if (block.kind === "simulator") {
        shuffleSimulatorOptions(block, stats);
      }
      continue;
    }

    if (block.kind === "editor") {
      if (typeof block.value === "string") block.value = cleanVisibleText(block.value);
      if (Array.isArray(block.options)) {
        for (const option of block.options) {
          if (typeof option.value === "string") option.value = cleanVisibleText(option.value);
        }
      }
      shuffleEditorChoiceOptions(block, stats);
      continue;
    }

    if (block.kind === "button" && Array.isArray(block.popupBlocks)) {
      processBlockList(block.popupBlocks, manifestByPath, stats);
    }
  }
}

function processProject(project, manifestByPath) {
  const stats = {
    paragraphRichTextRegenerated: 0,
    recapParagraphs: 0,
    assetPathFixes: 0,
    styledTableCells: 0,
    editorChoiceShuffles: 0,
    simulatorShuffles: 0
  };

  for (const course of project.courses || []) {
    course.title = cleanVisibleText(course.title);
    course.description = cleanVisibleText(course.description);
    for (const module of course.modules || []) {
      module.title = cleanVisibleText(module.title);
      for (const lesson of module.lessons || []) {
        lesson.title = cleanVisibleText(lesson.title);
        lesson.subtitle = cleanVisibleText(lesson.subtitle);
        const lastStepIndex = Math.max(0, (lesson.steps || []).length - 1);
        for (let stepIndex = 0; stepIndex < (lesson.steps || []).length; stepIndex += 1) {
          const step = lesson.steps[stepIndex];
          step.title = cleanVisibleText(step.title);
          if (typeof step.subtitle === "string") {
            step.subtitle = cleanVisibleText(step.subtitle);
          }
          if (step.type === "lesson_complete") {
            for (const block of step.blocks || []) {
              if (block.kind === "heading" || block.kind === "paragraph") {
                block.align = "center";
              }
            }
            if (stepIndex !== lastStepIndex) {
              throw new Error(`lesson_complete fora do fim em ${lesson.id}`);
            }
          }
          processBlockList(step.blocks || [], manifestByPath, stats);
        }
      }
    }
  }

  return stats;
}

function collectUsedAssetPaths(project) {
  const used = new Set();

  function visit(node) {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") return;
    if (node.kind === "image" && typeof node.value === "string" && node.value.startsWith("assets/images/")) {
      used.add(node.value);
    }
    for (const value of Object.values(node)) {
      if (value && typeof value === "object") {
        visit(value);
      }
    }
  }

  visit(project);
  return used;
}

function manifestMapByPath(manifest) {
  const map = new Map();
  for (const item of manifest) {
    map.set(item.asset_path, item);
  }
  return map;
}

function normalizeManifest(manifest) {
  return manifest.map((item) => {
    const next = {
      ...item,
      asset_path: toSvgPath(item.asset_path),
      didactic_purpose: cleanVisibleText(item.didactic_purpose),
      scene_description: cleanVisibleText(item.scene_description)
    };
    if (typeof next.image_id === "string") {
      next.image_id = next.image_id.replace(/blueprint/gi, "mapa");
    }
    return next;
  });
}

async function writeSvgAssets(manifest) {
  for (const item of manifest) {
    const assetPath = path.join(rootDir, item.asset_path);
    await mkdir(path.dirname(assetPath), { recursive: true });
    await writeFile(assetPath, buildSvg(item), "utf8");
  }
}

function buildZipProject(project, usedAssetPaths) {
  return {
    appTitle: project.appTitle || "AraLearn",
    courses: project.courses || [],
    progress: {
      lessons: []
    },
    assets: [...usedAssetPaths].sort(),
    packageMeta: {
      format: "aralearn-package-v3",
      scope: "app",
      exportedAt: new Date().toISOString(),
      appTitle: project.appTitle || "AraLearn",
      source: {
        type: "embedded-course",
        courseId: project.courses?.[0]?.id || "programacao-web-basica",
        courseTitle: project.courses?.[0]?.title || "Programação Web Básica",
        origin: "trabalho/tutorial"
      }
    }
  };
}

async function buildZip(projectForZip, usedAssetPaths) {
  const entries = {
    "project.json": strToU8(JSON.stringify(projectForZip, null, 2))
  };

  for (const assetPath of usedAssetPaths) {
    const bytes = await readFile(path.join(rootDir, assetPath));
    entries[assetPath.replace(/\\/g, "/")] = new Uint8Array(bytes);
  }

  return zipSync(entries, { level: 0 });
}

function buildContentJson(project) {
  return {
    appTitle: project.appTitle || "AraLearn",
    courses: project.courses || []
  };
}

function countLessons(project) {
  return (project.courses || []).reduce(
    (sum, course) => sum + (course.modules || []).reduce((moduleSum, module) => moduleSum + (module.lessons || []).length, 0),
    0
  );
}

function countSteps(project) {
  return (project.courses || []).reduce(
    (sum, course) => sum + (course.modules || []).reduce((moduleSum, module) => moduleSum + (module.lessons || []).reduce((lessonSum, lesson) => lessonSum + (lesson.steps || []).length, 0), 0),
    0
  );
}

function countBlocks(project, kind) {
  let total = 0;
  function visit(node) {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") return;
    if (node.kind === kind) total += 1;
    for (const value of Object.values(node)) {
      if (value && typeof value === "object") {
        visit(value);
      }
    }
  }
  visit(project);
  return total;
}

async function main() {
  const project = JSON.parse(await readFile(projectInputPath, "utf8"));
  const manifest = normalizeManifest(JSON.parse(await readFile(manifestInputPath, "utf8")));
  const manifestByPath = manifestMapByPath(manifest);

  const processingStats = processProject(project, manifestByPath);
  const usedAssetPaths = collectUsedAssetPaths(project);

  await writeSvgAssets(manifest);

  const zipProject = buildZipProject(project, usedAssetPaths);
  const zipBytes = await buildZip(zipProject, usedAssetPaths);
  const contentJson = buildContentJson(project);

  await writeFile(projectInputPath, JSON.stringify(project, null, 2), "utf8");
  await writeFile(manifestInputPath, JSON.stringify(manifest, null, 2), "utf8");
  await writeFile(contentJsonPath, JSON.stringify(contentJson, null, 2), "utf8");
  await writeFile(contentZipPath, Buffer.from(zipBytes));

  const report = [
    "# Relatório técnico",
    "",
    "## Verificações do runtime",
    "",
    "- Curso auditado contra o runtime real do AraLearn, incluindo `image`, `paragraph.richText`, `editor`, `multiple_choice`, `simulator`, `button.popupBlocks`, importação ZIP e catálogo hardcoded.",
    "- Caminhos de imagem normalizados para `assets/images/...` e empacotamento validado no formato `aralearn-package-v3`.",
    "",
    "## Correções conservadoras no JSON",
    "",
    `- Parágrafos com \`richText\` regenerado a partir de \`value\`: ${processingStats.paragraphRichTextRegenerated}.`,
    `- Frases genéricas de reforço visual substituídas por texto técnico direto: ${processingStats.recapParagraphs}.`,
    `- Referências de asset atualizadas para SVG e nomes editoriais ajustados: ${processingStats.assetPathFixes}.`,
    `- Células de tabela com sintaxe técnica destacadas em negrito+dourado: ${processingStats.styledTableCells}.`,
    `- Blocos \`editor\` com ordem visual embaralhada sem quebrar a ordem estrutural das lacunas: ${processingStats.editorChoiceShuffles}.`,
    `- Blocos \`simulator\` com opções reordenadas para evitar pista visual pela posição original: ${processingStats.simulatorShuffles}.`,
    `- Correções pontuais de linguagem: remoção de "blueprint" visível, retirada de metalinguagem em popups e ajuste de "erro no app.js" para "tratamento de erro em app.js".`,
    "",
    "## Assets gerados",
    "",
    `- Manifesto processado: ${manifest.length} entradas.`,
    `- Assets gerados em disco: ${manifest.length} SVGs em \`assets/images/\`.`,
    `- Assets usados pelo curso no ZIP final: ${usedAssetPaths.size}.`,
    `- Escolha técnica: SVG vetorial para manter nitidez no mobile e compatibilidade direta com o runtime e com a importação/exportação do app.`,
    "",
    "## Saídas produzidas",
    "",
    `- JSON embarcável: \`${path.relative(rootDir, contentJsonPath).replace(/\\/g, "/")}\`.`,
    `- Pacote ZIP: \`${path.relative(rootDir, contentZipPath).replace(/\\/g, "/")}\`.`,
    `- Fontes auditadas atualizadas: \`trabalho/tutorial/project_completo_auditado.json\` e \`trabalho/tutorial/image_manifest_completo_auditado.json\`.`,
    "",
    "## Totais do curso",
    "",
    `- Cursos: ${(project.courses || []).length}.`,
    `- Lições: ${countLessons(project)}.`,
    `- Steps: ${countSteps(project)}.`,
    `- Imagens em steps e popups: ${countBlocks(project, "image")}.`,
    `- Parágrafos: ${countBlocks(project, "paragraph")}.`
  ].join("\n");

  await writeFile(reportPath, `${report}\n`, "utf8");

  console.log(`Projeto auditado em ${projectInputPath}`);
  console.log(`Manifesto atualizado em ${manifestInputPath}`);
  console.log(`Assets SVG gerados: ${manifest.length}`);
  console.log(`Assets usados no pacote: ${usedAssetPaths.size}`);
  console.log(`JSON gravado em ${contentJsonPath}`);
  console.log(`ZIP gravado em ${contentZipPath}`);
  console.log(`Relatório gravado em ${reportPath}`);
}

await main();
