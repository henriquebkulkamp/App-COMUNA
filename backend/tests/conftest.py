# ============================================================
# conftest.py — fixtures compartilhadas por toda a suite.
#
# Banco: Postgres real (não SQLite — models.py usa ARRAY e upsert
# ON CONFLICT específicos do dialect Postgres), banco separado
# "<banco>_test" derivado do DATABASE_URL de backend/.env, nunca o
# banco de verdade. Precisa do mesmo Postgres que `npm run db:up`
# (raiz) sobe já estar de pé — ver backend/testar-mutacao.sh e
# README do projeto.
#
# Isolamento por teste: cada teste ganha uma sessão presa a um
# savepoint (join_transaction_mode="create_savepoint") — todo
# session.commit() que o código de produção já faz internamente
# (crud.py) só fecha esse savepoint, nunca a transação externa. O
# rollback no fim do teste desfaz TUDO, mesmo o que foi "commitado".
#
# Engine novo por teste (não reaproveitado entre testes): asyncpg
# prende suas conexões ao event loop em que nasceram, e o
# pytest-asyncio cria um event loop novo por teste (escopo padrão é
# "function") — reaproveitar engine entre testes quebraria com esse
# padrão. O custo de recriar é pequeno pra uma suite deste tamanho.
# ============================================================

import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.cache import invalidar_cache_configuracoes, invalidar_cache_produtos
from app.config import settings
from app.database import get_session
from app.main import app
from app.models import Base


def _url_banco_teste() -> str:
    """Deriva a URL do banco de teste trocando só o nome do banco (ex:
    .../comuna -> .../comuna_test) a partir do DATABASE_URL de verdade
    — nunca um valor novo, pra sempre usar as mesmas credenciais que
    já estão configuradas em backend/.env."""
    url = settings.database_url_async
    base, _, nome_banco = url.rpartition("/")
    assert base and nome_banco, f"não consegui separar o nome do banco de {url!r}"
    return f"{base}/{nome_banco}_test"


URL_BANCO_TESTE = _url_banco_teste()
_URL_BASE, _, _NOME_BANCO_TESTE = URL_BANCO_TESTE.rpartition("/")


async def _garantir_banco_teste_existe() -> None:
    """CREATE DATABASE não pode rodar dentro de uma transação — conecta
    direto no banco `postgres` (sempre existe) com autocommit."""
    engine_admin = create_async_engine(f"{_URL_BASE}/postgres", isolation_level="AUTOCOMMIT")
    try:
        async with engine_admin.connect() as conn:
            existe = await conn.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :nome"), {"nome": _NOME_BANCO_TESTE}
            )
            if not existe:
                # Nome do banco vem de settings.database_url_async (não de
                # input externo/usuário) — interpolar aqui é seguro, CREATE
                # DATABASE não aceita parâmetro bind pro nome de qualquer forma.
                await conn.execute(text(f'CREATE DATABASE "{_NOME_BANCO_TESTE}"'))
    finally:
        await engine_admin.dispose()


async def _recriar_schema() -> None:
    """Schema vem direto de models.py (drop_all + create_all), não de
    `alembic upgrade head` — é mais simples e mais rápido pra um banco
    de teste que é recriado o tempo todo. Se um dia models.py e as
    revisions do Alembic divergirem, migrar pra rodar Alembic de
    verdade aqui feharia esse drift; hoje não compensa a complexidade."""
    engine = create_async_engine(URL_BANCO_TESTE)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
    finally:
        await engine.dispose()


@pytest.fixture(scope="session", autouse=True)
def _preparar_banco_teste() -> None:
    """Roda uma vez por sessão de teste, FORA de qualquer event loop do
    pytest-asyncio (fixture síncrona rodando seu próprio asyncio.run) —
    evita prender essa conexão de setup ao loop de um teste específico."""
    asyncio.run(_garantir_banco_teste_existe())
    asyncio.run(_recriar_schema())


@pytest.fixture(autouse=True)
def _sem_cache_entre_testes() -> None:
    """app/cache.py guarda produtos/configurações num dict em memória
    do PROCESSO (TTL de 30s) — sem isso, o cache de um teste (com sua
    própria sessão, desfeita no fim) vazaria pro próximo teste dentro
    da mesma janela de 30s, mostrando dado de um savepoint que já foi
    revertido. Roda antes E depois de cada teste."""
    invalidar_cache_produtos()
    invalidar_cache_configuracoes()
    yield
    invalidar_cache_produtos()
    invalidar_cache_configuracoes()


@pytest_asyncio.fixture
async def session() -> AsyncGenerator[AsyncSession, None]:
    """Sessão isolada por savepoint — ver cabeçalho do arquivo."""
    engine = create_async_engine(URL_BANCO_TESTE)
    try:
        async with engine.connect() as conn:
            transacao_externa = await conn.begin()
            sessao = AsyncSession(bind=conn, join_transaction_mode="create_savepoint", expire_on_commit=False)
            try:
                yield sessao
            finally:
                await sessao.close()
                await transacao_externa.rollback()
    finally:
        await engine.dispose()


@pytest_asyncio.fixture
async def client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Cliente HTTP direto contra o app ASGI, SEM rodar o lifespan
    (ASGITransport não dispara startup/shutdown a menos que a gente
    peça explicitamente) — crucial aqui: o startup real
    (semear_admin_padrao, em app/main.py) usa SessionLocal ligado ao
    banco de PRODUÇÃO, não à `session` de teste acima. Testes que
    precisam de um admin logado criam o próprio Admin via fixture
    (ver `admin_logado` em test_router_admin.py) em vez de depender
    desse seed."""

    async def _session_de_teste() -> AsyncGenerator[AsyncSession, None]:
        yield session

    app.dependency_overrides[get_session] = _session_de_teste
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
    finally:
        app.dependency_overrides.clear()
