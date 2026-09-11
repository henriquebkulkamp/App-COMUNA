import { test, expect } from "@playwright/test";
import { logarComoAdmin } from "./admin-auth";

// ============================================================
// e2e/visual/admin.visual.spec.ts — regressão visual do painel admin
// (/admin). Loga de verdade contra o backend (ver admin-auth.ts, que
// lê ADMIN_EMAIL/ADMIN_SENHA de backend/.env) em vez de forjar o
// token no localStorage — mais fiel ao fluxo real e não depende de
// conhecer o formato interno do token.
// ============================================================

test.describe("Painel admin — visual", () => {
  test.beforeEach(async ({ page }) => {
    await logarComoAdmin(page);
    // "Painel Admin" (título no Header) é um <span>, não heading —
    // espera a aba padrão (lazy-loaded, ver PainelAdmin.tsx) em vez
    // disso, que só aparece depois do LojaProvider + chunk carregarem.
    await expect(page.getByRole("tab", { name: /montar cesta/i })).toBeVisible();
  });

  test("aba Montar Cesta (padrão ao abrir)", async ({ page }) => {
    // Tabela grande (todo o catálogo, uma linha por produto) — a
    // busca por 2 frames idênticos pra considerar "estável" demora
    // mais que o timeout default de 5s nessa aba especificamente.
    await expect(page).toHaveScreenshot("admin-montar-cesta.png", { fullPage: true, timeout: 15_000 });
  });

  test("aba Gerenciar Estoque", async ({ page }) => {
    await page.getByRole("tab", { name: /estoque/i }).click();
    await expect(page).toHaveScreenshot("admin-estoque.png", { fullPage: true });
  });

  test("aba Configurações", async ({ page }) => {
    await page.getByRole("tab", { name: /config/i }).click();
    await expect(page).toHaveScreenshot("admin-configuracoes.png", { fullPage: true });
  });
});
