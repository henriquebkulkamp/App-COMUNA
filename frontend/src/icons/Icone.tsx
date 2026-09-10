// ============================================================
// Icone — ícones que o Cloudscape não tem no set embutido (carrinho,
// cesta, folha, caixa, caminhão, muda). Os .svg em frontend/src/icons/
// são arquivos locais de verdade (vindos do lucide-static, licença
// ISC — free/MIT-like, sem exigir atribuição em runtime) — abre e edita
// esses arquivos direto que o ícone muda, sem precisar mexer aqui.
//
// Nenhuma lib nova no projeto: usa só `?raw` do Vite (recurso nativo
// dele, não uma dependência) pra importar o conteúdo do .svg como
// texto e injetar como HTML de verdade — assim o `stroke="currentColor""
// de dentro do SVG herda a cor do texto ao redor, igual ao <Icon> do
// Cloudscape (ver components que usam esse componente pra comparar).
//
// COMO ADICIONAR UM ÍCONE NOVO:
// 1. Baixe o .svg (ex: de lucide.dev, também ISC/ficou de graça) pra
//    cá, em frontend/src/icons/.
// 2. Adicione uma linha no `import` e no objeto ICONES abaixo.
// ============================================================

import carrinhoSvg from "./shopping-cart.svg?raw";
import cestaSvg from "./shopping-basket.svg?raw";
import folhaSvg from "./leaf.svg?raw";
import caixaSvg from "./package.svg?raw";
import caminhaoSvg from "./truck.svg?raw";
import mudaSvg from "./sprout.svg?raw";

const ICONES = {
  carrinho: carrinhoSvg,
  cesta: cestaSvg,
  folha: folhaSvg,
  caixa: caixaSvg,
  caminhao: caminhaoSvg,
  muda: mudaSvg,
} as const;

export type NomeIconeLocal = keyof typeof ICONES;

interface IconeProps {
  nome: NomeIconeLocal;
  /** Lado do quadrado do ícone, em px. Mesmo padrão dos ícones do
   *  Cloudscape ao redor (~16-20px na maioria dos usos). */
  tamanho?: number;
}

// Os .svg do lucide vêm com width/height="24" fixos — troca por 100%
// pra herdar o `tamanho` do wrapper em vez de sempre renderizar 24x24.
function ajustarTamanho(svg: string): string {
  return svg.replace('width="24"', 'width="100%"').replace('height="24"', 'height="100%"');
}

export default function Icone({ nome, tamanho = 20 }: IconeProps) {
  return (
    <span
      role="img"
      aria-hidden="true"
      style={{
        display: "inline-flex",
        width: tamanho,
        height: tamanho,
        color: "currentColor",
        flexShrink: 0,
      }}
      dangerouslySetInnerHTML={{ __html: ajustarTamanho(ICONES[nome]) }}
    />
  );
}
