import { test, expect } from "@playwright/test";

// ============================================================
// e2e/visual/carrinho.visual.spec.ts — regressão visual da página
// "/carrinho", vazia e com item. Ver home.visual.spec.ts pro
// racional geral de por que isso é separado dos testes funcionais.
// ============================================================

test.describe("Carrinho — visual", () => {
  test("vazio", async ({ page }) => {
    await page.goto("/carrinho");
    await expect(page.getByText(/carrinho.*vazio/i)).toBeVisible();
    await expect(page).toHaveScreenshot("carrinho-vazio.png", { fullPage: true });
  });

  test("com item", async ({ page }) => {
    await page.goto("/");
    // "Quero a Cesta Grande" — mesmo botão usado em
    // e2e/produtos.spec.ts (raiz) pra popular o carrinho sem precisar
    // de um card de produto avulso com botão de adicionar próprio.
    const botaoCestaGrande = page.getByRole("button", { name: /Quero a Cesta Grande/i });
    await expect(botaoCestaGrande).toBeVisible();
    await botaoCestaGrande.click();
    await expect(page.getByRole("button", { name: /Adicionada ao carrinho/i })).toBeVisible();

    // Navega pelo ícone do carrinho (SPA, via react-router), não
    // page.goto("/carrinho") — esse faz reload completo da página, o
    // que perde o estado do carrinho por uma corrida entre o efeito
    // que carrega do localStorage e o que salva nele (ver
    // src/lib/carrinho-context.tsx). Um usuário de verdade nunca passa
    // por essa corrida porque o próprio Header intercepta o clique e
    // navega client-side (ver src/components/shared/Header.tsx) — é
    // assim que este teste também deve navegar.
    await page.locator('a[href="/carrinho"]').click();
    await expect(page.getByText("Cesta Grande")).toBeVisible();
    await expect(page).toHaveScreenshot("carrinho-com-item.png", { fullPage: true });
  });
});
