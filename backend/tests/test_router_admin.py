# ============================================================
# test_router_admin.py — /api/admin/**. Validação de entrada é onde
# mais mutante sobrevive sem teste (boundaries de preço/quantidade,
# regex de telefone, categoria/campo permitido) — e toda rota de
# mutação exige Authorization: Bearer válido.
# ============================================================

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import gerar_hash_senha, gerar_token
from app.models import Admin, Produto


@pytest.fixture
async def admin_id(session: AsyncSession) -> int:
    admin = Admin(email="elizete@comuna.local", senha_hash=gerar_hash_senha("segredo123"))
    session.add(admin)
    await session.commit()
    await session.refresh(admin)
    return admin.id


@pytest.fixture
def auth_header(admin_id: int) -> dict:
    return {"Authorization": f"Bearer {gerar_token(admin_id)}"}


async def _criar_produto(session: AsyncSession, **overrides) -> None:
    base = dict(id="abacate", nome="Abacate", preco=5, unidade="kg", categoria="Frutas", quantidade=10)
    base.update(overrides)
    session.add(Produto(**base))
    await session.commit()


# ─── POST /login ─────────────────────────────────────────────────────


async def test_login_sucesso_retorna_token(client: AsyncClient, session: AsyncSession):
    session.add(Admin(email="elizete@comuna.local", senha_hash=gerar_hash_senha("segredo123")))
    await session.commit()

    resposta = await client.post("/api/admin/login", json={"email": "elizete@comuna.local", "senha": "segredo123"})

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["sucesso"] is True
    assert isinstance(corpo["token"], str) and corpo["token"]


async def test_login_senha_errada_retorna_401(client: AsyncClient, session: AsyncSession):
    session.add(Admin(email="elizete@comuna.local", senha_hash=gerar_hash_senha("segredo123")))
    await session.commit()

    resposta = await client.post("/api/admin/login", json={"email": "elizete@comuna.local", "senha": "errada"})
    assert resposta.status_code == 401


async def test_login_sem_email_retorna_400(client: AsyncClient):
    resposta = await client.post("/api/admin/login", json={"senha": "qualquer"})
    assert resposta.status_code == 400


# ─── Toda rota de mutação exige Authorization ───────────────────────


@pytest.mark.parametrize(
    "method,path,body",
    [
        ("PATCH", "/api/admin/config", {"campo": "whatsappNumero", "valor": "5516999999999"}),
        ("PATCH", "/api/admin/estoque", {"produtoId": "abacate", "quantidade": 5}),
        ("PATCH", "/api/admin/preco", {"produtoId": "abacate", "preco": 5}),
        ("PATCH", "/api/admin/preco-real", {"produtoId": "abacate", "precoReal": 4}),
        ("PATCH", "/api/admin/unidade", {"produtoId": "abacate", "unidade": "kg"}),
        ("PATCH", "/api/admin/cesta", {"produtoId": "abacate", "campo": "naCestaGrande", "valor": True}),
        ("POST", "/api/admin/produto", {"id": "x", "nome": "X", "preco": 1, "unidade": "kg", "categoria": "Frutas"}),
        ("DELETE", "/api/admin/produto", {"produtoId": "abacate"}),
    ],
)
async def test_rota_de_mutacao_sem_token_retorna_401(client: AsyncClient, method: str, path: str, body: dict):
    resposta = await client.request(method, path, json=body)
    assert resposta.status_code == 401


# ─── PATCH /config — regex de WhatsApp ──────────────────────────────


@pytest.mark.parametrize("numero", ["5516999999999", "1699999999"])  # 13 e 10 dígitos — limites válidos
async def test_config_whatsapp_aceita_10_a_13_digitos(client: AsyncClient, auth_header: dict, numero: str):
    resposta = await client.patch("/api/admin/config", json={"campo": "whatsappNumero", "valor": numero}, headers=auth_header)
    assert resposta.status_code == 200


@pytest.mark.parametrize("numero", ["169999999", "16999999999999", "abc9999999", ""])  # 9 e 14 dígitos, letra, vazio
async def test_config_whatsapp_rejeita_fora_do_limite(client: AsyncClient, auth_header: dict, numero: str):
    resposta = await client.patch("/api/admin/config", json={"campo": "whatsappNumero", "valor": numero}, headers=auth_header)
    assert resposta.status_code == 400


async def test_config_campo_diferente_de_whatsapp_rejeitado(client: AsyncClient, auth_header: dict):
    resposta = await client.patch("/api/admin/config", json={"campo": "outraCoisa", "valor": "5516999999999"}, headers=auth_header)
    assert resposta.status_code == 400


# ─── PATCH /estoque — boundary de quantidade ────────────────────────


async def test_estoque_quantidade_zero_e_aceita(client: AsyncClient, auth_header: dict, session: AsyncSession):
    await _criar_produto(session)
    resposta = await client.patch("/api/admin/estoque", json={"produtoId": "abacate", "quantidade": 0}, headers=auth_header)
    assert resposta.status_code == 200


async def test_estoque_quantidade_negativa_rejeitada(client: AsyncClient, auth_header: dict):
    resposta = await client.patch("/api/admin/estoque", json={"produtoId": "abacate", "quantidade": -1}, headers=auth_header)
    assert resposta.status_code == 400


# ─── PATCH /preco — boundary de preço (> 0, não >= 0) ───────────────


async def test_preco_zero_e_rejeitado(client: AsyncClient, auth_header: dict):
    resposta = await client.patch("/api/admin/preco", json={"produtoId": "abacate", "preco": 0}, headers=auth_header)
    assert resposta.status_code == 400


async def test_preco_negativo_e_rejeitado(client: AsyncClient, auth_header: dict):
    resposta = await client.patch("/api/admin/preco", json={"produtoId": "abacate", "preco": -5}, headers=auth_header)
    assert resposta.status_code == 400


async def test_preco_minimo_positivo_e_aceito(client: AsyncClient, auth_header: dict, session: AsyncSession):
    await _criar_produto(session)
    resposta = await client.patch("/api/admin/preco", json={"produtoId": "abacate", "preco": 0.01}, headers=auth_header)
    assert resposta.status_code == 200


# ─── PATCH /preco-real — aceita null explícito pra limpar desconto ──


async def test_preco_real_aceita_null_pra_limpar_desconto(client: AsyncClient, auth_header: dict, session: AsyncSession):
    await _criar_produto(session, preco_real=4)
    resposta = await client.patch("/api/admin/preco-real", json={"produtoId": "abacate", "precoReal": None}, headers=auth_header)
    assert resposta.status_code == 200

    produto = await session.get(Produto, "abacate")
    assert produto.preco_real is None


async def test_preco_real_negativo_e_rejeitado(client: AsyncClient, auth_header: dict):
    resposta = await client.patch("/api/admin/preco-real", json={"produtoId": "abacate", "precoReal": -1}, headers=auth_header)
    assert resposta.status_code == 400


# ─── PATCH /cesta — campo fora do permitido ──────────────────────────


async def test_cesta_campo_invalido_rejeitado(client: AsyncClient, auth_header: dict):
    resposta = await client.patch(
        "/api/admin/cesta", json={"produtoId": "abacate", "campo": "campoQualquer", "valor": True}, headers=auth_header
    )
    assert resposta.status_code == 400


# ─── POST /produto — categoria fora da lista ─────────────────────────


async def test_criar_produto_categoria_invalida_rejeitada(client: AsyncClient, auth_header: dict):
    resposta = await client.post(
        "/api/admin/produto",
        json={"id": "novo", "nome": "Novo", "preco": 5, "unidade": "kg", "categoria": "Categoria Inventada"},
        headers=auth_header,
    )
    assert resposta.status_code == 400


async def test_criar_produto_sucesso(client: AsyncClient, auth_header: dict, session: AsyncSession):
    resposta = await client.post(
        "/api/admin/produto",
        json={"id": "novo", "nome": "Novo", "preco": 5, "unidade": "kg", "categoria": "Frutas"},
        headers=auth_header,
    )
    assert resposta.status_code == 200
    assert (await session.get(Produto, "novo")) is not None


# ─── DELETE /produto ──────────────────────────────────────────────────


async def test_remover_produto_inexistente_retorna_500(client: AsyncClient, auth_header: dict):
    # ProdutoNaoEncontrado vira 500 genérico (não 404) — mesmo
    # comportamento do original em Next.js, ver comentário em crud.py.
    resposta = await client.request("DELETE", "/api/admin/produto", json={"produtoId": "nao-existe"}, headers=auth_header)
    assert resposta.status_code == 500
