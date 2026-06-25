"use client";

import { useState, useEffect } from "react";
import Header from "@/components/shared/Header";
import CestaDaSemana from "@/components/cliente/CestaDaSemana";
import ProdutosAvulsos from "@/components/cliente/ProdutosAvulsos";
import Carrinho from "@/components/shared/Carrinho";
import MontarCesta from "@/components/admin/MontarCesta";
import GerenciarEstoque from "@/components/admin/GerenciarEstoque";

const PIN_ADMIN = "1234";
type AbaAtiva = "cesta" | "estoque";

export default function PaginaPrincipal() {
  const [mostrarLoginAdmin, setMostrarLoginAdmin] = useState(false);
  const [pinDigitado, setPinDigitado] = useState("");
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("comuna_admin_auth") === "1") setAutenticado(true);
  }, []);
  const [erroPin, setErroPin] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("cesta");

  function verificarPin(e: React.FormEvent) {
    e.preventDefault();
    if (pinDigitado === PIN_ADMIN) {
      localStorage.setItem("comuna_admin_auth", "1");
      setAutenticado(true);
      setMostrarLoginAdmin(false);
      setErroPin(false);
      setPinDigitado("");
    } else {
      setErroPin(true);
      setPinDigitado("");
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
      <div className="min-h-screen bg-creme">
        <Header mostrarCarrinho={false} titulo="Painel Admin" />

        <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <div className="bg-verde-700 text-white rounded-2xl p-4 flex items-center gap-3">
            <span className="text-3xl">👩‍🌾</span>
            <div>
              <p className="font-bold">Olá, Elizete!</p>
              <p className="text-verde-200 text-sm">
                Gerencie o estoque e monte as cestas da semana aqui.
              </p>
            </div>
            <button
              onClick={sair}
              className="ml-auto text-verde-300 hover:text-white text-xs"
            >
              Sair
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-verde-100 overflow-hidden">
            <div className="grid grid-cols-2 border-b border-gray-100">
              <button
                onClick={() => setAbaAtiva("cesta")}
                className={`py-4 text-sm font-semibold transition-colors ${
                  abaAtiva === "cesta"
                    ? "text-verde-700 border-b-2 border-verde-600 bg-verde-50"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                🧺 Montar Cesta da Semana
              </button>
              <button
                onClick={() => setAbaAtiva("estoque")}
                className={`py-4 text-sm font-semibold transition-colors ${
                  abaAtiva === "estoque"
                    ? "text-verde-700 border-b-2 border-verde-600 bg-verde-50"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                📦 Gerenciar Estoque
              </button>
            </div>
            <div className="p-4">
              {abaAtiva === "cesta" ? <MontarCesta /> : <GerenciarEstoque />}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Modo Cliente ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-creme">
      <Header onAdminClick={() => setMostrarLoginAdmin(true)} />

      {/* Modal de login admin */}
      {mostrarLoginAdmin && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && fecharModal()}
        >
          <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-xs text-center">
            <span className="text-4xl block mb-3">🔒</span>
            <h2 className="font-bold text-verde-700 text-xl mb-1">
              Área Restrita
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Painel da Elizete — COMUNA
            </p>

            <form onSubmit={verificarPin} className="space-y-4">
              <input
                type="password"
                value={pinDigitado}
                onChange={(e) => setPinDigitado(e.target.value)}
                placeholder="Digite o PIN"
                maxLength={6}
                autoFocus
                className={`w-full border rounded-xl px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 ${
                  erroPin
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-200 focus:ring-verde-300"
                }`}
              />
              {erroPin && (
                <p className="text-red-500 text-sm">
                  PIN incorreto. Tente novamente.
                </p>
              )}
              <button type="submit" className="w-full btn-primary">
                Entrar
              </button>
              <button
                type="button"
                onClick={fecharModal}
                className="w-full text-sm text-gray-400 hover:text-gray-600"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-6">
            <section className="bg-verde-700 text-white rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-3xl">🌿</span>
                <div>
                  <h1 className="font-bold text-xl mb-1">
                    Bem-vindo à COMUNA
                  </h1>
                  <p className="text-verde-100 text-sm leading-relaxed">
                    Somos uma cooperativa orgânica agroflorestal que conecta
                    agricultores familiares e consumidores conscientes. Cada
                    produto carrega o cuidado de quem planta com amor e
                    respeito à terra. Mais do que uma feira, somos um projeto
                    de vida — semeando alimento, saúde e comunidade.
                  </p>
                </div>
              </div>
            </section>

            <CestaDaSemana />
            <ProdutosAvulsos />
          </div>

          <aside className="lg:sticky lg:top-20 lg:h-fit">
            <Carrinho />
          </aside>
        </div>
      </main>

      <footer className="mt-12 py-6 text-center text-sm text-gray-400 border-t border-gray-200">
        <p>🌱 COMUNA — Cooperativa Orgânica Agroflorestal</p>
        <p className="mt-1">Semeando amor e vida!</p>
      </footer>
    </div>
  );
}
