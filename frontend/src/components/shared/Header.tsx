import { Link, useNavigate } from "react-router-dom";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import {
  colorBackgroundLayoutToggleSelectedDefault,
  colorTextLayoutToggleSelected,
  colorBackgroundNotificationRed,
  colorTextNotificationSeverityHigh,
  shadowContainerActive,
  spaceScaledXs,
  spaceScaledS,
  spaceScaledM,
  spaceScaledXxs,
  fontSizeBodyS,
  fontSizeBodyM,
  fontSizeHeadingM,
  spaceScaledL,
} from "@cloudscape-design/design-tokens";
import { useCarrinho } from "@/lib/carrinho-context";

interface HeaderProps {
  mostrarCarrinho?: boolean;
  titulo?: string;
  onAdminClick?: () => void;
}

// ============================================================
// Header — barra de topo fixa. Estrutura própria (não o
// TopNavigation do Cloudscape — seu slot model é pensado pro nav
// global do Console AWS e não encaixa direito num carrinho com
// contador numérico próprio), mas toda cor, espaçamento, sombra e
// tamanho de fonte vêm de @cloudscape-design/design-tokens — nada
// escolhido à mão. As únicas medidas literais que sobram são a
// largura máxima do cabeçalho (decisão de layout desta página, não
// um token de tema) e o tamanho dos emojis usados como ícone.
// ============================================================
export default function Header({
  mostrarCarrinho = true,
  titulo,
  onAdminClick,
}: HeaderProps) {
  const { totalItens } = useCarrinho();
  const navigate = useNavigate();

  return (
    <header
      style={{
        backgroundColor: colorBackgroundLayoutToggleSelectedDefault,
        color: colorTextLayoutToggleSelected,
        boxShadow: shadowContainerActive,
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: "56rem",
          margin: "0 auto",
          padding: `${spaceScaledS} ${spaceScaledM}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spaceScaledS,
        }}
      >
        {/* Logo e nome */}
        <Link
          to="/cliente"
          style={{ display: "flex", alignItems: "center", gap: spaceScaledXs, textDecoration: "none" }}
        >
          <span style={{ fontSize: fontSizeHeadingM }}>🌿</span>
          <Box color="inherit">
            <span
              style={{
                fontWeight: "bold",
                fontSize: fontSizeBodyM,
                lineHeight: 1.2,
                display: "block",
                color: colorTextLayoutToggleSelected,
              }}
            >
              COMUNA
            </span>
            <span
              style={{
                fontSize: fontSizeBodyS,
                lineHeight: 1.2,
                display: "block",
                color: colorTextLayoutToggleSelected,
                opacity: 0.8,
              }}
            >
              Cooperativa Orgânica Agroflorestal
            </span>
          </Box>
        </Link>

        {/* Título central (opcional — usado no painel admin) */}
        {titulo && (
          <span
            className="comuna-header-titulo"
            style={{ fontWeight: 600, fontSize: fontSizeBodyM, color: colorTextLayoutToggleSelected }}
          >
            {titulo}
          </span>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: spaceScaledXs }}>
          {/* Botão de acesso admin */}
          {onAdminClick && (
            <Button onClick={onAdminClick} variant="normal" ariaLabel="Área administrativa">
              Área da COMUNA
            </Button>
          )}

          {/* Ícone do carrinho — href pra ser um link de verdade
              (funciona com "abrir em nova aba", Ctrl+clique etc.) e
              onFollow pra navegar pelo react-router em vez de dar
              reload completo da página, igual o Link do logo acima. */}
          {mostrarCarrinho && (
            <span style={{ position: "relative", display: "inline-block" }}>
              <Button
                href="/carrinho"
                onFollow={(e) => {
                  e.preventDefault();
                  navigate("/carrinho");
                }}
                variant="normal"
                ariaLabel="Ver carrinho"
              >
                🛒
              </Button>
              {totalItens > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: `calc(-1 * ${spaceScaledXxs})`,
                    right: `calc(-1 * ${spaceScaledXxs})`,
                    backgroundColor: colorBackgroundNotificationRed,
                    color: colorTextNotificationSeverityHigh,
                    fontSize: fontSizeBodyS,
                    fontWeight: "bold",
                    width: spaceScaledL,
                    height: spaceScaledL,
                    borderRadius: "9999px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  {totalItens > 9 ? "9+" : totalItens}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
