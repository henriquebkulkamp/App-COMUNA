import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";

// frontend/package.json tem "type": "module" — sem __dirname global.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Lê ADMIN_EMAIL/ADMIN_SENHA de ../../../backend/.env (não
// hardcoded aqui — esse arquivo é versionado, o .env não é) e faz o
// login de verdade pela UI (POST /api/auth/login contra o backend de
// teste — login não é mais rota exclusiva de admin, ver
// app/routers/auth.py). Usado só pelo teste visual do painel admin
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

  // Entra por /admin (não /login direto): sem sessão, PaginaAdmin.tsx
  // redireciona pra /login guardando `from: { pathname: "/admin" }` —
  // é esse "from" que faz o login devolver pra cá depois. Login
  // direto (sem "from") manda pra "/" agora, já que não é mais
  // exclusivo de admin (ver PaginaLogin.tsx::lerOrigem).
  await page.goto("/admin");
  await page.getByPlaceholder("seu@email.com").fill(email);
  await page.getByPlaceholder("Digite a senha").fill(senha);
  await page.getByRole("button", { name: "Login" }).click();

  await page.waitForURL((url) => url.pathname === "/admin");
}
