"""ingredientes e informação nutricional por produto

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-13

Duas tabelas novas pra tela de detalhe do produto (aba "Ingredientes",
ver PaginaProduto.tsx):

- `produto_ingredientes` — lista ordenada (0 ou mais linhas). Produto
  in natura (ex: abacate) recebe uma única linha com o próprio nome do
  produto — não existe "sem ingrediente", só "o ingrediente é o
  produto".
- `produto_info_nutricional` — 1:1 com produtos (produto_id é a chave
  primária), todo nutriente opcional (NULL = não declarado). Layout de
  exibição (rótulo estilo FDA/Amazon) em
  frontend/src/components/cliente/TabelaNutricional.tsx.

Ambas com ON DELETE CASCADE — remover um produto (ver
crud.remover_produto) limpa ingredientes/nutrição junto, sem deixar
linha órfã.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "produto_ingredientes",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "produto_id",
            sa.Text(),
            sa.ForeignKey("produtos.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("nome", sa.Text(), nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index(
        "ix_produto_ingredientes_produto_id", "produto_ingredientes", ["produto_id"]
    )

    op.create_table(
        "produto_info_nutricional",
        sa.Column(
            "produto_id",
            sa.Text(),
            sa.ForeignKey("produtos.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("porcao", sa.Text(), nullable=False, server_default="100 g"),
        sa.Column("calorias_kcal", sa.Numeric(10, 2), nullable=True),
        sa.Column("gorduras_totais_g", sa.Numeric(10, 2), nullable=True),
        sa.Column("gorduras_saturadas_g", sa.Numeric(10, 2), nullable=True),
        sa.Column("gorduras_trans_g", sa.Numeric(10, 2), nullable=True),
        sa.Column("colesterol_mg", sa.Numeric(10, 2), nullable=True),
        sa.Column("sodio_mg", sa.Numeric(10, 2), nullable=True),
        sa.Column("carboidratos_totais_g", sa.Numeric(10, 2), nullable=True),
        sa.Column("fibra_alimentar_g", sa.Numeric(10, 2), nullable=True),
        sa.Column("acucares_g", sa.Numeric(10, 2), nullable=True),
        sa.Column("proteinas_g", sa.Numeric(10, 2), nullable=True),
        sa.Column("vitamina_a_mg", sa.Numeric(10, 2), nullable=True),
        sa.Column("vitamina_c_mg", sa.Numeric(10, 2), nullable=True),
        sa.Column("calcio_mg", sa.Numeric(10, 2), nullable=True),
        sa.Column("ferro_mg", sa.Numeric(10, 2), nullable=True),
        sa.Column("potassio_mg", sa.Numeric(10, 2), nullable=True),
        sa.CheckConstraint(
            "calorias_kcal IS NULL OR calorias_kcal >= 0", name="info_nutricional_calorias_check"
        ),
    )


def downgrade() -> None:
    op.drop_table("produto_info_nutricional")
    op.drop_index("ix_produto_ingredientes_produto_id", table_name="produto_ingredientes")
    op.drop_table("produto_ingredientes")
