# AraLearn

AraLearn é um motor local de aprendizagem em cards, com autoria visual, persistência no próprio dispositivo e a mesma base para web e Android.

O projeto está em desenvolvimento inicial. O marco público atual é `v0.0.5`, que estabiliza a tela de lição no Android, remove o vão extra junto às barras do sistema em `WebView` moderno e preserva a mesma base de conteúdo entre navegador e APK.

## O que este repositório reúne

- runtime web em `index.html`, `app.js`, `styles.css` e `modules/`;
- wrapper Android em `android/`;
- catálogo embarcado em `content/`;
- contratos de autoria e arquitetura em `manual.md` e `lesson-json-spec.md`.

## Ecossistema de autoria

- `Disassembly`: linguagem declarativa interna usada para descrever estrutura pedagógica, dependências entre cards e interação mínima;
- `AraLearn Factory`: compilador interno que valida essas fontes e gera a estrutura JSON usada pelo runtime;
- `lesson-json-spec.md`: contrato mais próximo da forma final consumida pelo app.

O Disassembly e o AraLearn Factory não são públicos neste repositório, mas orientam a organização pedagógica e a forma dos dados que chegam ao app.

## Estrutura principal

- `index.html`: entrada da versão web;
- `app.js`: estado, renderização, autoria, importação, exportação e persistência;
- `modules/`: utilitários de conteúdo, progresso, arquivos e fluxograma;
- `content/*.json`: fontes do catálogo embarcado;
- `content/hardcoded-content.js`: runtime gerado a partir dos JSONs ativos;
- `examples/`: pacotes e fontes mantidos fora do catálogo embarcado;
- `manual.md`: regras do produto, arquitetura e invariantes;
- `CHANGELOG.md`: marcos públicos da linha `0.0.x`.

## Execução

### Web

Abra `index.html` no Chrome ou rode um servidor estático local.

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

- [manual.md](./manual.md): arquitetura, regras de autoria, persistência, Android e invariantes;
- [lesson-json-spec.md](./lesson-json-spec.md): contrato JSON das lições;
- [CHANGELOG.md](./CHANGELOG.md): linha pública de versões.

## Licença

MIT. Veja [LICENSE](./LICENSE).
