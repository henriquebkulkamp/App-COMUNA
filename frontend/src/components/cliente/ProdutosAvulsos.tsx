import { useState, useMemo, lazy, Suspense } from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { spaceScaledXs, spaceScaledXxs, spaceScaledM } from "@cloudscape-design/design-tokens";
import CartaoProduto from "./CartaoProduto";
import Icone from "@/icons/Icone";
import type { Categoria, Produto } from "@/lib/types";

// SugestoesBusca carrega o FlexSearch inteiro (~378KB minificado) só
// pra alimentar o autocomplete — a maioria dos visitantes nunca digita
// nada na busca. Code-split via React.lazy: só monta (e busca o chunk)
// quando o cliente de fato começa a digitar (ver `busca.trim() !== ""`
// mais abaixo).
const SugestoesBusca = lazy(() => import("./SugestoesBusca"));

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

interface ProdutosAvulsosProps {
  produtosEmEstoque: Produto[];
}

// ============================================================
// ProdutosAvulsos — Mostra apenas os produtos com emEstoque=true
//
// Regra de negócio central: o cliente SÓ vê produtos disponíveis.
// A grade usa o mesmo CartaoProduto (tamanho fixo) do Carrossel de
// Destaques — flex-wrap manual em vez do Cards do Cloudscape, porque
// o Cards estica cada item pra preencher a coluna e o objetivo aqui
// é justamente o oposto: todo card do mesmo tamanho, lado a lado.
//
// `produtosEmEstoque` vem por prop (buscado uma vez no useEffect da
// página, ver src/pages/PaginaPrincipal.tsx) — sem useLoja() aqui
// dentro, então o estado de "carregando" fica só lá na página.
// Já aqui, a busca/filtro (interação de fato) continua em estado local.
// ============================================================
export default function ProdutosAvulsos({ produtosEmEstoque }: ProdutosAvulsosProps) {
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
          <SpaceBetween direction="horizontal" size="xs" alignItems="center">
            <Icone nome="carrinho" /> Produtos Avulsos
          </SpaceBetween>
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
            <Suspense fallback={null}>
              <SugestoesBusca
                produtos={produtosEmEstoque}
                termo={busca}
                onSelecionar={selecionarSugestao}
              />
            </Suspense>
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

        {produtosFiltrados.length === 0 ? (
          <Box textAlign="center" color="text-body-secondary" padding="l">
            {produtosEmEstoque.length === 0 ? (
              <>
                <Box padding={{ bottom: "xs" }}>
                  <Icone nome="caixa" tamanho={40} />
                </Box>
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
