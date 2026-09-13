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


# ─── Info nutricional + ingredientes (lib/types.ts: InfoNutricional) ──
# Só aparecem em GET /api/produtos/{id} (tela de detalhe) — GET
# /api/produtos (lista/vitrine) continua leve, sem esse join extra que
# nenhum card usa. Todo campo de nutriente é opcional: NULL = não
# declarado, e quem exibe (TabelaNutricional.tsx) pula a linha.
class InfoNutricionalSchema(CamelModel):
    porcao: str
    calorias_kcal: float | None = None
    gorduras_totais_g: float | None = None
    gorduras_saturadas_g: float | None = None
    gorduras_trans_g: float | None = None
    colesterol_mg: float | None = None
    sodio_mg: float | None = None
    carboidratos_totais_g: float | None = None
    fibra_alimentar_g: float | None = None
    acucares_g: float | None = None
    proteinas_g: float | None = None
    vitamina_a_mg: float | None = None
    vitamina_c_mg: float | None = None
    calcio_mg: float | None = None
    ferro_mg: float | None = None
    potassio_mg: float | None = None


class ProdutoDetalheSchema(ProdutoSchema):
    # Já vem ordenada por `ordem` (ver crud/router) — lista simples de
    # nomes, igual a `tags`; produto in natura tem 1 item só (o próprio
    # nome do produto).
    ingredientes: list[str] = []
    info_nutricional: InfoNutricionalSchema | None = None


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
