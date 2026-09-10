# ============================================================
# CACHE — espelha o cache em memória de 30s de lib/db.ts
# (_produtosCache/_produtosCacheExpiry e _configCache/_configCacheExpiry).
# Só funciona como "mesmo resultado entre requisições" com um único
# processo Uvicorn (sem --workers > 1) — igual a como o Next.js single
# process já se comportava.
# ============================================================

import time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Configuracao, Produto
from .schemas import ProdutoSchema

_produtos_cache: list[ProdutoSchema] | None = None
_produtos_cache_expiry: float = 0.0

_config_cache: dict[str, str] | None = None
_config_cache_expiry: float = 0.0

TTL_SEGUNDOS = 30.0


def invalidar_cache_produtos() -> None:
    global _produtos_cache, _produtos_cache_expiry
    _produtos_cache = None
    _produtos_cache_expiry = 0.0


def invalidar_cache_configuracoes() -> None:
    global _config_cache, _config_cache_expiry
    _config_cache = None
    _config_cache_expiry = 0.0


def produto_to_schema(produto: Produto) -> ProdutoSchema:
    quantidade = produto.quantidade or 0
    return ProdutoSchema(
        id=produto.id,
        nome=produto.nome,
        preco=float(produto.preco),
        preco_real=float(produto.preco_real) if produto.preco_real is not None else None,
        unidade=produto.unidade,
        categoria=produto.categoria,
        # Disponibilidade é 100% derivada da quantidade — mesma regra de lib/db.ts.
        em_estoque=quantidade > 0,
        quantidade=quantidade,
        na_cesta_grande=produto.na_cesta_grande,
        na_cesta_pequena=produto.na_cesta_pequena,
        descricao=produto.descricao,
        imagem_url=produto.imagem_url,
        tags=list(produto.tags or []),
    )


async def buscar_produtos_cache(session: AsyncSession) -> list[ProdutoSchema]:
    global _produtos_cache, _produtos_cache_expiry
    agora = time.monotonic()
    if _produtos_cache is not None and agora < _produtos_cache_expiry:
        return _produtos_cache

    resultado = await session.execute(select(Produto).order_by(Produto.categoria, Produto.nome))
    produtos = [produto_to_schema(p) for p in resultado.scalars().all()]

    _produtos_cache = produtos
    _produtos_cache_expiry = agora + TTL_SEGUNDOS
    return produtos


async def buscar_configuracoes_cache(session: AsyncSession) -> dict[str, str]:
    global _config_cache, _config_cache_expiry
    agora = time.monotonic()
    if _config_cache is not None and agora < _config_cache_expiry:
        return _config_cache

    resultado = await session.execute(select(Configuracao))
    config = {linha.chave: linha.valor or "" for linha in resultado.scalars().all()}

    _config_cache = config
    _config_cache_expiry = agora + TTL_SEGUNDOS
    return config


def preco_efetivo(produto_schema: ProdutoSchema) -> float:
    """Preço que o cliente de fato paga — espelha lib/formatadores.ts."""
    return produto_schema.preco_real if produto_schema.preco_real is not None else produto_schema.preco
