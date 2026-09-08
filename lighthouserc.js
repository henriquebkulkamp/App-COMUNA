// ============================================================
// lighthouserc.js — configuração do Lighthouse CI (LHCI)
//
// Fonte única de verdade pros parâmetros de auditoria — usada
// tanto local (`npm run test:lighthouse`, com o servidor já de
// pé em localhost:3000) quanto no CI (.github/workflows/lighthouse.yml).
//
// numberOfRuns: 5 — a própria documentação do Lighthouse recomenda
// rodar várias vezes e olhar a MEDIANA, nunca uma rodada isolada:
// o resultado varia com carga da máquina, mesmo com throttling
// simulado. Foi exatamente essa variância que apareceu aqui: duas
// rodadas seguidas do mesmo build deram Performance Score 65 e 42.
//
// throttlingMethod: "simulate" é o padrão do próprio Lighthouse —
// calcula o throttling em cima do trace (determinístico), em vez
// de esperar rede de verdade — resultado mais repetível entre
// rodadas na mesma máquina.
//
// SEM seção `assert` de propósito: ainda não é pra travar o build
// por score baixo, só ter um número confiável pra acompanhar. Se
// no futuro quiser barrar (ex: "falha se Performance < 50"), é só
// adicionar `assert.assertions` aqui.
// ============================================================
module.exports = {
  ci: {
    collect: {
      // ?perf_sintetico=1 é o que lib/observabilidade.ts lê pra marcar
      // origem='sintetico'. Não dá pra usar header custom (extraHeaders)
      // pra isso: cada rodada do Lighthouse faz DUAS navegações internas
      // (uma medição completa + um replay quase instantâneo pra métricas
      // adicionais), e na prática só a segunda carrega com o header —
      // confirmado rodando e vendo LCP "real" de 7.5s junto de LCP
      // "sintetico" de 20ms no mesmo segundo. Query string sobrevive às
      // duas, já que é a mesma URL sendo revisitada.
      url: ["http://localhost:3000/?perf_sintetico=1"],
      numberOfRuns: 5,
      settings: {
        throttlingMethod: "simulate",
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
