import ExpandableSection from "@cloudscape-design/components/expandable-section";
import Box from "@cloudscape-design/components/box";
import { colorBorderDividerDefault, spaceScaledXs } from "@cloudscape-design/design-tokens";

interface SecaoIngredientesProps {
  /** Já vem ordenada (ver PaginaProduto.tsx) — produto in natura (ex:
   *  abacate) chega aqui com 1 item só, igual ao próprio nome do produto. */
  ingredientes: string[];
}

const BORDA_FINA = `1px solid ${colorBorderDividerDefault}`;

// ============================================================
// SecaoIngredientes — aba extensível na tela de produto, só com a
// lista de ingredientes (formatada como tabela: # + nome, na ordem do
// rótulo). `variant="default"` (não "container") de propósito — a
// tela de produto separa seções com LINHA (borderBottom, ver
// PaginaProduto.tsx), não com caixa/card; "container" desenharia um
// segundo card branco flutuando sobre o mesmo fundo da página, exatamente
// o efeito que a tela não quer mais. Já vem com a transição de
// abrir/fechar suave de fábrica — sem animação escrita à mão aqui.
//
// A Informação Nutricional (TabelaNutricional.tsx) NÃO mora aqui —
// é a terceira coluna ao lado da imagem/informações (ver
// PaginaProduto.tsx); só a lista de ingredientes é que ganha a
// seção própria embaixo.
//
// Sem ingrediente cadastrado = sem seção nenhuma (nada pra mostrar
// ainda) — não deixa espaço vazio na tela.
// ============================================================
export default function SecaoIngredientes({ ingredientes }: SecaoIngredientesProps) {
  if (ingredientes.length === 0) return null;

  return (
    <ExpandableSection variant="default" headerText="Ingredientes" defaultExpanded={false}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ width: "10%", textAlign: "left", paddingBottom: spaceScaledXs, borderBottom: BORDA_FINA }}>
              <Box color="text-body-secondary" fontSize="body-s">
                #
              </Box>
            </th>
            <th style={{ textAlign: "left", paddingBottom: spaceScaledXs, borderBottom: BORDA_FINA }}>
              <Box color="text-body-secondary" fontSize="body-s">
                Ingrediente
              </Box>
            </th>
          </tr>
        </thead>
        <tbody>
          {ingredientes.map((nome, indice) => (
            <tr key={`${indice}-${nome}`}>
              <td
                style={{
                  paddingTop: spaceScaledXs,
                  paddingBottom: spaceScaledXs,
                  borderBottom: indice < ingredientes.length - 1 ? BORDA_FINA : "none",
                }}
              >
                <Box color="text-body-secondary">{indice + 1}</Box>
              </td>
              <td
                style={{
                  paddingTop: spaceScaledXs,
                  paddingBottom: spaceScaledXs,
                  borderBottom: indice < ingredientes.length - 1 ? BORDA_FINA : "none",
                }}
              >
                {nome}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ExpandableSection>
  );
}
