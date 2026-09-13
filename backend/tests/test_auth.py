# ============================================================
# test_auth.py — hash de senha, token de sessão e as dependencies
# exigir_usuario (só checa header/token) e exigir_admin (além disso,
# confere is_admin no banco) — app/auth.py. Lógica pura, sem I/O na
# maior parte — o alvo mais limpo pra mutation testing do backend.
# ============================================================

import time

import pytest
from fastapi import HTTPException

from app.auth import (
    _assinar,
    exigir_admin,
    exigir_usuario,
    gerar_hash_senha,
    gerar_token,
    verificar_senha,
    verificar_token,
)


# ─── gerar_hash_senha / verificar_senha ────────────────────────────


def test_senha_correta_verifica_true():
    hash_ = gerar_hash_senha("minha-senha-123")
    assert verificar_senha("minha-senha-123", hash_) is True


def test_senha_errada_verifica_false():
    hash_ = gerar_hash_senha("minha-senha-123")
    assert verificar_senha("senha-diferente", hash_) is False


def test_hash_sempre_tem_sal_diferente():
    # Duas chamadas pra mesma senha não podem gerar o mesmo hash — sal
    # aleatório por chamada (senão duas contas com a mesma senha
    # teriam a mesma linha na coluna senha_hash, um vazamento).
    assert gerar_hash_senha("abacate123") != gerar_hash_senha("abacate123")


def test_hash_sal_tem_16_bytes():
    # secrets.token_hex(16) -> 32 caracteres hex. Mata mutante que
    # trocasse o 16 por outro valor (ex: token_hex(None), que usa um
    # tamanho padrão bem maior).
    sal, _ = gerar_hash_senha("abacate123").split("$", 1)
    assert len(sal) == 32


def test_hash_malformado_sem_dollar_retorna_false_nao_levanta():
    # verificar_senha faz `hash_armazenado.split("$", 1)` dentro de um
    # try/except ValueError — um hash sem "$" (corrompido/de outro
    # formato) tem que virar False, nunca uma exceção não tratada.
    assert verificar_senha("qualquer-senha", "hash-sem-formato-esperado") is False


# ─── _assinar ────────────────────────────────────────────────────────


def test_assinar_depende_do_payload():
    # gerar_token/verificar_token sempre chamam _assinar nos dois
    # lados (assinar e conferir) — um teste de round-trip sozinho não
    # pega uma _assinar que ignorasse o payload (os dois lados
    # ignorariam do mesmo jeito e ainda bateriam). Só um teste direto
    # nela, comparando payloads diferentes, mata esse tipo de mutante.
    assert _assinar("payload-a") != _assinar("payload-b")


def test_assinar_e_deterministica_pro_mesmo_payload():
    assert _assinar("mesmo-payload") == _assinar("mesmo-payload")


# ─── gerar_token / verificar_token ──────────────────────────────────


def test_token_recem_gerado_e_valido():
    token = gerar_token(admin_id=42)
    assert verificar_token(token) == 42


def test_token_com_assinatura_adulterada_retorna_none():
    token = gerar_token(admin_id=1)
    # Adultera o último caractere do token (base64 urlsafe) — muda o
    # payload decodificado o suficiente pra invalidar a assinatura HMAC.
    adulterado = token[:-1] + ("A" if token[-1] != "A" else "B")
    assert verificar_token(adulterado) is None


def test_token_com_lixo_arbitrario_retorna_none():
    assert verificar_token("isto-nao-e-um-token-valido") is None


def test_token_vazio_retorna_none():
    assert verificar_token("") is None


def test_token_expirado_retorna_none(monkeypatch):
    # Mata mutante de boundary em `int(expira_str) < time.time()`
    # (trocar `<` por `<=`, por exemplo): gera o token no "presente",
    # depois avança o relógio pra depois do TTL e confirma que EXPIROU.
    agora = time.time()
    monkeypatch.setattr(time, "time", lambda: agora)
    token = gerar_token(admin_id=7)
    assert verificar_token(token) == 7  # ainda válido no instante da geração

    monkeypatch.setattr(time, "time", lambda: agora + 7 * 24 * 60 * 60 + 1)  # TTL + 1s
    assert verificar_token(token) is None


def test_token_no_ultimo_segundo_valido_ainda_verifica(monkeypatch):
    # Boundary exato: no instante em que `expira_em` == time.time(),
    # o token ainda é válido — só falha estritamente DEPOIS de expirar.
    # `agora` precisa ser um inteiro exato aqui: gerar_token já trunca
    # com int(time.time()) na geração, então só comparando contra o
    # mesmo inteiro (sem fração) o boundary fica exato dos dois lados.
    agora = int(time.time())
    monkeypatch.setattr(time, "time", lambda: agora)
    token = gerar_token(admin_id=9)

    monkeypatch.setattr(time, "time", lambda: float(agora + 7 * 24 * 60 * 60))  # exatamente no TTL
    assert verificar_token(token) == 9


# ─── exigir_usuario (parsing do header — qualquer conta logada) ────


@pytest.mark.asyncio
async def test_exigir_usuario_sem_header_levanta_401():
    with pytest.raises(HTTPException) as excinfo:
        await exigir_usuario(authorization=None)
    assert excinfo.value.status_code == 401
    assert excinfo.value.detail == "Não autenticado."


@pytest.mark.asyncio
async def test_exigir_usuario_sem_prefixo_bearer_levanta_401():
    with pytest.raises(HTTPException) as excinfo:
        await exigir_usuario(authorization="token-sem-prefixo-bearer")
    assert excinfo.value.status_code == 401
    assert excinfo.value.detail == "Não autenticado."


@pytest.mark.asyncio
async def test_exigir_usuario_token_invalido_levanta_401():
    with pytest.raises(HTTPException) as excinfo:
        await exigir_usuario(authorization="Bearer token-invalido")
    assert excinfo.value.status_code == 401
    # Mensagem diferente da de "sem header" — distingue "nunca logou"
    # de "logou mas a sessão não vale mais".
    assert excinfo.value.detail == "Sessão inválida ou expirada. Faça login novamente."


@pytest.mark.asyncio
async def test_exigir_usuario_token_valido_retorna_usuario_id():
    token = gerar_token(admin_id=123)
    usuario_id = await exigir_usuario(authorization=f"Bearer {token}")
    assert usuario_id == 123


# ─── exigir_admin (além do header, checa is_admin no banco) ────────


async def test_exigir_admin_conta_admin_retorna_id(session):
    from app.models import Usuario

    usuario = Usuario(nome="Elizete", email="elizete@comuna.local", senha_hash="x", is_admin=True)
    session.add(usuario)
    await session.commit()
    await session.refresh(usuario)

    usuario_id = await exigir_admin(usuario_id=usuario.id, session=session)
    assert usuario_id == usuario.id


async def test_exigir_admin_conta_nao_admin_levanta_403(session):
    from app.models import Usuario

    usuario = Usuario(nome="João", email="joao@example.com", senha_hash="x", is_admin=False)
    session.add(usuario)
    await session.commit()
    await session.refresh(usuario)

    with pytest.raises(HTTPException) as excinfo:
        await exigir_admin(usuario_id=usuario.id, session=session)
    assert excinfo.value.status_code == 403


async def test_exigir_admin_usuario_inexistente_levanta_403(session):
    with pytest.raises(HTTPException) as excinfo:
        await exigir_admin(usuario_id=999999, session=session)
    assert excinfo.value.status_code == 403
