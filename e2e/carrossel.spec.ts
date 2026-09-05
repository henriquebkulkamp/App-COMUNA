import { test, expect, type Page } from "@playwright/test";

// ============================================================
// e2e/carrossel.spec.ts
//
// Componente genérico components/shared/Carrossel.tsx, demonstrado
// em components/cliente/ProdutosDestaque.tsx (id="produtos-destaque").
//
// Cobre exatamente os requisitos pedidos:
//  1. Nenhuma página fica em branco (bug real que apareceu durante o
//     desenvolvimento: deslocar pela largura do container em vez da
//     largura real dos itens acumulava desvio e estourava o conteúdo
//     perto do fim).
//  2. "Próximo" sempre avança por uma página inteira de itens.
//  3. Loop sem fim: da última página, "próximo" volta pra primeira;
//     da primeira, "anterior" volta pra última.
// ============================================================

async function paginaTemConteudoVisivel(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const viewport = document.querySelector('[data-testid="carrossel-viewport"]');
    const trilha = document.querySelector('[data-testid="carrossel-trilha"]');
    if (!viewport || !trilha) return false;
    const areaVisivel = viewport.getBoundingClientRect();
    return [...trilha.children].some((item) => {
      const r = item.getBoundingClientRect();
      return r.width > 0 && r.right > areaVisivel.left && r.left < areaVisivel.right;
    });
  });
}

test.describe("Carrossel — Produtos em Destaque", () => {
  test("cada página mostra produtos de verdade (nunca fica em branco) e navega em loop sem fim", async ({
    page,
  }) => {
    await page.goto("/");

    const carrossel = page.locator("#produtos-destaque");
    await expect(carrossel).toBeVisible();

    const dots = carrossel.locator('button[aria-label^="Ir para página"]');
    const totalPaginas = await dots.count();
    // O catálogo de demonstração tem produtos de sobra pra precisar de
    // mais de uma página — se isso falhar, o teste em si perdeu sentido.
    expect(totalPaginas).toBeGreaterThan(1);

    const proximo = carrossel.getByRole("button", { name: "Ver próximos" });
    const anterior = carrossel.getByRole("button", { name: "Ver anteriores" });

    // Percorre TODAS as páginas pra frente — cada uma precisa ter
    // conteúdo real visível dentro da área do carrossel.
    for (let i = 0; i < totalPaginas; i++) {
      await expect(dots.nth(i)).toHaveAttribute("aria-current", "true");
      expect(
        await paginaTemConteudoVisivel(page),
        `página ${i + 1} de ${totalPaginas} está em branco`
      ).toBe(true);
      await proximo.click();
      await page.waitForTimeout(350); // aguarda a transição (0.3s) assentar
    }

    // Loop: uma última vez em "próximo" a partir da última página volta pra primeira.
    await expect(dots.nth(0)).toHaveAttribute("aria-current", "true");
    expect(await paginaTemConteudoVisivel(page)).toBe(true);

    // E o loop funciona no sentido contrário também: "anterior" na
    // primeira página volta direto pra última.
    await anterior.click();
    await page.waitForTimeout(350);
    await expect(dots.nth(totalPaginas - 1)).toHaveAttribute("aria-current", "true");
    expect(await paginaTemConteudoVisivel(page)).toBe(true);
  });

  test("cliques rápidos em sequência não perdem avanços de página", async ({ page }) => {
    await page.goto("/");
    const carrossel = page.locator("#produtos-destaque");
    const dots = carrossel.locator('button[aria-label^="Ir para página"]');
    const totalPaginas = await dots.count();
    test.skip(totalPaginas < 3, "precisa de pelo menos 3 páginas pra este teste fazer sentido");

    const proximo = carrossel.getByRole("button", { name: "Ver próximos" });
    // 3 cliques nativos, um logo depois do outro, sem esperar re-render
    // entre eles — o cenário que expôs o bug de closure desatualizada.
    await proximo.click();
    await proximo.click();
    await proximo.click();

    // Dá tempo da última transição (300ms) assentar antes de checar —
    // os 3 cliques já foram todos disparados acima; isso só evita
    // checar no meio de uma animação em andamento.
    await page.waitForTimeout(500);
    // 3 cliques a partir da página 0 (índice 0): 0→1→2→3.
    await expect(dots.nth(3)).toHaveAttribute("aria-current", "true");
  });
});
