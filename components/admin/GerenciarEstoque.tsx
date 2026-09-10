"use client";

import { useState, useMemo } from "react";
import Table from "@cloudscape-design/components/table";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Input from "@cloudscape-design/components/input";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { spaceScaledXs, spaceScaledXxs } from "@cloudscape-design/design-tokens";
import { useLoja } from "@/lib/loja-context";
import { formatarPreco } from "@/lib/formatadores";
import AdicionarProduto from "./AdicionarProduto";
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

// Botão de remover com confirmação inline (Sim/Não) — mantém o mesmo
// padrão simples que já existia, só com componentes Cloudscape.
function BotaoRemover({
  produto,
  removendo,
  onRemover,
}: {
  produto: Produto;
  removendo: boolean;
  onRemover: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);

  if (confirmando) {
    return (
      <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
        <Box fontSize="body-s" color="text-body-secondary">
          Remover?
        </Box>
        <Button
          onClick={onRemover}
          loading={removendo}
          variant="normal"
          ariaLabel={`Confirmar remoção de ${produto.nome}`}
        >
          Sim
        </Button>
        <Button
          onClick={() => setConfirmando(false)}
          disabled={removendo}
          variant="link"
          ariaLabel="Cancelar remoção"
        >
          Não
        </Button>
      </SpaceBetween>
    );
  }

  return (
    <Button
      onClick={() => setConfirmando(true)}
      variant="icon"
      iconName="remove"
      ariaLabel={`Remover ${produto.nome}`}
    />
  );
}

// ============================================================
// GerenciarEstoque — Painel de controle de estoque da Elizete
//
// Tabela editável inline (Table + cellEditing do Cloudscape) — cada
// célula de quantidade/preço/unidade vira um Input quando clicada,
// e o próprio Table cuida do ✓/✗ de confirmar/cancelar a edição.
// Isso substitui ~150 linhas de estado manual de "qual campo tá
// sendo editado agora" que existiam na versão em Tailwind.
// ============================================================
export default function GerenciarEstoque() {
  const {
    estado,
    atualizarPreco,
    atualizarPrecoReal,
    atualizarUnidade,
    atualizarQuantidade,
    removerProduto,
  } = useLoja();
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<Categoria | "Todos">("Todos");
  const [mostrarAdicionarProduto, setMostrarAdicionarProduto] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  async function handleRemoverProduto(produtoId: string) {
    setRemovendoId(produtoId);
    try {
      const res = await fetch("/api/admin/produto", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId }),
      });
      if (!res.ok) throw new Error("Falha ao remover");
      removerProduto(produtoId);
    } catch (erro) {
      console.error("[GerenciarEstoque] Falha ao remover produto:", erro);
    } finally {
      setRemovendoId(null);
    }
  }

  async function salvarQuantidade(produtoId: string, quantidade: number) {
    const qtd = Math.max(0, quantidade);
    atualizarQuantidade(produtoId, qtd);
    const res = await fetch("/api/admin/estoque", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produtoId, quantidade: qtd }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  async function salvarPreco(produtoId: string, novoPreco: number) {
    if (isNaN(novoPreco) || novoPreco <= 0) throw new Error("Preço inválido");
    atualizarPreco(produtoId, novoPreco);
    const res = await fetch("/api/admin/preco", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produtoId, preco: novoPreco }),
    });
    if (!res.ok) throw new Error("Erro ao salvar");
  }

  // Campo vazio limpa o desconto (volta a mostrar só o preço base).
  async function salvarPrecoReal(produtoId: string, valorDigitado: string) {
    const v = valorDigitado.trim();
    const novoPrecoReal = v === "" ? null : Number(v);
    if (novoPrecoReal !== null && (isNaN(novoPrecoReal) || novoPrecoReal < 0)) {
      throw new Error("Preço com desconto inválido");
    }
    atualizarPrecoReal(produtoId, novoPrecoReal);
    const res = await fetch("/api/admin/preco-real", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produtoId, precoReal: novoPrecoReal }),
    });
    if (!res.ok) throw new Error("Erro ao salvar");
  }

  async function salvarUnidade(produtoId: string, novaUnidade: string) {
    const v = novaUnidade.trim();
    if (!v) throw new Error("Unidade não pode ficar vazia");
    atualizarUnidade(produtoId, v);
    const res = await fetch("/api/admin/unidade", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produtoId, unidade: v }),
    });
    if (!res.ok) throw new Error("Erro ao salvar");
  }

  const produtosFiltrados = useMemo(() => {
    return estado.produtos
      .filter((p) => p.categoria !== "Cestas")
      .filter((p) => categoriaFiltro === "Todos" || p.categoria === categoriaFiltro)
      .filter((p) => busca === "" || p.nome.toLowerCase().includes(busca.toLowerCase()))
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
  const totalCadastrado = estado.produtos.filter((p) => p.categoria !== "Cestas").length;
  const totalForaDeEstoque = totalCadastrado - totalEmEstoque;

  return (
    <SpaceBetween size="m">
      {/* Estatísticas rápidas */}
      <ColumnLayout columns={3}>
        <Box textAlign="center" padding="s" data-cor="verde">
          <Box fontWeight="bold" fontSize="heading-xl" color="text-status-success">
            {totalEmEstoque}
          </Box>
          <Box fontSize="body-s" color="text-body-secondary">
            em estoque
          </Box>
        </Box>
        <Box textAlign="center" padding="s">
          <Box fontWeight="bold" fontSize="heading-xl">
            {totalCadastrado}
          </Box>
          <Box fontSize="body-s" color="text-body-secondary">
            total cadastrado
          </Box>
        </Box>
        <Box textAlign="center" padding="s">
          <Box fontWeight="bold" fontSize="heading-xl" color="text-status-warning">
            {totalForaDeEstoque}
          </Box>
          <Box fontSize="body-s" color="text-body-secondary">
            fora de estoque
          </Box>
        </Box>
      </ColumnLayout>

      <Input
        type="search"
        value={busca}
        onChange={({ detail }) => setBusca(detail.value)}
        placeholder="Buscar produto por nome..."
      />

      {/* Filtro de categoria — scroll horizontal no mobile */}
      <div style={{ display: "flex", gap: spaceScaledXs, overflowX: "auto", paddingBottom: spaceScaledXxs }}>
        {(["Todos", ...CATEGORIAS] as const).map((cat) => (
          <div key={cat} style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
            <Button
              variant={categoriaFiltro === cat ? "primary" : "normal"}
              onClick={() => setCategoriaFiltro(cat as Categoria | "Todos")}
            >
              {cat}
            </Button>
          </div>
        ))}
      </div>

      <Button onClick={() => setMostrarAdicionarProduto(true)} iconName="add-plus" fullWidth>
        Adicionar Novo Produto
      </Button>

      <Table<Produto>
        trackBy="id"
        items={produtosFiltrados}
        submitEdit={async (item, column, newValue) => {
          if (column.id === "quantidade") await salvarQuantidade(item.id, Number(newValue));
          if (column.id === "preco") await salvarPreco(item.id, Number(newValue));
          if (column.id === "precoReal") await salvarPrecoReal(item.id, String(newValue));
          if (column.id === "unidade") await salvarUnidade(item.id, String(newValue));
        }}
        empty={
          <Box textAlign="center" color="text-body-secondary" padding="l">
            Nenhum produto encontrado.
          </Box>
        }
        columnDefinitions={[
          {
            id: "produto",
            header: "Produto",
            cell: (p) => (
              <SpaceBetween size="xxxs">
                <Box fontWeight="bold">{p.nome}</Box>
                <Box fontSize="body-s" color="text-body-secondary">
                  {p.categoria}
                </Box>
              </SpaceBetween>
            ),
          },
          {
            id: "status",
            header: "Status",
            cell: (p) => (
              <StatusIndicator type={p.emEstoque ? "success" : "stopped"}>
                {p.emEstoque ? "disponível" : "indisponível"}
              </StatusIndicator>
            ),
          },
          {
            id: "quantidade",
            header: "Qtd.",
            cell: (p) => p.quantidade ?? 0,
            editConfig: {
              ariaLabel: "Quantidade em estoque",
              editingCell: (p, ctx) => (
                <Input
                  autoFocus
                  type="number"
                  value={ctx.currentValue ?? String(p.quantidade ?? 0)}
                  onChange={({ detail }) => ctx.setValue(detail.value)}
                />
              ),
            },
          },
          {
            id: "preco",
            header: "Preço",
            cell: (p) => formatarPreco(p.preco),
            editConfig: {
              ariaLabel: "Preço",
              editingCell: (p, ctx) => (
                <Input
                  autoFocus
                  type="number"
                  step={0.5}
                  value={ctx.currentValue ?? String(p.preco)}
                  onChange={({ detail }) => ctx.setValue(detail.value)}
                />
              ),
            },
          },
          {
            id: "precoReal",
            header: "Preço c/ desconto",
            // "—" quando não há desconto (precoReal ausente ou igual ao preço base)
            cell: (p) =>
              p.precoReal !== undefined && p.precoReal !== p.preco
                ? formatarPreco(p.precoReal)
                : "—",
            editConfig: {
              ariaLabel: "Preço com desconto",
              editingCell: (p, ctx) => (
                <Input
                  autoFocus
                  type="number"
                  step={0.5}
                  placeholder="Sem desconto"
                  value={ctx.currentValue ?? (p.precoReal !== undefined ? String(p.precoReal) : "")}
                  onChange={({ detail }) => ctx.setValue(detail.value)}
                />
              ),
            },
          },
          {
            id: "unidade",
            header: "Unidade",
            cell: (p) => p.unidade,
            editConfig: {
              ariaLabel: "Unidade",
              editingCell: (p, ctx) => (
                <Input
                  autoFocus
                  value={ctx.currentValue ?? p.unidade}
                  onChange={({ detail }) => ctx.setValue(detail.value)}
                />
              ),
            },
          },
          {
            id: "acoes",
            header: "",
            cell: (p) => (
              <BotaoRemover
                produto={p}
                removendo={removendoId === p.id}
                onRemover={() => handleRemoverProduto(p.id)}
              />
            ),
          },
        ]}
      />

      {mostrarAdicionarProduto && (
        <AdicionarProduto onFechar={() => setMostrarAdicionarProduto(false)} />
      )}
    </SpaceBetween>
  );
}
