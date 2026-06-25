"use client";

import Link from "next/link";
import { useCarrinho } from "@/lib/carrinho-context";

interface HeaderProps {
  mostrarCarrinho?: boolean;
  titulo?: string;
  onAdminClick?: () => void;
}

export default function Header({
  mostrarCarrinho = true,
  titulo,
  onAdminClick,
}: HeaderProps) {
  const { totalItens } = useCarrinho();

  return (
    <header className="bg-verde-700 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo e nome */}
        <Link href="/cliente" className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <div>
            <span className="font-bold text-lg leading-tight block">COMUNA</span>
            <span className="text-verde-200 text-xs leading-tight block">
              Cooperativa Orgânica Agroflorestal
            </span>
          </div>
        </Link>

        {/* Título central (opcional — usado no painel admin) */}
        {titulo && (
          <span className="font-semibold text-verde-100 text-sm hidden sm:block">
            {titulo}
          </span>
        )}

        {/* Botão de acesso admin */}
        {onAdminClick && (
          <button
            onClick={onAdminClick}
            className="text-verde-100 hover:text-white border border-verde-500 hover:border-verde-300 transition-colors px-3 py-1.5 rounded-lg text-xs font-semibold"
            aria-label="Área administrativa"
          >
            Área da COMUNA
          </button>
        )}

        {/* Ícone do carrinho */}
        {mostrarCarrinho && (
          <button
            onClick={() => {
              // Scroll suave até o carrinho — acessível por âncora
              document
                .getElementById("carrinho-section")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="relative bg-verde-600 hover:bg-verde-500 transition-colors p-2 rounded-xl"
            aria-label="Ver carrinho"
          >
            <span className="text-xl">🛒</span>
            {totalItens > 0 && (
              <span className="absolute -top-1 -right-1 bg-terra-400 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {totalItens > 9 ? "9+" : totalItens}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
