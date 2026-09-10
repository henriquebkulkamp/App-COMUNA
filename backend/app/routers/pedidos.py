# ============================================================
# POST /api/pedidos — espelha app/api/pedidos/route.ts
#
# Corpo esperado (igual ao original): nomeCliente, celular, tipoEntrega,
# enderecoEntrega?, produtosSolicitados?, observacoes?, totalPreco,
# itens (array de ItemCarrinho — cada item já carrega o Produto inteiro
# como o cliente o viu, sem re-consultar o banco pro texto do pedido).
# ============================================================

import asyncio
import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud
from ..database import get_session

logger = logging.getLogger(__name__)
router = APIRouter()


def _preco_efetivo(produto: dict) -> float:
    preco_real = produto.get("precoReal")
    return preco_real if preco_real is not None else produto.get("preco", 0)


@router.post("")
async def criar_pedido(request: Request, session: AsyncSession = Depends(get_session)):
    try:
        body = await request.json()

        nome_cliente = body.get("nomeCliente")
        celular = body.get("celular")
        tipo_entrega = body.get("tipoEntrega")
        endereco_entrega = body.get("enderecoEntrega")
        produtos_solicitados = body.get("produtosSolicitados")
        observacoes = body.get("observacoes")
        total_preco = body.get("totalPreco")
        itens = body.get("itens") or []

        # Validação mínima — mesmos campos obrigatórios do original.
        if not nome_cliente or not celular or not tipo_entrega or total_preco is None:
            return JSONResponse(
                status_code=400,
                content={
                    "erro": "Campos obrigatórios faltando: nomeCliente, celular, tipoEntrega, totalPreco"
                },
            )

        # Serializa os itens como texto legível pro pedido — cada item
        # vira uma linha: "2x Tomate (500g) — R$ 8,00".
        linhas = []
        for item in itens:
            produto = item["produto"]
            quantidade = item["quantidade"]
            valor = _preco_efetivo(produto) * quantidade
            linhas.append(
                f"{quantidade}x {produto['nome']} ({produto['unidade']}) — "
                f"R$ {valor:.2f}".replace(".", ",")
            )
        itens_texto = "\n".join(linhas)

        numero_pedido = await crud.salvar_pedido(
            session,
            nome_cliente=nome_cliente,
            celular=celular,
            tipo_entrega=tipo_entrega,
            endereco_entrega=endereco_entrega,
            itens_texto=itens_texto,
            total_preco=total_preco,
            observacoes=observacoes,
        )

        # Salva solicitações e desconta estoque em paralelo — falha em
        # qualquer um dos dois não derruba a resposta (allSettled).
        tarefas = [
            crud.descontar_estoque(
                session,
                [
                    {"produto_id": item["produto"]["id"], "quantidade_pedida": item["quantidade"]}
                    for item in itens
                ],
            )
        ]
        if produtos_solicitados and produtos_solicitados.strip():
            tarefas.append(
                crud.salvar_solicitacoes(
                    session,
                    nome_cliente=nome_cliente,
                    celular=celular,
                    numero_pedido=numero_pedido,
                    produtos_solicitados=produtos_solicitados,
                )
            )
        resultados = await asyncio.gather(*tarefas, return_exceptions=True)
        for resultado in resultados:
            if isinstance(resultado, Exception):
                logger.error("[POST /api/pedidos] Falha em tarefa pós-pedido: %s", resultado)

        return {"sucesso": True, "numeroPedido": numero_pedido}
    except Exception as erro:
        logger.error("[POST /api/pedidos] Erro ao salvar pedido: %s", erro)
        return JSONResponse(
            status_code=500,
            content={"erro": "Não foi possível salvar o pedido. O WhatsApp ainda será aberto."},
        )
