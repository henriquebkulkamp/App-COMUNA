import Container from "@cloudscape-design/components/container";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { spaceScaledS, spaceScaledM, spaceScaledXl, fontSizeHeadingXl } from "@cloudscape-design/design-tokens";
import { buscarProdutosDaPlanilha } from "@/lib/db";
import PortaoAdmin from "@/components/cliente/PortaoAdmin";
import CestaDaSemana from "@/components/cliente/CestaDaSemana";
import ProdutosDestaque from "@/components/cliente/ProdutosDestaque";
import ProdutosAvulsos from "@/components/cliente/ProdutosAvulsos";

// Sem isso, o Next tentaria congelar esta página em HTML fixo no
// `next build` (não usa cookies/headers/searchParams, então não há
// sinal automático de que ela é dinâmica) — e o estoque da Elizete
// nunca mais apareceria atualizado depois do deploy. Com
// force-dynamic a função roda a cada request, mas o custo real fica
// baixo porque buscarProdutosDaPlanilha() (lib/db.ts) já cacheia o
// resultado por 30s em memória e é invalidada na hora em cada rota
// admin que muda estoque/preço/cesta (invalidarCacheProdutos()) —
// ou seja: mesmo resultado entre requisições, exceto quando algo
// realmente mudou. Mesma ideia de app/api/produtos/route.ts.
export const dynamic = "force-dynamic";

// ============================================================
// PaginaPrincipal — Server Component: busca os produtos direto no
// Postgres (sem o antigo fetch("/api/produtos") no navegador) e passa
// pronto pra vitrine, que assim não precisa mais de estado de
// "carregando" nem do LojaProvider pra exibir nada — só pros cliques
// de "adicionar ao carrinho" (useCarrinho, que continua client) e pra
// edição no painel admin (LojaProvider, agora escopado só ali, ver
// PainelAdmin.tsx).
//
// Quem decide se mostra essa vitrine ou o painel admin é o
// PortaoAdmin — é o único pedaço que precisa saber (via localStorage,
// que só existe no navegador) se quem está vendo é a Elizete.
// ============================================================
export default async function PaginaPrincipal() {
  const produtos = await buscarProdutosDaPlanilha();

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
              <span style={{ fontSize: fontSizeHeadingXl }}>🌿</span>
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
        <p>🌱 COMUNA — Cooperativa Orgânica Agroflorestal</p>
        <p>Semeando amor e vida!</p>
      </Box>
    </PortaoAdmin>
  );
}
