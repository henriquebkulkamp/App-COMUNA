import {
  colorBorderDividerDefault,
  colorTextBodyDefault,
  colorTextHeadingDefault,
  fontSizeBodyS,
  fontSizeHeadingXl,
  spaceScaledXs,
  spaceScaledS,
  spaceScaledM,
  spaceScaledL,
} from "@cloudscape-design/design-tokens";
import { percentualValorDiario, type NutrienteComReferencia } from "@/lib/nutricional";
import type { InfoNutricional } from "@/lib/types";

interface LinhaNutriente {
  rotulo: string;
  valor: number | undefined;
  unidade: string;
  negrito: boolean;
  indentado: boolean;
  percentual: number | undefined;
}

function linha(
  rotulo: string,
  valor: number | undefined,
  unidade: string,
  opcoes: { negrito?: boolean; indentado?: boolean; referencia?: NutrienteComReferencia } = {}
): LinhaNutriente {
  return {
    rotulo,
    valor,
    unidade,
    negrito: opcoes.negrito ?? false,
    indentado: opcoes.indentado ?? false,
    // Sem `referencia` = nutriente sem %VD estabelecido (gordura trans,
    // açúcares totais, proteínas) — mesmo em branco na coluna de %
    // que um valor não declarado (ver percentualValorDiario).
    percentual: opcoes.referencia ? percentualValorDiario(valor, opcoes.referencia) : undefined,
  };
}

// ============================================================
// TabelaNutricional — rótulo no padrão clássico "Nutrition Facts"
// (calorias em destaque, coluna de %VD à esquerda, sub-nutrientes
// indentados sob Gorduras/Carboidratos, régua grossa antes de
// vitaminas/minerais). Só renderiza a linha de um nutriente quando o
// valor existe (backend já omite os que são NULL — ver
// InfoNutricionalSchema/response_model_exclude_none) — um rótulo real
// também só lista o que foi de fato medido.
// ============================================================
export default function TabelaNutricional({ info }: { info: InfoNutricional }) {
  const linhasPrincipais: LinhaNutriente[] = [
    linha("Gorduras Totais", info.gordurasTotaisG, "g", { negrito: true, referencia: "gordurasTotaisG" }),
    linha("Gorduras Saturadas", info.gordurasSaturadasG, "g", { indentado: true, referencia: "gordurasSaturadasG" }),
    linha("Gordura Trans", info.gordurasTransG, "g", { indentado: true }),
    linha("Colesterol", info.colesterolMg, "mg", { negrito: true, referencia: "colesterolMg" }),
    linha("Sódio", info.sodioMg, "mg", { negrito: true, referencia: "sodioMg" }),
    linha("Carboidratos Totais", info.carboidratosTotaisG, "g", { negrito: true, referencia: "carboidratosTotaisG" }),
    linha("Fibra Alimentar", info.fibraAlimentarG, "g", { indentado: true, referencia: "fibraAlimentarG" }),
    linha("Açúcares", info.acucaresG, "g", { indentado: true }),
    linha("Proteínas", info.proteinasG, "g", { negrito: true }),
  ].filter((l) => l.valor !== undefined);

  const linhasVitaminas: LinhaNutriente[] = [
    linha("Vitamina A", info.vitaminaAMg, "mg", { referencia: "vitaminaAMg" }),
    linha("Vitamina C", info.vitaminaCMg, "mg", { referencia: "vitaminaCMg" }),
    linha("Cálcio", info.calcioMg, "mg", { referencia: "calcioMg" }),
    linha("Ferro", info.ferroMg, "mg", { referencia: "ferroMg" }),
    linha("Potássio", info.potassioMg, "mg", { referencia: "potassioMg" }),
  ].filter((l) => l.valor !== undefined);

  const BORDA_FINA = `1px solid ${colorBorderDividerDefault}`;
  const BORDA_GROSSA = `6px solid ${colorTextHeadingDefault}`;

  return (
    <div style={{ maxWidth: "420px", color: colorTextBodyDefault }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: fontSizeBodyS }}>
        <tbody>
          {/* Calorias — headline do rótulo, número grande. */}
          <tr>
            <td colSpan={2} style={{ paddingBottom: spaceScaledXs, borderBottom: BORDA_GROSSA }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: fontSizeHeadingXl, fontWeight: "bold" }}>Calorias</span>
                <span style={{ fontSize: fontSizeHeadingXl, fontWeight: "bold" }}>
                  {info.caloriasKcal ?? "—"}
                </span>
              </div>
            </td>
          </tr>

          {/* Cabeçalho da coluna de % — só existe pra rótulos que declaram
              algum nutriente com referência de %VD (senão a coluna fica
              sempre vazia e o asterisco não faz sentido). */}
          <tr>
            <td
              colSpan={2}
              style={{
                paddingTop: spaceScaledXs,
                paddingBottom: spaceScaledXs,
                borderBottom: BORDA_FINA,
                fontSize: fontSizeBodyS,
              }}
            >
              % Valor Diário *
            </td>
          </tr>

          {linhasPrincipais.map((l) => (
            <tr key={l.rotulo}>
              <td
                style={{
                  width: "20%",
                  textAlign: "right",
                  paddingTop: spaceScaledXs,
                  paddingBottom: spaceScaledXs,
                  paddingRight: spaceScaledS,
                  borderBottom: BORDA_FINA,
                  whiteSpace: "nowrap",
                }}
              >
                {l.percentual !== undefined ? `${l.percentual}%` : ""}
              </td>
              <td
                style={{
                  paddingTop: spaceScaledXs,
                  paddingBottom: spaceScaledXs,
                  paddingLeft: l.indentado ? spaceScaledL : 0,
                  borderBottom: BORDA_FINA,
                }}
              >
                <span style={{ fontWeight: l.negrito ? "bold" : "normal" }}>{l.rotulo}</span> {l.valor}
                {l.unidade}
              </td>
            </tr>
          ))}

          {linhasVitaminas.length > 0 && (
            <>
              {/* Régua grossa separando macro-nutrientes de vitaminas/minerais
                  — só a última linha principal precisa da borda grossa, não
                  cada uma (por isso troca a borda fina da última linha acima
                  por essa, com uma linha "spacer" só pra régua). */}
              <tr>
                <td colSpan={2} style={{ borderBottom: BORDA_GROSSA }} />
              </tr>
              {linhasVitaminas.map((l, indice) => (
                <tr key={l.rotulo}>
                  <td
                    style={{
                      width: "20%",
                      textAlign: "right",
                      paddingTop: spaceScaledXs,
                      paddingBottom: spaceScaledXs,
                      paddingRight: spaceScaledS,
                      borderBottom: indice < linhasVitaminas.length - 1 ? BORDA_FINA : "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {l.percentual !== undefined ? `${l.percentual}%` : ""}
                  </td>
                  <td
                    style={{
                      paddingTop: spaceScaledXs,
                      paddingBottom: spaceScaledXs,
                      borderBottom: indice < linhasVitaminas.length - 1 ? BORDA_FINA : "none",
                    }}
                  >
                    {l.rotulo} {l.valor}
                    {l.unidade}
                  </td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>

      <div style={{ paddingTop: spaceScaledM, fontSize: fontSizeBodyS, color: colorTextBodyDefault, opacity: 0.75 }}>
        * Percentual de valores diários com base numa dieta de 2.000 kcal.
        {info.porcao && <> Valores por {info.porcao}.</>}
      </div>
    </div>
  );
}
