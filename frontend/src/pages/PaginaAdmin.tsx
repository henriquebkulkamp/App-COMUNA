import { Navigate, useLocation, useNavigate } from "react-router-dom";
import PainelAdmin from "@/components/admin/PainelAdmin";
import { obterUsuarioLogado, TOKEN_STORAGE_KEY } from "@/lib/api";

function estaAutenticado(): boolean {
  try {
    return Boolean(localStorage.getItem(TOKEN_STORAGE_KEY));
  } catch {
    return false;
  }
}

// ============================================================
// PaginaAdmin — rota protegida do painel (/admin). Dois jeitos de não
// entrar:
// 1. Sem token salvo — redireciona pra /login guardando esta rota
//    como "de onde veio" (`location.state.from`), pra PaginaLogin.tsx
//    mandar de volta pra cá depois de logar.
// 2. Com token válido mas conta sem isAdmin (login normal, não é mais
//    exclusivo de admin — ver app/auth.py::exigir_admin) — a conta
//    está logada de verdade, só não tem acesso aqui; manda pra home
//    (não faz sentido pedir login de novo pra quem já logou).
//
// O backend também recusa (403 em qualquer rota de admin/**) uma
// conta não-admin mesmo que essa checagem no front fosse burlada —
// isso aqui é só pra não montar o painel à toa pra quem não vai
// conseguir usar nada nele.
// ============================================================
export default function PaginaAdmin() {
  const location = useLocation();
  const navigate = useNavigate();

  if (!estaAutenticado()) {
    return (
      <Navigate
        to="/login"
        state={{ from: { pathname: location.pathname, search: location.search } }}
        replace
      />
    );
  }

  if (!obterUsuarioLogado()?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <PainelAdmin onSair={() => navigate("/")} />;
}
