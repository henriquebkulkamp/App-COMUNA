// ============================================================
// GET /api/produtos
//
// Rota de API do Next.js App Router — roda 100% no servidor.
// Analogia Python: como uma rota Flask/FastAPI:
//   @app.get("/api/produtos")
//   def get_produtos(): return jsonify(buscar_produtos())
//
// Sem cache HTTP — cada requisição busca dados frescos.
// A proteção de quota fica no módulo google-sheets (cache de 30s nos rows).
// ============================================================

import { NextResponse } from "next/server";
import { buscarProdutosDaPlanilha } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const produtos = await buscarProdutosDaPlanilha();
    return NextResponse.json(produtos);
  } catch (erro) {
    console.error("[GET /api/produtos] Erro ao buscar planilha:", erro);
    return NextResponse.json(
      { erro: "Não foi possível carregar os produtos. Tente novamente." },
      { status: 500 }
    );
  }
}
