import Box from "@cloudscape-design/components/box";
import { formatarPreco } from "@/lib/formatadores";
import {
  PRECO_FONTE_RISCADO,
  PRECO_FONTE_DESTAQUE,
  COR_PRECO_RISCADO,
  COR_PRECO_DESTAQUE,
  type TamanhoPreco,
} from "../tokens";

interface ValorMonetarioProps {
  valor: number;
  /** Só importa quando `destaque` é true — o riscado é sempre "pequeno". */
  tamanho?: TamanhoPreco;
  /** Preço original quando há desconto: riscado, opaco, cor secundária. */
  riscado?: boolean;
  /** Preço que o cliente de fato paga: negrito, cor de sucesso. */
  destaque?: boolean;
}

// ============================================================
// ValorMonetario — átomo: UM valor formatado em R$, com um estilo.
// Não sabe nada sobre desconto ou Produto — só formata e estiliza um
// número. Quem decide "tem desconto, mostra os dois" é a molécula
// Preco, que combina dois ValorMonetario.
// ============================================================
export default function ValorMonetario({
  valor,
  tamanho = "medio",
  riscado = false,
  destaque = false,
}: ValorMonetarioProps) {
  const texto = formatarPreco(valor);

  if (riscado) {
    return (
      <span
        style={{
          textDecoration: "line-through",
          opacity: 0.6,
          color: COR_PRECO_RISCADO,
          fontSize: PRECO_FONTE_RISCADO,
        }}
      >
        {texto}
      </span>
    );
  }

  return (
    <Box
      variant="span"
      fontWeight={destaque ? "bold" : "normal"}
      color={destaque ? COR_PRECO_DESTAQUE : undefined}
      fontSize={PRECO_FONTE_DESTAQUE[tamanho]}
    >
      {texto}
    </Box>
  );
}
