"use client";

import ValorMonetario from "../atomos/ValorMonetario";
import { ESPACO_ENTRE_PRECOS, type TamanhoPreco } from "../tokens";

interface PrecoProps {
  /** Preço base (sem desconto). */
  valor: number;
  /** Preço com desconto, se houver. undefined ou igual a `valor` = sem desconto. */
  valorComDesconto?: number;
  tamanho?: TamanhoPreco;
}

// ============================================================
// Preco — molécula: o preço que aparece pro cliente, com ou sem
// desconto. É o componente único que CartaoProduto, CestaDaSemana,
// Carrinho e CheckoutModal usam — muda só o `tamanho`; o resto (riscar
// o preço original, destacar o efetivo em verde) é sempre igual.
//
// Recebe números, não um Produto — fica desacoplada de domínio e
// serve também pra contas que não são um Produto (ex: subtotal do
// carrinho = preço efetivo × quantidade). A regra de "tem desconto de
// verdade" espelha `temDesconto`/`precoEfetivo` de lib/formatadores.ts,
// só que sobre os números já resolvidos por quem chama.
// ============================================================
export default function Preco({ valor, valorComDesconto, tamanho = "medio" }: PrecoProps) {
  const temDesconto = valorComDesconto !== undefined && valorComDesconto !== valor;
  const valorEfetivo = temDesconto ? valorComDesconto : valor;

  return (
    <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: ESPACO_ENTRE_PRECOS }}>
      {temDesconto && <ValorMonetario valor={valor} riscado />}
      <ValorMonetario valor={valorEfetivo} tamanho={tamanho} destaque />
    </div>
  );
}
