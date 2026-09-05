"use client";

import { useEffect } from "react";
import { applyMode, applyDensity, Mode, Density } from "@cloudscape-design/global-styles";

// ============================================================
// CloudscapeThemeInit — liga o modo claro e a densidade confortável
// assim que o app carrega no navegador. Tema 100% padrão do
// Cloudscape, sem sobrescrever nenhum token de cor — a paleta,
// tipografia e espaçamento são exatamente os do design system,
// sem adaptação pra cor da marca.
//
// Isso precisa rodar no cliente (mexe em classes do <html>/<body>)
// — por isso é um componente à parte, mantendo app/layout.tsx como
// server component (que precisa continuar exportando `metadata`).
// ============================================================
export default function CloudscapeThemeInit() {
  useEffect(() => {
    applyMode(Mode.Light);
    applyDensity(Density.Comfortable);
  }, []);

  return null;
}
