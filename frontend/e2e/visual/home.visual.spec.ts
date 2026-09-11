import { test, expect } from "@playwright/test";

// ============================================================
// e2e/visual/home.visual.spec.ts
//
// Regressão visual (pixel diff) da vitrine do cliente ("/"). Diferente
// de um teste funcional (que confirma *comportamento*: produto some
// quando zera estoque etc.), aqui a asserção é "a tela continua com a
// mesma cara" — qualquer troca de cor, espaçamento, fonte ou layout
// vira um diff de pixels no relatório HTML do Playwright.
//
// toHaveScreenshot() compara contra o baseline salvo em
// home.visual.spec.ts-snapshots/ (gerado com --update-snapshots — ver
// README.md nesta pasta). Se não bater, o teste falha e o hook
// .claude/hooks/visual-test.sh abre o relatório com o diff.
// ============================================================

test.describe("Vitrine do cliente — visual", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // A lista carrega via fetch client-side (GET /api/produtos) —
    // espera o card de verdade aparecer em vez do skeleton antes de
    // tirar a screenshot. "Abacate" é produto seedado por
    // `npm run db:seed` (raiz), sempre em estoque na demo.
    await expect(
      page.locator("#produtos-avulsos").getByRole("heading", { name: "Abacate", exact: true })
    ).toBeVisible();
  });

  test("página inteira", async ({ page }) => {
    await expect(page).toHaveScreenshot("home-completa.png", { fullPage: true });
  });

  test("cabeçalho", async ({ page }) => {
    await expect(page.locator("header")).toHaveScreenshot("home-header.png");
  });

  test("cesta da semana", async ({ page }) => {
    await expect(page.getByText("Cesta da Semana")).toBeVisible();
    await expect(page.locator("#cesta-da-semana")).toHaveScreenshot("home-cesta-da-semana.png");
  });

  test("produtos avulsos", async ({ page }) => {
    await expect(page.locator("#produtos-avulsos")).toHaveScreenshot("home-produtos-avulsos.png");
  });
});
