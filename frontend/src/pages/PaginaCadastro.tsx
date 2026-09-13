import { useState } from "react";
import { Navigate, useLocation, useNavigate, Link as RouterLink } from "react-router-dom";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import { apiFetch, salvarSessao, TOKEN_STORAGE_KEY } from "@/lib/api";
import Icone from "@/icons/Icone";

// Mesmo tom de fundo das outras páginas do cliente (ver PaginaPrincipal.tsx).
const FUNDO_PAGINA = "#f0f0e8";

interface EstadoOrigem {
  pathname: string;
  search: string;
}

function lerOrigem(state: unknown): string {
  const origem = (state as { from?: EstadoOrigem } | null)?.from;
  return origem ? `${origem.pathname}${origem.search}` : "/";
}

function estaAutenticado(): boolean {
  try {
    return Boolean(localStorage.getItem(TOKEN_STORAGE_KEY));
  } catch {
    return false;
  }
}

// ============================================================
// PaginaCadastro — cadastro público de conta (POST /api/auth/cadastro,
// ver app/routers/auth.py). Toda conta nova nasce sem acesso ao
// painel admin (isAdmin: false) — só existe uma forma de virar admin,
// e é direto no banco (de propósito, sem rota que promova conta).
// Mesmo fluxo de "from" que PaginaLogin.tsx: loga automaticamente
// depois do cadastro e volta pra de onde veio (ou home).
// ============================================================
export default function PaginaCadastro() {
  const location = useLocation();
  const navigate = useNavigate();
  const destino = lerOrigem(location.state);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cadastrando, setCadastrando] = useState(false);
  const [erro, setErro] = useState("");

  if (estaAutenticado()) return <Navigate to={destino} replace />;

  async function fazerCadastro(e: React.FormEvent) {
    e.preventDefault();
    setCadastrando(true);
    setErro("");
    try {
      const res = await apiFetch("/api/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha }),
      });
      const dados = await res.json();
      if (res.ok && dados.sucesso) {
        salvarSessao(dados.token, { nome: dados.nome, isAdmin: dados.isAdmin });
        navigate(destino, { replace: true });
      } else {
        setErro(dados.erro || "Não foi possível criar a conta.");
      }
    } catch {
      setErro("Não foi possível criar a conta. Tente novamente.");
    } finally {
      setCadastrando(false);
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
            <Header variant="h1" description="COMUNA — Cooperativa Orgânica Agroflorestal">
              <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                <Icone nome="user-profile" /><span>Criar conta</span>
              </SpaceBetween>
            </Header>
          }
        >
          <form onSubmit={fazerCadastro}>
            <SpaceBetween size="m">
              <FormField label="Nome">
                <Input
                  value={nome}
                  onChange={({ detail }) => setNome(detail.value)}
                  placeholder="Seu nome"
                  autoFocus
                />
              </FormField>
              <FormField label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={({ detail }) => setEmail(detail.value)}
                  placeholder="seu@email.com"
                />
              </FormField>
              <FormField label="Senha" errorText={erro || undefined} constraintText="Pelo menos 6 caracteres">
                <Input
                  type="password"
                  value={senha}
                  onChange={({ detail }) => setSenha(detail.value)}
                  placeholder="Crie uma senha"
                />
              </FormField>
              <Button variant="primary" fullWidth loading={cadastrando} formAction="submit">
                {cadastrando ? "Criando conta..." : "Criar conta"}
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
              <Box textAlign="center" fontSize="body-s">
                Já tem conta? <RouterLink to="/login" state={location.state}>Fazer login</RouterLink>
              </Box>
            </SpaceBetween>
          </form>
        </Container>
      </div>
    </div>
  );
}
