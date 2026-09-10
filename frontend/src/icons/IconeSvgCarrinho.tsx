// ============================================================
// IconeSvgCarrinho — mesmo ícone de carrinho de icons.tsx, mas como
// elemento <svg> de verdade (não texto injetado via dangerouslySetInnerHTML)
// pra caber na prop `iconSvg` do Button do Cloudscape, que precisa
// manipular o próprio nó <svg> (aplica currentColor, tamanho e estado
// de hover sozinho — ver documentação de Button.iconSvg). Sem `width`/
// `height`/`stroke` aqui de propósito: o Button que define isso.
//
// Path vindo de shopping-cart.svg (lucide-static, ISC) — se quiser
// trocar o desenho, edita esse arquivo OU cola outro path aqui.
// ============================================================
export default function IconeSvgCarrinho() {
  return (
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18" />
      <path d="M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25" />
      <circle cx="18" cy="20" r="2" />
      <circle cx="8" cy="20" r="2" />
    </svg>
  );
}
