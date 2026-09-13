#!/usr/bin/env python3
"""
A AUTOMAÇÃO: pega as receitas reais de produto em `receitas_catalogo.py`,
roda o motor de cálculo (`lib/calculo.py`, base TBCA 7.2) e formata o
resultado exatamente no formato que o rótulo nutricional do frontend
espera (`InfoNutricional` em frontend/src/lib/types.ts / TabelaNutricional.tsx),
salvando em `produtos/saida/produtos_nutricional.json`.

`db/seed.mjs` LÊ esse JSON pra popular `produto_ingredientes` e
`produto_info_nutricional` -- não tem mais número de nutriente digitado
à mão no seed. Fluxo completo pra adicionar/atualizar um produto:

    1. achar o código TBCA certo (lib/tbca.buscar_por_nome)
    2. adicionar a receita em receitas_catalogo.py
    3. rodar este script (de dentro de composicao/):
           python3 produtos/gerar_seed_nutricional.py
    4. rodar `npm run db:seed` na raiz do projeto

`vitaminaAMg` guarda o valor de vitamina A em mcg/RAE que a TBCA
devolve, SEM converter -- é a mesma unidade que
`VALOR_DIARIO_REFERENCIA.vitaminaAMg` (900) usa em
frontend/src/lib/nutricional.ts; o nome do campo é herança do rótulo de
referência (estilo FDA/Amazon), que também chama esse número de "mg".
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from lib.calculo import ComposicaoNutricional, calcular_composicao
from produtos.receitas_catalogo import INGREDIENTES, PORCAO_PADRAO, RECEITAS

SAIDA_PATH = Path(__file__).resolve().parent / "saida" / "produtos_nutricional.json"

# Mapa nutriente do motor (snake_case, unidade SI) -> campo do
# InfoNutricional do frontend (camelCase, mesma unidade exceto onde
# comentado). Só os nutrientes que o rótulo exibe entram aqui -- o
# motor calcula mais (magnésio, zinco, folato, ...) que o rótulo de
# referência não tem espaço/campo pra mostrar.
CAMPOS_ROTULO = [
    ("caloriasKcal", "energia_kcal", 0),
    ("gordurasTotaisG", "lipidios_g", 2),
    ("gordurasSaturadasG", "gordura_saturada_g", 2),
    ("gordurasTransG", "gordura_trans_g", 2),
    ("colesterolMg", "colesterol_mg", 2),
    ("sodioMg", "sodio_mg", 2),
    ("carboidratosTotaisG", "carboidrato_total_g", 2),
    ("fibraAlimentarG", "fibra_alimentar_g", 2),
    ("acucaresG", "acucares_totais_g", 2),
    ("proteinasG", "proteina_g", 2),
    ("vitaminaAMg", "vitamina_a_rae_mcg", 2),  # sem converter, ver docstring
    ("vitaminaCMg", "vitamina_c_mg", 2),
    ("calcioMg", "calcio_mg", 2),
    ("ferroMg", "ferro_mg", 2),
    ("potassioMg", "potassio_mg", 2),
]


def formatar_info_nutricional(composicao: ComposicaoNutricional) -> dict:
    info = {"porcao": PORCAO_PADRAO}
    for campo_rotulo, campo_motor, casas in CAMPOS_ROTULO:
        info[campo_rotulo] = round(composicao.por_100g[campo_motor], casas)
    return info


def main() -> None:
    saida: dict[str, dict] = {}
    avisos_totais = 0

    for produto_id, receita in RECEITAS.items():
        composicao = calcular_composicao(receita)
        avisos_totais += len(composicao.avisos)
        saida[produto_id] = {
            "ingredientes": INGREDIENTES[produto_id],
            "infoNutricional": formatar_info_nutricional(composicao),
        }
        print(f"  {produto_id}: {composicao.por_100g['energia_kcal']:.0f} kcal/100g "
              f"({len(composicao.avisos)} aviso(s))")

    SAIDA_PATH.parent.mkdir(exist_ok=True)
    SAIDA_PATH.write_text(json.dumps(saida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\n{len(saida)} produtos calculados -> {SAIDA_PATH}")
    if avisos_totais:
        print(f"({avisos_totais} aviso(s) de dado ausente/traço na TBCA -- ver lib/calculo.py::_resolver_valor)")


if __name__ == "__main__":
    main()
