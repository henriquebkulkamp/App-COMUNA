// ============================================================
// PATCH /api/admin/estoque
//
// Atualiza a quantidade de um produto na aba "Estoque" do Google Sheets.
// Chamada pelo painel /admin quando Elizete edita a quantidade inline.
//
// Body esperado: { produtoId: string, quantidade: number }
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { atualizarQuantidadeNaPlanilha, invalidarCacheProdutos } from "@/lib/google-sheets";

export async function PATCH(request: NextRequest) {
  try {
    const { produtoId, quantidade } = await request.json();

    if (!produtoId || quantidade === undefined || quantidade === null) {
      return NextResponse.json(
        { erro: "Campos obrigatórios: produtoId, quantidade" },
        { status: 400 }
      );
    }

    if (typeof quantidade !== "number" || quantidade < 0) {
      return NextResponse.json(
        { erro: "quantidade deve ser um número maior ou igual a zero" },
        { status: 400 }
      );
    }

    await atualizarQuantidadeNaPlanilha(produtoId, quantidade);
    invalidarCacheProdutos();
    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    console.error("[PATCH /api/admin/estoque] Erro:", erro);
    return NextResponse.json(
      { erro: "Falha ao atualizar a planilha. Tente novamente." },
      { status: 500 }
    );
  }
}
