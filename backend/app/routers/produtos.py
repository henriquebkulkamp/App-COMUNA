# ============================================================
# GET /api/produtos — espelha app/api/produtos/route.ts
# ============================================================

import logging

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..cache import buscar_produtos_cache, produto_to_schema
from ..database import get_session
from ..models import Produto, ProdutoIngrediente, ProdutoInfoNutricional
from ..schemas import InfoNutricionalSchema, ProdutoDetalheSchema, ProdutoSchema

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=list[ProdutoSchema], response_model_exclude_none=True)
async def listar_produtos(session: AsyncSession = Depends(get_session)):
    try:
        return await buscar_produtos_cache(session)
    except Exception as erro:
        logger.error("[GET /api/produtos] Erro ao buscar produtos: %s", erro)
        return JSONResponse(
            status_code=500,
            content={"erro": "Não foi possível carregar os produtos. Tente novamente."},
        )


@router.get("/{produto_id}", response_model=ProdutoDetalheSchema, response_model_exclude_none=True)
async def obter_produto(produto_id: str, session: AsyncSession = Depends(get_session)):
    """Tela de detalhe (PaginaProduto.tsx) — busca UM produto direto (sem
    passar pelo cache da lista, que não teria como invalidar por id) já
    com ingredientes + info nutricional. Sem cache: catálogo pequeno,
    tela visitada bem menos que a vitrine."""
    try:
        produto = await session.get(Produto, produto_id)
        if produto is None:
            return JSONResponse(status_code=404, content={"erro": "Produto não encontrado."})

        ingredientes_resultado = await session.execute(
            select(ProdutoIngrediente.nome)
            .where(ProdutoIngrediente.produto_id == produto_id)
            .order_by(ProdutoIngrediente.ordem)
        )
        info_nutricional = await session.get(ProdutoInfoNutricional, produto_id)

        return ProdutoDetalheSchema(
            **produto_to_schema(produto).model_dump(),
            ingredientes=list(ingredientes_resultado.scalars().all()),
            info_nutricional=(
                InfoNutricionalSchema.model_validate(info_nutricional) if info_nutricional else None
            ),
        )
    except Exception as erro:
        logger.error("[GET /api/produtos/%s] Erro ao buscar produto: %s", produto_id, erro)
        return JSONResponse(
            status_code=500,
            content={"erro": "Não foi possível carregar este produto. Tente novamente."},
        )
