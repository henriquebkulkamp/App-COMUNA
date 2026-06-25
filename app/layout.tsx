import type { Metadata } from "next";
import "./globals.css";
import { LojaProvider } from "@/lib/loja-context";
import { CarrinhoProvider } from "@/lib/carrinho-context";

export const metadata: Metadata = {
  title: "COMUNA — Cooperativa Orgânica Agroflorestal",
  description:
    "Compre diretamente dos produtores. Cestas semanais e produtos avulsos orgânicos.",
};

// RootLayout é o "template HTML" que envolve todas as páginas.
// Analogia: é como um decorator Python que adiciona contexto a todas as funções.
// Os Providers aqui são como injetar dependências globais.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {/* LojaProvider fornece o estado do estoque para todo o app */}
        <LojaProvider>
          {/* CarrinhoProvider fornece o estado do carrinho */}
          <CarrinhoProvider>{children}</CarrinhoProvider>
        </LojaProvider>
      </body>
    </html>
  );
}
