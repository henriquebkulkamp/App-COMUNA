import { NextRequest, NextResponse } from "next/server";
import { atualizarPrecoNaPlanilha, invalidarCacheProdutos } from "@/lib/google-sheets";

export async function PATCH(request: NextRequest) {
  try {
    const { produtoId, preco } = await request.json();

    if (!produtoId || preco === undefined || typeof preco !== "number" || preco <= 0) {
      return NextResponse.json(
        { erro: "Campos obrigatórios: produtoId, preco (número maior que zero)" },
        { status: 400 }
      );
    }

    await atualizarPrecoNaPlanilha(produtoId, preco);
    invalidarCacheProdutos();
    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    console.error("[PATCH /api/admin/preco] Erro:", erro);
    return NextResponse.json(
      { erro: "Falha ao atualizar o preço na planilha." },
      { status: 500 }
    );
  }
}
