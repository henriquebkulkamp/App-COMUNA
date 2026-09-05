// ============================================================
// FORMATADORES — funções puras de formatação reaproveitadas em
// vários lugares (grid de produtos, carrossel, cesta da semana...).
// ============================================================

import type { Produto } from "./types";

export function formatarPreco(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Tem desconto de verdade só quando `precoReal` existe E é diferente
// do preço base — igual (ou ausente) é tratado como preço normal, sem
// nenhum tratamento visual especial.
export function temDesconto(produto: Produto): boolean {
  return produto.precoReal !== undefined && produto.precoReal !== produto.preco;
}

// Preço que o cliente de fato paga: o com desconto quando houver,
// senão o preço base. É o valor a usar em qualquer cálculo (carrinho,
// checkout, pedido) — a exibição cortada/riscada é só cosmética.
export function precoEfetivo(produto: Produto): number {
  return produto.precoReal ?? produto.preco;
}

export function normalizarUnidade(unidade: string): string {
  if (/^\d+\s+unidade(s)?$/i.test(unidade.trim())) return "unidade";
  return unidade;
}
