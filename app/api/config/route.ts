// ============================================================
// GET /api/config
//
// Configurações públicas usadas pelo cliente (ex: número de WhatsApp
// para onde as mensagens de pedido são enviadas). NUNCA retorna o PIN.
// ============================================================

import { NextResponse } from "next/server";
import { buscarConfigPublica } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await buscarConfigPublica();
    return NextResponse.json(config);
  } catch (erro) {
    console.error("[GET /api/config] Erro ao buscar configurações:", erro);
    return NextResponse.json(
      { erro: "Não foi possível carregar as configurações." },
      { status: 500 }
    );
  }
}
