# AraLearn

AraLearn é um motor local de aprendizagem em cards, com autoria visual, persistência offline e a mesma base para web e Android.

O projeto agora combina três frentes:

- motor do app em `app.js`, `styles.css`, `index.html` e `modules/`;
- catálogo hardcoded separado em `content/`;
- importação/exportação por pacotes `.zip` com mesclagem incremental.

## Estrutura principal

- `index.html`: entrada da versão web
- `app.js`: estado, renderização, autoria, importação/exportação e persistência
- `modules/`: utilitários de conteúdo, progresso, arquivos e fluxograma
- `content/*.json`: fontes dos cursos embarcados ativos
- `content/hardcoded-content.js`: arquivo runtime gerado para o boot local
- `content/aralearn-course-matematica-para-informatica.zip`: pacote ZIP do curso hoje embarcado por padrão
- `examples/`: pacotes ZIP e fontes JSON mantidos fora do hardcoded atual
- `scripts/build-web-course-example.mjs`: gerador do exemplo grande de fundamentos web
- `manual.md`: documentação oficial do produto

## Cursos embarcados

O app sobe com um catálogo de cursos embarcados separado do motor.

Regras práticas:

- cada JSON em `content/` pode contribuir com um ou mais cursos;
- o app consome `content/hardcoded-content.js` para continuar funcionando ao abrir `index.html` diretamente;
- o armazenamento local do usuário continua soberano: se ele editar um desses cursos no app, a versão local prevalece;
- em novos boots, o hardcoded só complementa o que ainda não existir.

Catálogo embarcado atual:

- `content/matematica-para-informatica.json`

Pacotes e fontes fora do hardcoded atual ficam em `examples/`, inclusive os cursos desembarcados desta versão.

Depois de editar os JSONs-fonte, rode:

```powershell
npm run build:hardcoded-content
```

## Importação

AraLearn aceita pacotes de:

- aplicação
- curso
- módulo
- lição

Quando já existe conteúdo relacionado, o app agora pode:

- `mesclar`
- `substituir`
- `duplicar`
- `cancelar`

Na mesclagem, o app preserva o que já existe e adiciona apenas cursos, módulos, lições, cards e blocos que ainda não estavam no destino.

## Execução

### Web

Abra `index.html` no Chrome ou rode um servidor estático local.

### GitHub Pages

O repositório já inclui workflow para publicar a versão web a partir da branch `main`.

Se o Pages estiver habilitado no repositório `fabio-ara/aralearn`, a URL esperada é:

```text
https://fabio-ara.github.io/aralearn/
```

### Instalação e testes

```powershell
npm install
npm run build:hardcoded-content
npm run test:unit
npm run test:e2e
```

O E2E sobe um servidor local próprio em `http://127.0.0.1:4273` por padrão.
Se precisar trocar a porta, defina `ARALEARN_TEST_PORT` antes de rodar o Playwright.

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

Regras, arquitetura e invariantes do projeto estão em [manual.md](./manual.md).

## Licença

MIT. Veja [LICENSE](./LICENSE).
