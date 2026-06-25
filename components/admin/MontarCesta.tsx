"use client";

import { useState, useMemo } from "react";
import { useLoja } from "@/lib/loja-context";

export default function MontarCesta() {
  const { estado, toggleCestaGrande, toggleCestaPequena, atualizarPreco, atualizarQuantidade } = useLoja();
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState<Record<string, boolean>>({});
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvandoCesta, setSalvandoCesta] = useState<Record<string, boolean>>({});
  const [erroCesta, setErroCesta] = useState<Record<string, string>>({});

  const cestaGrande = estado.produtos.find((p) => p.id === "cesta-grande");
  const cestaPequena = estado.produtos.find((p) => p.id === "cesta-pequena");

  async function salvarPreco(produtoId: string, novoPreco: number) {
    if (isNaN(novoPreco) || novoPreco <= 0) return;
    atualizarPreco(produtoId, novoPreco);
    setSalvandoCesta((s) => ({ ...s, [`preco-${produtoId}`]: true }));
    setErroCesta((e) => { const n = { ...e }; delete n[`preco-${produtoId}`]; return n; });
    try {
      const res = await fetch("/api/admin/preco", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId, preco: novoPreco }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setErroCesta((e) => ({ ...e, [`preco-${produtoId}`]: "Erro ao salvar" }));
    } finally {
      setSalvandoCesta((s) => { const n = { ...s }; delete n[`preco-${produtoId}`]; return n; });
    }
  }

  async function salvarQuantidadeCesta(produtoId: string, novaQtd: number) {
    const qtd = Math.max(0, novaQtd);
    atualizarQuantidade(produtoId, qtd);
    setSalvandoCesta((s) => ({ ...s, [`qtd-${produtoId}`]: true }));
    setErroCesta((e) => { const n = { ...e }; delete n[`qtd-${produtoId}`]; return n; });
    try {
      const res = await fetch("/api/admin/estoque", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId, quantidade: qtd }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setErroCesta((e) => ({ ...e, [`qtd-${produtoId}`]: "Erro ao salvar" }));
    } finally {
      setSalvandoCesta((s) => { const n = { ...s }; delete n[`qtd-${produtoId}`]; return n; });
    }
  }

  const produtosParaCesta = useMemo(() => {
    return estado.produtos
      .filter((p) => p.categoria !== "Cestas")
      .filter(
        (p) => busca === "" || p.nome.toLowerCase().includes(busca.toLowerCase())
      )
      .sort((a, b) => {
        const aSelecionado = a.naCestaGrande || a.naCestaPequena ? 0 : 1;
        const bSelecionado = b.naCestaGrande || b.naCestaPequena ? 0 : 1;
        if (aSelecionado !== bSelecionado) return aSelecionado - bSelecionado;
        return a.nome.localeCompare(b.nome, "pt-BR");
      });
  }, [estado.produtos, busca]);

  const totalGrande = estado.produtos.filter((p) => p.naCestaGrande).length;
  const totalPequena = estado.produtos.filter((p) => p.naCestaPequena).length;

  async function handleToggle(
    produtoId: string,
    campo: "naCestaGrande" | "naCestaPequena",
    novoValor: boolean
  ) {
    // Atualiza a UI imediatamente (otimista)
    if (campo === "naCestaGrande") toggleCestaGrande(produtoId);
    else toggleCestaPequena(produtoId);

    const chave = `${produtoId}-${campo}`;
    setSalvando((s) => ({ ...s, [chave]: true }));
    setErros((e) => { const novo = { ...e }; delete novo[chave]; return novo; });

    try {
      const res = await fetch("/api/admin/cesta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId, campo, valor: novoValor }),
      });
      if (!res.ok) throw new Error("Falha ao salvar");
    } catch {
      setErros((e) => ({ ...e, [chave]: "Erro ao salvar" }));
    } finally {
      setSalvando((s) => { const novo = { ...s }; delete novo[chave]; return novo; });
    }
  }

  return (
    <div className="space-y-4">
      {/* Resumo das cestas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-verde-50 border border-verde-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-verde-700">{totalGrande}</p>
          <p className="text-xs text-verde-600">itens na Cesta Grande</p>
          <p className="text-xs text-gray-400 mt-0.5">(meta: 10–12)</p>
        </div>
        <div className="bg-terra-50 border border-terra-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-terra-600">{totalPequena}</p>
          <p className="text-xs text-terra-500">itens na Cesta Pequena</p>
          <p className="text-xs text-gray-400 mt-0.5">(meta: 9–10)</p>
        </div>
      </div>

      {/* Configurações de preço e quantidade das cestas */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Configurações das Cestas</p>
        <div className="grid grid-cols-2 gap-3">
          {/* Cesta Grande */}
          {cestaGrande && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-verde-700">🧺 Cesta Grande</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Preço</label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">R$</span>
                  <input
                    type="number"
                    defaultValue={cestaGrande.preco}
                    min="0"
                    step="0.50"
                    onBlur={(e) => salvarPreco("cesta-grande", parseFloat(e.target.value))}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-verde-300"
                  />
                </div>
                {salvandoCesta["preco-cesta-grande"] && <p className="text-xs text-gray-400">salvando...</p>}
                {erroCesta["preco-cesta-grande"] && <p className="text-xs text-red-500">{erroCesta["preco-cesta-grande"]}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Qtd. disponível</label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => salvarQuantidadeCesta("cesta-grande", (cestaGrande.quantidade ?? 0) - 1)}
                    disabled={!cestaGrande.quantidade}
                    className="w-7 h-7 rounded-md bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 font-bold text-sm flex items-center justify-center disabled:opacity-40"
                  >−</button>
                  <input
                    type="number"
                    value={cestaGrande.quantidade ?? 0}
                    min="0"
                    onChange={(e) => salvarQuantidadeCesta("cesta-grande", parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-verde-300"
                  />
                  <button
                    onClick={() => salvarQuantidadeCesta("cesta-grande", (cestaGrande.quantidade ?? 0) + 1)}
                    className="w-7 h-7 rounded-md bg-gray-100 hover:bg-verde-100 text-gray-600 hover:text-verde-700 font-bold text-sm flex items-center justify-center"
                  >+</button>
                </div>
                {salvandoCesta["qtd-cesta-grande"] && <p className="text-xs text-gray-400">salvando...</p>}
                {erroCesta["qtd-cesta-grande"] && <p className="text-xs text-red-500">{erroCesta["qtd-cesta-grande"]}</p>}
              </div>
            </div>
          )}

          {/* Cesta Pequena */}
          {cestaPequena && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-terra-600">🧺 Cesta Pequena</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Preço</label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">R$</span>
                  <input
                    type="number"
                    defaultValue={cestaPequena.preco}
                    min="0"
                    step="0.50"
                    onBlur={(e) => salvarPreco("cesta-pequena", parseFloat(e.target.value))}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-terra-300"
                  />
                </div>
                {salvandoCesta["preco-cesta-pequena"] && <p className="text-xs text-gray-400">salvando...</p>}
                {erroCesta["preco-cesta-pequena"] && <p className="text-xs text-red-500">{erroCesta["preco-cesta-pequena"]}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Qtd. disponível</label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => salvarQuantidadeCesta("cesta-pequena", (cestaPequena.quantidade ?? 0) - 1)}
                    disabled={!cestaPequena.quantidade}
                    className="w-7 h-7 rounded-md bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 font-bold text-sm flex items-center justify-center disabled:opacity-40"
                  >−</button>
                  <input
                    type="number"
                    value={cestaPequena.quantidade ?? 0}
                    min="0"
                    onChange={(e) => salvarQuantidadeCesta("cesta-pequena", parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-terra-300"
                  />
                  <button
                    onClick={() => salvarQuantidadeCesta("cesta-pequena", (cestaPequena.quantidade ?? 0) + 1)}
                    className="w-7 h-7 rounded-md bg-gray-100 hover:bg-verde-100 text-gray-600 hover:text-verde-700 font-bold text-sm flex items-center justify-center"
                  >+</button>
                </div>
                {salvandoCesta["qtd-cesta-pequena"] && <p className="text-xs text-gray-400">salvando...</p>}
                {erroCesta["qtd-cesta-pequena"] && <p className="text-xs text-red-500">{erroCesta["qtd-cesta-pequena"]}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barra de busca */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto para adicionar à cesta..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-verde-300"
        />
      </div>

      {/* Legenda das colunas */}
      <div className="grid grid-cols-[1fr_80px_80px] gap-2 text-xs font-semibold text-gray-500 uppercase px-1">
        <span>Produto</span>
        <span className="text-center text-verde-600">Grande</span>
        <span className="text-center text-terra-500">Pequena</span>
      </div>

      {/* Lista de produtos */}
      <div className="space-y-1 max-h-[500px] overflow-y-auto">
        {produtosParaCesta.map((produto) => {
          const chaveGrande = `${produto.id}-naCestaGrande`;
          const chavePequena = `${produto.id}-naCestaPequena`;

          return (
            <div
              key={produto.id}
              className={`grid grid-cols-[1fr_80px_80px] gap-2 items-center px-3 py-2 rounded-xl transition-colors ${
                produto.naCestaGrande || produto.naCestaPequena
                  ? "bg-verde-50"
                  : "hover:bg-gray-50"
              }`}
            >
              {/* Nome do produto */}
              <div>
                <p className="text-sm font-medium text-gray-800">{produto.nome}</p>
                <p className="text-xs text-gray-400">{produto.categoria}</p>
                {(erros[chaveGrande] || erros[chavePequena]) && (
                  <p className="text-xs text-red-500 mt-0.5">Erro ao salvar</p>
                )}
              </div>

              {/* Checkbox Cesta Grande */}
              <div className="flex justify-center items-center">
                {salvando[chaveGrande] ? (
                  <span className="text-xs text-gray-400">...</span>
                ) : (
                  <input
                    type="checkbox"
                    checked={produto.naCestaGrande}
                    onChange={() =>
                      handleToggle(produto.id, "naCestaGrande", !produto.naCestaGrande)
                    }
                    className="w-5 h-5 rounded accent-verde-600 cursor-pointer"
                    aria-label={`Incluir ${produto.nome} na Cesta Grande`}
                  />
                )}
              </div>

              {/* Checkbox Cesta Pequena */}
              <div className="flex justify-center items-center">
                {salvando[chavePequena] ? (
                  <span className="text-xs text-gray-400">...</span>
                ) : (
                  <input
                    type="checkbox"
                    checked={produto.naCestaPequena}
                    onChange={() =>
                      handleToggle(produto.id, "naCestaPequena", !produto.naCestaPequena)
                    }
                    className="w-5 h-5 rounded accent-terra-500 cursor-pointer"
                    aria-label={`Incluir ${produto.nome} na Cesta Pequena`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {produtosParaCesta.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-4">
          Nenhum produto encontrado para &quot;{busca}&quot;.
        </p>
      )}
    </div>
  );
}
