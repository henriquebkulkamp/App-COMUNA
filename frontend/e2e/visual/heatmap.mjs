// ============================================================
// heatmap.mjs — gera o heatmap do delta entre duas screenshots.
// Separado de gerar-relatorio.mjs pra dar pra testar isolado (sem
// depender do Playwright rodando).
//
// Usa uma lib de heatmap de verdade — `simpleheat` (a mesma técnica
// por trás dos heatmaps de clique/densidade tipo Leaflet.heat): cada
// ponto "quente" vira um círculo borrado (native, via canvas), pintado
// com opacidade proporcional à intensidade, e os círculos se acumulam
// uns sobre os outros. Isso é DIFERENTE de aplicar um blur gaussiano
// numa imagem já pronta (o que tentamos antes, com `sharp`) — é a
// própria técnica de "espalhar calor" ponto a ponto, só que a lib faz
// isso via canvas nativo em vez da gente reimplementar (já tentamos:
// kernel gaussiano exato em JS, KDE por espalhamento de pontos na mão
// e dilatação aditiva sucessiva — todos hand-rolled e com problema de
// performance ou overflow). `@napi-rs/canvas` dá o Canvas 2D nativo
// (Skia) que a lib precisa pra rodar fora do browser.
//
// Pipeline:
// 1. Diferença pixel a pixel: distância euclidiana em RGB entre
//    expected/actual — "quanto" cada pixel mudou.
// 2. Reduz pra uma grade de pontos (1 ponto a cada poucos pixels, com
//    o maior valor da célula) — não dá pra mandar 1 ponto por pixel
//    pra a lib sem ela ficar lenta com imagens grandes.
// 3. `simpleheat` desenha um círculo borrado por ponto (opacidade =
//    intensidade) num canvas — a "espalhada" fica por conta da lib.
// 4. Extrai o canal alpha resultante (é onde a lib acumula a
//    intensidade final por pixel) e normaliza 0..1 pelo min/max real
//    desta imagem — não um teto teórico.
// 5. Escala de cor com 4 pontos: preto (nada mudou) -> azul escuro ->
//    azul claro -> branco (mudou muito), sempre 100% opaco (a
//    intensidade vai só na cor, não na transparência do PNG final).
// ============================================================

import { readFileSync, existsSync } from "node:fs";
import { PNG } from "pngjs";
import { Canvas } from "@napi-rs/canvas";
import simpleheat from "simpleheat";

// Tamanho da célula da grade (px) — resolução com que a diferença é
// amostrada antes de virar pontos pra lib. Pequeno o bastante pra não
// perder detalhe fino (texto, ícones), grande o bastante pra manter o
// número de pontos (e portanto o tempo de desenho) sob controle.
const CELULA = 3;
// Raio do círculo de cada ponto e o borrão (blur) aplicado nele —
// pequenos o bastante pra não "vazar" por cima de elementos pequenos
// que não mudaram (testado contra o botão/ícone do cabeçalho: com
// valores maiores o buraco preto do botão inteiro sumia debaixo do
// borrão dos pontos vizinhos).
const RAIO_PONTO = 2;
const BLUR_PONTO = 4;

// Escala: preto -> azul escuro -> azul claro -> branco.
const PONTOS_RAMPA = [
  [0, 0, 0],
  [15, 45, 130],
  [110, 190, 255],
  [255, 255, 255],
];
function corDaRampa(t) {
  const posicao = Math.min(1, Math.max(0, t)) * (PONTOS_RAMPA.length - 1);
  const indice = Math.min(PONTOS_RAMPA.length - 2, Math.floor(posicao));
  const fracao = posicao - indice;
  const [r1, g1, b1] = PONTOS_RAMPA[indice];
  const [r2, g2, b2] = PONTOS_RAMPA[indice + 1];
  return [r1 + (r2 - r1) * fracao, g1 + (g2 - g1) * fracao, b1 + (b2 - b1) * fracao];
}

/** Gera o heatmap a partir de dois caminhos de arquivo PNG (expected,
 * actual) e devolve um data URI, ou `null` se algum arquivo faltar ou
 * as dimensões não baterem (nesse caso quem chama cai pro diff padrão
 * do Playwright — ver gerar-relatorio.mjs). */
export function gerarHeatmap(caminhoExpected, caminhoActual) {
  if (!caminhoExpected || !caminhoActual || !existsSync(caminhoExpected) || !existsSync(caminhoActual)) {
    return null;
  }
  const esperada = PNG.sync.read(readFileSync(caminhoExpected));
  const capturada = PNG.sync.read(readFileSync(caminhoActual));
  if (esperada.width !== capturada.width || esperada.height !== capturada.height) {
    return null; // dimensões diferentes (ex: mudou o layout) — sem heatmap pixel a pixel possível
  }

  const { width, height } = esperada;

  // 1 e 2. Diferença pixel a pixel, reduzida a uma grade de pontos —
  // cada célula vira 1 ponto com o MAIOR delta encontrado nela (não a
  // média — um detalhe fino que mudou não pode ser "diluído" por
  // vizinhos que não mudaram).
  const colunas = Math.ceil(width / CELULA);
  const linhas = Math.ceil(height / CELULA);
  const grade = new Float32Array(colunas * linhas);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dr = esperada.data[idx] - capturada.data[idx];
      const dg = esperada.data[idx + 1] - capturada.data[idx + 1];
      const db = esperada.data[idx + 2] - capturada.data[idx + 2];
      const distancia = Math.sqrt((dr * dr + dg * dg + db * db) / 3); // /3 pra caber em 0-255 (0-441 estourava)
      const iGrade = Math.floor(y / CELULA) * colunas + Math.floor(x / CELULA);
      if (distancia > grade[iGrade]) grade[iGrade] = distancia;
    }
  }

  let maximo = 0;
  const pontos = [];
  for (let cy = 0; cy < linhas; cy++) {
    for (let cx = 0; cx < colunas; cx++) {
      const v = grade[cy * colunas + cx];
      if (v > 0) {
        pontos.push([cx * CELULA + CELULA / 2, cy * CELULA + CELULA / 2, v]);
        if (v > maximo) maximo = v;
      }
    }
  }

  // 3. A lib desenha os pontos borrados num canvas nativo.
  const canvas = new Canvas(width, height);
  const heat = simpleheat(canvas);
  // simpleheat cria canvases auxiliares (o "carimbo" do círculo e o
  // gradiente) chamando `new this._canvas.constructor()` sem
  // argumentos — o Canvas do @napi-rs/canvas exige width/height no
  // construtor, então isso quebraria. Sobrescreve só essa fábrica.
  heat._createCanvas = () => new Canvas(1, 1);
  heat.data(pontos);
  heat.max(maximo || 1);
  heat.radius(RAIO_PONTO, BLUR_PONTO);
  heat.gradient({
    0: `rgb(${PONTOS_RAMPA[0].join(",")})`,
    0.33: `rgb(${PONTOS_RAMPA[1].join(",")})`,
    0.66: `rgb(${PONTOS_RAMPA[2].join(",")})`,
    1: `rgb(${PONTOS_RAMPA[3].join(",")})`,
  });
  heat.draw(0); // minOpacity=0 — onde não tem ponto nenhum, fica transparente/preto de verdade

  // 4. A lib guarda a intensidade final no canal alpha (é o que ela
  // usa pra buscar a cor no gradiente) — lê de volta pra normalizar
  // pelo min/max real desta imagem, igual fazíamos com o blur gaussiano.
  const ctx = canvas.getContext("2d");
  const bruta = ctx.getImageData(0, 0, width, height).data;

  let minimo = 255;
  let alphaMax = 0;
  for (let i = 3; i < bruta.length; i += 4) {
    if (bruta[i] < minimo) minimo = bruta[i];
    if (bruta[i] > alphaMax) alphaMax = bruta[i];
  }
  const amplitude = alphaMax - minimo || 1; // evita divisão por zero quando não há diferença nenhuma

  // 5. Coloriza a partir do alpha normalizado — sempre opaco no PNG
  // final (a intensidade vai só na cor, nunca na transparência).
  const heatmap = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const t = (bruta[idx + 3] - minimo) / amplitude;
    const [r, g, b] = corDaRampa(t);
    heatmap.data[idx] = Math.round(r);
    heatmap.data[idx + 1] = Math.round(g);
    heatmap.data[idx + 2] = Math.round(b);
    heatmap.data[idx + 3] = 255;
  }

  return `data:image/png;base64,${PNG.sync.write(heatmap).toString("base64")}`;
}
