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
- estudante: navega por lições curtas e retoma o progresso salvo.

Princípios do produto:

- offline-first;
- mobile-first;
- sem backend obrigatório;
- mesma base web para navegador e APK;
- conteúdo mutável e externo ao núcleo do motor;
- o app pode embarcar um curso-padrão separado em `content/`, sem misturar esse hardcoded ao código do motor;
- suporte a cursos de naturezas diferentes, como programação, administração, processos, ferramentas e disciplinas teóricas;
- combinação livre de narrativa, tabela, terminal, múltipla escolha, simulador e fluxograma conforme o objetivo didático;
- persistência local imediata;
- portabilidade por pacote com JSON e imagens;
- ações fixas de lição vivem no rodapé e sobreposições do botão final ocupam esse mesmo rodapé, sem duplicar CTA;
- superfícies-base evitam sombras grandes e retangulares que façam a interface parecer uma moldura dentro da tela.

O app é fixo.

O conteúdo é mutável.

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
- `app.js`: estado, renderização, eventos, autoria, navegação, persistência e bootstrap do hardcoded separado;
- `styles.css`: identidade visual e layout;
- `modules/`: funções puras e catálogos auxiliares;
- `content/`: fonte do curso hardcoded e arquivo runtime gerado para o boot local.

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
- fornecer seletor nativo de arquivo;
- fornecer salvamento nativo;
- encaminhar o botão voltar do Android para a navegação interna do app.

---

## 5. Conteúdo e código-fonte

Regra atual:

- o motor não deve embutir cursos diretamente dentro de `app.js`;
- o hardcoded oficial deve ficar separado em `content/`;
- o runtime local usa `content/hardcoded-content.js`, gerado a partir do único `.json` ativo em `content/`;
- a inicialização carrega primeiro o workspace local persistido e depois só complementa o que estiver faltando a partir do hardcoded.

Consequências:

- o curso-padrão pode ser trocado sem editar o núcleo do app;
- o usuário pode editar localmente o curso hardcoded já carregado;
- em caso de conflito entre hardcoded e workspace local, o conteúdo salvo localmente prevalece;
- cursos, módulos, lições e cards continuam não pertencendo ao código-fonte do motor;
- o manual não documenta cursos específicos;
- fixtures de teste podem existir na suíte, mas não no runtime do app.

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

Regras complementares:

- o rótulo do botão final é implícito da interface e não pertence ao JSON;
- bloco `button` não persiste `value`.

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
- assets órfãos devem ser podados antes de persistir ou exportar.

---

## 7. Autoria

## 7.1 Regra geral

O app deve permitir que o usuário:

- crie cursos;
- crie módulos;
- crie lições;
- edite cards;
- importe e exporte conteúdo;
- reorganize conteúdo com o mínimo de atrito possível.

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
- teoria tende a funcionar melhor em blocos curtos, seguida por vários exercícios progressivos;
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
- pode nascer de arquivo importado e virar asset interno.

## 8.4 Table

- tabela simples para consulta;
- aceita título opcional, cabeçalhos e linhas;
- o bloco nasce vazio, mas sempre preserva uma tabela mínima intuitiva com um cabeçalho e uma célula;
- a autoria da tabela acontece em uma grade direta, com digitação dentro das próprias células;
- o campo de título não usa label auxiliar;
- quando o foco está no título da tabela, a mesma barra de formatação da grade passa a agir sobre ele;
- adicionar coluna e linha acontece na própria grade: a extrema direita expõe `+` para nova coluna e a última linha expõe `+` para nova linha;
- remover coluna e linha continua embutido na grade por `×`;
- o título da tabela usa o mesmo JSON de apresentação das células e também persiste alinhamento;
- o título da tabela nasce alinhado à esquerda e em negrito, mas pode desligar negrito, ganhar itálico, cor e novo alinhamento como qualquer outra célula;
- cabeçalhos nascem em negrito por padrão, mas cada célula pode ajustar negrito, itálico, cor e alinhamento de forma individual;
- os controles de alinhamento da tabela devem refletir a célula ativa em tempo real, com ícones visuais de alinhamento em vez de letras;
- o alinhamento padrão das células e do título da tabela é à esquerda;
- a grade do editor preserva colunas e células vazias durante a autoria, mas o JSON salvo continua limpo, sem sobra estrutural vazia no resultado final;
- a coluna lateral de remover linha deve ocupar só a largura do próprio botão;
- a largura de cada coluna editável deve seguir o maior texto presente nela, sem largura mínima inflada artificialmente;
- precisa permanecer legível em mobile.

## 8.5 Simulator

- seletor de opções com painel inferior associado;
- a primeira opção válida nasce ativa;
- cada opção persiste `id`, `value` e `result`;
- a autoria usa o mesmo campo rico do `editor`, mas com exatamente uma única lacuna;
- a lacuna do template é visualmente destacada como chip autoral vazio, sem expor `[[...]]` cru nem texto técnico interno ao autor;
- a opção ativa preenche a lacuna do template e atualiza o painel inferior;
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
- placeholders e textos-padrão do modo `input` devem ser curtos o bastante para não estourar nos campos compactos do mobile;
- na autoria de blocos textuais, os controles de negrito, itálico, cor e indentação devem ficar imediatamente acima da área editável;
- ao selecionar um trecho já formatado, os controles inline devem refletir esse estado visualmente; acionar o mesmo controle sobre uma seleção totalmente já marcada deve remover o estilo, e não duplicá-lo;
- por padrão, o modo `input` valida cada lacuna por comparação textual normalizada;
- variantes literais entram por lacuna, sem exigir duplicação do template inteiro;
- regex é um recurso avançado por lacuna ou variante, não o fluxo principal;
- por padrão, o motor não descobre sozinho soluções semanticamente equivalentes nem "sinônimos" de código que produzam o mesmo resultado;
- no runtime de `choice`, tocar numa lacuna vazia a torna alvo explícito da próxima ficha;
- se nenhuma lacuna estiver selecionada, o runtime tenta colocar a ficha numa lacuna vazia compatível com aquela resposta; se houver mais de uma possibilidade igual, usa a primeira ainda vazia;
- clicar numa lacuna já preenchida remove o valor atual e deixa essa mesma lacuna pronta para receber outra ficha;
- se uma lacuna do `editor` for salva vazia, ela deve ser eliminada do template em vez de permanecer como placeholder vazio;
- quebras de linha imediatamente antes ou depois de lacunas devem ser preservadas na autoria e no runtime.
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
- placeholders dos campos compactos devem usar rótulos curtos, evitando truncamento visual;
- o combobox de símbolo deve alinhar visualmente o início dos textos das opções, mesmo quando os glifos das formas têm larguras diferentes;
- layout precisa privilegiar legibilidade, laços e convergências;
- em fluxogramas top-down, saídas laterais do losango devem evitar estrangulamento visual, dobras supérfluas, sobreposição com blocos e cruzamento desnecessário de setas;
- quando houver caminho ortogonal direto livre entre a saída lateral e o bloco de destino, esse caminho mais simples deve ser preferido.

## 8.9 Button

- é o bloco final do step;
- pode avançar diretamente ou abrir popup inline;
- popup persiste em `popupBlocks[]`;
- o CTA da lição vive fora do card, preso ao rodapé fixo da tela;
- o popup aberto usa esse mesmo rodapé como âncora visual, mas sobrepõe a parte inferior do card sem redimensionar o conteúdo atrás.

## 8.10 Fidelidade entre autoria, JSON e runtime

Princípio central:

- o JSON precisa ser legível para humanos e para geração por LLM, mas só é confiável se cada contêiner deixar explícito qual campo é estrutural, qual campo é apenas visual e o que o motor pode ou não derivar sem mudar o sentido didático do card.

Contrato por contêiner:

- `heading`: `value` e `align` são a fonte de verdade; o runtime pode reaproveitar o primeiro `heading` preenchido como `step.title`, mas não inventa formatação inline nem subtítulo.
- `paragraph`: `value` é o texto canônico; `richText` é a visualização rica equivalente. O motor pode derivar um a partir do outro quando não houver ambiguidade, mas não deve preservar `richText` que contradiga o texto canônico.
- `image`: `value` é o caminho lógico ou data URL resolvida; o runtime apenas carrega esse recurso e não deduz legenda, recorte ou contexto.
- `table`: a ordem de `headers[]` e `rows[][]` é a ordem de renderização; não há ordenação automática. Estilo é por célula inteira, não por trecho interno, e a tabela não participa de validação de resposta.
- `simulator`: o template e a ordem de `options[]` definem a experiência. Existe exatamente uma lacuna estrutural e cada opção injeta seu `value` nela, mostrando `result` abaixo. O motor não "corrige" opções nem infere avaliação semântica, porque o bloco é de exploração, não de prova.
- `editor`: o template em `value` e as opções habilitadas são a fonte de verdade. `slotOrder` define a ordem estrutural das lacunas corretas; `displayOrder` define apenas a ordem visual das fichas. Duplicatas são válidas e precisam continuar distintas. Em `input`, variantes aceitas precisam estar declaradas; o runtime não inventa equivalências de código, fórmula ou comando.
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
- comportamento de avaliação para `table`, `image`, `paragraph` ou `simulator`.

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
- a rail lateral de ações globais e a barra inferior de ações usam a mesma espessura compacta, com botões centralizados no eixo curto;
- o card atual ocupa toda a área útil entre o topo da lição e o rodapé fixo;
- quando um `editor` em modo digitação está ativo, a lacuna continua sendo editada dentro do próprio preview, sem abrir compositor separado no rodapé;
- se o conteúdo for curto, o card continua até o rodapé, mesmo com espaço vazio;
- se o conteúdo ultrapassar a altura disponível, a rolagem acontece dentro do card, não no rodapé fixo;
- no mobile, o gesto de arrastar deve rolar o conteúdo do card sem deslocar o CTA do rodapé.

---

## 10. Persistência

AraLearn usa duas camadas complementares.

## 10.1 Workspace local

Persistência imediata no armazenamento do navegador ou do `WebView`.

Inclui:

- conteúdo normalizado;
- progresso serializado;
- mapa de assets efetivamente usados;
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
- importação cria ou altera conteúdo interno;
- exportação gera um pacote portátil sob demanda;
- não existe conceito de arquivo ativo, biblioteca de arquivos aprovados ou autosave externo.

## 10.3 Bootstrap do hardcoded

O curso-padrão embarcado não substitui cegamente o workspace local.

Comportamento:

- o app lê `content/hardcoded-content.js` no boot;
- esse arquivo é gerado a partir do único `.json` ativo em `content/`;
- o hardcoded entra como semente complementar;
- se o usuário já tiver editado localmente o mesmo curso, módulo, lição, step ou bloco, a versão local prevalece;
- itens ausentes no armazenamento local podem ser acrescentados a partir do hardcoded sem apagar o restante;
- trocar o hardcoded oficial não exige editar o motor, apenas atualizar o JSON-fonte e regenerar o runtime.

---

## 11. Pacotes de importação e exportação

## 11.1 Formato principal

Formato canônico:

- `ZIP`

Conteúdo:

- `project.json`
- `assets/images/...` apenas para assets realmente usados

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
- aceitar JSON compatível;
- detectar escopo real do pacote;
- adaptar o arquivo ao contêiner atual quando houver compatibilidade hierárquica;
- permitir:
  - `app` receber `app` ou `course`
  - `course` receber `course` ou `module`
  - `module` receber `module` ou `lesson`
  - `lesson` receber `lesson`
- ao detectar item equivalente no destino, oferecer pelo menos `Mesclar`, `Substituir` e `Cancelar`; quando o escopo permitir duplicação localizada, manter também `Duplicar`;
- `Mesclar` deve preservar o que já existe e acrescentar apenas cursos, módulos, lições, steps, blocos e popupBlocks ainda ausentes;
- quando o escopo do arquivo for menor que o do ponto de importação compatível, inserir o conteúdo no contêiner atual com mensagem informativa;
- rejeitar apenas combinações sem contêiner compatível;
- normalizar conteúdo, progresso e assets;
- podar assets órfãos;
- reconciliar progresso;
- persistir o resultado.

## 11.4 Regras de exportação

- exportar apenas o conteúdo do escopo pedido;
- exportar apenas imagens realmente referenciadas;
- manter JSON legível;
- preservar dados necessários para reimportação;
- manter `project.json` acessível para inspeção manual dentro do `.zip`.

---

## 12. Web

## 12.1 Execução

O app deve funcionar ao abrir `index.html` em Chrome no Windows.

## 12.2 Persistência e arquivos

No navegador:

- o workspace fica persistido no armazenamento interno disponível;
- o hardcoded separado em `content/` é lido no boot apenas como semente complementar;
- `Importar` lê um pacote e aplica o conteúdo no workspace atual;
- `Exportar` baixa um `.zip` do escopo pedido;
- não existe vínculo contínuo com arquivo externo.

---

## 13. Android

No APK:

- o conteúdo roda na mesma base web;
- o hardcoded separado em `content/` acompanha o pacote web empacotado;
- importação usa seletor nativo;
- exportação usa seletor nativo;
- o workspace fica persistido dentro do `WebView`;
- o botão voltar do Android consulta a navegação interna antes de fechar a activity.

---

## 14. Validação

Validações obrigatórias:

- `npm run test:unit`
- `npm run test:e2e`
- `pwsh -NoProfile -File ./scripts/validate.ps1`
- build Android de debug dentro do fluxo completo

Cobertura mínima esperada:

- boot com curso hardcoded separado;
- preservação de edição local sobre o mesmo curso hardcoded;
- retomada de progresso;
- edição e persistência de cards;
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
- o motor continua separado do hardcoded;
- o hardcoded oficial vive fora do núcleo do motor, em `content/`;
- o workspace local do usuário prevalece sobre a mesma trilha já salva;
- o manual documenta o motor, não o catálogo do usuário;
- todo step editável termina com um único bloco `button`;
- popup do botão vive em `popupBlocks[]`;
- `buttonText` não existe no modelo canônico;
- bloco `button` não carrega texto persistido;
- conteúdo e progresso sobrevivem a reload quando o armazenamento da plataforma permitir;
- importação e exportação são as únicas operações externas de arquivo;
- exportação ZIP continua portátil entre web e Android;
- o APK empacota a mesma base web da raiz do projeto;
- progresso órfão é removido;
- assets órfãos são podados;
- fluxograma aceita no máximo duas saídas por nó;
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
- se o hardcoded em `content/` mudou, o runtime gerado foi atualizado no mesmo ciclo?
- a persistência continua coerente na web e no Android?
- o pacote ZIP continua reimportável?
- o editor continua intuitivo?
- a mudança deixou código legado ou duplicado?
- a suíte aplicável passou?
