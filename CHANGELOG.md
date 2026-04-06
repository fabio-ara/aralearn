# Histórico de versões

## v0.0.5 - Interface Android estável

Data do marco: `2026-04-05`

- estabiliza a tela de lição no Android com `WebView` moderno;
- elimina o vão externo acima da barra superior e abaixo do rodapé de ações;
- consolida preservação de rolagem, foco visual e comentário por card;
- melhora a coerência entre documentação do produto, ecossistema de autoria e linha pública `0.0.x`.

Componentes em destaque:

- `MainActivity` e a política de insets do `WebView`;
- preservação de rolagem e foco em `modules/render-state.js`;
- testes móveis como `android-insets.spec.mjs`, `card-comments.spec.mjs` e `scroll-preservation.spec.mjs`.

Referências centrais deste marco:

- Android Developers, `WindowInsets` e `safe-area`;
- Chromium WebView, tratamento de insets e viewport.

## v0.0.4 - Android integrado e comentários por card

Data do marco: `2026-04-04`

- reforça a integração entre o runtime e o wrapper Android já público desde `v0.0.1`;
- adiciona comentários persistidos por card em `step.comment`;
- amplia a cobertura de toque, teclado e comportamento da tela de lição no Android;
- atualiza o catálogo embarcado para o curso de matemática e informática do IFSP.

Componentes em destaque:

- `android/app/src/main/java/com/aralearn/app/MainActivity.java`;
- persistência e exportação de `step.comment`;
- testes `android-insets.spec.mjs` e `card-comments.spec.mjs`.

Referências centrais deste marco:

- Android Developers, `WebView`, insets e integração com sistema;
- práticas de empacotamento híbrido com a mesma base HTML, CSS e JavaScript.

## v0.0.3 - Lacunas, tabelas e avaliação local

Data do marco: `2026-04-01`

- aprofunda a prática com lacunas em texto e em tabela;
- amplia o uso de respostas por escolha e por digitação no mesmo card;
- reforça o progresso salvo no dispositivo e o retorno consistente do conteúdo exportado;
- incorpora material de lógica para treino local mais intenso.

Componentes em destaque:

- `editor` com variantes aceitas e lacunas por escolha ou por digitação;
- `table` com prática célula a célula;
- testes de escolha, conteúdo rico e round-trip de conteúdo.

Referências centrais deste marco:

- contrato de dados explícito em `lesson-json-spec.md`;
- princípios de prática guiada e validação local do próprio runtime.

## v0.0.2 - Autoria visual, pacotes e validação

Data do marco: `2026-03-30`

- amadurece a autoria visual já existente no runtime;
- amplia o trabalho com pacotes `.zip`, inclusive conteúdo comprimido;
- fortalece a auditoria do catálogo embarcado;
- expande a cobertura automatizada de importação, persistência e formatação;
- amplia o acervo de cursos e imagens embarcados para estudo offline.

Componentes em destaque:

- `modules/file-helpers.js` e `modules/vendor/fflate.js`;
- scripts de auditoria e geração de conteúdo;
- testes de importação por pacote e validação de conteúdo.

Referências centrais deste marco:

- formato ZIP e processamento local em JavaScript;
- boas práticas de validação automatizada para conteúdo e persistência.

## v0.0.1 - Base pública do motor

Data do marco: `2026-03-26`

- torna pública a base do runtime, do editor de cards e do catálogo embarcado;
- publica o contrato JSON das lições e o manual principal do produto;
- disponibiliza o empacotamento Android, o gerador do catálogo embarcado e a suíte inicial de testes;
- estabelece o catálogo inicial de contêineres que segue público na linha `0.0.x`.

Contêineres publicados neste marco:

- `heading`
- `paragraph`
- `image`
- `table`
- `simulator`
- `editor`
- `multiple_choice`
- `flowchart`
- `button`

Componentes em destaque:

- `modules/block-registry.js`, `modules/content-model.js`, `modules/file-helpers.js`, `modules/progress-helpers.js` e `modules/flowchart-layout.js`;
- `manual.md` e `lesson-json-spec.md`;
- base Android em `android/`.

Referências centrais deste marco:

- ELK para apoio ao arranjo de fluxogramas;
- desenho hierárquico de grafos como base conceitual para leitura de cima para baixo, laços e convergências;
- documentação oficial de APIs web e Android usadas pelo runtime.
