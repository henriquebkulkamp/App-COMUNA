#!/usr/bin/env python3
"""
Baixa dados da TBCA (Tabela Brasileira de Composição de Alimentos - USP)
direto de www.tbca.net.br, pra popular uma base local de referência
nutricional por ingrediente.

Não existe API oficial da TBCA -- o site é só HTML com links ofuscados
(parâmetro criptografado) por alimento. Esse script:

1. Varre as páginas de listagem (composicao_alimentos.php?pagina=N) pra
   montar o índice completo (código, nome, nome científico, grupo, marca
   + o link ofuscado da ficha de detalhe).
2. Pra um subconjunto de alimentos (sem marca comercial = ingredientes
   "genéricos", não produto industrializado específico), baixa a ficha
   de detalhe (int_composicao_alimentos.php) e extrai a tabela de
   composição "Valor por 100g".

Uso:
    python3 scraper_tbca.py index       # só o índice (rápido, ~60 requests)
    python3 scraper_tbca.py detalhes N  # baixa detalhe de N alimentos do índice
"""
import re
import sys
import json
import time
import html
import unicodedata
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = "https://www.tbca.net.br/base-dados/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ComunaComposicaoBot/1.0; uso interno de projeto de e-commerce de alimentos; contato: henriquebloemerk@gmail.com)"
}

INDEX_PATH = "tbca/indice_alimentos.json"
DETALHES_PATH = "tbca/alimentos_tbca.json"

# O site é PHP com sessão (PHPSESSID). Sem cookie de sessão, a ficha de
# detalhe às vezes vem sem a tabela de composição (renderização
# incompleta do lado do servidor). Mantemos UM cookiejar/opener global
# reaproveitado em todas as requisições do processo.
import http.cookiejar

_cookiejar = http.cookiejar.CookieJar()
_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(_cookiejar))
_opener.addheaders = [("User-Agent", HEADERS["User-Agent"])]


def iniciar_sessao():
    """Visita a página de listagem uma vez pra obter um PHPSESSID válido
    antes de baixar qualquer ficha de detalhe."""
    _opener.open(f"{BASE}composicao_alimentos.php", timeout=20).read()


def get(url: str, tentativas: int = 3) -> str:
    for i in range(tentativas):
        try:
            with _opener.open(url, timeout=20) as resp:
                return resp.read().decode("utf-8", errors="ignore")
        except (urllib.error.URLError, TimeoutError) as e:
            if i == tentativas - 1:
                raise
            time.sleep(1.5 * (i + 1))
    raise RuntimeError("unreachable")


def strip_tags(s: str) -> str:
    s = re.sub(r"<i>|</i>", "", s)
    s = re.sub(r"<[^>]+>", "", s)
    return html.unescape(s).strip()


def baixar_indice(max_paginas: int = 90) -> list[dict]:
    itens = []
    vistos = set()
    paginas_vazias_seguidas = 0
    for pagina in range(1, max_paginas + 1):
        url = f"{BASE}composicao_alimentos.php?pagina={pagina}&atuald=1"
        try:
            pagehtml = get(url)
        except Exception as e:
            print(f"  pagina {pagina}: erro {e}, parando", file=sys.stderr)
            break
        rows = re.findall(r"<tr>(.*?)</tr>", pagehtml, re.S)
        rows = rows[1:]  # primeira é cabeçalho
        if not rows:
            paginas_vazias_seguidas += 1
            if paginas_vazias_seguidas >= 2:
                break
            continue
        paginas_vazias_seguidas = 0
        novos_na_pagina = 0
        for r in rows:
            cells = re.findall(r"<td>(.*?)</td>", r, re.S)
            if len(cells) < 4:
                continue
            link_match = re.search(r"href='([^']+)'", cells[0])
            codigo = strip_tags(cells[0])
            nome = strip_tags(cells[1])
            nome_cientifico = strip_tags(cells[2]) if len(cells) > 2 else ""
            grupo = strip_tags(cells[3]) if len(cells) > 3 else ""
            marca = strip_tags(cells[4]) if len(cells) > 4 else ""
            if not link_match or not codigo:
                continue
            if codigo in vistos:
                continue
            vistos.add(codigo)
            novos_na_pagina += 1
            itens.append({
                "codigo": codigo,
                "nome": nome,
                "nome_cientifico": nome_cientifico,
                "grupo": grupo,
                "marca": marca,
                "link_detalhe": html.unescape(link_match.group(1)),
            })
        print(f"  pagina {pagina}: +{novos_na_pagina} itens (total {len(itens)})", file=sys.stderr)
        if novos_na_pagina == 0:
            paginas_vazias_seguidas += 1
            if paginas_vazias_seguidas >= 2:
                break
        time.sleep(0.15)
    return itens


# mapeia o nome do "Componente" na tabela da TBCA -> chave normalizada nossa
MAPA_COMPONENTES = {
    "Energia_kJ": "energia_kj",
    "Energia_kcal": "energia_kcal",
    "Umidade_g": "umidade_g",
    "Carboidrato total_g": "carboidrato_total_g",
    "Carboidrato disponível_g": "carboidrato_disponivel_g",
    "Proteína_g": "proteina_g",
    "Lipídios_g": "lipidios_g",
    "Fibra alimentar_g": "fibra_alimentar_g",
    "Álcool_g": "alcool_g",
    "Cinzas_g": "cinzas_g",
    "Colesterol_mg": "colesterol_mg",
    "Ácidos graxos saturados_g": "gordura_saturada_g",
    "Ácidos graxos monoinsaturados_g": "gordura_monoinsaturada_g",
    "Ácidos graxos poliinsaturados_g": "gordura_poliinsaturada_g",
    "Ácidos graxos trans_g": "gordura_trans_g",
    "Cálcio_mg": "calcio_mg",
    "Ferro_mg": "ferro_mg",
    "Sódio_mg": "sodio_mg",
    "Magnésio_mg": "magnesio_mg",
    "Fósforo_mg": "fosforo_mg",
    "Potássio_mg": "potassio_mg",
    "Manganês_mg": "manganes_mg",
    "Zinco_mg": "zinco_mg",
    "Cobre_mg": "cobre_mg",
    "Selênio_mcg": "selenio_mcg",
    "Vitamina A (RE)_mcg": "vitamina_a_re_mcg",
    "Vitamina A (RAE)_mcg": "vitamina_a_rae_mcg",
    "Vitamina D_mcg": "vitamina_d_mcg",
    "Alfa-tocoferol (Vitamina E)_mg": "vitamina_e_mg",
    "Tiamina_mg": "tiamina_mg",
    "Riboflavina_mg": "riboflavina_mg",
    "Niacina_mg": "niacina_mg",
    "Vitamina B6_mg": "vitamina_b6_mg",
    "Vitamina B12_mcg": "vitamina_b12_mcg",
    "Vitamina C_mg": "vitamina_c_mg",
    "Equivalente de folato_mcg": "folato_mcg",
    "Sal de adição_g": "sal_adicao_g",
    "Açúcar de adição_g": "acucar_adicao_g",
    "Gordura de adição_g": "gordura_adicao_g",
}


def parse_valor(v: str):
    v = v.strip()
    if v in ("", "NA"):
        return None
    if v == "tr":
        return "traco"  # traço: presente, mas abaixo do limite de quantificação
    v = v.replace(".", "").replace(",", ".")
    try:
        return float(v)
    except ValueError:
        return None


def baixar_detalhe(item: dict, tentativas: int = 4) -> dict | None:
    url = f"{BASE}{item['link_detalhe']}"
    for tentativa in range(tentativas):
        try:
            pagehtml = get(url, tentativas=1)
        except Exception as e:
            time.sleep(0.4 * (tentativa + 1))
            continue
        rows = re.findall(r"<tr>(.*?)</tr>", pagehtml, re.S)
        nutrientes = {}
        for r in rows:
            cells = re.findall(r"<td[^>]*>(.*?)</td>", r, re.S)
            if len(cells) < 3:
                continue
            componente = strip_tags(cells[0])
            unidade = strip_tags(cells[1])
            valor_100g = strip_tags(cells[2])
            if not componente or componente == "Componente":
                continue
            chave_bruta = f"{componente}_{unidade}"
            chave = MAPA_COMPONENTES.get(chave_bruta)
            if chave is None:
                continue
            nutrientes[chave] = parse_valor(valor_100g)
        if nutrientes:
            return {
                **{k: item[k] for k in ("codigo", "nome", "nome_cientifico", "grupo", "marca")},
                "nutrientes_por_100g": nutrientes,
            }
        # página veio sem a tabela (renderização incompleta do lado do
        # servidor sob concorrência) -- espera um pouco e tenta de novo
        time.sleep(0.4 * (tentativa + 1))
    print(f"  falhou definitivamente: {item['codigo']}", file=sys.stderr)
    return None


def normalizar(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return s.lower()


GRUPOS_PRIORITARIOS = [
    "frutas", "verduras", "hortalicas", "cereais", "leguminosas",
    "carnes", "pescados", "peixes", "leite", "ovos", "oleos", "gorduras",
    "acucares", "bebidas", "miscelaneas", "nozes", "sementes", "tuberculos",
]


def selecionar_para_detalhe(indice: list[dict], n: int) -> list[dict]:
    # prioriza itens sem marca comercial (ingredientes genéricos, não
    # produto industrializado de uma marca específica) e grupos de
    # ingredientes crus/comuns em receita, antes de completar com o resto
    sem_marca = [it for it in indice if not it["marca"]]
    prioritarios = [
        it for it in sem_marca
        if any(g in normalizar(it["grupo"]) for g in GRUPOS_PRIORITARIOS)
    ]
    resto = [it for it in sem_marca if it not in prioritarios]
    ordenado = prioritarios + resto
    return ordenado[:n]


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    comando = sys.argv[1]

    if comando == "index":
        print("Baixando índice completo de alimentos da TBCA...", file=sys.stderr)
        indice = baixar_indice()
        with open(INDEX_PATH, "w", encoding="utf-8") as f:
            json.dump(indice, f, ensure_ascii=False, indent=1)
        print(f"OK: {len(indice)} alimentos indexados -> {INDEX_PATH}", file=sys.stderr)

    elif comando == "detalhes":
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 500
        with open(INDEX_PATH, encoding="utf-8") as f:
            indice = json.load(f)
        alvo = selecionar_para_detalhe(indice, n)
        print(f"Baixando detalhes de {len(alvo)} alimentos (de {len(indice)} no índice)...", file=sys.stderr)
        iniciar_sessao()
        resultados = []
        erros = 0
        with ThreadPoolExecutor(max_workers=6) as pool:
            futuros = {pool.submit(baixar_detalhe, it): it for it in alvo}
            done = 0
            for fut in as_completed(futuros):
                done += 1
                r = fut.result()
                if r is None:
                    erros += 1
                else:
                    resultados.append(r)
                if done % 50 == 0:
                    print(f"  {done}/{len(alvo)} (erros: {erros})", file=sys.stderr)
        resultados.sort(key=lambda x: x["codigo"])
        with open(DETALHES_PATH, "w", encoding="utf-8") as f:
            json.dump(resultados, f, ensure_ascii=False, indent=1)
        print(f"OK: {len(resultados)} fichas completas -> {DETALHES_PATH} ({erros} falharam)", file=sys.stderr)

    else:
        print(f"comando desconhecido: {comando}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
