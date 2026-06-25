import { NextRequest, NextResponse } from "next/server";
import { atualizarEmEstoqueNaPlanilha, invalidarCacheProdutos } from "@/lib/google-sheets";

export async function PATCH(request: NextRequest) {
  try {
    const { produtoId, emEstoque } = await request.json();

    if (!produtoId || typeof emEstoque !== "boolean") {
      return NextResponse.json(
        { erro: "Campos obrigatórios: produtoId, emEstoque (boolean)" },
        { status: 400 }
      );
    }

    await atualizarEmEstoqueNaPlanilha(produtoId, emEstoque);
    invalidarCacheProdutos();
    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    console.error("[PATCH /api/admin/disponibilidade] Erro:", erro);
    return NextResponse.json(
      { erro: "Falha ao atualizar disponibilidade na planilha." },
      { status: 500 }
    );
  }
}
