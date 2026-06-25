// ============================================================
// GET /api/produtos
//
// Rota de API do Next.js App Router — roda 100% no servidor.
// Analogia Python: como uma rota Flask/FastAPI:
//   @app.get("/api/produtos")
//   def get_produtos(): return jsonify(buscar_produtos())
//
// O Next.js guarda o resultado em cache por 60 segundos
// (revalidate = 60), então não bate na planilha a cada clique.
// ============================================================

import { NextResponse } from "next/server";
import { buscarProdutosDaPlanilha } from "@/lib/google-sheets";

// Revalida o cache a cada 60 segundos.
// Analogia: como um @lru_cache(maxsize=1) com TTL de 60s em Python.
// Mude para 0 se quiser sempre buscar ao vivo (mais lento).
export const revalidate = 60;

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
