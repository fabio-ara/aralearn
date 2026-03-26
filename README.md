# AraLearn

AraLearn é um motor local de aprendizagem em cards, com autoria visual, persistência offline e a mesma base para web e Android.

O projeto agora combina três frentes:

- motor do app em `app.js`, `styles.css`, `index.html` e `modules/`;
- curso hardcoded separado em `content/`;
- importação/exportação por pacotes `.zip` com mesclagem incremental.

## Estrutura principal

- `index.html`: entrada da versão web
- `app.js`: estado, renderização, autoria, importação/exportação e persistência
- `modules/`: utilitários de conteúdo, progresso, arquivos e fluxograma
- `content/matematica-para-informatica.json`: fonte do curso hardcoded atual
- `content/hardcoded-content.js`: arquivo runtime gerado para o boot local
- `examples/python-getting-started.zip`: pacote de exemplo para importação manual
- `manual.md`: documentação oficial do produto

## Curso hardcoded

O app sobe com um curso-padrão embarcado, mas esse hardcoded fica separado do motor.

Regras práticas:

- o JSON-fonte fica em `content/`;
- o app consome `content/hardcoded-content.js` para continuar funcionando ao abrir `index.html` diretamente;
- o armazenamento local do usuário continua soberano: se ele editar esse curso no app, a versão local prevalece;
- em novos boots, o hardcoded só complementa o que ainda não existir.

Para trocar o hardcoded:

1. deixe apenas um `.json` dentro de `content/`;
2. rode:

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

Regras, arquitetura e invariantes do projeto estão em [manual.md](./manual.md).

## Licença

MIT. Veja [LICENSE](./LICENSE).
