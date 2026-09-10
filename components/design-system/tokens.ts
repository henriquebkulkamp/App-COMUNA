// ============================================================
// TOKENS — camada de tokens do design system do app.
//
// Não recriamos cor/espaçamento/tipografia do zero: o Cloudscape já
// fornece esses tokens prontos (ver @cloudscape-design/design-tokens,
// usado em quase todo componente do repo). Aqui só nomeamos as
// combinações *semânticas* que os átomos/moléculas de preço usam, pra
// não espalhar "por que body-s aqui e heading-xl ali" pelos
// componentes que consomem o design system.
// ============================================================

import { fontSizeBodyS, colorTextBodySecondary, spaceScaledXxs } from "@cloudscape-design/design-tokens";

export type TamanhoPreco = "pequeno" | "medio" | "grande";

// fontSize no formato bruto (CSS var), usado no <span> riscado — que
// não é um componente Cloudscape, então não aceita a prop `fontSize`.
// O riscado é sempre "pequeno", não importa o tamanho do preço em
// destaque ao lado dele.
export const PRECO_FONTE_RISCADO = fontSizeBodyS;

// fontSize no formato que a prop `fontSize` do Box (Cloudscape) espera.
export const PRECO_FONTE_DESTAQUE: Record<TamanhoPreco, "body-s" | "body-m" | "heading-xl"> = {
  pequeno: "body-s",
  medio: "body-m",
  grande: "heading-xl",
};

export const COR_PRECO_RISCADO = colorTextBodySecondary;

// Cor do preço em destaque — prop `color` do Box (Cloudscape).
export const COR_PRECO_DESTAQUE = "text-status-success" as const;

export const ESPACO_ENTRE_PRECOS = spaceScaledXxs;
