"use client";

import { useEffect } from "react";
import { onFCP, onLCP } from "web-vitals/attribution";
import {
  logMetricaWebVital,
  iniciarObservadorDeLongTasks,
  enviarFasesDeNavegacao,
} from "@/lib/observabilidade";

// ============================================================
// ObservabilidadeDePerformance — liga os observadores globais de
// performance (FCP, LCP, long tasks) assim que o app carrega.
// Não renderiza nada — mesmo padrão do CloudscapeThemeInit.
//
// Fica ligado uma única vez aqui, na raiz (ver app/layout.tsx):
// não precisa ser adicionado de novo em nenhuma página/componente
// futuro, já que FCP/LCP/long-tasks são métricas da página inteira,
// não de um componente específico.
// ============================================================
export default function ObservabilidadeDePerformance() {
  useEffect(() => {
    onFCP(logMetricaWebVital);
    onLCP(logMetricaWebVital);
    enviarFasesDeNavegacao();
    return iniciarObservadorDeLongTasks();
  }, []);

  return null;
}
