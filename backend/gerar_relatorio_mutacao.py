#!/usr/bin/env python3
# ============================================================
# gerar_relatorio_mutacao.py — depois que `mutmut run` termina, monta
# UM relatório HTML estático (sem servidor, imagens/diffs embutidos
# no próprio arquivo) com os mutantes sobreviventes — nome+arquivo,
# diff antes/depois, resumo geral — e abre sozinho no navegador.
#
# Mesma filosofia do frontend/e2e/visual/gerar-relatorio.mjs (script
# único, sem passo manual). A diferença: mutmut 3.x não tem comando
# `html` (existia na série 2.x, foi removido na reescrita) — só
# `browse` (TUI interativa de terminal, não um relatório pra abrir no
# navegador). Por isso este script existe: monta o HTML a partir dos
# comandos oficiais do mutmut (`results`, `show`, `export-cicd-stats`)
# via subprocess — de propósito NÃO importa nada de mutmut.__main__
# (é a implementação interna do CLI, não uma API pública, pode mudar
# sem aviso entre versões).
#
# Uso: rodar de dentro de backend/ (mesmo cwd que `mutmut run` usou —
# é lá que fica pyproject.toml e a pasta mutants/), DEPOIS de
# `mutmut run` já ter terminado. Ver testar-mutacao.sh.
# ============================================================

import json
import os
import re
import subprocess
import sys
import webbrowser
from html import escape
from pathlib import Path

MUTMUT = [sys.executable, "-m", "mutmut"]
RELATORIO_PATH = Path(__file__).resolve().parent / "relatorio-mutacao.html"
STATS_PATH = Path("mutants/mutmut-cicd-stats.json")


def _rodar_mutmut(*args: str) -> str:
    resultado = subprocess.run([*MUTMUT, *args], capture_output=True, text=True)
    return resultado.stdout


def _coletar_mutantes_nao_mortos() -> list[dict]:
    """`mutmut results --all` imprime uma linha por mutante:
    "    <chave>: <status>". Só nos interessam os que NÃO foram
    mortos (survived, timeout, suspicious, no tests, ...)."""
    mutantes = []
    # "--all" não é um flag booleano de verdade nesta versão do mutmut
    # (sem is_flag=True na definição) — sem um valor explícito, o CLI
    # recusa com "Option '--all' requires an argument".
    for linha in _rodar_mutmut("results", "--all", "true").splitlines():
        m = re.match(r"^\s+(\S+):\s+(.+?)\s*$", linha)
        if not m:
            continue
        nome, status = m.group(1), m.group(2)
        if status == "killed":
            continue
        mutantes.append({"nome": nome, "status": status})
    return mutantes


def _diff_do_mutante(nome: str) -> str:
    """`mutmut show <nome>` imprime "# <nome>: <status>" na primeira
    linha, seguido do diff unificado (original vs mutante) — só o
    diff interessa aqui, o cabeçalho a gente já tem via `results`."""
    linhas = _rodar_mutmut("show", nome).splitlines()
    return "\n".join(linhas[1:]) if len(linhas) > 1 else "(sem diff disponível)"


def _gerar_stats_resumo() -> dict:
    subprocess.run([*MUTMUT, "export-cicd-stats"], capture_output=True, text=True)
    if STATS_PATH.exists():
        return json.loads(STATS_PATH.read_text())
    return {}


def _bloco_mutante(mutante: dict) -> str:
    return f"""
    <section class="mutante">
      <h3>🙁 {escape(mutante["nome"])}</h3>
      <p class="meta">status: {escape(mutante["status"])}</p>
      <pre>{escape(_diff_do_mutante(mutante["nome"]))}</pre>
    </section>"""


def main() -> int:
    mutantes = _coletar_mutantes_nao_mortos()
    stats = _gerar_stats_resumo()

    total = stats.get("total", 0)
    mortos = stats.get("killed", 0)
    sobreviventes = stats.get("survived", 0)

    resumo_ok = sobreviventes == 0 and total > 0
    classe_resumo = "tudo-ok" if resumo_ok else "tem-falha"
    if total == 0:
        texto_resumo = "⚠️ Nenhum mutante foi gerado — confira se app/ tem código pra mutar e se a suite roda."
        classe_resumo = "tem-falha"
    elif resumo_ok:
        texto_resumo = f"✓ Todos os {total} mutantes foram mortos pelos testes — nenhum sobrevivente."
    else:
        texto_resumo = f"✗ {sobreviventes} de {total} mutantes sobreviveram ({mortos} mortos) — a suite não pegou essas mudanças."

    html = f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Relatório de mutation testing — COMUNA backend</title>
<style>
  :root {{ color-scheme: light dark; }}
  body {{ font-family: system-ui, sans-serif; max-width: 960px; margin: 0 auto; padding: 24px 16px; line-height: 1.5; }}
  h1 {{ font-size: 1.4rem; }}
  .resumo {{ padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; font-weight: 600; }}
  .resumo.tudo-ok {{ background: #d4f4dd; color: #1a5c2e; }}
  .resumo.tem-falha {{ background: #fbdede; color: #7a1f1f; }}
  .meta {{ color: #666; font-weight: normal; font-size: 0.85em; }}
  section.mutante {{ border: 2px solid #d9534f; border-radius: 8px; padding: 16px; margin-bottom: 20px; }}
  section.mutante h3 {{ margin-top: 0; color: #a33; font-family: monospace; font-size: 1em; }}
  pre {{ white-space: pre-wrap; background: #f5f5f5; padding: 8px; border-radius: 4px; font-size: 0.85em; overflow-x: auto; }}
  @media (prefers-color-scheme: dark) {{
    body {{ background: #1a1a1a; color: #eee; }}
    pre {{ background: #2a2a2a; }}
  }}
</style>
</head>
<body>
  <h1>🧬 Relatório de mutation testing — backend</h1>
  <p class="meta">{total} mutante(s) no total</p>
  <p class="resumo {classe_resumo}">{texto_resumo}</p>
  {"<h2>Mutantes sobreviventes</h2>" + "".join(_bloco_mutante(m) for m in mutantes) if mutantes else ""}
</body>
</html>
"""
    RELATORIO_PATH.write_text(html)

    if resumo_ok:
        print(f"✓ {mortos} mutante(s) mortos, 0 sobreviventes.")
    else:
        print(f"✗ {sobreviventes}/{total} mutante(s) sobreviveram — veja o que sobrou de matar em {RELATORIO_PATH}")

        # Abre sozinho no navegador padrão do SO (webbrowser é stdlib,
        # já cobre xdg-open/open/start por baixo dos panos) — só
        # quando tem algo de fato pra ver. Silencioso se falhar (ex:
        # sem display, rodando numa máquina remota/headless).
        # MUTATION_REPORT_NO_OPEN=1 desliga (útil em CI), mesmo padrão
        # de VISUAL_REPORT_NO_OPEN no frontend.
        if not os.environ.get("MUTATION_REPORT_NO_OPEN"):
            try:
                webbrowser.open(RELATORIO_PATH.as_uri())
            except Exception:
                pass

    return 0 if resumo_ok else 1


if __name__ == "__main__":
    sys.exit(main())
