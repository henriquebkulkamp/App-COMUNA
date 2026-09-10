import { test, expect, type APIRequestContext } from "@playwright/test";

// ============================================================
// e2e/produtos.spec.ts
//
// Teste de ponta a ponta: browser real -> Next.js -> Postgres.
// Confirma que a vitrine do cliente mostra produtos de verdade —
// os mesmos que o `npm run db:seed` deixa com estoque de demonstração
// (ver ESTOQUE_DEMO em db/seed.mjs). Isso é a regra de negócio
// central do app: só produto com quantidade > 0 aparece pro cliente
// (components/cliente/ProdutosAvulsos.tsx).
//
// As asserções de heading ficam escopadas a #produtos-avulsos porque
// o mesmo produto também pode aparecer no carrossel "Produtos em
// Destaque" (components/cliente/ProdutosDestaque.tsx) — sem escopar,
// um heading::name duplicado quebra o modo estrito do Playwright.
//
// O teste de "some quando zera" mexe no estoque pela própria API
// admin, mas SEMPRE restaura o valor original depois — nunca deixa
// a loja de demonstração vazia pra quem for abrir na sequência.
// ============================================================

const PRODUTO_ID = "abacate";
const PRODUTO_NOME = "Abacate";

async function buscarQuantidadeAtual(request: APIRequestContext): Promise<number> {
  const res = await request.get("/api/produtos");
  expect(res.ok()).toBeTruthy();
  const produtos = (await res.json()) as Array<{ id: string; quantidade?: number }>;
  const produto = produtos.find((p) => p.id === PRODUTO_ID);
  expect(produto, `Produto "${PRODUTO_ID}" não encontrado — rodou o db:seed?`).toBeTruthy();
  return produto!.quantidade ?? 0;
}

async function definirEstoque(request: APIRequestContext, quantidade: number) {
  const res = await request.patch("/api/admin/estoque", {
    data: { produtoId: PRODUTO_ID, quantidade },
  });
  expect(res.ok(), `PATCH /api/admin/estoque falhou: ${await res.text()}`).toBeTruthy();
}

test.describe("Produtos avulsos — cliente", () => {
  test("a loja abre com produtos de verdade na vitrine (não vazia)", async ({ page }) => {
    await page.goto("/");

    const grid = page.locator("#produtos-avulsos");

    // A lista carrega via fetch client-side (lib/loja-context.tsx) — o
    // Playwright espera automaticamente o skeleton sumir e os cards entrarem.
    await expect(grid.getByRole("heading", { name: PRODUTO_NOME, exact: true })).toBeVisible();

    // O estado vazio ("Nenhum produto disponível...") não pode aparecer.
    await expect(grid.getByText("Nenhum produto disponível")).not.toBeVisible();
  });

  test("a Cesta da Semana aparece montada, não vazia", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("A cesta desta semana ainda não foi montada")).not.toBeVisible();
    await expect(page.getByRole("button", { name: /Quero a Cesta Grande/i })).toBeVisible();
  });

  test("produto some da vitrine quando a quantidade zera, e volta ao normal depois", async ({
    page,
    request,
  }) => {
    const quantidadeOriginal = await buscarQuantidadeAtual(request);
    expect(quantidadeOriginal, "produto de teste já estava com estoque 0 — nada pra testar").toBeGreaterThan(0);

    try {
      await definirEstoque(request, 0);
      await page.goto("/");
      await expect(
        page.locator("#produtos-avulsos").getByRole("heading", { name: PRODUTO_NOME, exact: true })
      ).not.toBeVisible();
    } finally {
      // Sempre restaura o valor real da demo, mesmo se a asserção falhar.
      await definirEstoque(request, quantidadeOriginal);
    }
  });
});
