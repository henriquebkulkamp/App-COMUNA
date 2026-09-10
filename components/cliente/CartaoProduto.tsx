"use client";

import Container from "@cloudscape-design/components/container";
import {
  spaceScaledXxxl,
  spaceScaledS,
  spaceScaledXs,
  borderRadiusContainer,
  fontSizeBodyM,
} from "@cloudscape-design/design-tokens";
import Preco from "@/components/design-system/moleculas/Preco";
import type { Produto } from "@/lib/types";

// Nenhum token do Cloudscape cobre "tamanho de card de produto" (isso
// é decisão de conteúdo, não de tema) — em vez de cravar pixel à mão,
// compomos a partir do maior degrau da escala de espaçamento.
const LARGURA_CARTAO = `calc(${spaceScaledXxxl} * 7)`; // ~280px
const ALTURA_IMAGEM = `calc(${spaceScaledXxxl} * 4)`; // ~160px
// Corpo (nome em até 2 linhas + preço, sem botão) precisa de ~68px de
// verdade — derivar do tamanho da imagem em vez de somar um total solto
// evita que os dois voltem a ficar dessincronizados (foi o que cortava
// o rodapé do card no carrossel antes: o corpo pedia mais altura do que
// a reservada, e o `overflow: hidden` do carrossel fatiava o que sobrava).
const ALTURA_CORPO = `calc(${spaceScaledXxxl} * 1.8)`; // ~72px, com folga
const ALTURA_CARTAO = `calc(${ALTURA_IMAGEM} + ${ALTURA_CORPO})`; // ~260px — igual em todo card

interface CartaoProdutoProps {
  produto: Produto;
  /** Único jeito que o card muda de um lugar pro outro: sem moldura no
   *  Carrossel (que já flutua sobre o fundo da página), com moldura na
   *  grade do ProdutosAvulsos (onde os cards ficam lado a lado sobre o
   *  próprio fundo branco da seção e precisam se separar visualmente). */
  semMoldura?: boolean;
}

// ============================================================
// CartaoProduto — UM component só, mesmo conteúdo em qualquer lugar
// que ele apareça (Carrossel de Destaques, grade do ProdutosAvulsos):
// imagem, nome, preço. Nada de categoria/tags/estoque/botão — isso é
// informação de vitrine de relance, não de comparação; quem quer
// comprar ou ver mais detalhe entra no produto. Os dados (categoria,
// tags, estoque) continuam no `Produto` — só não são exibidos aqui.
//
// Regra central: TODO card tem exatamente a mesma largura e altura,
// não importa quanto conteúdo o produto tenha. Pra isso:
// 1. Imagem com altura fixa no topo.
// 2. Nome do produto reserva sempre a altura de 2 linhas (clamp),
//    mesmo que o nome caiba em 1. Sem descrição — o nome já basta.
// 3. Preço fica logo abaixo do nome, sem vão vazio no meio.
// ============================================================
export default function CartaoProduto({ produto, semMoldura = false }: CartaoProdutoProps) {
  const conteudo = (
    <div
      style={{
        width: LARGURA_CARTAO,
        height: ALTURA_CARTAO,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Imagem */}
      <div
        style={{
          width: "100%",
          height: ALTURA_IMAGEM,
          flexShrink: 0,
          borderRadius: borderRadiusContainer,
          overflow: "hidden",
        }}
      >
        {produto.imagemUrl && (
          // Imagem simulada é um data URI (SVG gerado no banco) — não se
          // beneficia da otimização/remote-loader do next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            // `id` aqui não é estilo/acessibilidade — é o que faz o
            // web-vitals (getSelector.ts) identificar ESSE produto
            // específico como LCP, em vez do genérico "div>div>img" que
            // não distingue qual card entre dezenas iguais. A lib para
            // de subir a árvore assim que acha um `id` e usa só ele
            // como seletor (ver node_modules/web-vitals/src/lib/getSelector.ts).
            // Sufixo "destaque"/"avulso" evita `id` duplicado quando o
            // mesmo produto aparece no carrossel E na grade na mesma página.
            id={`img-produto-${produto.id}-${semMoldura ? "destaque" : "avulso"}`}
            src={produto.imagemUrl}
            alt={produto.nome}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
      </div>

      {/* Corpo — nome com altura reservada + preço sempre no rodapé */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          paddingTop: spaceScaledS,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: fontSizeBodyM,
            fontWeight: "bold",
            lineHeight: 1.3,
            // Reserva sempre 2 linhas de altura, o nome caiba em 1 ou 2.
            minHeight: `calc(${fontSizeBodyM} * 2.6)`,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {produto.nome}
        </h3>

        {/* marginTop:auto ancora o preço embaixo do corpo — robusto a
            pequenas variações de fonte entre navegadores, em vez de
            depender de acertar o cálculo de altura no milímetro. */}
        <div style={{ marginTop: "auto", paddingTop: spaceScaledXs }}>
          <Preco valor={produto.preco} valorComDesconto={produto.precoReal} tamanho="medio" />
        </div>
      </div>
    </div>
  );

  if (semMoldura) return conteudo;
  return <Container>{conteudo}</Container>;
}
