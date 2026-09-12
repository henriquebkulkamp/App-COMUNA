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

// ─── Cache de linhas (protege quota após remover revalidate da rota) ─────────
let _produtosCache: Produto[] | null = null;
let _produtosCacheExpiry = 0;

export function invalidarCacheProdutos() {
  _produtosCache = null;
  _produtosCacheExpiry = 0;
}

// ─── Leitura de Produtos ─────────────────────────────────────
// Lê todas as linhas da aba "Estoque" e converte para objetos Produto.
// Analogia Python: df = pd.read_excel('planilha.xlsx', sheet_name='Estoque')
export async function buscarProdutosDaPlanilha(): Promise<Produto[]> {
  const agora = Date.now();
  if (_produtosCache && agora < _produtosCacheExpiry) return _produtosCache;

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
  const produtos = linhas
    .filter((linha) => linha.get("id")) // ignora linhas vazias
    .map((linha) => {
      const quantidade = parseInt(linha.get("quantidade") || "0", 10) || 0;
      // Disponibilidade é 100% derivada da quantidade — não existe mais checkbox
      // manual de "em estoque". Elizete só mexe na quantidade, em qualquer lugar
      // (app ou direto na planilha), e o produto aparece/some automaticamente.
      const emEstoque = quantidade > 0;

      return {
        id: linha.get("id"),
        nome: linha.get("nome"),
        // O Google Sheets (planilha em pt-BR) às vezes formata números escritos
        // via API com vírgula decimal (ex: "9,99"). O replace garante que o
        // parseFloat funcione nos dois formatos, evitando truncar os centavos.
        preco: parseFloat(String(linha.get("preco")).replace(",", ".")) || 0,
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

  _produtosCache = produtos;
  _produtosCacheExpiry = agora + 30_000; // 30 segundos
  return produtos;
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

// ─── Criação de Produto ──────────────────────────────────────
// Chamada pelo painel admin ao cadastrar um novo produto. Grava direto
// na aba "Estoque" — antes disso, o produto só existia no navegador.
// Analogia Python: df = pd.concat([df, pd.DataFrame([novo_produto])])
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
  const doc = await abrirPlanilha();
  const aba = doc.sheetsByTitle["Estoque"];
  if (!aba) throw new Error('Aba "Estoque" não encontrada na planilha.');

  await comRetry(() =>
    aba.addRow({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      unidade: produto.unidade,
      categoria: produto.categoria,
      emEstoque: true,
      quantidade: 0,
      naCestaGrande: false,
      naCestaPequena: false,
      descricao: produto.descricao || "",
    })
  );
}

// ─── Remoção de Produto ──────────────────────────────────────
// Chamada pelo painel admin ao excluir um produto. Remove a linha
// correspondente na aba "Estoque" pelo id.
// Analogia Python: df = df[df['id'] != produto_id]
export async function removerProdutoDaPlanilha(produtoId: string): Promise<void> {
  const doc = await abrirPlanilha();
  const aba = doc.sheetsByTitle["Estoque"];
  if (!aba) throw new Error('Aba "Estoque" não encontrada na planilha.');

  const linhas = await comRetry(() => aba.getRows());
  const linha = linhas.find((l) => l.get("id") === produtoId);
  if (!linha) throw new Error(`Produto "${produtoId}" não encontrado na planilha.`);

  await comRetry(() => linha.delete());
}

// ─── Configurações (PIN e WhatsApp) ──────────────────────────
// Lê a aba "Configurações" (formato chave/valor) e retorna um objeto.
// Analogia Python: dict(df[['chave','valor']].values) — vira um dict simples.
let _configCache: Record<string, string> | null = null;
let _configCacheExpiry = 0;

async function buscarConfiguracoes(): Promise<Record<string, string>> {
  const agora = Date.now();
  if (_configCache && agora < _configCacheExpiry) return _configCache;

  const doc = await abrirPlanilha();
  const aba = doc.sheetsByTitle["Configurações"];
  if (!aba) throw new Error('Aba "Configurações" não encontrada na planilha.');

  const linhas = await comRetry(() => aba.getRows());
  const config: Record<string, string> = {};
  for (const linha of linhas) {
    const chave = linha.get("chave");
    if (chave) config[chave] = linha.get("valor") ?? "";
  }

  _configCache = config;
  _configCacheExpiry = agora + 30_000; // 30 segundos
  return config;
}

export function invalidarCacheConfiguracoes() {
  _configCache = null;
  _configCacheExpiry = 0;
}

// Retorna apenas os campos seguros de expor ao cliente (nunca o PIN)
export async function buscarConfigPublica(): Promise<{ whatsappNumero: string }> {
  const config = await buscarConfiguracoes();
  return { whatsappNumero: config.whatsappNumero ?? "" };
}

// Verifica o PIN no servidor — o valor correto nunca é enviado ao cliente
export async function verificarPin(pinDigitado: string): Promise<boolean> {
  const config = await buscarConfiguracoes();
  return config.pin === pinDigitado;
}

// Atualiza uma chave (pin ou whatsappNumero) na aba "Configurações"
export async function atualizarConfiguracao(
  chave: "pin" | "whatsappNumero",
  novoValor: string
): Promise<void> {
  const doc = await abrirPlanilha();
  const aba = doc.sheetsByTitle["Configurações"];
  if (!aba) throw new Error('Aba "Configurações" não encontrada na planilha.');

  const linhas = await comRetry(() => aba.getRows());
  const linha = linhas.find((l) => l.get("chave") === chave);
  if (!linha) throw new Error(`Chave "${chave}" não encontrada na aba Configurações.`);

  linha.set("valor", novoValor);
  await comRetry(() => linha.save());
  invalidarCacheConfiguracoes();
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
    aba = await comRetry(() =>
      doc.addSheet({
        title: "Solicitações",
        headerValues: ["timestamp", "numeroPedido", "nomeCliente", "celular", "produtosSolicitados"],
      })
    );
  }

  await comRetry(() =>
    aba.addRow({
      timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      numeroPedido,
      nomeCliente,
      celular,
      produtosSolicitados,
    })
  );
}

// ─── Gravação na aba "Etiqueta" (transposta) ─────────────────
// Sempre que um pedido é salvo, seus dados são inseridos como uma
// NOVA COLUNA na aba "Etiqueta" (em vez de uma nova linha), na mesma
// ordem de campos da aba "Pedidos". Isso reproduz automaticamente o
// que Elizete fazia manualmente: colar cada pedido transposto para
// facilitar a impressão de etiquetas.
//
// Analogia Python: é como fazer df_pedido.T (transpor a linha em
// coluna) e colar o resultado na próxima coluna livre de outra aba.
async function inserirNaAbaEtiqueta(campos: string[]): Promise<void> {
  const doc = await abrirPlanilha();
  const aba = doc.sheetsByTitle["Etiqueta"];
  if (!aba) return; // aba opcional — não impede o registro do pedido se não existir

  const totalLinhas = campos.length;

  await comRetry(() =>
    aba.loadCells({
      startRowIndex: 0,
      endRowIndex: totalLinhas,
      startColumnIndex: 0,
      endColumnIndex: aba.columnCount,
    })
  );

  // Acha a primeira coluna vazia, checando a linha do timestamp (linha 0)
  let coluna = 0;
  while (coluna < aba.columnCount && aba.getCell(0, coluna).value) {
    coluna++;
  }

  // Se a planilha não tiver colunas livres suficientes, expande antes de escrever
  if (coluna >= aba.columnCount) {
    await comRetry(() =>
      aba.resize({
        rowCount: Math.max(aba.rowCount, totalLinhas),
        columnCount: aba.columnCount + 20,
      })
    );
    await comRetry(() =>
      aba.loadCells({
        startRowIndex: 0,
        endRowIndex: totalLinhas,
        startColumnIndex: 0,
        endColumnIndex: aba.columnCount,
      })
    );
  }

  campos.forEach((valor, linha) => {
    aba.getCell(linha, coluna).value = valor;
  });

  await comRetry(() => aba.saveUpdatedCells());
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
  const timestamp = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
  const enderecoEntrega = pedido.enderecoEntrega || "";
  const observacoes = pedido.observacoes || "";
  const totalPrecoTexto = pedido.totalPreco.toFixed(2);
  const status = "Pendente";

  await aba.addRow({
    timestamp,
    numeroPedido,
    nomeCliente: pedido.nomeCliente,
    celular: pedido.celular,
    tipoEntrega: pedido.tipoEntrega,
    enderecoEntrega,
    itens: pedido.itens,
    totalPreco: totalPrecoTexto,
    observacoes,
    status,
  });

  // Espelha o mesmo pedido, transposto, na aba "Etiqueta"
  // Falha aqui não deve impedir o pedido de ser confirmado ao cliente.
  await inserirNaAbaEtiqueta([
    timestamp,
    numeroPedido,
    pedido.nomeCliente,
    pedido.celular,
    pedido.tipoEntrega,
    enderecoEntrega,
    pedido.itens,
    totalPrecoTexto,
    observacoes,
    status,
  ]).catch((erro) => {
    console.error("[salvarPedido] Falha ao inserir na aba Etiqueta:", erro);
  });

  return numeroPedido;
}
