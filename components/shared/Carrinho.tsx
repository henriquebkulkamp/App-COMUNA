"use client";

import { useState } from "react";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Alert from "@cloudscape-design/components/alert";
import SpaceBetween from "@cloudscape-design/components/space-between";
import {
  colorBorderDividerDefault,
  spaceScaledS,
  spaceScaledXs,
} from "@cloudscape-design/design-tokens";
import { useCarrinho } from "@/lib/carrinho-context";
import { precoEfetivo } from "@/lib/formatadores";
import CheckoutModal from "@/components/cliente/CheckoutModal";

function formatarPreco(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// ============================================================
// Carrinho — só o conteúdo, sem moldura/header próprios: quem chama
// (o Modal aberto pelo ícone 🛒 do Header, ver app/page.tsx) já
// fornece o título e a moldura.
// ============================================================
export default function Carrinho() {
  const { itens, totalPreco, aumentar, diminuir, remover } = useCarrinho();
  const [checkoutAberto, setCheckoutAberto] = useState(false);

  return (
    <>
      {itens.length === 0 ? (
        <Box textAlign="center" color="text-body-secondary" padding="l">
          <Box fontSize="display-l">🌱</Box>
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
                    iconName="subtract-minus"
                  />
                  <Box textAlign="center" fontWeight="bold" fontSize="body-s">
                    {item.quantidade}
                  </Box>
                  <Button
                    onClick={() => aumentar(item.produto.id)}
                    ariaLabel="Aumentar quantidade"
                    iconName="add-plus"
                  />
                </SpaceBetween>

                {/* Subtotal do item */}
                <div style={{ textAlign: "right", minWidth: 72 }}>
                  <Box fontWeight="bold" color="text-status-success" fontSize="body-s">
                    {formatarPreco(precoEfetivo(item.produto) * item.quantidade)}
                  </Box>
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
              <Box fontWeight="bold" fontSize="heading-m" color="text-status-success">
                {formatarPreco(totalPreco)}
              </Box>
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
    </>
  );
}
