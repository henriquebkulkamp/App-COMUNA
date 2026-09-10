# ============================================================
# MAIN — ponto de entrada do FastAPI. Analogia: o `app = Flask(__name__)`
# + registro de blueprints, só que com FastAPI/routers.
#
# Mesmos paths de app/api/** do Next.js (/api/produtos, /api/pedidos,
# /api/config, /api/admin/**) — o frontend só troca a origem (agora
# aponta pra esse servidor em vez de same-origin), não os caminhos.
# ============================================================

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from .auth import gerar_hash_senha
from .config import settings
from .database import SessionLocal
from .models import Admin
from .routers import admin, config, pedidos, produtos

logger = logging.getLogger(__name__)

app = FastAPI(title="COMUNA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(produtos.router, prefix="/api/produtos", tags=["produtos"])
app.include_router(pedidos.router, prefix="/api/pedidos", tags=["pedidos"])
app.include_router(config.router, prefix="/api/config", tags=["config"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.on_event("startup")
async def semear_admin_padrao() -> None:
    """Cria a conta admin padrão (ADMIN_EMAIL/ADMIN_SENHA do .env) na
    primeira vez que o backend sobe com a tabela `admins` vazia — só
    então, nunca sobrescreve nem duplica em subidas seguintes.
    Analogia: um `python manage.py createsuperuser` que roda sozinho
    uma única vez, em vez de exigir passo manual."""
    async with SessionLocal() as session:
        ja_existe_algum_admin = (await session.execute(select(Admin.id).limit(1))).first() is not None
        if ja_existe_algum_admin:
            return
        session.add(Admin(email=settings.admin_email, senha_hash=gerar_hash_senha(settings.admin_senha)))
        await session.commit()
        logger.info("Conta admin padrão criada: %s (troque a senha depois de logar).", settings.admin_email)


@app.get("/health")
async def health():
    """Fora do prefixo /api/** de propósito — não existia equivalente
    no Next.js, mas é útil pra `docker-compose`/scripts de dev saberem
    quando o backend está pronto (mesmo papel de db/aguardar-postgres.mjs
    pro Postgres)."""
    return {"status": "ok"}
