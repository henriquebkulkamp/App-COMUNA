import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Badge from "@cloudscape-design/components/badge";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import SpaceBetween from "@cloudscape-design/components/space-between";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
import {
  colorBorderDividerDefault,
  spaceScaledS,
  spaceScaledM,
  spaceScaledL,
  spaceScaledXl,
  spaceScaledXs,
  borderRadiusContainer,
} from "@cloudscape-design/design-tokens";
import { apiFetch } from "@/lib/api";
import { useCarrinho } from "@/lib/carrinho-context";
import Header from "@/components/shared/Header";
import Preco from "@/components/design-system/moleculas/Preco";
import SecaoIngredientes from "@/components/cliente/SecaoIngredientes";
import TabelaNutricional from "@/components/cliente/TabelaNutricional";
import Icone from "@/icons/Icone";
import type { ProdutoDetalhe } from "@/lib/types";

// Mesmo tom de fundo usado em todas as páginas do cliente (ver
// PaginaPrincipal.tsx, que replica o mesmo valor).
const FUNDO_PAGINA = "#f0f0e8";

// ============================================================
// PaginaProduto — tela de detalhe de UM produto (/produto/:id),
// aberta ao clicar num CartaoProduto (vitrine ou carrossel de
// destaques). Busca GET /api/produtos/:id — rota própria (não a lista
// inteira de GET /api/produtos que a vitrine usa), já que só aqui
// interessa o join de ingredientes/info nutricional (ver
// SecaoIngredientes.tsx); um link direto (recarregar a página, abrir
// numa aba nova) também funciona, não depende de ter vindo do clique.
// ============================================================
export default function PaginaProduto() {
  const { id } = useParams<{ id: string }>();
  const [produto, setProduto] = useState<ProdutoDetalhe | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [erro, setErro] = useState(false);
  const { adicionar } = useCarrinho();

  useEffect(() => {
    let cancelado = false;
    setProduto(null);
    setNaoEncontrado(false);
    setErro(false);

    async function buscarProduto() {
      try {
        const resposta = await apiFetch(`/api/produtos/${id}`);
        if (resposta.status === 404) {
          if (!cancelado) setNaoEncontrado(true);
          return;
        }
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const dados: ProdutoDetalhe = await resposta.json();
        if (!cancelado) setProduto(dados);
      } catch (erro) {
        console.error("[PaginaProduto] Erro ao buscar produto:", erro);
        if (!cancelado) setErro(true);
      }
    }

    buscarProduto();
    return () => {
      cancelado = true;
    };
  }, [id]);

  // Carregando ou erro de rede — mesmo padrão de PaginaPrincipal.
  if (produto === null && !erro && !naoEncontrado) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: FUNDO_PAGINA }}>
        <Header />
        <Box textAlign="center" padding="xxl" color="text-body-secondary">
          Carregando...
        </Box>
      </div>
    );
  }

  // Erro de rede OU id que não bate com nenhum produto (404 — link
  // velho, produto removido do estoque pela Elizete, id digitado
  // errado) — tratados juntos: da perspectiva do cliente é a mesma
  // coisa, "não achei esse produto", com o mesmo caminho de volta pra
  // vitrine.
  if (erro || naoEncontrado || !produto) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: FUNDO_PAGINA }}>
        <Header />
        <main style={{ width: "80%", maxWidth: "1800px", margin: "0 auto", padding: `${spaceScaledXl} ${spaceScaledM}` }}>
          <SpaceBetween size="l" alignItems="center">
            <Box textAlign="center" color="text-body-secondary" padding="xxl">
              <Box padding={{ bottom: "xs" }}>
                <Icone nome="caixa" tamanho={40} />
              </Box>
              {erro
                ? "Não foi possível carregar este produto. Tente novamente."
                : "Produto não encontrado."}
            </Box>
            <Link
              to="/"
              style={{ display: "inline-flex", alignItems: "center", gap: spaceScaledXs, textDecoration: "none" }}
            >
              <Icone nome="arrow-left" tamanho={16} /> Voltar para a vitrine
            </Link>
          </SpaceBetween>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: FUNDO_PAGINA }}>
      <Header />

      <main style={{ width: "80%", maxWidth: "1800px", margin: "0 auto", padding: `${spaceScaledXl} ${spaceScaledM}` }}>
        <SpaceBetween size="l">
          <Link
            to="/"
            style={{ display: "inline-flex", alignItems: "center", gap: spaceScaledXs, textDecoration: "none" }}
          >
            <Icone nome="arrow-left" tamanho={16} /> Voltar para a vitrine
          </Link>

          {/* Sem Container/caixa aqui de propósito — mesmo fundo da
              página (FUNDO_PAGINA), 100% da largura do `main`. Uma
              linha (borderBottom), não uma caixa, separa isso da seção
              de Ingredientes logo abaixo; ao abrir a Informação
              Nutricional o bloco só cresce no fluxo normal (empurra a
              linha pra baixo), nada "estica" — ver alignItems abaixo. */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              gap: spaceScaledL,
              paddingBottom: spaceScaledL,
              borderBottom: `1px solid ${colorBorderDividerDefault}`,
            }}
          >
            <div
              style={{
                flex: "1 1 320px",
                maxWidth: "480px",
                borderRadius: borderRadiusContainer,
                overflow: "hidden",
              }}
            >
              {produto.imagemUrl && (
                <img
                  src={produto.imagemUrl}
                  alt={produto.nome}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              )}
            </div>

            <div style={{ flex: "2 1 320px", minWidth: 0 }}>
              <SpaceBetween size="s">
                <Badge color="green">{produto.categoria}</Badge>

                <Box variant="h1">{produto.nome}</Box>

                {produto.tags && produto.tags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: spaceScaledXs }}>
                    {produto.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                )}

                <div>
                  <Preco valor={produto.preco} valorComDesconto={produto.precoReal} tamanho="grande" />
                  <Box color="text-body-secondary">{produto.unidade}</Box>
                </div>

                {produto.descricao && <Box>{produto.descricao}</Box>}

                {!produto.emEstoque ? (
                  <StatusIndicator type="stopped">Indisponível no momento</StatusIndicator>
                ) : (
                  typeof produto.quantidade === "number" &&
                  produto.quantidade > 0 && (
                    <StatusIndicator type="success">
                      {produto.quantidade} {produto.quantidade === 1 ? "unidade disponível" : "unidades disponíveis"}
                    </StatusIndicator>
                  )
                )}

                <div style={{ paddingTop: spaceScaledS }}>
                  <Button
                    onClick={() => adicionar(produto)}
                    variant="primary"
                    disabled={!produto.emEstoque}
                    iconSvg={<Icone nome="carrinho" tamanho={16} />}
                  >
                    Adicionar ao Carrinho
                  </Button>
                </div>
              </SpaceBetween>
            </div>

            {/* Terceira coluna, do lado da imagem/informações — não um
                card separado embaixo. Começa fechada (igual a
                SecaoIngredientes): só o rótulo "Informação Nutricional"
                com a seta, clique abre/fecha a tabela. */}
            {produto.infoNutricional && (
              <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                <ExpandableSection headerText="Informação Nutricional" defaultExpanded={false}>
                  <TabelaNutricional info={produto.infoNutricional} />
                </ExpandableSection>
              </div>
            )}
          </div>

          <SecaoIngredientes ingredientes={produto.ingredientes} />
        </SpaceBetween>
      </main>
    </div>
  );
}
