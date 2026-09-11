#!/bin/bash
# ============================================================
# testar-mutacao.sh — um script só: pytest -> mutmut run -> relatório
# HTML -> abre sozinho. Mesma filosofia do
# frontend/e2e/visual/gerar-relatorio.mjs (rodar um comando, sem passo
# manual). Uso: ./backend/testar-mutacao.sh (de qualquer lugar) ou
# `npm run test:mutation:backend` (raiz).
#
# Pressupõe Postgres já de pé e seedado — não sobe infra nova, só
# confere que dá pra conectar (ver README dos testes visuais pro mesmo
# pré-requisito: `npm run db:up && npm run db:migrate && npm run db:seed`).
#
# Mutation testing é lento (roda a suite inteira várias vezes, uma por
# mutante) — não é pra rodar a cada Edit como o hook de diff visual,
# só sob demanda.
# ============================================================
set -euo pipefail

DIR_BACKEND="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PYTHON="$DIR_BACKEND/.venv/bin/python"

if [ ! -x "$VENV_PYTHON" ]; then
  echo "✗ venv do backend não encontrada em $DIR_BACKEND/.venv — rode primeiro:" >&2
  echo "  python3 -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements.txt -r backend/requirements-dev.txt" >&2
  exit 1
fi

echo "→ Conferindo se o Postgres está de pé..."
if ! "$VENV_PYTHON" -c "
import asyncio, sys
sys.path.insert(0, '$DIR_BACKEND')
from app.config import settings
from sqlalchemy.ext.asyncio import create_async_engine

async def checar():
    engine = create_async_engine(settings.database_url_async)
    try:
        async with engine.connect():
            pass
    finally:
        await engine.dispose()

asyncio.run(checar())
" 2>/dev/null; then
  echo "✗ Não consegui conectar no Postgres. Rode primeiro (na raiz do repo):" >&2
  echo "  npm run db:up && npm run db:migrate && npm run db:seed" >&2
  exit 1
fi
echo "  ok"

echo "→ Rodando a suite de testes (pytest)..."
if ! (cd "$DIR_BACKEND" && "$VENV_PYTHON" -m pytest -q); then
  echo "✗ A suite já está vermelha — mutar código com testes quebrados não serve pra nada. Corrija os testes primeiro." >&2
  exit 1
fi
echo "  ok"

echo "→ Limpando cache do mutmut (mutants/, .mutmut-cache)..."
# O cache incremental do mutmut decide sozinho quais mutantes precisam
# ser re-testados quando algo muda — na prática, vimos ele manter
# resultado igual (82 sobreviventes) depois de reescrever vários
# testes que deveriam ter matado mutantes novos. Não vale o risco de
# reportar um placar desatualizado como se fosse atual — cada rodada
# aqui já é "sob demanda" (não a cada Edit como o hook visual), então
# o custo de recomeçar do zero toda vez é aceitável.
rm -rf "$DIR_BACKEND/mutants" "$DIR_BACKEND/.mutmut-cache"

echo "→ Rodando mutmut (isso demora — uma rodada de testes por mutante gerado)..."
(cd "$DIR_BACKEND" && "$VENV_PYTHON" -m mutmut run) || true
# mutmut run não retorna código de erro por causa de mutante
# sobrevivente (isso é resultado normal, não falha do comando em si)
# — quem decide "passou ou não" é o relatório, a seguir.

echo "→ Montando o relatório..."
(cd "$DIR_BACKEND" && "$VENV_PYTHON" gerar_relatorio_mutacao.py)
