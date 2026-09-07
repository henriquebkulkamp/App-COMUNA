// ============================================================
// OBSERVABILIDADE DE PERFORMANCE — console + persistência opcional.
//
// Cobre as 3 métricas que o Lighthouse mede no CI (ver
// .github/workflows/lighthouse.yml): First Contentful Paint,
// Largest Contentful Paint e Total Blocking Time.
//
// Roda inteiramente no navegador de quem abrir o site. Além do
// console (filtre o DevTools por "[perf]"), FCP/LCP/long-tasks/render
// também são enviados via `navigator.sendBeacon` pra POST /api/perf,
// que grava em perf_logs (Postgres) — é o que o Grafana lê (ver
// docker-compose.yml e grafana/provisioning). O envio é best-effort
// e assíncrono: nunca deve mudar timing, cache ou fetch do app.
//
// Automático e global por design: nada aqui precisa ser tocado de
// novo conforme o app ganha mais páginas ou componentes — tudo é
// montado uma única vez em app/layout.tsx (ver ObservabilidadeDePerformance
// e ProfilerRaiz) e continua valendo pra qualquer coisa nova.
//
// Analogia Python: um logger dedicado ("perf"), só com um
// StreamHandler pro console — sem handler de rede, sem servidor.
// ============================================================

import { useEffect } from "react";
import type { FCPMetricWithAttribution, LCPMetricWithAttribution } from "web-vitals/attribution";

const PREFIXO = "[perf]";

function ms(valor: number): string {
  return `${valor.toFixed(1)}ms`;
}

// ─── Envio best-effort pro backend ────────────────────────────
// `sendBeacon` dispara a requisição sem bloquear nem esperar
// resposta (funciona até durante o unload da página) — por isso
// não muda timing nenhum do app. Sem suporte ou com erro, some
// em silêncio: instrumentação nunca pode quebrar o site.
function ehVisitaSintetica(): boolean {
  // 1) `?perf_sintetico=1` — é o que lighthouserc.js coloca na URL que o
  //    Lighthouse visita. Precisa ser via query string (não header) porque
  //    cada rodada do Lighthouse faz duas navegações internas e só a
  //    query string sobrevive às duas (testado e confirmado).
  if (new URLSearchParams(window.location.search).get("perf_sintetico") === "1") {
    return true;
  }
  // 2) `navigator.webdriver` — sinal padrão de navegador sob controle de
  //    automação (Selenium/Puppeteer/Playwright ligam a flag
  //    --enable-automation). NÃO cobre o Lighthouse (chrome-launcher não
  //    liga essa flag), mas serve de rede de segurança pra outra
  //    ferramenta de automação que bater no site sem o parâmetro acima.
  return Boolean(navigator.webdriver);
}

function enviarLogDePerformance(payload: {
  tipo: "fcp" | "lcp" | "long-task" | "render";
  valorMs: number;
  rating?: string;
  detalhes?: unknown;
  componente?: string;
}): void {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
  try {
    const corpo = JSON.stringify({
      ...payload,
      pagina: window.location.pathname,
      // Sem isso, teste sintético (com throttling de CPU/rede de
      // propósito) entraria no mesmo gráfico que visita real e
      // distorceria a média (ver painéis "real" vs "sintético" no Grafana).
      origem: ehVisitaSintetica() ? "sintetico" : "real",
    });
    navigator.sendBeacon("/api/perf", new Blob([corpo], { type: "application/json" }));
  } catch {
    // best-effort — nunca deve quebrar o app.
  }
}

// ─── 1) Web Vitals (FCP/LCP) com causa automática ────────────
// `web-vitals/attribution` já devolve a causa de cada métrica —
// não precisamos escrever lógica nenhuma pra isso.
export function logMetricaWebVital(
  metric: FCPMetricWithAttribution | LCPMetricWithAttribution
): void {
  console.log(
    `${PREFIXO} web-vital  ${metric.name} = ${ms(metric.value)}  (rating: ${metric.rating})`
  );

  if (metric.name === "FCP") {
    const { timeToFirstByte, firstByteToFCP, loadState } = metric.attribution;
    console.log(
      `${PREFIXO}   ↳ attribution: TTFB=${ms(timeToFirstByte)}  primeiro-byte→FCP=${ms(firstByteToFCP)}  loadState=${loadState}`
    );
    enviarLogDePerformance({
      tipo: "fcp",
      valorMs: metric.value,
      rating: metric.rating,
      detalhes: { timeToFirstByte, firstByteToFCP, loadState },
    });
    return;
  }

  // LCP
  const { target, url, timeToFirstByte, resourceLoadDelay, resourceLoadDuration, elementRenderDelay } =
    metric.attribution;
  console.log(
    `${PREFIXO}   ↳ attribution: elemento=${target ?? "(não identificado)"}${url ? `  url=${url}` : ""}\n` +
      `${PREFIXO}     TTFB=${ms(timeToFirstByte)}  atraso-carregar-recurso=${ms(resourceLoadDelay)}  duração-carregar-recurso=${ms(resourceLoadDuration)}  atraso-render=${ms(elementRenderDelay)}`
  );
  enviarLogDePerformance({
    tipo: "lcp",
    valorMs: metric.value,
    rating: metric.rating,
    detalhes: { target, url, timeToFirstByte, resourceLoadDelay, resourceLoadDuration, elementRenderDelay },
  });
}

// ─── 2) Long tasks — aproximação de Total Blocking Time ──────
// Não existe API de navegador nem lib que exponha TBT — é uma
// métrica exclusiva de laboratório do Lighthouse (soma de long
// tasks entre FCP e Time to Interactive). Aproximamos aqui somando
// max(0, duração - 50ms) de toda long task observada desde a
// navegação — janela mais simples que a do Lighthouse (que usa
// TTI), então isso serve pra RANQUEAR/COMPARAR de onde vêm as
// tasks longas, não pra bater o número exato do relatório de CI.
export function iniciarObservadorDeLongTasks(): () => void {
  if (typeof PerformanceObserver === "undefined") return () => {};
  if (!PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
    // Navegador sem suporte a Long Tasks API — evita até o aviso
    // que o browser loga sozinho ao tentar observar um tipo não
    // suportado (best-effort, nunca deve quebrar o app).
    return () => {};
  }

  let tbtAproximadoMs = 0;
  let qtdLongTasks = 0;

  const observer = new PerformanceObserver((lista) => {
    for (const entry of lista.getEntries()) {
      const excedente = Math.max(0, entry.duration - 50);
      tbtAproximadoMs += excedente;
      qtdLongTasks += 1;
      console.log(
        `${PREFIXO} long-task  duração=${ms(entry.duration)}  início=${ms(entry.startTime)}  excedente(>50ms)=${ms(excedente)}  |  TBT aproximado ≈ ${ms(tbtAproximadoMs)} em ${qtdLongTasks} task(s)`
      );
      enviarLogDePerformance({
        tipo: "long-task",
        valorMs: entry.duration,
        detalhes: { startTime: entry.startTime, excedente },
      });
    }
  });

  try {
    observer.observe({ type: "longtask", buffered: true });
  } catch {
    // Navegador sem suporte a Long Tasks API — instrumentação é
    // best-effort, nunca deve quebrar o app.
    return () => {};
  }

  return () => observer.disconnect();
}

// ─── 3) Render — tempo de commit do React, por Profiler ──────
// Assinatura exigida pelo `onRender` do <Profiler> do React.
//
// SÓ CONSOLE, de propósito — não manda pro servidor. Testamos e
// confirmamos que o <Profiler> do React não chama `onRender` em
// build de produção (é comportamento documentado do próprio React:
// profiling desligado por padrão em produção pra evitar overhead).
// Tentamos religar via alias de webpack pro `react-dom/profiling`
// (a solução oficial) e não funcionou nesta versão do Next/App
// Router — o bundle mudava (confirmado por hash), mas `onRender`
// continuava não disparando, provavelmente porque a hidratação do
// App Router passa por um caminho interno do Next que não usa o
// `react-dom` do alias. Não vale o buraco de investigação — por
// isso a métrica que alimenta o Grafana é outra, ver
// `useMarcarMontagem` abaixo (User Timing API, funciona igual em
// dev e produção). Isso aqui fica só como debug visual em `npm run dev`.
export function onRenderRaiz(
  id: string,
  phase: "mount" | "update" | "nested-update",
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
): void {
  console.log(
    `${PREFIXO} render  id=${id}  phase=${phase}  actualDuration=${ms(actualDuration)}  baseDuration=${ms(baseDuration)}  commitTime=${ms(commitTime)}`
  );
}

// ─── 4) Tempo até montar — granularidade por seção, via User Timing ──
// Diferente do Profiler (só debug local), isso É enviado pro servidor
// e alimenta o painel "Atraso de render — componente por componente"
// no Grafana. Mede quanto tempo desde o início da navegação até o
// `useEffect` dessa seção rodar (ou seja: até ela estar montada/pronta
// na tela) — não é o mesmo número que o "actualDuration" do React
// (que é só o tempo de render+commit em JS, sem contar o que veio
// antes); aqui é o relógio inteiro da navegação até aquele ponto.
// Cria também uma `PerformanceMark` nomeada — dá pra ver na aba
// Performance do DevTools, filtrando por "comuna-montado-".
export function useMarcarMontagem(componente: string): void {
  useEffect(() => {
    if (typeof performance === "undefined" || typeof performance.mark !== "function") return;
    try {
      const nomeMarca = `comuna-montado-${componente}`;
      performance.mark(nomeMarca);
      const [medicao] = performance.getEntriesByName(nomeMarca, "mark");
      const valorMs = medicao?.startTime ?? performance.now();
      console.log(`${PREFIXO} render  id=${componente}  tempo-até-montar=${ms(valorMs)}`);
      enviarLogDePerformance({
        tipo: "render",
        valorMs,
        componente,
        detalhes: { metodo: "user-timing" },
      });
    } catch {
      // best-effort — nunca deve quebrar o app.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ─── 5) Fases de rede/parse — fecha o buraco antes do 1º componente ──
// Sem isso, a árvore de "tempo até montar" (useMarcarMontagem) começa
// direto em ~465ms sem explicar de onde veio esse tempo — rede, HTML,
// JS, tudo isso já rolou antes do React montar qualquer coisa. Em vez
// de instrumentar essas fases na mão (não dá: é o navegador que faz
// isso), lemos o que o próprio browser já calcula sozinho via
// PerformanceNavigationTiming — zero marca nova, só ler uma API que
// já existe. Chamado 1x por navegação em ObservabilidadeDePerformance.
export function enviarFasesDeNavegacao(): void {
  if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") return;
  try {
    const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (!nav) return;
    // Ordem cronológica garantida pela própria spec do Navigation Timing —
    // cada fase aqui é um ponto no MESMO relógio que useMarcarMontagem usa
    // (tempo desde o navigationStart), por isso encaixam na mesma árvore.
    const fases: Array<[string, number]> = [
      ["rede-ttfb", nav.responseStart],
      ["rede-download-html", nav.responseEnd],
      ["html-parseado", nav.domInteractive],
      ["scripts-carregados", nav.domContentLoadedEventEnd],
    ];
    for (const [componente, valorMs] of fases) {
      if (valorMs > 0) {
        console.log(`${PREFIXO} render  id=${componente}  tempo-até-montar=${ms(valorMs)}`);
        enviarLogDePerformance({
          tipo: "render",
          valorMs,
          componente,
          detalhes: { metodo: "navigation-timing" },
        });
      }
    }
  } catch {
    // best-effort — nunca deve quebrar o app.
  }
}
