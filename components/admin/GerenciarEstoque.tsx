"use client";

import { useState, useMemo } from "react";
import { useLoja } from "@/lib/loja-context";
import AdicionarProduto from "./AdicionarProduto";
import type { Categoria } from "@/lib/types";

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
// GerenciarEstoque — Painel de controle de estoque da Elizete
//
// Funcionalidades:
// 1. Ligar/desligar disponibilidade de cada produto (toggle)
// 2. Editar preço inline
// 3. Editar unidade inline
// 4. Buscar por nome (obrigatório por requisito)
// 5. Adicionar novos produtos
//
// Analogia: é como uma planilha Excel interativa — cada linha
// é um produto e as células são editáveis inline.
// ============================================================
export default function GerenciarEstoque() {
  const { estado, toggleEstoque, atualizarPreco, atualizarUnidade, atualizarQuantidade } = useLoja();
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<Categoria | "Todos">(
    "Todos"
  );
  const [editandoPreco, setEditandoPreco] = useState<string | null>(null);
  const [editandoUnidade, setEditandoUnidade] = useState<string | null>(null);
  const [editandoQuantidade, setEditandoQuantidade] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [erroId, setErroId] = useState<string | null>(null);
  const [salvandoCampo, setSalvandoCampo] = useState<string | null>(null);
  const [erroCampo, setErroCampo] = useState<Record<string, string>>({});
  const [salvandoDisponibilidade, setSalvandoDisponibilidade] = useState<Set<string>>(new Set());
  const [mostrarAdicionarProduto, setMostrarAdicionarProduto] = useState(false);

  // Salva a nova quantidade no Google Sheets e atualiza o estado local.
  // Chamada tanto pelo input direto quanto pelos botões +/-
  async function salvarQuantidade(produtoId: string, quantidade: number) {
    const qtd = Math.max(0, quantidade);
    atualizarQuantidade(produtoId, qtd); // atualiza local imediatamente
    setEditandoQuantidade(null);
    setSalvandoId(produtoId);
    setErroId(null);
    try {
      const res = await fetch("/api/admin/estoque", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId, quantidade: qtd }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (erro) {
      console.error("[GerenciarEstoque] Falha ao salvar quantidade:", erro);
      setErroId(produtoId);
    } finally {
      setSalvandoId(null);
    }
  }

  async function handleToggleDisponibilidade(produtoId: string, novoValor: boolean) {
    toggleEstoque(produtoId);
    setSalvandoDisponibilidade((s) => new Set(s).add(produtoId));
    try {
      await fetch("/api/admin/disponibilidade", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId, emEstoque: novoValor }),
      });
    } catch {
      toggleEstoque(produtoId); // reverte em caso de erro
    } finally {
      setSalvandoDisponibilidade((s) => { const n = new Set(s); n.delete(produtoId); return n; });
    }
  }

  async function salvarPreco(produtoId: string, novoPreco: number) {
    if (isNaN(novoPreco) || novoPreco <= 0) return;
    atualizarPreco(produtoId, novoPreco);
    setEditandoPreco(null);
    const chave = `preco-${produtoId}`;
    setSalvandoCampo(chave);
    setErroCampo((e) => { const n = { ...e }; delete n[chave]; return n; });
    try {
      const res = await fetch("/api/admin/preco", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId, preco: novoPreco }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setErroCampo((e) => ({ ...e, [chave]: "Erro ao salvar" }));
    } finally {
      setSalvandoCampo(null);
    }
  }

  async function salvarUnidade(produtoId: string, novaUnidade: string) {
    const v = novaUnidade.trim();
    if (!v) return;
    atualizarUnidade(produtoId, v);
    setEditandoUnidade(null);
    const chave = `unidade-${produtoId}`;
    setSalvandoCampo(chave);
    setErroCampo((e) => { const n = { ...e }; delete n[chave]; return n; });
    try {
      const res = await fetch("/api/admin/unidade", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId, unidade: v }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setErroCampo((e) => ({ ...e, [chave]: "Erro ao salvar" }));
    } finally {
      setSalvandoCampo(null);
    }
  }

  const produtosFiltrados = useMemo(() => {
    return estado.produtos
      .filter((p) => p.categoria !== "Cestas")
      .filter(
        (p) =>
          categoriaFiltro === "Todos" || p.categoria === categoriaFiltro
      )
      .filter(
        (p) => busca === "" || p.nome.toLowerCase().includes(busca.toLowerCase())
      )
      .sort((a, b) => {
        const aAtivo = a.emEstoque ? 0 : 1;
        const bAtivo = b.emEstoque ? 0 : 1;
        if (aAtivo !== bAtivo) return aAtivo - bAtivo;
        return a.nome.localeCompare(b.nome, "pt-BR");
      });
  }, [estado.produtos, busca, categoriaFiltro]);

  const totalEmEstoque = estado.produtos.filter(
    (p) => p.emEstoque && p.categoria !== "Cestas"
  ).length;

  return (
    <div className="space-y-4">
      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-verde-50 rounded-xl p-3">
          <p className="font-bold text-verde-700 text-xl">{totalEmEstoque}</p>
          <p className="text-xs text-verde-600">em estoque</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="font-bold text-gray-700 text-xl">
            {estado.produtos.filter((p) => p.categoria !== "Cestas").length}
          </p>
          <p className="text-xs text-gray-500">total cadastrado</p>
        </div>
        <div className="bg-terra-50 rounded-xl p-3">
          <p className="font-bold text-terra-600 text-xl">
            {estado.produtos.filter(
              (p) => !p.emEstoque && p.categoria !== "Cestas"
            ).length}
          </p>
          <p className="text-xs text-terra-500">fora de estoque</p>
        </div>
      </div>

      {/* Barra de busca — obrigatória por requisito */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto por nome..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-verde-300"
        />
        {busca && (
          <button
            onClick={() => setBusca("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filtro de categoria */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {["Todos", ...CATEGORIAS].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaFiltro(cat as Categoria | "Todos")}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              categoriaFiltro === cat
                ? "bg-verde-600 text-white"
                : "bg-verde-50 text-verde-700 hover:bg-verde-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Botão Adicionar produto novo */}
      <button
        onClick={() => setMostrarAdicionarProduto(true)}
        className="w-full py-2.5 rounded-xl border-2 border-dashed border-verde-300 text-verde-600 text-sm font-medium hover:bg-verde-50 transition-colors flex items-center justify-center gap-2"
      >
        <span>＋</span> Adicionar Novo Produto
      </button>

      {/* Lista de produtos */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {produtosFiltrados.map((produto) => (
          <div
            key={produto.id}
            className={`rounded-xl border p-3 transition-colors ${
              produto.emEstoque
                ? "border-verde-200 bg-verde-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox de disponibilidade */}
              <label
                className="flex-shrink-0 mt-0.5 cursor-pointer"
                title={produto.emEstoque ? "Disponível — clique para desativar" : "Indisponível — clique para ativar"}
              >
                <input
                  type="checkbox"
                  checked={produto.emEstoque}
                  disabled={salvandoDisponibilidade.has(produto.id)}
                  onChange={() => handleToggleDisponibilidade(produto.id, !produto.emEstoque)}
                  className="w-5 h-5 rounded accent-verde-600 cursor-pointer disabled:opacity-50"
                  aria-label={produto.emEstoque ? "Remover do estoque" : "Adicionar ao estoque"}
                />
              </label>

              {/* Infos do produto */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-800">
                    {produto.nome}
                  </p>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      produto.emEstoque
                        ? "bg-verde-200 text-verde-700"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {produto.emEstoque ? "disponível" : "indisponível"}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{produto.categoria}</p>

                {/* Edição de quantidade com sincronização ao Google Sheets */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500 w-16">Qtd. em estoque:</span>
                  {editandoQuantidade === produto.id ? (
                    <input
                      type="number"
                      defaultValue={produto.quantidade ?? 0}
                      min="0"
                      autoFocus
                      onBlur={(e) => {
                        const v = parseInt(e.target.value, 10);
                        salvarQuantidade(produto.id, isNaN(v) ? 0 : v);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") setEditandoQuantidade(null);
                      }}
                      className="w-16 text-sm border border-verde-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-verde-400"
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => salvarQuantidade(produto.id, (produto.quantidade ?? 0) - 1)}
                        disabled={salvandoId === produto.id || (produto.quantidade ?? 0) === 0}
                        className="w-6 h-6 rounded-md bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 font-bold text-sm flex items-center justify-center disabled:opacity-40"
                      >
                        −
                      </button>
                      <button
                        onClick={() => setEditandoQuantidade(produto.id)}
                        className="min-w-[2rem] text-center text-sm font-semibold text-gray-800 hover:underline px-1"
                        title="Clique para editar a quantidade"
                      >
                        {salvandoId === produto.id ? "..." : (produto.quantidade ?? 0)}
                      </button>
                      <button
                        onClick={() => salvarQuantidade(produto.id, (produto.quantidade ?? 0) + 1)}
                        disabled={salvandoId === produto.id}
                        className="w-6 h-6 rounded-md bg-gray-100 hover:bg-verde-100 text-gray-600 hover:text-verde-700 font-bold text-sm flex items-center justify-center disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  )}
                  {salvandoId === produto.id && (
                    <span className="text-xs text-gray-400">salvando...</span>
                  )}
                  {erroId === produto.id && (
                    <span className="text-xs text-red-500">erro ao salvar</span>
                  )}
                </div>

                {/* Edição inline de preço e unidade */}
                <div className="flex gap-3 mt-1 flex-wrap">
                  {/* Editar preço */}
                  {editandoPreco === produto.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">R$</span>
                      <input
                        type="number"
                        defaultValue={produto.preco}
                        step="0.50"
                        min="0"
                        autoFocus
                        onBlur={(e) => salvarPreco(produto.id, parseFloat(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                          if (e.key === "Escape") setEditandoPreco(null);
                        }}
                        className="w-20 text-sm border border-verde-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-verde-400"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditandoPreco(produto.id)}
                        className="text-xs text-verde-700 font-medium hover:underline"
                        title="Clique para editar o preço"
                      >
                        R$ {produto.preco.toFixed(2).replace(".", ",")} ✏️
                      </button>
                      {salvandoCampo === `preco-${produto.id}` && (
                        <span className="text-xs text-gray-400">salvando...</span>
                      )}
                      {erroCampo[`preco-${produto.id}`] && (
                        <span className="text-xs text-red-500">erro</span>
                      )}
                    </div>
                  )}

                  {/* Editar unidade */}
                  {editandoUnidade === produto.id ? (
                    <input
                      type="text"
                      defaultValue={produto.unidade}
                      autoFocus
                      onBlur={(e) => salvarUnidade(produto.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") setEditandoUnidade(null);
                      }}
                      className="w-28 text-xs border border-verde-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-verde-400"
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditandoUnidade(produto.id)}
                        className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
                        title="Clique para editar a unidade"
                      >
                        {produto.unidade} ✏️
                      </button>
                      {salvandoCampo === `unidade-${produto.id}` && (
                        <span className="text-xs text-gray-400">salvando...</span>
                      )}
                      {erroCampo[`unidade-${produto.id}`] && (
                        <span className="text-xs text-red-500">erro</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {produtosFiltrados.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">
            Nenhum produto encontrado.
          </p>
        )}
      </div>

      {/* Modal de adicionar produto */}
      {mostrarAdicionarProduto && (
        <AdicionarProduto onFechar={() => setMostrarAdicionarProduto(false)} />
      )}
    </div>
  );
}
