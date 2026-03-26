# AraLearn Lesson JSON Spec

## 1. Objetivo

Este documento descreve o contrato recomendado para estruturar lições em JSON no AraLearn.

Ele cobre:

- a estrutura canônica de `lesson -> steps -> blocks`;
- o que cada bloco gera no runtime;
- quais blocos travam ou não o avanço da lição;
- regras práticas para montar JSON estável, importável e fácil de validar;
- convenções didáticas e de ênfase que a autoria deve seguir.

Escopo principal:

- este documento foca no objeto `lesson` e nos blocos;
- empacotamento `.zip`, assets binários e escopo de importação podem ser tratados depois;
- progresso do estudante não faz parte da lição serializada.
- em pipelines maiores, vale primeiro planejar `course -> module -> lesson` a partir das fontes e só depois detalhar cada `lesson` em JSON;
- mesmo nesses casos, o contrato final de cada card continua sendo este documento.

---

## 2. Modelo mental

No AraLearn, uma lição é uma sequência de cards.

- cada `step` gera exatamente um card;
- o corpo visual do card vem de `blocks[]`;
- o bloco `button` não aparece dentro do corpo do card;
- o `button` controla o CTA fixo no rodapé da tela e, opcionalmente, um popup inline;
- o progresso é salvo por `step`, não por bloco.

Consequência importante para a autoria:

- pense em "um conceito por card";
- a explicação principal fica nos blocos do `step`;
- a ação de continuar sempre depende do bloco final `button`.

---

## 3. Alvo recomendado

O melhor alvo de autoria é um único objeto `lesson`.

Exemplo de envelope mínimo:

```json
{
  "id": "excel-somase",
  "title": "SOMASE",
  "subtitle": "Filtro simples com critério único.",
  "steps": []
}
```

Se for necessário alimentar o app como conteúdo completo, esse `lesson` entra dentro de:

```json
{
  "appTitle": "AraLearn",
  "courses": [
    {
      "id": "excel",
      "title": "Excel",
      "description": "Curso de planilhas.",
      "modules": [
        {
          "id": "formulas-basicas",
          "title": "Fórmulas básicas",
          "lessons": [
            {
              "id": "excel-somase",
              "title": "SOMASE",
              "subtitle": "Filtro simples com critério único.",
              "steps": []
            }
          ]
        }
      ]
    }
  ]
}
```

Recomendação prática:

- gere `lesson` primeiro;
- faça o encaixe em `course/module/app` numa camada posterior.

---

## 4. Estrutura canônica da lição

### 4.1 Lesson

```json
{
  "id": "lesson-id",
  "title": "Título da lição",
  "subtitle": "Subtítulo opcional da lição",
  "steps": []
}
```

Campos:

- `id`: identificador estável;
- `title`: nome da lição;
- `subtitle`: apoio curto opcional;
- `steps[]`: sequência de cards.

### 4.2 Step

```json
{
  "id": "step-id",
  "type": "content",
  "title": "Título técnico do step",
  "blocks": []
}
```

Campos:

- `id`: identificador do card;
- `type`: `content` ou `lesson_complete`;
- `title`: metadado do step;
- `blocks[]`: blocos que compõem o card.

Regras:

- cada `step` deve terminar com exatamente um bloco `button`;
- `popupBlocks` pertencem ao `button`, nunca ao `step`;
- o primeiro `heading` preenchido tende a virar o `title` efetivo do step após normalização;
- no tipo `lesson_complete`, o card final mostra marca de conclusão e o CTA volta ao menu do curso ao continuar.

### 4.3 Blocos suportados

```text
heading
paragraph
image
table
simulator
editor
multiple_choice
flowchart
button
```

Resumo rápido:

| kind | Gera no runtime | Trava avanço? |
| --- | --- | --- |
| `heading` | título do card | não |
| `paragraph` | texto rico | não |
| `image` | imagem | não |
| `table` | tabela responsiva | não |
| `simulator` | seletor de opção + saída | não |
| `editor` | terminal estático ou exercício de lacunas | sim, se houver lacunas |
| `multiple_choice` | lista de alternativas com feedback | sim |
| `flowchart` | exercício de fluxograma | sim, se houver lacunas |
| `button` | CTA fixo do rodapé e popup opcional | controla o avanço |

---

## 5. Catálogo dos blocos

## 5.1 Heading

Contrato:

```json
{
  "id": "block-heading",
  "kind": "heading",
  "value": "Título do card",
  "align": "left"
}
```

Regras:

- `align` aceita `left`, `center` ou `right`;
- no card vira um `<h2>`;
- no popup vira um `<h3>`;
- o primeiro `heading` não vazio normalmente define o `title` do step.

## 5.2 Paragraph

Contrato recomendado:

```json
{
  "id": "block-paragraph",
  "kind": "paragraph",
  "value": "Texto principal do card.",
  "richText": "Texto principal do card.",
  "align": "left"
}
```

Regras:

- `value` é a versão textual canônica;
- `richText` é opcional, mas quando existir deve equivaler semanticamente a `value`;
- se `value` vier vazio e `richText` estiver semanticamente claro, o runtime pode derivar `value` a partir dele;
- se `value` e `richText` divergirem, o motor tende a confiar em `value` e regenerar a projeção rica equivalente;
- o runtime aceita apenas HTML inline seguro.

Markup inline permitido:

- `<strong>`
- `<em>`
- `<br>`
- `<span class="inline-tone-gold">`
- `<span class="inline-tone-mint">`
- `<span class="inline-tone-coral">`
- `<span class="inline-tone-blue">`
- `<span class="inline-tone-red">`

Recomendação de autoria:

- use só `value` quando não precisar de ênfase;
- use `richText` apenas quando a ênfase fizer diferença didática;
- mantenha `value` e `richText` coerentes.
- quando o parágrafo mencionar sintaxe inline, comandos, nomes de arquivo, tags, seletores, atributos, propriedades ou métodos, prefira destacar esse trecho com `<strong><span class="inline-tone-gold">...</span></strong>`;
- o texto corrido deve continuar em português brasileiro natural, mas os fragmentos de linguagem precisam ficar visualmente distinguíveis para o estudante bater o olho e reconhecer a sintaxe.

## 5.3 Image

Contrato:

```json
{
  "id": "block-image",
  "kind": "image",
  "value": "assets/images/excel-somase-exemplo.png"
}
```

Regras:

- `value` é o caminho lógico da imagem;
- para portabilidade, prefira `assets/images/...`;
- o runtime renderiza a imagem diretamente.

## 5.4 Table

Contrato canônico:

```json
{
  "id": "block-table",
  "kind": "table",
  "title": "Exemplo de entradas",
  "titleStyle": {
    "value": "",
    "bold": true,
    "italic": false,
    "tone": "default",
    "align": "left"
  },
  "headers": [
    {
      "value": "Critério",
      "bold": true,
      "italic": false,
      "tone": "default",
      "align": "left"
    },
    {
      "value": "Resultado",
      "bold": true,
      "italic": false,
      "tone": "default",
      "align": "left"
    }
  ],
  "rows": [
    [
      {
        "value": "Região = Sul",
        "bold": false,
        "italic": false,
        "tone": "default",
        "align": "left"
      },
      {
        "value": "Soma apenas linhas do Sul",
        "bold": false,
        "italic": false,
        "tone": "default",
        "align": "left"
      }
    ]
  ]
}
```

Formato de célula:

```json
{
  "value": "Texto",
  "bold": false,
  "italic": false,
  "tone": "default",
  "align": "left"
}
```

Valores aceitos:

- `tone`: `default`, `gold`, `mint`, `coral`
- `align`: `left`, `center`, `right`

Regras:

- o runtime sempre garante ao menos uma coluna e uma linha;
- o título da tabela é opcional;
- a tabela serve para consulta, não para validação de resposta.

## 5.5 Editor

Contrato:

```json
{
  "id": "block-editor",
  "kind": "editor",
  "value": "<span class=\"inline-tone-gold\">SOMASE</span>([[B2:B20]];[[\"Sul\"]];[[C2:C20]])",
  "interactionMode": "choice",
  "options": [
    {
      "id": "opt-1",
      "value": "B2:B20",
      "enabled": true,
      "displayOrder": 0,
      "slotOrder": 0
    },
    {
      "id": "opt-2",
      "value": "\"Sul\"",
      "enabled": true,
      "displayOrder": 1,
      "slotOrder": 1
    },
    {
      "id": "opt-3",
      "value": "C2:C20",
      "enabled": true,
      "displayOrder": 2,
      "slotOrder": 2
    },
    {
      "id": "opt-4",
      "value": "\"Norte\"",
      "enabled": false,
      "displayOrder": 3,
      "slotOrder": 3
    }
  ]
}
```

Modelo mental:

- `value` é um template de terminal;
- cada marcador `[[...]]` define uma lacuna e sua resposta canônica;
- se não houver `[[...]]`, o bloco vira apenas um terminal estático.

Campos principais:

- `interactionMode`: `choice` ou `input`;
- `options[]`: pool de respostas e, no modo `input`, regras de validação por lacuna.

Semântica de `options[]`:

- `enabled: true`: opção ligada a uma lacuna real;
- `enabled: false`: distrator em `choice` ou entrada ignorada em `input`;
- `displayOrder`: ordem visual das opções para o estudante;
- `slotOrder`: ordem estrutural das lacunas corretas dentro do template;
- no modo `input`, cada opção também pode ter:
  - `regex: true|false`
  - `variants[]`

Contrato estendido para `input`:

```json
{
  "id": "opt-1",
  "value": "B2:B20",
  "enabled": true,
  "displayOrder": 0,
  "slotOrder": 0,
  "regex": false,
  "variants": [
    {
      "id": "variant-1",
      "value": "B2:B$20",
      "regex": false
    }
  ]
}
```

Regras importantes:

- entre as opções `enabled: true`, o mapeamento das lacunas é definido por `slotOrder`;
- `displayOrder` não deve ser tratado como ordem canônica do código; ele só controla o embaralhamento visual das fichas;
- `slotOrder` é o campo que preserva a ordem estrutural correta quando o card usa fichas embaralhadas;
- `value` é o template bruto canônico do bloco e usa `\n` como quebra persistida;
- linhas vazias intermediárias e espaços iniciais de cada linha fazem parte do contrato do template e não podem ser colapsados na autoria, no preview, no runtime nem no pacote ZIP/JSON;
- fora das lacunas `[[...]]`, o preview autoral e o runtime devem usar a mesma renderização literal: tags HTML fora do conjunto inline aprovado aparecem como código visível;
- em `choice`, todas as opções visíveis podem aparecer como fichas;
- em `choice`, o runtime trata `options[]` como multiconjunto: valores repetidos continuam existindo como fichas repetidas, em vez de serem colapsados;
- em `choice`, o estudante pode tocar numa lacuna vazia para mirar explicitamente a próxima ficha naquela posição;
- se nenhuma lacuna estiver selecionada, o runtime tenta encaixar a ficha numa lacuna vazia compatível com aquele valor; se houver repetição do mesmo valor, ele usa a primeira ocorrência ainda vazia;
- em `input`, a validação não tenta descobrir equivalência semântica sozinha;
- se você quiser aceitar variantes equivalentes de código ou fórmula, declare isso explicitamente em `variants[]` ou `regex`;
- `options[].value` e `variants[].value` não devem sofrer `trim` destrutivo quando esse whitespace fizer parte da resposta declarada;
- o motor normaliza espaços simples em modo `input`, mas não inventa sinônimos.
- em exercícios de expressão, `options[].value` deve guardar a forma canônica que o estudante deve digitar; o resultado calculado pertence ao popup ou a um card posterior, não à lacuna;
- se o foco do card não for espaçamento, inclua variantes sem espaços como `1312+576` além de `1312 + 576`;
- se a operação for comutativa e a ordem dos operandos não fizer parte do objetivo didático, declare também variantes permutadas, como `29 * 4` para a canônica `4 * 29`;
- não declare variantes permutadas em operações não comutativas, como subtração e divisão, nem quando a ordem fizer parte da convenção ensinada;
- quando a equivalência for ampla demais para enumerar com segurança, prefira `regex` apenas se a regra puder ser explicada e auditada claramente.

## 5.6 Simulator

Contrato:

```json
{
  "id": "block-simulator",
  "kind": "simulator",
  "value": "<span class=\"inline-tone-gold\">SE</span>(A2>100;[[]];\"Rever\")",
  "options": [
    {
      "id": "sim-1",
      "value": "\"Aprovado\"",
      "result": "A condição ficou verdadeira."
    },
    {
      "id": "sim-2",
      "value": "\"Reprovado\"",
      "result": "A condição mudou o resultado final."
    }
  ]
}
```

Regras:

- o template deve ter exatamente uma única lacuna;
- a forma recomendada da lacuna é `[[]]`;
- cada opção tem `value` e `result`;
- o estudante escolhe uma opção e vê o painel de saída;
- o simulador não bloqueia o avanço por padrão.

## 5.7 Multiple Choice

Contrato:

```json
{
  "id": "block-multiple-choice",
  "kind": "multiple_choice",
  "answerState": "correct",
  "options": [
    {
      "id": "choice-1",
      "value": "O intervalo de critério precisa ter o mesmo tamanho do intervalo de soma.",
      "answer": true
    },
    {
      "id": "choice-2",
      "value": "SOMASE sempre aceita múltiplos critérios sem função adicional.",
      "answer": false
    }
  ]
}
```

Campos:

- `answerState`: `correct` ou `incorrect`;
- `options[]`: alternativas com `id`, `value`, `answer`.

Semântica de `answerState`:

- `correct`: `answer: true` marca o conjunto correto;
- `incorrect`: `answer: true` marca o conjunto incorreto que deve ser identificado.

Regras:

- o bloco não tem enunciado próprio;
- se precisar de contexto, use `paragraph` antes dele;
- a validação exige correspondência exata entre o conjunto esperado e o conjunto marcado;
- esse bloco trava o avanço enquanto estiver incorreto ou incompleto.

## 5.8 Flowchart

Contrato:

```json
{
  "id": "block-flowchart",
  "kind": "flowchart",
  "nodes": [
    {
      "id": "node-1",
      "row": 0,
      "column": "center",
      "shape": "terminal",
      "text": "Início",
      "shapeOptions": [],
      "textOptions": []
    },
    {
      "id": "node-2",
      "row": 1,
      "column": "center",
      "shape": "decision",
      "text": "Há dados válidos?",
      "shapeOptions": [
        "process"
      ],
      "textOptions": [
        {
          "id": "flow-text-1",
          "value": "Dados completos?",
          "enabled": true
        }
      ]
    },
    {
      "id": "node-3",
      "row": 2,
      "column": "left",
      "shape": "process",
      "text": "Corrigir entrada",
      "shapeOptions": [],
      "textOptions": []
    },
    {
      "id": "node-4",
      "row": 2,
      "column": "right",
      "shape": "process",
      "text": "Executar cálculo",
      "shapeOptions": [],
      "textOptions": []
    }
  ],
  "links": [
    {
      "id": "link-1",
      "fromNodeId": "node-1",
      "toNodeId": "node-2",
      "outputSlot": 0,
      "label": ""
    },
    {
      "id": "link-2",
      "fromNodeId": "node-2",
      "toNodeId": "node-3",
      "outputSlot": 0,
      "label": "Não"
    },
    {
      "id": "link-3",
      "fromNodeId": "node-2",
      "toNodeId": "node-4",
      "outputSlot": 1,
      "label": "Sim"
    }
  ]
}
```

Campos do nó:

- `row`: ordem vertical;
- `column`: `left`, `center` ou `right`;
- `shape`: forma correta do nó;
- `text`: texto correto do nó;
- `shapeOptions[]`: alternativas extras de forma;
- `textOptions[]`: alternativas extras de texto.

Campos do link:

- `fromNodeId`
- `toNodeId`
- `outputSlot`: `0` ou `1`
- `label`

Formas aceitas:

- `terminal`
- `process`
- `input_output`
- `keyboard_input`
- `screen_output`
- `printed_output`
- `decision`
- `loop`
- `connector`
- `page_connector`

Regras importantes:

- um nó só vira lacuna de forma se o conjunto final de formas tiver mais de uma opção;
- um nó só vira lacuna de texto se o conjunto final de textos tiver mais de uma opção;
- na prática, isso significa que basta informar a resposta correta em `shape` ou `text` e pelo menos uma alternativa extra em `shapeOptions` ou `textOptions`;
- o runtime mantém no máximo duas saídas por nó;
- para nós `decision`, a convenção canônica é:
  - `outputSlot: 0` = ramo da esquerda = `Não`
  - `outputSlot: 1` = ramo da direita = `Sim`
- se um nó `decision` tiver duas saídas e os rótulos estiverem vazios, o motor tende a aplicar essa convenção automaticamente;
- na autoria, o editor deve expor esses rótulos já preenchidos quando os dois ramos existirem;
- o layout do fluxograma tenta preservar leitura top-down, laços externos e convergências limpas;
- quando houver caminho ortogonal lateral simples livre, ele deve ser preferido a rotas com dobras extras.

Recomendação forte de autoria:

- use `shapeOptions` e `textOptions` por nó;
- não dependa de `shapeBlank`, `textBlank` ou de opções compartilhadas no nível do bloco;
- gere links sempre com `outputSlot` explícito.

## 5.9 Button

Contrato:

```json
{
  "id": "block-button",
  "kind": "button",
  "popupEnabled": true,
  "popupBlocks": [
    {
      "id": "popup-heading",
      "kind": "heading",
      "value": "Boa!"
    },
    {
      "id": "popup-body",
      "kind": "paragraph",
      "value": "Agora você já consegue identificar a estrutura básica da fórmula."
    }
  ]
}
```

Regras:

- deve ser o último bloco do `step`;
- não usa `value`;
- o rótulo visual do CTA não é persistido no JSON;
- `popupBlocks[]` pode conter qualquer bloco autoral, exceto `button`;
- quando `popupEnabled` for `false`, o CTA avança diretamente;
- quando `popupEnabled` for `true`, o CTA abre um popup dockado ao rodapé.
- em popups de feedback, evite metalinguagem como "você acertou", "tema reforçado" ou repetição literal da alternativa correta quando isso já está visível no card; prefira entrar direto na justificativa útil.
- o popup também não deve explicar a própria dinâmica do curso, do card, da lição ou do app; ele deve falar só do motivo técnico, conceitual ou operacional.

Comportamento de validação:

- o `button` respeita a validação dos blocos interativos do próprio step;
- se o popup também tiver blocos interativos, eles precisam ser resolvidos antes do `popup-continue`.

## 5.10 Contrato de fidelidade por contêiner

Esta é a regra mais importante do contrato:

- cada contêiner precisa deixar explícito no próprio JSON qual campo é estrutural, qual campo é apenas visual e o que o motor pode derivar sem alterar a intenção didática.

Tabela de leitura rápida:

| kind | Fonte de verdade no JSON | O que pode ser só visual | Derivação segura do runtime | O que o motor não deve inferir |
| --- | --- | --- | --- | --- |
| `heading` | `value`, `align` | estilo tipográfico | `step.title` a partir do primeiro `heading` | subtítulo, destaques inline ou hierarquia extra |
| `paragraph` | `value` | `richText` equivalente | derivar `value` de `richText` equivalente ou regenerar `richText` a partir de `value` | preservar `richText` que contradiga o texto canônico |
| `image` | `value` | apresentação responsiva | resolver `assets/images/...` para data URL local | legenda, contexto ou crop inteligente |
| `table` | `title`, `headers[]`, `rows[][]` | estilo por célula | completar grade mínima segura | reordenar colunas, avaliar resposta ou interpretar destaque inline dentro da célula |
| `simulator` | `value` com uma lacuna e `options[]` | destaque inline do template e do resultado | garantir exatamente uma lacuna | julgar certo/errado, inventar opções ou trocar a ordem do experimento |
| `editor` | template em `value`, `interactionMode`, opções habilitadas | `displayOrder` | alinhar marcadores e opções, preservar `slotOrder`, aceitar variantes declaradas e manter `\n`/indentação do template | equivalência semântica não declarada, ordem estrutural a partir de `displayOrder` |
| `multiple_choice` | `answerState`, `options[].answer`, ordem do array | cor do selecionado | nenhuma além da normalização estrutural | usar cor para revelar resposta ou embaralhar sozinho |
| `flowchart` | `nodes[]`, `links[]`, opções extras por nó | layout calculado do diagrama | aplicar labels padrão `Não`/`Sim` e layout ortogonal | deduzir algoritmo correto além das lacunas declaradas |
| `button` | `popupEnabled`, `popupBlocks[]` | rótulo visual do CTA | criar CTA fixo e, se preciso, botão final ausente | popup no step raiz ou avanço sem respeitar validação |

Leitura operacional por bloco:

- `heading`: use quando o card precisa de um rótulo visual forte; não use para texto explicativo longo.
- `paragraph`: use para teoria curta, instrução explícita, tradução de termo técnico e feedback breve. Gere sempre um `value` legível e, quando houver destaque, um `richText` semanticamente espelhado.
- `image`: use apenas quando a imagem realmente acrescentar leitura, referência ou contexto. O bloco não carrega legenda implícita; se precisar explicar a imagem, faça isso em `paragraph`.
- `table`: use para contraste, consulta, checklist, mapeamento ou resumo comparativo. A ordem das linhas e colunas é a ordem em que o estudante vai ler.
- `simulator`: use quando uma única escolha precisa mostrar um efeito ou resultado logo abaixo, sem transformar o card em checagem de acerto.
- `editor`: use quando o estudante precisa completar, montar ou digitar código, fórmula, comando, texto técnico ou fragmentos de sintaxe. O template em `value` é a estrutura principal do card, persiste com `\n`, preserva linhas vazias e espaços iniciais por linha, e o preview autoral precisa refletir a mesma renderização literal usada pelo runtime fora das lacunas.
- `multiple_choice`: use quando a tarefa é discriminar ou classificar alternativas. Como o bloco não tem `displayOrder`, a ordem renderizada é exatamente a ordem do array; embaralhe antes de serializar.
- `flowchart`: use quando o estudante precisa visualizar processo, algoritmo, decisão, laço ou convergência. As lacunas praticáveis são as que nascem das opções extras por nó.
- `button`: use popup para feedback, reforço, saída mostrada, explicação curta ou exercício complementar; não use popup vazio.

---

## 6. Limites de formatação por campo

Nem todo campo textual do JSON aceita a mesma riqueza visual.

Isso evita aplicar destaque em campos que o motor renderiza apenas como texto simples.

| Campo | Aceita destaque inline? | Observações |
| --- | --- | --- |
| `heading.value` | não | texto simples; alinhamento por bloco |
| `paragraph.richText` | sim | aceita `strong`, `em`, `br` e tons inline permitidos |
| `paragraph.value` | não | texto canônico sem HTML |
| `image.value` | não | caminho do asset |
| `table.title` | não inline | estilo por célula inteira via `titleStyle` |
| `table.headers[].value` | não inline | estilo por célula inteira |
| `table.rows[][].value` | não inline | estilo por célula inteira |
| `editor.value` | sim, fora das lacunas | template de terminal com markup inline seguro |
| `editor` respostas dentro de `[[...]]` | não | conteúdo da lacuna é tratado como texto/resposta |
| `editor.options[].value` | não | texto simples |
| `simulator.value` | sim, fora da lacuna | template de terminal com uma única lacuna |
| `simulator.options[].value` | não | texto simples no seletor |
| `simulator.options[].result` | sim | resultado renderizado como terminal |
| `multiple_choice.options[].value` | não | texto simples; sem `richText` inline |
| `flowchart.nodes[].text` | não | texto simples |
| `flowchart.textOptions[].value` | não | texto simples |
| `flowchart.links[].label` | não | texto simples |
| `button.popupBlocks[]` | depende do bloco | seguem as mesmas regras do tipo do bloco |

Regras práticas:

- se você precisar destacar parte de uma alternativa de `multiple_choice`, não tente embutir HTML na alternativa;
- nesse caso, coloque a explicação destacada em um `paragraph` anterior ou no popup do `button`;
- em `table`, o destaque é por célula inteira, não por trecho interno;
- em `editor`, destaque termos técnicos no texto do terminal, mas mantenha a resposta da lacuna em texto puro;
- em `simulator`, a opção visível é texto puro, mas o resultado pode trazer destaque inline.
- se o card precisar mostrar HTML literal, como `<title>` ou `<div>`, o runtime atual do `editor` e do `simulator` já preserva esses trechos como código visível; ainda assim, `&lt;title&gt;` continua sendo uma alternativa válida de autoria quando você quiser explicitar a literalidade na própria fonte.

### 6.1 Convenção de destaque semântico

Convenção recomendada para conteúdos técnicos:

- use dourado para termos técnicos em foco no card;
- use dourado para comandos, funções, palavras-reservadas, operadores e símbolos ensinados naquele momento;
- use dourado para valores literais relevantes no contexto do código, fórmula ou comando;
- use dourado para exemplos concretos que o estudante precisa localizar visualmente, como `"Fabio"`, `INSERT`, `ls`, `print()` ou `+`.
- quando o card mandar exibir, digitar ou localizar algo específico, repita esse alvo também no `paragraph` e destaque-o em dourado;
- em cards de prática, use o dourado para espelhar exatamente o que o estudante deve notar no texto instrucional e no bloco prático.

Forma de persistir:

- em `paragraph.richText` e `editor.value`, use `<span class="inline-tone-gold">...</span>`;
- em `table`, use `tone: "gold"` na célula inteira.

Exemplos:

```json
{
  "kind": "paragraph",
  "value": "Use INSERT para adicionar uma linha.",
  "richText": "Use <span class=\"inline-tone-gold\">INSERT</span> para adicionar uma linha."
}
```

```json
{
  "value": "Fabio",
  "bold": false,
  "italic": false,
  "tone": "gold",
  "align": "left"
}
```

### 6.2 Convenção de negrito

Use `<strong>` com moderação.

Indicado para:

- palavra-chave da instrução, como `incorretas` em "Assinale as incorretas.";
- contraste conceitual importante;
- lembrete crítico de regra.

Evite:

- deixar frases inteiras em negrito;
- usar negrito e dourado ao mesmo tempo sem motivo;
- transformar todo termo técnico em negrito quando o dourado já resolve o foco.
- usar negrito para tokens de código quando o dourado já comunica melhor o foco visual.

---

## 7. Arquétipos didáticos observados nas lições de Python

A análise de `Intro`, `Strings`, `Numbers` e das capturas de `Library` e `Joining strings` mostra um padrão didático bem estável.

O motor do AraLearn não impõe esse padrão, mas ele é um excelente default de autoria.

### 7.1 Arquétipos recorrentes

`Contexto curto`

- abre a lição com curiosidade, analogia, narrativa ou microcontexto;
- normalmente usa `paragraph` e às vezes `editor` estático;
- ainda não exige resposta.

`Prática guiada`

- introduz um elemento novo com instrução muito explícita;
- normalmente usa `heading` como `FILL IN THE BLANKS` ou equivalente;
- em seguida usa `paragraph` curto e `editor` com uma ou poucas lacunas.

`Exploração controlada de erro`

- mostra o que acontece quando algo está errado;
- usa `editor` estático com código inválido ou `simulator`;
- o foco não é punir, e sim tornar o erro visível e inteligível.

`Correção imediata`

- vem logo depois do erro;
- pede ao estudante para corrigir exatamente o ponto recém-exposto;
- reduz carga cognitiva porque o problema já está delimitado.

`Discriminação`

- pede para identificar tipos, casos corretos ou casos incorretos;
- normalmente usa `multiple_choice`.

`Mini-projeto guiado`

- reutiliza o que foi ensinado em cards anteriores dentro de uma pequena narrativa;
- exemplos observados: contatos em `Strings`, biblioteca em `Library`, mensagens em `Joining strings`;
- a tarefa cresce passo a passo, nunca de uma vez.

`Resumo`

- encerra a lição com cartões mais densos;
- combina `heading`, `paragraph` e `editor` estático;
- recapitula regras e mostra exemplos-modelo.

### 7.2 Mapeamento das etiquetas didáticas para blocos

Padrões observados nas lições-fonte:

- `FILL IN THE BLANKS`: geralmente `heading + paragraph + editor`
- `COMPLETE THE CODE`: geralmente `heading + paragraph + editor` com `interactionMode: "input"`
- `BE THE CODE`: geralmente `heading + paragraph + simulator`
- `CHOOSE ALL THAT APPLY`: geralmente `heading + paragraph + multiple_choice`
- `SUMMARY`: geralmente `heading + paragraph + heading + paragraph + editor` repetidos

Essas etiquetas não são tipos nativos do motor.

No AraLearn, elas são representadas por composição de blocos.

### 7.3 Progressão observada

Padrão dominante:

1. apresentar ou contextualizar;
2. pedir uma ação mínima;
3. confirmar o acerto com feedback curto;
4. acrescentar uma pequena camada nova;
5. reaproveitar o que acabou de ser visto;
6. fechar com resumo ou mini-projeto.

Em `Library` e `Joining strings`, aparece uma progressão adicional:

- o curso migra de escolha guiada para digitação direta;
- isso sugere que `interactionMode: "input"` é melhor quando os símbolos básicos já foram ensinados antes;
- para primeiros contatos, `choice` costuma ser mais seguro.

Em `Expressions` e `Cycling club`, aparecem mais alguns padrões fortes:

- a teoria costuma vir em doses mínimas, normalmente 1 a 3 frases curtas por card;
- cada exercício altera apenas um detalhe local do código, em vez de exigir montagem longa de uma vez;
- o mesmo conceito reaparece em contextos diferentes até ficar confortável;
- o card deixa clara a diferença entre `código digitado` e `resultado exibido`;
- depois de ensinar uma ação pequena, o curso a repete antes de introduzir a próxima.

Em lições de revisão como `Comments` e `Mei's quiz`, o padrão útil é:

- teoria ainda mais curta que nas lições-base;
- vários exercícios seguidos, cada um cobrando um detalhe diferente do mesmo repertório;
- progressão interna que vai de comentário, string ou número isolado até combinação entre temas;
- alternância entre escolha e produção quando isso aumenta retenção sem virar adivinhação.

Nas versões corrigidas de `Library` e `Joining strings`, aparecem mais algumas regras muito úteis:

- cards de prática não deixam `paragraph` vazio; cada bloco textual cumpre uma função didática real;
- um padrão especialmente forte é `microcontexto curto + instrução explícita`, muitas vezes em dois `paragraphs`;
- o primeiro `paragraph` contextualiza a cena ou o objetivo;
- o segundo `paragraph` diz exatamente o que mostrar, digitar, unir, somar, multiplicar ou corrigir;
- o texto instrucional repete em dourado o operador, literal, número ou saída que deve virar foco do olhar;
- em exercícios de expressão, o popup frequentemente mostra o resultado produzido e pode acrescentar uma frase separando `expressão digitada` de `resultado calculado`;
- em `summary`, só mantenha popup se ele realmente acrescentar algo; caso contrário, prefira `popupEnabled: false`.

---

## 8. Regras pedagógicas de autoria

Estas regras não são restrições técnicas do parser.

São restrições de autoria recomendadas para qualquer fluxo manual ou assistido.

### 8.1 Clareza e carga cognitiva

- cada card deve ter um objetivo único e evidente;
- não pressuponha conhecimento prévio não explicitado;
- a instrução do card deve dizer exatamente o que fazer;
- quando o card introduzir um termo técnico novo, ele deve ser explicado em linguagem simples no mesmo card ou no popup;
- se a explicação ficar longa, divida em dois cards.
- prefira teoria em blocos muito curtos, normalmente 1 a 3 frases por card;
- em geral, a lição deve ter mais cards de prática do que cards de teoria;
- se um exercício exigir várias ações, quebre em vários cards;
- ensine uma única novidade por vez;
- antes de aumentar a dificuldade, repita a mesma habilidade em outro contexto simples.
- não gere `paragraph` apenas para “preencher espaço”; se um bloco textual não acrescentar contexto, instrução ou explicação, ele não deve existir.
- o texto autoral deve falar do conteúdo técnico, nunca da própria mecânica didática; evite fórmulas como "no próprio card", "esta lição", "neste curso", "o app como motor" ou comentários sobre como o material foi montado.

### 8.2 Introdução de termos técnicos

Na primeira ocorrência de um termo técnico:

- destaque o termo;
- diga o que ele é;
- diga para que serve;
- se houver abreviação ou origem do nome, explique;
- se útil, dê a tradução ou a leitura em português.

Exemplo recomendado:

- `ls` em dourado;
- explicar que é abreviação de `list`;
- explicar que significa `listar`;
- só depois pedir uso prático.

### 8.3 Regra de progressão

A autoria nunca deve exigir algo que ainda não foi ensinado dentro do contexto permitido.

Conhecimento permitido:

- cards anteriores da mesma lição;
- lições anteriores do mesmo módulo já consideradas concluídas no contexto atual;
- módulos anteriores do mesmo curso já considerados concluídos no contexto atual.

Conhecimento proibido:

- conceitos ainda não apresentados em nenhum desses contextos;
- nomes de comandos, símbolos, sintaxe ou convenções ainda não explicados;
- saltos de dificuldade que transformem o card em teste de adivinhação.

Regra operacional:

- se o material de origem não informar conhecimento prévio permitido, assuma que a lição deve ser autossuficiente;
- se um card precisar de pré-requisito, explicite esse inventário antes de cobrar a resposta.
- se o texto-base mencionar um conceito necessário, mas não o explicar, insira cards-ponte antes de cobrar esse conceito;
- o texto-base define escopo e direção, não o número final de cards nem a microprogressão obrigatória.

### 8.4 Regra de reaproveitamento

É desejável reaproveitar o que acabou de ser ensinado.

Exemplos bons:

- introduzir `print()` e usá-lo de novo no card seguinte;
- ensinar aspas e depois pedir montagem de uma string parecida;
- ensinar `+` para números e depois comparar com `+` para strings;
- mostrar um erro e logo depois pedir a correção do mesmo erro.

Exemplos ruins:

- ensinar um símbolo e só voltar nele muito depois, sem reforço;
- pedir dois conceitos novos ao mesmo tempo;
- trocar de contexto narrativo sem aviso, perdendo continuidade.

Boa progressão dentro da mesma lição:

- primeiro reconhecer;
- depois completar;
- depois produzir;
- depois combinar com algo já visto antes.

### 8.5 Regra de distinção entre código e resultado

Sempre que houver risco de confusão, explicite:

- o que o estudante deve digitar;
- o que Python, Excel, SQL ou outra ferramenta vai produzir depois;
- quando a resposta correta é a `expressão` e quando é o `valor resultante`.

Exemplos:

- se o objetivo for montar código, a resposta deve ser `1312 + 576`, não `1888`;
- se o objetivo for identificar o valor de uma expressão, a resposta deve ser `129.9`, não `10 * 12.99`.
- se o popup mostrar `1888`, ele deve deixar claro que esse é o resultado que Python calcula depois que o estudante digita `1312 + 576`.

### 8.6 Regra de feedback

O feedback de acerto deve ser:

- curto;
- positivo;
- informativo;
- imediatamente conectado ao que acabou de ser feito.

Boas funções do popup:

- confirmar o resultado;
- mostrar a saída correta;
- explicar em uma frase por que está certo;
- acrescentar uma curiosidade pequena, sem abrir um novo assunto grande.
- distinguir, quando necessário, `o que foi digitado` de `o que a linguagem ou ferramenta produziu`.

Evite:

- popup vazio ou meramente decorativo;
- popup que só repete o mesmo texto do card sem acrescentar clareza;
- popup que revele uma regra nova grande demais que deveria ter virado outro card.

### 8.7 Regra de estilo textual

- prefira frases curtas;
- explique antes de abstrair;
- use exemplos concretos;
- mantenha o vocabulário compatível com iniciante;
- se o conteúdo for técnico, traduza mentalmente para linguagem de estudo antes de escrever o card.

### 8.8 Regra de escolha do tipo de exercício

Use `editor` com `choice` quando:

- o estudante ainda está reconhecendo símbolos;
- o foco é associação visual;
- você quer reduzir erro de digitação.
- o objetivo real é montar partes visíveis de uma expressão, comando, URL, horário, rótulo ou string por composição guiada;
- mostrar o resultado final poderia permitir chute correto em `input`, enquanto `choice` força prática da estrutura ensinada.

Use `editor` com `input` quando:

- o estudante já viu a sintaxe base;
- o objetivo é produzir a resposta;
- faz sentido digitar diretamente no preview.
- a dificuldade desejada está na produção do texto completo, e não na seleção ou montagem de peças já conhecidas.

Use `simulator` quando:

- você quer comparar alternativas e o efeito de cada uma;
- há uma única lacuna e um painel de resultado ajuda a raciocinar.

Use `multiple_choice` quando:

- o foco é classificar, reconhecer ou diferenciar;
- a resposta esperada é um conjunto de opções.

Use `paragraph` ou `editor` estático quando:

- o card só precisa explicar ou mostrar;
- ainda não é hora de cobrar resposta.

Observação importante:

- o melhor curso costuma alternar métodos de input ao longo do tempo, mas não de forma aleatória;
- a alternância deve acompanhar o domínio crescente do estudante sobre o conteúdo.

### 8.9 Regra de construção de alternativas

Sempre que o card usar `editor` com `choice`, `simulator` ou `multiple_choice`:

- inclua explicitamente todas as alternativas no JSON;
- gere distratores plausíveis, próximos do erro esperado do iniciante;
- embaralhe a ordem visual das alternativas antes de entregar o JSON final;
- não deixe a opção correta sempre na primeira posição;
- faça cada distrator corresponder a uma confusão real, como operador errado, ordem invertida, aspas ausentes ou confusão entre expressão e resultado.
- a decomposição em tokens pequenos é permitida quando isso fizer parte do treino pretendido, como escolher aspas, operadores, `#` ou pedaços curtos de sintaxe;
- não aumente artificialmente a granularidade só porque existe repetição de token; o runtime suporta fichas repetidas e mira explícita de lacuna em `choice`;
- prefira opções maiores e semanticamente completas apenas quando a fragmentação deixar de ensinar o conceito e passar a virar ruído operacional ou ambiguidade desnecessária.

Distratores ruins:

- absurdos demais para qualquer iniciante;
- semanticamente repetidos;
- fáceis por eliminação visual imediata;
- introduzindo um conceito ainda não ensinado.

Regra adicional muito útil:

- se o card mostra explicitamente a saída esperada, como `10:30`, `Terrain: hilly` ou uma URL final, pergunte se o estudante deve reproduzir o resultado pronto ou montar as partes que o geram;
- se o objetivo didático for a montagem, prefira `editor` com `choice` e distribua em lacunas separadas as partes relevantes, como literais, operadores ou separadores;
- nesse caso, inclua distratores plausíveis como operador errado, separador errado ou a saída final inteira como ficha incorreta, para evitar acerto por atalho mental.

### 8.10 Regra de variantes aceitas em `editor` com `input`

Quando o card usa `interactionMode: "input"`, a autoria deve decidir explicitamente quais respostas equivalentes serão aceitas.

Regra base:

- `options[].value` guarda a resposta canônica;
- `variants[]` guarda equivalências aceitas de forma deliberada;
- o motor não deve ser tratado como resolvedor semântico implícito.

Aceite normalmente:

- variações triviais de espaçamento quando espaçamento não for o conceito ensinado;
- formas equivalentes previsíveis e curtas, como `1312+576` para `1312 + 576`;
- permutação de operandos em operações comutativas, como soma e multiplicação, quando o card estiver ensinando a operação e não a ordem.
- em exercícios cujo objetivo é completar apenas o conteúdo de uma string, coloque as aspas fora de `[[...]]` e faça a lacuna aceitar só o conteúdo interno, como `print("Terrain: " + "[[hilly]]")`.

Aceite com cautela:

- regex para famílias de respostas realmente bem delimitadas;
- formas alternativas que preservam exatamente o mesmo conceito cobrado.

Não aceite automaticamente:

- resultados numéricos quando o card pede a expressão;
- expressões quando o card pede o resultado;
- permutações em subtração, divisão ou concatenação orientada pela ordem;
- “sinônimos” de código que mudem a estrutura ensinada no card.
- aspas dentro da resposta digitada quando o próprio template já fornece essas aspas fora da lacuna.

Exemplo recomendado para multiplicação:

```json
{
  "id": "opt-pages",
  "value": "4 * 29",
  "enabled": true,
  "displayOrder": 0,
  "regex": false,
  "variants": [
    {
      "id": "var-pages-1",
      "value": "4*29",
      "regex": false
    },
    {
      "id": "var-pages-2",
      "value": "29 * 4",
      "regex": false
    },
    {
      "id": "var-pages-3",
      "value": "29*4",
      "regex": false
    }
  ]
}
```

Exemplo recomendado para divisão:

```json
{
  "id": "opt-average",
  "value": "12939 / 12",
  "enabled": true,
  "displayOrder": 0,
  "regex": false,
  "variants": [
    {
      "id": "var-average-1",
      "value": "12939/12",
      "regex": false
    }
  ]
}
```

### 8.11 Falhas típicas de autoria e regras preventivas

Esta seção é deliberadamente normativa.

Ela existe porque JSON tecnicamente válido não basta.

Um card pode estar válido para o parser e ainda assim ser didaticamente ruim, injusto, ambíguo ou impossível.

Regra de veto:

- se o card só puder ser resolvido por adivinhação;
- se depender de conhecimento prévio não autorizado;
- se depender do popup para revelar um pré-requisito do card principal;
- se a instrução não disser claramente o que fazer;
- se o bloco escolhido treinar uma habilidade diferente da habilidade pretendida;
- se `value` e `richText` ensinarem coisas diferentes;
- se o estudante puder acertar por atalho visual em vez de praticar a habilidade-alvo;
- então o card deve ser rejeitado e regenerado, mesmo que o JSON esteja formalmente correto.

Falhas recorrentes de autoria e regra preventiva correspondente:

- `Card impossível`: ocorre quando o estudante não consegue descobrir, a partir do próprio card e dos conhecimentos autorizados, qual resposta produzir. Regra preventiva: todo card prático deve explicitar verbo, alvo e formato da resposta.
- `Deriva do objetivo didático`: ocorre quando o card pretendia treinar montagem, mas acabou treinando reconhecimento superficial; ou pretendia treinar produção, mas virou escolha. Regra preventiva: para cada card, declare internamente uma única micro-habilidade entre introduzir, reconhecer, completar, produzir, discriminar, simular ou concluir.
- `Instrução subespecificada`: ocorre quando a instrução vira frase genérica como `Complete o código` ou `Escolha a resposta correta`. Regra preventiva: a instrução precisa dizer exatamente o que montar, localizar, digitar, corrigir, classificar ou comparar.
- `Conflito entre expressão e resultado`: ocorre quando o aluno não sabe se deve responder `1312 + 576` ou `1888`. Regra preventiva: o card e o popup devem separar explicitamente `o que o estudante digita` de `o que a linguagem ou ferramenta produz depois`.
- `Conflito entre value e richText`: ocorre quando `richText` acrescenta uma informação que não existe em `value`, como a resposta explícita ou uma restrição extra. Regra preventiva: se você remover todo o markup de `richText`, o conteúdo essencial deve continuar equivalente a `value`.
- `Simplificação indevida do exercício`: ocorre quando um exercício fragmentado é trocado por uma expressão inteira digitável só porque isso é mais simples de montar. Regra preventiva: simplifique contexto e redação, nunca o alvo didático.
- `Choice/input errado`: ocorre quando `input` é usado num card em que o estudante deveria montar partes visíveis, ou quando `choice` aparece num ponto em que o objetivo já é produção autônoma. Regra preventiva: escolha o modo de interação pela habilidade treinada, não pela conveniência da autoria.
- `Atalho pelo resultado`: ocorre quando o card mostra a saída final e o estudante pode responder pelo efeito observado sem praticar a estrutura que o gera. Regra preventiva: se a meta for montagem, prefira `choice` com partes separadas e distratores plausíveis.
- `Dependência de inferência do motor`: ocorre quando a autoria assume que o app aceitará automaticamente equivalências, sinônimos ou formas semanticamente parecidas. Regra preventiva: toda equivalência aceita em `input` precisa estar declarada em `variants[]` ou `regex`.
- `Perda de intenção estrutural`: ocorre quando `displayOrder` é tratado como ordem canônica ou quando duplicatas são colapsadas. Regra preventiva: em `editor.choice`, preserve duplicatas, serialize `slotOrder` nas opções habilitadas e use `displayOrder` apenas como embaralhamento visual.
- `Pistas involuntárias`: ocorre quando a correta aparece sempre primeiro, quando a interface entrega cor ou marca que denuncia a resposta, ou quando faltam distratores plausíveis. Regra preventiva: embaralhe, use distratores realistas e nunca use estética como pista didática indevida.
- `Excesso de inferência do aluno`: ocorre quando a lacuna cobra mais de uma descoberta ao mesmo tempo. Regra preventiva: cada lacuna deve exigir um único movimento cognitivo principal.

Perguntas de veto antes de aceitar um card:

- o estudante consegue resolver este card sem adivinhar?
- o popup apenas confirma/expande, ou ele está escondendo um pré-requisito?
- o verbo da instrução combina com o tipo real do exercício?
- a resposta correta é a expressão, o valor, o rótulo, a alternativa ou a simulação?
- remover o markup de `richText` muda a informação essencial do card?
- a forma de input escolhida força a prática certa, ou abriu um atalho indevido?
- a autoria simplificou o exercício a ponto de trocar a habilidade treinada?

### 8.12 Regra de decomposição curricular a partir de fontes

Em muitos fluxos reais, a autoria não parte apenas de um tema curto.

O material de origem pode incluir:

- slides de aula;
- OCR de screenshots e PDFs;
- diagramas;
- planos de aula;
- ementa do curso;
- bibliografia;
- listas de tópicos;
- textos-base incompletos ou heterogêneos.

Nesses casos, não salte diretamente da fonte bruta para o JSON final de um card.

Pipeline recomendado:

- primeiro extrair escopo, conceitos, objetivos e dependências;
- depois planejar `course -> module -> lesson`;
- só então detalhar cada `lesson` em cards;
- por fim, emitir o JSON final.

Regras para esse estágio anterior ao JSON:

- `ementa` define escopo e fronteiras do curso, não a microdidática de cada card;
- `bibliografia` define rigor, vocabulário técnico, profundidade e pontos que precisam de verificação externa;
- `slides` e `diagramas` são pistas de sequência, foco e exemplos, mas raramente são material didático suficiente por si só;
- `OCR` é fonte sujeita a perda de símbolos, operadores, aspas, rótulos e ordem visual; nunca use OCR cru como fonte única para cards de prática;
- sempre que uma fonte trouxer apenas menção superficial a um conceito necessário, crie cards-ponte antes de cobrá-lo;
- se duas fontes conflitarem, prefira a formulação mais verificável e mais didaticamente segura.

Planejamento mínimo antes de gerar cards:

- inventário de conceitos do curso;
- mapa de pré-requisitos entre conceitos;
- lista do que pode ser reutilizado em cada módulo e em cada lição;
- lista de termos técnicos que precisarão de explicação inicial;
- inventário de erros previsíveis do iniciante;
- decisão de onde usar teoria curta, prática guiada, produção, discriminação, simulação e revisão.

Controle de dificuldade:

- introduza uma novidade por vez;
- pratique a mesma novidade em mais de um contexto antes de combiná-la com outra;
- aumente a dificuldade por composição cumulativa, não por salto brusco;
- se o curso não é de matemática, não use cálculo complexo como barreira acessória para um card que deveria ensinar sintaxe, ferramenta ou procedimento;
- exercícios difíceis devem ser difíceis pelo objetivo didático central, não por ruído periférico.

Regras especiais para prática gerada a partir de fontes brutas:

- se o aluno precisa montar partes visíveis, gere `choice` com peças explícitas;
- se o aluno precisa produzir texto ou código completo e a base já foi ensinada, use `input` com variantes deliberadas;
- se um diagrama, slide ou screenshot mostra apenas a saída final, não assuma que isso basta para um card de prática;
- se a fonte traz apenas exemplo pronto, decomponha esse exemplo em passos menores antes de cobrar produção autônoma;
- se a fonte mencionar uma entidade técnica obscura mas relevante, como `transistor`, `loop`, `SEI` ou um comando de shell, explique o termo antes de tratá-lo como conhecido.

---

## 9. O que o motor deriva automaticamente

O runtime normaliza muita coisa, mas a autoria não deve depender disso como estratégia principal.

Derivações importantes:

- se faltar `richText` em `paragraph`, ele pode ser derivado de `value`;
- se `paragraph.value` vier vazio e `richText` estiver semanticamente íntegro, `value` pode ser derivado dele;
- o primeiro `heading` preenchido tende a sobrescrever `step.title`;
- no `lesson_complete`, o primeiro `paragraph` pode virar `step.subtitle`;
- `editor` sem `[[...]]` vira terminal estático;
- `simulator` sem lacuna é ajustado para uma única lacuna;
- `flowchart` sem nós explícitos pode nascer com um modelo padrão;
- se faltarem `steps`, a normalização pode injetar steps padrão;
- se faltar `button`, a normalização pode criar um.

Recomendação:

- gere o formato já pronto;
- use a normalização apenas como rede de segurança, não como contrato de autoria.

---

## 10. Campos e padrões a evitar

Evite estes formatos como contrato principal:

- aliases legados como `correct` em vez de `answer`;
- `prompt` em vez de `value` no `simulator`;
- `responseMode` ou `inputMode` em vez de `interactionMode` no `editor`;
- `shapeBlank` e `textBlank` como controle principal do `flowchart`;
- `shapeOptions` e `textOptions` no nível do bloco de `flowchart` como estratégia principal;
- `popupBlocks` no step raiz;
- mais de um `button` no mesmo step;
- `button` fora da última posição;
- HTML arbitrário fora do conjunto inline permitido;
- depender de inferência semântica do motor para aceitar respostas equivalentes.
- tentar usar destaque inline em campos que só aceitam texto simples;
- embutir conceitos não ensinados sem explicação imediata;
- transformar `multiple_choice` em bloco de explicação longa;
- usar `input` cedo demais em conteúdo ainda muito novo;
- concentrar instrução, novidade e exceção no mesmo card.
- deixar `paragraph` vazio ou genérico em card de prática;
- aceitar respostas equivalentes importantes apenas “por sorte”, sem declará-las em `variants[]` ou `regex`.

---

## 11. Exemplo de lição completa

```json
{
  "id": "excel-somase",
  "title": "SOMASE",
  "subtitle": "Condição simples em planilhas.",
  "steps": [
    {
      "id": "excel-somase-step-01",
      "type": "content",
      "title": "O que é SOMASE",
      "blocks": [
        {
          "id": "excel-somase-step-01-heading",
          "kind": "heading",
          "value": "O QUE É SOMASE",
          "align": "left"
        },
        {
          "id": "excel-somase-step-01-paragraph",
          "kind": "paragraph",
          "value": "A função SOMASE soma apenas os valores que atendem a um critério.",
          "richText": "A função <strong>SOMASE</strong> soma apenas os valores que atendem a um critério.",
          "align": "left"
        },
        {
          "id": "excel-somase-step-01-button",
          "kind": "button",
          "popupEnabled": false,
          "popupBlocks": []
        }
      ]
    },
    {
      "id": "excel-somase-step-02",
      "type": "content",
      "title": "Monte a fórmula",
      "blocks": [
        {
          "id": "excel-somase-step-02-heading",
          "kind": "heading",
          "value": "MONTE A FÓRMULA",
          "align": "left"
        },
        {
          "id": "excel-somase-step-02-paragraph",
          "kind": "paragraph",
          "value": "Preencha as lacunas para somar a coluna C somente quando a região for Sul.",
          "align": "left"
        },
        {
          "id": "excel-somase-step-02-editor",
          "kind": "editor",
          "value": "<span class=\"inline-tone-gold\">SOMASE</span>([[B2:B20]];[[\"Sul\"]];[[C2:C20]])",
          "interactionMode": "choice",
          "options": [
            {
              "id": "excel-somase-step-02-opt-01",
              "value": "B2:B20",
              "enabled": true,
              "displayOrder": 0
            },
            {
              "id": "excel-somase-step-02-opt-02",
              "value": "\"Sul\"",
              "enabled": true,
              "displayOrder": 1
            },
            {
              "id": "excel-somase-step-02-opt-03",
              "value": "C2:C20",
              "enabled": true,
              "displayOrder": 2
            },
            {
              "id": "excel-somase-step-02-opt-04",
              "value": "\"Norte\"",
              "enabled": false,
              "displayOrder": 3
            }
          ]
        },
        {
          "id": "excel-somase-step-02-button",
          "kind": "button",
          "popupEnabled": true,
          "popupBlocks": [
            {
              "id": "excel-somase-step-02-popup-heading",
              "kind": "heading",
              "value": "Boa!"
            },
            {
              "id": "excel-somase-step-02-popup-editor",
              "kind": "editor",
              "value": "SOMASE(B2:B20;\"Sul\";C2:C20)",
              "options": [],
              "interactionMode": "choice"
            },
            {
              "id": "excel-somase-step-02-popup-paragraph",
              "kind": "paragraph",
              "value": "O primeiro intervalo contém o critério, o segundo define a condição e o terceiro informa o que será somado."
            }
          ]
        }
      ]
    },
    {
      "id": "excel-somase-step-03",
      "type": "lesson_complete",
      "title": "Lição concluída",
      "blocks": [
        {
          "id": "excel-somase-step-03-heading",
          "kind": "heading",
          "value": "LIÇÃO CONCLUÍDA",
          "align": "center"
        },
        {
          "id": "excel-somase-step-03-paragraph",
          "kind": "paragraph",
          "value": "Você já consegue reconhecer a estrutura mínima da função SOMASE."
        },
        {
          "id": "excel-somase-step-03-button",
          "kind": "button",
          "popupEnabled": false,
          "popupBlocks": []
        }
      ]
    }
  ]
}
```

---

## 12. Checklist de autoria

Ao montar uma lição, vale exigir explicitamente:

- gerar um único objeto `lesson` válido;
- incluir IDs estáveis e únicos;
- garantir que todo `step` termine com um único `button`;
- manter `step.title` coerente com o primeiro `heading`;
- usar `paragraph` para explicação e `button.popupBlocks` para feedback ou expansão;
- declarar explicitamente variantes aceitas em exercícios de código, fórmula ou comando;
- evitar `paragraph` vazio; cada `paragraph` deve ter função de contexto, instrução ou explicação;
- para cada bloco, deixar claro qual campo é estrutural e qual campo é apenas visual;
- manter teoria curta e segmentada, sem cards densos demais;
- não usar campos legados nem aliases;
- não depender de normalização implícita para completar lacunas estruturais;
- respeitar as limitações reais de formatação por campo;
- explicar todo termo técnico novo na primeira ocorrência;
- usar dourado para termos técnicos, valores e símbolos em foco;
- repetir em dourado, no texto instrucional, o mesmo operador, literal, valor ou saída que o estudante deve localizar ou produzir;
- usar negrito com moderação para a ênfase conceitual principal;
- garantir progressão sem exigir conhecimento ainda não apresentado;
- preferir várias práticas curtas em sequência a uma única prática longa e densa;
- inserir cards-ponte quando o texto-base pressupuser um pré-requisito não explicado;
- separar claramente `código a escrever` de `resultado esperado`;
- em `input`, decidir explicitamente se a resposta aceita só a forma canônica, também aceita forma sem espaços, e também aceita permutação comutativa;
- incluir distratores plausíveis e alternativas embaralhadas em todo exercício baseado em opções;
- se houver `flowchart` com decisão binária, usar `Não` à esquerda e `Sim` à direita;
- rejeitar cards que só seriam resolvíveis por adivinhação, popup ou conhecimento prévio não autorizado;
- garantir que `value` e `richText` continuem semanticamente equivalentes em todo bloco textual;
- decidir a micro-habilidade de cada card antes de escolher o contêiner;
- em fluxos com OCR, slides, diagramas, ementa ou bibliografia, fazer primeiro uma etapa de decomposição curricular e mapeamento de pré-requisitos;
- não usar material bruto ou OCR cru como justificativa para manter instruções genéricas ou cards impossíveis;
- escolher `choice`, `input`, `simulator` ou `multiple_choice` conforme o estágio didático do estudante.

Pergunta-guia útil antes de fechar o card:

- "Este card ensina, pratica, verifica, simula ou conclui?"

Essa pergunta costuma levar a uma escolha melhor entre `paragraph`, `editor`, `multiple_choice`, `simulator`, `flowchart` e popup do `button`.

Perguntas adicionais muito úteis:

- "Qual é o único conceito novo deste card?"
- "Quais conhecimentos prévios este card está autorizado a reutilizar?"
- "O que precisa estar em dourado para orientar visualmente o estudante?"
- "Em cada contêiner deste card, qual campo é a fonte de verdade e o que o runtime só deve refletir visualmente?"
- "Se este card usa `input`, quais variantes equivalentes precisam ser aceitas explicitamente e quais não devem ser aceitas?"
- "Se eu remover o popup, o card principal continua resolvível?"
- "Se eu remover o markup de `richText`, a informação essencial do card continua a mesma?"
- "Este card está treinando exatamente a micro-habilidade que eu pretendia, ou houve simplificação indevida?"
- "A dificuldade está no objetivo didático central, ou em ruído periférico trazido pela fonte bruta?"
- "Há algum termo técnico aqui que ainda não foi explicado?"
- "Este exercício cobra uma ação pequena o bastante para um único card?"
- "As alternativas erradas parecem erros humanos reais?"
- "O texto-base está servindo como guia de escopo, sem engessar a progressão didática?"
