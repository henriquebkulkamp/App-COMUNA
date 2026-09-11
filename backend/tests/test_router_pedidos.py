# ============================================================
# test_router_pedidos.py — POST /api/pedidos.
# ============================================================

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Pedido, Produto
from app.routers.pedidos import _preco_efetivo


# ─── _preco_efetivo (helper local do router) ────────────────────────


def test_preco_efetivo_usa_preco_real_quando_presente():
    assert _preco_efetivo({"preco": 10, "precoReal": 7}) == 7


def test_preco_efetivo_cai_pro_preco_quando_preco_real_e_none():
    assert _preco_efetivo({"preco": 10, "precoReal": None}) == 10


def test_preco_efetivo_cai_pro_preco_quando_preco_real_ausente():
    assert _preco_efetivo({"preco": 10}) == 10


def test_preco_efetivo_sem_preco_nem_preco_real_vira_zero():
    # `.get("preco", 0)` — mata mutante que trocasse o default 0 por
    # nenhum default (viraria None em vez de 0 quando "preco" falta).
    assert _preco_efetivo({}) == 0


# ─── POST /api/pedidos ────────────────────────────────────────────────


def _item(produto_id="abacate", nome="Abacate", preco=5, preco_real=None, unidade="kg", quantidade=2):
    return {
        "produto": {"id": produto_id, "nome": nome, "preco": preco, "precoReal": preco_real, "unidade": unidade},
        "quantidade": quantidade,
    }


async def test_criar_pedido_sucesso_desconta_estoque_e_salva(client: AsyncClient, session: AsyncSession):
    session.add(Produto(id="abacate", nome="Abacate", preco=5, unidade="kg", categoria="Frutas", quantidade=10))
    await session.commit()

    resposta = await client.post(
        "/api/pedidos",
        json={
            "nomeCliente": "Elizete",
            "celular": "11999999999",
            "tipoEntrega": "retirada",
            "totalPreco": 10.0,
            "itens": [_item(quantidade=3)],
        },
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["sucesso"] is True
    assert corpo["numeroPedido"].startswith("PED-")

    produto = await session.get(Produto, "abacate")
    assert produto.quantidade == 7  # 10 - 3, estoque foi descontado de verdade

    pedido = (
        await session.execute(select(Pedido).where(Pedido.numero_pedido == corpo["numeroPedido"]))
    ).scalar_one()
    assert pedido.nome_cliente == "Elizete"


async def test_criar_pedido_falha_ao_descontar_estoque_nao_derruba_a_resposta(client: AsyncClient, session: AsyncSession):
    # Item referencia um produto que não existe — descontar_estoque
    # ignora silenciosamente (ver test_crud.py), então isso não é uma
    # exceção de verdade aqui, mas o desenho da rota (asyncio.gather
    # com return_exceptions=True) é justamente pra isso: uma falha
    # numa tarefa "de apoio" pós-pedido não pode derrubar o 200 de
    # sucesso do pedido em si.
    resposta = await client.post(
        "/api/pedidos",
        json={
            "nomeCliente": "Elizete",
            "celular": "11999999999",
            "tipoEntrega": "retirada",
            "totalPreco": 10.0,
            "itens": [_item(produto_id="produto-fantasma")],
        },
    )
    assert resposta.status_code == 200
    assert resposta.json()["sucesso"] is True


async def test_criar_pedido_campos_obrigatorios_faltando_retorna_400(client: AsyncClient):
    resposta = await client.post("/api/pedidos", json={"celular": "11999999999", "tipoEntrega": "retirada", "totalPreco": 10.0})
    assert resposta.status_code == 400


async def test_criar_pedido_salva_solicitacoes_quando_texto_presente(client: AsyncClient, session: AsyncSession):
    from app.models import Solicitacao

    session.add(Produto(id="abacate", nome="Abacate", preco=5, unidade="kg", categoria="Frutas", quantidade=10))
    await session.commit()

    resposta = await client.post(
        "/api/pedidos",
        json={
            "nomeCliente": "Elizete",
            "celular": "11999999999",
            "tipoEntrega": "retirada",
            "totalPreco": 10.0,
            "produtosSolicitados": "Manga (fora de estoque)",
            "itens": [_item()],
        },
    )
    assert resposta.status_code == 200
    numero = resposta.json()["numeroPedido"]

    solicitacao = (
        await session.execute(select(Solicitacao).where(Solicitacao.numero_pedido == numero))
    ).scalar_one_or_none()
    assert solicitacao is not None
    assert solicitacao.produtos_solicitados == "Manga (fora de estoque)"


async def test_criar_pedido_produtos_solicitados_so_espacos_nao_salva_solicitacao(client: AsyncClient, session: AsyncSession):
    from app.models import Solicitacao

    session.add(Produto(id="abacate", nome="Abacate", preco=5, unidade="kg", categoria="Frutas", quantidade=10))
    await session.commit()

    resposta = await client.post(
        "/api/pedidos",
        json={
            "nomeCliente": "Elizete",
            "celular": "11999999999",
            "tipoEntrega": "retirada",
            "totalPreco": 10.0,
            "produtosSolicitados": "   ",
            "itens": [_item()],
        },
    )
    numero = resposta.json()["numeroPedido"]

    solicitacao = (
        await session.execute(select(Solicitacao).where(Solicitacao.numero_pedido == numero))
    ).scalar_one_or_none()
    assert solicitacao is None
