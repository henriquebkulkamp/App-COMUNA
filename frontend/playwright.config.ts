import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

// frontend/package.json tem "type": "module" — este config roda como
// ESM puro, sem __dirname global (isso aqui é o equivalente).
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Config do Playwright deste frontend (Vite + React Router, falando
// com o backend FastAPI — ver ../backend). Hoje só tem o project
// "visual" (regressão de pixel diff, ver e2e/visual/), disparado pelo
// hook ${CLAUDE_PROJECT_DIR}/.claude/hooks/visual-test.sh a cada
// Edit/Write num .tsx/.jsx/.css/.vue/.svelte. Segue a mesma estrutura
// do playwright.config.ts da raiz (Next.js) pra quem já conhece
// aquele — testDir "./e2e", projects nomeados por tipo de teste.
//
// Pressupõe Postgres de pé e seedado (`npm run db:up && npm run
// db:migrate && npm run db:seed`, rodados na raiz do repo) — os dois
// webServer abaixo só sobem a API e a SPA, não o banco.
// ============================================================
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Ver o mesmo comentário no playwright.config.ts da raiz: animations
  // "disabled" trava CSS transitions/animations (essencial pro
  // Carrossel) num frame parado, e maxDiffPixelRatio dá uma folga
  // pequena pra anti-aliasing sem deixar passar mudança de verdade.
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: "disabled" },
  },
  projects: [
    {
      // Regressão visual (pixel diff) — ver e2e/visual/ e
      // .claude/hooks/visual-test.sh na raiz do repo. Viewport fixo
      // (em vez do padrão de devices["Desktop Chrome"]) pra screenshot
      // não variar com a janela de quem tá rodando localmente.
      name: "visual",
      testMatch: "visual/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
  // Sobe os dois processos que a SPA depende: a API (FastAPI, direto
  // da venv já criada em backend/.venv — ver backend/requirements.txt)
  // e o dev server do Vite. `cwd` usa caminho absoluto a partir deste
  // arquivo de config pra funcionar não importa de onde o `npx
  // playwright` é chamado (o hook chama a partir da raiz do repo).
  webServer: [
    {
      command: `${path.resolve(__dirname, "../backend/.venv/bin/uvicorn")} app.main:app --host 127.0.0.1 --port 8000`,
      cwd: path.resolve(__dirname, "../backend"),
      url: "http://127.0.0.1:8000/docs",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "npm run dev",
      cwd: __dirname,
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
