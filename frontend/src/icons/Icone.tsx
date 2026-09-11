// ============================================================
// Icone — todos os ícones do app vêm de arquivo local aqui em
// frontend/src/icons/, não da lib @cloudscape-design/components/icon
// (nem de qualquer outra lib) em tempo de execução. Dois lotes:
//
// 1. Baixados direto da própria documentação do Cloudscape
//    (cloudscape.design/foundation/visual-foundation/iconography) —
//    mesmo desenho, mesmo nome, licença Apache 2.0 do próprio
//    Cloudscape. Usam classes (stroke-linecap-round etc.) que só
//    funcionam dentro do wrapper que o componente <Icon> deles
//    injeta — como não usamos mais o componente deles, essas classes
//    são estilizadas aqui via frontend/src/styles/globals.css
//    (seletor .comuna-icone-local), replicando as mesmas regras.
// 2. Os que o Cloudscape não tem no set (carrinho, cesta, folha,
//    caixa, caminhão, muda) — vêm do lucide-static (ISC), que já
//    embute stroke="currentColor" direto no SVG, sem precisar de CSS
//    extra.
//
// Nenhuma lib nova no projeto: usa só `?raw` do Vite (recurso nativo
// dele, não uma dependência) pra importar o conteúdo do .svg como
// texto e injetar como HTML de verdade.
//
// COMO ADICIONAR UM ÍCONE NOVO:
// 1. Baixe o .svg pra cá, em frontend/src/icons/.
// 2. Adicione uma linha no `import` e no objeto ICONES abaixo.
// ============================================================

// ─── Sem equivalente no Cloudscape (lucide-static, ISC) ─────────
import carrinhoSvg from "./shopping-cart.svg?raw";
import cestaSvg from "./shopping-basket.svg?raw";
import folhaSvg from "./leaf.svg?raw";
import caixaSvg from "./package.svg?raw";
import caminhaoSvg from "./truck.svg?raw";
import mudaSvg from "./sprout.svg?raw";

// ─── Baixados do Cloudscape (mesmo nome, Apache 2.0) ─────────────
import arrowLeftSvg from "./arrow-left.svg?raw";
import arrowRightSvg from "./arrow-right.svg?raw";
import lockPrivateSvg from "./lock-private.svg?raw";
import locationPinSvg from "./location-pin.svg?raw";
import userProfileSvg from "./user-profile.svg?raw";
import callSvg from "./call.svg?raw";
import settingsSvg from "./settings.svg?raw";
import sendSvg from "./send.svg?raw";
import angleLeftSvg from "./angle-left.svg?raw";
import angleRightSvg from "./angle-right.svg?raw";
import subtractMinusSvg from "./subtract-minus.svg?raw";
import addPlusSvg from "./add-plus.svg?raw";
import removeSvg from "./remove.svg?raw";

const ICONES = {
  // sem equivalente no Cloudscape
  carrinho: carrinhoSvg,
  cesta: cestaSvg,
  folha: folhaSvg,
  caixa: caixaSvg,
  caminhao: caminhaoSvg,
  muda: mudaSvg,
  // baixados do Cloudscape
  "arrow-left": arrowLeftSvg,
  "arrow-right": arrowRightSvg,
  "lock-private": lockPrivateSvg,
  "location-pin": locationPinSvg,
  "user-profile": userProfileSvg,
  call: callSvg,
  settings: settingsSvg,
  send: sendSvg,
  "angle-left": angleLeftSvg,
  "angle-right": angleRightSvg,
  "subtract-minus": subtractMinusSvg,
  "add-plus": addPlusSvg,
  remove: removeSvg,
} as const;

export type NomeIconeLocal = keyof typeof ICONES;

interface IconeProps {
  nome: NomeIconeLocal;
  /** Lado do quadrado do ícone, em px. Mesmo padrão dos ícones do
   *  Cloudscape ao redor (~16-20px na maioria dos usos, 48 pro "large"). */
  tamanho?: number;
}

// Os .svg do lucide vêm com width/height="24" fixos — troca por 100%
// pra herdar o `tamanho` do wrapper. Os baixados do Cloudscape não têm
// width/height nenhum (só viewBox) — nesse caso injeta 100% direto,
// senão o navegador cai no tamanho padrão de SVG (300x150).
function ajustarTamanho(svg: string): string {
  const comLucideAjustado = svg.replace('width="24"', 'width="100%"').replace('height="24"', 'height="100%"');
  if (!/\swidth=/.test(comLucideAjustado)) {
    return comLucideAjustado.replace("<svg", '<svg width="100%" height="100%"');
  }
  return comLucideAjustado;
}

export default function Icone({ nome, tamanho = 20 }: IconeProps) {
  return (
    <span
      role="img"
      aria-hidden="true"
      className="comuna-icone-local"
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
