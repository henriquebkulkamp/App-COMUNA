import { Link } from "react-router-dom";
import Icon from "@cloudscape-design/components/icon";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { spaceScaledM, spaceScaledXl, spaceScaledXs } from "@cloudscape-design/design-tokens";
import Header from "@/components/shared/Header";
import Carrinho from "@/components/shared/Carrinho";

// Mesmo tom de fundo usado nas outras páginas do cliente (ver
// PaginaPrincipal.tsx, que replica o mesmo valor).
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
          <Link
            to="/"
            style={{ display: "inline-flex", alignItems: "center", gap: spaceScaledXs, textDecoration: "none" }}
          >
            <Icon name="arrow-left" /> Continuar comprando
          </Link>

          <Carrinho />
        </SpaceBetween>
      </main>
    </div>
  );
}
