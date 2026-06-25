"use client";

import { useLoja } from "@/lib/loja-context";
import { useCarrinho } from "@/lib/carrinho-context";

function formatarPreco(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ============================================================
// CestaDaSemana — Seção que mostra as cestas montadas pela Elizete
//
// A lógica aqui é:
// 1. Do contexto da Loja, pegamos todos os produtos com
//    naCestaGrande === true ou naCestaPequena === true
// 2. Mostramos esses itens como uma lista estática (o cliente
//    NÃO escolhe — a cesta é fechada)
// 3. O cliente pode adicionar a cesta ao carrinho como um item único
//
// Analogia de tabela relacional:
//   SELECT nome FROM produtos WHERE na_cesta_grande = true
// ============================================================
export default function CestaDaSemana() {
  const { itenscestaGrande, itensCestaPequena, estado } = useLoja();
  const { adicionar, estaNoCarrinho } = useCarrinho();

  const cestaGrande = estado.produtos.find((p) => p.id === "cesta-grande")!;
  const cestaPequena = estado.produtos.find((p) => p.id === "cesta-pequena")!;

  const temCestaGrande = itenscestaGrande.length > 0;
  const temCestaPequena = itensCestaPequena.length > 0;

  if (!temCestaGrande && !temCestaPequena) {
    return (
      <section className="bg-white rounded-2xl shadow-sm border border-verde-100 p-5">
        <h2 className="text-xl font-bold text-verde-700 flex items-center gap-2 mb-3">
          <span>🧺</span> Cesta da Semana
        </h2>
        <div className="text-center py-6 text-gray-400">
          <span className="text-4xl block mb-2">🌱</span>
          <p className="text-sm">
            A cesta desta semana ainda não foi montada.
            <br />
            Volte em breve!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-verde-100 p-5">
      <h2 className="text-xl font-bold text-verde-700 flex items-center gap-2 mb-1">
        <span>🧺</span> Cesta da Semana
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Selecionada com carinho pela COMUNA. A composição pode variar conforme a
        oferta dos produtores.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* ── Cesta Grande ─────────────────────────── */}
        {temCestaGrande && (
          <div className="border border-verde-200 rounded-xl p-4 bg-verde-50 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-verde-800 text-base">
                🧺 Cesta Grande
              </h3>
              <span className="text-verde-700 font-bold text-lg">
                {formatarPreco(cestaGrande.preco)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-verde-600">
                {itenscestaGrande.length}{" "}
                {itenscestaGrande.length === 1 ? "item" : "itens"} nesta semana
              </p>
              {cestaGrande?.quantidade !== undefined && cestaGrande.quantidade > 0 && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  cestaGrande.quantidade <= 5
                    ? "bg-amber-100 text-amber-700"
                    : "bg-verde-200 text-verde-700"
                }`}>
                  {cestaGrande.quantidade <= 5
                    ? `Últimas ${cestaGrande.quantidade}`
                    : `${cestaGrande.quantidade} disponíveis`}
                </span>
              )}
            </div>
            {/* Lista de itens da cesta — NÃO é selecionável */}
            <ul className="space-y-1">
              {itenscestaGrande.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-verde-500 flex-shrink-0" />
                  <span className="text-gray-700">{item.nome}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => adicionar(cestaGrande)}
              disabled={estaNoCarrinho(cestaGrande.id)}
              className={`w-full mt-auto py-2 rounded-lg font-semibold text-sm transition-colors ${
                estaNoCarrinho(cestaGrande.id)
                  ? "bg-verde-200 text-verde-600 cursor-default"
                  : "bg-verde-600 hover:bg-verde-700 text-white active:scale-95"
              }`}
            >
              {estaNoCarrinho(cestaGrande.id)
                ? "✓ Adicionada ao carrinho"
                : "Quero a Cesta Grande"}
            </button>
          </div>
        )}

        {/* ── Cesta Pequena ────────────────────────── */}
        {temCestaPequena && (
          <div className="border border-terra-200 rounded-xl p-4 bg-terra-50 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-terra-800 text-base">
                🧺 Cesta Pequena
              </h3>
              <span className="text-terra-700 font-bold text-lg">
                {formatarPreco(cestaPequena.preco)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-terra-600">
                {itensCestaPequena.length}{" "}
                {itensCestaPequena.length === 1 ? "item" : "itens"} nesta semana
              </p>
              {cestaPequena?.quantidade !== undefined && cestaPequena.quantidade > 0 && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  cestaPequena.quantidade <= 5
                    ? "bg-amber-100 text-amber-700"
                    : "bg-terra-100 text-terra-600"
                }`}>
                  {cestaPequena.quantidade <= 5
                    ? `Últimas ${cestaPequena.quantidade}`
                    : `${cestaPequena.quantidade} disponíveis`}
                </span>
              )}
            </div>
            <ul className="space-y-1">
              {itensCestaPequena.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-terra-400 flex-shrink-0" />
                  <span className="text-gray-700">{item.nome}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => adicionar(cestaPequena)}
              disabled={estaNoCarrinho(cestaPequena.id)}
              className={`w-full mt-auto py-2 rounded-lg font-semibold text-sm transition-colors ${
                estaNoCarrinho(cestaPequena.id)
                  ? "bg-terra-200 text-terra-600 cursor-default"
                  : "bg-terra-500 hover:bg-terra-600 text-white active:scale-95"
              }`}
            >
              {estaNoCarrinho(cestaPequena.id)
                ? "✓ Adicionada ao carrinho"
                : "Quero a Cesta Pequena"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
