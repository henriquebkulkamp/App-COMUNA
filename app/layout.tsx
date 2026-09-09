import type { Metadata } from "next";
// O CSS base do Cloudscape precisa carregar antes de qualquer CSS
// específico de componente — por isso vem primeiro que o globals.css.
import "@cloudscape-design/global-styles/index.css";
// Tema de marca (verde) — CSS gerado, ver o cabeçalho do arquivo pra
// como regerar. Carrega no <head> antes de qualquer paint (diferente
// de aplicar via JS num useEffect), então a página já nasce verde —
// sem o flash de azul-padrão-do-Cloudscape virando verde depois que
// o React hidrata.
import "./tema-marca.generated.css";
import "./globals.css";
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
        {/* LojaProvider não mora mais aqui — a vitrine pública busca os
            produtos no servidor (ver app/page.tsx); só o painel admin
            precisa dele agora, e fica escopado lá dentro
            (components/admin/PainelAdmin.tsx). */}
        {/* CarrinhoProvider fornece o estado do carrinho pra todo o app */}
        <CarrinhoProvider>{children}</CarrinhoProvider>
      </body>
    </html>
  );
}
