// ============================================================
// aguardar-postgres.mjs — espera o Postgres aceitar conexões
// antes de rodar migrate/seed logo após o `docker compose up`.
// ============================================================
import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("ERRO: variável DATABASE_URL não encontrada (verifique o .env.local).");
  process.exit(1);
}

const TENTATIVAS = 30;
const INTERVALO_MS = 1000;

async function tentarConectar() {
  const client = new pg.Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.query("SELECT 1");
    await client.end();
    return true;
  } catch {
    await client.end().catch(() => {});
    return false;
  }
}

async function main() {
  for (let i = 1; i <= TENTATIVAS; i++) {
    if (await tentarConectar()) {
      console.log("✅ Postgres pronto para conexões.");
      return;
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, INTERVALO_MS));
  }
  console.error("\nERRO: Postgres não respondeu a tempo.");
  process.exit(1);
}

main();
