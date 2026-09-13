"""
Receitas de exemplo pra exercitar o motor de cálculo (lib/calculo.py)
com códigos reais da base local da TBCA (dados/tbca/alimentos_tbca.json).

Os pares de "Salada de frutas" (com e sem mel) existem de propósito:
são o mesmo prato, e só a presença do mel muda a alegação "sem adição
de açúcares" de True pra False -- mesmo com o valor de açúcares TOTAIS
continuando alto nos dois casos (é açúcar de fruta, não some com ou
sem mel). É exatamente a distinção "sem açúcar adicionado" x "zero
açúcar" discutida antes de implementar isso.
"""
from lib.calculo import IngredienteReceita, Receita

RECEITAS: dict[str, Receita] = {
    "sopa_de_legumes": Receita(
        ingredientes=[
            IngredienteReceita("BRC0020B", 200, "Cenoura, sem casca, crua"),
            IngredienteReceita("BRC0013B", 200, "Batata inglesa, sem casca, crua"),
            IngredienteReceita("BRC0018B", 80, "Cebola branca, crua"),
            IngredienteReceita("BRC0010B", 10, "Alho, cru"),
            IngredienteReceita("BRC0002D", 15, "Azeite de oliva", gordura_adicionada=True),
            IngredienteReceita("BRC0020L", 4, "Sal refinado", sal_adicionado=True),
        ],
        # ingredientes crus somam 509g; entra água de cozimento e depois
        # reduz por evaporação -- rendimento final estimado da panela.
        rendimento_final_g=850,
        porcao_g=250,
    ),
    "arroz_com_feijao_temperado": Receita(
        ingredientes=[
            # usamos os itens já COZIDOS da TBCA pro arroz e feijão --
            # evita ter que estimar absorção de água do grão cru
            IngredienteReceita("BRC0016A", 300, "Arroz integral, cozido"),
            IngredienteReceita("BRC0001T", 250, "Feijão carioca, cozido (grão+caldo)"),
            IngredienteReceita("BRC0018B", 40, "Cebola branca, crua"),
            IngredienteReceita("BRC0010B", 6, "Alho, cru"),
            IngredienteReceita("BRC0002D", 10, "Azeite de oliva", gordura_adicionada=True),
            IngredienteReceita("BRC0020L", 3, "Sal refinado", sal_adicionado=True),
        ],
        rendimento_final_g=590,
        porcao_g=200,
    ),
    "salada_de_frango_grelhado": Receita(
        ingredientes=[
            IngredienteReceita("BRC0114F", 120, "Peito de frango, sem pele, grelhado"),
            IngredienteReceita("BRC0009B", 50, "Alface, crua"),
            IngredienteReceita("BRC0035B", 80, "Tomate, cru"),
            IngredienteReceita("BRC0020B", 50, "Cenoura, sem casca, crua"),
            IngredienteReceita("BRC0002D", 10, "Azeite de oliva", gordura_adicionada=True),
            IngredienteReceita("BRC0020L", 1, "Sal refinado", sal_adicionado=True),
        ],
        # montagem fria, sem cozimento depois de reunir os componentes
        rendimento_final_g=311,
        porcao_g=311,
    ),
    "salada_de_frutas_sem_mel": Receita(
        ingredientes=[
            IngredienteReceita("BRC0023C", 150, "Maçã, com casca, in natura"),
            IngredienteReceita("BRC0017C", 150, "Laranja, in natura"),
        ],
        rendimento_final_g=300,
        porcao_g=150,
    ),
    "salada_de_frutas_com_mel": Receita(
        ingredientes=[
            IngredienteReceita("BRC0023C", 150, "Maçã, com casca, in natura"),
            IngredienteReceita("BRC0017C", 150, "Laranja, in natura"),
            IngredienteReceita("BRC0028K", 15, "Mel de abelha", acucar_adicionado=True),
        ],
        rendimento_final_g=315,
        porcao_g=150,
    ),
}
