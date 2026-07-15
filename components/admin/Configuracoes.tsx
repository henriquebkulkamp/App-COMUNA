"use client";

import { useState } from "react";

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
    const res = await fetch("/api/admin/config", {
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

    // Aceita o número com ou sem formatação e mantém só os dígitos.
    // Analogia Python: re.sub(r"\D", "", numero)
    const apenasDigitos = novoWhatsapp.replace(/\D/g, "");
    const comDDI = apenasDigitos.startsWith("55") ? apenasDigitos : `55${apenasDigitos}`;

    if (!/^\d{12,13}$/.test(comDDI)) {
      setErroWhatsapp("Número inválido. Digite DDD + número, com 10 ou 11 dígitos (ex: 16999999999).");
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
    <div className="space-y-6">
      {/* ── Trocar PIN ──────────────────────────────────────── */}
      <form
        onSubmit={handleSalvarPin}
        className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3"
      >
        <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          🔒 Trocar PIN de acesso
        </p>
        <p className="text-xs text-gray-500">
          O PIN é usado para entrar nesta área administrativa. Use de 4 a 6 números.
        </p>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Novo PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={novoPin}
            onChange={(e) => setNovoPin(e.target.value.replace(/\D/g, ""))}
            placeholder="Ex: 123456"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-verde-300"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Confirmar novo PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmarPin}
            onChange={(e) => setConfirmarPin(e.target.value.replace(/\D/g, ""))}
            placeholder="Digite novamente"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-verde-300"
          />
        </div>

        {erroPin && <p className="text-xs text-red-500">{erroPin}</p>}
        {sucessoPin && <p className="text-xs text-verde-600">PIN atualizado com sucesso!</p>}

        <button
          type="submit"
          disabled={salvandoPin}
          className="w-full py-2 rounded-lg bg-verde-600 hover:bg-verde-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {salvandoPin ? "Salvando..." : "Salvar novo PIN"}
        </button>
      </form>

      {/* ── Trocar número de WhatsApp ──────────────────────── */}
      <form
        onSubmit={handleSalvarWhatsapp}
        className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3"
      >
        <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          📱 Trocar número de WhatsApp
        </p>
        <p className="text-xs text-gray-500">
          É para este número que as mensagens de pedido dos clientes são enviadas.
        </p>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Novo número (com DDD)</label>
          <input
            type="tel"
            value={novoWhatsapp}
            onChange={(e) => setNovoWhatsapp(e.target.value)}
            placeholder="Ex: (16) 99999-9999"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-verde-300"
          />
        </div>

        {erroWhatsapp && <p className="text-xs text-red-500">{erroWhatsapp}</p>}
        {sucessoWhatsapp && (
          <p className="text-xs text-verde-600">Número de WhatsApp atualizado com sucesso!</p>
        )}

        <button
          type="submit"
          disabled={salvandoWhatsapp}
          className="w-full py-2 rounded-lg bg-verde-600 hover:bg-verde-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {salvandoWhatsapp ? "Salvando..." : "Salvar novo número"}
        </button>
      </form>
    </div>
  );
}
