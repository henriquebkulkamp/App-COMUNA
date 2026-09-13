# ============================================================
# /api/auth/** — login e cadastro. Antes vivia em /api/admin/login,
# porque só existia conta admin; agora login vale pra qualquer conta
# (POST /api/auth/login) e tem cadastro público (POST /api/auth/
# cadastro) — o que abre o painel é o campo is_admin de cada conta,
# não mais "ter conseguido logar" (ver app/auth.py, exigir_admin).
# ============================================================

import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud
from ..crud import EmailJaCadastrado
from ..database import get_session

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── POST /api/auth/login ────────────────────────────────────────
# Corpo: { email, senha }. Retorna { sucesso: true, token, nome,
# isAdmin } ou 401 se email/senha não baterem.
@router.post("/login")
async def login(request: Request, session: AsyncSession = Depends(get_session)):
    try:
        body = await request.json()
        email = body.get("email")
        senha = body.get("senha")

        if not isinstance(email, str) or not email or not isinstance(senha, str) or not senha:
            return JSONResponse(status_code=400, content={"erro": "Campos obrigatórios: email, senha"})

        resultado = await crud.autenticar_usuario(session, email, senha)
        if resultado is None:
            return JSONResponse(status_code=401, content={"erro": "Email ou senha incorretos."})

        token, usuario = resultado
        return {"sucesso": True, "token": token, "nome": usuario.nome, "isAdmin": usuario.is_admin}
    except Exception as erro:
        logger.error("[POST /api/auth/login] Erro: %s", erro)
        return JSONResponse(
            status_code=500, content={"erro": "Não foi possível fazer login. Tente novamente."}
        )


# ─── POST /api/auth/cadastro ─────────────────────────────────────
# Corpo: { nome, email, senha }. Cadastro público — nasce is_admin
# sempre false. Já loga de cara (devolve token), pra não obrigar o
# cliente a preencher email/senha de novo na sequência.
@router.post("/cadastro")
async def cadastro(request: Request, session: AsyncSession = Depends(get_session)):
    try:
        body = await request.json()
        nome = body.get("nome")
        email = body.get("email")
        senha = body.get("senha")

        if not isinstance(nome, str) or not nome.strip():
            return JSONResponse(status_code=400, content={"erro": "Campo obrigatório: nome"})
        if not isinstance(email, str) or not email.strip():
            return JSONResponse(status_code=400, content={"erro": "Campo obrigatório: email"})
        if not isinstance(senha, str) or len(senha) < 6:
            return JSONResponse(status_code=400, content={"erro": "Senha deve ter pelo menos 6 caracteres"})

        try:
            token, usuario = await crud.criar_usuario(session, nome=nome.strip(), email=email.strip(), senha=senha)
        except EmailJaCadastrado:
            return JSONResponse(status_code=409, content={"erro": "Já existe uma conta com esse email."})

        return {"sucesso": True, "token": token, "nome": usuario.nome, "isAdmin": usuario.is_admin}
    except Exception as erro:
        logger.error("[POST /api/auth/cadastro] Erro: %s", erro)
        return JSONResponse(
            status_code=500, content={"erro": "Não foi possível criar a conta. Tente novamente."}
        )
