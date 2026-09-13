// ============================================================
// NUTRICIONAL — cálculo de %VD (percentual de Valor Diário) pra
// TabelaNutricional.tsx. Função pura, mesmo espírito de formatadores.ts:
// o backend só guarda o valor absoluto de cada nutriente (ver
// InfoNutricional em lib/types.ts) — o %VD é sempre DERIVADO daqui,
// nunca persistido, pra não desatualizar se a referência mudar.
//
// Referência: Valores Diários da FDA (revisão 2016, dieta de 2000kcal)
// — mesma base usada pelos rótulos padrão "Nutrition Facts" (o
// `%DV` da imagem de referência que a tela de detalhe imita). Sem
// equivalente de %VD pra Gordura Trans, Açúcares (só "açúcares
// adicionados" tem VD estabelecido, não o total) e Proteínas — nenhum
// rótulo real mostra %VD pra esses três.
// ============================================================

export const VALOR_DIARIO_REFERENCIA = {
  gordurasTotaisG: 78,
  gordurasSaturadasG: 20,
  colesterolMg: 300,
  sodioMg: 2300,
  carboidratosTotaisG: 275,
  fibraAlimentarG: 28,
  vitaminaAMg: 900,
  vitaminaCMg: 90,
  calcioMg: 1300,
  ferroMg: 18,
  potassioMg: 4700,
} as const;

export type NutrienteComReferencia = keyof typeof VALOR_DIARIO_REFERENCIA;

/** `undefined` quando o valor não foi declarado (nutriente ausente no
 * rótulo) OU quando o nutriente não tem %VD estabelecido — os dois
 * casos têm o mesmo efeito na tabela: a coluna de % fica em branco. */
export function percentualValorDiario(
  valor: number | undefined,
  nutriente: NutrienteComReferencia
): number | undefined {
  if (valor === undefined) return undefined;
  return Math.round((valor / VALOR_DIARIO_REFERENCIA[nutriente]) * 100);
}
