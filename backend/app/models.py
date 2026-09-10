# ============================================================
# MODELS — espelha db/schema.sql exatamente (nomes de tabela/coluna,
# constraints, defaults). Não "melhora" o schema — só descreve em
# SQLAlchemy o que já existe no Postgres.
# ============================================================

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    ARRAY,
    BigInteger,
    Boolean,
    CheckConstraint,
    Integer,
    Numeric,
    Text,
    TIMESTAMP,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


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


class Produto(Base):
    __tablename__ = "produtos"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    # Preço base (de tabela) — sempre exibido, é o único preço quando não há desconto.
    preco: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    # Preço real (com desconto) — opcional. NULL = sem desconto.
    preco_real: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    unidade: Mapped[str] = mapped_column(Text, nullable=False)
    categoria: Mapped[str] = mapped_column(Text, nullable=False)
    # Disponibilidade é 100% derivada da quantidade — não existe coluna
    # separada de "em estoque" (ver schemas.produto_to_schema).
    quantidade: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    na_cesta_grande: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    na_cesta_pequena: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    imagem_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    criado_em: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint("preco >= 0", name="produtos_preco_check"),
        CheckConstraint("preco_real IS NULL OR preco_real >= 0", name="produtos_preco_real_check"),
        CheckConstraint("quantidade >= 0", name="produtos_quantidade_check"),
        CheckConstraint(
            "categoria IN ('Cestas','Frutas','Verduras e Legumes','Ervas e Temperos',"
            "'Proteínas','Grãos e Cereais','Derivados e Processados','Bebidas',"
            "'Pães e Panificação','Mel e Apícolas')",
            name="produtos_categoria_check",
        ),
    )


class Configuracao(Base):
    __tablename__ = "configuracoes"

    chave: Mapped[str] = mapped_column(Text, primary_key=True)
    valor: Mapped[str] = mapped_column(Text, nullable=False, default="")


class Pedido(Base):
    __tablename__ = "pedidos"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    numero_pedido: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    nome_cliente: Mapped[str] = mapped_column(Text, nullable=False)
    celular: Mapped[str] = mapped_column(Text, nullable=False)
    tipo_entrega: Mapped[str] = mapped_column(Text, nullable=False)
    endereco_entrega: Mapped[str | None] = mapped_column(Text, nullable=True)
    itens: Mapped[str] = mapped_column(Text, nullable=False)
    total_preco: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="Pendente")

    __table_args__ = (
        CheckConstraint("tipo_entrega IN ('retirada', 'entrega')", name="pedidos_tipo_entrega_check"),
        CheckConstraint("total_preco >= 0", name="pedidos_total_preco_check"),
    )


class Solicitacao(Base):
    __tablename__ = "solicitacoes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    criado_em: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    numero_pedido: Mapped[str] = mapped_column(Text, nullable=False)
    nome_cliente: Mapped[str] = mapped_column(Text, nullable=False)
    celular: Mapped[str] = mapped_column(Text, nullable=False)
    produtos_solicitados: Mapped[str] = mapped_column(Text, nullable=False)
