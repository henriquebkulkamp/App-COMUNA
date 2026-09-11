import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import SpaceBetween from "@cloudscape-design/components/space-between";
import {
  spaceScaledL,
  spaceScaledM,
  spaceScaledXl,
  spaceScaledXxl,
} from "@cloudscape-design/design-tokens";
import { useCarrinho } from "@/lib/carrinho-context";
import Preco from "@/components/design-system/moleculas/Preco";
import Icone from "@/icons/Icone";
import type { Produto } from "@/lib/types";

// Mais respiro que o padrão do Container (que é pensado pra seções
// "normais") — é o espaço privilegiado da página, então o conteúdo
// tem mais ar ao redor.
const paddingGeneroso = { content: { paddingBlock: spaceScaledXxl, paddingInline: spaceScaledXl } };

// Metade da tela de altura, largura igual à de qualquer outra seção
// (quem define a largura é o <main> da página, isso aqui só trava a
// altura). Um piso em px evita que a seção fique espremida demais em
// telas muito baixas (celular deitado, por exemplo).
const ALTURA_SECAO = "50vh";
const ALTURA_MINIMA_SECAO = "420px";

interface CartaoCestaProps {
  titulo: string;
  produto: Produto;
  itens: Produto[];
}

function CartaoCesta({ titulo, produto, itens }: CartaoCestaProps) {
  const { adicionar, estaNoCarrinho } = useCarrinho();
  const noCarrinho = estaNoCarrinho(produto.id);

  return (
    <Container
      style={paddingGeneroso}
      fitHeight
      header={
        <Header
          variant="h2"
          actions={<Preco valor={produto.preco} valorComDesconto={produto.precoReal} tamanho="grande" />}
        >
          <SpaceBetween direction="horizontal" size="xs" alignItems="center">
            <Icone nome="cesta" /><span>{titulo}</span>
          </SpaceBetween>
        </Header>
      }
    >
      {/* flex + space-between: o botão fica ancorado embaixo, a lista
          de itens ocupa o espaço que sobrar — é o que faz o cartão
          preencher de verdade a altura que o fitHeight reserva. */}
      <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: spaceScaledM }}>
        <SpaceBetween size="m">
          <SpaceBetween direction="horizontal" size="s" alignItems="center">
            <Box color="text-body-secondary" fontSize="body-m">
              {itens.length} {itens.length === 1 ? "item" : "itens"} nesta semana
            </Box>
            {produto.quantidade !== undefined && produto.quantidade > 0 && (
              <StatusIndicator type={produto.quantidade <= 5 ? "warning" : "success"}>
                {produto.quantidade <= 5
                  ? `Últimas ${produto.quantidade}`
                  : `${produto.quantidade} disponíveis`}
              </StatusIndicator>
            )}
          </SpaceBetween>

          {/* Lista de itens da cesta — NÃO é selecionável */}
          <ul style={{ margin: 0, paddingLeft: spaceScaledM }}>
            {itens.map((item) => (
              <li key={item.id}>
                <Box fontSize="body-m">{item.nome}</Box>
              </li>
            ))}
          </ul>
        </SpaceBetween>

        <Button
          onClick={() => adicionar(produto)}
          disabled={noCarrinho}
          variant="primary"
          fullWidth
        >
          {noCarrinho ? "✓ Adicionada ao carrinho" : `Quero a ${titulo}`}
        </Button>
      </div>
    </Container>
  );
}

// ============================================================
// CestaDaSemana — Seção que mostra as cestas montadas pela Elizete
//
// A lógica aqui é:
// 1. Do contexto da Loja, pegamos todos os produtos com
//    naCestaGrande === true ou naCestaPequena === true
// 2. Mostramos esses itens como uma lista estática (o cliente
//    NÃO escolhe — a cesta é fechada)
// 3. O cliente pode adicionar a cesta ao carrinho como um item único
//
// É o espaço privilegiado da página (primeira seção, logo abaixo do
// header): trava em 50% da altura da tela — a largura continua a
// mesma de qualquer outra seção — e usa `fitHeight` do Container pra
// esticar o conteúdo até preencher esse espaço de verdade (com scroll
// interno se, por acaso, sobrar mais itens do que cabem).
//
// Dados vêm por prop (buscados uma vez no useEffect da página, ver
// src/pages/PaginaPrincipal.tsx) em vez de useLoja() — essa seção só
// muda quando a Elizete mexe na cesta, então não precisa de estado
// próprio pra exibir, só pro botão "Quero a Cesta" (esse sim usa
// useCarrinho()).
// ============================================================
interface CestaDaSemanaProps {
  itensCestaGrande: Produto[];
  itensCestaPequena: Produto[];
  cestaGrande?: Produto;
  cestaPequena?: Produto;
}

export default function CestaDaSemana({
  itensCestaGrande,
  itensCestaPequena,
  cestaGrande,
  cestaPequena,
}: CestaDaSemanaProps) {
  const temCestaGrande = itensCestaGrande.length > 0;
  const temCestaPequena = itensCestaPequena.length > 0;

  // Sem borda/sombra: o fundo da página já contrasta com o branco do
  // Container, moldura seria redundante (o CartaoCesta interno mantém
  // a própria — ele fica sobre fundo branco, sem esse contraste).
  const estiloSecao = {
    root: { borderWidth: "0", boxShadow: "none" },
    ...paddingGeneroso,
  } as const;

  if (!temCestaGrande && !temCestaPequena) {
    return (
      <div id="cesta-da-semana" style={{ height: ALTURA_SECAO, minHeight: ALTURA_MINIMA_SECAO }}>
        <Container
          style={estiloSecao}
          fitHeight
          header={
            <Header variant="h1">
              <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                <Icone nome="cesta" /><span>Cesta da Semana</span>
              </SpaceBetween>
            </Header>
          }
        >
          <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
            <Box textAlign="center" color="text-body-secondary">
              <Box padding={{ bottom: "xs" }}>
                <Icone nome="muda" tamanho={40} />
              </Box>
              A cesta desta semana ainda não foi montada.
              <br />
              Volte em breve!
            </Box>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div id="cesta-da-semana" style={{ height: ALTURA_SECAO, minHeight: ALTURA_MINIMA_SECAO }}>
      <Container
        style={estiloSecao}
        fitHeight
        header={
          <Header
            variant="h1"
            description="Selecionada com carinho pela COMUNA. A composição pode variar conforme a oferta dos produtores."
          >
            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
              <Icone nome="cesta" /><span>Cesta da Semana</span>
            </SpaceBetween>
          </Header>
        }
      >
        {/* Flex simples em vez do ColumnLayout: o ColumnLayout é um
            <div> de bloco por baixo dos panos, então não repassa
            altura esticada pros cartões dentro dele. Um flex row com
            align-items:stretch (o padrão) faz cada coluna — e, em
            cascata, o fitHeight do CartaoCesta lá dentro — preencher
            de verdade a altura toda disponível. */}
        {/* flex-wrap: em tela estreita os cartões empilham (cada um
            vira uma linha, largura cheia) em vez de espremer os dois
            lado a lado — mesma ideia responsiva que o ColumnLayout
            tinha, só que feita à mão. */}
        <div style={{ height: "100%", display: "flex", flexWrap: "wrap", gap: spaceScaledL }}>
          {temCestaGrande && cestaGrande && (
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <CartaoCesta titulo="Cesta Grande" produto={cestaGrande} itens={itensCestaGrande} />
            </div>
          )}
          {temCestaPequena && cestaPequena && (
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <CartaoCesta titulo="Cesta Pequena" produto={cestaPequena} itens={itensCestaPequena} />
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
