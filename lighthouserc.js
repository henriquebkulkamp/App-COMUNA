// ============================================================
// lighthouserc.js — configuração do Lighthouse CI (LHCI)
//
// Fonte única de verdade pros parâmetros de auditoria — usada
// tanto local (`npm run test:lighthouse`, com o servidor já de
// pé em localhost:3000) quanto no CI (.github/workflows/lighthouse.yml).
//
// numberOfRuns: 1 — de propósito, não é o padrão recomendado pelo
// Lighthouse (que pede várias rodadas + mediana). Aqui a primeira
// rodada é sempre a mais lenta das 5 que a gente já rodou (61 vs.
// 90/90/90/91): da 2ª em diante o V8 reaproveita bytecode já
// compilado do mesmo JS (cache de compilação do Chrome), então o
// TBT/LCP caem pela metade — mas isso só existe pra quem JÁ visitou a
// página nessa mesma sessão do navegador. Pra loja, a maioria do
// tráfego é visita nova (sem esse cache "quente"), então a 1ª rodada
// é o cenário honesto — rodar mais e tirar mediana só dilui esse
// número real com repetições que não representam a visita de verdade.

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
      url: ["http://localhost:3000/"],
      numberOfRuns: 1,
      settings: {
        throttlingMethod: "simulate",
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
