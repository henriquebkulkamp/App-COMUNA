#!/usr/bin/env python3
"""
Roda o motor de cálculo (lib/calculo.py) contra as receitas de exemplo
(exemplos/receitas_exemplo.py) e:

  1. imprime um resumo legível de cada receita no terminal
  2. salva o output completo (composição + memória de cálculo +
     alegações elegíveis) em JSON, um arquivo por receita, em
     exemplos/saida/

Rodar da pasta composicao/:
    python3 exemplos/gerar_exemplos.py
"""
import json
import sys
from dataclasses import asdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from lib.calculo import avaliar_alegacoes, calcular_composicao
from exemplos.receitas_exemplo import RECEITAS

SAIDA_DIR = Path(__file__).resolve().parent / "saida"

NUTRIENTES_RESUMO = [
    ("energia_kcal", "Energia", "kcal"),
    ("proteina_g", "Proteína", "g"),
    ("carboidrato_total_g", "Carboidrato total", "g"),
    ("acucares_totais_g", "Açúcares totais (proxy)", "g"),
    ("lipidios_g", "Gorduras totais", "g"),
    ("gordura_saturada_g", "Gordura saturada", "g"),
    ("fibra_alimentar_g", "Fibra alimentar", "g"),
    ("sodio_mg", "Sódio", "mg"),
]


def imprimir_resumo(nome_receita: str, composicao) -> None:
    print(f"\n{'=' * 70}")
    print(f"{nome_receita}")
    print(f"{'=' * 70}")
    print(f"peso total dos ingredientes: {composicao.peso_total_ingredientes_g:.0f} g")
    print(f"rendimento final da preparação: {composicao.rendimento_final_g:.0f} g")
    if composicao.porcao_g:
        print(f"porção de referência: {composicao.porcao_g:.0f} g")

    print(f"\n{'nutriente':<28}{'por 100g':>12}{'por porção':>14}")
    for chave, label, unidade in NUTRIENTES_RESUMO:
        v100 = composicao.por_100g[chave]
        linha = f"{label:<28}{v100:>9.2f} {unidade:<3}"
        if composicao.por_porcao:
            vporcao = composicao.por_porcao[chave]
            linha += f"{vporcao:>10.2f} {unidade}"
        print(linha)

    print("\nformulação da receita:")
    for chave, valor in composicao.formulacao.items():
        print(f"  {chave}: {valor}")

    if composicao.avisos:
        avisos_unicos = sorted(set(composicao.avisos))
        print(f"\navisos de qualidade de dado ({len(avisos_unicos)}):")
        for aviso in avisos_unicos[:6]:
            print(f"  - {aviso}")
        if len(avisos_unicos) > 6:
            print(f"  ... e mais {len(avisos_unicos) - 6}")

    alegacoes = avaliar_alegacoes(composicao)
    print(f"\nalegações elegíveis (com margem de segurança de 20%): {len(alegacoes)}")
    for a in alegacoes:
        print(f"  - {a.texto}")


def main() -> None:
    SAIDA_DIR.mkdir(exist_ok=True)
    for nome_receita, receita in RECEITAS.items():
        composicao = calcular_composicao(receita)
        imprimir_resumo(nome_receita, composicao)

        alegacoes = avaliar_alegacoes(composicao)

        def arred(d):
            return {k: round(v, 3) for k, v in d.items()} if d else d

        saida = {
            "receita": nome_receita,
            "por_100g": arred(composicao.por_100g),
            "por_porcao": arred(composicao.por_porcao),
            "porcao_g": composicao.porcao_g,
            "rendimento_final_g": composicao.rendimento_final_g,
            "peso_total_ingredientes_g": composicao.peso_total_ingredientes_g,
            "formulacao": composicao.formulacao,
            "memoria_calculo": [asdict(m) for m in composicao.memoria_calculo],
            "avisos": sorted(set(composicao.avisos)),
            "alegacoes_elegiveis": [asdict(a) for a in alegacoes],
            "versao_tbca": composicao.versao_tbca,
        }
        destino = SAIDA_DIR / f"{nome_receita}.json"
        destino.write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n\n{len(RECEITAS)} receitas calculadas -> {SAIDA_DIR}/")


if __name__ == "__main__":
    main()
