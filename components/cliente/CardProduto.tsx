"use client";

import { useCarrinho } from "@/lib/carrinho-context";
import type { Produto } from "@/lib/types";

interface CardProdutoProps {
  produto: Produto;
}

function formatarPreco(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizarUnidade(unidade: string): string {
  if (/^\d+\s+unidade(s)?$/i.test(unidade.trim())) return "unidade";
  return unidade;
}

export default function CardProduto({ produto }: CardProdutoProps) {
  const { adicionar, diminuir, estaNoCarrinho, quantidadeNoCarrinho } =
    useCarrinho();

  const noCarrinho = estaNoCarrinho(produto.id);
  const quantidade = quantidadeNoCarrinho(produto.id);

  return (
    <div className="card-produto">
      {/* Categoria */}
      <div className="flex items-start justify-end">
        <span className="badge-categoria">{produto.categoria}</span>
      </div>

      {/* Nome e descrição — nome em destaque, sem ícone */}
      <div>
        <h3 className="font-bold text-gray-800 text-base leading-tight">
          {produto.nome}
        </h3>
        {produto.descricao && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {produto.descricao}
          </p>
        )}
      </div>

      {/* Badge de quantidade em estoque */}
      {produto.quantidade !== undefined && produto.quantidade > 0 && (
        <div className="mt-auto">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              produto.quantidade <= 5
                ? "bg-amber-100 text-amber-700"
                : "bg-verde-100 text-verde-700"
            }`}
          >
            {produto.quantidade <= 5
              ? `Últimas ${produto.quantidade}`
              : `${produto.quantidade} em estoque`}
          </span>
        </div>
      )}

      {/* Preço e unidade */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-verde-700 font-bold text-base">
            {formatarPreco(produto.preco)}
          </span>
          <span className="text-gray-400 text-xs ml-1">/{normalizarUnidade(produto.unidade)}</span>
        </div>

        {/* Controle de adicionar/remover */}
        {!noCarrinho ? (
          <button
            onClick={() => adicionar(produto)}
            className="bg-verde-600 hover:bg-verde-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors active:scale-95"
            aria-label={`Adicionar ${produto.nome} ao carrinho`}
          >
            + Adicionar
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => diminuir(produto.id)}
              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 font-bold flex items-center justify-center transition-colors"
              aria-label="Diminuir"
            >
              −
            </button>
            <span className="w-5 text-center font-semibold text-sm">
              {quantidade}
            </span>
            <button
              onClick={() => adicionar(produto)}
              className="w-7 h-7 rounded-lg bg-verde-100 hover:bg-verde-200 text-verde-700 font-bold flex items-center justify-center transition-colors"
              aria-label="Aumentar"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
