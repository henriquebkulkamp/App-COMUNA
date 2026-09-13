// ============================================================
// seed.mjs — popula o Postgres com o catálogo inicial de produtos
//
// Fonte: estoque_inicial.csv (mesmo arquivo que era importado no
// Google Sheets). A coluna "quantidade" não existia nesse CSV —
// segue o mesmo padrão do bootstrap original (dados.ts): todo
// produto nasce com quantidade 0, e Elizete ativa o estoque real
// depois pelo painel /admin.
//
// Idempotente: pode rodar de novo — faz upsert por id.
//
// Uso: npm run db:seed
// ============================================================
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse } from "csv-parse/sync";
import pg from "pg";
import dotenv from "dotenv";
import {
  colorChartsPaletteCategorical1,
  colorChartsPaletteCategorical2,
  colorChartsPaletteCategorical3,
  colorChartsPaletteCategorical4,
  colorChartsPaletteCategorical5,
  colorChartsPaletteCategorical6,
  colorChartsPaletteCategorical7,
  colorChartsPaletteCategorical8,
  colorChartsPaletteCategorical9,
  colorChartsPaletteCategorical10,
} from "@cloudscape-design/design-tokens";
dotenv.config({ path: ".env.local" });

// ─── Imagem simulada (SVG data URI, sem dependência externa) ──
// Mesma lógica de lib/imagemSimulada.ts — duplicada aqui de propósito:
// este script roda em Node puro (sem o bundler do Next), então não dá
// pra importar um módulo .ts diretamente. A cor de fundo vem das
// paletas de gráfico do próprio Cloudscape, uma por categoria.
// Retângulo sólido, sem texto/letra — ver comentário completo em
// lib/imagemSimulada.ts sobre por que 1×1 basta pra cor chapada.
function hexDoToken(token) {
  return token.match(/#[0-9a-fA-F]{6}/)?.[0] ?? "#8c8c94";
}
const COR_POR_CATEGORIA = {
  Cestas: hexDoToken(colorChartsPaletteCategorical1),
  Frutas: hexDoToken(colorChartsPaletteCategorical2),
  "Verduras e Legumes": hexDoToken(colorChartsPaletteCategorical3),
  "Ervas e Temperos": hexDoToken(colorChartsPaletteCategorical4),
  "Proteínas": hexDoToken(colorChartsPaletteCategorical5),
  "Grãos e Cereais": hexDoToken(colorChartsPaletteCategorical6),
  "Derivados e Processados": hexDoToken(colorChartsPaletteCategorical7),
  Bebidas: hexDoToken(colorChartsPaletteCategorical8),
  "Pães e Panificação": hexDoToken(colorChartsPaletteCategorical9),
  "Mel e Apícolas": hexDoToken(colorChartsPaletteCategorical10),
};
function gerarImagemSimulada(categoria) {
  const cor = COR_POR_CATEGORIA[categoria] ?? "#8c8c94";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="${cor}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(__dirname, "..");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("ERRO: variável DATABASE_URL não encontrada (verifique o .env.local).");
  process.exit(1);
}

const CSV_PATH = path.join(RAIZ, "estoque_inicial.csv");

// ─── Estoque de demonstração ──────────────────────────────────
// O CSV original não tem quantidade (era um campo adicionado depois,
// só existia na planilha real da Elizete). Sem isso, o app inteiro
// fica com "nenhum produto disponível" — a loja parece quebrada.
//
// Este seed dá um estoque inicial plausível pra um punhado de
// produtos (um por categoria, mais os dois montando as cestas da
// semana), só pra loja nascer com cara de loja de verdade em dev.
// Elizete ajusta os números reais depois pelo painel /admin.
const ESTOQUE_DEMO = {
  "cesta-grande": { quantidade: 10 },
  "cesta-pequena": { quantidade: 8 },
  abacate: { quantidade: 12, naCestaGrande: true, naCestaPequena: true },
  "abobora-cabotia": { quantidade: 15, naCestaGrande: true },
  alecrim: { quantidade: 20, naCestaGrande: true },
  amendoim: { quantidade: 10, naCestaGrande: true },
  "acucar-mascavo": { quantidade: 18, naCestaGrande: true },
  "bolo-mandioca": { quantidade: 6, naCestaGrande: true },
  "alface-crespa": { quantidade: 25, naCestaPequena: true },
  "banana-passa": { quantidade: 14, naCestaPequena: true },
  "mel-silvestre-cipo-uva-350": { quantidade: 9, naCestaPequena: true },
  "cachaca-socialista": { quantidade: 5 },
};

// Tags são livres e opcionais — 0, 1 ou várias por produto (diferente
// de categoria, que é única e obrigatória). Um punhado de exemplos só
// pra a interface mostrar a variação de verdade (produto sem tag,
// com 1, com 2+) — Elizete não tem um jeito de editar isso ainda.
const TAGS_DEMO = {
  abacate: ["Orgânico"],
  "abobora-cabotia": ["Orgânico", "Vegano"],
  alecrim: ["Orgânico", "Vegano", "Sem Glúten"],
  amendoim: ["Vegano", "Sem Glúten"],
  "acucar-mascavo": [],
  "bolo-mandioca": ["Vegano"],
  "alface-crespa": ["Orgânico"],
  "banana-passa": ["Sem Glúten", "Vegano"],
  "mel-silvestre-cipo-uva-350": ["Sem Glúten"],
  "cachaca-socialista": ["Artesanal"],
};

// Ingredientes + informação nutricional — só num punhado de produtos
// (mesmo espírito de ESTOQUE_DEMO/TAGS_DEMO: mostrar a variação de
// verdade, não preencher o catálogo inteiro). Cobre os casos que a
// tela de detalhe distingue (ver PaginaProduto.tsx/TabelaNutricional.tsx):
// in natura (abacate, mel, banana-passa — um ingrediente só, o próprio
// produto) e processado (bolo de mandioca — lista real de ingredientes).
//
// NÃO é número digitado à mão: vem de composicao/produtos/saida/produtos_nutricional.json,
// gerado pelo motor de cálculo real (composicao/lib/calculo.py, base
// TBCA 7.2 — ver composicao/README.md) a partir das receitas em
// composicao/produtos/receitas_catalogo.py. Pra adicionar nutrição a
// um novo produto: achar o código TBCA (lib/tbca.buscar_por_nome),
// colocar a receita em receitas_catalogo.py, rodar
// `python3 produtos/gerar_seed_nutricional.py` de dentro de
// composicao/, e rodar este seed de novo — nada aqui precisa mudar.
const NUTRICIONAL_JSON_PATH = path.join(RAIZ, "composicao", "produtos", "saida", "produtos_nutricional.json");
const CATALOGO_NUTRICIONAL = JSON.parse(readFileSync(NUTRICIONAL_JSON_PATH, "utf-8"));

const INGREDIENTES_DEMO = Object.fromEntries(
  Object.entries(CATALOGO_NUTRICIONAL).map(([id, produto]) => [id, produto.ingredientes])
);
const INFO_NUTRICIONAL_DEMO = Object.fromEntries(
  Object.entries(CATALOGO_NUTRICIONAL).map(([id, produto]) => [id, produto.infoNutricional])
);

function paraBool(valor) {
  return String(valor).trim().toUpperCase() === "TRUE";
}

function paraPreco(valor) {
  const numero = parseFloat(String(valor).replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

async function main() {
  console.log(`Lendo: ${CSV_PATH}`);
  const conteudo = readFileSync(CSV_PATH, "utf-8");
  const linhas = parse(conteudo, { columns: true, skip_empty_lines: true, bom: true });

  if (linhas.length === 0) {
    console.error("ERRO: nenhum produto encontrado no CSV.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");

    let inseridos = 0;
    for (const linha of linhas) {
      const id = linha.id?.trim();
      if (!id) continue;

      const nome = linha.nome?.trim() || "";
      const categoria = linha.categoria?.trim() || "";

      await client.query(
        `INSERT INTO produtos (id, nome, preco, unidade, categoria, quantidade, na_cesta_grande, na_cesta_pequena, descricao, imagem_url)
         VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           nome = EXCLUDED.nome,
           preco = EXCLUDED.preco,
           unidade = EXCLUDED.unidade,
           categoria = EXCLUDED.categoria,
           na_cesta_grande = EXCLUDED.na_cesta_grande,
           na_cesta_pequena = EXCLUDED.na_cesta_pequena,
           descricao = EXCLUDED.descricao,
           imagem_url = EXCLUDED.imagem_url`,
        [
          id,
          nome,
          paraPreco(linha.preco),
          linha.unidade?.trim() || "",
          categoria,
          paraBool(linha.naCestaGrande),
          paraBool(linha.naCestaPequena),
          linha.descricao?.trim() || null,
          // O CSV não traz foto real — toda vez que a foto real chegar
          // (linha.imagemUrl preenchida), ela tem prioridade sobre a
          // simulada.
          linha.imagemUrl?.trim() || gerarImagemSimulada(categoria),
        ]
      );
      inseridos++;
    }

    let aplicadosDemo = 0;
    for (const [id, dados] of Object.entries(ESTOQUE_DEMO)) {
      const { rowCount } = await client.query(
        `UPDATE produtos
         SET quantidade = $2,
             na_cesta_grande = COALESCE($3, na_cesta_grande),
             na_cesta_pequena = COALESCE($4, na_cesta_pequena)
         WHERE id = $1`,
        [id, dados.quantidade, dados.naCestaGrande ?? null, dados.naCestaPequena ?? null]
      );
      if (rowCount) aplicadosDemo++;
      else console.warn(`   ⚠ produto de demo "${id}" não existe no CSV — pulado.`);
    }

    let tagsAplicadas = 0;
    for (const [id, tags] of Object.entries(TAGS_DEMO)) {
      const { rowCount } = await client.query(
        `UPDATE produtos SET tags = $2::text[] WHERE id = $1`,
        [id, tags]
      );
      if (rowCount) tagsAplicadas++;
    }

    // Ingredientes: idempotente via DELETE + INSERT (não tem uma chave
    // natural pra ON CONFLICT — a ordem é o que importa, não o texto).
    let ingredientesAplicados = 0;
    for (const [id, ingredientes] of Object.entries(INGREDIENTES_DEMO)) {
      const { rowCount } = await client.query(`DELETE FROM produto_ingredientes WHERE produto_id = $1`, [id]);
      // Não usa rowCount do DELETE pra decidir se o produto existe (0
      // linhas apagadas na primeira vez é normal) — confirma via UPDATE
      // fictício seria mais caro; INSERT abaixo já falha com FK
      // violation se o id não existir no CSV, o que é sinal suficiente.
      for (let i = 0; i < ingredientes.length; i++) {
        await client.query(
          `INSERT INTO produto_ingredientes (produto_id, nome, ordem) VALUES ($1, $2, $3)`,
          [id, ingredientes[i], i]
        );
      }
      ingredientesAplicados++;
    }

    let nutricionalAplicada = 0;
    for (const [id, info] of Object.entries(INFO_NUTRICIONAL_DEMO)) {
      await client.query(
        `INSERT INTO produto_info_nutricional (
           produto_id, porcao, calorias_kcal, gorduras_totais_g, gorduras_saturadas_g,
           gorduras_trans_g, colesterol_mg, sodio_mg, carboidratos_totais_g, fibra_alimentar_g,
           acucares_g, proteinas_g, vitamina_a_mg, vitamina_c_mg, calcio_mg, ferro_mg, potassio_mg
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (produto_id) DO UPDATE SET
           porcao = EXCLUDED.porcao,
           calorias_kcal = EXCLUDED.calorias_kcal,
           gorduras_totais_g = EXCLUDED.gorduras_totais_g,
           gorduras_saturadas_g = EXCLUDED.gorduras_saturadas_g,
           gorduras_trans_g = EXCLUDED.gorduras_trans_g,
           colesterol_mg = EXCLUDED.colesterol_mg,
           sodio_mg = EXCLUDED.sodio_mg,
           carboidratos_totais_g = EXCLUDED.carboidratos_totais_g,
           fibra_alimentar_g = EXCLUDED.fibra_alimentar_g,
           acucares_g = EXCLUDED.acucares_g,
           proteinas_g = EXCLUDED.proteinas_g,
           vitamina_a_mg = EXCLUDED.vitamina_a_mg,
           vitamina_c_mg = EXCLUDED.vitamina_c_mg,
           calcio_mg = EXCLUDED.calcio_mg,
           ferro_mg = EXCLUDED.ferro_mg,
           potassio_mg = EXCLUDED.potassio_mg`,
        [
          id, info.porcao, info.caloriasKcal, info.gordurasTotaisG, info.gordurasSaturadasG,
          info.gordurasTransG, info.colesterolMg, info.sodioMg, info.carboidratosTotaisG, info.fibraAlimentarG,
          info.acucaresG, info.proteinasG, info.vitaminaAMg, info.vitaminaCMg, info.calcioMg, info.ferroMg, info.potassioMg,
        ]
      );
      nutricionalAplicada++;
    }

    // Configurações padrão — mesmo PIN/WhatsApp que o app usava como fallback.
    // Troque o PIN pelo painel /admin depois do primeiro acesso.
    await client.query(
      `INSERT INTO configuracoes (chave, valor) VALUES ('pin', '1234')
       ON CONFLICT (chave) DO NOTHING`
    );
    await client.query(
      `INSERT INTO configuracoes (chave, valor) VALUES ('whatsappNumero', '5517992702323')
       ON CONFLICT (chave) DO NOTHING`
    );

    await client.query("COMMIT");
    console.log(`✅ Seed concluído: ${inseridos} produtos gravados/atualizados.`);
    console.log(`   Estoque de demonstração aplicado em ${aplicadosDemo} produtos.`);
    console.log(`   Tags de demonstração aplicadas em ${tagsAplicadas} produtos.`);
    console.log(`   Ingredientes de demonstração aplicados em ${ingredientesAplicados} produtos.`);
    console.log(`   Info nutricional de demonstração aplicada em ${nutricionalAplicada} produtos.`);
    console.log(`   Configurações padrão: pin=1234 (troque depois!), whatsappNumero=5517992702323`);
  } catch (erro) {
    await client.query("ROLLBACK");
    throw erro;
  } finally {
    await client.end();
  }
}

main().catch((erro) => {
  console.error("ERRO ao popular o banco:", erro);
  process.exitCode = 1;
});
