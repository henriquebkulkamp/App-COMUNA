import type { Metadata } from "next";
// O CSS base do Cloudscape precisa carregar antes de qualquer CSS
// específico de componente — por isso vem primeiro que o globals.css.
import "@cloudscape-design/global-styles/index.css";
import "./globals.css";
import { LojaProvider } from "@/lib/loja-context";
import { CarrinhoProvider } from "@/lib/carrinho-context";
import CloudscapeThemeInit from "@/components/shared/CloudscapeThemeInit";

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
  // suppressHydrationWarning: algumas extensões de navegador injetam
  // atributos/classes na tag <html> (ex: "no-touch") antes do React
  // hidratar. Isso não é bug do app — só silencia esse aviso específico
  // de mismatch na própria tag <html>, sem afetar o resto da árvore.
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <CloudscapeThemeInit />
        {/* LojaProvider fornece o estado do estoque para todo o app */}
        <LojaProvider>
          {/* CarrinhoProvider fornece o estado do carrinho */}
          <CarrinhoProvider>{children}</CarrinhoProvider>
        </LojaProvider>
      </body>
    </html>
  );
}
