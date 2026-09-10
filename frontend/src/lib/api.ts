// ============================================================
// API — cliente fino que embrulha fetch() contra o backend/ FastAPI.
//
// Antes (Next.js), os componentes chamavam fetch("/api/produtos")
// como caminho relativo — same-origin, o próprio Next servia a rota.
// Agora backend/ é um servidor separado (outra origem), então todo
// caminho precisa do prefixo de VITE_API_BASE_URL. É só isso: os
// caminhos ("/api/produtos", "/api/admin/estoque"...), métodos,
// corpos e respostas continuam exatamente os mesmos.
//
// Também anexa o token de sessão do login admin (se houver um
// guardado) em todo request — as rotas públicas simplesmente ignoram
// esse header; só as de mutação do painel admin (ver backend/app/auth.py)
// de fato exigem que ele esteja presente e válido.
//
// Analogia Python: como trocar `requests.get("/api/x")` (same host)
// por uma `requests.Session()` com header Authorization fixo — muda
// o endereço e anexa a credencial, sem mudar o resto da chamada.
// ============================================================

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const TOKEN_STORAGE_KEY = "comuna_admin_token";

function obterToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = obterToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
}
