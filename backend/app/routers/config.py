# ============================================================
# GET /api/config — espelha app/api/config/route.ts
#
# Configurações públicas usadas pelo cliente (ex: número de WhatsApp).
# NUNCA retorna o PIN.
# ============================================================

import logging

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..cache import buscar_configuracoes_cache
from ..database import get_session
from ..schemas import ConfigPublicaSchema

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=ConfigPublicaSchema)
async def obter_config_publica(session: AsyncSession = Depends(get_session)):
    try:
        config = await buscar_configuracoes_cache(session)
        return ConfigPublicaSchema(whatsapp_numero=config.get("whatsappNumero", ""))
    except Exception as erro:
        logger.error("[GET /api/config] Erro ao buscar configurações: %s", erro)
        return JSONResponse(
            status_code=500,
            content={"erro": "Não foi possível carregar as configurações."},
        )
