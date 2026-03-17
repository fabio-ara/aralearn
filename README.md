# AraLearn

**AraLearn** é um motor de aprendizagem **offline-first**, **open source** e **mobile-first**, criado para transformar estudo em prática curta, portátil e personalizável.

A proposta é simples: o usuário monta seus próprios **cursos**, organizados em **módulos**, compostos por **lições**, que por sua vez podem conter **conteúdo**, **imagens**, **exercícios curtos** e **prática de escrita de código**. Tudo isso com foco em uso **sem servidor**, **sem internet** e com armazenamento local no próprio dispositivo.

## Acesse o projeto

- **Versão web / código-fonte:** [index.html](./index.html)
- **Versão Android (.apk):** [GitHub Releases](https://github.com/fabio-ara/aralearn/releases)
- **Código do app web:** [app.js](./app.js), [content.js](./content.js), [styles.css](./styles.css)
- **Projeto Android:** [android/](./android/)
- **Licença:** [LICENSE](./LICENSE)

> O `.apk` instalável do Android deve ser publicado pela aba **Releases** do repositório.

---

## Visão geral

O AraLearn foi criado como projeto de portfólio e também como ferramenta real de estudo.

A ideia nasceu de uma necessidade prática: ter uma plataforma de aprendizagem que fosse:

- **totalmente gratuita**
- **open source**
- **funcional offline**
- **sem backend ou servidor**
- **customizável pelo próprio usuário**
- **portável entre aparelhos**
- adequada para **microaprendizagem em contexto real**, como no trajeto do Metrô de São Paulo, sem internet

Hoje existem aplicativos de aprendizagem com proposta semelhante, como **SoloLearn** e **Mimo**, mas o AraLearn parte de um caminho diferente: ser uma solução **local-first**, com conteúdo controlado pelo próprio usuário, sem dependência de nuvem e com possibilidade de uso educacional mais livre, inclusive para projetos pessoais e estudo autônomo.

---

## Motivação

Desenvolvi o AraLearn especialmente como projeto de portfólio, mas ele também atende a uma necessidade concreta da minha rotina de estudos.

Sou estudante de **Tecnologia em Análise e Desenvolvimento de Sistemas no IFSP São Paulo**, com ingresso no primeiro semestre de 2026, e estou em processo de **transição de carreira para desenvolvimento de software**, com foco em oportunidades de **estágio**.

Atualmente atuo como **Técnico Administrativo na CETESB**, trabalhando com **análise de dados**, **automação de processos**, **padronização de fluxos internos** e desenvolvimento de soluções com:

- **Excel/VBA**
- **Power Platform** (Power Apps, Power Automate, Power BI e Lists)
- **Microsoft 365** (SharePoint, Teams e Outlook)
- ferramentas de documentação e melhoria contínua

Além da graduação, também venho realizando cursos no **SENAI**, especialmente em áreas como:

- JavaScript
- Python
- Banco de Dados
- Power Platform
- Power BI

O AraLearn representa esse momento de transição: um projeto em que junto experiência prévia com automação, organização de informação, documentação e melhoria de processos com a formação atual em desenvolvimento de software.

Também utilizo o próprio app como ferramenta complementar de estudo para:

- a graduação no IFSP
- cursos do SENAI
- projetos pessoais de estudo de **línguas asiáticas**, especialmente **japonês** e **mandarim**
- materiais voltados a **concursos públicos**

Em certo sentido, ele também nasce da evolução de experimentos que eu já vinha fazendo em ferramentas como o **Anki**, mas com uma proposta própria, mais flexível, offline e orientada a estrutura de cursos.

---

## Proposta do app

No AraLearn, o conteúdo é estruturado assim:

**Curso → Módulos → Lições → Etapas/steps**

Essa organização permite montar trilhas curtas e personalizadas, adequadas ao uso em celular e a sessões rápidas de estudo.

A proposta pedagógica é priorizar:

- estudo em blocos curtos
- prática objetiva
- interação leve
- uso offline
- reaproveitamento e portabilidade do conteúdo

---

## Principais diferenciais

- **Offline-first:** funciona sem internet
- **Sem servidor:** tudo roda localmente
- **Open source:** o conteúdo e a lógica podem ser inspecionados e evoluídos
- **Mobile-first:** pensado para uso no celular
- **Portabilidade:** conteúdo pode ser exportado/importado em **JSON/ZIP**
- **Customização:** o próprio usuário pode montar cursos e lições
- **Mesma base para web e Android:** a versão Android reutiliza o front-end web
- **Leveza de uso:** adequado para estudo em deslocamento, em intervalos curtos e em contexto real

---

## Funcionalidades atuais

Pelo estado atual do projeto, o AraLearn já conta com:

- criação e organização de **cursos**
- organização de **módulos**
- organização de **lições**
- navegação por etapas de estudo
- persistência local de conteúdo e progresso
- importação e exportação de dados
- empacotamento de conteúdo em **ZIP/JSON**
- uso de imagens locais
- interface web funcional
- versão Android baseada em **WebView**
- compatibilidade com uso local sem backend

Arquivos centrais da versão web:

- [index.html](./index.html)
- [app.js](./app.js)
- [content.js](./content.js)
- [styles.css](./styles.css)

---

## Arquitetura do projeto

A arquitetura foi pensada para manter uma única base principal de interface e lógica, evitando divergência entre web e Android.

### Estrutura principal

- [index.html](./index.html): ponto de entrada da aplicação web
- [app.js](./app.js): lógica principal da aplicação
- [content.js](./content.js): conteúdo/base de dados inicial
- [styles.css](./styles.css): estilos da interface
- [assets/](./assets/): imagens e arquivos estáticos
- [android/](./android/): wrapper Android

### Estratégia adotada

A ideia foi **não quebrar a versão web** ao criar a versão Android.

Por isso, a base do projeto foi mantida assim:

- **versão web atual** para navegador/desktop
- pasta [android/](./android/) como wrapper **WebView**
- reaproveitamento dos mesmos arquivos centrais:
  - `index.html`
  - `app.js`
  - `content.js`
  - `styles.css`

### Persistência

- Na web, o projeto usa armazenamento local
- No Android, o `localStorage` também funciona dentro do app
- Para backup e transferência entre aparelhos, a estratégia é manter **exportação/importação em JSON/ZIP**

Essa decisão privilegia simplicidade, portabilidade e independência de infraestrutura.

---

## Android (.apk)

O projeto inclui uma versão Android empacotada a partir da versão web.

### APK instalável

- [Releases do projeto](https://github.com/fabio-ara/aralearn/releases)

### Projeto Android

- [android/](./android/)
- [android/README.md](./android/README.md)

### Observação

O APK é gerado a partir da versão web usando um wrapper Android com `WebView`, para manter a mesma lógica do app entre plataformas. O artefato distribuível não precisa ficar versionado dentro do código-fonte; a publicação recomendada é via **GitHub Releases**.

---

## Build Android

Para gerar a versão Android localmente, a base do projeto já prevê o seguinte fluxo:

1. Instalar **Android Studio**
2. Instalar **SDK**, **Platform Tools** e **Build Tools**
3. Usar **JDK 17**
4. Ajustar o projeto Android
5. Gerar o APK

Comandos e detalhes adicionais podem ser consultados em:

- [android/README.md](./android/README.md)

Saída esperada do build:

- `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Como executar

### Web

Há duas formas principais:

1. Abrir a versão publicada no **GitHub Pages**, quando disponível
2. Baixar/clonar o projeto e abrir o arquivo [index.html](./index.html) no navegador

### Desktop

Como o projeto é essencialmente front-end puro, ele pode ser usado localmente em navegador, especialmente para testes, prototipação e uso pessoal.

### Android

Instale o arquivo:

- publicado na aba [GitHub Releases](https://github.com/fabio-ara/aralearn/releases)

---

## Casos de uso pensados

O AraLearn foi pensado para estudo em contextos como:

- deslocamento no transporte público
- estudo offline em celular Android
- prática curta e frequente
- revisão de conteúdo autoral
- organização de materiais próprios
- estudo de programação
- estudo de idiomas
- estudo para graduação, cursos livres e concursos

---

## Roadmap / próximos passos

A principal visão futura do projeto é permitir a criação de conteúdo educacional com mais automação.

Entre os próximos passos desejados, estão:

- transformar anotações de aula em lições estruturadas
- usar **CLI de uma LLM** para converter notas em conteúdo de curso
- melhorar a experiência de autoria das lições
- evoluir a portabilidade entre dispositivos
- ampliar recursos para estudo de programação, concursos e **línguas asiáticas**

Também pretendo, no futuro, explorar integrações mais avançadas para estudo de idiomas, incluindo:

- **parser linguístico** para **japonês**, **mandarim**, possivelmente **cantonês** e **coreano**
- recursos de **TTS (text-to-speech)**
- apoio de **LLMs** para geração, adaptação e enriquecimento de conteúdo didático

Essa evolução busca manter o princípio central do projeto: **estudo local, portátil, customizável e offline**.

---

## Sobre mim

Meu nome é **Fabio Ara**.

Sou estudante de **Tecnologia em Análise e Desenvolvimento de Sistemas no IFSP São Paulo** e estou em transição de carreira para a área de desenvolvimento de software.

Atualmente trabalho na **CETESB** como Técnico Administrativo, com atuação em:

- automação de processos
- análise e tratamento de dados
- engenharia de fluxos internos
- soluções com Excel/VBA
- Power Platform
- SharePoint, Teams e Outlook
- documentação e melhoria contínua

Tenho também formação e trajetória que contribuem para meu perfil técnico e analítico, incluindo:

- **Técnico em Informática pela ETESP**
- formação em **Letras pela USP**
- cursos do **SENAI** em programação, banco de dados e Power Platform

Busco oportunidades de **estágio em desenvolvimento de software e automação**, e o AraLearn representa um dos projetos centrais do meu portfólio nesse processo de migração profissional.

### LinkedIn

- [Fabio Ara no LinkedIn](https://www.linkedin.com/in/fabio-ara-5650572a/)

---

## Tecnologias e abordagem

O projeto foi construído com foco em simplicidade, portabilidade e reaproveitamento entre plataformas.

### Base atual

- HTML
- CSS
- JavaScript
- Android WebView
- armazenamento local
- importação/exportação em JSON/ZIP

### Filosofia de implementação

- evitar dependência de servidor
- manter a base simples e auditável
- priorizar uso offline
- reduzir atrito entre versão web e versão Android
- favorecer estudo autoral e customizável

---

## Estrutura do repositório

```text
.
├── index.html
├── app.js
├── content.js
├── styles.css
├── assets/
├── android/
│   ├── README.md
├── LICENSE
└── README.md
```

---

## Licença

Este projeto está licenciado sob a licença MIT.

Consulte:

- [LICENSE](./LICENSE)

---

## Contato profissional

Para networking e oportunidades de estágio:

- [LinkedIn](https://www.linkedin.com/in/fabio-ara-5650572a/)

---

## Observação final

O AraLearn é, ao mesmo tempo, um projeto de portfólio e uma ferramenta de uso real.

Ele sintetiza minha trajetória anterior com automação, documentação e melhoria de processos, minha formação atual em desenvolvimento de software e meu interesse em construir soluções úteis, simples e tecnicamente coerentes.

Se você é recrutador(a), avaliador(a) técnico(a) ou profissional da área, este projeto representa meu esforço concreto de transição para desenvolvimento, com foco em produto, arquitetura prática e aprendizado contínuo.
