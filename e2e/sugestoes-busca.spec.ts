import { test, expect } from "@playwright/test";

// ============================================================
// e2e/sugestoes-busca.spec.ts
//
// Autocomplete de busca (FlexSearch) em Produtos Avulsos.
// Confere: dropdown aparece com fuzzy match (mesmo com erro de
// digitação), clicar numa sugestão completa o campo de busca,
// e o console.log de quem foi selecionado acontece.
//
// Usa [data-testid="sugestao-produto"] em vez de role/nome porque
// o card do produto já tem um botão "+ Adicionar" cujo aria-label
// também contém o nome do produto (ex: "Adicionar Abacate ao
// carrinho") — role+nome sozinho pega os dois e quebra em modo
// estrito do Playwright. Pelo mesmo motivo, a checagem de sanidade
// "Abacate está na tela" fica escopada a #produtos-avulsos — o
// carrossel "Produtos em Destaque" pode mostrar o mesmo produto.
// ============================================================

test.describe("Autocomplete de busca — Produtos Avulsos", () => {
  test("digitar com erro de digitação ainda sugere o produto certo (fuzzy match)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#produtos-avulsos").getByRole("heading", { name: "Abacate", exact: true })).toBeVisible();

    const campoBusca = page.getByPlaceholder("Buscar produto...");
    // "acucr" — sem acento e faltando uma letra — precisa achar "Açúcar Mascavo"
    await campoBusca.fill("acucr");

    const sugestao = page.getByTestId("sugestao-produto").filter({ hasText: "Açúcar Mascavo" });
    await expect(sugestao).toBeVisible();
  });

  test("clicar numa sugestão completa o campo de busca e loga no console", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#produtos-avulsos").getByRole("heading", { name: "Abacate", exact: true })).toBeVisible();

    const mensagensConsole: string[] = [];
    page.on("console", (msg) => mensagensConsole.push(msg.text()));

    const campoBusca = page.getByPlaceholder("Buscar produto...");
    await campoBusca.fill("abacate");

    const sugestao = page.getByTestId("sugestao-produto").filter({ hasText: "Abacate" });
    await expect(sugestao).toBeVisible();
    await sugestao.click();

    // Autocomplete: o campo de busca é preenchido com o nome selecionado.
    await expect(campoBusca).toHaveValue("Abacate");

    // O dropdown fecha depois da seleção (não fica reaberto mostrando a
    // própria sugestão que acabou de ser clicada).
    await expect(page.getByTestId("sugestoes-busca")).toHaveCount(0);

    // O clique loga o objeto do produto no console.
    await expect.poll(() => mensagensConsole.some((m) => m.length > 0)).toBe(true);
  });

  test("campo vazio não mostra dropdown de sugestões", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#produtos-avulsos").getByRole("heading", { name: "Abacate", exact: true })).toBeVisible();

    await expect(page.getByTestId("sugestoes-busca")).toHaveCount(0);
  });
});
