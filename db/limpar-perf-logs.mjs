// ============================================================
// limpar-perf-logs.mjs — apaga logs SINTÉTICOS (Lighthouse/etc)
// de perf_logs, sem tocar em dado origem='real'.
//
// HARDCODED DE PROPÓSITO, FÁCIL DE REMOVER: plugado como hook
// `pretest:lighthouse` no package.json (convenção nativa do npm —
// "pretest:lighthouse" roda sozinho antes de "test:lighthouse").
// Existe só porque, sem sessão/janela de tempo no relatório do
// Grafana (decisão de design: ver grafana/provisioning/dashboards/
// performance.json), cada rodada de teste se acumula com a
// anterior e o relatório mistura código antigo com novo.
//
// Pra remover esse comportamento de vez: apague a linha
// "pretest:lighthouse" do package.json e este arquivo.
//
// Uso direto: node db/limpar-perf-logs.mjs
// ============================================================
import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("ERRO: variável DATABASE_URL não encontrada (verifique o .env.local).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

async function main() {
  await client.connect();
  const { rowCount } = await client.query(
    "DELETE FROM perf_logs WHERE origem = 'sintetico'"
  );
  console.log(`🧹 ${rowCount} log(s) sintético(s) apagado(s) de perf_logs (origem='real' preservado).`);
}

main()
  .catch((erro) => {
    console.error("ERRO ao limpar perf_logs:", erro);
    process.exitCode = 1;
  })
  .finally(() => client.end());
