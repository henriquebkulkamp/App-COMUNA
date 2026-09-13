"""usuarios — login deixa de ser só pra admin

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-12

Renomeia `admins` para `usuarios` e adiciona `nome` + `is_admin`.
Login passa a valer pra qualquer conta (POST /api/auth/login) — o que
diferencia é o `is_admin` de cada uma, não mais "estar ou não nessa
tabela". A conta existente (semeada por semear_admin_padrao) vira
admin de verdade via backfill; contas novas (POST /api/auth/cadastro)
nascem com is_admin=false.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.rename_table("admins", "usuarios")
    op.add_column("usuarios", sa.Column("nome", sa.Text(), nullable=False, server_default=""))
    op.add_column(
        "usuarios", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false())
    )
    # Backfill: toda conta que já existia (só podia ser admin, era a
    # única finalidade da tabela `admins`) vira is_admin=true.
    op.execute("UPDATE usuarios SET is_admin = true")


def downgrade() -> None:
    op.drop_column("usuarios", "is_admin")
    op.drop_column("usuarios", "nome")
    op.rename_table("usuarios", "admins")
