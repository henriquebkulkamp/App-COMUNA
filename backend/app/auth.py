# ============================================================
# AUTH — login do painel administrativo. Substitui o antigo PIN único
# (verificado contra `configuracoes.chave = 'pin'`) por conta com
# senha, com hash (nunca texto puro) e um token de sessão assinado.
#
# 100% biblioteca padrão do Python (hashlib/hmac/secrets) — sem
# adicionar bcrypt/passlib/PyJWT como dependência nova só pra isso.
#
# Analogia Python: PBKDF2 é o mesmo algoritmo por trás de
# `django.contrib.auth.hashers.PBKDF2PasswordHasher` — sal aleatório
# por senha + muitas iterações, pra tornar ataque de força bruta caro.
# O token é um "JWT artesanal": payload + assinatura HMAC, sem
# biblioteca externa — mas com o mesmo princípio (não dá pra forjar
# nem adulterar sem conhecer AUTH_SECRET_KEY).
# ============================================================

import base64
import hashlib
import hmac
import secrets
import time

from fastapi import Header, HTTPException

from .config import settings

_ITERACOES_PBKDF2 = 200_000
TOKEN_TTL_SEGUNDOS = 7 * 24 * 60 * 60  # 7 dias


def gerar_hash_senha(senha: str) -> str:
    """Gera um hash `sal$hash` — formato próprio, só pra guardar sal e
    hash juntos numa única coluna TEXT sem precisar de duas colunas."""
    sal = secrets.token_hex(16)
    hash_bytes = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), bytes.fromhex(sal), _ITERACOES_PBKDF2)
    return f"{sal}${hash_bytes.hex()}"


def verificar_senha(senha: str, hash_armazenado: str) -> bool:
    """Recalcula o hash com o mesmo sal e compara em tempo constante
    (hmac.compare_digest) — evita vazar por timing quanto da senha
    digitada já bateu com o hash real."""
    try:
        sal, hash_hex_esperado = hash_armazenado.split("$", 1)
    except ValueError:
        return False
    hash_calculado = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), bytes.fromhex(sal), _ITERACOES_PBKDF2)
    return hmac.compare_digest(hash_calculado.hex(), hash_hex_esperado)


def _assinar(payload: str) -> str:
    return hmac.new(settings.auth_secret_key.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()


def gerar_token(admin_id: int) -> str:
    expira_em = int(time.time()) + TOKEN_TTL_SEGUNDOS
    payload = f"{admin_id}:{expira_em}"
    bruto = f"{payload}:{_assinar(payload)}"
    return base64.urlsafe_b64encode(bruto.encode("utf-8")).decode("ascii")


def verificar_token(token: str) -> int | None:
    """Retorna o id do admin se o token for válido e não tiver expirado,
    ou None caso contrário (assinatura errada, formato inválido, expirado)."""
    try:
        bruto = base64.urlsafe_b64decode(token.encode("ascii")).decode("utf-8")
        admin_id_str, expira_str, assinatura = bruto.split(":")
        payload = f"{admin_id_str}:{expira_str}"
        if not hmac.compare_digest(assinatura, _assinar(payload)):
            return None
        if int(expira_str) < time.time():
            return None
        return int(admin_id_str)
    except Exception:
        return None


async def exigir_admin(authorization: str | None = Header(default=None)) -> int:
    """Dependency do FastAPI — protege as rotas de mutação do painel
    admin (estoque, preço, cesta, produto, config). Analogia: um
    decorator @login_required, só que injetado via Depends().

    Substitui o "buraco" que existia antes (rotas de mutação sem
    nenhuma verificação, só o front-end escondia a UI) — agora exigem
    um token válido de POST /api/admin/login no header
    `Authorization: Bearer <token>`.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Não autenticado.")
    admin_id = verificar_token(authorization.removeprefix("Bearer "))
    if admin_id is None:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada. Faça login novamente.")
    return admin_id
