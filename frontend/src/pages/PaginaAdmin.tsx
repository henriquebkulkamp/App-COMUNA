import { Navigate, useLocation, useNavigate } from "react-router-dom";
import PainelAdmin from "@/components/admin/PainelAdmin";
import { TOKEN_STORAGE_KEY } from "@/lib/api";

function estaAutenticado(): boolean {
  try {
    return Boolean(localStorage.getItem(TOKEN_STORAGE_KEY));
  } catch {
    return false;
  }
}

// ============================================================
// PaginaAdmin — rota protegida do painel (/admin). Sem token salvo,
// redireciona pra /login guardando esta rota como "de onde veio"
// (`location.state.from`) — depois de logar, PaginaLogin.tsx manda de
// volta pra cá. Ver App.tsx e PaginaLogin.tsx pro resto do fluxo.
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

  return <PainelAdmin onSair={() => navigate("/")} />;
}
