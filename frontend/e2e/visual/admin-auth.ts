import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";

// frontend/package.json tem "type": "module" — sem __dirname global.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Lê ADMIN_EMAIL/ADMIN_SENHA de ../../../backend/.env (não
// hardcoded aqui — esse arquivo é versionado, o .env não é) e faz o
// login de verdade pela UI (POST /api/admin/login contra o backend
// de teste). Usado só pelo teste visual do painel admin
// (admin.visual.spec.ts) — o mesmo par email/senha que
// `npm run db:seed` (raiz) configura como administradora.
// ============================================================

function lerCredenciaisAdmin(): { email: string; senha: string } {
  const envPath = path.resolve(__dirname, "../../../backend/.env");
  const conteudo = fs.readFileSync(envPath, "utf-8");

  const valores: Record<string, string> = {};
  for (const linha of conteudo.split("\n")) {
    const match = linha.match(/^([A-Z_]+)=(.*)$/);
    if (match) valores[match[1]] = match[2].trim();
  }

  const email = valores.ADMIN_EMAIL;
  const senha = valores.ADMIN_SENHA;
  if (!email || !senha) {
    throw new Error(
      `ADMIN_EMAIL/ADMIN_SENHA não encontrados em ${envPath} — o teste visual do admin precisa deles pra logar.`
    );
  }
  return { email, senha };
}

export async function logarComoAdmin(page: Page): Promise<void> {
  const { email, senha } = lerCredenciaisAdmin();

  await page.goto("/login");
  await page.getByPlaceholder("seu@email.com").fill(email);
  await page.getByPlaceholder("Digite a senha").fill(senha);
  await page.getByRole("button", { name: "Login" }).click();

  // Login bem-sucedido navega pra fora de /login (destino padrão: /admin).
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}
