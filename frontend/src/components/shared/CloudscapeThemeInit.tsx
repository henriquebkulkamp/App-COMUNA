import { useEffect } from "react";
import { applyMode, applyDensity, Mode, Density } from "@cloudscape-design/global-styles";

// ============================================================
// CloudscapeThemeInit — liga o modo claro e a densidade confortável
// assim que o app carrega no navegador. Tema 100% padrão do
// Cloudscape (Light + Comfortable já são o default do próprio design
// system sem nenhuma classe extra, então isso é só uma garantia
// explícita, não uma mudança visual).
//
// A cor de marca (verde) NÃO é aplicada aqui — antes era, via
// `applyTheme()` num useEffect, mas isso rodava só depois do React
// montar e causava um flash visível de azul (o padrão do Cloudscape)
// virando verde. A cor de marca agora é CSS estático importado direto
// em src/main.tsx (src/styles/tema-marca.generated.css), que o Vite
// extrai pra um <link> real no <head> do build de produção — sem
// flash. Ver components/design-system/temaMarca.ts pra a fonte dos
// tokens e o cabeçalho do CSS gerado pra como regerar.
//
// applyMode/applyDensity só têm efeito no navegador (mexem em classes
// do <html>/<body>) — por isso ficam num useEffect, não direto no
// corpo do componente.
// ============================================================
export default function CloudscapeThemeInit() {
  useEffect(() => {
    applyMode(Mode.Light);
    applyDensity(Density.Comfortable);
  }, []);

  return null;
}
