// ============================================================
// TIPOS CENTRAIS DO APP COMUNA
// Analogia Python: é como definir dataclasses ou TypedDicts
// Aqui declaramos o "schema" de cada objeto que circula no app
// ============================================================

// Categorias dos produtos — usadas para filtrar e organizar
// Analogia: é como um ENUM ou uma lista de constantes em Python
export type Categoria =
  | "Cestas"
  | "Frutas"
  | "Verduras e Legumes"
  | "Ervas e Temperos"
  | "Proteínas"
  | "Grãos e Cereais"
  | "Derivados e Processados"
  | "Bebidas"
  | "Pães e Panificação"
  | "Mel e Apícolas";

// O produto é a unidade central de dados do sistema
// Analogia Python:
// @dataclass
// class Produto:
//   id: str
//   nome: str
//   preco: float
//   ...
export interface Produto {
  id: string;
  nome: string;
  preco: number;        // preço base, em R$ (ex: 8.00)
  precoReal?: number;   // preço com desconto, em R$ — undefined/igual a `preco` = sem desconto
  unidade: string;      // string de display (ex: "500g", "1 unidade", "250ml")
  categoria: Categoria;
  emEstoque: boolean;   // Elizete controla — true = aparece para o cliente
  quantidade?: number;  // unidades disponíveis — 0 ou ausente = some do cardápio
  naCestaGrande: boolean;  // true = este item está na cesta grande desta semana
  naCestaPequena: boolean; // true = este item está na cesta pequena desta semana
  descricao?: string;   // opcional — breve descrição para o cardápio do cliente
  imagemUrl?: string;   // opcional — URL (ou data URI) da foto do produto
  tags?: string[];      // livres e opcionais — 0, 1 ou várias por produto
}

// Tabela nutricional de um produto — todo campo opcional (ausente =
// não declarado no rótulo, ver TabelaNutricional.tsx: a linha some,
// não vira "0"). Espelha backend/app/schemas.py: InfoNutricionalSchema.
export interface InfoNutricional {
  porcao: string;
  caloriasKcal?: number;
  gordurasTotaisG?: number;
  gordurasSaturadasG?: number;
  gordurasTransG?: number;
  colesterolMg?: number;
  sodioMg?: number;
  carboidratosTotaisG?: number;
  fibraAlimentarG?: number;
  acucaresG?: number;
  proteinasG?: number;
  vitaminaAMg?: number;
  vitaminaCMg?: number;
  calcioMg?: number;
  ferroMg?: number;
  potassioMg?: number;
}

// Produto + o que só a tela de detalhe usa (GET /api/produtos/:id) —
// a vitrine/carrossel continuam com o `Produto` de sempre, mais leve
// (GET /api/produtos não faz o join de ingredientes/nutrição).
export interface ProdutoDetalhe extends Produto {
  // Já vem ordenada — produto in natura (ex: abacate) tem 1 item só,
  // igual ao próprio nome do produto.
  ingredientes: string[];
  infoNutricional?: InfoNutricional;
}

// Um item dentro do carrinho de compras
// É um Produto + a quantidade que o cliente quer
export interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
}

// Dados do cliente preenchidos no checkout
export interface DadosCliente {
  nome: string;
  celular: string;
  tipoEntrega: "retirada" | "entrega";
  enderecoEntrega?: string; // só preenchido se tipoEntrega === "entrega"
  produtosSolicitados?: string;
  observacoes?: string;
}

// Configuração da cesta da semana (datas e status)
export interface ConfigCestaSemana {
  dataAtualizacao: string; // ISO string da última vez que Elizete montou a cesta
  cestaGrandeAtiva: boolean;
  cestaPequenaAtiva: boolean;
}

// Estado completo da loja (salvo no localStorage)
// Analogia: é como um dicionário JSON salvo em arquivo — nossa "database" temporária
export interface EstadoLoja {
  produtos: Produto[];
  configCesta: ConfigCestaSemana;
}
