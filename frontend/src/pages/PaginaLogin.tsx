import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { apiFetch, TOKEN_STORAGE_KEY } from "@/lib/api";
import Icone from "@/icons/Icone";

// Mesmo tom de fundo das outras páginas do cliente (ver PaginaPrincipal.tsx).
const FUNDO_PAGINA = "#f0f0e8";

interface EstadoOrigem {
  pathname: string;
  search: string;
}

function lerOrigem(state: unknown): string {
  const origem = (state as { from?: EstadoOrigem } | null)?.from;
  return origem ? `${origem.pathname}${origem.search}` : "/admin";
}

function estaAutenticado(): boolean {
  try {
    return Boolean(localStorage.getItem(TOKEN_STORAGE_KEY));
  } catch {
    return false;
  }
}

// ============================================================
// PaginaLogin — tela de login do painel admin (antes era um Modal, ver
// histórico de PortaoAdmin.tsx). "Área da COMUNA" no Header manda pra
// cá guardando de onde o clique veio (`location.state.from`) — depois
// de logar (ou ao cancelar), volta exatamente pra lá, não força ir pra
// home. Sem "from" (ex: alguém digitou /login direto na barra), o
// destino padrão é o painel (/admin).
// ============================================================
export default function PaginaLogin() {
  const location = useLocation();
  const navigate = useNavigate();
  const destino = lerOrigem(location.state);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState("");

  // Já logado (ex: voltou aqui por engano, ou abriu em outra aba
  // depois de logar) — pula a tela e vai direto pro destino.
  if (estaAutenticado()) return <Navigate to={destino} replace />;

  async function fazerLogin(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setErro("");
    try {
      const res = await apiFetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const dados = await res.json();
      if (res.ok && dados.sucesso) {
        localStorage.setItem(TOKEN_STORAGE_KEY, dados.token);
        navigate(destino, { replace: true });
      } else {
        setErro(dados.erro || "Email ou senha incorretos.");
        setSenha("");
      }
    } catch {
      setErro("Não foi possível fazer login. Tente novamente.");
      setSenha("");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: FUNDO_PAGINA,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <Container
          header={
            <Header
              variant="h1"
              description="Painel da Elizete — COMUNA"
            >
              <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                <Icone nome="lock-private" /><span>Login administrativo</span>
              </SpaceBetween>
            </Header>
          }
        >
          <form onSubmit={fazerLogin}>
            <SpaceBetween size="m">
              <FormField label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={({ detail }) => setEmail(detail.value)}
                  placeholder="seu@email.com"
                  autoFocus
                />
              </FormField>
              <FormField label="Senha" errorText={erro || undefined}>
                <Input
                  type="password"
                  value={senha}
                  onChange={({ detail }) => setSenha(detail.value)}
                  placeholder="Digite a senha"
                />
              </FormField>
              <Button variant="primary" fullWidth loading={entrando} formAction="submit">
                {entrando ? "Entrando..." : "Login"}
              </Button>
              <Button
                variant="link"
                fullWidth
                formAction="none"
                iconSvg={<Icone nome="arrow-left" tamanho={16} />}
                onClick={() => navigate(destino)}
              >
                Cancelar
              </Button>
            </SpaceBetween>
          </form>
        </Container>
      </div>
    </div>
  );
}
