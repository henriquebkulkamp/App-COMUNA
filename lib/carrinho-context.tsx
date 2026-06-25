"use client";

// ============================================================
// CARRINHO CONTEXT — Estado do carrinho de compras do cliente
//
// Analogia Python:
//   class Carrinho:
//     itens: dict[str, ItemCarrinho]  # id → item
//
//     def adicionar(self, produto, qtd=1): ...
//     def remover(self, produto_id): ...
//     def limpar(self): ...
//     def total(self) -> float: ...
// ============================================================

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
} from "react";
import type { Produto, ItemCarrinho } from "./types";

type Action =
  | { type: "ADICIONAR"; produto: Produto }
  | { type: "REMOVER"; id: string }
  | { type: "AUMENTAR"; id: string }
  | { type: "DIMINUIR"; id: string }
  | { type: "LIMPAR" };

interface EstadoCarrinho {
  // Usamos um Record (dicionário) para acesso O(1) por id
  // Analogia: dict[str, ItemCarrinho] em Python
  itens: Record<string, ItemCarrinho>;
}

function reducer(estado: EstadoCarrinho, action: Action): EstadoCarrinho {
  switch (action.type) {
    case "ADICIONAR": {
      const existente = estado.itens[action.produto.id];
      return {
        itens: {
          ...estado.itens,
          [action.produto.id]: {
            produto: action.produto,
            quantidade: existente ? existente.quantidade + 1 : 1,
          },
        },
      };
    }

    case "AUMENTAR": {
      const item = estado.itens[action.id];
      if (!item) return estado;
      return {
        itens: {
          ...estado.itens,
          [action.id]: { ...item, quantidade: item.quantidade + 1 },
        },
      };
    }

    case "DIMINUIR": {
      const item = estado.itens[action.id];
      if (!item) return estado;
      if (item.quantidade <= 1) {
        // Remove o item quando a quantidade chega a 0
        // Analogia: del d[key] em Python, mas sem mutar
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [action.id]: _removido, ...resto } = estado.itens;
        return { itens: resto };
      }
      return {
        itens: {
          ...estado.itens,
          [action.id]: { ...item, quantidade: item.quantidade - 1 },
        },
      };
    }

    case "REMOVER": {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [action.id]: _removido, ...resto } = estado.itens;
      return { itens: resto };
    }

    case "LIMPAR":
      return { itens: {} };

    default:
      return estado;
  }
}

interface CarrinhoContextType {
  itens: ItemCarrinho[];
  totalItens: number;
  totalPreco: number;
  adicionar: (produto: Produto) => void;
  remover: (id: string) => void;
  aumentar: (id: string) => void;
  diminuir: (id: string) => void;
  limpar: () => void;
  estaNoCarrinho: (id: string) => boolean;
  quantidadeNoCarrinho: (id: string) => number;
}

const CarrinhoContext = createContext<CarrinhoContextType | null>(null);

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(reducer, { itens: {} });

  // Converte o Record em array para facilitar iteração nos componentes
  // Analogia Python: list(itens.values())
  const itens = Object.values(estado.itens);

  // sum(item['quantidade'] for item in itens)
  const totalItens = itens.reduce((acc, item) => acc + item.quantidade, 0);

  // sum(item['produto']['preco'] * item['quantidade'] for item in itens)
  const totalPreco = itens.reduce(
    (acc, item) => acc + item.produto.preco * item.quantidade,
    0
  );

  const adicionar = useCallback(
    (produto: Produto) => dispatch({ type: "ADICIONAR", produto }),
    []
  );
  const remover = useCallback(
    (id: string) => dispatch({ type: "REMOVER", id }),
    []
  );
  const aumentar = useCallback(
    (id: string) => dispatch({ type: "AUMENTAR", id }),
    []
  );
  const diminuir = useCallback(
    (id: string) => dispatch({ type: "DIMINUIR", id }),
    []
  );
  const limpar = useCallback(() => dispatch({ type: "LIMPAR" }), []);

  const estaNoCarrinho = useCallback(
    (id: string) => Boolean(estado.itens[id]),
    [estado.itens]
  );
  const quantidadeNoCarrinho = useCallback(
    (id: string) => estado.itens[id]?.quantidade ?? 0,
    [estado.itens]
  );

  return (
    <CarrinhoContext.Provider
      value={{
        itens,
        totalItens,
        totalPreco,
        adicionar,
        remover,
        aumentar,
        diminuir,
        limpar,
        estaNoCarrinho,
        quantidadeNoCarrinho,
      }}
    >
      {children}
    </CarrinhoContext.Provider>
  );
}

export function useCarrinho() {
  const ctx = useContext(CarrinhoContext);
  if (!ctx)
    throw new Error("useCarrinho deve ser usado dentro de <CarrinhoProvider>");
  return ctx;
}
