// ============================================================
// POSTGRES — Serviço de acesso ao banco de dados da COMUNA
//
// Substitui o antigo lib/google-sheets.ts. Mesma API pública
// (mesmos nomes de função) para que as rotas em app/api/**
// não precisassem mudar, só o import.
//
// Analogia Python: é como trocar um módulo que usava pandas +
// openpyxl para ler uma planilha por um módulo que usa psycopg2
// (ou SQLAlchemy) para falar com um Postgres de verdade.
//
// IMPORTANTE: este arquivo só roda no servidor (Node.js).
// Nunca importe-o em componentes "use client".
// ============================================================

import { Pool } from "pg";
import type { Produto, Categoria } from "./types";
import { gerarImagemSimulada } from "./imagemSimulada";

// ─── Pool de conexões ────────────────────────────────────────
// Analogia: como um pool de conexões do SQLAlchemy — evita abrir
// uma conexão TCP nova a cada requisição.
declare global {
  // eslint-disable-next-line no-var
  var _comunaPgPool: Pool | undefined;
}

function obterPool(): Pool {
  if (!global._comunaPgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("Variável DATABASE_URL não encontrada no .env.local");
    }
    global._comunaPgPool = new Pool({ connectionString });
  }
  return global._comunaPgPool;
}

// ─── Cache de produtos (mesma ideia do módulo antigo) ────────
let _produtosCache: Produto[] | null = null;
let _produtosCacheExpiry = 0;

export function invalidarCacheProdutos() {
  _produtosCache = null;
  _produtosCacheExpiry = 0;
}

type LinhaProduto = {
  id: string;
  nome: string;
  preco: string; // NUMERIC volta como string no node-postgres
  preco_real: string | null;
  unidade: string;
  categoria: Categoria;
  quantidade: number;
  na_cesta_grande: boolean;
  na_cesta_pequena: boolean;
  descricao: string | null;
  imagem_url: string | null;
  tags: string[] | null;
};

function linhaParaProduto(linha: LinhaProduto): Produto {
  const quantidade = linha.quantidade ?? 0;
  return {
    id: linha.id,
    nome: linha.nome,
    preco: parseFloat(linha.preco) || 0,
    precoReal: linha.preco_real !== null ? parseFloat(linha.preco_real) : undefined,
    unidade: linha.unidade,
    categoria: linha.categoria,
    // Disponibilidade é 100% derivada da quantidade — mesma regra de antes.
    emEstoque: quantidade > 0,
    quantidade,
    naCestaGrande: linha.na_cesta_grande,
    naCestaPequena: linha.na_cesta_pequena,
    descricao: linha.descricao ?? undefined,
    imagemUrl: linha.imagem_url ?? undefined,
    tags: linha.tags ?? [],
  };
}

// ─── Leitura de Produtos ─────────────────────────────────────
export async function buscarProdutosDaPlanilha(): Promise<Produto[]> {
  const agora = Date.now();
  if (_produtosCache && agora < _produtosCacheExpiry) return _produtosCache;

  const { rows } = await obterPool().query<LinhaProduto>(
    "SELECT * FROM produtos ORDER BY categoria, nome"
  );
  const produtos = rows.map(linhaParaProduto);

  _produtosCache = produtos;
  _produtosCacheExpiry = agora + 30_000; // 30 segundos
  return produtos;
}

// ─── Desconto de Estoque ─────────────────────────────────────
export async function descontarEstoque(
  itens: Array<{ produtoId: string; quantidadePedida: number }>
): Promise<void> {
  const pool = obterPool();
  for (const item of itens) {
    await pool.query(
      `UPDATE produtos
       SET quantidade = GREATEST(0, quantidade - $2)
       WHERE id = $1`,
      [item.produtoId, item.quantidadePedida]
    );
  }
}

// ─── Atualização de Quantidade ───────────────────────────────
export async function atualizarQuantidadeNaPlanilha(
  produtoId: string,
  novaQuantidade: number
): Promise<void> {
  const { rowCount } = await obterPool().query(
    "UPDATE produtos SET quantidade = $2 WHERE id = $1",
    [produtoId, novaQuantidade]
  );
  if (!rowCount) throw new Error(`Produto "${produtoId}" não encontrado.`);
}

// ─── Atualização de Preço ────────────────────────────────────
export async function atualizarPrecoNaPlanilha(
  produtoId: string,
  novoPreco: number
): Promise<void> {
  const { rowCount } = await obterPool().query(
    "UPDATE produtos SET preco = $2 WHERE id = $1",
    [produtoId, novoPreco]
  );
  if (!rowCount) throw new Error(`Produto "${produtoId}" não encontrado.`);
}

// ─── Atualização de Preço Real (desconto) ────────────────────
// `null` limpa o desconto — o produto volta a mostrar só o preço base.
export async function atualizarPrecoRealNaPlanilha(
  produtoId: string,
  novoPrecoReal: number | null
): Promise<void> {
  const { rowCount } = await obterPool().query(
    "UPDATE produtos SET preco_real = $2 WHERE id = $1",
    [produtoId, novoPrecoReal]
  );
  if (!rowCount) throw new Error(`Produto "${produtoId}" não encontrado.`);
}

// ─── Atualização de Unidade ──────────────────────────────────
export async function atualizarUnidadeNaPlanilha(
  produtoId: string,
  novaUnidade: string
): Promise<void> {
  const { rowCount } = await obterPool().query(
    "UPDATE produtos SET unidade = $2 WHERE id = $1",
    [produtoId, novaUnidade]
  );
  if (!rowCount) throw new Error(`Produto "${produtoId}" não encontrado.`);
}

// ─── Atualização de Cesta ────────────────────────────────────
export async function atualizarCestaNaPlanilha(
  produtoId: string,
  campo: "naCestaGrande" | "naCestaPequena",
  valor: boolean
): Promise<void> {
  const coluna = campo === "naCestaGrande" ? "na_cesta_grande" : "na_cesta_pequena";
  const { rowCount } = await obterPool().query(
    `UPDATE produtos SET ${coluna} = $2 WHERE id = $1`,
    [produtoId, valor]
  );
  if (!rowCount) throw new Error(`Produto "${produtoId}" não encontrado.`);
}

// ─── Criação de Produto ──────────────────────────────────────
export interface NovoProdutoParaSalvar {
  id: string;
  nome: string;
  preco: number;
  unidade: string;
  categoria: Categoria;
  descricao?: string;
}

export async function adicionarProdutoNaPlanilha(
  produto: NovoProdutoParaSalvar
): Promise<void> {
  await obterPool().query(
    `INSERT INTO produtos (id, nome, preco, unidade, categoria, quantidade, na_cesta_grande, na_cesta_pequena, descricao, imagem_url)
     VALUES ($1, $2, $3, $4, $5, 0, false, false, $6, $7)`,
    [
      produto.id,
      produto.nome,
      produto.preco,
      produto.unidade,
      produto.categoria,
      produto.descricao || null,
      gerarImagemSimulada(produto.categoria),
    ]
  );
}

// ─── Remoção de Produto ──────────────────────────────────────
export async function removerProdutoDaPlanilha(produtoId: string): Promise<void> {
  const { rowCount } = await obterPool().query("DELETE FROM produtos WHERE id = $1", [
    produtoId,
  ]);
  if (!rowCount) throw new Error(`Produto "${produtoId}" não encontrado.`);
}

// ─── Configurações (PIN e WhatsApp) ──────────────────────────
let _configCache: Record<string, string> | null = null;
let _configCacheExpiry = 0;

async function buscarConfiguracoes(): Promise<Record<string, string>> {
  const agora = Date.now();
  if (_configCache && agora < _configCacheExpiry) return _configCache;

  const { rows } = await obterPool().query<{ chave: string; valor: string }>(
    "SELECT chave, valor FROM configuracoes"
  );
  const config: Record<string, string> = {};
  for (const linha of rows) config[linha.chave] = linha.valor ?? "";

  _configCache = config;
  _configCacheExpiry = agora + 30_000; // 30 segundos
  return config;
}

export function invalidarCacheConfiguracoes() {
  _configCache = null;
  _configCacheExpiry = 0;
}

export async function buscarConfigPublica(): Promise<{ whatsappNumero: string }> {
  const config = await buscarConfiguracoes();
  return { whatsappNumero: config.whatsappNumero ?? "" };
}

export async function verificarPin(pinDigitado: string): Promise<boolean> {
  const config = await buscarConfiguracoes();
  return config.pin === pinDigitado;
}

export async function atualizarConfiguracao(
  chave: "pin" | "whatsappNumero",
  novoValor: string
): Promise<void> {
  await obterPool().query(
    `INSERT INTO configuracoes (chave, valor) VALUES ($1, $2)
     ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`,
    [chave, novoValor]
  );
  invalidarCacheConfiguracoes();
}

// ─── Gravação de Solicitações ────────────────────────────────
export async function salvarSolicitacoes({
  nomeCliente,
  celular,
  numeroPedido,
  produtosSolicitados,
}: {
  nomeCliente: string;
  celular: string;
  numeroPedido: string;
  produtosSolicitados: string;
}): Promise<void> {
  await obterPool().query(
    `INSERT INTO solicitacoes (numero_pedido, nome_cliente, celular, produtos_solicitados)
     VALUES ($1, $2, $3, $4)`,
    [numeroPedido, nomeCliente, celular, produtosSolicitados]
  );
}

// ─── Tipos do Pedido ─────────────────────────────────────────
export interface PedidoParaSalvar {
  nomeCliente: string;
  celular: string;
  tipoEntrega: "retirada" | "entrega";
  enderecoEntrega?: string;
  observacoes?: string;
  totalPreco: number;
  // Os itens são serializados como JSON string para caber em uma célula
  itens: string;
}

// ─── Gravação de Pedido ──────────────────────────────────────
export async function salvarPedido(pedido: PedidoParaSalvar): Promise<string> {
  // Número do pedido: timestamp em milissegundos → garante unicidade
  const numeroPedido = `PED-${Date.now()}`;

  await obterPool().query(
    `INSERT INTO pedidos (numero_pedido, nome_cliente, celular, tipo_entrega, endereco_entrega, itens, total_preco, observacoes, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pendente')`,
    [
      numeroPedido,
      pedido.nomeCliente,
      pedido.celular,
      pedido.tipoEntrega,
      pedido.enderecoEntrega || "",
      pedido.itens,
      pedido.totalPreco.toFixed(2),
      pedido.observacoes || "",
    ]
  );

  return numeroPedido;
}
