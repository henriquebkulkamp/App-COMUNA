import { useState } from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";
import FormField from "@cloudscape-design/components/form-field";
import Icon from "@cloudscape-design/components/icon";
import Input from "@cloudscape-design/components/input";
import Button from "@cloudscape-design/components/button";
import Alert from "@cloudscape-design/components/alert";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { apiFetch } from "@/lib/api";

// ============================================================
// Configuracoes — Painel para Elizete trocar o número de WhatsApp
// que recebe as mensagens de pedido.
//
// O PIN único que existia aqui foi substituído por login por conta
// (email + senha, ver PortaoAdmin.tsx) — trocar a senha da conta
// admin ainda não tem tela própria, então por ora só o campo do
// WhatsApp fica aqui.
// ============================================================
export default function Configuracoes() {
  const [novoWhatsapp, setNovoWhatsapp] = useState("");
  const [salvandoWhatsapp, setSalvandoWhatsapp] = useState(false);
  const [erroWhatsapp, setErroWhatsapp] = useState("");
  const [sucessoWhatsapp, setSucessoWhatsapp] = useState(false);

  async function salvarConfig(campo: "whatsappNumero", valor: string) {
    const res = await apiFetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campo, valor }),
    });
    const dados = await res.json();
    if (!res.ok) throw new Error(dados.erro || "Erro ao salvar");
  }

  async function handleSalvarWhatsapp(e: React.FormEvent) {
    e.preventDefault();
    setErroWhatsapp("");
    setSucessoWhatsapp(false);

    const apenasDigitos = novoWhatsapp.replace(/\D/g, "");
    const comDDI = apenasDigitos.startsWith("55") ? apenasDigitos : `55${apenasDigitos}`;

    if (!/^\d{12,13}$/.test(comDDI)) {
      setErroWhatsapp(
        "Número inválido. Digite DDD + número, com 10 ou 11 dígitos (ex: 16999999999)."
      );
      return;
    }

    setSalvandoWhatsapp(true);
    try {
      await salvarConfig("whatsappNumero", comDDI);
      setSucessoWhatsapp(true);
      setNovoWhatsapp("");
    } catch (erro) {
      setErroWhatsapp(erro instanceof Error ? erro.message : "Erro ao salvar o número.");
    } finally {
      setSalvandoWhatsapp(false);
    }
  }

  return (
    <SpaceBetween size="l">
      {/* ── Trocar número de WhatsApp ──────────────────────── */}
      <Container
        header={
          <Header variant="h3">
            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
              <Icon name="call" /> Trocar número de WhatsApp
            </SpaceBetween>
          </Header>
        }
      >
        <form onSubmit={handleSalvarWhatsapp}>
          <SpaceBetween size="s">
            <Box color="text-body-secondary" fontSize="body-s">
              É para este número que as mensagens de pedido dos clientes são enviadas.
            </Box>
            <FormField label="Novo número (com DDD)">
              <Input
                inputMode="tel"
                value={novoWhatsapp}
                onChange={({ detail }) => setNovoWhatsapp(detail.value)}
                placeholder="Ex: (16) 99999-9999"
              />
            </FormField>
            {erroWhatsapp && <Alert type="error">{erroWhatsapp}</Alert>}
            {sucessoWhatsapp && (
              <Alert type="success">Número de WhatsApp atualizado com sucesso!</Alert>
            )}
            <Button variant="primary" fullWidth loading={salvandoWhatsapp} formAction="submit">
              {salvandoWhatsapp ? "Salvando..." : "Salvar novo número"}
            </Button>
          </SpaceBetween>
        </form>
      </Container>
    </SpaceBetween>
  );
}
