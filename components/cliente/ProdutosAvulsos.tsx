"use client";

import { useState, useMemo } from "react";
import { useLoja } from "@/lib/loja-context";
import CardProduto from "./CardProduto";
import type { Categoria } from "@/lib/types";

// Lista de categorias para o filtro — mesma ordem que aparece nos dados
const CATEGORIAS: Categoria[] = [
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

// ============================================================
// ProdutosAvulsos — Mostra apenas os produtos com emEstoque=true
//
// Regra de negócio central: o cliente SÓ vê produtos disponíveis.
// Isso resolve o problema do formulário antigo que mostrava tudo.
//
// Lógica de filtro (análogo a pandas):
//   df[df['em_estoque'] == True & df['categoria'] == categoria_filtro]
//
// Aqui usamos useMemo para evitar recomputar o filtro a cada render
// (assim como cachear o resultado de um .query() caro em pandas)
// ============================================================
export default function ProdutosAvulsos() {
  const { produtosEmEstoque, carregandoProdutos } = useLoja();
  const [categoriaAtiva, setCategoriaAtiva] = useState<Categoria | "Todos">(
    "Todos"
  );
  const [busca, setBusca] = useState("");

  // Calcula quais categorias têm ao menos 1 produto em estoque
  // Analogia: set(df['categoria'].unique()) filtrado
  const categoriasComEstoque = useMemo(() => {
    const cats = new Set(produtosEmEstoque.map((p) => p.categoria));
    return CATEGORIAS.filter((c) => cats.has(c));
  }, [produtosEmEstoque]);

  // Aplica filtros de categoria + texto de busca
  // Analogia Python:
  //   filtrado = [p for p in produtos
  //     if (categoria == "Todos" or p['categoria'] == categoria)
  //     and busca.lower() in p['nome'].lower()]
  const produtosFiltrados = useMemo(() => {
    return produtosEmEstoque.filter((p) => {
      const matchCategoria =
        categoriaAtiva === "Todos" || p.categoria === categoriaAtiva;
      const matchBusca =
        busca === "" || p.nome.toLowerCase().includes(busca.toLowerCase());
      return matchCategoria && matchBusca;
    });
  }, [produtosEmEstoque, categoriaAtiva, busca]);

  // Enquanto a planilha do Google Sheets carrega, mostra skeleton
  if (carregandoProdutos) {
    return (
      <section className="bg-white rounded-2xl shadow-sm border border-verde-100 p-5">
        <h2 className="text-xl font-bold text-verde-700 flex items-center gap-2 mb-4">
          <span>🛒</span> Produtos Avulsos
        </h2>
        <div className="text-center py-8 text-gray-400">
          <div className="animate-spin text-4xl mb-3">🌿</div>
          <p className="text-sm">Carregando produtos da COMUNA...</p>
        </div>
      </section>
    );
  }

  if (produtosEmEstoque.length === 0) {
    return (
      <section className="bg-white rounded-2xl shadow-sm border border-verde-100 p-5">
        <h2 className="text-xl font-bold text-verde-700 flex items-center gap-2 mb-3">
          <span>🛒</span> Produtos Avulsos
        </h2>
        <div className="text-center py-8 text-gray-400">
          <span className="text-4xl block mb-2">📦</span>
          <p className="text-sm">
            Nenhum produto disponível no momento.
            <br />
            Volte na sexta-feira quando a loja abre!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-verde-100 p-5">
      <h2 className="text-xl font-bold text-verde-700 flex items-center gap-2 mb-3">
        <span>🛒</span> Produtos Avulsos
        <span className="ml-auto text-sm font-normal text-gray-500">
          {produtosEmEstoque.length}{" "}
          {produtosEmEstoque.length === 1
            ? "produto disponível"
            : "produtos disponíveis"}
        </span>
      </h2>

      {/* Campo de busca */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          🔍
        </span>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto..."
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-verde-300"
        />
        {busca && (
          <button
            onClick={() => setBusca("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filtros de categoria — scroll horizontal no mobile */}
      {categoriasComEstoque.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
          <button
            onClick={() => setCategoriaAtiva("Todos")}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              categoriaAtiva === "Todos"
                ? "bg-verde-600 text-white"
                : "bg-verde-50 text-verde-700 hover:bg-verde-100"
            }`}
          >
            Todos
          </button>
          {categoriasComEstoque.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaAtiva(cat)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                categoriaAtiva === cat
                  ? "bg-verde-600 text-white"
                  : "bg-verde-50 text-verde-700 hover:bg-verde-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid de cards */}
      {produtosFiltrados.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          Nenhum produto encontrado para &quot;{busca}&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {produtosFiltrados.map((produto) => (
            <CardProduto key={produto.id} produto={produto} />
          ))}
        </div>
      )}
    </section>
  );
}
