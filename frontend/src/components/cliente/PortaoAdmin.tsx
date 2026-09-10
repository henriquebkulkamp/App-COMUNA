import { useState, useEffect, type ReactNode } from "react";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Icon from "@cloudscape-design/components/icon";
import Modal from "@cloudscape-design/components/modal";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Header from "@/components/shared/Header";
import PainelAdmin from "@/components/admin/PainelAdmin";
import { apiFetch, TOKEN_STORAGE_KEY } from "@/lib/api";

// Fundo da página com um amarelo bem sutil — os Containers continuam
// brancos por cima, sem degradê, uma cor sólida de cada lado.
//
// Um pouco mais escuro que o token `colorBackgroundStatusWarning` dos
// Alerts (#fffef0), pra contrastar mais com o branco dos Containers —
// mas sem pular pro próximo degrau da paleta do Cloudscape
// (`color-warning-100`, #fffbbd), que é bem mais saturado. Mesmo tom,
// só um pouco mais escuro.
const FUNDO_PAGINA = "#f0f0e8";

interface PortaoAdminProps {
  /** Vitrine pública (ver src/pages/PaginaPrincipal.tsx) — passada como
   *  children pra não precisar viver dentro deste componente. Só é de
   *  fato mostrada quando NÃO autenticado como admin. */
  children: ReactNode;
}

// ============================================================
// PortaoAdmin — única parte da página que precisa saber se quem está
// vendo é a Elizete (admin) ou um cliente qualquer. Essa distinção só
// existe no navegador (depende de haver um token salvo em localStorage).
//
// Login por conta (email + senha), não mais PIN único — POST
// /api/admin/login retorna um token de sessão (ver backend/app/auth.py)
// que fica guardado aqui e é reenviado em toda chamada admin daqui pra
// frente (ver src/lib/api.ts).
// ============================================================
export default function PortaoAdmin({ children }: PortaoAdminProps) {
  const [mostrarLoginAdmin, setMostrarLoginAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [erroLogin, setErroLogin] = useState("");

  useEffect(() => {
    if (localStorage.getItem(TOKEN_STORAGE_KEY)) setAutenticado(true);
  }, []);

  async function fazerLogin(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setErroLogin("");
    try {
      const res = await apiFetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const dados = await res.json();
      if (res.ok && dados.sucesso) {
        localStorage.setItem(TOKEN_STORAGE_KEY, dados.token);
        setAutenticado(true);
        setMostrarLoginAdmin(false);
        setEmail("");
        setSenha("");
      } else {
        setErroLogin(dados.erro || "Email ou senha incorretos.");
        setSenha("");
      }
    } catch {
      setErroLogin("Não foi possível fazer login. Tente novamente.");
      setSenha("");
    } finally {
      setEntrando(false);
    }
  }

  function fecharModal() {
    setMostrarLoginAdmin(false);
    setErroLogin("");
    setEmail("");
    setSenha("");
  }

  if (autenticado) {
    return <PainelAdmin onSair={() => setAutenticado(false)} />;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: FUNDO_PAGINA }}>
      <Header onAdminClick={() => setMostrarLoginAdmin(true)} />

      {/* Modal de login admin */}
      <Modal
        visible={mostrarLoginAdmin}
        onDismiss={fecharModal}
        header={
          <SpaceBetween direction="horizontal" size="xs" alignItems="center">
            <Icon name="lock-private" /> Login administrativo
          </SpaceBetween>
        }
        size="small"
      >
        <SpaceBetween size="m">
          <Box color="text-body-secondary" textAlign="center">
            Painel da Elizete — COMUNA
          </Box>
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
              <FormField label="Senha" errorText={erroLogin || undefined}>
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
              <Button variant="link" fullWidth formAction="none" onClick={fecharModal}>
                Cancelar
              </Button>
            </SpaceBetween>
          </form>
        </SpaceBetween>
      </Modal>

      {children}
    </div>
  );
}
