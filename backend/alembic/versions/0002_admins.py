"""admins — login do painel administrativo

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-10

Substitui o antigo PIN único (chave "pin" em `configuracoes`, deixada
sem uso, não removida) por contas individuais com senha (hash, nunca
texto puro — ver backend/app/auth.py). Espelha db/schema.sql.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "admins",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.Text(), nullable=False, unique=True),
        sa.Column("senha_hash", sa.Text(), nullable=False),
        sa.Column("criado_em", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("admins")
