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
// Também anexa o token de sessão (se houver um guardado, de QUALQUER
// conta — não é mais só de admin, ver backend/app/routers/auth.py) em
// todo request — as rotas públicas simplesmente ignoram esse header;
// só as de mutação do painel admin (Depends(exigir_admin), ver
// backend/app/auth.py) de fato exigem que ele esteja presente,
// válido, E de uma conta com is_admin=true.
//
// Analogia Python: como trocar `requests.get("/api/x")` (same host)
// por uma `requests.Session()` com header Authorization fixo — muda
// o endereço e anexa a credencial, sem mudar o resto da chamada.
// ============================================================

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const TOKEN_STORAGE_KEY = "comuna_token";

// Dados da conta logada — não o token em si (isso é só o essencial
// pra decidir o que mostrar na UI: nome no Header, "isAdmin" pra
// saber se mostra o link do painel). Nunca a senha, óbvio.
export const USUARIO_STORAGE_KEY = "comuna_usuario";

export interface UsuarioLogado {
  nome: string;
  isAdmin: boolean;
}

export function salvarSessao(token: string, usuario: UsuarioLogado): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USUARIO_STORAGE_KEY, JSON.stringify(usuario));
  } catch {
    // localStorage indisponível (modo privado bloqueando, etc) — login
    // ainda funciona pra essa navegação, só não persiste num reload.
  }
}

export function limparSessao(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USUARIO_STORAGE_KEY);
  } catch {
    // nada a fazer
  }
}

export function obterUsuarioLogado(): UsuarioLogado | null {
  try {
    const bruto = localStorage.getItem(USUARIO_STORAGE_KEY);
    if (!bruto) return null;
    return JSON.parse(bruto) as UsuarioLogado;
  } catch {
    return null;
  }
}

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
