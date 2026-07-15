// ============================================================
// PATCH /api/admin/config
//
// Atualiza o PIN ou o número de WhatsApp na aba "Configurações".
// Body esperado: { campo: "pin" | "whatsappNumero", valor: string }
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { atualizarConfiguracao } from "@/lib/google-sheets";

export async function PATCH(request: NextRequest) {
  try {
    const { campo, valor } = await request.json();

    if (campo !== "pin" && campo !== "whatsappNumero") {
      return NextResponse.json(
        { erro: 'Campo "campo" deve ser "pin" ou "whatsappNumero"' },
        { status: 400 }
      );
    }

    if (typeof valor !== "string" || !valor.trim()) {
      return NextResponse.json({ erro: "Campo obrigatório: valor" }, { status: 400 });
    }

    if (campo === "pin" && !/^\d{4,6}$/.test(valor)) {
      return NextResponse.json(
        { erro: "O PIN deve ter entre 4 e 6 dígitos numéricos" },
        { status: 400 }
      );
    }

    if (campo === "whatsappNumero" && !/^\d{10,13}$/.test(valor)) {
      return NextResponse.json(
        { erro: "Número de WhatsApp inválido — use apenas dígitos, com DDI e DDD (ex: 5516999999999)" },
        { status: 400 }
      );
    }

    await atualizarConfiguracao(campo, valor);
    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    console.error("[PATCH /api/admin/config] Erro:", erro);
    return NextResponse.json(
      { erro: "Falha ao atualizar a configuração. Tente novamente." },
      { status: 500 }
    );
  }
}
