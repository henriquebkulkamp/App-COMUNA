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

// Emoji de categoria — para dar identidade visual a cada grupo de produto
// Analogia: é como um dict Python que mapeia categoria → emoji
const EMOJI_CATEGORIA: Record<string, string> = {
  Frutas: "🍎",
  "Verduras e Legumes": "🥦",
  "Ervas e Temperos": "🌿",
  Proteínas: "🥚",
  "Grãos e Cereais": "🌾",
  "Derivados e Processados": "🫙",
  Bebidas: "🧃",
  "Pães e Panificação": "🍞",
  "Mel e Apícolas": "🍯",
  Cestas: "🧺",
};

export default function CardProduto({ produto }: CardProdutoProps) {
  const { adicionar, diminuir, estaNoCarrinho, quantidadeNoCarrinho } =
    useCarrinho();

  const noCarrinho = estaNoCarrinho(produto.id);
  const quantidade = quantidadeNoCarrinho(produto.id);
  const emoji = EMOJI_CATEGORIA[produto.categoria] ?? "🌱";

  return (
    <div className="card-produto">
      {/* Ícone e categoria */}
      <div className="flex items-start justify-between gap-2">
        <div className="w-12 h-12 rounded-xl bg-verde-50 flex items-center justify-center text-2xl flex-shrink-0">
          {produto.imagemUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={produto.imagemUrl}
              alt={produto.nome}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            emoji
          )}
        </div>
        <span className="badge-categoria">{produto.categoria}</span>
      </div>

      {/* Nome e descrição */}
      <div>
        <h3 className="font-semibold text-gray-800 text-sm leading-tight">
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
