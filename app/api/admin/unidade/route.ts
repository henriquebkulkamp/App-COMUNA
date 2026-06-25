import { NextRequest, NextResponse } from "next/server";
import { atualizarUnidadeNaPlanilha } from "@/lib/google-sheets";

export async function PATCH(request: NextRequest) {
  try {
    const { produtoId, unidade } = await request.json();

    if (!produtoId || !unidade?.trim()) {
      return NextResponse.json(
        { erro: "Campos obrigatórios: produtoId, unidade" },
        { status: 400 }
      );
    }

    await atualizarUnidadeNaPlanilha(produtoId, unidade.trim());
    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    console.error("[PATCH /api/admin/unidade] Erro:", erro);
    return NextResponse.json(
      { erro: "Falha ao atualizar a unidade na planilha." },
      { status: 500 }
    );
  }
}
