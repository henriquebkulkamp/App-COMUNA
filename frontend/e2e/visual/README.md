# Testes de diff visual

Regressão de pixel diff da UI (frontend/ — Vite + FastAPI), usando
`toHaveScreenshot()` do Playwright. Cada teste tira uma screenshot de
uma tela/seção e compara contra um baseline salvo em
`<arquivo>.spec.ts-snapshots/*.png`. Se algum pixel mudar mais do que
a tolerância configurada (`maxDiffPixelRatio: 0.02` em
`../../playwright.config.ts`), o teste falha.

**Um jeito só de rodar isso: `npm run test:visual --prefix frontend`**
(ou direto: `node e2e/visual/gerar-relatorio.mjs`, de dentro de
`frontend/`). Esse script:

1. Roda o Playwright por baixo dos panos.
2. Pra cada tela que mudou, junta 3 imagens — **Antes**, **Depois** e
   um **heatmap do delta** (diferença pixel a pixel calculada aqui,
   mas o espalhamento/borrão é feito por uma lib de heatmap de
   verdade — `simpleheat`, a mesma técnica de heatmap de clique/
   densidade tipo Leaflet.heat, rodando sobre canvas nativo via
   `@napi-rs/canvas` — não é o diff padrão do Playwright: fundo todo
   preto, quanto mais um pixel mudou de cor, mais azul/branco fica,
   ver `heatmap.mjs`) — e a legenda da terceira já traz a contagem
   exata (`Delta: N px (X%)`).
   Clicar em qualquer uma das três abre em tela cheia, com setas/`←``→`
   pra navegar entre TODAS as imagens do relatório.
3. Escreve TUDO isso num arquivo HTML único e estático —
   `e2e/visual/relatorio.html` (imagens embutidas em base64, sem
   precisar de servidor: abre com duplo clique em qualquer navegador).
4. Termina com o mesmo exit code do Playwright (0 = bateu tudo, 1 =
   achou diferença) — é isso que o hook usa pra decidir se bloqueia.

Não tem passo manual nenhum — quem chama esse script (você, ou o
Claude) só olha a linha que ele imprime no fim (`✓ Nenhuma tela mudou.`
ou `✗ N tela(s) mudaram — relatório em ...` — nunca uma fração X/Y, de
propósito) e, se quiser ver a diferença de verdade, abre o
`relatorio.html`.

## Quando isso roda sozinho

`.claude/hooks/visual-test.sh` (raiz do repo) dispara esse script a
cada Edit/Write num `.tsx`/`.jsx`/`.css`/`.vue`/`.svelte` dentro de
`frontend/`. Se algo mudou visualmente, o hook bloqueia a resposta do
Claude com o resumo (via stderr, exit code 2) e aponta pro
`relatorio.html` já gerado.

## Pré-requisitos pra rodar manualmente

Os `webServer` do `playwright.config.ts` só sobem a API (FastAPI) e a
SPA (Vite) — **não** sobem o Postgres nem rodam migração/seed. Isso
precisa já estar de pé (mesmo pré-requisito dos testes e2e funcionais
da raiz):

```sh
npm run db:up       # sobe o Postgres via docker compose (raiz)
npm run db:migrate  # roda as migrations
npm run db:seed      # popula os produtos de demonstração ("Abacate" etc)
```

E o backend precisa da venv instalada (`backend/.venv`) com as deps de
`backend/requirements.txt`, e `backend/.env` com `ADMIN_EMAIL`/
`ADMIN_SENHA` (usados pelo teste `admin.visual.spec.ts` pra logar de
verdade — ver `admin-auth.ts`).

## Gerar/atualizar o baseline

Depois de uma mudança visual **intencional**, os baselines antigos
ficam desatualizados de propósito — regenere e revise o diff antes de
commitar:

```sh
npm run test:visual:update --prefix frontend
```

Isso sobrescreve os `.png` em `*-snapshots/`. Sempre revise essas
imagens (ex: `git diff --stat` pra ver quais mudaram, ou abra os PNGs)
antes de dar commit — um baseline errado esconde regressões futuras.

## Rodar sem atualizar (só checar se bateu, com relatório)

```sh
npm run test:visual --prefix frontend
```

## Acompanhar teste por teste no terminal (sem relatório)

Pra debugar um spec específico com a saída ao vivo do Playwright (sem
passar pelo `gerar-relatorio.mjs`):

```sh
npm run test:visual:live --prefix frontend -- --grep "nome do teste"
```

## Adicionando uma nova tela/seção

Ver `home.visual.spec.ts` como exemplo. Regras que valem pra qualquer
spec novo aqui:

- Sempre espere o conteúdo real carregar (heading, texto, etc) antes
  de `toHaveScreenshot()` — a maioria das telas busca dados via fetch
  client-side, e uma screenshot do skeleton vira ruído no diff a cada
  execução.
- Prefira escopar a screenshot a um `id`/`data-testid` estável em vez
  de `fullPage: true` quando o teste é sobre UMA seção — isola o diff
  (uma mudança na Cesta da Semana não deveria fazer o teste dos
  Produtos Avulsos falhar) e evita ruído de conteúdo fora da seção.
- Dados vêm do seed (`npm run db:seed`, raiz) — não do
  `frontend/src/lib/dados.ts` (isso é só fallback do painel admin).
  Qualquer produto referenciado por nome/id num spec novo (ex:
  "Abacate") precisa existir em `db/seed.mjs`.
