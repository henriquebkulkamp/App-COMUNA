"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
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
// existem pra essas 3 telas — code-split (`ssr:false`) pra não entrar
// no bundle inicial de quem visita como cliente. Ver app/page.tsx (antes
// dessa extração) pro histórico dessa decisão.
const Tabs = dynamic(() => import("@cloudscape-design/components/tabs"), { ssr: false });
const MontarCesta = dynamic(() => import("@/components/admin/MontarCesta"), { ssr: false });
const GerenciarEstoque = dynamic(() => import("@/components/admin/GerenciarEstoque"), { ssr: false });
const Configuracoes = dynamic(() => import("@/components/admin/Configuracoes"), { ssr: false });

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
// a vitrine pública não depende mais dele (busca os dados no servidor).
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
              <Tabs
                activeTabId={abaAtiva}
                onChange={({ detail }) => setAbaAtiva(detail.activeTabId as AbaAtiva)}
                tabs={[
                  { id: "cesta", label: "🧺 Montar Cesta da Semana", content: <MontarCesta /> },
                  { id: "estoque", label: "📦 Gerenciar Estoque", content: <GerenciarEstoque /> },
                  { id: "config", label: "⚙️ Configurações", content: <Configuracoes /> },
                ]}
              />
            </Container>
          </SpaceBetween>
        </main>
      </div>
    </LojaProvider>
  );
}
