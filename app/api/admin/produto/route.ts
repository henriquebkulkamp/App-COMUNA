// ============================================================
// POST /api/admin/produto   — cria um novo produto na planilha
// DELETE /api/admin/produto — remove um produto da planilha
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  adicionarProdutoNaPlanilha,
  removerProdutoDaPlanilha,
  invalidarCacheProdutos,
} from "@/lib/db";
import type { Categoria } from "@/lib/types";

const CATEGORIAS_VALIDAS: Categoria[] = [
  "Cestas",
  "Frutas",
  "Verduras e Legumes",
  "Ervas e Temperos",
  "Proteínas",
  "Grãos e Cereais",
  "Derivados e Processados",
  "Bebidas",
  "Pães e Panificação",
  "Mel e Apícolas",
];

export async function POST(request: NextRequest) {
  try {
    const { id, nome, preco, unidade, categoria, descricao } = await request.json();

    if (!id || !nome || typeof preco !== "number" || preco <= 0 || !unidade) {
      return NextResponse.json(
        { erro: "Campos obrigatórios: id, nome, preco (> 0), unidade" },
        { status: 400 }
      );
    }

    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
      return NextResponse.json({ erro: "Categoria inválida" }, { status: 400 });
    }

    await adicionarProdutoNaPlanilha({ id, nome, preco, unidade, categoria, descricao });
    invalidarCacheProdutos();
    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    console.error("[POST /api/admin/produto] Erro:", erro);
    return NextResponse.json(
      { erro: "Falha ao adicionar o produto na planilha." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { produtoId } = await request.json();

    if (!produtoId) {
      return NextResponse.json({ erro: "Campo obrigatório: produtoId" }, { status: 400 });
    }

    await removerProdutoDaPlanilha(produtoId);
    invalidarCacheProdutos();
    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    console.error("[DELETE /api/admin/produto] Erro:", erro);
    return NextResponse.json(
      { erro: "Falha ao remover o produto da planilha." },
      { status: 500 }
    );
  }
}
