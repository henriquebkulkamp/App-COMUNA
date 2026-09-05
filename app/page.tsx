"use client";

import { useState, useEffect } from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@/components/shared/Header";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Modal from "@cloudscape-design/components/modal";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Tabs from "@cloudscape-design/components/tabs";
import SpaceBetween from "@cloudscape-design/components/space-between";
import {
  colorBackgroundLayoutMain,
  spaceScaledS,
  spaceScaledM,
  spaceScaledXl,
  fontSizeHeadingXl,
} from "@cloudscape-design/design-tokens";
import CestaDaSemana from "@/components/cliente/CestaDaSemana";
import ProdutosDestaque from "@/components/cliente/ProdutosDestaque";
import ProdutosAvulsos from "@/components/cliente/ProdutosAvulsos";
import Carrinho from "@/components/shared/Carrinho";
import MontarCesta from "@/components/admin/MontarCesta";
import GerenciarEstoque from "@/components/admin/GerenciarEstoque";
import Configuracoes from "@/components/admin/Configuracoes";
import { useCarrinho } from "@/lib/carrinho-context";

type AbaAtiva = "cesta" | "estoque" | "config";

export default function PaginaPrincipal() {
  const [mostrarLoginAdmin, setMostrarLoginAdmin] = useState(false);
  const [pinDigitado, setPinDigitado] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [verificandoPin, setVerificandoPin] = useState(false);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const { totalItens } = useCarrinho();

  useEffect(() => {
    if (localStorage.getItem("comuna_admin_auth") === "1") setAutenticado(true);
  }, []);
  const [erroPin, setErroPin] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("cesta");

  // Verifica o PIN no servidor — o valor correto nunca fica no código do cliente.
  async function verificarPin(e: React.FormEvent) {
    e.preventDefault();
    setVerificandoPin(true);
    setErroPin(false);
    try {
      const res = await fetch("/api/admin/verificar-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinDigitado }),
      });
      const dados = await res.json();
      if (dados.valido) {
        localStorage.setItem("comuna_admin_auth", "1");
        setAutenticado(true);
        setMostrarLoginAdmin(false);
        setPinDigitado("");
      } else {
        setErroPin(true);
        setPinDigitado("");
      }
    } catch {
      setErroPin(true);
      setPinDigitado("");
    } finally {
      setVerificandoPin(false);
    }
  }

  function fecharModal() {
    setMostrarLoginAdmin(false);
    setErroPin(false);
    setPinDigitado("");
  }

  function sair() {
    localStorage.removeItem("comuna_admin_auth");
    setAutenticado(false);
  }

  // ── Modo Admin ──────────────────────────────────────────────
  if (autenticado) {
    return (
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
    );
  }

  // ── Modo Cliente ────────────────────────────────────────────
  // Fundo da página com um amarelo bem sutil — os Containers continuam
  // brancos por cima, sem degradê, uma cor sólida de cada lado.
  //
  // Um pouco mais escuro que o token `colorBackgroundStatusWarning`
  // dos Alerts (#fffef0), pra contrastar mais com o branco dos
  // Containers — mas sem pular pro próximo degrau da paleta do
  // Cloudscape (`color-warning-100`, #fffbbd), que é bem mais
  // saturado. Mesmo tom, só um pouco mais escuro.
  const FUNDO_PAGINA = "#f0f0e8";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: FUNDO_PAGINA }}>
      <Header
        onAdminClick={() => setMostrarLoginAdmin(true)}
        onCarrinhoClick={() => setCarrinhoAberto(true)}
      />

      {/* Modal de login admin */}
      <Modal visible={mostrarLoginAdmin} onDismiss={fecharModal} header="🔒 Área Restrita" size="small">
        <SpaceBetween size="m">
          <Box color="text-body-secondary" textAlign="center">
            Painel da Elizete — COMUNA
          </Box>
          <form onSubmit={verificarPin}>
            <SpaceBetween size="m">
              <FormField errorText={erroPin ? "PIN incorreto. Tente novamente." : undefined}>
                <Input
                  type="password"
                  value={pinDigitado}
                  onChange={({ detail }) => setPinDigitado(detail.value)}
                  placeholder="Digite o PIN"
                  autoFocus
                />
              </FormField>
              <Button variant="primary" fullWidth loading={verificandoPin} formAction="submit">
                {verificandoPin ? "Verificando..." : "Entrar"}
              </Button>
              <Button variant="link" fullWidth formAction="none" onClick={fecharModal}>
                Cancelar
              </Button>
            </SpaceBetween>
          </form>
        </SpaceBetween>
      </Modal>

      {/* Painel do carrinho — abre ao clicar no ícone 🛒 do Header, não
          fica mais fixo na tela (por isso o conteúdo abaixo pode usar
          quase toda a largura). */}
      <Modal
        visible={carrinhoAberto}
        onDismiss={() => setCarrinhoAberto(false)}
        header={`🛒 Seu Carrinho${totalItens > 0 ? ` (${totalItens})` : ""}`}
        size="medium"
      >
        <Carrinho />
      </Modal>

      {/* Sem coluna reservada pro carrinho — o conteúdo ocupa a maior
          parte da largura da tela (~80%, com um teto pra não esticar
          demais em monitores ultra-wide). */}
      <main style={{ width: "80%", maxWidth: "1800px", margin: "0 auto", padding: `${spaceScaledXl} ${spaceScaledM}` }}>
        <SpaceBetween size="l">
          {/* Espaço privilegiado: logo abaixo do header, antes de
              qualquer outra seção — é a primeira coisa que o cliente vê. */}
          <CestaDaSemana />

          <Container>
            <div style={{ display: "flex", alignItems: "flex-start", gap: spaceScaledS }}>
              <span style={{ fontSize: fontSizeHeadingXl }}>🌿</span>
              <div>
                <Box variant="h1">Bem-vindo à COMUNA</Box>
                <Box color="text-body-secondary">
                  Somos uma cooperativa orgânica agroflorestal que conecta agricultores
                  familiares e consumidores conscientes. Cada produto carrega o cuidado de
                  quem planta com amor e respeito à terra. Mais do que uma feira, somos um
                  projeto de vida — semeando alimento, saúde e comunidade.
                </Box>
              </div>
            </div>
          </Container>

          <ProdutosDestaque />
          <ProdutosAvulsos />
        </SpaceBetween>
      </main>

      <Box textAlign="center" color="text-body-secondary" padding={{ vertical: "l" }}>
        <p>🌱 COMUNA — Cooperativa Orgânica Agroflorestal</p>
        <p>Semeando amor e vida!</p>
      </Box>
    </div>
  );
}
