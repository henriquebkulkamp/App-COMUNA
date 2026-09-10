"use client";

import { useState, useEffect, type ReactNode } from "react";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Modal from "@cloudscape-design/components/modal";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Header from "@/components/shared/Header";
import PainelAdmin from "@/components/admin/PainelAdmin";

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
  /** Vitrine pública já renderizada no servidor (ver app/page.tsx) —
   *  passada como children pra continuar sendo puro HTML/RSC, sem
   *  virar JS de cliente só por estar dentro de um "use client". Só é
   *  de fato mostrada quando NÃO autenticado como admin. */
  children: ReactNode;
}

// ============================================================
// PortaoAdmin — única parte da página que precisa saber se quem está
// vendo é a Elizete (admin) ou um cliente qualquer. Essa distinção só
// existe no navegador (depende de localStorage), por isso é o único
// pedaço "use client" no topo da árvore — tudo que ele recebe via
// `children` continua sendo Server Component puro.
// ============================================================
export default function PortaoAdmin({ children }: PortaoAdminProps) {
  const [mostrarLoginAdmin, setMostrarLoginAdmin] = useState(false);
  const [pinDigitado, setPinDigitado] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [verificandoPin, setVerificandoPin] = useState(false);
  const [erroPin, setErroPin] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("comuna_admin_auth") === "1") setAutenticado(true);
  }, []);

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

  if (autenticado) {
    return <PainelAdmin onSair={() => setAutenticado(false)} />;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: FUNDO_PAGINA }}>
      <Header onAdminClick={() => setMostrarLoginAdmin(true)} />

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

      {children}
    </div>
  );
}
