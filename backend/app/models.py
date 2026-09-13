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
    ForeignKey,
    Index,
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


class ProdutoIngrediente(Base):
    """Lista de ingredientes de UM produto, na ordem em que aparecem no
    rótulo (`ordem`, igual à convenção real de rotulagem — ingrediente
    em maior quantidade primeiro). Produto in natura (ex: abacate) tem
    uma única linha, igual ao próprio nome do produto — não existe
    "sem ingrediente nenhum" aqui, só "o ingrediente é o produto"."""

    __tablename__ = "produto_ingredientes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    produto_id: Mapped[str] = mapped_column(
        Text, ForeignKey("produtos.id", ondelete="CASCADE"), nullable=False
    )
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (Index("ix_produto_ingredientes_produto_id", "produto_id"),)


class ProdutoInfoNutricional(Base):
    """Tabela nutricional de UM produto (relação 1:1 — `produto_id` é a
    própria chave primária). Todo nutriente é opcional: NULL = não
    declarado no rótulo (produto sem essa info cadastrada ainda), bem
    diferente de zero — quem exibe (ver frontend/src/lib/nutricional.ts)
    só mostra a linha quando o valor não é nulo, igual a um rótulo real
    só listar o que de fato foi medido.

    Unidades espelham de propósito o padrão de rótulo em
    frontend/src/components/cliente/TabelaNutricional.tsx (peça de
    referência: rótulo estilo FDA/Amazon) — inclusive vitamina A em mg
    (tecnicamente seria mcg/RAE, mas é o que o rótulo de referência
    usa)."""

    __tablename__ = "produto_info_nutricional"

    produto_id: Mapped[str] = mapped_column(
        Text, ForeignKey("produtos.id", ondelete="CASCADE"), primary_key=True
    )
    # Base da tabela — quase sempre "100 g", mas alguns produtos vêm
    # com porção por unidade (ex: "1 unidade (150 g)").
    porcao: Mapped[str] = mapped_column(Text, nullable=False, default="100 g")
    calorias_kcal: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    gorduras_totais_g: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    gorduras_saturadas_g: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    gorduras_trans_g: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    colesterol_mg: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    sodio_mg: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    carboidratos_totais_g: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    fibra_alimentar_g: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    acucares_g: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    proteinas_g: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    vitamina_a_mg: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    vitamina_c_mg: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    calcio_mg: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    ferro_mg: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    potassio_mg: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    __table_args__ = (
        CheckConstraint("calorias_kcal IS NULL OR calorias_kcal >= 0", name="info_nutricional_calorias_check"),
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


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    senha_hash: Mapped[str] = mapped_column(Text, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
