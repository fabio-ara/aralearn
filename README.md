# AraLearn

AraLearn é um motor local de aprendizagem em cards, com a mesma base para web e Android.

O projeto foi pensado para estudo offline em condições reais de deslocamento: pouco tempo, atenção fragmentada, uso em pé no transporte público e ausência de internet. Por isso, o foco do app é permitir autoria e consumo de conteúdo no próprio dispositivo, com persistência local, exportação portátil e interface preparada para sessões de estudo objetivas.

## O que o produto entrega

No AraLearn, o usuário pode:

- criar cursos, módulos, lições e cards;
- editar cards por meio de um editor visual low-code;
- escolher contêineres como `heading`, `paragraph`, `image`, `table`, `simulator`, `editor`, `multiple_choice`, `flowchart` e `button`;
- transformar texto, células, nós e trechos de terminal em lacunas;
- definir opções corretas e incorretas;
- definir respostas por digitação, com variantes aceitas e suporte a expressões regulares quando o exercício exigir;
- manter comentários pessoais por card;
- exportar conteúdo para JSON e ZIP;
- importar esse conteúdo em outra instância do AraLearn, tanto na web quanto no Android.

O motor foi desenhado para que o mesmo curso possa sair do editor, ser exportado e voltar a funcionar em outra instalação sem depender de servidor.

Na linha pública `0.0.x`, o catálogo inicial de contêineres e o empacotamento Android já aparecem em `v0.0.1`. As versões seguintes passam a detalhar melhor autoria, pacotes, exercícios, comentários e estabilidade da interface móvel.

## Editor de cards

O editor de cards funciona como uma ferramenta low-code voltada à autoria didática. Ele permite:

- montar a estrutura visual e lógica do card no próprio app;
- combinar explicação, imagem, tabela, prática guiada, terminal, múltipla escolha e fluxograma;
- configurar feedback e avanço do card;
- definir lacunas por escolha e por digitação;
- controlar alternativas aceitas sem precisar editar manualmente o JSON final.

Isso faz do AraLearn não apenas um leitor de cursos, mas também uma ferramenta de autoria local.

## Ecossistema de autoria

O projeto hoje trabalha com três camadas complementares:

- `AraLearn`: motor, editor visual, persistência, importação, exportação e empacotamento web/Android;
- `Disassembly`: linguagem declarativa para prototipar arquitetura pedagógica, dependências entre cards, sequência principal de estudo e a própria lógica autoral que depois aparece no editor;
- `AraLearn Factory`: compilador que transforma essas fontes autorais em JSON compatível com o motor.

O repositório público do Disassembly está aqui:

- <https://github.com/fabio-ara/Disassembly>

O AraLearn Factory ainda não está publicado.

## Catálogo embarcado

O app suporta cursos embarcados em `content/`, separados do núcleo do motor.

Hoje a distribuição pública traz o curso embarcado `Matemática para Informática`, correspondente à disciplina homônima do primeiro semestre de Tecnologia em Análise e Desenvolvimento de Sistemas no Instituto Federal de São Paulo (IFSP). A próxima inclusão prevista é `Organização e Arquitetura de Computadores`, já compilada pelo AraLearn Factory para o mesmo contexto de estudo em deslocamento. A estrutura do produto, porém, não é específica desses cursos: o editor permite criar novos cursos e exportá-los para outras instâncias do app.

## Estrutura principal

- `index.html`: entrada da versão web;
- `app.js`: estado, renderização, autoria, importação, exportação e persistência;
- `styles.css`: identidade visual e layout;
- `modules/`: utilitários de conteúdo, progresso, arquivos e fluxograma;
- `content/*.json`: fontes do catálogo embarcado;
- `content/hardcoded-content.js`: catálogo gerado a partir dos JSONs ativos;
- `android/`: wrapper Android baseado em `WebView`;
- `manual.md`: arquitetura, regras do produto e invariantes;
- `lesson-json-spec.md`: contrato JSON das lições;
- `CHANGELOG.md`: linha pública de versões.

## Fundamentos e referências

Alguns pontos centrais do projeto se apoiam em referências técnicas e conceituais explícitas:

- Android em `WebView`: tratamento de barras do sistema, `safe-area` e teclado com base na documentação oficial do Android e do Chromium WebView;
- fluxogramas: organização visual inspirada em desenho hierárquico de grafos, com apoio do ELK e de ideias clássicas de layout em camadas;
- autoria declarativa: o Disassembly descreve intenção pedagógica, dependências e sequência principal antes da compilação para JSON;
- contratos de resposta: o editor expõe alternativas corretas, incorretas, variantes e expressões regulares a partir de um modelo de dados explícito, documentado em `lesson-json-spec.md`.

## Execução

### Web

Abra `index.html` no Chrome ou rode um servidor estático local.

### GitHub Pages

A publicação do site no GitHub Pages é manual, pela aba `Actions`, no workflow `Publicar versão web no Pages`.

Isso evita criar um novo deployment a cada ajuste na `main` e mantém o histórico público do repositório mais legível.

### Instalação e testes

```powershell
npm install
npm run build:hardcoded-content
npm run test:unit
npm run test:e2e
```

Validação completa:

```powershell
pwsh -NoProfile -File ./scripts/validate.ps1
```

### Android

```powershell
cd android
.\gradlew.bat assembleDebug
```

Saída esperada:

- `android/app/build/outputs/apk/debug/app-debug.apk`

## Documentação

- [manual.md](./manual.md): arquitetura, editor, persistência, Android e invariantes;
- [lesson-json-spec.md](./lesson-json-spec.md): contrato JSON das lições;
- [CHANGELOG.md](./CHANGELOG.md): marcos públicos da linha `0.0.x`.

## Licença

MIT. Veja [LICENSE](./LICENSE).
