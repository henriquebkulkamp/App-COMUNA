# ============================================================
# CONFIG — variáveis de ambiente do backend, lidas de backend/.env
# (ver backend/.env.example). Analogia: um settings.py do Django,
# só que com Pydantic validando os tipos.
# ============================================================

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Caminho absoluto (backend/.env) — assim funciona não importa de onde
# o processo (uvicorn, alembic, pytest...) foi iniciado.
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")

    database_url: str
    cors_origins: str = "http://localhost:5173"

    # Conta admin padrão — semeada automaticamente na primeira vez que
    # o backend sobe com a tabela `admins` vazia (ver app/main.py).
    admin_email: str = "admin@comuna.local"
    admin_senha: str = "comuna123"

    # Chave que assina os tokens de sessão do login admin (ver app/auth.py).
    # Trocar em produção — qualquer um com essa chave forja token de admin.
    auth_secret_key: str = "troque-esta-chave-em-producao"

    @property
    def database_url_async(self) -> str:
        """DATABASE_URL como veio do .env (postgresql://...) — o driver
        síncrono `psycopg2`/`pg` não serve pro SQLAlchemy async, então
        troca o esquema pra postgresql+asyncpg:// sem exigir que quem
        configura o .env saiba disso (mesmo valor usado por db/*.mjs
        e pelo lib/db.ts antigo funciona aqui sem editar nada)."""
        url = self.database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url

    @property
    def cors_origins_list(self) -> list[str]:
        return [origem.strip() for origem in self.cors_origins.split(",") if origem.strip()]


settings = Settings()
