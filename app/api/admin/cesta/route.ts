import { NextRequest, NextResponse } from "next/server";
import { atualizarCestaNaPlanilha, invalidarCacheProdutos } from "@/lib/google-sheets";

export async function PATCH(req: NextRequest) {
  try {
    const { produtoId, campo, valor } = await req.json();

    if (!produtoId || (campo !== "naCestaGrande" && campo !== "naCestaPequena") || typeof valor !== "boolean") {
      return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });
    }

    await atualizarCestaNaPlanilha(produtoId, campo, valor);
    invalidarCacheProdutos();
    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    console.error("[/api/admin/cesta] Erro:", erro);
    return NextResponse.json({ erro: "Erro ao atualizar planilha." }, { status: 500 });
  }
}
