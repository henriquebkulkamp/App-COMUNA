"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Spinner from "@cloudscape-design/components/spinner";
import { spaceScaledXs, spaceScaledXxs, spaceScaledM } from "@cloudscape-design/design-tokens";
import { useLoja } from "@/lib/loja-context";
import CartaoProduto from "./CartaoProduto";
import type { Categoria, Produto } from "@/lib/types";

// SugestoesBusca carrega o FlexSearch inteiro (~378KB minificado) só
// pra alimentar o autocomplete — a maioria dos visitantes nunca digita
// nada na busca. `ssr:false` porque é 100% interativo (não tem nada
// pra renderizar no servidor: sem termo digitado, não mostra nada).
const SugestoesBusca = dynamic(() => import("./SugestoesBusca"), { ssr: false });

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
// A grade usa o mesmo CartaoProduto (tamanho fixo) do Carrossel de
// Destaques — flex-wrap manual em vez do Cards do Cloudscape, porque
// o Cards estica cada item pra preencher a coluna e o objetivo aqui
// é justamente o oposto: todo card do mesmo tamanho, lado a lado.
// ============================================================
export default function ProdutosAvulsos() {
  const { produtosEmEstoque, carregandoProdutos } = useLoja();
  const [categoriaAtiva, setCategoriaAtiva] = useState<Categoria | "Todos">("Todos");
  const [busca, setBusca] = useState("");

  const categoriasComEstoque = useMemo(() => {
    const cats = new Set(produtosEmEstoque.map((p) => p.categoria));
    return CATEGORIAS.filter((c) => cats.has(c));
  }, [produtosEmEstoque]);

  const produtosFiltrados = useMemo(() => {
    return produtosEmEstoque.filter((p) => {
      const matchCategoria = categoriaAtiva === "Todos" || p.categoria === categoriaAtiva;
      const matchBusca = busca === "" || p.nome.toLowerCase().includes(busca.toLowerCase());
      return matchCategoria && matchBusca;
    });
  }, [produtosEmEstoque, categoriaAtiva, busca]);

  // Autocomplete simples: ao selecionar uma sugestão, só completa o
  // campo de busca com o nome escolhido — o console.log de quem foi
  // selecionado acontece dentro do próprio SugestoesBusca.
  function selecionarSugestao(produto: Produto) {
    setBusca(produto.nome);
  }

  return (
    <Container
      id="produtos-avulsos"
      // Sem borda/sombra: o fundo da página já contrasta com o branco
      // do Container, então a moldura é redundante.
      style={{ root: { borderWidth: "0", boxShadow: "none" } }}
      header={
        <Header
          counter={`(${produtosEmEstoque.length})`}
          description={
            produtosEmEstoque.length === 1 ? "produto disponível" : "produtos disponíveis"
          }
        >
          🛒 Produtos Avulsos
        </Header>
      }
    >
      <SpaceBetween size="m">
        {/* Campo de busca com autocomplete */}
        <div style={{ position: "relative" }}>
          <Input
            type="search"
            value={busca}
            onChange={({ detail }) => setBusca(detail.value)}
            placeholder="Buscar produto..."
          />
          {/* Só monta o componente (e carrega o chunk do FlexSearch) quando
              o cliente de fato começa a digitar — sem termo, SugestoesBusca
              já não mostrava nada mesmo (sugestoes fica vazio), então isso
              não muda o comportamento visível, só adia o custo. */}
          {busca.trim() !== "" && (
            <SugestoesBusca
              produtos={produtosEmEstoque}
              termo={busca}
              onSelecionar={selecionarSugestao}
            />
          )}
        </div>

        {/* Filtros de categoria — scroll horizontal no mobile */}
        {categoriasComEstoque.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: spaceScaledXs,
              overflowX: "auto",
              paddingBottom: spaceScaledXxs,
            }}
          >
            <div style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
              <Button
                variant={categoriaAtiva === "Todos" ? "primary" : "normal"}
                onClick={() => setCategoriaAtiva("Todos")}
              >
                Todos
              </Button>
            </div>
            {categoriasComEstoque.map((cat) => (
              <div key={cat} style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                <Button
                  variant={categoriaAtiva === cat ? "primary" : "normal"}
                  onClick={() => setCategoriaAtiva(cat)}
                >
                  {cat}
                </Button>
              </div>
            ))}
          </div>
        )}

        {carregandoProdutos ? (
          <Box textAlign="center" padding="l">
            <Spinner size="large" />
            <Box padding={{ top: "s" }} color="text-body-secondary">
              Carregando produtos da COMUNA...
            </Box>
          </Box>
        ) : produtosFiltrados.length === 0 ? (
          <Box textAlign="center" color="text-body-secondary" padding="l">
            {produtosEmEstoque.length === 0 ? (
              <>
                <Box fontSize="display-l">📦</Box>
                Nenhum produto disponível no momento.
                <br />
                Volte na sexta-feira quando a loja abre!
              </>
            ) : (
              <>Nenhum produto encontrado para &quot;{busca}&quot;.</>
            )}
          </Box>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: spaceScaledM }}>
            {produtosFiltrados.map((produto) => (
              <CartaoProduto key={produto.id} produto={produto} />
            ))}
          </div>
        )}
      </SpaceBetween>
    </Container>
  );
}
