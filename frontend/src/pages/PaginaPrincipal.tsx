import { useEffect, useState } from "react";
import Container from "@cloudscape-design/components/container";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { spaceScaledS, spaceScaledM, spaceScaledXl } from "@cloudscape-design/design-tokens";
import { apiFetch } from "@/lib/api";
import PortaoAdmin from "@/components/cliente/PortaoAdmin";
import CestaDaSemana from "@/components/cliente/CestaDaSemana";
import ProdutosDestaque from "@/components/cliente/ProdutosDestaque";
import ProdutosAvulsos from "@/components/cliente/ProdutosAvulsos";
import Icone from "@/icons/Icone";
import type { Produto } from "@/lib/types";

// ============================================================
// PaginaPrincipal — na versão Next.js, esta página era um Server
// Component que buscava os produtos direto no Postgres (sem fetch no
// navegador) — ver o histórico deste arquivo antes da migração pro
// backend/ FastAPI. Como esta SPA não tem servidor próprio, a busca
// agora acontece aqui via fetch no useEffect, contra GET /api/produtos
// do backend/. Isso reintroduz o "client fetch waterfall" que a versão
// Next.js evitava de propósito — é uma perda esperada desta migração,
// não um bug: sem servidor de app, não existe onde buscar antes do
// primeiro paint.
//
// Quem decide se mostra essa vitrine ou o painel admin é o
// PortaoAdmin — é o único pedaço que precisa saber (via localStorage,
// que só existe no navegador) se quem está vendo é a Elizete.
// ============================================================
export default function PaginaPrincipal() {
  const [produtos, setProdutos] = useState<Produto[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function buscarProdutos() {
      try {
        const resposta = await apiFetch("/api/produtos");
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const dados: Produto[] = await resposta.json();
        if (!cancelado) setProdutos(dados);
      } catch (erro) {
        console.error("[PaginaPrincipal] Erro ao buscar produtos:", erro);
        if (!cancelado) setErro(true);
      }
    }

    buscarProdutos();
    return () => {
      cancelado = true;
    };
  }, []);

  if (produtos === null) {
    return (
      <Box textAlign="center" padding="xxl" color="text-body-secondary">
        {erro ? "Não foi possível carregar os produtos. Tente novamente." : "Carregando..."}
      </Box>
    );
  }

  const produtosEmEstoque = produtos.filter((p) => p.emEstoque && p.categoria !== "Cestas");
  const itensCestaGrande = produtos.filter((p) => p.naCestaGrande);
  const itensCestaPequena = produtos.filter((p) => p.naCestaPequena);
  const cestaGrande = produtos.find((p) => p.id === "cesta-grande");
  const cestaPequena = produtos.find((p) => p.id === "cesta-pequena");

  return (
    <PortaoAdmin>
      {/* Sem coluna reservada pro carrinho — o conteúdo ocupa a maior
          parte da largura da tela (~80%, com um teto pra não esticar
          demais em monitores ultra-wide). */}
      <main style={{ width: "80%", maxWidth: "1800px", margin: "0 auto", padding: `${spaceScaledXl} ${spaceScaledM}` }}>
        <SpaceBetween size="l">
          {/* Espaço privilegiado: logo abaixo do header, antes de
              qualquer outra seção — é a primeira coisa que o cliente vê. */}
          <CestaDaSemana
            itensCestaGrande={itensCestaGrande}
            itensCestaPequena={itensCestaPequena}
            cestaGrande={cestaGrande}
            cestaPequena={cestaPequena}
          />

          <Container>
            <div style={{ display: "flex", alignItems: "flex-start", gap: spaceScaledS }}>
              <Icone nome="folha" tamanho={28} />
              <div>
                <Box variant="h1">Bem-vindo à COMUNA</Box>
                <Box color="text-body-secondary">
                  Somos uma cooperativa orgânica agroflorestal que conecta agricultores
                  familiares e consumidores conscientes. Cada produto carrega o cuidado de
                  quem planta com amor e respeito à terra. Mais do que uma feira, somos um
                  projeto de vida — semeando alimento, saúde e comunidade.
                </Box>
              </div>
            </div>
          </Container>

          <ProdutosDestaque produtos={produtosEmEstoque} />
          <ProdutosAvulsos produtosEmEstoque={produtosEmEstoque} />
        </SpaceBetween>
      </main>

      <Box textAlign="center" color="text-body-secondary" padding={{ vertical: "l" }}>
        <Box padding={{ bottom: "xs" }}>
          <Icone nome="muda" tamanho={24} />
        </Box>
        <p>COMUNA — Cooperativa Orgânica Agroflorestal</p>
        <p>Semeando amor e vida!</p>
      </Box>
    </PortaoAdmin>
  );
}
