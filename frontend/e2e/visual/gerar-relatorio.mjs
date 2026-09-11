#!/usr/bin/env node
// ============================================================
// gerar-relatorio.mjs — roda os testes de diff visual e escreve UM
// relatório HTML estático (imagens embutidas em base64, sem precisar
// de servidor nem de `playwright show-report`) em
// e2e/visual/relatorio.html. Script único, sem dependência nova além
// do que o Playwright já traz — só Node puro.
//
// Uso: node e2e/visual/gerar-relatorio.mjs (ou `npm run test:visual`)
// Saída: mesmo exit code do Playwright (0 = tudo bateu, 1 = achou
// diferença) — é o que o hook (.claude/hooks/visual-test.sh, raiz do
// repo) usa pra decidir se bloqueia ou não.
// ============================================================

import { spawnSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "../.."); // frontend/
const CONFIG = path.join(FRONTEND_DIR, "playwright.config.ts");
const PLAYWRIGHT_BIN = path.join(FRONTEND_DIR, "node_modules/.bin/playwright");
const RELATORIO_PATH = path.join(__dirname, "relatorio.html");

// ─── 1. Roda os testes, pedindo o resultado em JSON (não imprime a
// lista no console — quem quiser ver progresso live usa
// `npm run test:visual:live`, ver README.md) ───────────────────────
const args = ["test", `--config=${CONFIG}`, "--project=visual", "--reporter=json", ...process.argv.slice(2)];
const resultado = spawnSync(PLAYWRIGHT_BIN, args, { encoding: "utf-8", maxBuffer: 1024 * 1024 * 200 });

if (resultado.error) {
  console.error("Não consegui rodar o Playwright:", resultado.error.message);
  process.exit(1);
}

let relatorioJson;
try {
  relatorioJson = JSON.parse(resultado.stdout);
} catch {
  console.error("Saída do Playwright não veio em JSON válido — stderr abaixo:\n");
  console.error(resultado.stderr);
  process.exit(resultado.status ?? 1);
}

// ─── 2. Achata a árvore suites/specs/tests num array simples ──────
function coletarEspecs(suites, caminho = []) {
  const especs = [];
  for (const suite of suites ?? []) {
    const novoCaminho = suite.title ? [...caminho, suite.title] : caminho;
    for (const spec of suite.specs ?? []) {
      const teste = spec.tests?.[0];
      const execucao = teste?.results?.at(-1); // última tentativa (retries)
      especs.push({
        titulo: [...novoCaminho, spec.title].filter(Boolean).join(" › "),
        arquivo: spec.file,
        ok: spec.ok === true,
        duracaoMs: execucao?.duration ?? 0,
        erro: execucao?.errors?.[0]?.message ?? null,
        attachments: execucao?.attachments ?? [],
      });
    }
    especs.push(...coletarEspecs(suite.suites, novoCaminho));
  }
  return especs;
}

const especs = coletarEspecs(relatorioJson.suites);
const falhas = especs.filter((e) => !e.ok);
const sucessos = especs.filter((e) => e.ok);

// ─── 3. Pra cada falha, junta expected/actual/diff (ver o sufixo que
// o Playwright usa em toHaveScreenshot — addSuffixToFilePath) e extrai
// a contagem de pixels da mensagem de erro ────────────────────────
function paraDataUri(caminhoAbsoluto) {
  if (!caminhoAbsoluto || !existsSync(caminhoAbsoluto)) return null;
  const base64 = readFileSync(caminhoAbsoluto).toString("base64");
  return `data:image/png;base64,${base64}`;
}

function extrairContagemPixels(mensagemErro) {
  if (!mensagemErro) return null;
  // Mensagem padrão do toHaveScreenshot: "1234 pixels (ratio 0.05 of
  // all image pixels) are different." — às vezes some com códigos de
  // cor ANSI no meio, por isso o regex é tolerante a espaços/quebras.
  const match = mensagemErro.match(/([\d,]+)\s*pixels\s*\(ratio\s*([\d.]+)[^)]*\)\s*are different/i);
  if (!match) return null;
  return { pixels: match[1], ratio: match[2] };
}

for (const falha of falhas) {
  // addSuffixToFilePath (Playwright) gera nomes tipo
  // "home-header-expected.png" — sufixo antes da extensão, extensão
  // ainda no meio do nome do attachment (não é o nome do arquivo real).
  const porNome = Object.fromEntries(
    falha.attachments
      .filter((a) => a.contentType === "image/png" && /-(expected|actual|diff)\.\w+$/.test(a.name))
      .map((a) => [a.name.match(/-(expected|actual|diff)\.\w+$/)[1], a.path])
  );
  falha.imagens = {
    expected: paraDataUri(porNome.expected),
    actual: paraDataUri(porNome.actual),
    diff: paraDataUri(porNome.diff),
  };
  falha.diffPixels = extrairContagemPixels(falha.erro);
}

// ─── 4. Monta o HTML — um arquivo só, sem CSS/JS externo ──────────
function escaparHtml(texto) {
  return String(texto).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function blocoFalha(falha) {
  const pixelsTexto = falha.diffPixels
    ? `${falha.diffPixels.pixels} pixels diferentes (${(Number(falha.diffPixels.ratio) * 100).toFixed(1)}% da imagem)`
    : "sem contagem de pixels (erro não é de screenshot — ver mensagem completa abaixo)";

  const imagem = (rotulo, src) =>
    src
      ? `<figure><figcaption>${rotulo}</figcaption><img src="${src}" alt="${rotulo} — ${escaparHtml(falha.titulo)}"></figure>`
      : "";

  return `
    <section class="falha">
      <h3>✗ ${escaparHtml(falha.titulo)}</h3>
      <p class="meta">${escaparHtml(falha.arquivo)} · ${pixelsTexto}</p>
      <div class="imagens">
        ${imagem("Esperado (baseline)", falha.imagens.expected)}
        ${imagem("Capturado agora", falha.imagens.actual)}
        ${imagem("Diff (pixels que mudaram)", falha.imagens.diff)}
      </div>
      <details>
        <summary>Mensagem de erro completa</summary>
        <pre>${escaparHtml(falha.erro ?? "(sem mensagem)")}</pre>
      </details>
    </section>`;
}

function linhaSucesso(spec) {
  return `<li>✓ ${escaparHtml(spec.titulo)} <span class="meta">(${(spec.duracaoMs / 1000).toFixed(1)}s)</span></li>`;
}

const agora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Relatório de diff visual — COMUNA</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, sans-serif; max-width: 960px; margin: 0 auto; padding: 24px 16px; line-height: 1.5; }
  h1 { font-size: 1.4rem; }
  .resumo { padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; font-weight: 600; }
  .resumo.tudo-ok { background: #d4f4dd; color: #1a5c2e; }
  .resumo.tem-falha { background: #fbdede; color: #7a1f1f; }
  .meta { color: #666; font-weight: normal; font-size: 0.85em; }
  section.falha { border: 2px solid #d9534f; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
  section.falha h3 { margin-top: 0; color: #a33; }
  .imagens { display: flex; flex-wrap: wrap; gap: 12px; margin: 12px 0; }
  .imagens figure { flex: 1 1 260px; margin: 0; }
  .imagens figcaption { font-size: 0.85em; font-weight: 600; margin-bottom: 4px; }
  .imagens img { max-width: 100%; border: 1px solid #ccc; border-radius: 4px; }
  pre { white-space: pre-wrap; background: #f5f5f5; padding: 8px; border-radius: 4px; font-size: 0.8em; }
  ul.sucessos { padding-left: 20px; }
  ul.sucessos li { margin-bottom: 4px; }
  @media (prefers-color-scheme: dark) {
    body { background: #1a1a1a; color: #eee; }
    pre { background: #2a2a2a; }
    .imagens img { border-color: #444; }
  }
</style>
</head>
<body>
  <h1>🧪 Relatório de diff visual</h1>
  <p class="meta">Gerado em ${agora} · ${especs.length} teste(s)</p>

  <p class="resumo ${falhas.length === 0 ? "tudo-ok" : "tem-falha"}">
    ${falhas.length === 0 ? `✓ Tudo igual ao baseline — ${sucessos.length} teste(s) passaram.` : `✗ ${falhas.length} tela(s) mudaram visualmente (${sucessos.length} continuam batendo).`}
  </p>

  ${falhas.length > 0 ? `<h2>O que mudou</h2>${falhas.map(blocoFalha).join("\n")}` : ""}

  ${sucessos.length > 0 ? `<h2>Sem mudança (${sucessos.length})</h2><ul class="sucessos">${sucessos.map(linhaSucesso).join("\n")}</ul>` : ""}
</body>
</html>
`;

writeFileSync(RELATORIO_PATH, html);

// ─── 5. Abre o relatório sozinho no navegador padrão — só quando tem
// diferença de verdade pra ver (senão vira janela chata a cada Edit
// sem mudança visual nenhuma). Zero IA no meio: é só o comando de
// abrir arquivo do próprio SO. Silencioso se falhar (ex: rodando numa
// máquina sem display/headless) — o exit code do script continua
// sendo o sinal de verdade, isso aqui é só conveniência.
//
// `VISUAL_REPORT_NO_OPEN=1` desliga (útil em CI).
function abrirNoNavegador(caminhoAbsoluto) {
  if (process.env.VISUAL_REPORT_NO_OPEN) return;
  const comando =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", caminhoAbsoluto] : [caminhoAbsoluto];
  try {
    // .on("error", ...) é essencial aqui: sem esse listener, um
    // spawn que falha (ex: xdg-open não instalado) emite um evento
    // "error" assíncrono sem handler — o Node trata isso como exceção
    // não tratada e derruba o processo inteiro (o script já tinha
    // saído com sucesso até esse ponto).
    spawn(comando, args, { detached: true, stdio: "ignore" })
      .on("error", () => {})
      .unref();
  } catch {
    // sem display, sem xdg-open instalado, etc — tudo bem, o
    // resumo no terminal e o SendUserFile (quando é o Claude
    // rodando) continuam cobrindo isso.
  }
}

if (falhas.length > 0) abrirNoNavegador(RELATORIO_PATH);

// ─── 6. Resumo curto no terminal + mesmo exit code do Playwright ──
console.log(
  falhas.length === 0
    ? `✓ ${sucessos.length} teste(s) visuais bateram com o baseline.`
    : `✗ ${falhas.length}/${especs.length} teste(s) visuais mudaram — veja o que mudou em ${path.relative(process.cwd(), RELATORIO_PATH)}`
);
process.exit(resultado.status ?? (falhas.length > 0 ? 1 : 0));
