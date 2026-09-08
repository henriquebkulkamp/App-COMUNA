"use client";

import { Profiler, type ReactNode } from "react";
import { onRenderRaiz, useMarcarMontagem } from "@/lib/observabilidade";

// ============================================================
// ProfilerRaiz — um único <Profiler> do React envolvendo a árvore
// inteira do app (ver app/layout.tsx). Dá o tempo de render/commit
// do React pra tudo que existir aqui dentro, incluindo qualquer
// página ou componente adicionado no futuro — sem precisar
// envolver cada seção nova com o próprio Profiler.
//
// Existe como Client Component só porque <Profiler> precisa rodar
// no cliente (é aí que o commit de verdade acontece); o layout
// (Server Component) só passa `children` pra dentro, sem precisar
// virar client ele mesmo.
// ============================================================
export default function ProfilerRaiz({ children }: { children: ReactNode }) {
  // useMarcarMontagem é o que realmente alimenta o Grafana em produção
  // (ver lib/observabilidade.ts) — o <Profiler> abaixo é só debug local.
  useMarcarMontagem("app");
  return (
    <Profiler id="app" onRender={onRenderRaiz}>
      {children}
    </Profiler>
  );
}
