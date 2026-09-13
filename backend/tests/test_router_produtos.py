# ============================================================
# test_router_produtos.py — GET /api/produtos (lista) e GET
# /api/produtos/{id} (detalhe). A lista é rota trivial (delega pra
# buscar_produtos_cache, já coberto em test_cache.py) — smoke test de
# shape/status. O detalhe (usado por PaginaProduto.tsx) ganha mais
# atenção: é ele que junta ingredientes + info nutricional, e é onde
# um produto in natura (ingrediente único = o próprio nome) precisa
# aparecer certo.
# ============================================================

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Produto, ProdutoIngrediente, ProdutoInfoNutricional


async def test_listar_produtos_vazio(client: AsyncClient):
    resposta = await client.get("/api/produtos")
    assert resposta.status_code == 200
    assert resposta.json() == []


async def test_listar_produtos_retorna_shape_esperado(client: AsyncClient, session: AsyncSession):
    session.add(Produto(id="abacate", nome="Abacate", preco=5, unidade="kg", categoria="Frutas", quantidade=10))
    await session.commit()

    resposta = await client.get("/api/produtos")
    assert resposta.status_code == 200
    [produto] = resposta.json()
    assert produto["id"] == "abacate"
    assert produto["emEstoque"] is True  # camelCase confirmado (CamelModel)


async def test_obter_produto_inexistente_retorna_404(client: AsyncClient):
    resposta = await client.get("/api/produtos/nao-existe")
    assert resposta.status_code == 404
    assert "erro" in resposta.json()


async def test_obter_produto_sem_ingredientes_nem_nutricao(client: AsyncClient, session: AsyncSession):
    # Produto comum, sem nenhuma linha em produto_ingredientes/
    # produto_info_nutricional — a aba de Ingredientes deve conseguir
    # renderizar "nada cadastrado" sem quebrar, não deixar o endpoint falhar.
    session.add(
        Produto(id="cenoura", nome="Cenoura", preco=3, unidade="kg", categoria="Verduras e Legumes", quantidade=5)
    )
    await session.commit()

    resposta = await client.get("/api/produtos/cenoura")
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["ingredientes"] == []
    assert "infoNutricional" not in corpo  # response_model_exclude_none


async def test_obter_produto_in_natura_ingrediente_e_o_proprio_nome(client: AsyncClient, session: AsyncSession):
    session.add(
        Produto(id="abacate", nome="Abacate", preco=8, unidade="1 unidade", categoria="Frutas", quantidade=12)
    )
    session.add(ProdutoIngrediente(produto_id="abacate", nome="Abacate", ordem=0))
    session.add(
        ProdutoInfoNutricional(
            produto_id="abacate",
            porcao="100 g",
            calorias_kcal=160,
            gorduras_totais_g=14.7,
            proteinas_g=2,
        )
    )
    await session.commit()

    resposta = await client.get("/api/produtos/abacate")
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["ingredientes"] == ["Abacate"]
    assert corpo["infoNutricional"]["caloriasKcal"] == 160
    assert corpo["infoNutricional"]["porcao"] == "100 g"
    # Nutriente não cadastrado (NULL na tabela) some do JSON, não vira 0/null solto.
    assert "sodioMg" not in corpo["infoNutricional"]


async def test_obter_produto_processado_lista_ingredientes_na_ordem(client: AsyncClient, session: AsyncSession):
    session.add(
        Produto(
            id="bolo-mandioca", nome="Bolo de Mandioca", preco=25, unidade="650g",
            categoria="Pães e Panificação", quantidade=6,
        )
    )
    # Inserida fora de ordem de propósito — a resposta tem que respeitar
    # `ordem`, não a ordem de inserção/id.
    session.add(ProdutoIngrediente(produto_id="bolo-mandioca", nome="Farinha de trigo", ordem=1))
    session.add(ProdutoIngrediente(produto_id="bolo-mandioca", nome="Mandioca", ordem=0))
    await session.commit()

    resposta = await client.get("/api/produtos/bolo-mandioca")
    assert resposta.status_code == 200
    assert resposta.json()["ingredientes"] == ["Mandioca", "Farinha de trigo"]
