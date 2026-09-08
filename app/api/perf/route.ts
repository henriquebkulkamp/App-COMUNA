// ============================================================
// POST /api/perf
//
// Recebe métricas de performance (Web Vitals / long tasks) do
// browser de quem visita e grava em perf_logs, pro Grafana ler
// (ver lib/observabilidade.ts, quem envia; docker-compose.yml,
// onde o Grafana sobe; grafana/provisioning, como ele lê o banco).
//
// Best-effort por natureza — instrumentação nunca deve atrapalhar
// a experiência de quem visita, então qualquer erro aqui vira só
// log de servidor, nunca uma resposta de erro "visível" (o browser
// manda isso via sendBeacon, que nem lê a resposta).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { salvarLogDePerformance } from "@/lib/db";

const TIPOS_VALIDOS = new Set(["fcp", "lcp", "long-task", "render"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipo, valorMs, rating, pagina, detalhes, origem, componente } = body ?? {};

    if (!TIPOS_VALIDOS.has(tipo) || typeof valorMs !== "number") {
      return NextResponse.json({ erro: "payload inválido" }, { status: 400 });
    }

    // Header próprio, mandado só pelo Lighthouse (ver `extraHeaders` em
    // lighthouserc.js) — mais confiável que `navigator.webdriver`: o
    // chrome-launcher usado pelo Lighthouse não liga a flag
    // --enable-automation que ativaria esse sinal no navegador.
    const ehSintetico =
      request.headers.get("x-perf-origem") === "sintetico" || origem === "sintetico";

    await salvarLogDePerformance({
      tipo,
      valorMs,
      rating: typeof rating === "string" ? rating : undefined,
      pagina: typeof pagina === "string" ? pagina : undefined,
      detalhes,
      origem: ehSintetico ? "sintetico" : "real",
      componente: typeof componente === "string" ? componente : undefined,
    });

    return new NextResponse(null, { status: 204 });
  } catch (erro) {
    console.error("[POST /api/perf] Erro ao salvar log de performance:", erro);
    return new NextResponse(null, { status: 204 });
  }
}
