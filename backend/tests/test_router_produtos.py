# ============================================================
# test_router_produtos.py — GET /api/produtos. Rota trivial (delega
# pra buscar_produtos_cache, já coberto em test_cache.py) — smoke test
# de shape/status, sem elaborar mais que isso.
# ============================================================

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Produto


async def test_listar_produtos_vazio(client: AsyncClient):
    resposta = await client.get("/api/produtos")
    assert resposta.status_code == 200
    assert resposta.json() == []


async def test_listar_produtos_retorna_shape_esperado(client: AsyncClient, session: AsyncSession):
    session.add(Produto(id="abacate", nome="Abacate", preco=5, unidade="kg", categoria="Frutas", quantidade=10))
    await session.commit()

    resposta = await client.get("/api/produtos")
    assert resposta.status_code == 200
    [produto] = resposta.json()
    assert produto["id"] == "abacate"
    assert produto["emEstoque"] is True  # camelCase confirmado (CamelModel)
