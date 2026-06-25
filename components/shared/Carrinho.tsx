"use client";

import { useState } from "react";
import { useCarrinho } from "@/lib/carrinho-context";
import CheckoutModal from "@/components/cliente/CheckoutModal";

// Formata número como moeda brasileira
// Analogia: f"R$ {valor:.2f}".replace('.', ',') em Python
function formatarPreco(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function Carrinho() {
  const { itens, totalItens, totalPreco, aumentar, diminuir, remover } =
    useCarrinho();
  const [checkoutAberto, setCheckoutAberto] = useState(false);

  return (
    <>
      <section
        id="carrinho-section"
        className="bg-white rounded-2xl shadow-sm border border-verde-100 p-4"
      >
        <h2 className="text-lg font-bold text-verde-700 mb-3 flex items-center gap-2">
          <span>🛒</span>
          Seu Carrinho
          {totalItens > 0 && (
            <span className="ml-auto text-sm font-normal text-gray-500">
              {totalItens} {totalItens === 1 ? "item" : "itens"}
            </span>
          )}
        </h2>

        {itens.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="text-4xl block mb-2">🌱</span>
            <p className="text-sm">
              Seu carrinho está vazio.
              <br />
              Adicione produtos acima!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Lista de itens */}
            {itens.map((item) => (
              <div
                key={item.produto.id}
                className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0"
              >
                {/* Nome e preço unitário */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {item.produto.nome}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatarPreco(item.produto.preco)} / {item.produto.unidade}
                  </p>
                </div>

                {/* Controle de quantidade */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => diminuir(item.produto.id)}
                    className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 font-bold text-sm flex items-center justify-center transition-colors"
                    aria-label="Diminuir quantidade"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">
                    {item.quantidade}
                  </span>
                  <button
                    onClick={() => aumentar(item.produto.id)}
                    className="w-7 h-7 rounded-lg bg-verde-100 hover:bg-verde-200 text-verde-700 font-bold text-sm flex items-center justify-center transition-colors"
                    aria-label="Aumentar quantidade"
                  >
                    +
                  </button>
                </div>

                {/* Subtotal do item */}
                <div className="text-right min-w-[64px]">
                  <p className="text-sm font-semibold text-verde-700">
                    {formatarPreco(item.produto.preco * item.quantidade)}
                  </p>
                  <button
                    onClick={() => remover(item.produto.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Remover item"
                  >
                    remover
                  </button>
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="pt-2 flex items-center justify-between">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="font-bold text-verde-700 text-lg">
                {formatarPreco(totalPreco)}
              </span>
            </div>

            {/* Aviso de disponibilidade — exigido pelo documento de requisitos */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              ⚠️ A disponibilidade final dos produtos avulsos está sujeita a
              confirmação no momento da separação do pedido.
            </div>

            {/* Botão de checkout */}
            <button
              onClick={() => setCheckoutAberto(true)}
              className="w-full btn-primary mt-2"
            >
              Finalizar Pedido via WhatsApp
            </button>
          </div>
        )}
      </section>

      {/* Modal de checkout (abre quando clicar em finalizar) */}
      {checkoutAberto && (
        <CheckoutModal onFechar={() => setCheckoutAberto(false)} />
      )}
    </>
  );
}
