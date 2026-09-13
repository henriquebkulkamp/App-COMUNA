"""
Catálogo de receitas dos produtos REAIS da loja (`produto_id`, o mesmo
id de `estoque_inicial.csv` / tabela `produtos`) — a ponte entre o
motor de cálculo (`lib/calculo.py`) e o rótulo nutricional que aparece
em `/produto/:id` no frontend.

Isso é o único lugar onde entra julgamento humano: qual código TBCA
corresponde a qual produto, e (pros processados) qual receita/gramatura
plausível. Achar o código: `lib.tbca.buscar_por_nome("termo")`. Depois
disso pra frente é tudo automático — rodar `gerar_seed_nutricional.py`
recalcula os 15 nutrientes do rótulo pra todo produto listado aqui.

Produto in natura (abacate, mel, banana-passa) = receita de 1
ingrediente só, `rendimento_final_g` igual à `quantidade_g` (sem perda
de peso, não tem preparo). Produto processado (bolo de mandioca) = uma
receita de verdade, com `rendimento_final_g` menor que a soma dos
ingredientes crus (perda de umidade no preparo/forno) — ver
`composicao/README.md`, seção "O motor de cálculo", sobre por que esse
número importa tanto.

`INGREDIENTES` é a lista que aparece na aba "Ingredientes" da tela de
produto (`SecaoIngredientes.tsx`) — não vem do motor (o motor não
formata nome de rótulo, só calcula números), por isso mora separado
aqui, ao lado da receita que gerou a nutrição, pra ficar óbvio que as
duas coisas descrevem o mesmo produto.
"""
from __future__ import annotations

from lib.calculo import IngredienteReceita, Receita

# Porção de referência do rótulo — "100 g" pra todo produto aqui, pra
# manter a tabela comparável entre produtos e simples de gerar (mesma
# convenção nos 4 produtos já cadastrados; produto vendido por
# embalagem pequena, ex. banana-passa de 60g, ainda mostra por 100g,
# igual a como pacotes de fruta seca fazem rótulo por 100g mesmo
# quando a embalagem é menor -- fica pro cliente multiplicar).
PORCAO_PADRAO = "100 g"

RECEITAS: dict[str, Receita] = {
    # Abacate, polpa in natura, Brasil.
    "abacate": Receita(
        ingredientes=[IngredienteReceita("BRC0001C", 100, "Abacate")],
        rendimento_final_g=100,
        porcao_g=100,
    ),
    # Mel de abelha, Brasil (sem variedade "silvestre" específica na
    # TBCA -- usamos o mel de abelha genérico como aproximação).
    "mel-silvestre-cipo-uva-350": Receita(
        ingredientes=[IngredienteReceita("BRC0028K", 100, "Mel silvestre")],
        rendimento_final_g=100,
        porcao_g=100,
    ),
    # Banana, passa, Brasil -- já desidratada na própria TBCA, sem
    # perda de peso adicional a calcular aqui.
    "banana-passa": Receita(
        ingredientes=[IngredienteReceita("BRC0313C", 100, "Banana passa")],
        rendimento_final_g=100,
        porcao_g=100,
    ),
    # Bolo de mandioca -- receita caseira plausível (mandioca ralada
    # crua + ovos + açúcar + farinha de trigo + manteiga + leite +
    # fermento em pó), 1192g de ingredientes crus rendendo 980g depois
    # de assado (perda de água no forno, ~18%).
    "bolo-mandioca": Receita(
        ingredientes=[
            IngredienteReceita("BRC0027B", 500, "Mandioca"),
            IngredienteReceita("BRC0011J", 100, "Ovos"),
            IngredienteReceita("BRC0007K", 180, "Açúcar", acucar_adicionado=True),
            IngredienteReceita("BRC0139A", 60, "Farinha de trigo"),
            IngredienteReceita("BRC0004D", 100, "Manteiga", gordura_adicionada=True),
            IngredienteReceita("BRC0043G", 240, "Leite"),
            IngredienteReceita("BRC0006L", 12, "Fermento em pó"),
        ],
        rendimento_final_g=980,
        porcao_g=100,
    ),
}

# Lista de exibição da aba "Ingredientes" -- na ordem do rótulo
# (maior quantidade primeiro). Produto in natura repete o próprio nome
# do produto (não existe "sem ingrediente", ver SecaoIngredientes.tsx).
INGREDIENTES: dict[str, list[str]] = {
    "abacate": ["Abacate"],
    "mel-silvestre-cipo-uva-350": ["Mel silvestre"],
    "banana-passa": ["Banana passa"],
    "bolo-mandioca": ["Mandioca", "Ovos", "Açúcar", "Farinha de trigo", "Manteiga", "Leite", "Fermento em pó"],
}

assert RECEITAS.keys() == INGREDIENTES.keys(), (
    "todo produto_id em RECEITAS precisa de uma lista correspondente em INGREDIENTES (e vice-versa)"
)
