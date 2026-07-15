"use client";

import { useState } from "react";
import { useLoja } from "@/lib/loja-context";
import type { Categoria, Produto } from "@/lib/types";

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

interface AdicionarProdutoProps {
  onFechar: () => void;
}

// Gera um id único a partir do nome do produto
// Analogia: slugify() em Django
function gerarId(nome: string): string {
  return (
    nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // remove acentos
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now()
  );
}

export default function AdicionarProduto({ onFechar }: AdicionarProdutoProps) {
  const { adicionarProduto } = useLoja();
  const [form, setForm] = useState({
    nome: "",
    preco: "",
    unidade: "",
    categoria: CATEGORIAS[0] as Categoria,
    descricao: "",
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    const preco = parseFloat(form.preco);
    if (!form.nome.trim()) return setErro("Informe o nome do produto.");
    if (isNaN(preco) || preco <= 0) return setErro("Preço deve ser positivo.");
    if (!form.unidade.trim()) return setErro("Informe a unidade (ex: 500g).");

    const novoProduto: Produto = {
      id: gerarId(form.nome),
      nome: form.nome.trim(),
      preco,
      unidade: form.unidade.trim(),
      categoria: form.categoria,
      descricao: form.descricao.trim() || undefined,
      emEstoque: true, // já ativa no estoque ao criar
      quantidade: 0,
      naCestaGrande: false,
      naCestaPequena: false,
    };

    setSalvando(true);
    try {
      const res = await fetch("/api/admin/produto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: novoProduto.id,
          nome: novoProduto.nome,
          preco: novoProduto.preco,
          unidade: novoProduto.unidade,
          categoria: novoProduto.categoria,
          descricao: novoProduto.descricao,
        }),
      });
      if (!res.ok) {
        const dados = await res.json();
        throw new Error(dados.erro || "Erro ao salvar na planilha");
      }
      // Só atualiza o estado local depois de confirmar que gravou na planilha
      adicionarProduto(novoProduto);
      onFechar();
    } catch (erro) {
      setErro(erro instanceof Error ? erro.message : "Falha ao adicionar o produto.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-verde-700 text-lg">Novo Produto</h2>
          <button
            onClick={onFechar}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <input
              type="text"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Pitomba"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-verde-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preço (R$) *
              </label>
              <input
                type="number"
                required
                step="0.50"
                min="0.01"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
                placeholder="0,00"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-verde-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidade *
              </label>
              <input
                type="text"
                required
                value={form.unidade}
                onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                placeholder="Ex: 500g, 1 unidade"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-verde-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria *
            </label>
            <select
              value={form.categoria}
              onChange={(e) =>
                setForm({ ...form, categoria: e.target.value as Categoria })
              }
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-verde-300 bg-white"
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição (opcional)
            </label>
            <textarea
              value={form.descricao}
              onChange={(e) =>
                setForm({ ...form, descricao: e.target.value })
              }
              placeholder="Uma linha sobre o produto..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-verde-300 resize-none"
            />
          </div>

          {erro && (
            <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2">
              {erro}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onFechar}
              disabled={salvando}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button type="submit" disabled={salvando} className="flex-1 btn-primary disabled:opacity-60">
              {salvando ? "Salvando..." : "Adicionar Produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
