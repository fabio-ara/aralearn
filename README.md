# AraLearn

AraLearn é um aplicativo local-first para estudo, autoria e organização de microssequências de aprendizagem.

## Estado atual

O repositório já define o contrato autoral `aralearn.intent.v1`, sua validação estrutural e a pipeline mínima do motor para carregar, normalizar, compilar e renderizar o conteúdo.
A persistência local fica atrás de uma camada própria, separando projeto e progresso, e a edição manual de microssequências e cards já opera integrada a essa base.
A interface local já cobre a hierarquia `curso -> módulo -> lição -> microssequência -> cards`, com leitura de cards, revisão, geração e reposicionamento assistidos por LLM via API.
O modelo editorial e a casca de navegação já foram reorganizados para refletir múltiplos cursos reais no mesmo projeto, alinhando a estrutura publicada ao domínio do AraLearn.

Importante: a interface atual existe para validação de fluxo e integração local. Ela ainda está em evolução.

## Estrutura

- `docs/` documentação pública
- `src/` código-fonte
- `public/` arquivos estáticos públicos
- `tests/` testes automatizados da fase atual

## Documentação pública

- `docs/aralearn.intent.v1.md`
- `docs/examples/`
- `src/core/`
- `src/model/`
- `src/render/`
- `src/storage/`
- `src/editor/`
- `src/ui/`

## Validação

```powershell
npm test
npm run validate:example
```

## Próximos passos

As próximas iterações devem aprofundar os fluxos editoriais assistidos, os contratos públicos e o acabamento da interface local.
