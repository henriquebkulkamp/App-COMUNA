"""
Carregamento e busca na base local da TBCA (Tabela Brasileira de
Composição de Alimentos - USP), baixada em dados/tbca/alimentos_tbca.json
via dados/scraper_tbca.py.

Isso é a "camada de dados" que o motor de cálculo (calculo.py) consulta.
Nunca bate no site da TBCA em tempo real -- a TBCA não tem API, então a
importação é um passo separado (batch, offline) e o cálculo sempre lê a
cópia local.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

DADOS_PATH = Path(__file__).resolve().parent.parent / "dados" / "tbca" / "alimentos_tbca.json"

VERSAO_TBCA = "7.2"  # versão da TBCA vigente no momento da importação (2026)


@dataclass(frozen=True)
class AlimentoTBCA:
    codigo: str
    nome: str
    nome_cientifico: str
    grupo: str
    nutrientes_por_100g: dict[str, float | str | None]


@lru_cache(maxsize=1)
def carregar_base() -> dict[str, AlimentoTBCA]:
    """Carrega o JSON local uma vez por processo e devolve um dict
    codigo -> AlimentoTBCA, pra lookup O(1) no motor de cálculo."""
    if not DADOS_PATH.exists():
        raise FileNotFoundError(
            f"Base local da TBCA não encontrada em {DADOS_PATH}. "
            "Rode `python3 dados/scraper_tbca.py index` e depois "
            "`python3 dados/scraper_tbca.py detalhes <N>` primeiro."
        )
    bruto = json.loads(DADOS_PATH.read_text(encoding="utf-8"))
    return {
        item["codigo"]: AlimentoTBCA(
            codigo=item["codigo"],
            nome=item["nome"],
            nome_cientifico=item["nome_cientifico"],
            grupo=item["grupo"],
            nutrientes_por_100g=item["nutrientes_por_100g"],
        )
        for item in bruto
    }


def buscar_por_nome(termo: str, limite: int = 10) -> list[AlimentoTBCA]:
    """Busca simples por substring no nome -- serve de base pra um
    autocomplete de cadastro de ingrediente (fora de escopo aqui, mas é
    o mesmo tipo de consulta que a rota de admin usaria)."""
    termo = termo.lower()
    base = carregar_base()
    encontrados = [a for a in base.values() if termo in a.nome.lower()]
    return encontrados[:limite]


def obter(codigo: str) -> AlimentoTBCA:
    base = carregar_base()
    try:
        return base[codigo]
    except KeyError:
        raise KeyError(
            f"Código TBCA '{codigo}' não encontrado na base local "
            f"({len(base)} alimentos carregados). Confira o código ou "
            "amplie a importação (dados/scraper_tbca.py detalhes)."
        ) from None
