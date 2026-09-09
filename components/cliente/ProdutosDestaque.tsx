"use client";

import Carrossel from "@/components/shared/Carrossel";
import CartaoProduto from "./CartaoProduto";
import type { Produto } from "@/lib/types";

interface ProdutosDestaqueProps {
  produtos: Produto[];
}

// ============================================================
// ProdutosDestaque — usa o Carrossel genérico + o mesmo CartaoProduto
// da grade de Produtos Avulsos (tamanho uniforme nos dois lugares).
//
// Recebe os produtos por prop (buscados no servidor, ver app/page.tsx)
// em vez de useLoja() — a lista só muda quando a Elizete mexe no
// estoque, não a cada visita.
// ============================================================
export default function ProdutosDestaque({ produtos }: ProdutosDestaqueProps) {
  return (
    <Carrossel
      id="produtos-destaque"
      titulo="Produtos em Destaque"
      itens={produtos}
      chave={(produto) => produto.id}
      renderItem={(produto) => <CartaoProduto produto={produto} semMoldura />}
    />
  );
}
