import { useState, useMemo } from "react";
import Table from "@cloudscape-design/components/table";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";
import Input from "@cloudscape-design/components/input";
import Checkbox from "@cloudscape-design/components/checkbox";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { spaceScaledXs } from "@cloudscape-design/design-tokens";
import { useLoja } from "@/lib/loja-context";
import type { Produto } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import Icone from "@/icons/Icone";

export default function MontarCesta() {
  const {
    estado,
    toggleCestaGrande,
    toggleCestaPequena,
    atualizarPreco,
    atualizarPrecoReal,
    atualizarQuantidade,
  } = useLoja();
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState<Record<string, boolean>>({});

  const cestaGrande = estado.produtos.find((p) => p.id === "cesta-grande");
  const cestaPequena = estado.produtos.find((p) => p.id === "cesta-pequena");

  async function salvarPreco(produtoId: string, novoPreco: number) {
    if (isNaN(novoPreco) || novoPreco <= 0) return;
    atualizarPreco(produtoId, novoPreco);
    try {
      await apiFetch("/api/admin/preco", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId, preco: novoPreco }),
      });
    } catch (erro) {
      console.error("[MontarCesta] Falha ao salvar preço:", erro);
    }
  }

  // Campo vazio limpa o desconto (volta a mostrar só o preço base).
  async function salvarPrecoReal(produtoId: string, valorDigitado: string) {
    const v = valorDigitado.trim();
    const novoPrecoReal = v === "" ? null : parseFloat(v);
    if (novoPrecoReal !== null && isNaN(novoPrecoReal)) return;
    if (novoPrecoReal !== null && novoPrecoReal < 0) return;
    atualizarPrecoReal(produtoId, novoPrecoReal);
    try {
      await apiFetch("/api/admin/preco-real", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId, precoReal: novoPrecoReal }),
      });
    } catch (erro) {
      console.error("[MontarCesta] Falha ao salvar preço com desconto:", erro);
    }
  }

  async function salvarQuantidadeCesta(produtoId: string, novaQtd: number) {
    const qtd = Math.max(0, novaQtd);
    atualizarQuantidade(produtoId, qtd);
    try {
      await apiFetch("/api/admin/estoque", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId, quantidade: qtd }),
      });
    } catch (erro) {
      console.error("[MontarCesta] Falha ao salvar quantidade:", erro);
    }
  }

  const produtosParaCesta = useMemo(() => {
    return estado.produtos
      .filter((p) => p.categoria !== "Cestas")
      .filter((p) => busca === "" || p.nome.toLowerCase().includes(busca.toLowerCase()))
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
    if (campo === "naCestaGrande") toggleCestaGrande(produtoId);
    else toggleCestaPequena(produtoId);

    const chave = `${produtoId}-${campo}`;
    setSalvando((s) => ({ ...s, [chave]: true }));
    try {
      const res = await apiFetch("/api/admin/cesta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId, campo, valor: novoValor }),
      });
      if (!res.ok) throw new Error("Falha ao salvar");
    } catch (erro) {
      console.error("[MontarCesta] Falha ao salvar cesta:", erro);
    } finally {
      setSalvando((s) => {
        const novo = { ...s };
        delete novo[chave];
        return novo;
      });
    }
  }

  return (
    <SpaceBetween size="m">
      {/* Resumo das cestas */}
      <ColumnLayout columns={2}>
        <Box textAlign="center" padding="s">
          <Box fontWeight="bold" fontSize="heading-xl" color="text-status-success">
            {totalGrande}
          </Box>
          <Box fontSize="body-s" color="text-body-secondary">
            itens na Cesta Grande (meta: 10–12)
          </Box>
        </Box>
        <Box textAlign="center" padding="s">
          <Box fontWeight="bold" fontSize="heading-xl" color="text-status-warning">
            {totalPequena}
          </Box>
          <Box fontSize="body-s" color="text-body-secondary">
            itens na Cesta Pequena (meta: 9–10)
          </Box>
        </Box>
      </ColumnLayout>

      {/* Configurações de preço e quantidade das cestas */}
      <Container header={<Header variant="h3">Configurações das Cestas</Header>}>
        <ColumnLayout columns={2}>
          {cestaGrande && (
            <SpaceBetween size="s">
              <Box fontWeight="bold">
                <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                  <Icone nome="cesta" /> Cesta Grande
                </SpaceBetween>
              </Box>
              <div style={{ display: "flex", alignItems: "center", gap: spaceScaledXs }}>
                <Box>R$</Box>
                <Input
                  type="number"
                  step={0.5}
                  value={String(cestaGrande.preco)}
                  onChange={({ detail }) => {
                    const v = parseFloat(detail.value);
                    if (!isNaN(v)) salvarPreco("cesta-grande", v);
                  }}
                />
              </div>
              <div>
                <Box fontSize="body-s" color="text-body-secondary">
                  Preço com desconto (opcional)
                </Box>
                <div style={{ display: "flex", alignItems: "center", gap: spaceScaledXs }}>
                  <Box>R$</Box>
                  <Input
                    type="number"
                    step={0.5}
                    placeholder="Sem desconto"
                    value={cestaGrande.precoReal !== undefined ? String(cestaGrande.precoReal) : ""}
                    onChange={({ detail }) => salvarPrecoReal("cesta-grande", detail.value)}
                  />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: spaceScaledXs }}>
                <Input
                  type="number"
                  value={String(cestaGrande.quantidade ?? 0)}
                  onChange={({ detail }) =>
                    salvarQuantidadeCesta("cesta-grande", parseInt(detail.value, 10) || 0)
                  }
                />
              </div>
            </SpaceBetween>
          )}

          {cestaPequena && (
            <SpaceBetween size="s">
              <Box fontWeight="bold">
                <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                  <Icone nome="cesta" /> Cesta Pequena
                </SpaceBetween>
              </Box>
              <div style={{ display: "flex", alignItems: "center", gap: spaceScaledXs }}>
                <Box>R$</Box>
                <Input
                  type="number"
                  step={0.5}
                  value={String(cestaPequena.preco)}
                  onChange={({ detail }) => {
                    const v = parseFloat(detail.value);
                    if (!isNaN(v)) salvarPreco("cesta-pequena", v);
                  }}
                />
              </div>
              <div>
                <Box fontSize="body-s" color="text-body-secondary">
                  Preço com desconto (opcional)
                </Box>
                <div style={{ display: "flex", alignItems: "center", gap: spaceScaledXs }}>
                  <Box>R$</Box>
                  <Input
                    type="number"
                    step={0.5}
                    placeholder="Sem desconto"
                    value={cestaPequena.precoReal !== undefined ? String(cestaPequena.precoReal) : ""}
                    onChange={({ detail }) => salvarPrecoReal("cesta-pequena", detail.value)}
                  />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: spaceScaledXs }}>
                <Input
                  type="number"
                  value={String(cestaPequena.quantidade ?? 0)}
                  onChange={({ detail }) =>
                    salvarQuantidadeCesta("cesta-pequena", parseInt(detail.value, 10) || 0)
                  }
                />
              </div>
            </SpaceBetween>
          )}
        </ColumnLayout>
      </Container>

      <Input
        type="search"
        value={busca}
        onChange={({ detail }) => setBusca(detail.value)}
        placeholder="Buscar produto para adicionar à cesta..."
      />

      <Table<Produto>
        trackBy="id"
        items={produtosParaCesta}
        empty={
          <Box textAlign="center" color="text-body-secondary" padding="l">
            Nenhum produto encontrado para &quot;{busca}&quot;.
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
            id: "grande",
            header: "Grande",
            cell: (p) => (
              <Checkbox
                checked={p.naCestaGrande}
                disabled={salvando[`${p.id}-naCestaGrande`]}
                onChange={() => handleToggle(p.id, "naCestaGrande", !p.naCestaGrande)}
                ariaLabel={`Incluir ${p.nome} na Cesta Grande`}
              />
            ),
          },
          {
            id: "pequena",
            header: "Pequena",
            cell: (p) => (
              <Checkbox
                checked={p.naCestaPequena}
                disabled={salvando[`${p.id}-naCestaPequena`]}
                onChange={() => handleToggle(p.id, "naCestaPequena", !p.naCestaPequena)}
                ariaLabel={`Incluir ${p.nome} na Cesta Pequena`}
              />
            ),
          },
        ]}
      />
    </SpaceBetween>
  );
}
