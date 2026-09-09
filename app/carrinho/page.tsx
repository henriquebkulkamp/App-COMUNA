"use client";

import Link from "next/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { spaceScaledM, spaceScaledXl } from "@cloudscape-design/design-tokens";
import Header from "@/components/shared/Header";
import Carrinho from "@/components/shared/Carrinho";

// Mesmo tom de fundo usado na página do cliente (app/page.tsx) — ver
// o comentário lá pra como esse valor foi escolhido.
const FUNDO_PAGINA = "#f0f0e8";

export default function PaginaCarrinho() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: FUNDO_PAGINA }}>
      <Header />

      <main
        style={{
          width: "80%",
          maxWidth: "1800px",
          margin: "0 auto",
          padding: `${spaceScaledXl} ${spaceScaledM}`,
        }}
      >
        <SpaceBetween size="l">
          <Link href="/">← Continuar comprando</Link>

          <Carrinho />
        </SpaceBetween>
      </main>
    </div>
  );
}
