# ============================================================
# CRUD — operações de escrita, espelha as funções de mutação de
# lib/db.ts (atualizarXNaPlanilha, salvarPedido, salvarSolicitacoes,
# descontarEstoque). Leituras cacheadas ficam em cache.py.
#
# autenticar_admin() substitui o antigo verificarPin — login por conta
# (email+senha), não mais PIN único (ver app/auth.py).
# ============================================================

import time

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import gerar_token, verificar_senha
from .cache import invalidar_cache_configuracoes
from .models import Admin, Configuracao, Pedido, Produto, Solicitacao


class ProdutoNaoEncontrado(Exception):
    """Espelha o `throw new Error(...)` das funções atualizarXNaPlanilha
    em lib/db.ts quando `rowCount` vem zero — nas rotas, isso vira um
    500 genérico (não um 404), igual ao comportamento original."""


async def atualizar_quantidade(session: AsyncSession, produto_id: str, quantidade: int) -> None:
    resultado = await session.execute(
        update(Produto).where(Produto.id == produto_id).values(quantidade=quantidade)
    )
    if resultado.rowcount == 0:
        raise ProdutoNaoEncontrado(produto_id)
    await session.commit()


async def atualizar_preco(session: AsyncSession, produto_id: str, preco: float) -> None:
    resultado = await session.execute(
        update(Produto).where(Produto.id == produto_id).values(preco=preco)
    )
    if resultado.rowcount == 0:
        raise ProdutoNaoEncontrado(produto_id)
    await session.commit()


async def atualizar_preco_real(session: AsyncSession, produto_id: str, preco_real: float | None) -> None:
    resultado = await session.execute(
        update(Produto).where(Produto.id == produto_id).values(preco_real=preco_real)
    )
    if resultado.rowcount == 0:
        raise ProdutoNaoEncontrado(produto_id)
    await session.commit()


async def atualizar_unidade(session: AsyncSession, produto_id: str, unidade: str) -> None:
    resultado = await session.execute(
        update(Produto).where(Produto.id == produto_id).values(unidade=unidade)
    )
    if resultado.rowcount == 0:
        raise ProdutoNaoEncontrado(produto_id)
    await session.commit()


async def atualizar_cesta(session: AsyncSession, produto_id: str, campo: str, valor: bool) -> None:
    coluna = "na_cesta_grande" if campo == "naCestaGrande" else "na_cesta_pequena"
    resultado = await session.execute(
        update(Produto).where(Produto.id == produto_id).values(**{coluna: valor})
    )
    if resultado.rowcount == 0:
        raise ProdutoNaoEncontrado(produto_id)
    await session.commit()


async def adicionar_produto(
    session: AsyncSession,
    *,
    id: str,
    nome: str,
    preco: float,
    unidade: str,
    categoria: str,
    descricao: str | None,
) -> None:
    session.add(
        Produto(
            id=id,
            nome=nome,
            preco=preco,
            unidade=unidade,
            categoria=categoria,
            quantidade=0,
            na_cesta_grande=False,
            na_cesta_pequena=False,
            descricao=descricao,
            # Sem gerarImagemSimulada aqui (era específico do lib/imagemSimulada.ts
            # do Next) — produto novo nasce sem imagem, igual a deixar imagem_url null.
            imagem_url=None,
        )
    )
    await session.commit()


async def remover_produto(session: AsyncSession, produto_id: str) -> None:
    produto = await session.get(Produto, produto_id)
    if produto is None:
        raise ProdutoNaoEncontrado(produto_id)
    await session.delete(produto)
    await session.commit()


async def autenticar_admin(session: AsyncSession, email: str, senha: str) -> str | None:
    """Verifica email+senha contra a tabela `admins` e, se bater, retorna
    um token de sessão assinado (ver app/auth.py). None em qualquer
    falha (email não existe ou senha errada) — a rota não distingue os
    dois casos na resposta, pra não revelar quais emails têm conta."""
    resultado = await session.execute(select(Admin).where(Admin.email == email))
    admin = resultado.scalar_one_or_none()
    if admin is None or not verificar_senha(senha, admin.senha_hash):
        return None
    return gerar_token(admin.id)


async def atualizar_configuracao(session: AsyncSession, chave: str, novo_valor: str) -> None:
    """Espelha atualizarConfiguracao de lib/db.ts — INSERT ... ON CONFLICT
    DO UPDATE (upsert), já que `chave` é a PK de `configuracoes`."""
    stmt = pg_insert(Configuracao).values(chave=chave, valor=novo_valor)
    stmt = stmt.on_conflict_do_update(index_elements=[Configuracao.chave], set_={"valor": novo_valor})
    await session.execute(stmt)
    await session.commit()
    invalidar_cache_configuracoes()


async def salvar_solicitacoes(
    session: AsyncSession,
    *,
    nome_cliente: str,
    celular: str,
    numero_pedido: str,
    produtos_solicitados: str,
) -> None:
    session.add(
        Solicitacao(
            numero_pedido=numero_pedido,
            nome_cliente=nome_cliente,
            celular=celular,
            produtos_solicitados=produtos_solicitados,
        )
    )
    await session.commit()


async def descontar_estoque(session: AsyncSession, itens: list[dict]) -> None:
    for item in itens:
        produto = await session.get(Produto, item["produto_id"])
        if produto is None:
            continue
        produto.quantidade = max(0, produto.quantidade - item["quantidade_pedida"])
    await session.commit()


async def salvar_pedido(
    session: AsyncSession,
    *,
    nome_cliente: str,
    celular: str,
    tipo_entrega: str,
    endereco_entrega: str | None,
    itens_texto: str,
    total_preco: float,
    observacoes: str | None,
) -> str:
    # Número do pedido: timestamp em milissegundos, igual ao Date.now() do original.
    numero_pedido = f"PED-{int(time.time() * 1000)}"
    session.add(
        Pedido(
            numero_pedido=numero_pedido,
            nome_cliente=nome_cliente,
            celular=celular,
            tipo_entrega=tipo_entrega,
            endereco_entrega=endereco_entrega or "",
            itens=itens_texto,
            total_preco=total_preco,
            observacoes=observacoes or "",
            status="Pendente",
        )
    )
    await session.commit()
    return numero_pedido
