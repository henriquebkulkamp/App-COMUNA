# ============================================================
# DATABASE — engine/sessão async do SQLAlchemy. Analogia: o Pool de
# conexões que lib/db.ts mantinha (global._comunaPgPool), só que via
# SQLAlchemy em vez do driver `pg` cru.
# ============================================================

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .config import settings

engine = create_async_engine(settings.database_url_async, echo=False)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency do FastAPI — uma sessão por request, fechada no final.
    Analogia: `with Session() as session: yield session` do SQLAlchemy,
    injetado via Depends() em cada rota que precisa do banco."""
    async with SessionLocal() as session:
        yield session
