# ============================================================
# SCHEMAS — espelha lib/types.ts. Python fica snake_case por dentro,
# mas o JSON que entra/sai da API usa os mesmos nomes camelCase que o
# frontend já espera (CamelModel faz essa tradução automaticamente),
# pra minimizar mudança do lado do frontend nessa migração.
# ============================================================

from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


# ─── Produto (lib/types.ts: Produto) ───────────────────────────
Categoria = Literal[
    "Cestas",
    "Frutas",
    "Verduras e Legumes",
    "Ervas e Temperos",
    "Proteínas",
    "Grãos e Cereais",
    "Derivados e Processados",
    "Bebidas",
    "Pães e Panificação",
    "Mel e Apícolas",
]


class ProdutoSchema(CamelModel):
    id: str
    nome: str
    preco: float
    preco_real: float | None = None
    unidade: str
    categoria: str
    em_estoque: bool
    quantidade: int
    na_cesta_grande: bool
    na_cesta_pequena: bool
    descricao: str | None = None
    imagem_url: str | None = None
    tags: list[str] = []


# ─── ItemCarrinho (lib/types.ts: ItemCarrinho) ─────────────────
class ItemCarrinhoSchema(CamelModel):
    produto: ProdutoSchema
    quantidade: int


# ─── Config pública (GET /api/config) ──────────────────────────
class ConfigPublicaSchema(CamelModel):
    whatsapp_numero: str


# ─── Corpo de POST /api/pedidos (lib/types.ts: DadosCliente + total/itens) ──
class PedidoRequest(CamelModel):
    nome_cliente: str
    celular: str
    tipo_entrega: Literal["retirada", "entrega"]
    endereco_entrega: str | None = None
    produtos_solicitados: str | None = None
    observacoes: str | None = None
    total_preco: float
    itens: list[ItemCarrinhoSchema]
