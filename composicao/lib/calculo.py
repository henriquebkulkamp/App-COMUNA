"""
O motor de composição nutricional: recebe uma receita (lista de
ingredientes com quantidade em gramas + peso final da preparação) e
devolve a composição nutricional calculada, usando a TBCA como fonte
de valor por 100g de cada ingrediente.

É uma função pura por design: não busca nada sozinha, não decide nada
sozinha, só resolve os valores de cada `codigo_tbca` na base local e
soma. Toda a "inteligência" (qual ingrediente é esse, em que estado de
preparo, se leva açúcar/sal/gordura adicionados) é responsabilidade de
quem monta a `Receita` -- o motor só calcula.

Base legal do método (cálculo indireto via tabela de composição em vez
de análise laboratorial): Manual de Rotulagem Nutricional Obrigatória
da Anvisa + IN nº 75/2020. Os critérios de alegação usados em
`avaliar_alegacoes` vêm do Anexo XX da IN nº 75/2020 (Anexo II pros
Valores Diários de Referência).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from . import tbca

# ---------------------------------------------------------------------------
# Input
# ---------------------------------------------------------------------------


@dataclass
class IngredienteReceita:
    codigo_tbca: str
    quantidade_g: float
    nome: str | None = None  # se omitido, usa o nome da própria TBCA
    acucar_adicionado: bool = False
    sal_adicionado: bool = False
    gordura_adicionada: bool = False


@dataclass
class Receita:
    ingredientes: list[IngredienteReceita]
    rendimento_final_g: float
    porcao_g: float | None = None


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------


@dataclass
class ItemMemoriaCalculo:
    codigo_tbca: str
    nome: str
    quantidade_g: float


@dataclass
class ComposicaoNutricional:
    por_100g: dict[str, float]
    por_porcao: dict[str, float] | None
    porcao_g: float | None
    rendimento_final_g: float
    peso_total_ingredientes_g: float
    formulacao: dict[str, bool]
    memoria_calculo: list[ItemMemoriaCalculo]
    avisos: list[str]
    versao_tbca: str = tbca.VERSAO_TBCA


# Nutrientes agregados na soma. Deixamos de fora os campos "_adicao"
# nativos da TBCA (sal/açúcar/gordura de adição) porque eles descrevem
# a composição INTERNA de um prato pronto já cadastrado na TBCA, não a
# formulação da SUA receita -- isso é o que `acucar_adicionado` /
# `sal_adicionado` / `gordura_adicionada` em IngredienteReceita fazem.
NUTRIENTES_AGREGADOS = [
    "energia_kcal",
    "umidade_g",
    "carboidrato_total_g",
    "acucares_totais_g",  # calculado à parte, ver _acucares_totais()
    "proteina_g",
    "lipidios_g",
    "fibra_alimentar_g",
    "cinzas_g",
    "colesterol_mg",
    "gordura_saturada_g",
    "gordura_monoinsaturada_g",
    "gordura_poliinsaturada_g",
    "gordura_trans_g",
    "calcio_mg",
    "ferro_mg",
    "sodio_mg",
    "magnesio_mg",
    "fosforo_mg",
    "potassio_mg",
    "zinco_mg",
    "vitamina_a_rae_mcg",
    "vitamina_c_mg",
    "vitamina_e_mg",
    "folato_mcg",
]

# A TBCA não tem uma coluna única "açúcares totais" -- separa em
# "Carboidrato disponível" (que inclui amido) e não isola mono/dissacarídeo
# pra todo alimento. Pra manter o MVP simples e transparente, usamos o
# "carboidrato disponível" como proxy de açúcares SÓ pra frutas/mel/açúcar
# puro (grupos onde quase todo carboidrato disponível é de fato açúcar);
# pra outros grupos isso superestimaria açúcar de amido. Fica documentado
# como limitação conhecida -- não é uma aproximação boa o bastante pra
# sustentar uma alegação "zero açúcar" em produção sem revisão manual.
CAMPO_ACUCARES_PROXY = "carboidrato_disponivel_g"


def _resolver_valor(bruto) -> tuple[float, str | None]:
    """Converte um valor bruto da TBCA num float somável.

    - None (TBCA não tem esse dado pro alimento) -> 0.0 + aviso, porque
      tratar ausência de dado como "não tem" silenciosamente é
      exatamente o tipo de erro que pode sustentar uma alegação errada
      (ex: 'fonte de zinco' calculada sobre um ingrediente cujo zinco
      simplesmente não foi medido).
    - "traco" (quantidade detectável mas abaixo do limite de
      quantificação) -> 0.0 + aviso, mesma lógica de cautela.
    - número -> ele mesmo.
    """
    if bruto is None:
        return 0.0, "ausente"
    if bruto == "traco":
        return 0.0, "traço"
    return float(bruto), None


def calcular_composicao(receita: Receita) -> ComposicaoNutricional:
    if not receita.ingredientes:
        raise ValueError("receita sem ingredientes")
    if receita.rendimento_final_g <= 0:
        raise ValueError("rendimento_final_g precisa ser > 0")

    totais: dict[str, float] = {n: 0.0 for n in NUTRIENTES_AGREGADOS}
    avisos: list[str] = []
    memoria: list[ItemMemoriaCalculo] = []
    peso_total = 0.0

    for ing in receita.ingredientes:
        alimento = tbca.obter(ing.codigo_tbca)
        nome = ing.nome or alimento.nome
        fator = ing.quantidade_g / 100.0
        peso_total += ing.quantidade_g

        perfil = alimento.nutrientes_por_100g
        for nutriente in NUTRIENTES_AGREGADOS:
            if nutriente == "acucares_totais_g":
                bruto = perfil.get(CAMPO_ACUCARES_PROXY)
            else:
                bruto = perfil.get(nutriente)
            valor, aviso = _resolver_valor(bruto)
            if aviso:
                avisos.append(f"{nome} ({ing.codigo_tbca}): {nutriente} {aviso} na TBCA")
            totais[nutriente] += valor * fator

        memoria.append(ItemMemoriaCalculo(ing.codigo_tbca, nome, ing.quantidade_g))

    fator_rendimento = 100.0 / receita.rendimento_final_g
    por_100g = {n: v * fator_rendimento for n, v in totais.items()}

    por_porcao = None
    if receita.porcao_g:
        fator_porcao = receita.porcao_g / 100.0
        por_porcao = {n: v * fator_porcao for n, v in por_100g.items()}

    formulacao = {
        "sem_acucar_adicionado": not any(i.acucar_adicionado for i in receita.ingredientes),
        "sem_sal_adicionado": not any(i.sal_adicionado for i in receita.ingredientes),
        "sem_gordura_adicionada": not any(i.gordura_adicionada for i in receita.ingredientes),
    }

    return ComposicaoNutricional(
        por_100g=por_100g,
        por_porcao=por_porcao,
        porcao_g=receita.porcao_g,
        rendimento_final_g=receita.rendimento_final_g,
        peso_total_ingredientes_g=peso_total,
        formulacao=formulacao,
        memoria_calculo=memoria,
        avisos=avisos,
    )


# ---------------------------------------------------------------------------
# Bonus: avaliação de alegações elegíveis (IN 75/2020, Anexo XX)
# ---------------------------------------------------------------------------
# Isso é o que a conversa anterior chamou de "risco de borda": só
# consideramos uma alegação elegível se o valor calculado tiver folga
# em relação ao limite (MARGEM_SEGURANCA), não só tecnicamente bater o
# corte -- rendimento de receita varia lote a lote, e a TBCA dá valor
# médio/típico, não o valor exato do prato que saiu da cozinha hoje.

MARGEM_SEGURANCA = 0.8  # só elegível se estiver a <=80% de um teto, ou >=120% de um piso

VDR_FIBRA_G = 25.0
VDR_PROTEINA_G = 50.0


@dataclass
class AlegacaoElegivel:
    texto: str
    base_legal: str
    valor_calculado: float
    limite: float


def avaliar_alegacoes(composicao: ComposicaoNutricional) -> list[AlegacaoElegivel]:
    """Avalia contra os valores 'por_porcao' quando existem (a IN 75/2020
    define a maioria dos critérios por porção), caindo pra 'por_100g'
    quando a receita não tem porção definida. Isso é uma simplificação
    -- vários critérios da IN 75/2020 exigem checar porção E 100g/ml ao
    mesmo tempo; pra uso em produção, refine por nutriente."""
    valores = composicao.por_porcao or composicao.por_100g
    elegiveis: list[AlegacaoElegivel] = []
    anexo = "IN 75/2020, Anexo XX"

    def teto(nutriente: str, limite: float, texto: str):
        v = valores[nutriente]
        if v <= limite * MARGEM_SEGURANCA:
            elegiveis.append(AlegacaoElegivel(texto, anexo, v, limite))

    def piso(nutriente: str, limite: float, texto: str):
        v = valores[nutriente]
        if v >= limite / MARGEM_SEGURANCA:
            elegiveis.append(AlegacaoElegivel(texto, anexo, v, limite))

    teto("energia_kcal", 4, "Não contém valor energético")
    teto("energia_kcal", 40, "Baixo teor calórico")
    teto("acucares_totais_g", 0.5, "Zero açúcar / não contém açúcares")
    teto("acucares_totais_g", 5, "Baixo teor de açúcares")
    teto("lipidios_g", 0.5, "Zero gordura / não contém gorduras totais")
    teto("lipidios_g", 3, "Baixo teor de gorduras totais")
    teto("gordura_saturada_g", 0.1, "Zero gordura saturada / não contém")
    teto("gordura_saturada_g", 1.5, "Baixo teor de gordura saturada")
    teto("gordura_trans_g", 0.1, "Zero gordura trans / não contém")
    teto("sodio_mg", 5, "Não contém sódio")
    teto("sodio_mg", 40, "Muito baixo teor de sódio")
    teto("sodio_mg", 80, "Baixo teor de sódio")
    piso("fibra_alimentar_g", VDR_FIBRA_G * 0.10, "Fonte de fibra alimentar")
    piso("fibra_alimentar_g", VDR_FIBRA_G * 0.20, "Alto teor / rico em fibra alimentar")
    piso("proteina_g", VDR_PROTEINA_G * 0.10, "Fonte de proteína")
    piso("proteina_g", VDR_PROTEINA_G * 0.20, "Alto teor / rico em proteína")

    if composicao.formulacao["sem_acucar_adicionado"]:
        elegiveis.append(AlegacaoElegivel("Sem adição de açúcares", anexo, 0, 0))
    if composicao.formulacao["sem_sal_adicionado"]:
        elegiveis.append(AlegacaoElegivel("Sem adição de sal", anexo, 0, 0))
    if composicao.formulacao["sem_gordura_adicionada"]:
        elegiveis.append(AlegacaoElegivel("Sem adição de gorduras/óleos", anexo, 0, 0))

    return elegiveis
