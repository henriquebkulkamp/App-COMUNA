"use client";

import { useState } from "react";
import { useCarrinho } from "@/lib/carrinho-context";
import { useLoja } from "@/lib/loja-context";
import { WHATSAPP_NUMERO, ENDERECO_RETIRADA } from "@/lib/dados";
import type { DadosCliente } from "@/lib/types";

interface CheckoutModalProps {
  onFechar: () => void;
}

function formatarPreco(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ============================================================
// CheckoutModal — Modal de finalização do pedido
//
// Fluxo:
// 1. Cliente preenche nome, celular, tipo de entrega
// 2. Clica em "Enviar Pedido"
// 3. App monta a mensagem e abre o WhatsApp
//
// A mensagem do WhatsApp é construída como uma string formatada.
// Analogia Python: f"""...""" com .join() para a lista de itens
// ============================================================
export default function CheckoutModal({ onFechar }: CheckoutModalProps) {
  const { itens, totalPreco, limpar } = useCarrinho();
  const { atualizarQuantidade } = useLoja();
  const [dados, setDados] = useState<DadosCliente>({
    nome: "",
    celular: "",
    tipoEntrega: "retirada",
    enderecoEntrega: "",
    produtosSolicitados: "",
    observacoes: "",
  });
  const [etapa, setEtapa] = useState<"formulario" | "confirmacao">(
    "formulario"
  );
  const [salvandoPedido, setSalvandoPedido] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dados.nome.trim() || !dados.celular.trim()) return;
    if (dados.tipoEntrega === "entrega" && !dados.enderecoEntrega?.trim())
      return;
    setEtapa("confirmacao");
  }

  // Grava o pedido na planilha do Google Sheets e depois abre o WhatsApp.
  // É assíncrona porque precisamos aguardar a resposta da API.
  // Analogia Python: async def enviar_whatsapp(): await salvar_pedido(); abrir_wpp()
  async function enviarWhatsApp() {
    setSalvandoPedido(true);

    // Monta a mensagem linha a linha
    // Analogia Python: '\n'.join([linha1, linha2, ...])
    const linhasItens = itens
      .map(
        (item) =>
          `• ${item.quantidade}x ${item.produto.nome} (${item.produto.unidade}) — ${formatarPreco(item.produto.preco * item.quantidade)}`
      )
      .join("\n");

    const entregaTexto =
      dados.tipoEntrega === "retirada"
        ? `Retirada em: ${ENDERECO_RETIRADA}`
        : `Entrega no endereço: ${dados.enderecoEntrega}`;

    const observacoesTexto = dados.observacoes
      ? `\n📝 Observações: ${dados.observacoes}`
      : "";

    const solicitacoesTexto = dados.produtosSolicitados
      ? `\n\n🛍️ *Produtos Solicitados:*\n${dados.produtosSolicitados}`
      : "";

    // ── Grava na planilha do Google Sheets ───────────────────
    // Se a API falhar, o pedido ainda segue via WhatsApp normalmente.
    // Analogia Python: try: salvar_pedido() except Exception: pass
    try {
      await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeCliente: dados.nome,
          celular: dados.celular,
          tipoEntrega: dados.tipoEntrega,
          enderecoEntrega: dados.enderecoEntrega,
          produtosSolicitados: dados.produtosSolicitados,
          observacoes: dados.observacoes,
          totalPreco,
          itens, // array de ItemCarrinho — a API converte para texto legível
        }),
      });
    } catch (erro) {
      // Falha silenciosa: o WhatsApp ainda abre. Elizete vê o pedido lá.
      console.error("Falha ao gravar pedido na planilha:", erro);
    }

    // Desconta quantidades no contexto local para refletir na tela imediatamente
    itens.forEach((item) => {
      const novaQtd = Math.max(0, (item.produto.quantidade ?? 0) - item.quantidade);
      atualizarQuantidade(item.produto.id, novaQtd);
    });

    setSalvandoPedido(false);

    const mensagem = `🌿 *Novo Pedido — COMUNA*

👤 *Cliente:* ${dados.nome}
📱 *Celular:* ${dados.celular}
🚚 *${entregaTexto}*${observacoesTexto}

━━━━━━━━━━━━━━━━━━━━
🛒 *Itens do Pedido:*

${linhasItens}

━━━━━━━━━━━━━━━━━━━━
💰 *Total estimado: ${formatarPreco(totalPreco)}*${solicitacoesTexto}

⚠️ _Disponibilidade sujeita a confirmação no momento da separação._`;

    // encodeURIComponent é como urllib.parse.quote() em Python
    const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
    limpar();
    onFechar();
  }

  return (
    // Overlay escuro — clique fora fecha o modal
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header do modal */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-verde-700 text-lg">
            {etapa === "formulario" ? "Seus dados" : "Confirmar pedido"}
          </h2>
          <button
            onClick={onFechar}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* ── Etapa 1: Formulário ────────────────────── */}
        {etapa === "formulario" && (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome completo *
              </label>
              <input
                type="text"
                required
                value={dados.nome}
                onChange={(e) => setDados({ ...dados, nome: e.target.value })}
                placeholder="Seu nome"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-verde-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Celular / WhatsApp *
              </label>
              <input
                type="tel"
                required
                value={dados.celular}
                onChange={(e) =>
                  setDados({ ...dados, celular: e.target.value })
                }
                placeholder="(19) 99999-9999"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-verde-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Como prefere receber? *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                    dados.tipoEntrega === "retirada"
                      ? "border-verde-500 bg-verde-50"
                      : "border-gray-200 hover:border-verde-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoEntrega"
                    value="retirada"
                    checked={dados.tipoEntrega === "retirada"}
                    onChange={() =>
                      setDados({ ...dados, tipoEntrega: "retirada" })
                    }
                    className="accent-verde-600"
                  />
                  <div>
                    <p className="text-sm font-medium">🏠 Retirada</p>
                    <p className="text-xs text-gray-500">{ENDERECO_RETIRADA}</p>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                    dados.tipoEntrega === "entrega"
                      ? "border-verde-500 bg-verde-50"
                      : "border-gray-200 hover:border-verde-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoEntrega"
                    value="entrega"
                    checked={dados.tipoEntrega === "entrega"}
                    onChange={() =>
                      setDados({ ...dados, tipoEntrega: "entrega" })
                    }
                    className="accent-verde-600"
                  />
                  <div>
                    <p className="text-sm font-medium">🚚 Entrega</p>
                    <p className="text-xs text-gray-500">Via COMUNA</p>
                  </div>
                </label>
              </div>
            </div>

            {dados.tipoEntrega === "entrega" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço de entrega *
                </label>
                <textarea
                  required
                  value={dados.enderecoEntrega}
                  onChange={(e) =>
                    setDados({ ...dados, enderecoEntrega: e.target.value })
                  }
                  placeholder="Rua, número, bairro, cidade..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-verde-300 resize-none"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gostaria de algum produto que não encontrou?
              </label>
              <textarea
                value={dados.produtosSolicitados}
                onChange={(e) =>
                  setDados({ ...dados, produtosSolicitados: e.target.value })
                }
                placeholder="Insira o nome de algum produto que não encontrou"
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-verde-300 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações (opcional)
              </label>
              <textarea
                value={dados.observacoes}
                onChange={(e) =>
                  setDados({ ...dados, observacoes: e.target.value })
                }
                placeholder="Ex: Horário para entrega, Observação sobre o pedido"
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-verde-300 resize-none"
              />
            </div>

            <button type="submit" className="w-full btn-primary">
              Revisar Pedido →
            </button>
          </form>
        )}

        {/* ── Etapa 2: Confirmação ───────────────────── */}
        {etapa === "confirmacao" && (
          <div className="p-5 space-y-4">
            {/* Resumo do cliente */}
            <div className="bg-verde-50 rounded-xl p-3 text-sm space-y-1">
              <p>
                <span className="font-medium">👤</span> {dados.nome}
              </p>
              <p>
                <span className="font-medium">📱</span> {dados.celular}
              </p>
              <p>
                <span className="font-medium">
                  {dados.tipoEntrega === "retirada" ? "🏠" : "🚚"}
                </span>{" "}
                {dados.tipoEntrega === "retirada"
                  ? `Retirada — ${ENDERECO_RETIRADA}`
                  : `Entrega — ${dados.enderecoEntrega}`}
              </p>
            </div>

            {/* Lista de itens */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {itens.map((item) => (
                <div
                  key={item.produto.id}
                  className="flex justify-between text-sm"
                >
                  <span className="text-gray-700">
                    {item.quantidade}× {item.produto.nome}
                  </span>
                  <span className="font-medium text-verde-700">
                    {formatarPreco(item.produto.preco * item.quantidade)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total estimado</span>
              <span className="text-verde-700">{formatarPreco(totalPreco)}</span>
            </div>

            {/* Aviso de disponibilidade — obrigatório por requisito */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              ⚠️ <strong>Atenção:</strong> A disponibilidade final dos produtos
              avulsos está sujeita a confirmação no momento da separação do
              pedido. A COMUNA entrará em contato caso haja alguma alteração.
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEtapa("formulario")}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ← Voltar
              </button>
              <button
                onClick={enviarWhatsApp}
                disabled={salvandoPedido}
                className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>📲</span>
                {salvandoPedido ? "Registrando pedido..." : "Enviar via WhatsApp"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
