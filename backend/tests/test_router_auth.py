# ============================================================
# test_router_auth.py — /api/auth/login e /api/auth/cadastro.
# ============================================================

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import gerar_hash_senha
from app.models import Usuario


# ─── POST /api/auth/login ────────────────────────────────────────────


async def test_login_sucesso_retorna_token_e_isadmin(client: AsyncClient, session: AsyncSession):
    session.add(
        Usuario(nome="Elizete", email="elizete@comuna.local", senha_hash=gerar_hash_senha("segredo123"), is_admin=True)
    )
    await session.commit()

    resposta = await client.post("/api/auth/login", json={"email": "elizete@comuna.local", "senha": "segredo123"})

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["sucesso"] is True
    assert isinstance(corpo["token"], str) and corpo["token"]
    assert corpo["nome"] == "Elizete"
    assert corpo["isAdmin"] is True


async def test_login_de_conta_nao_admin_retorna_isadmin_false(client: AsyncClient, session: AsyncSession):
    session.add(
        Usuario(nome="João", email="joao@example.com", senha_hash=gerar_hash_senha("segredo123"), is_admin=False)
    )
    await session.commit()

    resposta = await client.post("/api/auth/login", json={"email": "joao@example.com", "senha": "segredo123"})
    assert resposta.status_code == 200
    assert resposta.json()["isAdmin"] is False


async def test_login_senha_errada_retorna_401(client: AsyncClient, session: AsyncSession):
    session.add(Usuario(nome="Elizete", email="elizete@comuna.local", senha_hash=gerar_hash_senha("segredo123")))
    await session.commit()

    resposta = await client.post("/api/auth/login", json={"email": "elizete@comuna.local", "senha": "errada"})
    assert resposta.status_code == 401


async def test_login_sem_email_retorna_400(client: AsyncClient):
    resposta = await client.post("/api/auth/login", json={"senha": "qualquer"})
    assert resposta.status_code == 400


# ─── POST /api/auth/cadastro ─────────────────────────────────────────


async def test_cadastro_sucesso_retorna_token_e_isadmin_false(client: AsyncClient, session: AsyncSession):
    resposta = await client.post(
        "/api/auth/cadastro", json={"nome": "João", "email": "joao@example.com", "senha": "segredo123"}
    )
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["sucesso"] is True
    assert isinstance(corpo["token"], str) and corpo["token"]
    assert corpo["isAdmin"] is False

    usuario = (await session.execute(select(Usuario).where(Usuario.email == "joao@example.com"))).scalar_one()
    assert usuario.is_admin is False
    assert usuario.nome == "João"


async def test_cadastro_email_duplicado_retorna_409(client: AsyncClient, session: AsyncSession):
    session.add(Usuario(nome="João", email="joao@example.com", senha_hash=gerar_hash_senha("segredo123")))
    await session.commit()

    resposta = await client.post(
        "/api/auth/cadastro", json={"nome": "Outro João", "email": "joao@example.com", "senha": "outrasenha"}
    )
    assert resposta.status_code == 409


async def test_cadastro_senha_curta_retorna_400(client: AsyncClient):
    resposta = await client.post(
        "/api/auth/cadastro", json={"nome": "João", "email": "joao@example.com", "senha": "123"}
    )
    assert resposta.status_code == 400


async def test_cadastro_sem_nome_retorna_400(client: AsyncClient):
    resposta = await client.post(
        "/api/auth/cadastro", json={"email": "joao@example.com", "senha": "segredo123"}
    )
    assert resposta.status_code == 400
