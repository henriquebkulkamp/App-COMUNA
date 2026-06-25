// ============================================================
// GOOGLE SHEETS — Serviço de acesso à planilha da COMUNA
//
// Analogia Python: é como um módulo com funções que usam
// pandas.read_excel() e openpyxl para ler/escrever um arquivo,
// mas em vez de arquivo local, é uma planilha na nuvem.
//
// IMPORTANTE: este arquivo só roda no servidor (Node.js).
// Nunca importe-o em componentes "use client".
// ============================================================

import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import type { Produto, Categoria } from "./types";

// ─── Autenticação ────────────────────────────────────────────
// A Service Account é o "usuário robô" que acessa a planilha.
// Analogia Python: como usar uma API key em requests.get(headers={"Authorization": ...})
function criarAuth(): JWT {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // O private_key no .env.local tem \n como texto literal — precisamos converter
  // para quebras de linha reais. Analogia: .replace('\\n', '\n') em Python.
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Variáveis GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY não encontradas no .env.local"
    );
  }

  return new JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

// ─── Cache do doc (evita loadInfo() a cada requisição) ───────
// No Vercel, instâncias Lambda ficam "quentes" por alguns minutos.
// Cachear o doc reduz drasticamente as chamadas de leitura à API.
let _docCache: GoogleSpreadsheet | null = null;
let _docCacheExpiry = 0;

// ─── Retry com backoff para erro 429 (quota excedida) ────────
async function comRetry<T>(fn: () => Promise<T>, tentativas = 4): Promise<T> {
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      const msg = String((e as Error)?.message ?? "");
      const is429 = msg.includes("429") || msg.includes("Quota");
      if (is429 && i < tentativas - 1) {
        await new Promise((r) => setTimeout(r, (i + 1) * 2000)); // 2s, 4s, 6s
        continue;
      }
      throw e;
    }
  }
  throw new Error("Todas as tentativas falharam");
}

// ─── Conexão com a planilha ──────────────────────────────────
// Analogia: como abrir um arquivo Excel com openpyxl.load_workbook(path)
async function abrirPlanilha(): Promise<GoogleSpreadsheet> {
  const agora = Date.now();
  if (_docCache && agora < _docCacheExpiry) return _docCache;

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error("Variável GOOGLE_SHEET_ID não encontrada no .env.local");
  }

  const auth = criarAuth();
  const doc = new GoogleSpreadsheet(sheetId, auth);
  await comRetry(() => doc.loadInfo()); // carrega metadados (nome das abas, etc.)

  _docCache = doc;
  _docCacheExpiry = agora + 5 * 60_000; // cache por 5 minutos
  return doc;
}

// ─── Leitura de Produtos ─────────────────────────────────────
// Lê todas as linhas da aba "Estoque" e converte para objetos Produto.
// Analogia Python: df = pd.read_excel('planilha.xlsx', sheet_name='Estoque')
export async function buscarProdutosDaPlanilha(): Promise<Produto[]> {
  const doc = await abrirPlanilha();

  // Acessa a aba pelo nome exato — certifique-se que chama "Estoque" no Sheets
  const aba = doc.sheetsByTitle["Estoque"];
  if (!aba) {
    throw new Error('Aba "Estoque" não encontrada na planilha. Verifique o nome.');
  }

  // getRows() retorna todas as linhas (exceto o cabeçalho)
  // Analogia: df.to_dict('records') — lista de dicionários, um por linha
  const linhas = await comRetry(() => aba.getRows());

  // Converte cada linha para o formato Produto que o app espera
  // Analogia Python: [converter_linha(l) for l in linhas if l['id']]
  return linhas
    .filter((linha) => linha.get("id")) // ignora linhas vazias
    .map((linha) => {
      const quantidade = parseInt(linha.get("quantidade") || "0", 10) || 0;
      // Se quantidade não preenchida (0 ou vazio), produto some do cardápio
      const emEstoque =
        String(linha.get("emEstoque")).toUpperCase() === "TRUE" && quantidade > 0;

      return {
        id: linha.get("id"),
        nome: linha.get("nome"),
        preco: parseFloat(linha.get("preco")) || 0,
        unidade: linha.get("unidade"),
        categoria: linha.get("categoria") as Categoria,
        emEstoque,
        quantidade,
        naCestaGrande: String(linha.get("naCestaGrande")).toUpperCase() === "TRUE",
        naCestaPequena: String(linha.get("naCestaPequena")).toUpperCase() === "TRUE",
        descricao: linha.get("descricao") || undefined,
        imagemUrl: linha.get("imagemUrl") || undefined,
      };
    });
}

// ─── Desconto de Estoque ─────────────────────────────────────
// Chamada após salvar um pedido. Para cada item pedido:
//   1. Acha a linha na aba Estoque pelo id do produto
//   2. Desconta a quantidade pedida
//   3. Se quantidade chegar a 0, marca emEstoque = FALSE
//
// Analogia Python:
//   for item in itens:
//       df.loc[df['id'] == item['id'], 'quantidade'] -= item['qtd']
//       if quantidade <= 0: df.loc[...,'emEstoque'] = False
export async function descontarEstoque(
  itens: Array<{ produtoId: string; quantidadePedida: number }>
): Promise<void> {
  const doc = await abrirPlanilha();
  const aba = doc.sheetsByTitle["Estoque"];
  if (!aba) return;

  const linhas = await comRetry(() => aba.getRows());

  // Processa cada item do pedido sequencialmente
  for (const item of itens) {
    const linha = linhas.find((l) => l.get("id") === item.produtoId);
    if (!linha) continue;

    const quantidadeAtual = parseInt(linha.get("quantidade") || "0", 10) || 0;
    const novaQuantidade = Math.max(0, quantidadeAtual - item.quantidadePedida);

    linha.set("quantidade", novaQuantidade);

    // Se zerou, desativa o produto automaticamente
    if (novaQuantidade === 0) {
      linha.set("emEstoque", false);
    }

    await comRetry(() => linha.save());
  }
}

// ─── Atualização de Quantidade ───────────────────────────────
// Chamada pelo painel admin quando Elizete edita a quantidade de um produto.
// Encontra a linha pelo id e atualiza quantidade + emEstoque.
//
// Analogia Python:
//   df.loc[df['id'] == produto_id, 'quantidade'] = nova_quantidade
//   if nova_quantidade == 0: df.loc[...,'emEstoque'] = False
export async function atualizarQuantidadeNaPlanilha(
  produtoId: string,
  novaQuantidade: number
): Promise<void> {
  const doc = await abrirPlanilha();
  const aba = doc.sheetsByTitle["Estoque"];
  if (!aba) throw new Error('Aba "Estoque" não encontrada na planilha.');

  const linhas = await comRetry(() => aba.getRows());
  const linha = linhas.find((l) => l.get("id") === produtoId);
  if (!linha) throw new Error(`Produto "${produtoId}" não encontrado na planilha.`);

  linha.set("quantidade", novaQuantidade);
  // Se zerou, desativa automaticamente; se voltou a ter estoque, reativa
  linha.set("emEstoque", novaQuantidade > 0);
  await linha.save();
}

// ─── Atualização de Preço ────────────────────────────────────
// Atualiza o preço de um produto na aba "Estoque" da planilha.
export async function atualizarPrecoNaPlanilha(
  produtoId: string,
  novoPreco: number
): Promise<void> {
  const doc = await abrirPlanilha();
  const aba = doc.sheetsByTitle["Estoque"];
  if (!aba) throw new Error('Aba "Estoque" não encontrada na planilha.');

  const linhas = await comRetry(() => aba.getRows());
  const linha = linhas.find((l) => l.get("id") === produtoId);
  if (!linha) throw new Error(`Produto "${produtoId}" não encontrado na planilha.`);

  linha.set("preco", novoPreco);
  await linha.save();
}

// ─── Atualização de Disponibilidade (emEstoque) ──────────────
export async function atualizarEmEstoqueNaPlanilha(
  produtoId: string,
  emEstoque: boolean
): Promise<void> {
  const doc = await abrirPlanilha();
  const aba = doc.sheetsByTitle["Estoque"];
  if (!aba) throw new Error('Aba "Estoque" não encontrada na planilha.');

  const linhas = await comRetry(() => aba.getRows());
  const linha = linhas.find((l) => l.get("id") === produtoId);
  if (!linha) throw new Error(`Produto "${produtoId}" não encontrado na planilha.`);

  linha.set("emEstoque", emEstoque);
  await linha.save();
}

// ─── Atualização de Unidade ──────────────────────────────────
export async function atualizarUnidadeNaPlanilha(
  produtoId: string,
  novaUnidade: string
): Promise<void> {
  const doc = await abrirPlanilha();
  const aba = doc.sheetsByTitle["Estoque"];
  if (!aba) throw new Error('Aba "Estoque" não encontrada na planilha.');

  const linhas = await comRetry(() => aba.getRows());
  const linha = linhas.find((l) => l.get("id") === produtoId);
  if (!linha) throw new Error(`Produto "${produtoId}" não encontrado na planilha.`);

  linha.set("unidade", novaUnidade);
  await linha.save();
}

// ─── Atualização de Cesta ────────────────────────────────────
// Chamada pelo painel admin quando Elizete marca/desmarca um produto nas cestas.
// Atualiza a coluna naCestaGrande ou naCestaPequena diretamente na planilha.
export async function atualizarCestaNaPlanilha(
  produtoId: string,
  campo: "naCestaGrande" | "naCestaPequena",
  valor: boolean
): Promise<void> {
  const doc = await abrirPlanilha();
  const aba = doc.sheetsByTitle["Estoque"];
  if (!aba) throw new Error('Aba "Estoque" não encontrada na planilha.');

  const linhas = await comRetry(() => aba.getRows());
  const linha = linhas.find((l) => l.get("id") === produtoId);
  if (!linha) throw new Error(`Produto "${produtoId}" não encontrado na planilha.`);

  linha.set(campo, valor);
  await linha.save();
}

// ─── Gravação de Solicitações ────────────────────────────────
// Salva produtos solicitados pelo cliente na aba "Solicitações".
// Cria a aba automaticamente se ainda não existir.
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
  const doc = await abrirPlanilha();

  let aba = doc.sheetsByTitle["Solicitações"];
  if (!aba) {
    aba = await doc.addSheet({
      title: "Solicitações",
      headerValues: ["timestamp", "numeroPedido", "nomeCliente", "celular", "produtosSolicitados"],
    });
  }

  await aba.addRow({
    timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    numeroPedido,
    nomeCliente,
    celular,
    produtosSolicitados,
  });
}

// ─── Tipos do Pedido ─────────────────────────────────────────
// Representa os dados que o CheckoutModal envia para salvar
export interface PedidoParaSalvar {
  nomeCliente: string;
  celular: string;
  tipoEntrega: "retirada" | "entrega";
  enderecoEntrega?: string;
  observacoes?: string;
  totalPreco: number;
  // Os itens são serializados como JSON string para caber em uma célula
  // Analogia: json.dumps(itens) em Python
  itens: string;
}

// ─── Gravação de Pedido ──────────────────────────────────────
// Adiciona uma nova linha na aba "Pedidos" com os dados do pedido.
// Analogia Python: df = pd.concat([df, nova_linha]); df.to_excel(...)
export async function salvarPedido(pedido: PedidoParaSalvar): Promise<string> {
  const doc = await abrirPlanilha();

  const aba = doc.sheetsByTitle["Pedidos"];
  if (!aba) {
    throw new Error('Aba "Pedidos" não encontrada na planilha. Verifique o nome.');
  }

  // Número do pedido: timestamp em milissegundos → garante unicidade
  // Ex: "PED-1718200000000" — Elizete usa para identificar cada pedido
  const numeroPedido = `PED-${Date.now()}`;

  await aba.addRow({
    timestamp: new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    }),
    numeroPedido,
    nomeCliente: pedido.nomeCliente,
    celular: pedido.celular,
    tipoEntrega: pedido.tipoEntrega,
    enderecoEntrega: pedido.enderecoEntrega || "",
    itens: pedido.itens,
    totalPreco: pedido.totalPreco.toFixed(2),
    observacoes: pedido.observacoes || "",
    status: "Pendente",
  });

  return numeroPedido;
}
