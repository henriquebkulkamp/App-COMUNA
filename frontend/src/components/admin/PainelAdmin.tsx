import { useState, lazy, Suspense } from "react";
import Container from "@cloudscape-design/components/container";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import {
  colorBackgroundLayoutMain,
  spaceScaledS,
  spaceScaledM,
  spaceScaledXl,
  fontSizeHeadingXl,
} from "@cloudscape-design/design-tokens";
import Header from "@/components/shared/Header";
import { LojaProvider } from "@/lib/loja-context";

// Table/ColumnLayout/Checkbox/Select/Textarea (e o próprio Tabs) só
// existem pra essas 3 telas — code-split (React.lazy) pra não entrar
// no bundle inicial de quem visita como cliente. Ver app/page.tsx (antes
// dessa extração, na versão Next.js) pro histórico dessa decisão.
const Tabs = lazy(() => import("@cloudscape-design/components/tabs"));
const MontarCesta = lazy(() => import("@/components/admin/MontarCesta"));
const GerenciarEstoque = lazy(() => import("@/components/admin/GerenciarEstoque"));
const Configuracoes = lazy(() => import("@/components/admin/Configuracoes"));

type AbaAtiva = "cesta" | "estoque" | "config";

interface PainelAdminProps {
  /** Chamado ao clicar em "Sair" — quem chama decide o que fazer com
   *  o estado de autenticação (ver components/cliente/PortaoAdmin.tsx). */
  onSair: () => void;
}

// ============================================================
// PainelAdmin — área da Elizete. Só existe depois que o PIN é
// verificado (ver PortaoAdmin.tsx). LojaProvider fica escopado aqui
// dentro (não mais em app/layout.tsx): é o único lugar que precisa de
// estado client com updates otimistas pra editar estoque/preço/cesta —
// a vitrine pública não depende mais dele (busca os produtos direto do
// backend/ via fetch no useEffect, ver src/pages/PaginaPrincipal.tsx).
// ============================================================
export default function PainelAdmin({ onSair }: PainelAdminProps) {
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("cesta");

  function sair() {
    localStorage.removeItem("comuna_admin_auth");
    onSair();
  }

  return (
    <LojaProvider>
      <div style={{ minHeight: "100vh", backgroundColor: colorBackgroundLayoutMain }}>
        <Header mostrarCarrinho={false} titulo="Painel Admin" />

        <main style={{ maxWidth: "48rem", margin: "0 auto", padding: `${spaceScaledXl} ${spaceScaledM}` }}>
          <SpaceBetween size="l">
            <Container>
              <div style={{ display: "flex", alignItems: "center", gap: spaceScaledS }}>
                <span style={{ fontSize: fontSizeHeadingXl }}>👩‍🌾</span>
                <div style={{ flex: 1 }}>
                  <Box fontWeight="bold">Olá, Elizete!</Box>
                  <Box color="text-body-secondary" fontSize="body-s">
                    Gerencie o estoque e monte as cestas da semana aqui.
                  </Box>
                </div>
                <Button onClick={sair} variant="link">
                  Sair
                </Button>
              </div>
            </Container>

            <Container disableContentPaddings>
              <Suspense fallback={<Box textAlign="center" padding="l">Carregando...</Box>}>
                <Tabs
                  activeTabId={abaAtiva}
                  onChange={({ detail }) => setAbaAtiva(detail.activeTabId as AbaAtiva)}
                  tabs={[
                    { id: "cesta", label: "🧺 Montar Cesta da Semana", content: <MontarCesta /> },
                    { id: "estoque", label: "📦 Gerenciar Estoque", content: <GerenciarEstoque /> },
                    { id: "config", label: "⚙️ Configurações", content: <Configuracoes /> },
                  ]}
                />
              </Suspense>
            </Container>
          </SpaceBetween>
        </main>
      </div>
    </LojaProvider>
  );
}
