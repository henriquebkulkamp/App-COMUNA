// ============================================================
// PATCH /api/admin/preco-real — atualiza o preço com desconto de um
// produto. `precoReal: null` limpa o desconto (volta a mostrar só o
// preço base).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { atualizarPrecoRealNaPlanilha, invalidarCacheProdutos } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  try {
    const { produtoId, precoReal } = await request.json();

    if (!produtoId) {
      return NextResponse.json({ erro: "Campo obrigatório: produtoId" }, { status: 400 });
    }
    if (precoReal !== null && (typeof precoReal !== "number" || precoReal < 0)) {
      return NextResponse.json(
        { erro: "Campo precoReal deve ser um número maior ou igual a zero, ou null" },
        { status: 400 }
      );
    }

    await atualizarPrecoRealNaPlanilha(produtoId, precoReal);
    invalidarCacheProdutos();
    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    console.error("[PATCH /api/admin/preco-real] Erro:", erro);
    return NextResponse.json(
      { erro: "Falha ao atualizar o preço com desconto." },
      { status: 500 }
    );
  }
}
