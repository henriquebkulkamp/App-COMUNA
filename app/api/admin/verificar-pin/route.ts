// ============================================================
// POST /api/admin/verificar-pin
//
// Verifica o PIN de acesso ao painel admin no servidor. O valor
// correto nunca é enviado ao cliente — só um booleano de resultado.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { verificarPin } from "@/lib/google-sheets";

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();

    if (typeof pin !== "string" || !pin) {
      return NextResponse.json({ erro: "Campo obrigatório: pin" }, { status: 400 });
    }

    const valido = await verificarPin(pin);
    return NextResponse.json({ valido });
  } catch (erro) {
    console.error("[POST /api/admin/verificar-pin] Erro:", erro);
    return NextResponse.json(
      { erro: "Não foi possível verificar o PIN. Tente novamente." },
      { status: 500 }
    );
  }
}
