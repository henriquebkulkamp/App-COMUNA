# ============================================================
# test_router_config.py — GET /api/config. Rota trivial (delega pra
# buscar_configuracoes_cache) — smoke test de shape/status.
# ============================================================

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Configuracao


async def test_config_publica_sem_configuracao_salva_retorna_vazio(client: AsyncClient):
    resposta = await client.get("/api/config")
    assert resposta.status_code == 200
    assert resposta.json() == {"whatsappNumero": ""}


async def test_config_publica_retorna_whatsapp_salvo(client: AsyncClient, session: AsyncSession):
    session.add(Configuracao(chave="whatsappNumero", valor="5516999999999"))
    await session.commit()

    resposta = await client.get("/api/config")
    assert resposta.status_code == 200
    assert resposta.json() == {"whatsappNumero": "5516999999999"}


async def test_config_publica_nunca_expoe_outras_chaves(client: AsyncClient, session: AsyncSession):
    # Mesmo que outra config exista no banco (ex: um resquício de PIN),
    # a rota pública só devolve whatsappNumero — nunca o resto.
    session.add(Configuracao(chave="algumaCoisaSensivel", valor="nao-deveria-vazar"))
    await session.commit()

    resposta = await client.get("/api/config")
    assert resposta.json() == {"whatsappNumero": ""}
