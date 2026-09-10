import { useState } from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Button from "@cloudscape-design/components/button";
import Alert from "@cloudscape-design/components/alert";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { apiFetch } from "@/lib/api";

// ============================================================
// Configuracoes — Painel para Elizete trocar o PIN de acesso e o
// número de WhatsApp que recebe as mensagens de pedido.
//
// Ambos os campos são salvos na aba "Configurações" da planilha.
// Analogia Python: dois formulários independentes, cada um faz seu
// próprio PATCH /api/admin/config com {"campo": ..., "valor": ...}
// ============================================================
export default function Configuracoes() {
  const [novoPin, setNovoPin] = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");
  const [salvandoPin, setSalvandoPin] = useState(false);
  const [erroPin, setErroPin] = useState("");
  const [sucessoPin, setSucessoPin] = useState(false);

  const [novoWhatsapp, setNovoWhatsapp] = useState("");
  const [salvandoWhatsapp, setSalvandoWhatsapp] = useState(false);
  const [erroWhatsapp, setErroWhatsapp] = useState("");
  const [sucessoWhatsapp, setSucessoWhatsapp] = useState(false);

  async function salvarConfig(campo: "pin" | "whatsappNumero", valor: string) {
    const res = await apiFetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campo, valor }),
    });
    const dados = await res.json();
    if (!res.ok) throw new Error(dados.erro || "Erro ao salvar");
  }

  async function handleSalvarPin(e: React.FormEvent) {
    e.preventDefault();
    setErroPin("");
    setSucessoPin(false);

    if (!/^\d{4,6}$/.test(novoPin)) {
      setErroPin("O PIN deve ter entre 4 e 6 dígitos numéricos.");
      return;
    }
    if (novoPin !== confirmarPin) {
      setErroPin("Os dois PINs digitados não são iguais.");
      return;
    }

    setSalvandoPin(true);
    try {
      await salvarConfig("pin", novoPin);
      setSucessoPin(true);
      setNovoPin("");
      setConfirmarPin("");
    } catch (erro) {
      setErroPin(erro instanceof Error ? erro.message : "Erro ao salvar o PIN.");
    } finally {
      setSalvandoPin(false);
    }
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
      {/* ── Trocar PIN ──────────────────────────────────────── */}
      <Container header={<Header variant="h3">🔒 Trocar PIN de acesso</Header>}>
        <form onSubmit={handleSalvarPin}>
          <SpaceBetween size="s">
            <Box color="text-body-secondary" fontSize="body-s">
              O PIN é usado para entrar nesta área administrativa. Use de 4 a 6 números.
            </Box>
            <FormField label="Novo PIN">
              <Input
                type="password"
                inputMode="numeric"
                value={novoPin}
                onChange={({ detail }) => setNovoPin(detail.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Ex: 123456"
              />
            </FormField>
            <FormField label="Confirmar novo PIN">
              <Input
                type="password"
                inputMode="numeric"
                value={confirmarPin}
                onChange={({ detail }) =>
                  setConfirmarPin(detail.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Digite novamente"
              />
            </FormField>
            {erroPin && <Alert type="error">{erroPin}</Alert>}
            {sucessoPin && <Alert type="success">PIN atualizado com sucesso!</Alert>}
            <Button variant="primary" fullWidth loading={salvandoPin} formAction="submit">
              {salvandoPin ? "Salvando..." : "Salvar novo PIN"}
            </Button>
          </SpaceBetween>
        </form>
      </Container>

      {/* ── Trocar número de WhatsApp ──────────────────────── */}
      <Container header={<Header variant="h3">📱 Trocar número de WhatsApp</Header>}>
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
