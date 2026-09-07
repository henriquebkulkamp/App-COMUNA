"use client";

import { Profiler, type ReactNode } from "react";
import { onRenderRaiz, useMarcarMontagem } from "@/lib/observabilidade";

// ============================================================
// SecaoInstrumentada — envolve uma seção da página com as duas
// formas de medir render que existem no projeto:
//
// 1. <Profiler> do React — rico (fase, actualDuration, baseDuration),
//    mas só funciona de verdade em `npm run dev` (ver comentário
//    longo em lib/observabilidade.ts sobre o Profiler não disparar
//    em build de produção do Next/App Router). Serve só de debug
//    visual local, não alimenta o Grafana.
//
// 2. useMarcarMontagem (User Timing API) — mais simples, mas
//    funciona igual em dev/produção. É o que alimenta de verdade o
//    painel "Atraso de render — componente por componente".
//
// Uso: <SecaoInstrumentada id="produtos-destaque"><ProdutosDestaque /></SecaoInstrumentada>
// ============================================================
export default function SecaoInstrumentada({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  useMarcarMontagem(id);
  return (
    <Profiler id={id} onRender={onRenderRaiz}>
      {children}
    </Profiler>
  );
}
