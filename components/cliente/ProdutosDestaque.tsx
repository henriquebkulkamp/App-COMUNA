"use client";

import Carrossel from "@/components/shared/Carrossel";
import CartaoProduto from "./CartaoProduto";
import { useLoja } from "@/lib/loja-context";

// ============================================================
// ProdutosDestaque — usa o Carrossel genérico + o mesmo CartaoProduto
// da grade de Produtos Avulsos (tamanho uniforme nos dois lugares).
// ============================================================
export default function ProdutosDestaque() {
  const { produtosEmEstoque } = useLoja();

  return (
    <Carrossel
      id="produtos-destaque"
      titulo="Produtos em Destaque"
      itens={produtosEmEstoque}
      chave={(produto) => produto.id}
      renderItem={(produto) => <CartaoProduto produto={produto} semMoldura />}
    />
  );
}
