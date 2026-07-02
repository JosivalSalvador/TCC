"""
inferencia_ml.py

Responsabilidade: receber o nome do nicho (e opcionalmente o
audience_context), carregar o JSON de padrões do nicho gerado
pelo 03_treinamento.py, e retornar o contexto estruturado
pronto para a LLM em llm.py.

Se o nicho não existir no dataset, ativa fallback por similaridade
semântica usando os embeddings calculados no 03_treinamento.py
(cosine similarity entre embeddings de palavras_chave_en por nicho).

Fluxo:
    1. Tenta carregar JSON do nicho diretamente
    2. Se não existir, encontra nicho mais similar via embeddings
    3. Retorna padrões + metadados do fallback se aplicável
"""

import json
import os
import pickle

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

from src.core.supabase_client import BASE_DIR

PASTA_PADROES = os.path.join(BASE_DIR, "models", "padroes_virais")

# ════════════════════════════════════════════════════════════════════════════
# BLOCO 1 — CARREGAMENTO DE ARTEFATOS
# ════════════════════════════════════════════════════════════════════════════


def carregar_padroes_nicho(nicho: str) -> dict | None:
    """
    Carrega o JSON de padrões do nicho solicitado.
    Normaliza o nome do nicho (lowercase, espaços → underscore).
    Retorna None se o nicho não existir.
    """
    nicho_normalizado = nicho.lower().replace(" ", "_")
    caminho = os.path.join(PASTA_PADROES, f"{nicho_normalizado}.json")

    if not os.path.exists(caminho):
        return None

    with open(caminho, "r", encoding="utf-8") as f:
        return json.load(f)


def carregar_similaridade() -> dict | None:
    """
    Carrega o nicho_similaridade.pkl gerado pelo 03_treinamento.py.
    Contém embeddings agregados por nicho e lista de nichos indexados.
    Retorna None se o arquivo não existir.
    """
    caminho = os.path.join(BASE_DIR, "models", "nicho_similaridade.pkl")

    if not os.path.exists(caminho):
        return None

    with open(caminho, "rb") as f:
        return pickle.load(f)


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 2 — FALLBACK DE NICHO DESCONHECIDO
# ════════════════════════════════════════════════════════════════════════════


def encontrar_nicho_similar(nicho_novo: str) -> str | None:
    """
    Recebe um nicho desconhecido e encontra o mais similar no dataset.
    Técnica: embedding do nicho novo com o mesmo modelo Sentence-BERT
    usado no 03_treinamento.py + cosine similarity contra os embeddings
    agregados por nicho salvos em nicho_similaridade.pkl.
    Retorna o nome do nicho mais similar.
    """
    similaridade = carregar_similaridade()
    if similaridade is None:
        return None

    modelo = SentenceTransformer("all-MiniLM-L6-v2")
    embedding_novo = modelo.encode([nicho_novo], convert_to_numpy=True)

    sims = cosine_similarity(embedding_novo, similaridade["embeddings"])[0]
    idx_mais_similar = sims.argmax()

    return similaridade["nichos"][idx_mais_similar]


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 3 — INFERÊNCIA
# ════════════════════════════════════════════════════════════════════════════


def inferir(nicho: str) -> dict:
    """
    Ponto de entrada principal do serviço.
    Fluxo:
    1. Tenta carregar padrões do nicho diretamente
    2. Se não existir, encontra nicho mais similar via fallback
    3. Retorna padrões + metadados (nicho_solicitado, nicho_utilizado,
       fallback_usado)
    Em caso de falha total retorna dict com chave 'erro'.
    """
    nicho_normalizado = nicho.lower().replace(" ", "_")

    padroes = carregar_padroes_nicho(nicho_normalizado)
    fallback_usado = False
    nicho_utilizado = nicho_normalizado

    if padroes is None:
        nicho_similar = encontrar_nicho_similar(nicho_normalizado)
        if nicho_similar is None:
            return {"erro": f"Nicho '{nicho}' não encontrado e nenhum similar disponível."}

        padroes = carregar_padroes_nicho(nicho_similar)
        if padroes is None:
            return {"erro": f"Nicho similar '{nicho_similar}' encontrado mas JSON não disponível."}

        fallback_usado = True
        nicho_utilizado = nicho_similar

    return {
        "nicho_solicitado": nicho_normalizado,
        "nicho_utilizado": nicho_utilizado,
        "fallback_usado": fallback_usado,
        "padroes": padroes,
    }
