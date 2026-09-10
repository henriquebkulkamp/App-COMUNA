# ============================================================
# GET /api/produtos — espelha app/api/produtos/route.ts
# ============================================================

import logging

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..cache import buscar_produtos_cache
from ..database import get_session
from ..schemas import ProdutoSchema

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
