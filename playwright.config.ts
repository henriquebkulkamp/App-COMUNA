import { defineConfig, devices } from "@playwright/test";

// ============================================================
// Config do Playwright — testes E2E de ponta a ponta
// (browser real batendo nas rotas de API, que batem no Postgres)
// ============================================================
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // Todos os specs batem no mesmo Postgres/servidor dev compartilhado (ex:
  // vários testes mexem no estoque do "abacate") — rodar arquivos em
  // paralelo causa corrida entre eles. 1 worker garante execução em série.
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Se já tiver um `next dev` rodando na 3000, reaproveita. Senão, sobe um.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
