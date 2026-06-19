import json
import os
import pickle

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from src.core.supabase_client import BASE_DIR

# ── Caminhos ────────────────────────────────────────────────────────────────
PASTA_PADROES = os.path.join(BASE_DIR, "models", "padroes_virais")
PASTA_PREPROCESSORS = os.path.join(BASE_DIR, "models", "preprocessors")
PASTA_PREDICTORS = os.path.join(BASE_DIR, "models", "predictors")


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 1 — CARREGAMENTO DOS ARTEFATOS
# ════════════════════════════════════════════════════════════════════════════


def carregar_padroes_nicho(nicho: str) -> dict | None:
    """
    Carrega o JSON de padrões do nicho solicitado.
    Retorna None se o nicho não existir.
    """
    nicho_limpo = str(nicho).replace(" ", "_").replace("/", "_").lower()
    caminho = os.path.join(PASTA_PADROES, f"{nicho_limpo}.json")

    if not os.path.exists(caminho):
        return None

    with open(caminho, "r", encoding="utf-8") as f:
        padroes = json.load(f)

    print(f" [inferencia] Padrões carregados: {nicho}")

    return padroes


def carregar_similaridade() -> dict | None:
    """
    Carrega o nicho_similaridade.pkl para uso no fallback.
    Retorna None se o arquivo não existir.
    """
    caminho = os.path.join(PASTA_PADROES, "nicho_similaridade.pkl")

    if not os.path.exists(caminho):
        print(" [inferencia] AVISO: nicho_similaridade.pkl não encontrado.")
        return None

    with open(caminho, "rb") as f:
        similaridade = pickle.load(f)

    print(f" [inferencia] Similaridade carregada: {len(similaridade['nichos'])} nichos indexados")

    return similaridade


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 2 — FALLBACK DE NICHO DESCONHECIDO
# ════════════════════════════════════════════════════════════════════════════


def encontrar_nicho_similar(nicho_novo: str) -> str | None:
    """
    Recebe um nicho desconhecido como string e encontra
    o nicho mais similar no dataset usando cosine similarity
    sobre os vetores TF-IDF de palavras_chave_en.
    Retorna o nome do nicho mais similar.
    """
    dados = carregar_similaridade()

    if dados is None:
        return None

    vetorizador = dados["vetorizador"]
    matriz = dados["matriz"]
    nichos = dados["nichos"]

    # Vetoriza o nicho novo com a mesma régua do treino
    vetor_novo = vetorizador.transform([nicho_novo.lower()])

    # Calcula similaridade com todos os nichos conhecidos
    scores = cosine_similarity(vetor_novo, matriz)[0]

    # Retorna o nicho com maior similaridade
    idx_mais_similar = int(np.argmax(scores))
    nicho_similar = nichos[idx_mais_similar]
    score = round(float(scores[idx_mais_similar]), 4)

    print(f" [inferencia] Nicho '{nicho_novo}' não encontrado.")
    print(f"   Fallback → '{nicho_similar}' (similaridade: {score})")

    return nicho_similar


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 3 — INFERÊNCIA
# ════════════════════════════════════════════════════════════════════════════


def inferir(nicho: str) -> dict:
    """
    Ponto de entrada principal do serviço.
    Recebe o nome do nicho e retorna o contexto mastigado
    para a LLM gerar o roteiro e a estrutura do vídeo.

    Fluxo:
    1. Tenta carregar padrões do nicho diretamente
    2. Se não existir, encontra o nicho mais similar via fallback
    3. Retorna padrões + metadados do fallback se aplicável
    """
    fallback_usado = False
    nicho_original = nicho
    nicho_utilizado = nicho

    # 1. Tenta carregar padrões do nicho diretamente
    padroes = carregar_padroes_nicho(nicho)

    # 2. Fallback — nicho desconhecido
    if padroes is None:
        print(f" [inferencia] Nicho '{nicho}' não encontrado. Ativando fallback...")
        nicho_similar = encontrar_nicho_similar(nicho)

        if nicho_similar is None:
            return {
                "erro": f"Nicho '{nicho}' não encontrado e fallback indisponível.",
            }

        padroes = carregar_padroes_nicho(nicho_similar)
        fallback_usado = True
        nicho_utilizado = nicho_similar

    if padroes is None:
        return {
            "erro": f"Não foi possível carregar padrões para o nicho '{nicho}'.",
        }

    # 3. Retorna padrões + metadados
    return {
        "nicho_solicitado": nicho_original,
        "nicho_utilizado": nicho_utilizado,
        "fallback_usado": fallback_usado,
        "padroes": padroes,
    }
