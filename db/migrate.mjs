// ============================================================
// migrate.mjs — aplica db/schema.sql no Postgres apontado por DATABASE_URL
//
// Uso: npm run db:migrate
// Analogia Python: como rodar `psql -f schema.sql` a partir de um script.
// ============================================================
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("ERRO: variável DATABASE_URL não encontrada (verifique o .env.local).");
  process.exit(1);
}

const schemaSql = readFileSync(path.join(__dirname, "schema.sql"), "utf-8");

const client = new pg.Client({ connectionString: databaseUrl });

async function main() {
  await client.connect();
  console.log("Conectado ao Postgres. Aplicando db/schema.sql...");
  await client.query(schemaSql);
  console.log("✅ Schema aplicado com sucesso.");
}

main()
  .catch((erro) => {
    console.error("ERRO ao aplicar schema:", erro);
    process.exitCode = 1;
  })
  .finally(() => client.end());
