"""
exportar_estoque.py
===================
Lê o arquivo lib/dados.ts e exporta todos os produtos para
estoque_inicial.csv, pronto para importar no Google Sheets.

Uso:
    python exportar_estoque.py

Dependências: nenhuma (usa apenas stdlib do Python).
"""

import re
import csv
from pathlib import Path

# ─── Caminhos ────────────────────────────────────────────────
# Path(__file__).parent = pasta onde este script está salvo
# Analogia: os.path.dirname(__file__) em Python 2
RAIZ = Path(__file__).parent
DADOS_TS  = RAIZ / "lib" / "dados.ts"
OUTPUT    = RAIZ / "estoque_inicial.csv"

# ─── Colunas do CSV (mesma ordem do cabeçalho da aba Estoque) ─
COLUNAS = [
    "id",
    "nome",
    "preco",
    "unidade",
    "categoria",
    "emEstoque",
    "naCestaGrande",
    "naCestaPequena",
    "descricao",
    "imagemUrl",
]


def extrair(padrao: str, texto: str, default: str = "") -> str:
    """
    Busca um padrão regex e retorna o grupo 1 capturado.
    Retorna `default` se não encontrar.

    Analogia Python:
        match = re.search(padrao, texto)
        return match.group(1) if match else default
    """
    match = re.search(padrao, texto)
    return match.group(1) if match else default


def parsear_produto(bloco: str) -> dict | None:
    """
    Recebe o texto interno de um objeto TypeScript { ... }
    e extrai os campos como dicionário Python.

    Analogia: converter uma linha de CSV em dict com csv.DictReader.
    """
    produto_id = extrair(r'id:\s*"([^"]+)"', bloco)
    if not produto_id:
        return None  # bloco vazio ou comentário — ignora

    # booleans em TypeScript → "TRUE"/"FALSE" para checkbox do Google Sheets
    em_estoque     = extrair(r'emEstoque:\s*(true|false)',     bloco, "false").upper()
    na_grande      = extrair(r'naCestaGrande:\s*(true|false)', bloco, "false").upper()
    na_pequena     = extrair(r'naCestaPequena:\s*(true|false)',bloco, "false").upper()

    return {
        "id":             produto_id,
        "nome":           extrair(r'nome:\s*"([^"]+)"',     bloco),
        "preco":          extrair(r'preco:\s*([\d.]+)',       bloco),
        "unidade":        extrair(r'unidade:\s*"([^"]+)"',   bloco),
        "categoria":      extrair(r'categoria:\s*"([^"]+)"', bloco),
        "emEstoque":      em_estoque,
        "naCestaGrande":  na_grande,
        "naCestaPequena": na_pequena,
        # campos opcionais — ficam em branco se não existirem
        "descricao":      extrair(r'descricao:\s*"([^"]+)"', bloco),
        "imagemUrl":      extrair(r'imagemUrl:\s*"([^"]+)"', bloco),
    }


def main():
    print(f"Lendo: {DADOS_TS}")

    if not DADOS_TS.exists():
        print(f"ERRO: arquivo não encontrado: {DADOS_TS}")
        print("Certifique-se de rodar este script dentro da pasta App-COMUNA.")
        return

    conteudo = DADOS_TS.read_text(encoding="utf-8")

    # Isola apenas o trecho do array PRODUTOS_INICIAIS
    # Analogia: conteudo[inicio:fim] como slice de string em Python
    marcador = "PRODUTOS_INICIAIS: Produto[] = ["
    inicio = conteudo.find(marcador)
    if inicio == -1:
        print("ERRO: constante PRODUTOS_INICIAIS não encontrada no arquivo.")
        return

    fim = conteudo.find("];", inicio)
    bloco_array = conteudo[inicio:fim]

    # Extrai cada objeto { ... } (sem aninhar — produtos são objetos planos)
    # Analogia: re.findall() como SELECT de todas as linhas de uma tabela
    blocos_raw = re.findall(r"\{([^{}]+)\}", bloco_array, re.DOTALL)

    produtos = []
    ignorados = 0
    for bloco in blocos_raw:
        p = parsear_produto(bloco)
        if p:
            produtos.append(p)
        else:
            ignorados += 1

    if not produtos:
        print("ERRO: nenhum produto encontrado. Verifique o formato do dados.ts.")
        return

    # utf-8-sig = UTF-8 com BOM — necessário para o Excel/Sheets reconhecer acentos
    with open(OUTPUT, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=COLUNAS)
        writer.writeheader()
        writer.writerows(produtos)

    print(f"\n✅ Exportação concluída!")
    print(f"   {len(produtos)} produtos gravados em: {OUTPUT}")
    if ignorados:
        print(f"   ({ignorados} blocos vazios ignorados — normal)")
    print()
    print("Próximo passo: importe o CSV no Google Sheets:")
    print("  Arquivo → Importar → Fazer upload → selecione estoque_inicial.csv")
    print("  Separador: Vírgula | Não converter tipos automaticamente: NÃO")
    print()
    print("Dica: as colunas emEstoque/naCestaGrande/naCestaPequena chegam como")
    print("  texto 'TRUE'/'FALSE'. Depois da importação, selecione essas colunas")
    print("  e aplique Formatar → Células → Checkbox para virar caixas de seleção.")


if __name__ == "__main__":
    main()
