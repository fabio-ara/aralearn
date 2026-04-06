# Manual do Projeto AraLearn

## 1. Finalidade

Este manual documenta o **app** AraLearn.

Ele descreve:

- propósito do produto;
- arquitetura do motor;
- modelo de dados;
- regras de autoria, navegação e persistência;
- integração entre web e Android;
- invariantes que devem continuar verdadeiras após mudanças.

Documento complementar:

- `lesson-json-spec.md`: contrato recomendado para geração automática de lições em JSON, com foco em steps, blocos, popup e efeitos no runtime.

Regra central:

- o manual documenta o **motor do app**, não cursos específicos;
- conteúdo autoral é volátil e não deve ser tratado como parte fixa do produto;
- toda mudança estrutural, de UX, de persistência ou de regra de negócio deve atualizar este arquivo.

---

## 2. Visão geral

AraLearn é um motor local de aprendizagem em cards.

Perfis principais:

- autor: cria cursos, módulos, lições, cards e exercícios;
- estudante: navega por lições segmentadas e retoma o progresso salvo.

Princípios do produto:

- offline-first;
- mobile-first;
- sem backend obrigatório;
- mesma base web para navegador e APK;
- conteúdo mutável e externo ao núcleo do motor;
- o app pode embarcar um catálogo de cursos separado em `content/`, sem misturar esse catálogo ao código do motor;
- suporte a cursos de naturezas diferentes, como programação, administração, processos, ferramentas e disciplinas teóricas;
- combinação livre de narrativa, tabela, terminal, múltipla escolha, simulador e fluxograma conforme o objetivo didático;
- persistência local imediata;
- portabilidade por pacote com JSON e imagens;
- ações fixas de lição vivem no rodapé e sobreposições do botão final ocupam esse mesmo rodapé, sem duplicar CTA;
- superfícies-base evitam sombras grandes e retangulares que façam a interface parecer uma moldura dentro da tela.

O app é fixo.

O conteúdo é mutável.

### 2.1 Cenário de uso

O produto foi pensado para estudantes-trabalhadores que estudam em condições adversas de tempo, atenção e conforto físico.

Cenário priorizado:

- estudo em deslocamento;
- uso em pé no transporte público;
- pouco tempo disponível entre trabalho, faculdade e outras obrigações;
- ausência frequente de internet;
- necessidade de retomar o ponto anterior sem atrito;
- necessidade de transformar materiais próprios em trilhas de prática portátil.

Consequência prática:

- o app precisa funcionar offline;
- a autoria precisa acontecer no próprio dispositivo ou ser facilmente portada;
- a interface precisa privilegiar foco, continuidade e baixa fricção.

### 2.2 O que o produto oferece

No estado atual, o AraLearn permite que o usuário:

- crie cursos, módulos, lições e cards;
- edite cards em um editor visual de baixa codificação;
- combine explicação, imagem, tabela, múltipla escolha, terminal, simulação e fluxograma no mesmo percurso;
- transforme trechos de texto, células de tabela, nós de fluxograma e trechos de terminal em lacunas;
- configure opções corretas e incorretas;
- configure respostas por digitação, com variantes aceitas e expressões regulares quando o exercício exigir;
- mantenha comentários pessoais por card;
- exporte o conteúdo para JSON e ZIP;
- reimporte esse conteúdo em outra instância do AraLearn, tanto na web quanto no Android.

### 2.3 Ecossistema de autoria

O runtime do AraLearn convive com duas camadas autorais acima dele:

- `Disassembly`: linguagem declarativa para arquitetura pedagógica, dependências entre cards, sequência principal da lição e explicitação da lógica autoral que depois pode ser reproduzida pelo editor de cards;
- `AraLearn Factory`: compilador que transforma essas fontes em JSON compatível com o runtime.

Estado de publicação:

- a especificação pública do Disassembly está em <https://github.com/fabio-ara/Disassembly>;
- o AraLearn Factory ainda não está publicado.

---

## 2.4 Evolução pública

Linha pública atual:

- `v0.0.1` (`2026-03-26`): torna pública a base do motor, o contrato JSON das lições, o manual, a suíte inicial de validação, o catálogo inicial de contêineres do editor e o empacotamento Android em `WebView`. Na linha pública `0.0.x`, `heading`, `paragraph`, `image`, `table`, `simulator`, `editor`, `multiple_choice`, `flowchart` e `button` já aparecem aqui.
- `v0.0.2` (`2026-03-30`): amadurece a autoria visual, amplia o trabalho com pacotes `.zip`, fortalece a auditoria do catálogo embarcado e expande a cobertura automatizada de importação, persistência e formatação.
- `v0.0.3` (`2026-04-01`): aprofunda a prática com lacunas, tabelas, respostas por escolha e por digitação, incluindo variantes aceitas e apoio a expressões regulares quando necessário.
- `v0.0.4` (`2026-04-04`): reforça a integração entre runtime e Android, adiciona comentários por card e amplia a cobertura de comportamento móvel. Este marco não inaugura o APK; ele amplia a experiência Android já pública desde `v0.0.1`.
- `v0.0.5` (`2026-04-05`): estabiliza a tela de lição no `WebView` moderno, elimina o vão externo acima e abaixo da área útil e consolida preservação de rolagem, foco visual e comentário por card.

Esses marcos também estão resumidos em `CHANGELOG.md` e devem permanecer coerentes com as releases públicas do repositório.

### 2.5 Catálogo público de contêineres

Na linha pública atual, o catálogo inicial do editor de cards entrou junto em `v0.0.1`.

Contêineres publicados nesse marco:

- `heading`: título visual do card e origem preferencial de `step.title`;
- `paragraph`: explicação, teoria, enunciado e feedback textual;
- `image`: apoio visual embarcado por caminho lógico em `assets/images/...`;
- `table`: consulta estruturada e prática por células, inclusive com lacunas;
- `simulator`: exploração guiada com uma lacuna estrutural e resultado associado;
- `editor`: prática operacional com lacunas por escolha ou digitação, variantes e expressões regulares;
- `multiple_choice`: verificação objetiva por alternativas explícitas;
- `flowchart`: modelagem de algoritmos, processos e decisões com nós, ligações e lacunas;
- `button`: avanço do card e popup complementar quando houver.

Versões posteriores refinam contratos, autoria, validação, UX e integração Android desses mesmos contêineres, mas não redefinem esse catálogo público inicial.

---

## 3. Estrutura conceitual

Hierarquia:

```text
Aplicação
  -> Cursos
    -> Módulos
      -> Lições
        -> Steps
          -> Blocos
```

### 3.1 Aplicação

Campos principais:

- `appTitle`
- `courses[]`

### 3.2 Curso

Campos:

- `id`
- `title`
- `description`
- `modules[]`

### 3.3 Módulo

Campos:

- `id`
- `title`
- `lessons[]`

### 3.4 Lição

Campos:

- `id`
- `title`
- `subtitle`
- `steps[]`

### 3.5 Step

Tipos aceitos:

- `content`
- `lesson_complete`

Campos:

- `id`
- `type`
- `title`
- `subtitle` opcional
- `comment` opcional
- `blocks[]`

### 3.6 Bloco

Tipos suportados:

- `heading`
- `paragraph`
- `image`
- `table`
- `simulator`
- `editor`
- `multiple_choice`
- `flowchart`
- `button`

Regra estrutural:

- todo step editável termina com exatamente um bloco `button`;
- o botão final é persistido dentro de `blocks[]`;
- popup pertence ao bloco `button`, nunca ao step raiz.
- comentário pessoal do card pertence ao próprio `step`, não ao `button` nem a `popupBlocks[]`.

---

## 4. Arquitetura do projeto

### 4.1 Camada web

Arquivos centrais:

- `index.html`
- `app.js`
- `styles.css`
- `modules/`
- `content/`

Responsabilidades:

- `index.html`: ponto de entrada;
- `app.js`: estado, renderização, eventos, autoria, navegação, persistência e bootstrap do catálogo embarcado;
- `styles.css`: identidade visual e layout;
- `modules/`: funções puras e catálogos auxiliares;
- `content/`: fontes do catálogo embarcado e arquivo runtime gerado para o boot local.

### 4.2 Módulos principais

- `modules/app-utils.js`: ids, clonagem, limpeza e escapes;
- `modules/block-registry.js`: catálogo canônico de contêineres, ordem e metadados visuais;
- `modules/code-input.js`: normalização textual e validação do editor digitado;
- `modules/content-model.js`: normalização de conteúdo e defaults estruturais;
- `modules/file-helpers.js`: UTF-8, Data URL, ZIP e helpers binários;
- `modules/progress-helpers.js`: progresso e reconciliação;
- `modules/render-state.js`: preservação de scroll, foco e cursor;
- `modules/flowchart-shapes.js`: catálogo de formas de fluxograma;
- `modules/flowchart-layout.js`: layout e roteamento do fluxograma.

### 4.3 Camada Android

Arquivos centrais:

- `android/app/src/main/java/com/aralearn/app/MainActivity.java`
- `android/app/build.gradle.kts`

Responsabilidades:

- carregar a base web em `WebView`;
- respeitar insets das barras e áreas de gesto do sistema para manter a interface clicável no Android;
- fornecer seletor nativo de arquivo;
- fornecer salvamento nativo;
- encaminhar o botão voltar do Android para a navegação interna do app.

### 4.4 Referências técnicas

- Android em `WebView`: o tratamento de barras do sistema e teclado segue a documentação oficial de `WindowInsets` e `safe-area` no Android e no Chromium WebView.
  - Android Developers: <https://developer.android.com/develop/ui/views/layout/webapps/understand-window-insets>
  - Chromium WebView: <https://chromium.googlesource.com/chromium/src/+/HEAD/android_webview/docs/insets.md>
- Fluxogramas: o layout combina noções de teoria dos grafos, como ordenação topológica quando possível, identificação de arestas de retorno para laços e distribuição em camadas.
  - quando o motor externo entra em ação, o projeto usa ELK: <https://eclipse.dev/elk/>

---

## 5. Conteúdo e código-fonte

Regra atual:

- o motor não deve embutir cursos diretamente dentro de `app.js`;
- o catálogo embarcado oficial deve ficar separado em `content/`;
- o runtime local usa `content/hardcoded-content.js`, gerado a partir dos `.json` ativos em `content/`;
- a inicialização carrega primeiro o workspace local persistido e depois só complementa o que estiver faltando a partir do catálogo embarcado.

Consequências:

- o catálogo-padrão pode ser trocado sem editar o núcleo do app;
- o usuário pode editar localmente os cursos embarcados já carregados;
- em caso de conflito entre catálogo embarcado e workspace local, o conteúdo salvo localmente prevalece;
- cursos, módulos, lições e cards continuam não pertencendo ao código-fonte do motor;
- o manual não documenta cursos específicos;
- fixtures de teste podem existir na suíte, mas não no runtime do app.

Regras mínimas para o catálogo embarcado oficial:

- card de prática precisa ser autossuficiente no próprio step, sem depender do card anterior para contexto essencial;
- em prática com `table`, o próprio step precisa mostrar os casos, símbolos e valores de apoio necessários para resolver a grade; evite depender de rótulos como `Linha`, `linha 2` ou de uma tabela mostrada só em card anterior;
- em conteúdo de lógica com tabela-verdade, prefira nomear `casos`, `combinações` e leituras como `VV`, `VF`, `FV` e `FF`, em vez de apoiar a explicação em numeração de linhas;
- em exercícios de `table`, prefira lacunas atômicas por célula quando o objetivo didático for treinar um passo de raciocínio de cada vez;
- texto visível ao estudante não deve expor bastidor editorial como "o curso quer", "a lição quer", "blueprint", "formato mobile" ou comentários sobre adaptação ao app;
- texto visível ao estudante também não deve depender de frases genéricas de sequenciamento autoral, como "nos próximos cards", "use este checklist" ou "objetivo deste card";
- texto visível ao estudante também não deve falar sobre a própria mecânica didática com expressões como "no próprio card", "esta lição", "neste curso", "o app como motor" ou equivalentes, exceto quando o termo fizer parte do conteúdo técnico real, como `app.js`;
- cards recorrentes como `Vocabulário em foco`, `Confusões comuns` e `Fechamento rápido` precisam explicar o conceito ou o erro local da própria lição, em vez de reutilizar popup ou resumo genérico;
- `lesson_complete` deve trazer `heading` e `paragraph` centralizados já no JSON-fonte;
- o runtime pode reforçar visualmente o alinhamento central do `lesson_complete`, mas isso não substitui corrigir a fonte.
- quando o texto corrido mencionar sintaxe, comandos, tags, seletores, propriedades, atributos, métodos ou nomes de arquivo, a fonte deve preferir `richText` com destaque inline para esses fragmentos, em vez de deixá-los perdidos no parágrafo.
- em `editor` e `simulator`, sintaxe literal como `<p>`, `</div>` ou `<!DOCTYPE html>` não pode ser engolida pelo saneamento inline; o runtime precisa mostrá-la como código visível e comparar as respostas preservando essa literalidade.
- em popup de feedback, o conteúdo deve ir direto ao motivo técnico; evite frases como "você acertou" e evite repetir a alternativa correta quando ela já está visível no próprio card.
- imagens do catálogo embarcado precisam privilegiar leitura em viewport mobile, usar paleta compatível com o app e evitar texto corrido dentro do SVG; prefira poucos rótulos, formas grandes e contraste estável.
- em `editor` com `interactionMode: "choice"`, a ordem visual das opções deve vir por `displayOrder` embaralhado de forma não trivial; a ordem estrutural correta pertence a `slotOrder` e não deve vazar pela posição inicial das fichas.

---

## 6. Modelo lógico de dados

## 6.1 Conteúdo

```text
Aplicação:
  appTitle
  courses[]

Curso:
  id
  title
  description
  modules[]

Módulo:
  id
  title
  lessons[]

Lição:
  id
  title
  subtitle
  steps[]

Step:
  id
  type
  title
  comment opcional
  blocks[]

Bloco:
  id
  kind
  value
  richText opcional
  title opcional
  headers[] opcional
  rows[][] opcional
  options[] opcional
  nodes[] opcional
  links[] opcional
  popupEnabled opcional
  popupBlocks[] opcional
```

Em `table`, cada célula de `headers[]` e `rows[][]` também pode trazer:

- `blank` opcional;
- `interactionMode` opcional (`choice` ou `input`);
- `placeholder` opcional;
- `options[]` opcional para lacunas por escolha.

Regras complementares:

- o rótulo do botão final é implícito da interface e não pertence ao JSON;
- bloco `button` não persiste `value`.
- `step.comment` persiste comentário pessoal do card quando existir; comentário vazio pode ser omitido do JSON.

## 6.2 Progresso

Estrutura serializada:

```text
progress:
  lessons[] = {
    courseId
    moduleId
    lessonId
    currentStepId
    currentIndexHint
    furthestStepId
    furthestIndexHint
    updatedAt
  }
```

Regras:

- `currentIndexHint` e `furthestIndexHint` são zero-based;
- `furthest` nunca pode ficar antes de `current`;
- progresso órfão deve ser removido quando o conteúdo correspondente deixa de existir.

## 6.3 Assets

Estrutura interna:

```text
AssetStore:
  "assets/images/nome.ext" -> "data:image/...;base64,..."
```

Regras:

- o caminho lógico de imagem do app vive em `assets/images/`;
- imagens referenciadas devem poder entrar em pacotes ZIP;
- arquivos órfãos de imagem devem ser podados antes de persistir ou exportar.

---

## 7. Autoria

## 7.1 Regra geral

O app deve permitir que o usuário:

- crie cursos;
- crie módulos;
- crie lições;
- edite cards;
- adicione comentário pessoal por card;
- importe e exporte conteúdo;
- reorganize conteúdo com o mínimo de atrito possível.

Regras:

- comentário do card abre por ação fixa no rodapé da lição, ao lado do avanço principal, em popover próprio;
- o popover do comentário deve ocupar a largura útil do card e se reduzir à própria área de escrita, sem textos auxiliares nem CTA interno;
- mesmo com foco e teclado móvel, o popover do comentário continua restrito à área de escrita, sobe para a área superior útil acima do teclado, reduz a própria altura quando o viewport fica apertado e não pode invadir topbar, faixa `module - lesson`, barra de status ou safe area superior;
- esse comentário pertence ao `step`, não depende de popup do `button` e continua disponível mesmo em cards sem conteúdo extra no botão final;
- comentário vazio não precisa ocupar campo persistido.
- contêineres roláveis do app devem preservar a própria posição após re-renderizações da mesma view; quando um controle troca o alvo ativo, esse alvo precisa continuar visível dentro da sua área rolável.
- o produto deve permanecer compreensível para autor leigo, mesmo quando o card combinar mais de um tipo de prática.

## 7.2 Editor visual

O editor trabalha sobre um rascunho temporário em memória.

Fluxo:

```text
Abrir editor
  -> converter o step para formulário
  -> editar blocos
  -> salvar ou descartar
```

Regras:

- o botão final sempre existe;
- blocos não-botão podem ser movidos, removidos e reordenados;
- o botão final não é removível;
- o editor mantém um bloco ativo por vez para orientar foco visual e inserção;
- novos blocos entram logo após o bloco ativo; sem bloco ativo claro, entram antes do botão final;
- enquanto um bloco textual está em edição, ele fica destacado e os demais ficam visualmente atenuados;
- clicar na superfície de um contêiner também deve ativá-lo; se o clique não cair num campo específico, o foco vai para o primeiro elemento editável desse bloco;
- popup do botão usa o mesmo motor de blocos do editor principal;
- popup aceita todos os blocos, exceto `button`.
- ao sair de um campo rico de `editor` ou `simulator`, a normalização do conteúdo não deve roubar o foco do próximo bloco escolhido pelo autor.

O editor precisa deixar claro, sem exigir edição manual de JSON, que o autor pode:

- escolher entre `heading`, `paragraph`, `image`, `table`, `simulator`, `editor`, `multiple_choice`, `flowchart` e `button`;
- configurar lacunas por escolha e por digitação;
- definir quais opções são corretas e quais são incorretas;
- declarar variantes aceitas por lacuna;
- usar expressões regulares quando a validação exigir esse grau de flexibilidade;
- montar prática dentro de tabela, terminal e fluxograma;
- manter a mesma lógica de resposta quando o conteúdo for exportado e reimportado.

## 7.3 Ordem lógica da paleta

Critério pedagógico explícito:

- narrativa: `heading`, `paragraph`, `image`
- consulta: `table`
- exploração: `simulator`
- prática: `editor`
- checagem: `multiple_choice`
- modelagem lógica: `flowchart`

## 7.4 Cores dos contêineres

Critério semântico explícito:

- `heading`: âmbar
- `paragraph`: rosa quente
- `image`: ameixa
- `table`: cobre
- `simulator`: terracota
- `editor`: verde-petróleo
- `multiple_choice`: verde
- `flowchart`: oliva

## 7.5 Tipografia autoral

Critério visual explícito:

- `heading` deve parecer título de verdade, com sensação de versalete e contraste claro com `paragraph`;
- títulos do app, do card e do popup devem usar versalete real quando a fonte/navegador permitirem, sem forçar minúsculas artificiais;
- inputs e selects autorais usam tipografia um pouco menor e mais contida do que o conteúdo final, para reduzir ruído visual no mobile;
- campos autorais de `editor` e `simulator` usam tipografia monoespaçada e mais suave para leitura longa;
- superfícies de terminal no runtime usam mono mais leve, contraste menos agressivo e destaque dourado para expressões de linguagem quando o conteúdo assim pedir;
- quando o `editor` está em modo digitação, a digitação acontece diretamente dentro da própria lacuna do preview, com largura que cresce conforme o texto;
- no modo `digitação`, o app não entrega `hint` nem autocompletar da resposta ao estudante;
- o app deve priorizar legibilidade de estudo antes de mimetizar screenshots de conteúdo legado.

## 7.6 Diretrizes didáticas do motor

- o motor não é específico de Python nem de programação; ele precisa continuar útil para cursos de lógica, processos, administração, plataformas, planilhas e outras áreas;
- o autor pode alternar métodos de input dentro da mesma lição quando isso melhorar treino, retenção e variedade de prática;
- teoria tende a funcionar melhor em blocos enxutos, seguida por vários exercícios progressivos;
- a progressão ideal dentro da mesma lição parte de reconhecimento guiado, avança para produção e depois para combinação de habilidades já treinadas;
- tabelas servem bem para consulta e contraste;
- `multiple_choice` serve bem para discriminação;
- `editor` e `simulator` servem bem para prática operacional;
- `flowchart` serve bem para algoritmos, processos e decisões.

---

## 8. Regras dos blocos

## 8.1 Heading

- título visual do card;
- persiste alinhamento global do bloco no JSON;
- a autoria do `heading` expõe apenas alinhamento à esquerda, centralizado e à direita;
- o primeiro `heading` preenchido define o `title` do step.

## 8.2 Paragraph

- texto principal do card;
- suporta `richText` inline com `strong`, `em`, `br` e tons permitidos.
- `value` é o texto canônico legível do bloco e `richText` é a projeção visual rica equivalente;
- se vier apenas `richText`, o runtime pode derivar `value`; se os dois vierem em conflito semântico, `value` vence e `richText` é regenerado;
- persiste alinhamento global do bloco no JSON;
- a autoria do `paragraph` expõe alinhamento global à esquerda, centralizado e à direita, além dos destaques inline;
- uma quebra simples dentro do mesmo bloco deve renderizar como quebra de linha real, sem virar novo parágrafo;
- após aplicar cor inline, a seleção deve colapsar para evitar que todo o bloco permaneça selecionado.

## 8.3 Image

- persiste caminho lógico em `assets/images/...`;
- pode nascer de arquivo importado e virar arquivo interno do projeto.

## 8.4 Table

- tabela simples para consulta;
- aceita título opcional, cabeçalhos e linhas;
- o bloco nasce vazio, mas sempre preserva uma tabela mínima intuitiva com um cabeçalho e uma célula;
- a autoria da tabela acontece em uma grade direta, com digitação dentro das próprias células;
- cada célula pode alternar entre `Texto` e `Lacuna` sem deixar de usar a mesma grade de edição;
- o campo de título não usa label auxiliar;
- quando o foco está no título da tabela, a mesma barra de formatação da grade passa a agir sobre ele;
- quando o foco está numa célula, a configuração de lacuna aparece logo abaixo da grade e segue o mesmo idioma visual dos demais contêineres com `Opções` e `Digitação`;
- adicionar coluna e linha acontece na própria grade: a extrema direita expõe `+` para nova coluna e a última linha expõe `+` para nova linha;
- remover coluna e linha continua embutido na grade por `×`;
- o título da tabela usa o mesmo JSON de apresentação das células e também persiste alinhamento;
- o título da tabela nasce alinhado à esquerda e em negrito, mas pode desligar negrito, ganhar itálico, cor e novo alinhamento como qualquer outra célula;
- cabeçalhos nascem em negrito por padrão, mas cada célula pode ajustar negrito, itálico, cor e alinhamento de forma individual;
- os controles de alinhamento da tabela devem refletir a célula ativa em tempo real, com ícones visuais de alinhamento em vez de letras;
- o alinhamento padrão das células e do título da tabela é à esquerda;
- uma mesma tabela pode misturar lacunas por `Opções` e por `Digitação` em células diferentes;
- quando a tabela tiver ao menos uma lacuna, o runtime deve mostrar um guia breve indicando se o preenchimento usa `Opções`, `Digitação` ou ambos;
- a grade do editor preserva colunas e células vazias durante a autoria, mas o JSON salvo continua limpo, sem sobra estrutural vazia no resultado final;
- a coluna lateral de remover linha deve ocupar só a largura do próprio botão;
- a largura de cada coluna editável deve seguir o maior texto presente nela, sem largura mínima inflada artificialmente;
- no runtime, sentenças em cabeçalhos e células de `table` não devem quebrar automaticamente em múltiplas linhas; a tabela deve ganhar rolagem horizontal quando o conteúdo pedir mais largura;
- precisa permanecer legível em mobile.

## 8.5 Simulator

- seletor de opções com painel inferior associado;
- nenhuma opção nasce ativa por padrão;
- cada opção persiste `id`, `value` e `result`;
- a autoria usa o mesmo campo rico do `editor`, mas com exatamente uma única lacuna;
- a lacuna do template é visualmente destacada como chip autoral vazio, sem expor `[[...]]` cru nem texto técnico interno ao autor;
- a opção escolhida preenche a lacuna do template e atualiza o painel inferior;
- a ordem visual das opções não deve funcionar como dica involuntária da resposta;
- as opções do runtime usam o mesmo idioma visual de fichas do `editor`;
- não bloqueia avanço por padrão.

## 8.6 Editor

- exercício de lacunas baseado em marcadores `[[...]]`;
- suporta dois modos de interação:
  - `choice`: estudante preenche lacunas escolhendo opções visíveis;
  - `input`: estudante toca na lacuna e digita diretamente dentro dela no preview;
- as mesmas lacunas definidas no template servem para os dois modos; o que muda é apenas a forma de preenchimento;
- a troca entre `choice` e `input` não deve apagar silenciosamente a configuração do outro modo; o autor pode alternar e voltar;
- até o preview do terminal, a autoria dos dois modos deve parecer reutilizável: troca de modo, ferramentas de texto e preview ficam na mesma posição;
- em `choice`, opções habilitadas precisam corresponder aos marcadores;
- em `choice`, o runtime trata as opções como multiconjunto, não como conjunto: fichas repetidas como `#`, `"` ou operadores iguais precisam continuar disponíveis tantas vezes quanto o autor configurou ou o template exigir;
- aceita formatação inline segura e indentação;
- a autoria mostra lacunas como chips visuais, não como texto cru misturado ao restante;
- no modo `input`, o preview do autor mostra o próprio valor esperado em cada lacuna;
- a ordem visível das opções pode ser reordenada independentemente da ordem estrutural das lacunas;
- o JSON do bloco pode persistir:
  - `interactionMode`
  - `options[]` com `id`, `value`, `enabled`, `displayOrder` e `slotOrder`
  - no modo `input`, cada opção também pode persistir `regex` e `variants[]`
- `displayOrder` governa apenas a ordem visual das fichas;
- `slotOrder` governa a ordem estrutural das lacunas corretas no template;
- em `choice`, embaralhar as fichas não deve reescrever a ordem canônica do código ou do texto mostrado no card;
- na autoria do modo `input`, a interface deve expor só o essencial:
  - escolha entre `Opções` e `Digitação`;
  - preview do terminal;
  - lista de opções na mesma ordem visual do modo `Opções`;
  - linha principal com `Arrastar opção`, `Habilitar/Desabilitar lacuna`, toggle `(.*)`, textbox, `Adicionar variante` e `Remover opção`;
  - linhas de variante alinhadas à principal, com apenas toggle `(.*)`, textbox e `Remover variante`;
- quando a própria estrutura já explica a autoria, o modo `input` deve evitar textos auxiliares dentro do contêiner;
- placeholders e textos-padrão do modo `input` devem ser breves o bastante para não estourar nos campos compactos do mobile;
- na autoria de blocos textuais, os controles de negrito, itálico, cor e indentação devem ficar imediatamente acima da área editável;
- ao selecionar um trecho já formatado, os controles inline devem refletir esse estado visualmente; acionar o mesmo controle sobre uma seleção totalmente já marcada deve remover o estilo, e não duplicá-lo;
- por padrão, o modo `input` valida cada lacuna por comparação textual normalizada;
- variantes literais entram por lacuna, sem exigir duplicação do template inteiro;
- regex é um recurso avançado por lacuna ou variante, não o fluxo principal;
- por padrão, o motor não descobre sozinho soluções semanticamente equivalentes nem "sinônimos" de código que produzam o mesmo resultado;
- no runtime de `choice`, a primeira lacuna vazia começa selecionada automaticamente;
- no runtime de `choice`, ao preencher uma lacuna, a seleção avança para a próxima lacuna vazia na ordem do template;
- tocar numa lacuna vazia permite redirecionar explicitamente a próxima ficha para ela;
- clicar numa lacuna já preenchida remove o valor atual e deixa essa mesma lacuna pronta para receber outra ficha;
- se uma lacuna do `editor` for salva vazia, ela deve ser eliminada do template em vez de permanecer como placeholder vazio;
- quebras de linha imediatamente antes ou depois de lacunas devem ser preservadas na autoria e no runtime.
- o campo `value` do `editor` é o template bruto canônico e usa `\n` como quebra de linha persistida;
- linhas vazias intermediárias e espaços iniciais de cada linha fazem parte do contrato do `value` e não podem ser colapsados ao editar, salvar, exportar ou reimportar;
- fora das próprias lacunas `[[...]]`, autoria, preview e runtime precisam usar a mesma renderização literal do terminal: tags HTML fora do conjunto inline aprovado aparecem como código visível, e não como estrutura interpretada;
- valores de opções e variantes do `editor` não podem sofrer `trim` destrutivo se esse whitespace fizer parte da resposta canônica declarada;
- o conteúdo do terminal pode usar ênfase inline segura para destacar expressões de linguagem, como `print()`, sem perder portabilidade no JSON.

## 8.7 Multiple choice

- persistência por `answerState` no bloco e por alternativas com `id`, `value` e `answer`;
- o bloco não tem enunciado próprio; o autor deve usar `paragraph` antes dele quando quiser contexto;
- autoria marca quais alternativas pertencem ao conjunto de resposta;
- autoria também define por rádio se esse conjunto representa alternativas corretas ou incorretas;
- os rádios `Corretas` e `Incorretas` reaproveitam o mesmo idioma visual de `Opções` e `Digitação`, sem card explicativo extra;
- no runtime, a cor e a marca das alternativas selecionadas seguem apenas o `answerState` do bloco;
- isso é um idioma visual fixo do modo do exercício, não uma pista sobre quais alternativas individuais pertencem à resposta;
- o feedback final de acerto continua sendo `Correto.` independentemente do `answerState`;
- validação exige igualdade exata entre o conjunto esperado e o conjunto marcado.

## 8.8 Flowchart

- exercício de fluxograma com até duas saídas por nó;
- suporta lacunas de símbolo e texto;
- para nós `decision` com duas saídas, a convenção padrão do produto é:
  - saída esquerda (`outputSlot: 0`) = `Não`
  - saída direita (`outputSlot: 1`) = `Sim`
- na autoria, quando um losango tiver duas saídas ativas, os labels padrão devem aparecer já preenchidos nos campos, e não apenas como sugestão vaga;
- placeholders dos campos compactos devem usar rótulos breves, evitando truncamento visual;
- o combobox de símbolo deve alinhar visualmente o início dos textos das opções, mesmo quando os glifos das formas têm larguras diferentes;
- layout precisa privilegiar legibilidade, laços e convergências;
- em fluxogramas top-down, saídas laterais do losango devem evitar estrangulamento visual, dobras supérfluas, sobreposição com blocos e cruzamento desnecessário de setas;
- quando houver caminho ortogonal direto livre entre a saída lateral e o bloco de destino, esse caminho mais simples deve ser preferido.
- o arranjo automático deve preservar a leitura de cima para baixo, tratar laços como arestas de retorno e evitar cruzamentos desnecessários sempre que a estrutura do grafo permitir.

## 8.9 Button

- é o bloco final do step;
- pode avançar diretamente ou abrir popup inline;
- popup persiste em `popupBlocks[]`;
- o CTA da lição vive fora do card, preso ao rodapé fixo da tela;
- o comentário do card compartilha esse rodapé como ação irmã, mas usa popover fixo independente de `popupBlocks[]`;
- esse popover segue a largura útil do card e evita rótulos textuais visíveis, ficando restrito à área de escrita e fechando pelo mesmo ícone do rodapé ou por clique fora;
- o popup aberto usa esse mesmo rodapé como âncora visual, mas sobrepõe a parte inferior do card sem redimensionar o conteúdo atrás.

## 8.10 Fidelidade entre autoria, JSON e runtime

Princípio central:

- o JSON precisa ser legível para humanos e para fluxos de autoria assistida, mas só é confiável se cada contêiner deixar explícito qual campo é estrutural, qual campo é apenas visual e o que o motor pode ou não derivar sem mudar o sentido didático do card.

Contrato por contêiner:

- `step.comment`: comentário pessoal opcional do card. A fonte de verdade é o texto persistido no próprio `step`; o runtime apenas o edita em popover fixo e exportação/importação precisam devolvê-lo sem movê-lo para `blocks[]`, progresso ou metadados de pacote.
- `heading`: `value` e `align` são a fonte de verdade; o runtime pode reaproveitar o primeiro `heading` preenchido como `step.title`, mas não inventa formatação inline nem subtítulo.
- `paragraph`: `value` é o texto canônico; `richText` é a visualização rica equivalente. O motor pode derivar um a partir do outro quando não houver ambiguidade, mas não deve preservar `richText` que contradiga o texto canônico. Em `lesson_complete`, `paragraph.align` e `heading.align` devem vir como `center`.
- `image`: `value` é o caminho lógico ou data URL resolvida; o runtime apenas carrega esse recurso e não deduz legenda, recorte ou contexto.
- `table`: a ordem de `headers[]` e `rows[][]` é a ordem de renderização; não há ordenação automática. Estilo é por célula inteira, não por trecho interno. Quando a célula traz `blank: true`, `value` continua sendo a resposta canônica daquela posição, `interactionMode: "choice"` usa `options[]` visíveis só para aquela célula e `interactionMode: "input"` libera digitação direta. Se não houver lacunas, a tabela continua apenas expositiva; se houver, ela participa da validação do card.
- `table`: em leitura e prática, sentenças devem permanecer íntegras numa linha visual quando não houver quebra autoral explícita; o motor prefere expandir a largura útil da tabela e deixar a rolagem horizontal no contêiner, em vez de partir a sentença automaticamente dentro da célula.
- `simulator`: o template e a ordem de `options[]` definem a experiência. Existe exatamente uma lacuna estrutural e cada opção injeta seu `value` nela, mostrando `result` abaixo. O motor não "corrige" opções nem infere avaliação semântica, porque o bloco é de exploração, não de prova. O runtime não deve pré-selecionar automaticamente a primeira opção.
- `editor`: o template em `value` e as opções habilitadas são a fonte de verdade. `value` persiste com quebras `\n`, preserva linhas vazias intermediárias e espaços iniciais de cada linha, e continua legível no JSON mesmo quando o preview usa chips para `[[...]]`. `slotOrder` define a ordem estrutural das lacunas corretas; `displayOrder` define apenas a ordem visual das fichas. Duplicatas são válidas e precisam continuar distintas. Em `choice`, o runtime preenche a lacuna atualmente selecionada e, por padrão, mantém selecionada a primeira lacuna vazia na ordem do template. Em `input`, variantes aceitas precisam estar declaradas; o runtime não inventa equivalências de código, fórmula ou comando. Exportação e importação precisam devolver exatamente o mesmo `value`, salvo a canonicalização de quebra para `\n`.
- `multiple_choice`: a ordem do array é a ordem visível no runtime, porque o bloco não tem `displayOrder`. `answerState` define só o idioma visual do selecionado; quem define o conjunto esperado é `option.answer`. O motor não usa cor para "descobrir" resposta.
- `flowchart`: `nodes[]` e `links[]` definem o diagrama; opções extras por nó definem as lacunas praticáveis. `outputSlot` governa a lateralidade da seta e, em decisão binária, sustenta a convenção `Não` à esquerda e `Sim` à direita. O runtime valida apenas símbolo e texto das lacunas abertas, não a "intenção algorítmica" inteira fora do que foi explicitado.
- `button`: o botão final governa o avanço do step e, opcionalmente, o popup. `popupBlocks[]` pertencem ao próprio botão. O runtime primeiro exige a resolução dos exercícios do card principal e, se o popup também tiver exercícios, exige a resolução deles antes de continuar.

O que o motor pode derivar com segurança:

- `step.title` a partir do primeiro `heading`;
- `paragraph.value` a partir de `richText` equivalente, ou `richText` a partir de `value`;
- a lacuna única do `simulator`;
- rótulos padrão `Não` e `Sim` em decisões binárias do `flowchart`;
- o bloco final `button`, quando ausente.

O que o motor não deve adivinhar:

- equivalência semântica de resposta não declarada em `editor`;
- alternativas corretas de `multiple_choice` a partir de aparência;
- ordem canônica de lacunas a partir de `displayOrder`;
- novos blocos didáticos, novos pré-requisitos ou novos conceitos não expressos no JSON;
- comportamento de avaliação para `image`, `paragraph` ou `simulator`;
- respostas aceitas de lacunas de `table` além do `value` e das `options[]` explicitadas.

---

## 9. Navegação

Estados principais:

- menu principal;
- menu do curso;
- lição;
- editor;
- editor de popup.

Fluxo base:

```text
Abrir app
  -> carregar workspace local
  -> limpar progresso órfão
  -> mostrar menu principal

Abrir curso
  -> listar módulos e lições

Abrir lição
  -> retomar do step salvo

Avançar step
  -> salvar progresso
  -> ir ao próximo step
```

Regras de layout da lição:

- telas de cursos e módulos mantêm cards em altura natural, sem esticar para preencher a viewport;
- a rail lateral de ações globais e a barra inferior de ações usam a mesma espessura compacta, com botões centralizados no eixo mais estreito;
- o card atual ocupa toda a área útil entre o topo da lição e o rodapé fixo;
- o vão visual entre card e dock fixa deve permanecer compacto; insets Android só acrescentam o espaço estritamente necessário para barras, gesto inferior e IME;
- a faixa `module - lesson` acima do card reserva sempre duas linhas, mesmo quando o título ocupa pouco espaço, para manter a mesma altura útil do card e do comentário entre lições diferentes;
- quando um `editor` em modo digitação está ativo, a lacuna continua sendo editada dentro do próprio preview, sem abrir compositor separado no rodapé;
- se o conteúdo ocupar pouco espaço, o card continua até o rodapé, mesmo com espaço vazio;
- se o conteúdo ultrapassar a altura disponível, a rolagem acontece dentro do card, não no rodapé fixo;
- quando uma validação gera `inline-feedback`, a visibilidade do card prioriza a própria mensagem; sem feedback novo, o runtime preserva a lacuna ou seleção ativa dentro do contêiner rolável atual;
- no mobile, o gesto de arrastar deve rolar o conteúdo do card sem deslocar o CTA do rodapé.

---

## 10. Persistência

AraLearn usa duas camadas complementares.

## 10.1 Workspace local

Persistência imediata no armazenamento do navegador ou do `WebView`.

Inclui:

- conteúdo normalizado;
- progresso serializado;
- mapa dos arquivos de imagem efetivamente usados;
- `updatedAt`.

Objetivo:

- sobreviver a reload e reinício local;
- reduzir perda de trabalho entre edições.

## 10.2 Armazenamento local persistente

O estado editável vive dentro do armazenamento local da plataforma.

Objetivo:

- salvar autoria e progresso em tempo real;
- permitir continuar trabalhando sem depender de arquivo externo aberto;
- manter o fluxo principal simples: importar para dentro do app e exportar quando quiser.

Comportamento:

- web e Android persistem o workspace internamente;
- conteúdo e progresso são atualizados em tempo real no armazenamento local;
- comentários pessoais por card entram no mesmo snapshot local do workspace;
- importação cria ou altera conteúdo interno;
- exportação gera um pacote portátil sob demanda;
- não existe conceito de arquivo ativo, biblioteca de arquivos aprovados ou autosave externo.

## 10.3 Bootstrap do catálogo embarcado

O catálogo embarcado não substitui cegamente o workspace local.

Comportamento:

- o app lê `content/hardcoded-content.js` no boot;
- esse arquivo é gerado a partir dos `.json` ativos em `content/`;
- o catálogo embarcado entra como semente complementar;
- se o usuário já tiver editado localmente o mesmo curso, módulo, lição, step ou bloco, a versão local prevalece;
- itens ausentes no armazenamento local podem ser acrescentados a partir do catálogo embarcado sem apagar o restante;
- trocar o catálogo oficial não exige editar o motor, apenas atualizar os JSONs-fonte e regenerar o runtime.

---

## 11. Pacotes de importação e exportação

## 11.1 Formato principal

Formato canônico:

- `ZIP`

Conteúdo:

- `project.json`
- `assets/images/...` apenas para arquivos realmente usados

Metadados obrigatórios em `project.json`:

- `packageMeta.format`
- `packageMeta.scope`
- `packageMeta.exportedAt`
- `packageMeta.appTitle`

Metadados condicionais:

- `packageMeta.source` em exportações de `course`, `module` e `lesson`

Formato atual:

- `aralearn-package-v3`

## 11.2 Escopos

Escopos suportados:

- `app`
- `course`
- `module`
- `lesson`

Regra:

- `app` representa o workspace inteiro;
- `course`, `module` e `lesson` representam recortes do workspace;
- exportação localizada por menu contextual continua disponível para curso, módulo e lição.

## 11.3 Regras de importação

- aceitar ZIP exportado pelo app;
- aceitar ZIP `stored` e ZIP com compressão `DEFLATE`;
- aceitar JSON compatível;
- exigir `project.json` dentro do `.zip`;
- detectar escopo real do pacote;
- adaptar o arquivo ao contêiner atual quando houver compatibilidade hierárquica;
- permitir:
  - `app` receber `app` ou `course`
  - `course` receber `course` ou `module`
  - `module` receber `module` ou `lesson`
  - `lesson` receber `lesson`
- ao detectar item equivalente no destino, oferecer pelo menos `Mesclar`, `Substituir` e `Cancelar`; quando o escopo permitir duplicação localizada, manter também `Duplicar`;
- `Mesclar` deve preservar o que já existe e acrescentar apenas cursos, módulos, lições, steps, blocos, popupBlocks e comentários de step ainda ausentes;
- quando o escopo do arquivo for menor que o do ponto de importação compatível, inserir o conteúdo no contêiner atual com mensagem informativa;
- rejeitar apenas combinações sem contêiner compatível;
- normalizar conteúdo, progresso e arquivos de apoio;
- falhar com mensagem distinta para ZIP corrompido, `project.json` ausente, JSON inválido, arquivo de imagem ausente e método de compressão realmente não suportado;
- podar arquivos órfãos de imagem;
- reconciliar progresso;
- persistir o resultado.

## 11.4 Regras de exportação

- exportar apenas o conteúdo do escopo pedido;
- exportar apenas imagens realmente referenciadas;
- manter JSON legível;
- preservar `step.comment` quando o card tiver comentário pessoal;
- preservar dados necessários para reimportação;
- manter `project.json` acessível para inspeção manual dentro do `.zip`.

---

## 12. Web

## 12.1 Execução

O app deve funcionar ao abrir `index.html` em Chrome no Windows.

## 12.2 Persistência e arquivos

No navegador:

- o workspace fica persistido no armazenamento interno disponível;
- o catálogo embarcado separado em `content/` é lido no boot apenas como semente complementar;
- `Importar` lê um pacote e aplica o conteúdo no workspace atual;
- `Exportar` baixa um `.zip` do escopo pedido;
- não existe vínculo contínuo com arquivo externo.

## 12.3 Publicação estática

Na publicação estática do projeto:

- o artefato precisa incluir `index.html`, `app.js`, `styles.css`, `assets/`, `modules/` e `content/`;
- o runtime do catálogo embarcado deve ser regenerado antes do deploy, para manter `content/hardcoded-content.js` coerente com os JSONs-fonte ativos.

---

## 13. Android

No APK:

- o conteúdo roda na mesma base web;
- o catálogo embarcado separado em `content/` acompanha o pacote web empacotado;
- o wrapper Android usa edge-to-edge no `Activity`, preservando `adjustResize` para que o teclado móvel continue reposicionando o conteúdo web;
- a compensação principal das barras do sistema acontece no layout web por meio de `safe-area-inset-*`; painéis inferiores, rodapé fixo e popovers precisam respeitar essas áreas;
- em `WebView` moderno, não reespelhe `systemBars` e `IME` para o CSS por variáveis customizadas; deixe o próprio `WebView` entregar `safe-area-inset-*` e redimensionar a viewport;
- o corte conservador adotado no wrapper é Chromium `140`: acima disso, o caminho padrão fica só com `safe-area` e `adjustResize`; abaixo disso, o fallback legado aplica padding nativo direto na `WebView` e zera os insets consumidos pelo conteúdo;
- ao revisar insets no Android com `WebView`, evite duplicar compensação entre padding nativo e CSS, porque isso amplia recuos e pode quebrar o resize do teclado;
- no `WebView` moderno, o IME já altera a área visível por viewport; por isso, evite reconstruir o teclado na camada web com overlays fixos e padding extra, sobretudo para componentes de edição;
- o respiro entre topo, card e dock da lição é um espaçamento interno do layout; ele não deve ser confundido com compensação de barra do sistema nem somado ao inset externo;
- o comentário do card deve permanecer no fluxo normal da tela de lição, logo abaixo da faixa `module - lesson`, para ficar visível perto do topo quando o teclado abre e não criar sobreposição artificial sobre o conteúdo.
- a tela de lição não deve reintroduzir vão externo acima da barra superior nem abaixo do rodapé de ações em `WebView` moderno; esse comportamento passou a ser um marco fixo do produto.
- importação usa seletor nativo;
- exportação usa seletor nativo;
- o workspace fica persistido dentro do `WebView`;
- o botão voltar do Android consulta a navegação interna antes de fechar a activity.

---

## 14. Validação

Validações obrigatórias:

- `node ./scripts/audit-course-content.mjs`
- `npm run test:unit`
- `npm run test:e2e`
- `pwsh -NoProfile -File ./scripts/validate.ps1`
- build Android de debug dentro do fluxo completo
- o APK publicado manualmente deve sair do mesmo ciclo validado; se a versão já existir e o problema estiver só no binário anexado, substitua o arquivo da release existente em vez de abrir uma nova versão sem mudança funcional

Regras operacionais do E2E web:

- o Playwright usa `http://127.0.0.1:4273` por padrão para não colidir com outros previews locais;
- a porta pode ser sobrescrita com `ARALEARN_TEST_PORT`;
- o reaproveitamento de servidor só é aceito quando `GET /healthz` devolver a assinatura do servidor de teste do app.

Cobertura mínima esperada:

- boot com catálogo embarcado separado;
- auditoria do catálogo embarcado contra textos de bastidor, dependência de card anterior e desalinhamento de `lesson_complete`;
- `simulator` sem pré-seleção automática de opção;
- preservação de edição local sobre os mesmos cursos embarcados;
- retomada de progresso;
- edição e persistência de cards;
- comentário fixo por card com round-trip em exportação/importação;
- popup estruturado;
- paleta e formatação textual;
- inserção após bloco ativo e foco visual do editor;
- quebra simples de linha em `paragraph` e `editor`;
- importação e exportação por pacote;
- adaptação de escopo compatível na importação;
- decisão entre mesclar, substituir, duplicar e cancelar quando houver colisão;
- fluxograma em edição e prática.

---

## 15. Invariantes

Estas regras devem continuar verdadeiras:

- o app funciona sem backend;
- o motor continua separado do catálogo embarcado;
- o catálogo oficial vive fora do núcleo do motor, em `content/`;
- o workspace local do usuário prevalece sobre a mesma trilha já salva;
- o manual documenta o motor, não o catálogo do usuário;
- todo step editável termina com um único bloco `button`;
- comentário pessoal do card vive em `step.comment`, fora de `blocks[]`, popup do botão e progresso;
- popup do botão vive em `popupBlocks[]`;
- `buttonText` não existe no modelo canônico;
- bloco `button` não carrega texto persistido;
- conteúdo e progresso sobrevivem a reload quando o armazenamento da plataforma permitir;
- importação e exportação são as únicas operações externas de arquivo;
- exportação ZIP continua portátil entre web e Android;
- o APK empacota a mesma base web da raiz do projeto;
- no Android moderno, a tela de lição permanece sem vão externo extra acima e abaixo do conteúdo;
- progresso órfão é removido;
- arquivos órfãos de imagem são podados;
- fluxograma aceita no máximo duas saídas por nó;
- texto de nó em `flowchart` precisa caber inteiro de forma legível; no mobile, o zoom inicial do quadro deve priorizar a largura do diagrama e deixar a rolagem vertical cuidar da altura total, em vez de achatar o conteúdo;
- o editor continua compreensível para autor leigo.

---

## 16. Protocolo de mudança

Toda mudança relevante deve seguir este ciclo:

```text
1. Ler o pedido
2. Ler o manual
3. Identificar o impacto
4. Alterar o código
5. Atualizar o manual
6. Validar fluxo e persistência
```

Checklist mínimo:

- o app continua independente do conteúdo?
- se o catálogo embarcado em `content/` mudou, o runtime gerado foi atualizado no mesmo ciclo?
- a persistência continua coerente na web e no Android?
- o pacote ZIP continua reimportável?
- o editor continua intuitivo?
- a mudança deixou código legado ou duplicado?
- a suíte aplicável passou?
