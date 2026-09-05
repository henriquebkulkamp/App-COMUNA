// ============================================================
// POST /api/pedidos
//
// Recebe os dados do pedido (JSON no body), grava na planilha
// e retorna o número do pedido gerado.
//
// Analogia Python FastAPI:
//   @app.post("/api/pedidos")
//   def criar_pedido(body: PedidoSchema):
//       numero = salvar_no_sheets(body)
//       return {"numeroPedido": numero}
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { salvarPedido, salvarSolicitacoes, descontarEstoque } from "@/lib/db";
import { precoEfetivo } from "@/lib/formatadores";
import type { ItemCarrinho } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    // request.json() é como body = request.get_json() no Flask
    const body = await request.json();

    const {
      nomeCliente,
      celular,
      tipoEntrega,
      enderecoEntrega,
      produtosSolicitados,
      observacoes,
      totalPreco,
      itens, // array de ItemCarrinho
    } = body;

    // Validação mínima — garante que os campos obrigatórios vieram
    if (!nomeCliente || !celular || !tipoEntrega || totalPreco === undefined) {
      return NextResponse.json(
        { erro: "Campos obrigatórios faltando: nomeCliente, celular, tipoEntrega, totalPreco" },
        { status: 400 }
      );
    }

    // Serializa os itens como texto legível para a planilha da Elizete.
    // Cada item vira uma linha: "2x Tomate (500g) — R$ 8,00"
    // Analogia: '\n'.join([f"...{item}..." for item in itens]) em Python
    const itensTexto = (itens as ItemCarrinho[])
      .map(
        (item) =>
          `${item.quantidade}x ${item.produto.nome} (${item.produto.unidade}) — R$ ${(
            precoEfetivo(item.produto) * item.quantidade
          ).toFixed(2).replace(".", ",")}`
      )
      .join("\n");

    const numeroPedido = await salvarPedido({
      nomeCliente,
      celular,
      tipoEntrega,
      enderecoEntrega,
      observacoes,
      totalPreco,
      itens: itensTexto,
    });

    // Salva solicitações e desconta estoque em paralelo, aguardando ambos
    // antes de responder — no Vercel, operações sem await são cortadas ao retornar.
    await Promise.allSettled([
      produtosSolicitados?.trim()
        ? salvarSolicitacoes({ nomeCliente, celular, numeroPedido, produtosSolicitados })
        : Promise.resolve(),
      descontarEstoque(
        (itens as ItemCarrinho[]).map((item) => ({
          produtoId: item.produto.id,
          quantidadePedida: item.quantidade,
        }))
      ),
    ]);

    return NextResponse.json({ sucesso: true, numeroPedido });
  } catch (erro) {
    console.error("[POST /api/pedidos] Erro ao salvar pedido:", erro);
    return NextResponse.json(
      { erro: "Não foi possível salvar o pedido. O WhatsApp ainda será aberto." },
      { status: 500 }
    );
  }
}
