"""initial schema — espelha db/schema.sql

Revision ID: 0001
Revises:
Create Date: 2026-09-09

NOTA: este banco (o mesmo Postgres do docker-compose.yml) já foi criado
pelo mecanismo antigo (db/schema.sql via db/migrate.mjs) e já tem dados
reais. Rodar `alembic upgrade head` contra ELE vai falhar (tabelas já
existem) — pra esse banco específico, use `alembic stamp head` uma
única vez pra marcar como já migrado, sem re-executar o DDL. Um banco
novo/limpo (ex: CI, outra máquina) usa `alembic upgrade head` normalmente.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CATEGORIAS_VALIDAS = (
    "Cestas",
    "Frutas",
    "Verduras e Legumes",
    "Ervas e Temperos",
    "Proteínas",
    "Grãos e Cereais",
    "Derivados e Processados",
    "Bebidas",
    "Pães e Panificação",
    "Mel e Apícolas",
)
_categorias_sql = ",".join(f"'{c}'" for c in CATEGORIAS_VALIDAS)


def upgrade() -> None:
    op.create_table(
        "produtos",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("nome", sa.Text(), nullable=False),
        sa.Column("preco", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("preco_real", sa.Numeric(10, 2), nullable=True),
        sa.Column("unidade", sa.Text(), nullable=False),
        sa.Column("categoria", sa.Text(), nullable=False),
        sa.Column("quantidade", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("na_cesta_grande", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("na_cesta_pequena", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("imagem_url", sa.Text(), nullable=True),
        sa.Column(
            "tags", sa.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'::text[]")
        ),
        sa.Column("criado_em", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("preco >= 0", name="produtos_preco_check"),
        sa.CheckConstraint("preco_real IS NULL OR preco_real >= 0", name="produtos_preco_real_check"),
        sa.CheckConstraint("quantidade >= 0", name="produtos_quantidade_check"),
        sa.CheckConstraint(f"categoria IN ({_categorias_sql})", name="produtos_categoria_check"),
    )

    op.create_table(
        "configuracoes",
        sa.Column("chave", sa.Text(), primary_key=True),
        sa.Column("valor", sa.Text(), nullable=False, server_default=""),
    )

    op.create_table(
        "pedidos",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("numero_pedido", sa.Text(), nullable=False, unique=True),
        sa.Column("criado_em", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("nome_cliente", sa.Text(), nullable=False),
        sa.Column("celular", sa.Text(), nullable=False),
        sa.Column("tipo_entrega", sa.Text(), nullable=False),
        sa.Column("endereco_entrega", sa.Text(), nullable=True),
        sa.Column("itens", sa.Text(), nullable=False),
        sa.Column("total_preco", sa.Numeric(10, 2), nullable=False),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="Pendente"),
        sa.CheckConstraint("tipo_entrega IN ('retirada', 'entrega')", name="pedidos_tipo_entrega_check"),
        sa.CheckConstraint("total_preco >= 0", name="pedidos_total_preco_check"),
    )

    op.create_table(
        "solicitacoes",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("criado_em", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("numero_pedido", sa.Text(), nullable=False),
        sa.Column("nome_cliente", sa.Text(), nullable=False),
        sa.Column("celular", sa.Text(), nullable=False),
        sa.Column("produtos_solicitados", sa.Text(), nullable=False),
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_atualizado_em()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.atualizado_em = now();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_produtos_atualizado_em
          BEFORE UPDATE ON produtos
          FOR EACH ROW
          EXECUTE FUNCTION set_atualizado_em();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_produtos_atualizado_em ON produtos;")
    op.execute("DROP FUNCTION IF EXISTS set_atualizado_em;")
    op.drop_table("solicitacoes")
    op.drop_table("pedidos")
    op.drop_table("configuracoes")
    op.drop_table("produtos")
