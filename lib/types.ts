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
  preco: number;        // em R$ (ex: 8.00)
  unidade: string;      // string de display (ex: "500g", "1 unidade", "250ml")
  categoria: Categoria;
  emEstoque: boolean;   // Elizete controla — true = aparece para o cliente
  quantidade?: number;  // unidades disponíveis — 0 ou ausente = some do cardápio
  naCestaGrande: boolean;  // true = este item está na cesta grande desta semana
  naCestaPequena: boolean; // true = este item está na cesta pequena desta semana
  descricao?: string;   // opcional — breve descrição para o cardápio do cliente
  imagemUrl?: string;   // opcional — URL da foto do produto
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
