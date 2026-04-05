# Android do AraLearn

Este wrapper empacota a base web da raiz do projeto em um `WebView`.

## O que entra no APK

- `index.html`
- `app.js`
- `styles.css`
- `modules/`
- pasta `assets/`
- `content/`

Durante o build, esses arquivos são copiados para os arquivos gerados em `app/src/main/assets`.

## Build local

1. Garanta `JDK 17` e Android SDK instalados.
2. Rode `.\gradlew.bat assembleDebug`.

Saída esperada:

- `app/build/outputs/apk/debug/app-debug.apk`

## Publicação manual

- valide a raiz do projeto antes de anexar um APK em release manual;
- use o APK gerado em `app/build/outputs/apk/debug/app-debug.apk` como artefato base para publicação;
- se a versão já existir e o problema estiver apenas no binário anexado, substitua o arquivo existente em vez de abrir uma nova release para o mesmo escopo.

## Insets, teclado e `WebView`

- em `WebView` moderno, o layout web deve preferir `safe-area-inset-*` para barras do sistema e confiar no redimensionamento nativo da viewport para o teclado;
- nesse caminho, o wrapper não deve espelhar `systemBars` e `IME` no CSS do app;
- o corte conservador adotado no projeto é Chromium `140`: abaixo disso, o fallback legado aplica padding nativo na `WebView` e consome os insets antes de entregá-los ao conteúdo;
- a tela de lição não deve criar vão externo extra acima da barra superior nem abaixo do rodapé de ações; o espaçamento visível entre topo, card e rodapé pertence ao layout interno da lição.

Referências:

- Android Developers: <https://developer.android.com/develop/ui/views/layout/webapps/understand-window-insets>
- Chromium WebView: <https://chromium.googlesource.com/chromium/src/+/HEAD/android_webview/docs/insets.md>

## Persistência e arquivos

- o app mantém um espaço de trabalho persistente dentro do `WebView`;
- importação de pacote usa o seletor nativo de arquivos do Android;
- exportação de pacote usa o seletor nativo de salvamento;
- não existe vínculo contínuo com arquivo externo.
