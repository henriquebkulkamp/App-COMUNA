# ============================================================
# MAIN — ponto de entrada do FastAPI. Analogia: o `app = Flask(__name__)`
# + registro de blueprints, só que com FastAPI/routers.
#
# Mesmos paths de app/api/** do Next.js (/api/produtos, /api/pedidos,
# /api/config, /api/admin/**) — o frontend só troca a origem (agora
# aponta pra esse servidor em vez de same-origin), não os caminhos.
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import admin, config, pedidos, produtos

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


@app.get("/health")
async def health():
    """Fora do prefixo /api/** de propósito — não existia equivalente
    no Next.js, mas é útil pra `docker-compose`/scripts de dev saberem
    quando o backend está pronto (mesmo papel de db/aguardar-postgres.mjs
    pro Postgres)."""
    return {"status": "ok"}
