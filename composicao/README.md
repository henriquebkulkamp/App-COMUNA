# Composição nutricional via TBCA

Motor de cálculo que recebe uma receita (ingredientes + quantidades) e
devolve a composição nutricional calculada, usando a TBCA (Tabela
Brasileira de Composição de Alimentos, USP) como fonte de dado por
ingrediente — sem análise laboratorial, só cálculo indireto (método
aceito pela Anvisa, ver conversa que originou isso).

Isso é um protótipo standalone, fora do `backend/` do projeto de
propósito — a ideia é validar o motor e os dados aqui antes de decidir
como/se ele entra na aplicação de verdade.

## O que tem aqui

```
composicao/
├── dados/
│   ├── scraper_tbca.py           # baixa os dados direto de tbca.net.br
│   └── tbca/
│       ├── indice_alimentos.json # catálogo completo: 5.875 alimentos (código, nome, grupo)
│       └── alimentos_tbca.json   # 5.486 alimentos com composição nutricional completa por 100g
├── lib/
│   ├── tbca.py                   # carrega e busca na base local
│   └── calculo.py                # o motor de composição em si
├── exemplos/
│   ├── receitas_exemplo.py       # 5 receitas com códigos TBCA reais
│   ├── gerar_exemplos.py         # roda o motor e salva o resultado
│   └── saida/*.json              # output gerado (composição + memória de cálculo + alegações)
├── produtos/
│   ├── receitas_catalogo.py      # receita real de cada produto_id da loja (o único lugar
│   │                             #   com julgamento humano: qual código TBCA é qual produto)
│   ├── gerar_seed_nutricional.py # roda o motor sobre receitas_catalogo.py e formata o
│   │                             #   resultado no shape do InfoNutricional do frontend
│   └── saida/produtos_nutricional.json  # o que db/seed.mjs lê pra popular
│                                 #   produto_ingredientes / produto_info_nutricional
└── alegacoes (nao verificado) .txt   # notas da conversa sobre alegações da IN 75/2020
```

## Os dados baixados

A TBCA não tem API — é site em PHP com sessão, sem endpoint público.
`scraper_tbca.py` varre o site (`tbca.net.br/base-dados/`) em duas
etapas:

```bash
cd dados
python3 scraper_tbca.py index          # ~60 requests, monta o índice completo
python3 scraper_tbca.py detalhes 5544  # baixa a ficha nutricional de cada item sem marca
```

Baixamos **todos os 5.486 alimentos "genéricos"** da base (in natura,
cru, cozido, grelhado, preparações caseiras — excluindo os ~330 itens
que são produto de marca comercial específica, que não servem de
ingrediente genérico de receita). ~36 campos por alimento: energia,
macronutrientes, perfil de ácidos graxos, colesterol, minerais,
vitaminas, e os campos próprios da TBCA de açúcar/sal/gordura "de
adição" (úteis só pra pratos já prontos cadastrados na própria TBCA,
não pra sua receita — ver seção de formulação abaixo).

Achado no meio do caminho: o site exige um cookie de sessão
(`PHPSESSID`) pra renderizar a ficha completa — sem ele, a página às
vezes volta sem a tabela. `scraper_tbca.py` mantém uma sessão (`http.cookiejar`)
reaproveitada em todas as requisições, o que levou a taxa de sucesso de
~70% pra ~99%.

## O motor de cálculo (`lib/calculo.py`)

### Input

```python
Receita(
    ingredientes=[
        IngredienteReceita("BRC0020B", 200, "Cenoura, sem casca, crua"),
        IngredienteReceita("BRC0020L", 4, "Sal refinado", sal_adicionado=True),
        # ...
    ],
    rendimento_final_g=850,  # peso do prato PRONTO, depois de cozinhar
    porcao_g=250,            # opcional — só se quiser o valor "por porção" também
)
```

Cada `IngredienteReceita` precisa de:
- **`codigo_tbca`** — não o nome livre. "Cenoura crua" e "cenoura
  cozida" são entradas diferentes na TBCA, com valores bem diferentes;
  quem resolve o número é o código.
- **`quantidade_g`** — peso do ingrediente como entra na receita.
- **`acucar_adicionado` / `sal_adicionado` / `gordura_adicionada`** —
  flags manuais, não vêm da TBCA. É você que sabe que mel é açúcar
  adicionado numa salada de fruta; a TBCA só sabe o perfil nutricional
  do mel em si.

`rendimento_final_g` é o número mais fácil de esquecer e mais importante
de acertar: dividir pelo peso bruto dos ingredientes em vez do peso
final cozido é o erro clássico que faz o "por 100g" sair errado.

### Output (`ComposicaoNutricional`)

```python
por_100g            # dict com ~23 nutrientes, valor por 100g do prato PRONTO
por_porcao          # mesmo dict, escalado pra porcao_g (None se porcao_g não foi informado)
formulacao          # {"sem_acucar_adicionado": bool, "sem_sal_adicionado": bool, "sem_gordura_adicionada": bool}
memoria_calculo     # [{codigo_tbca, nome, quantidade_g}, ...] — a receita que gerou o número
avisos              # dado ausente ou "traço" na TBCA para algum ingrediente/nutriente
versao_tbca         # "7.2"
```

`memoria_calculo` e `avisos` não são "nutriente", são prova: se um dia
questionarem de onde saiu um valor no rótulo, é o que te defende — e se
um "zero X" saiu batido só porque o dado daquele nutriente tava ausente
na TBCA (não porque o alimento realmente não tem), `avisos` avisa antes
de você publicar a alegação.

### Bônus: `avaliar_alegacoes()`

Aplica os critérios do **Anexo XX da IN 75/2020** (energia, açúcares,
gorduras, sódio, fibra, proteína) sobre o resultado calculado, com uma
margem de segurança de 20% — só marca uma alegação como elegível se o
valor tiver folga do limite, não só bater o corte matematicamente (ver
"risco de borda" nos exemplos abaixo).

## Rodando os exemplos

```bash
python3 exemplos/gerar_exemplos.py
```

5 receitas com ingredientes reais da base baixada. A dupla
`salada_de_frutas_sem_mel` / `salada_de_frutas_com_mel` é o exemplo
mais direto da distinção que motivou tudo isso: mesma fruta, a única
diferença é 15g de mel —

| | sem mel | com mel |
|---|---|---|
| açúcares totais /100g | 11,2g | 14,5g |
| **sem_acucar_adicionado** | **True** | **False** |
| "Zero açúcar" elegível? | Não (11,2g >> 0,5g) | Não (14,5g >> 0,5g) |
| "Sem adição de açúcares" elegível? | **Sim** | **Não** |

Nenhuma das duas pode alegar "zero açúcar" — é fruta, açúcar natural
alto nas duas. Só a sem-mel pode alegar "sem adição de açúcares". É
exatamente o ponto: a primeira alegação é sobre o **número**, a segunda
é sobre a **receita**, e uma não implica a outra.

## Limitações conhecidas (não é production-ready)

- **Açúcares totais é uma aproximação.** A TBCA não isola
  mono/dissacarídeo pra todo alimento — usamos "carboidrato disponível"
  como proxy, o que é razoável pra fruta/mel/açúcar puro mas
  superestimaria açúcar em algo com muito amido (arroz, batata). Os
  exemplos de arroz/batata acima têm esse viés; não usar esse número
  pra sustentar uma alegação de açúcar em receita com cereal/tubérculo
  sem revisar.
- **Sem fator de parte comestível/refugo.** Itens de fruta "in natura"
  podem ou não já vir líquidos de casca/semente na TBCA dependendo do
  alimento — não tratamos isso, então quantidade de fruta com casca
  grossa (ex: melancia) pode sair super/subestimada.
- **Arredondamento de exibição é simplificado.** Não implementa a
  tabela oficial de arredondamento por faixa do Anexo da IN 75/2020 —
  os números aqui são o valor calculado "cru", não o valor que iria
  pro rótulo depois de arredondado pela regra oficial.
- **`avaliar_alegacoes` simplifica "porção E 100g".** A IN 75/2020 exige
  checar os dois critérios simultaneamente pra vários nutrientes; o
  código usa só um (porção se existir, senão 100g).
- `avaliar_alegacoes` (alegações elegíveis da IN 75/2020) ainda não é
  usado em produção — só o cálculo de composição em si (`por_100g`)
  alimenta o rótulo real (ver seção seguinte). Decidir isso é passo
  futuro, não bloqueia o rótulo nutricional.

## Ligação com a aplicação de verdade (`produtos/`)

O motor JÁ alimenta o rótulo nutricional real (`/produto/:id` no
frontend, tabelas `produto_ingredientes`/`produto_info_nutricional` no
Postgres) — não é mais só protótipo isolado. `produtos/` é a ponte:

```bash
# 1. achar o código TBCA do ingrediente (lib/tbca.buscar_por_nome)
# 2. registrar a receita do produto em produtos/receitas_catalogo.py
# 3. rodar o gerador (de dentro de composicao/):
python3 produtos/gerar_seed_nutricional.py
# 4. rodar o seed do banco (na raiz do projeto):
npm run db:seed
```

`gerar_seed_nutricional.py` roda `calcular_composicao` sobre cada
receita e escreve `produtos/saida/produtos_nutricional.json` já no
formato que `InfoNutricional` (frontend) espera; `db/seed.mjs` lê esse
JSON direto — nenhum nutriente é digitado à mão no seed. Só entra
julgamento humano em `receitas_catalogo.py` (qual código TBCA é qual
produto, e a receita/rendimento de produtos processados); a partir daí
tudo é automático e reprodutível.
