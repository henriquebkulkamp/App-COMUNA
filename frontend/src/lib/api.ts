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
// Analogia Python: como trocar `requests.get("/api/x")` (same host)
// por `requests.get(f"{BASE_URL}/api/x")` — nenhuma outra mudança de
// contrato, só de endereço.
// ============================================================

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, init);
}
