// ============================================================
// IMAGEM SIMULADA — retângulo sólido de uma cor por categoria,
// sem depender de nenhum serviço externo — é um SVG embutido como
// data URI, então funciona offline e nunca quebra por fora do ar.
//
// De propósito o mais simples possível: só `<rect>` preenchido,
// sem texto/letra, sem fonte, sem cálculo de baseline. Como é uma
// cor chapada, nem precisa das dimensões reais (400×300) — um SVG
// de 1×1 escala sem nenhuma perda visual (é vetor, não bitmap) e o
// `<img>` já estica via `object-fit: cover` (CartaoProduto.tsx).
// Isso encolhe o data URI bastante e corta o custo de renderizar
// texto (fonte + layout) do caminho crítico de pintura da imagem.
//
// A cor de fundo vem das paletas de gráfico do próprio Cloudscape
// (@cloudscape-design/design-tokens) — uma por categoria — em vez
// de inventar hex novo. Como data URI não tem cascata de CSS, não
// dá pra usar var(--token) direto; extraímos só o valor de reserva
// (fallback) que o próprio pacote já embute em cada token.
// ============================================================
import {
  colorChartsPaletteCategorical1,
  colorChartsPaletteCategorical2,
  colorChartsPaletteCategorical3,
  colorChartsPaletteCategorical4,
  colorChartsPaletteCategorical5,
  colorChartsPaletteCategorical6,
  colorChartsPaletteCategorical7,
  colorChartsPaletteCategorical8,
  colorChartsPaletteCategorical9,
  colorChartsPaletteCategorical10,
} from "@cloudscape-design/design-tokens";
import type { Categoria } from "./types";

function hexDoToken(token: string): string {
  return token.match(/#[0-9a-fA-F]{6}/)?.[0] ?? "#8c8c94";
}

// Uma cor de paleta categórica por categoria de produto — mesma
// ordem usada nos filtros em toda a UI.
const COR_POR_CATEGORIA: Record<Categoria, string> = {
  Cestas: hexDoToken(colorChartsPaletteCategorical1),
  Frutas: hexDoToken(colorChartsPaletteCategorical2),
  "Verduras e Legumes": hexDoToken(colorChartsPaletteCategorical3),
  "Ervas e Temperos": hexDoToken(colorChartsPaletteCategorical4),
  Proteínas: hexDoToken(colorChartsPaletteCategorical5),
  "Grãos e Cereais": hexDoToken(colorChartsPaletteCategorical6),
  "Derivados e Processados": hexDoToken(colorChartsPaletteCategorical7),
  Bebidas: hexDoToken(colorChartsPaletteCategorical8),
  "Pães e Panificação": hexDoToken(colorChartsPaletteCategorical9),
  "Mel e Apícolas": hexDoToken(colorChartsPaletteCategorical10),
};

export function gerarImagemSimulada(categoria: Categoria): string {
  const cor = COR_POR_CATEGORIA[categoria] ?? "#8c8c94";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="${cor}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
