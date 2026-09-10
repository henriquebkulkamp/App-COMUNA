import { useMemo, useState } from "react";
import { Index } from "flexsearch";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
import {
  colorBorderDropdownContainer,
  colorBackgroundDropdownItemDefault,
  borderRadiusDropdown,
  shadowContainerActive,
  spaceScaledXxs,
  spaceScaledXs,
  spaceScaledM,
  fontSizeBodyM,
} from "@cloudscape-design/design-tokens";
import type { Produto } from "@/lib/types";

// ============================================================
// SugestoesBusca — autocomplete simples com FlexSearch
//
// Mostra um dropdown de sugestões abaixo do campo de busca de
// Produtos Avulsos, com match fuzzy (tolera erro de digitação e
// ordena por relevância) em vez de um includes() cru.
//
// Analogia Python: como manter um índice invertido em memória
// (tipo whoosh/rapidfuzz) reconstruído toda vez que a lista de
// produtos muda, em vez de varrer a lista inteira a cada busca.
// ============================================================

const LIMITE_SUGESTOES = 6;

// Remove acentos e normaliza caixa — "açúcar" e "acucar" precisam
// bater igual, senão o fuzzy match do FlexSearch não ajuda muita
// coisa em português.
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

interface SugestoesBuscaProps {
  produtos: Produto[]; // já filtrados: só produtos em estoque
  termo: string;
  onSelecionar: (produto: Produto) => void;
}

export default function SugestoesBusca({
  produtos,
  termo,
  onSelecionar,
}: SugestoesBuscaProps) {
  // Guarda o termo que estava no campo quando o dropdown foi fechado
  // manualmente (clique numa sugestão ou Escape). Como selecionar uma
  // sugestão também reescreve o campo de busca com o nome escolhido,
  // sem isso o dropdown reabriria sozinho — o texto novo ainda bate
  // com a própria sugestão que acabou de ser clicada.
  const [termoFechado, setTermoFechado] = useState<string | null>(null);

  // Reconstrói o índice sempre que a lista de produtos em estoque muda.
  // Guardamos os produtos num array paralelo porque o FlexSearch só
  // devolve ids/posições, não os objetos inteiros.
  const { indice, produtosIndexados } = useMemo(() => {
    // "tolerant" é o que dá tolerância de verdade a erro de digitação —
    // "forward"/"full" só indexam prefixos/substrings exatos, sem folga
    // pra letra faltando ou trocada.
    const indice = new Index({ tokenize: "tolerant" });
    produtos.forEach((produto, posicao) => {
      indice.add(posicao, normalizar(produto.nome));
    });
    return { indice, produtosIndexados: produtos };
  }, [produtos]);

  const sugestoes = useMemo(() => {
    const termoLimpo = termo.trim();
    if (!termoLimpo) return [];
    const posicoes = indice.search(normalizar(termoLimpo), {
      limit: LIMITE_SUGESTOES,
    });
    return posicoes
      .map((posicao) => produtosIndexados[posicao as number])
      .filter((p): p is Produto => Boolean(p));
  }, [indice, produtosIndexados, termo]);

  const aberto = termo !== termoFechado && sugestoes.length > 0;

  if (!aberto) return null;

  return (
    <div
      data-testid="sugestoes-busca"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: "100%",
        marginTop: spaceScaledXxs,
        zIndex: 10,
        backgroundColor: colorBackgroundDropdownItemDefault,
        borderRadius: borderRadiusDropdown,
        border: `1px solid ${colorBorderDropdownContainer}`,
        boxShadow: shadowContainerActive,
        overflow: "hidden",
      }}
    >
      {sugestoes.map((produto) => (
        <button
          key={produto.id}
          type="button"
          data-testid="sugestao-produto"
          className="comuna-sugestao-item"
          // Sem isso, o blur do input dispara antes do click e fecha o
          // dropdown antes da seleção ser registrada.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            console.log(produto);
            onSelecionar(produto);
            setTermoFechado(produto.nome);
          }}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: spaceScaledXs,
            padding: `${spaceScaledXs} ${spaceScaledM}`,
            textAlign: "left",
            fontSize: fontSizeBodyM,
            border: "none",
            background: "none",
            cursor: "pointer",
          }}
        >
          <Box fontWeight="bold">{produto.nome}</Box>
          <Badge color="green">{produto.categoria}</Badge>
        </button>
      ))}
    </div>
  );
}
