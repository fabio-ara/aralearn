# Android do AraLearn

Este wrapper gera um APK Android usando o mesmo front-end web da raiz do projeto.

## O que entra no APK

- `index.html`
- `app.js`
- `content.js`
- `styles.css`
- tudo que estiver em `../assets/`

Durante o build, esses arquivos são copiados automaticamente para `app/src/main/assets` gerados em tempo de compilação.

## Build local

1. Garanta JDK 17 e Android SDK instalados.
2. Gere o APK de debug:
   - `.\gradlew.bat assembleDebug`

Saída esperada:

- `app/build/outputs/apk/debug/app-debug.apk`

Se você mover o projeto para outra máquina, ajuste `local.properties` ou defina `ANDROID_SDK_ROOT` para o caminho correto da SDK Android.

## Observações

- `localStorage` funciona dentro do WebView.
- Importação de imagens e de `ZIP/JSON` usa o seletor nativo de arquivos do Android.
- Exportação de ZIP usa o seletor nativo de salvamento do Android.
- A sincronização com pasta local via File System Access API continua disponível só em navegadores com suporte a essa API.
