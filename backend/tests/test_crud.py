# ============================================================
# test_crud.py — app/crud.py: estoque, preço, cesta, upsert de
# configuração, pedido. A lógica de negócio mais densa do backend.
# ============================================================

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.crud import ProdutoNaoEncontrado
from app.models import Admin, Configuracao, Produto


def _produto(**overrides) -> Produto:
    base = dict(id="abacate", nome="Abacate", preco=5, unidade="kg", categoria="Frutas", quantidade=10)
    base.update(overrides)
    return Produto(**base)


# ─── descontar_estoque ──────────────────────────────────────────────


async def test_descontar_estoque_reduz_quantidade(session: AsyncSession):
    session.add(_produto(quantidade=10))
    await session.commit()

    await crud.descontar_estoque(session, [{"produto_id": "abacate", "quantidade_pedida": 3}])

    produto = await session.get(Produto, "abacate")
    assert produto.quantidade == 7


async def test_descontar_estoque_nunca_fica_negativo(session: AsyncSession):
    # Pedido de 5 com estoque de só 3 — clamp em 0, nunca -2. Mata
    # mutante que trocasse `max(0, ...)` por só a subtração crua.
    session.add(_produto(quantidade=3))
    await session.commit()

    await crud.descontar_estoque(session, [{"produto_id": "abacate", "quantidade_pedida": 5}])

    produto = await session.get(Produto, "abacate")
    assert produto.quantidade == 0


async def test_descontar_estoque_produto_inexistente_e_ignorado_sem_quebrar_lote(session: AsyncSession):
    session.add(_produto(id="abacate", quantidade=10))
    await session.commit()

    # "fantasma" não existe no banco — não pode levantar exceção nem
    # impedir que "abacate" (que existe) seja descontado normalmente.
    await crud.descontar_estoque(
        session,
        [
            {"produto_id": "fantasma", "quantidade_pedida": 1},
            {"produto_id": "abacate", "quantidade_pedida": 4},
        ],
    )

    produto = await session.get(Produto, "abacate")
    assert produto.quantidade == 6


# ─── atualizar_cesta ─────────────────────────────────────────────────


async def test_atualizar_cesta_grande_grava_coluna_certa(session: AsyncSession):
    session.add(_produto())
    await session.commit()

    await crud.atualizar_cesta(session, "abacate", "naCestaGrande", True)

    produto = await session.get(Produto, "abacate")
    assert produto.na_cesta_grande is True
    assert produto.na_cesta_pequena is False  # a OUTRA coluna não pode ter sido tocada


async def test_atualizar_cesta_pequena_grava_coluna_certa(session: AsyncSession):
    session.add(_produto())
    await session.commit()

    await crud.atualizar_cesta(session, "abacate", "naCestaPequena", True)

    produto = await session.get(Produto, "abacate")
    assert produto.na_cesta_pequena is True
    assert produto.na_cesta_grande is False


async def test_atualizar_cesta_produto_inexistente_levanta_erro(session: AsyncSession):
    with pytest.raises(ProdutoNaoEncontrado) as excinfo:
        await crud.atualizar_cesta(session, "nao-existe", "naCestaGrande", True)
    assert excinfo.value.args[0] == "nao-existe"  # mensagem carrega qual produto, não genérica


# ─── atualizar_quantidade / atualizar_preco / atualizar_preco_real / atualizar_unidade ──


async def test_atualizar_quantidade_produto_existente(session: AsyncSession):
    session.add(_produto(quantidade=1))
    await session.commit()

    await crud.atualizar_quantidade(session, "abacate", 99)

    assert (await session.get(Produto, "abacate")).quantidade == 99


async def test_atualizar_quantidade_produto_inexistente_levanta_erro(session: AsyncSession):
    with pytest.raises(ProdutoNaoEncontrado) as excinfo:
        await crud.atualizar_quantidade(session, "nao-existe", 5)
    assert excinfo.value.args[0] == "nao-existe"


async def test_atualizar_preco_produto_inexistente_levanta_erro(session: AsyncSession):
    with pytest.raises(ProdutoNaoEncontrado) as excinfo:
        await crud.atualizar_preco(session, "nao-existe", 5.0)
    assert excinfo.value.args[0] == "nao-existe"


async def test_atualizar_preco_real_produto_inexistente_levanta_erro(session: AsyncSession):
    with pytest.raises(ProdutoNaoEncontrado) as excinfo:
        await crud.atualizar_preco_real(session, "nao-existe", 5.0)
    assert excinfo.value.args[0] == "nao-existe"


async def test_remover_produto_inexistente_levanta_erro(session: AsyncSession):
    with pytest.raises(ProdutoNaoEncontrado) as excinfo:
        await crud.remover_produto(session, "nao-existe")
    assert excinfo.value.args[0] == "nao-existe"


async def test_atualizar_preco_real_aceita_none_pra_limpar_desconto(session: AsyncSession):
    session.add(_produto(preco_real=3))
    await session.commit()

    await crud.atualizar_preco_real(session, "abacate", None)

    assert (await session.get(Produto, "abacate")).preco_real is None


async def test_atualizar_preco_real_define_valor_com_desconto(session: AsyncSession):
    # Complementa test_atualizar_preco_real_aceita_none_pra_limpar_desconto
    # (que só cobre o caso None) — aqui é o caso "de verdade", um valor
    # numérico sendo gravado.
    session.add(_produto(preco_real=None))
    await session.commit()

    await crud.atualizar_preco_real(session, "abacate", 3.5)

    produto = await session.get(Produto, "abacate")
    assert float(produto.preco_real) == 3.5


async def test_atualizar_unidade_produto_existente(session: AsyncSession):
    session.add(_produto(unidade="kg"))
    await session.commit()

    await crud.atualizar_unidade(session, "abacate", "unidade")

    assert (await session.get(Produto, "abacate")).unidade == "unidade"


async def test_atualizar_unidade_produto_inexistente_levanta_erro(session: AsyncSession):
    with pytest.raises(ProdutoNaoEncontrado) as excinfo:
        await crud.atualizar_unidade(session, "nao-existe", "kg")
    assert excinfo.value.args[0] == "nao-existe"


# ─── atualizar_configuracao — upsert de verdade ─────────────────────


async def test_adicionar_produto_grava_todos_os_campos(session: AsyncSession):
    await crud.adicionar_produto(
        session, id="banana", nome="Banana", preco=3.5, unidade="dúzia", categoria="Frutas", descricao="Bem madura"
    )

    produto = await session.get(Produto, "banana")
    assert produto is not None
    assert float(produto.preco) == 3.5
    assert produto.unidade == "dúzia"
    assert produto.categoria == "Frutas"
    assert produto.descricao == "Bem madura"
    # Produto novo sempre nasce zerado/fora das cestas — Elizete ativa
    # estoque e cesta depois, pelo painel.
    assert produto.quantidade == 0
    assert produto.na_cesta_grande is False
    assert produto.na_cesta_pequena is False
    assert produto.imagem_url is None


async def test_remover_produto_sucesso_apaga_do_banco(session: AsyncSession):
    session.add(_produto())
    await session.commit()

    await crud.remover_produto(session, "abacate")

    assert await session.get(Produto, "abacate") is None


async def test_atualizar_configuracao_chave_nova_insere(session: AsyncSession):
    await crud.atualizar_configuracao(session, "whatsappNumero", "5516999999999")

    linha = await session.get(Configuracao, "whatsappNumero")
    assert linha.valor == "5516999999999"


async def test_atualizar_configuracao_chave_existente_atualiza_nao_duplica(session: AsyncSession):
    session.add(Configuracao(chave="whatsappNumero", valor="5516111111111"))
    await session.commit()

    await crud.atualizar_configuracao(session, "whatsappNumero", "5516222222222")

    resultado = await session.execute(select(Configuracao).where(Configuracao.chave == "whatsappNumero"))
    linhas = resultado.scalars().all()
    assert len(linhas) == 1  # upsert, não uma segunda linha
    assert linhas[0].valor == "5516222222222"


async def test_atualizar_configuracao_invalida_o_cache(session: AsyncSession, monkeypatch):
    # crud.py faz `from .cache import invalidar_cache_configuracoes` —
    # o nome já fica ligado no namespace de `crud`, então é ESSE
    # atributo que precisa ser trocado (mexer em `cache.
    # invalidar_cache_configuracoes` não afetaria a referência que
    # crud.py já importou).
    chamado = []
    monkeypatch.setattr(crud, "invalidar_cache_configuracoes", lambda: chamado.append(True))

    await crud.atualizar_configuracao(session, "whatsappNumero", "5516999999999")

    assert chamado == [True]


# ─── salvar_pedido ───────────────────────────────────────────────────


async def test_salvar_pedido_numero_e_timestamp_em_milissegundos(session: AsyncSession, monkeypatch):
    # Trava o valor exato (não só o formato "PED-<dígitos>") — mata
    # mutante que trocasse `* 1000` por `/ 1000` (ambos ainda produzem
    # um número, só o formato genérico não pegava isso).
    import time as time_module

    monkeypatch.setattr(time_module, "time", lambda: 1_700_000_000.123)

    numero = await crud.salvar_pedido(
        session,
        nome_cliente="Elizete",
        celular="11999999999",
        tipo_entrega="retirada",
        endereco_entrega=None,
        itens_texto="1x Abacate",
        total_preco=5.0,
        observacoes=None,
    )
    assert numero == "PED-1700000000123"


async def test_salvar_pedido_numero_segue_formato_ped_timestamp(session: AsyncSession):
    numero = await crud.salvar_pedido(
        session,
        nome_cliente="Elizete",
        celular="11999999999",
        tipo_entrega="retirada",
        endereco_entrega=None,
        itens_texto="1x Abacate",
        total_preco=5.0,
        observacoes=None,
    )
    assert numero.startswith("PED-")
    assert numero.removeprefix("PED-").isdigit()


async def test_salvar_pedido_none_vira_string_vazia_no_banco(session: AsyncSession):
    numero = await crud.salvar_pedido(
        session,
        nome_cliente="Elizete",
        celular="11999999999",
        tipo_entrega="entrega",
        endereco_entrega=None,
        itens_texto="1x Abacate",
        total_preco=5.0,
        observacoes=None,
    )

    from app.models import Pedido

    resultado = await session.execute(select(Pedido).where(Pedido.numero_pedido == numero))
    pedido = resultado.scalar_one()
    assert pedido.endereco_entrega == ""
    assert pedido.observacoes == ""


async def test_salvar_pedido_status_inicial_e_pendente(session: AsyncSession):
    from app.models import Pedido

    numero = await crud.salvar_pedido(
        session,
        nome_cliente="Elizete",
        celular="11999999999",
        tipo_entrega="retirada",
        endereco_entrega=None,
        itens_texto="1x Abacate",
        total_preco=5.0,
        observacoes=None,
    )

    pedido = (await session.execute(select(Pedido).where(Pedido.numero_pedido == numero))).scalar_one()
    assert pedido.status == "Pendente"  # exatamente esse valor (maiúscula inicial) — é o que o front espera


# ─── autenticar_admin ────────────────────────────────────────────────


async def test_autenticar_admin_senha_certa_retorna_token_do_admin_certo(session: AsyncSession):
    from app.auth import gerar_hash_senha, verificar_token

    admin = Admin(email="elizete@comuna.local", senha_hash=gerar_hash_senha("segredo123"))
    session.add(admin)
    await session.commit()
    await session.refresh(admin)

    token = await crud.autenticar_admin(session, "elizete@comuna.local", "segredo123")
    assert token is not None
    # Mata mutante que trocasse gerar_token(admin.id) por
    # gerar_token(None) — "token não-nulo" sozinho não pega isso.
    assert verificar_token(token) == admin.id


async def test_autenticar_admin_senha_errada_retorna_none(session: AsyncSession):
    from app.auth import gerar_hash_senha

    session.add(Admin(email="elizete@comuna.local", senha_hash=gerar_hash_senha("segredo123")))
    await session.commit()

    token = await crud.autenticar_admin(session, "elizete@comuna.local", "senha-errada")
    assert token is None


async def test_autenticar_admin_email_inexistente_retorna_none(session: AsyncSession):
    token = await crud.autenticar_admin(session, "ninguem@comuna.local", "qualquer-senha")
    assert token is None
