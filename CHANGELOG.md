# Changelog

Todas as mudanças relevantes deste projeto serão registradas aqui.

## [0.1.0] - 2026-05-02

### Added

- estrutura pública inicial do repositório
- README público inicial
- CHANGELOG inicial
- diretórios `docs/`, `src/` e `public/`
- `.gitignore` com regras para arquivos privados

## [0.2.0] - 2026-05-02

### Added

- documentação pública inicial do contrato `aralearn.intent.v1`
- exemplos JSON válido e inválido do contrato
- validador estrutural inicial do contrato
- interface de linha de comando para validar arquivo JSON
- testes automatizados do validador

## [0.3.0] - 2026-05-02

### Added

- pipeline mínima do motor para carregar, validar, normalizar e compilar `aralearn.intent.v1`
- modelo interno compilado inicial com ids internos determinísticos
- testes automatizados da compilação inicial

## [0.4.0] - 2026-05-02

### Added

- camada inicial de renderização HTML baseada no modelo compilado
- renderizadores isolados para `text`, `ask`, `complete`, `code`, `table`, `flow` e `image`
- exemplo renderizável do contrato com múltiplas intenções
- testes automatizados da renderização básica

## [0.5.0] - 2026-05-02

### Added

- camada de persistência local simples em `src/storage`
- separação explícita entre projeto e progresso
- exportação e importação JSON com validação antes da persistência
- testes automatizados da persistência local

## [0.6.0] - 2026-05-03

### Added

- camada inicial de edição manual em `src/editor`
- operações para criar e editar microssequências
- operações para criar, editar e mover cards dentro da microssequência
- sessão de edição integrada à camada de storage
- testes automatizados do editor manual básico

## [0.7.0] - 2026-05-03

### Added

- casca navegável provisória do AraLearn em `public/`, com entrada local por `index.html`
- navegação completa da hierarquia `curso -> módulo -> lição -> microssequência -> cards`
- tela de leitura de cards integrada à nova camada de edição local
- painel provisório da microssequência para interação com LLM por API
- UI provisória de editor de cards separada da leitura
- componentes públicos de UI para home, lição, microssequência, leitura e overlays

### Notes

- esta versão entrega casca e fluxo validável, mas ainda não representa a semântica final do projeto
- detalhes de contrato e runtime ainda serão refinados nas próximas etapas do projeto

## [0.8.0] - 2026-05-03

### Added

- ações explícitas no editor de cards para criar novo card logo após o card atual
- ação explícita no editor de cards para remover o card atual sem invalidar a microssequência

### Changed

- seleção de card da casca local consolidada em uma rotina única para reduzir duplicação entre leitura, painel da microssequência e editor

### Tests

- cobertura automatizada para remoção de card com preservação de card inicial quando a microssequência ficaria vazia

## [0.9.0] - 2026-05-03

### Changed

- refatoração corretiva do contrato `aralearn.intent.v1` para suportar múltiplos cursos reais em `courses[]`
- refatoração da compilação, renderização e persistência para operar sobre a nova raiz multi-curso
- refatoração da seleção e da home da casca local para abrir cursos reais do projeto, sem prévias falsas
- refatoração das operações editoriais para localizar e alterar módulos, lições, microssequências e cards dentro do curso correto

### Tests

- suíte automatizada atualizada para validar contrato, compilação, renderização, storage, paths e editor sob a nova raiz multi-curso

## [0.9.1] - 2026-05-04

### Changed

- refatoração do painel da microssequência para reduzir texto estrutural e concentrar ações em ícones
- remoção do comentário técnico intermediário para a API; o pedido do usuário voltou a ser o único texto de instrução do painel
- remoção da retomada embutida na tela principal; o histórico de versões do card passou a ficar acessível por ação dedicada
- renomeação das ações assistidas para `Editar card`, `Escolher tags` e `Gerar cards`
- redução visual do campo `Objetivo` para tratá-lo como metadado leve da microssequência

### Tests

- limpeza da camada auxiliar de storage e atualização da suíte para remover o armazenamento obsoleto do comentário assistido

## [0.9.2] - 2026-05-04

### Added

- configuração local da integração Gemini no navegador, com persistência da chave da API e do modelo selecionado
- camada inicial de integração real com a Gemini Developer API por `fetch`, usando saída estruturada em JSON
- operação editorial para substituir todos os cards de uma microssequência a partir de resultado estruturado da API

### Changed

- refatoração do painel da microssequência para um fluxo mais simples, focado em `Gerar cards` e `Revisar card`
- transferência da escolha de modelo para a fileira final de ações do painel, com configuração da chave em overlay dedicado
- materialização direta do retorno da API no projeto local, sem manter pedido apenas como mock textual

### Tests

- cobertura automatizada para persistência da configuração da API e para substituição completa dos cards de uma microssequência

## [0.9.3] - 2026-05-04

### Added

- curso especial destacado na home para concentrar rascunhos de microssequências geradas por API
- tela dedicada de geração de microssequência antes da revisão, com pedido amplo, tags explícitas e seletor de modelo
- garantia estrutural no núcleo editorial para manter sempre o curso especial de rascunhos disponível

### Changed

- separação do fluxo em duas etapas: geração no curso especial e revisão no painel da microssequência
- simplificação do painel da microssequência para foco exclusivo em revisão de cards, sem misturar geração inicial no mesmo contexto
- destaque visual do curso de rascunhos na home e transformação da tela desse curso em fila de microssequências geradas

### Tests

- cobertura automatizada para garantir a criação do curso especial de rascunhos no documento editorial

## [0.9.4] - 2026-05-04

### Added

- rascunhos provisórios de microssequência, com cards plausíveis de Gemini, para avaliação visual da fila de rascunhos

### Changed

- a garantia do curso especial de rascunhos agora semeia exemplos quando a fila ainda está vazia ou só contém placeholder

### Tests

- ajuste da suíte editorial para verificar a presença dos rascunhos provisórios no curso especial

### Fixed

- restauração do botão `Play` na fila de rascunhos, com seleção correta do primeiro módulo, lição e card ao abrir um curso
- correção de estouro horizontal no painel da microssequência em telas estreitas, com quebra adequada de chips e contenção dos campos do editor
- simplificação da tela `Revisar microssequência`, removendo chips de contexto do topo, o campo `Objetivo` e o bloco `Card ativo`
