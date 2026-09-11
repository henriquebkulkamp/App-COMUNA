# ============================================================
# test_cache.py — app/cache.py: TTL de 30s e a conversão
# Produto (modelo) -> ProdutoSchema (resposta).
# ============================================================

import time

from sqlalchemy.ext.asyncio import AsyncSession

from app import cache
from app.models import Produto


def _produto_transiente(**overrides) -> Produto:
    # Objeto NUNCA passa pelo banco (sem session.add/commit) — por
    # isso precisa passar explicitamente todo campo que normalmente
    # viria de um default de coluna (na_cesta_grande/na_cesta_pequena),
    # senão fica None em vez de False e produto_to_schema (que exige
    # bool, não bool | None) rejeita.
    base = dict(
        id="x", nome="X", preco=5, unidade="kg", categoria="Frutas",
        quantidade=1, na_cesta_grande=False, na_cesta_pequena=False, tags=[],
    )
    base.update(overrides)
    return Produto(**base)


# ─── produto_to_schema ───────────────────────────────────────────────


def test_produto_to_schema_quantidade_none_vira_zero():
    schema = cache.produto_to_schema(_produto_transiente(quantidade=None, tags=None))
    assert schema.quantidade == 0
    assert schema.em_estoque is False


def test_produto_to_schema_quantidade_positiva_em_estoque_true():
    schema = cache.produto_to_schema(_produto_transiente(quantidade=3))
    assert schema.em_estoque is True


def test_produto_to_schema_tags_none_vira_lista_vazia():
    schema = cache.produto_to_schema(_produto_transiente(tags=None))
    assert schema.tags == []


def test_produto_to_schema_sem_preco_real_fica_none():
    schema = cache.produto_to_schema(_produto_transiente(preco_real=None))
    assert schema.preco_real is None


def test_produto_to_schema_preserva_descricao():
    schema = cache.produto_to_schema(_produto_transiente(descricao="Orgânico, colhido na hora"))
    assert schema.descricao == "Orgânico, colhido na hora"


def test_produto_to_schema_preserva_imagem_url():
    schema = cache.produto_to_schema(_produto_transiente(imagem_url="data:image/svg+xml;base64,xyz"))
    assert schema.imagem_url == "data:image/svg+xml;base64,xyz"


def test_produto_to_schema_preserva_tags_nao_vazias():
    schema = cache.produto_to_schema(_produto_transiente(tags=["Orgânico", "Sem agrotóxico"]))
    assert schema.tags == ["Orgânico", "Sem agrotóxico"]


def test_produto_to_schema_quantidade_exatamente_um_em_estoque_true():
    # Boundary exato de `em_estoque = quantidade > 0`: 1 já é estoque
    # disponível (mata mutante que trocasse `> 0` por `> 1`).
    schema = cache.produto_to_schema(_produto_transiente(quantidade=1))
    assert schema.em_estoque is True


def test_produto_to_schema_quantidade_zero_em_estoque_false():
    schema = cache.produto_to_schema(_produto_transiente(quantidade=0))
    assert schema.em_estoque is False


# ─── invalidar_cache_produtos / invalidar_cache_configuracoes ───────


def test_invalidar_cache_produtos_zera_cache_e_expiracao():
    cache._produtos_cache = ["qualquer coisa"]
    cache._produtos_cache_expiry = 999999.0

    cache.invalidar_cache_produtos()

    assert cache._produtos_cache is None
    assert cache._produtos_cache_expiry == 0.0


def test_invalidar_cache_configuracoes_zera_cache_e_expiracao():
    cache._config_cache = {"whatsappNumero": "123"}
    cache._config_cache_expiry = 999999.0

    cache.invalidar_cache_configuracoes()

    assert cache._config_cache is None
    assert cache._config_cache_expiry == 0.0


# ─── buscar_produtos_cache — TTL ─────────────────────────────────────


async def test_buscar_produtos_cache_reusa_dentro_do_ttl(session: AsyncSession, monkeypatch):
    session.add(Produto(id="abacate", nome="Abacate", preco=5, unidade="kg", categoria="Frutas", quantidade=10))
    await session.commit()

    agora = time.monotonic()
    monkeypatch.setattr(time, "monotonic", lambda: agora)

    primeira = await cache.buscar_produtos_cache(session)
    assert len(primeira) == 1

    # Insere um segundo produto DEPOIS do cache já ter sido populado —
    # se o cache está de verdade sendo reusado (ainda dentro do TTL),
    # a segunda chamada não pode enxergar esse produto novo.
    session.add(Produto(id="banana", nome="Banana", preco=3, unidade="kg", categoria="Frutas", quantidade=5))
    await session.commit()

    monkeypatch.setattr(time, "monotonic", lambda: agora + cache.TTL_SEGUNDOS - 1)  # ainda dentro do TTL
    segunda = await cache.buscar_produtos_cache(session)
    assert len(segunda) == 1  # cache, não reconsultou


async def test_buscar_produtos_cache_reconsulta_apos_expirar(session: AsyncSession, monkeypatch):
    session.add(Produto(id="abacate", nome="Abacate", preco=5, unidade="kg", categoria="Frutas", quantidade=10))
    await session.commit()

    agora = time.monotonic()
    monkeypatch.setattr(time, "monotonic", lambda: agora)
    await cache.buscar_produtos_cache(session)

    session.add(Produto(id="banana", nome="Banana", preco=3, unidade="kg", categoria="Frutas", quantidade=5))
    await session.commit()

    monkeypatch.setattr(time, "monotonic", lambda: agora + cache.TTL_SEGUNDOS + 1)  # depois do TTL
    depois = await cache.buscar_produtos_cache(session)
    assert len(depois) == 2  # reconsultou, enxerga o produto novo


async def test_buscar_produtos_cache_boundary_exato_do_ttl_ainda_e_cache(session: AsyncSession, monkeypatch):
    # Mata mutante que trocasse `agora < expiry` por `agora <= expiry`:
    # no instante EXATO da expiração, o cache já não vale mais (usa
    # `<`, estritamente antes) — só o instante logo ANTES do boundary
    # ainda é cache.
    session.add(Produto(id="abacate", nome="Abacate", preco=5, unidade="kg", categoria="Frutas", quantidade=10))
    await session.commit()

    agora = time.monotonic()
    monkeypatch.setattr(time, "monotonic", lambda: agora)
    await cache.buscar_produtos_cache(session)

    session.add(Produto(id="banana", nome="Banana", preco=3, unidade="kg", categoria="Frutas", quantidade=5))
    await session.commit()

    # Exatamente no instante de expiração (agora + TTL): já expirou.
    monkeypatch.setattr(time, "monotonic", lambda: agora + cache.TTL_SEGUNDOS)
    resultado = await cache.buscar_produtos_cache(session)
    assert len(resultado) == 2


async def test_buscar_produtos_cache_ordena_por_categoria_depois_nome(session: AsyncSession):
    # Categoria é a chave de ordenação PRIMÁRIA — "Frutas" vem antes de
    # "Verduras e Legumes" mesmo que o nome, sozinho, mandasse o
    # produto de Verduras pra frente (mata mutante que trocasse
    # order_by(categoria, nome) por só order_by(nome)).
    session.add(Produto(id="abacaxi", nome="Abacaxi", preco=5, unidade="kg", categoria="Verduras e Legumes", quantidade=1))
    session.add(Produto(id="zamora", nome="Zamora", preco=5, unidade="kg", categoria="Frutas", quantidade=1))
    await session.commit()

    produtos = await cache.buscar_produtos_cache(session)
    assert [p.id for p in produtos] == ["zamora", "abacaxi"]  # Frutas antes de Verduras, apesar do nome


async def test_buscar_produtos_cache_ordena_por_nome_dentro_da_mesma_categoria(session: AsyncSession):
    # Nome é a chave SECUNDÁRIA — dentro da mesma categoria, ordena
    # alfabético (mata mutante que dropasse esse segundo critério).
    session.add(Produto(id="zabacate", nome="Zabacate", preco=5, unidade="kg", categoria="Frutas", quantidade=1))
    session.add(Produto(id="abacaxi", nome="Abacaxi", preco=5, unidade="kg", categoria="Frutas", quantidade=1))
    await session.commit()

    produtos = await cache.buscar_produtos_cache(session)
    assert [p.id for p in produtos] == ["abacaxi", "zabacate"]


# ─── buscar_configuracoes_cache — TTL (mesmo mecanismo de produtos) ─


async def test_buscar_configuracoes_cache_reusa_dentro_do_ttl(session: AsyncSession, monkeypatch):
    from app.models import Configuracao

    session.add(Configuracao(chave="whatsappNumero", valor="5516111111111"))
    await session.commit()

    agora = time.monotonic()
    monkeypatch.setattr(time, "monotonic", lambda: agora)
    primeira = await cache.buscar_configuracoes_cache(session)
    assert primeira == {"whatsappNumero": "5516111111111"}

    session.add(Configuracao(chave="outraChave", valor="outroValor"))
    await session.commit()

    monkeypatch.setattr(time, "monotonic", lambda: agora + cache.TTL_SEGUNDOS - 1)
    segunda = await cache.buscar_configuracoes_cache(session)
    assert segunda == {"whatsappNumero": "5516111111111"}  # cache, sem "outraChave"


async def test_buscar_configuracoes_cache_reconsulta_apos_expirar(session: AsyncSession, monkeypatch):
    from app.models import Configuracao

    session.add(Configuracao(chave="whatsappNumero", valor="5516111111111"))
    await session.commit()

    agora = time.monotonic()
    monkeypatch.setattr(time, "monotonic", lambda: agora)
    await cache.buscar_configuracoes_cache(session)

    session.add(Configuracao(chave="outraChave", valor="outroValor"))
    await session.commit()

    monkeypatch.setattr(time, "monotonic", lambda: agora + cache.TTL_SEGUNDOS + 1)
    depois = await cache.buscar_configuracoes_cache(session)
    assert depois == {"whatsappNumero": "5516111111111", "outraChave": "outroValor"}


async def test_buscar_configuracoes_cache_boundary_exato_do_ttl_ainda_e_cache(session: AsyncSession, monkeypatch):
    from app.models import Configuracao

    session.add(Configuracao(chave="whatsappNumero", valor="5516111111111"))
    await session.commit()

    agora = time.monotonic()
    monkeypatch.setattr(time, "monotonic", lambda: agora)
    await cache.buscar_configuracoes_cache(session)

    session.add(Configuracao(chave="outraChave", valor="outroValor"))
    await session.commit()

    monkeypatch.setattr(time, "monotonic", lambda: agora + cache.TTL_SEGUNDOS)  # exatamente no boundary: já expirou
    resultado = await cache.buscar_configuracoes_cache(session)
    assert "outraChave" in resultado


async def test_buscar_configuracoes_cache_valor_vazio_fica_vazio_nao_placeholder(session: AsyncSession):
    from app.models import Configuracao

    session.add(Configuracao(chave="whatsappNumero", valor=""))
    await session.commit()

    resultado = await cache.buscar_configuracoes_cache(session)
    assert resultado["whatsappNumero"] == ""


# ─── preco_efetivo (moléstia de app/cache.py, não do router) ────────


def test_preco_efetivo_cache_usa_preco_real_quando_presente():
    schema = cache.produto_to_schema(_produto_transiente(preco=10, preco_real=7))
    assert cache.preco_efetivo(schema) == 7


def test_preco_efetivo_cache_cai_pro_preco_sem_desconto():
    schema = cache.produto_to_schema(_produto_transiente(preco=10, preco_real=None))
    assert cache.preco_efetivo(schema) == 10
