import { useState, useEffect } from "react";
import Modal from "@cloudscape-design/components/modal";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Textarea from "@cloudscape-design/components/textarea";
import RadioGroup from "@cloudscape-design/components/radio-group";
import Alert from "@cloudscape-design/components/alert";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Container from "@cloudscape-design/components/container";
import { useCarrinho } from "@/lib/carrinho-context";
import { WHATSAPP_NUMERO as WHATSAPP_NUMERO_PADRAO, ENDERECO_RETIRADA } from "@/lib/dados";
import { formatarPreco, precoEfetivo } from "@/lib/formatadores";
import Preco from "@/components/design-system/moleculas/Preco";
import type { DadosCliente } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import Icone from "@/icons/Icone";

interface CheckoutModalProps {
  onFechar: () => void;
}

// ============================================================
// CheckoutModal — Modal de finalização do pedido
//
// Fluxo:
// 1. Cliente preenche nome, celular, tipo de entrega
// 2. Clica em "Revisar Pedido"
// 3. Confirma e o app monta a mensagem e abre o WhatsApp
//
// Fica com estado manual de 2 passos (não o componente Wizard do
// Cloudscape) — pra um fluxo de só 2 etapas dentro de um Modal, um
// Wizard some com o header/footer do próprio Modal e adiciona mais
// integração do que resolve.
// ============================================================
export default function CheckoutModal({ onFechar }: CheckoutModalProps) {
  const { itens, totalPreco, limpar } = useCarrinho();
  const [dados, setDados] = useState<DadosCliente>({
    nome: "",
    celular: "",
    tipoEntrega: "retirada",
    enderecoEntrega: "",
    produtosSolicitados: "",
    observacoes: "",
  });
  const [etapa, setEtapa] = useState<"formulario" | "confirmacao">("formulario");
  const [salvandoPedido, setSalvandoPedido] = useState(false);
  const [whatsappNumero, setWhatsappNumero] = useState(WHATSAPP_NUMERO_PADRAO);

  useEffect(() => {
    apiFetch("/api/config")
      .then((res) => res.json())
      .then((dados) => {
        if (dados.whatsappNumero) setWhatsappNumero(dados.whatsappNumero);
      })
      .catch(() => {
        // Mantém o número padrão em caso de falha
      });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dados.nome.trim() || !dados.celular.trim()) return;
    if (dados.tipoEntrega === "entrega" && !dados.enderecoEntrega?.trim()) return;
    setEtapa("confirmacao");
  }

  async function enviarWhatsApp() {
    setSalvandoPedido(true);

    const linhasItens = itens
      .map(
        (item) =>
          `• ${item.quantidade}x ${item.produto.nome} (${item.produto.unidade}) — ${formatarPreco(precoEfetivo(item.produto) * item.quantidade)}`
      )
      .join("\n");

    const entregaTexto =
      dados.tipoEntrega === "retirada"
        ? `Retirada em: ${ENDERECO_RETIRADA}`
        : `Entrega no endereço: ${dados.enderecoEntrega}`;

    const observacoesTexto = dados.observacoes ? `\nObservações: ${dados.observacoes}` : "";

    const solicitacoesTexto = dados.produtosSolicitados
      ? `\n\n*Produtos Solicitados:*\n${dados.produtosSolicitados}`
      : "";

    try {
      await apiFetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeCliente: dados.nome,
          celular: dados.celular,
          tipoEntrega: dados.tipoEntrega,
          enderecoEntrega: dados.enderecoEntrega,
          produtosSolicitados: dados.produtosSolicitados,
          observacoes: dados.observacoes,
          totalPreco,
          itens,
        }),
      });
    } catch (erro) {
      console.error("Falha ao gravar pedido:", erro);
    }

    // (O desconto de estoque de verdade já aconteceu no backend, dentro
    // de POST /api/pedidos — crud.descontar_estoque() em backend/app/crud.py.
    // Não tem update otimista de estoque aqui no cliente: a vitrine busca
    // os produtos do backend a cada visita — ver src/pages/PaginaPrincipal.tsx.)

    setSalvandoPedido(false);

    const mensagem = `*Novo Pedido — COMUNA*

*Cliente:* ${dados.nome}
*Celular:* ${dados.celular}
*${entregaTexto}*${observacoesTexto}

━━━━━━━━━━━━━━━━━━━━
*Itens do Pedido:*

${linhasItens}

━━━━━━━━━━━━━━━━━━━━
*Total estimado: ${formatarPreco(totalPreco)}*${solicitacoesTexto}

_Disponibilidade sujeita a confirmação no momento da separação._`;

    const url = `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
    limpar();
    onFechar();
  }

  return (
    <Modal
      visible
      onDismiss={onFechar}
      header={etapa === "formulario" ? "Seus dados" : "Confirmar pedido"}
      size="medium"
    >
      {etapa === "formulario" && (
        <form onSubmit={handleSubmit}>
          <SpaceBetween size="m">
            <FormField label="Nome completo *">
              <Input
                value={dados.nome}
                onChange={({ detail }) => setDados({ ...dados, nome: detail.value })}
                placeholder="Seu nome"
              />
            </FormField>

            <FormField label="Celular / WhatsApp *">
              <Input
                inputMode="tel"
                value={dados.celular}
                onChange={({ detail }) => setDados({ ...dados, celular: detail.value })}
                placeholder="(19) 99999-9999"
              />
            </FormField>

            <FormField label="Como prefere receber? *">
              <RadioGroup
                value={dados.tipoEntrega}
                onChange={({ detail }) =>
                  setDados({ ...dados, tipoEntrega: detail.value as "retirada" | "entrega" })
                }
                items={[
                  {
                    value: "retirada",
                    label: (
                      <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                        <Icone nome="location-pin" tamanho={16} /><span>Retirada</span>
                      </SpaceBetween>
                    ),
                    description: ENDERECO_RETIRADA,
                  },
                  {
                    value: "entrega",
                    label: (
                      <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                        <Icone nome="caminhao" /><span>Entrega</span>
                      </SpaceBetween>
                    ),
                    description: "Via COMUNA",
                  },
                ]}
              />
            </FormField>

            {dados.tipoEntrega === "entrega" && (
              <FormField label="Endereço de entrega *">
                <Textarea
                  value={dados.enderecoEntrega ?? ""}
                  onChange={({ detail }) => setDados({ ...dados, enderecoEntrega: detail.value })}
                  placeholder="Rua, número, bairro, cidade..."
                  rows={3}
                />
              </FormField>
            )}

            <FormField label="Gostaria de algum produto que não encontrou?">
              <Textarea
                value={dados.produtosSolicitados ?? ""}
                onChange={({ detail }) =>
                  setDados({ ...dados, produtosSolicitados: detail.value })
                }
                placeholder="Insira o nome de algum produto que não encontrou"
                rows={2}
              />
            </FormField>

            <FormField label="Observações (opcional)">
              <Textarea
                value={dados.observacoes ?? ""}
                onChange={({ detail }) => setDados({ ...dados, observacoes: detail.value })}
                placeholder="Ex: Horário para entrega, Observação sobre o pedido"
                rows={2}
              />
            </FormField>

            <Button
              variant="primary"
              fullWidth
              formAction="submit"
              iconSvg={<Icone nome="arrow-right" tamanho={16} />}
              iconAlign="right"
            >
              Revisar Pedido
            </Button>
          </SpaceBetween>
        </form>
      )}

      {etapa === "confirmacao" && (
        <SpaceBetween size="m">
          <Container>
            <SpaceBetween size="xs">
              <Box>
                <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                  <Icone nome="user-profile" tamanho={16} /><span>{dados.nome}</span>
                </SpaceBetween>
              </Box>
              <Box>
                <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                  <Icone nome="call" tamanho={16} /><span>{dados.celular}</span>
                </SpaceBetween>
              </Box>
              <Box>
                <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                  {dados.tipoEntrega === "retirada" ? (
                    <Icone nome="location-pin" tamanho={16} />
                  ) : (
                    <Icone nome="caminhao" />
                  )}
                  <span>
                    {dados.tipoEntrega === "retirada"
                      ? `Retirada — ${ENDERECO_RETIRADA}`
                      : `Entrega — ${dados.enderecoEntrega}`}
                  </span>
                </SpaceBetween>
              </Box>
            </SpaceBetween>
          </Container>

          <div style={{ maxHeight: 192, overflowY: "auto" }}>
            <SpaceBetween size="xs">
              {itens.map((item) => (
                <Box key={item.produto.id} display="inline-block">
                  <SpaceBetween direction="horizontal" size="xs">
                    <Box color="text-body-secondary">
                      {item.quantidade}× {item.produto.nome}
                    </Box>
                    <Preco valor={precoEfetivo(item.produto) * item.quantidade} tamanho="pequeno" />
                  </SpaceBetween>
                </Box>
              ))}
            </SpaceBetween>
          </div>

          <Box display="inline-block">
            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
              <Box fontWeight="bold">Total estimado</Box>
              <Box fontWeight="bold" color="text-status-success">
                {formatarPreco(totalPreco)}
              </Box>
            </SpaceBetween>
          </Box>

          <Alert type="warning" header="Atenção">
            A disponibilidade final dos produtos avulsos está sujeita a confirmação no
            momento da separação do pedido. A COMUNA entrará em contato caso haja alguma
            alteração.
          </Alert>

          <SpaceBetween direction="horizontal" size="xs">
            <Button onClick={() => setEtapa("formulario")} iconSvg={<Icone nome="arrow-left" tamanho={16} />}>
              Voltar
            </Button>
            <Button
              onClick={enviarWhatsApp}
              disabled={salvandoPedido}
              variant="primary"
              iconSvg={<Icone nome="send" tamanho={16} />}
            >
              {salvandoPedido ? "Registrando pedido..." : "Enviar via WhatsApp"}
            </Button>
          </SpaceBetween>
        </SpaceBetween>
      )}
    </Modal>
  );
}
