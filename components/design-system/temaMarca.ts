// ============================================================
// TEMA DE MARCA — fonte de verdade dos tokens que trocam a semente de
// cor primária do Cloudscape do azul padrão (#006ce0) por um verde
// orgânico, usando a API oficial de theming do design system
// (`@cloudscape-design/components/theming`), não CSS solto por cima
// dos componentes.
//
// Este arquivo não é mais importado em runtime. O CSS que ele describe
// é gerado a partir destes tokens e vive, já compilado, em
// app/tema-marca.generated.css (importado direto em app/layout.tsx) —
// isso faz a marca nascer verde no primeiro paint, sem o flash de
// azul-pra-verde que existia quando isso era aplicado via `applyTheme()`
// num useEffect client-side. Esses tokens continuam aqui como a fonte
// legível/documentada; o cabeçalho do CSS gerado explica como regerar
// esse arquivo a partir daqui quando a semente ou os tokens mudarem.
//
// Por que este arquivo é tão grande:
// `applyTheme({ referenceTokens: { color: { primary: SEMENTE_VERDE } } })`
// sozinho SÓ gera a rampa tonal `colorPrimary50..1000` (o mesmo
// mecanismo do Cloudscape Theme Builder, via
// @material/material-color-utilities) — ele não recalcula sozinho os
// tokens semânticos (botão primário, foco, links, etc.) que apontavam
// pra essa rampa, porque o CSS de cada componente Cloudscape já vem
// compilado com um valor literal de fallback (ex:
// `var(--color-background-button-primary-default-XXXX, #006ce0)`).
// Pra herdar a semente nova, é preciso pedir explicitamente a
// redeclaração de cada token semântico que referenciava
// `{colorPrimaryNNN}` no preset original do Cloudscape — é isso que
// `TOKENS_DERIVADOS_DA_MARCA` faz: mesma fórmula de referência que o
// preset já usava, só que redeclarada aqui pra `createOverrideDeclarations`
// gerar CSS novo em cima da rampa verde em vez da azul.
//
// O que fica de fora, de propósito: qualquer token que resolve pra
// `colorInfoNNN` (badge azul, fundo/borda de Modal, StatusIndicator
// "info", flashbar informativo, limiar de gráfico). Esses tokens têm
// o mesmo azul #006ce0 por COINCIDÊNCIA de valor no tema padrão, mas
// vivem num eixo semântico separado ("informativo", não "marca") —
// mudar a marca pra verde não deve fazer um Alert/StatusIndicator
// informativo virar verde (que já é o significado de "sucesso").
// ============================================================

export const SEMENTE_VERDE_ORGANICO = "#2E7D4F";

type FormulaToken = { light: string; dark: string };

export const TOKENS_DERIVADOS_DA_MARCA: Record<string, FormulaToken> = {
  colorBackgroundButtonLinkHover: { light: "{colorPrimary50}", dark: "{colorNeutral800}" },
  colorBackgroundButtonNormalHover: { light: "{colorPrimary50}", dark: "{colorNeutral800}" },
  colorBackgroundToggleButtonNormalHover: {
    light: "{colorBackgroundButtonNormalHover}",
    dark: "{colorBackgroundButtonNormalHover}",
  },
  colorBackgroundButtonPrimaryActive: { light: "{colorPrimary900}", dark: "{colorPrimary400}" },
  colorBackgroundButtonPrimaryDefault: {
    light: "{colorBorderButtonNormalDefault}",
    dark: "{colorBorderButtonNormalDefault}",
  },
  colorBackgroundButtonPrimaryHover: {
    light: "{colorBorderButtonNormalHover}",
    dark: "{colorBorderButtonNormalHover}",
  },
  colorBackgroundControlChecked: { light: "{colorPrimary600}", dark: "{colorPrimary400}" },
  colorBackgroundDropdownItemFilterMatch: { light: "{colorPrimary50}", dark: "{colorNeutral700}" },
  colorBackgroundDropdownItemSelected: {
    light: "{colorBackgroundItemSelected}",
    dark: "{colorBackgroundItemSelected}",
  },
  colorBackgroundItemSelected: { light: "{colorPrimary50}", dark: "{colorPrimary1000}" },
  colorBackgroundLayoutToggleSelectedActive: { light: "{colorPrimary600}", dark: "{colorPrimary400}" },
  colorBackgroundLayoutToggleSelectedDefault: { light: "{colorPrimary600}", dark: "{colorPrimary400}" },
  colorBackgroundProgressBarValueDefault: { light: "{colorPrimary600}", dark: "{colorPrimary400}" },
  colorBackgroundSegmentActive: { light: "{colorPrimary600}", dark: "{colorPrimary400}" },
  colorBackgroundSegmentHover: {
    light: "{colorBackgroundButtonNormalHover}",
    dark: "{colorBackgroundButtonNormalHover}",
  },
  colorBackgroundSliderRangeDefault: {
    light: "{colorBackgroundSliderHandleDefault}",
    dark: "{colorBackgroundSliderHandleDefault}",
  },
  colorBackgroundSliderHandleDefault: { light: "{colorPrimary600}", dark: "{colorPrimary400}" },
  colorBorderButtonNormalActive: { light: "{colorPrimary900}", dark: "{colorPrimary300}" },
  colorBorderButtonNormalDefault: { light: "{colorPrimary600}", dark: "{colorPrimary400}" },
  colorBorderToggleButtonNormalPressed: { light: "{colorPrimary600}", dark: "{colorPrimary400}" },
  colorBorderToggleButtonNormalDefault: {
    light: "{colorBorderButtonNormalDefault}",
    dark: "{colorBorderButtonNormalDefault}",
  },
  colorBorderToggleButtonNormalHover: {
    light: "{colorBorderButtonNormalHover}",
    dark: "{colorBorderButtonNormalHover}",
  },
  colorBorderButtonNormalHover: { light: "{colorPrimary900}", dark: "{colorPrimary300}" },
  colorBorderButtonPrimaryActive: {
    light: "{colorBackgroundButtonPrimaryActive}",
    dark: "{colorBackgroundButtonPrimaryActive}",
  },
  colorBorderButtonPrimaryDefault: {
    light: "{colorBackgroundButtonPrimaryDefault}",
    dark: "{colorBackgroundButtonPrimaryDefault}",
  },
  colorBorderButtonPrimaryHover: {
    light: "{colorBackgroundButtonPrimaryHover}",
    dark: "{colorBackgroundButtonPrimaryHover}",
  },
  colorItemSelected: { light: "{colorPrimary600}", dark: "{colorPrimary400}" },
  colorTextSideNavigationItemActive: { light: "{colorTextAccent}", dark: "{colorTextAccent}" },
  colorBorderInputFocused: { light: "{colorPrimary600}", dark: "{colorPrimary400}" },
  colorBorderItemFocused: { light: "{colorPrimary600}", dark: "{colorPrimary400}" },
  colorBorderItemSelected: { light: "{colorItemSelected}", dark: "{colorItemSelected}" },
  colorTextAccent: { light: "{colorPrimary600}", dark: "{colorPrimary400}" },
  colorTextButtonInlineIconDefault: { light: "{colorTextLinkDefault}", dark: "{colorTextLinkDefault}" },
  colorTextButtonInlineIconHover: { light: "{colorTextLinkHover}", dark: "{colorTextLinkHover}" },
  colorTextButtonNormalActive: { light: "{colorPrimary900}", dark: "{colorPrimary300}" },
  colorTextToggleButtonNormalPressed: { light: "{colorPrimary900}", dark: "{colorPrimary300}" },
  colorTextButtonNormalDefault: { light: "{colorPrimary600}", dark: "{colorPrimary400}" },
  colorTextButtonNormalHover: { light: "{colorPrimary900}", dark: "{colorPrimary300}" },
  colorTextButtonLinkActive: { light: "{colorTextButtonNormalActive}", dark: "{colorTextButtonNormalActive}" },
  colorTextButtonLinkDefault: { light: "{colorTextButtonNormalDefault}", dark: "{colorTextButtonNormalDefault}" },
  colorTextButtonLinkHover: { light: "{colorTextButtonNormalHover}", dark: "{colorTextButtonNormalHover}" },
  colorTextDropdownItemFilterMatch: { light: "{colorPrimary600}", dark: "{colorPrimary300}" },
  colorTextExpandableSectionHover: { light: "{colorTextAccent}", dark: "{colorTextAccent}" },
  colorTextLayoutToggleHover: { light: "{colorPrimary600}", dark: "{colorPrimary400}" },
  colorTextLinkDefault: { light: "{colorPrimary600}", dark: "{colorPrimary400}" },
  colorTextLinkHover: { light: "{colorPrimary900}", dark: "{colorPrimary300}" },
  colorTextLinkSecondaryDefault: { light: "{colorTextLinkDefault}", dark: "{colorTextLinkDefault}" },
  colorTextLinkSecondaryHover: { light: "{colorTextLinkHover}", dark: "{colorTextLinkHover}" },
  colorTextLinkInfoDefault: { light: "{colorTextLinkDefault}", dark: "{colorTextLinkDefault}" },
  colorTextLinkInfoHover: { light: "{colorTextLinkHover}", dark: "{colorTextLinkHover}" },
  colorTextSegmentHover: { light: "{colorTextButtonNormalHover}", dark: "{colorTextButtonNormalHover}" },
  colorDropzoneBackgroundHover: { light: "{colorPrimary50}", dark: "{colorPrimary1000}" },
  colorDropzoneBorderHover: { light: "{colorPrimary900}", dark: "{colorPrimary300}" },
  colorBackgroundActionCardHover: { light: "{colorPrimary50}", dark: "{colorNeutral800}" },
  colorBorderActionCardDefault: { light: "{colorPrimary600}", dark: "{colorPrimary400}" },
  colorBorderActionCardHover: { light: "{colorPrimary900}", dark: "{colorPrimary300}" },
  colorBorderActionCardActive: { light: "{colorPrimary900}", dark: "{colorPrimary300}" },
};
