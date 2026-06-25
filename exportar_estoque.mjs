/**
 * exportar_estoque.mjs
 * ====================
 * Lê lib/dados.ts e exporta todos os produtos para estoque_inicial.csv,
 * pronto para importar no Google Sheets.
 *
 * Uso: node exportar_estoque.mjs
 * Dependências: nenhuma (usa apenas módulos nativos do Node.js).
 *
 * É um script Node.js simples — análogo a um script Python com
 * re, csv e pathlib. A lógica é idêntica, só a sintaxe muda.
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// __dirname não existe em ES Modules — reconstruímos da mesma forma que Python faz
// Analogia: Path(__file__).parent
const __dirname = dirname(fileURLToPath(import.meta.url));

const DADOS_TS = join(__dirname, "lib", "dados.ts");
const OUTPUT   = join(__dirname, "estoque_inicial.csv");

const COLUNAS = [
  "id", "nome", "preco", "unidade", "categoria",
  "emEstoque", "naCestaGrande", "naCestaPequena",
  "descricao", "imagemUrl",
];

// Analogia: re.search(padrao, texto).group(1) ou default
function extrair(padrao, texto, valorPadrao = "") {
  const match = texto.match(padrao);
  return match ? match[1] : valorPadrao;
}

// Escapa aspas duplas dentro de um valor CSV e envolve em aspas se necessário
// Analogia: csv.writer faz isso automaticamente em Python
function csvCell(valor) {
  const str = String(valor ?? "");
  // Se contém vírgula, aspas ou quebra de linha, envolve em aspas duplas
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parsearProduto(bloco) {
  const id = extrair(/id:\s*"([^"]+)"/, bloco);
  if (!id) return null; // bloco vazio — ignora

  const emEstoque     = extrair(/emEstoque:\s*(true|false)/,     bloco, "false").toUpperCase();
  const naCestaGrande = extrair(/naCestaGrande:\s*(true|false)/, bloco, "false").toUpperCase();
  const naCestaPequena= extrair(/naCestaPequena:\s*(true|false)/,bloco, "false").toUpperCase();

  return {
    id,
    nome:           extrair(/nome:\s*"([^"]+)"/,     bloco),
    preco:          extrair(/preco:\s*([\d.]+)/,       bloco),
    unidade:        extrair(/unidade:\s*"([^"]+)"/,   bloco),
    categoria:      extrair(/categoria:\s*"([^"]+)"/, bloco),
    emEstoque,
    naCestaGrande,
    naCestaPequena,
    descricao:      extrair(/descricao:\s*"([^"]+)"/, bloco, ""),
    imagemUrl:      extrair(/imagemUrl:\s*"([^"]+)"/, bloco, ""),
  };
}

// ─── Main ─────────────────────────────────────────────────────
console.log(`Lendo: ${DADOS_TS}\n`);

const conteudo = readFileSync(DADOS_TS, "utf-8");

// Isola o bloco do array PRODUTOS_INICIAIS
const marcador = "PRODUTOS_INICIAIS: Produto[] = [";
const inicio   = conteudo.indexOf(marcador);
if (inicio === -1) {
  console.error("ERRO: constante PRODUTOS_INICIAIS não encontrada.");
  process.exit(1);
}
const fim         = conteudo.indexOf("];", inicio);
const blocoArray  = conteudo.slice(inicio, fim);

// Extrai todos os objetos { ... } (um por produto)
// Analogia: re.findall(r'\{([^{}]+)\}', bloco_array) em Python
const blocosRaw = [...blocoArray.matchAll(/\{([^{}]+)\}/gs)].map(m => m[1]);

const produtos  = [];
let ignorados   = 0;

for (const bloco of blocosRaw) {
  const p = parsearProduto(bloco);
  if (p) {
    produtos.push(p);
  } else {
    ignorados++;
  }
}

if (produtos.length === 0) {
  console.error("ERRO: nenhum produto encontrado.");
  process.exit(1);
}

// Monta o CSV com BOM (U+FEFF) para o Excel/Sheets reconhecer UTF-8 com acentos
// Analogia: open(f, encoding='utf-8-sig') em Python
const linhas = [
  COLUNAS.join(","), // cabeçalho
  ...produtos.map(p => COLUNAS.map(col => csvCell(p[col])).join(",")),
];

writeFileSync(OUTPUT, "﻿" + linhas.join("\r\n"), "utf-8");

console.log(`✅ Exportação concluída!`);
console.log(`   ${produtos.length} produtos gravados em: ${OUTPUT}`);
if (ignorados) console.log(`   (${ignorados} blocos vazios ignorados — normal)`);
console.log();
console.log("Próximo passo — importe o CSV no Google Sheets:");
console.log("  Arquivo → Importar → Fazer upload → selecione estoque_inicial.csv");
console.log('  Separador: "Detectar automaticamente" (vai reconhecer vírgula)');
console.log('  Converter texto em números e datas: NÃO');
console.log();
console.log("Depois da importação:");
console.log("  Selecione as colunas emEstoque, naCestaGrande, naCestaPequena");
console.log("  Formatar → Células → Checkbox → as colunas viram caixas de seleção");
