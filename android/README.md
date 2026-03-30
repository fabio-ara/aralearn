# Android do AraLearn

Este wrapper empacota a mesma base web da raiz do projeto em um `WebView`.

## O que entra no APK

- `index.html`
- `app.js`
- `styles.css`
- `modules/`
- `assets/`
- `content/`

Durante o build, esses arquivos são copiados automaticamente para `app/src/main/assets` gerados em compilação.

## Build local

1. Garanta `JDK 17` e Android SDK instalados.
2. Rode `.\gradlew.bat assembleDebug`.

Saída esperada:

- `app/build/outputs/apk/debug/app-debug.apk`

## Persistência e arquivos

- o app mantém um workspace local persistente dentro do `WebView`;
- importação de pacote usa o seletor nativo de arquivos do Android;
- exportação de pacote usa o seletor nativo de salvamento;
- não existe vínculo contínuo com arquivo externo.
