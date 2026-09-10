# ============================================================
# /api/admin/** — espelha app/api/admin/**/route.ts, um handler por
# arquivo original. Nenhuma dessas rotas verifica sessão/token hoje
# (mesmo "buraco" que já existia no Next.js: o PIN é só checado no
# formulário do painel, não nas rotas de mutação em si) — preservado
# de propósito, não é bug desta migração.
# ============================================================

import logging
import re

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud
from ..cache import invalidar_cache_produtos
from ..database import get_session

logger = logging.getLogger(__name__)
router = APIRouter()

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


# ─── POST /api/admin/verificar-pin ─────────────────────────────
@router.post("/verificar-pin")
async def verificar_pin(request: Request, session: AsyncSession = Depends(get_session)):
    try:
        body = await request.json()
        pin = body.get("pin")

        if not isinstance(pin, str) or not pin:
            return JSONResponse(status_code=400, content={"erro": "Campo obrigatório: pin"})

        valido = await crud.verificar_pin(session, pin)
        return {"valido": valido}
    except Exception as erro:
        logger.error("[POST /api/admin/verificar-pin] Erro: %s", erro)
        return JSONResponse(
            status_code=500, content={"erro": "Não foi possível verificar o PIN. Tente novamente."}
        )


# ─── PATCH /api/admin/config ────────────────────────────────────
# Atualiza o PIN ou o número de WhatsApp — espelha app/api/admin/config/route.ts
@router.patch("/config")
async def atualizar_config(request: Request, session: AsyncSession = Depends(get_session)):
    try:
        body = await request.json()
        campo = body.get("campo")
        valor = body.get("valor")

        if campo != "pin" and campo != "whatsappNumero":
            return JSONResponse(
                status_code=400, content={"erro": 'Campo "campo" deve ser "pin" ou "whatsappNumero"'}
            )

        if not isinstance(valor, str) or not valor.strip():
            return JSONResponse(status_code=400, content={"erro": "Campo obrigatório: valor"})

        if campo == "pin" and not re.fullmatch(r"\d{4,6}", valor):
            return JSONResponse(
                status_code=400, content={"erro": "O PIN deve ter entre 4 e 6 dígitos numéricos"}
            )

        if campo == "whatsappNumero" and not re.fullmatch(r"\d{10,13}", valor):
            return JSONResponse(
                status_code=400,
                content={
                    "erro": "Número de WhatsApp inválido — use apenas dígitos, com DDI e DDD (ex: 5516999999999)"
                },
            )

        await crud.atualizar_configuracao(session, campo, valor)
        return {"sucesso": True}
    except Exception as erro:
        logger.error("[PATCH /api/admin/config] Erro: %s", erro)
        return JSONResponse(
            status_code=500, content={"erro": "Falha ao atualizar a configuração. Tente novamente."}
        )


# ─── PATCH /api/admin/estoque ───────────────────────────────────
@router.patch("/estoque")
async def atualizar_estoque(request: Request, session: AsyncSession = Depends(get_session)):
    try:
        body = await request.json()
        produto_id = body.get("produtoId")
        quantidade = body.get("quantidade")

        if not produto_id or quantidade is None:
            return JSONResponse(
                status_code=400, content={"erro": "Campos obrigatórios: produtoId, quantidade"}
            )
        if not isinstance(quantidade, (int, float)) or isinstance(quantidade, bool) or quantidade < 0:
            return JSONResponse(
                status_code=400,
                content={"erro": "quantidade deve ser um número maior ou igual a zero"},
            )

        await crud.atualizar_quantidade(session, produto_id, int(quantidade))
        invalidar_cache_produtos()
        return {"sucesso": True}
    except Exception as erro:
        logger.error("[PATCH /api/admin/estoque] Erro: %s", erro)
        return JSONResponse(status_code=500, content={"erro": "Falha ao atualizar a planilha. Tente novamente."})


# ─── PATCH /api/admin/preco ─────────────────────────────────────
@router.patch("/preco")
async def atualizar_preco(request: Request, session: AsyncSession = Depends(get_session)):
    try:
        body = await request.json()
        produto_id = body.get("produtoId")
        preco = body.get("preco")

        if (
            not produto_id
            or preco is None
            or not isinstance(preco, (int, float))
            or isinstance(preco, bool)
            or preco <= 0
        ):
            return JSONResponse(
                status_code=400,
                content={"erro": "Campos obrigatórios: produtoId, preco (número maior que zero)"},
            )

        await crud.atualizar_preco(session, produto_id, float(preco))
        invalidar_cache_produtos()
        return {"sucesso": True}
    except Exception as erro:
        logger.error("[PATCH /api/admin/preco] Erro: %s", erro)
        return JSONResponse(status_code=500, content={"erro": "Falha ao atualizar o preço na planilha."})


# ─── PATCH /api/admin/preco-real ────────────────────────────────
@router.patch("/preco-real")
async def atualizar_preco_real(request: Request, session: AsyncSession = Depends(get_session)):
    try:
        body = await request.json()
        produto_id = body.get("produtoId")
        preco_real = body.get("precoReal")

        if not produto_id:
            return JSONResponse(status_code=400, content={"erro": "Campo obrigatório: produtoId"})
        if preco_real is not None and (
            not isinstance(preco_real, (int, float)) or isinstance(preco_real, bool) or preco_real < 0
        ):
            return JSONResponse(
                status_code=400,
                content={"erro": "Campo precoReal deve ser um número maior ou igual a zero, ou null"},
            )

        await crud.atualizar_preco_real(session, produto_id, float(preco_real) if preco_real is not None else None)
        invalidar_cache_produtos()
        return {"sucesso": True}
    except Exception as erro:
        logger.error("[PATCH /api/admin/preco-real] Erro: %s", erro)
        return JSONResponse(status_code=500, content={"erro": "Falha ao atualizar o preço com desconto."})


# ─── PATCH /api/admin/unidade ───────────────────────────────────
@router.patch("/unidade")
async def atualizar_unidade(request: Request, session: AsyncSession = Depends(get_session)):
    try:
        body = await request.json()
        produto_id = body.get("produtoId")
        unidade = body.get("unidade")

        if not produto_id or not (isinstance(unidade, str) and unidade.strip()):
            return JSONResponse(
                status_code=400, content={"erro": "Campos obrigatórios: produtoId, unidade"}
            )

        await crud.atualizar_unidade(session, produto_id, unidade.strip())
        invalidar_cache_produtos()
        return {"sucesso": True}
    except Exception as erro:
        logger.error("[PATCH /api/admin/unidade] Erro: %s", erro)
        return JSONResponse(status_code=500, content={"erro": "Falha ao atualizar a unidade na planilha."})


# ─── PATCH /api/admin/cesta ─────────────────────────────────────
@router.patch("/cesta")
async def atualizar_cesta(request: Request, session: AsyncSession = Depends(get_session)):
    try:
        body = await request.json()
        produto_id = body.get("produtoId")
        campo = body.get("campo")
        valor = body.get("valor")

        if not produto_id or campo not in ("naCestaGrande", "naCestaPequena") or not isinstance(valor, bool):
            return JSONResponse(status_code=400, content={"erro": "Parâmetros inválidos."})

        await crud.atualizar_cesta(session, produto_id, campo, valor)
        invalidar_cache_produtos()
        return {"sucesso": True}
    except Exception as erro:
        logger.error("[/api/admin/cesta] Erro: %s", erro)
        return JSONResponse(status_code=500, content={"erro": "Erro ao atualizar planilha."})


# ─── POST /api/admin/produto — cria produto ─────────────────────
@router.post("/produto")
async def criar_produto(request: Request, session: AsyncSession = Depends(get_session)):
    try:
        body = await request.json()
        id_ = body.get("id")
        nome = body.get("nome")
        preco = body.get("preco")
        unidade = body.get("unidade")
        categoria = body.get("categoria")
        descricao = body.get("descricao")

        if (
            not id_
            or not nome
            or not isinstance(preco, (int, float))
            or isinstance(preco, bool)
            or preco <= 0
            or not unidade
        ):
            return JSONResponse(
                status_code=400,
                content={"erro": "Campos obrigatórios: id, nome, preco (> 0), unidade"},
            )
        if categoria not in CATEGORIAS_VALIDAS:
            return JSONResponse(status_code=400, content={"erro": "Categoria inválida"})

        await crud.adicionar_produto(
            session,
            id=id_,
            nome=nome,
            preco=float(preco),
            unidade=unidade,
            categoria=categoria,
            descricao=descricao,
        )
        invalidar_cache_produtos()
        return {"sucesso": True}
    except Exception as erro:
        logger.error("[POST /api/admin/produto] Erro: %s", erro)
        return JSONResponse(status_code=500, content={"erro": "Falha ao adicionar o produto na planilha."})


# ─── DELETE /api/admin/produto — remove produto ─────────────────
@router.delete("/produto")
async def remover_produto(request: Request, session: AsyncSession = Depends(get_session)):
    try:
        body = await request.json()
        produto_id = body.get("produtoId")

        if not produto_id:
            return JSONResponse(status_code=400, content={"erro": "Campo obrigatório: produtoId"})

        await crud.remover_produto(session, produto_id)
        invalidar_cache_produtos()
        return {"sucesso": True}
    except Exception as erro:
        logger.error("[DELETE /api/admin/produto] Erro: %s", erro)
        return JSONResponse(status_code=500, content={"erro": "Falha ao remover o produto da planilha."})
