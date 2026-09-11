import { useState } from "react";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Alert from "@cloudscape-design/components/alert";
import Container from "@cloudscape-design/components/container";
import SpaceBetween from "@cloudscape-design/components/space-between";
import {
  colorBorderDividerDefault,
  spaceScaledS,
  spaceScaledXs,
} from "@cloudscape-design/design-tokens";
import { useCarrinho } from "@/lib/carrinho-context";
import { formatarPreco, precoEfetivo } from "@/lib/formatadores";
import CheckoutModal from "@/components/cliente/CheckoutModal";
import Preco from "@/components/design-system/moleculas/Preco";
import Icone from "@/icons/Icone";

// ============================================================
// Carrinho — vive na própria página (/carrinho, ver
// src/pages/PaginaCarrinho.tsx), então traz seu próprio título e moldura
// (Container + Box variant="h1"). Antes vivia dentro do Modal aberto
// pelo botão do carrinho no Header, que fornecia título e moldura de fora.
// ============================================================
export default function Carrinho() {
  const { itens, totalItens, totalPreco, aumentar, diminuir, remover } = useCarrinho();
  const [checkoutAberto, setCheckoutAberto] = useState(false);

  return (
    <Container>
      <Box variant="h1" padding={{ bottom: "m" }}>
        <SpaceBetween direction="horizontal" size="xs" alignItems="center">
          <Icone nome="carrinho" tamanho={24} /><span>Seu Carrinho{totalItens > 0 ? ` (${totalItens})` : ""}</span>
        </SpaceBetween>
      </Box>

      {itens.length === 0 ? (
        <Box textAlign="center" color="text-body-secondary" padding="l">
          <Box padding={{ bottom: "xs" }}>
            <Icone nome="muda" tamanho={40} />
          </Box>
          Seu carrinho está vazio.
        </Box>
      ) : (
        <SpaceBetween size="m">
          {/* Lista de itens */}
          <SpaceBetween size="s">
            {itens.map((item) => (
              <div
                key={item.produto.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spaceScaledS,
                  paddingBottom: spaceScaledXs,
                  borderBottom: `1px solid ${colorBorderDividerDefault}`,
                }}
              >
                {/* Nome e preço unitário */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Box fontWeight="bold" fontSize="body-s">
                    {item.produto.nome}
                  </Box>
                  <Box color="text-body-secondary" fontSize="body-s">
                    {formatarPreco(precoEfetivo(item.produto))} / {item.produto.unidade}
                  </Box>
                </div>

                {/* Controle de quantidade */}
                <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                  <Button
                    onClick={() => diminuir(item.produto.id)}
                    ariaLabel="Diminuir quantidade"
                    iconSvg={<Icone nome="subtract-minus" tamanho={16} />}
                  />
                  <Box textAlign="center" fontWeight="bold" fontSize="body-s">
                    {item.quantidade}
                  </Box>
                  <Button
                    onClick={() => aumentar(item.produto.id)}
                    ariaLabel="Aumentar quantidade"
                    iconSvg={<Icone nome="add-plus" tamanho={16} />}
                  />
                </SpaceBetween>

                {/* Subtotal do item */}
                <div style={{ textAlign: "right", minWidth: 72 }}>
                  <Preco valor={precoEfetivo(item.produto) * item.quantidade} tamanho="pequeno" />
                  <Button
                    onClick={() => remover(item.produto.id)}
                    variant="inline-link"
                    ariaLabel="Remover item"
                  >
                    remover
                  </Button>
                </div>
              </div>
            ))}
          </SpaceBetween>

          {/* Total */}
          <Box display="inline-block">
            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
              <Box fontWeight="bold">Total</Box>
              <Preco valor={totalPreco} tamanho="grande" />
            </SpaceBetween>
          </Box>

          {/* Aviso de disponibilidade — exigido pelo documento de requisitos */}
          <Alert type="warning">
            A disponibilidade final dos produtos avulsos está sujeita a
            confirmação no momento da separação do pedido.
          </Alert>

          {/* Botão de checkout */}
          <Button onClick={() => setCheckoutAberto(true)} variant="primary" fullWidth>
            Finalizar Pedido via WhatsApp
          </Button>
        </SpaceBetween>
      )}

      {/* Modal de checkout (abre quando clicar em finalizar) */}
      {checkoutAberto && <CheckoutModal onFechar={() => setCheckoutAberto(false)} />}
    </Container>
  );
}
