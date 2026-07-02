"""
03_treinamento.py

Responsabilidade: receber o CSV ouro, extrair e consolidar
todos os padrões dos vídeos por nicho, e salvar um JSON por nicho
em models/padroes_virais/{nicho}.json.

Esse JSON é o que o inferencia_ml.py vai carregar e entregar
pra LLM gerar o conteúdo.

O JSON de cada nicho terá exatamente a estrutura definida:
    structure_content:
        titulo: fórmula, comprimento, termos, CAPS, emojis,
                pontuação, sentimento, molde, exemplos reais
        descricao: comprimento, primeira linha, sentimento,
                   termos SEO, moldes de frase, emojis, CTA,
                   links, hashtags, exemplos reais
        palavras_chave: short/mid/long-tail, proporção
        thumbnail: texto da capa, cena visual, sentimento visual,
                   exemplos reais
        postagem: top 3 slots

    script_content:
        estrutura_geral: blocos, duração, limite de palavras,
                         diálogo, repetição
        gancho: fórmula, comprimento, sentimento, termos,
                pontuação, exemplos reais
        ritmo_linguagem: palavras/seg, comprimento frase,
                         variância, densidade pontuação, n-gramas
        arco_emocional: tom e vocabulário por terço
        audio: tipo dominante, clima sonoro
        repeticao: ativar?, quantas vezes
        cta: estilo, gatilho debate, posição, score, molde
        vocabulario_geral: termos obrigatórios, co-ocorrências

Técnicas usadas:
    - Sentence-BERT (sentence-transformers) para embeddings semânticos
    - HDBSCAN para clustering de exemplos por padrão estilístico
    - MMR (Maximum Marginal Relevance) para seleção de exemplos
      (1 centróide + 2 diversos por cluster)
    - TF-IDF + filtro semântico SBERT para termos discriminativos
      (títulos, descrições, ganchos, thumbnails, CTA)
    - Agregação de vocabulario_falado e ngramas_roteiro pré-computados
      pelo 02_pre_processa.py via Counter — sem recalcular do zero
    - Derivação semântica de estrutura_blocos a partir de features
      medianas do cluster dominante (ritmo, densidade, faixa, diálogo)
    - Regex/estatística para features simples (CAPS, CTA, fórmula)
"""

import ast
import json
import os
import pickle
import re
from collections import Counter

import emoji
import hdbscan
import nltk
import numpy as np
import pandas as pd
from nltk.corpus import stopwords
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from src.core.supabase_client import BASE_DIR, baixar_csv_ouro

PASTA_PADROES = os.path.join(BASE_DIR, "models", "padroes_virais")
os.makedirs(PASTA_PADROES, exist_ok=True)
nltk.download("stopwords", quiet=True)


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 1 — CLUSTERING E SELEÇÃO DE EXEMPLOS
# ════════════════════════════════════════════════════════════════════════════


def embeddar_textos(textos: list, modelo: SentenceTransformer) -> np.ndarray:
    """
    Gera embeddings semânticos para uma lista de textos curtos.
    Técnica: Sentence-BERT (sentence-transformers).
    Usado para clustering e seleção de exemplos por similaridade.
    """
    return modelo.encode(textos, show_progress_bar=False, convert_to_numpy=True)


def clusterizar_por_padrao(embeddings: np.ndarray) -> np.ndarray:
    """
    Agrupa os vídeos do nicho em clusters por padrão estilístico.
    Técnica: HDBSCAN — lida melhor que KMeans com clusters de
    tamanho irregular e não exige número fixo de clusters.
    Retorna array de labels de cluster por vídeo.
    """

    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=5,
        min_samples=3,
        metric="euclidean",
    )
    return clusterer.fit_predict(embeddings)


def selecionar_exemplos_mmr(
    embeddings: np.ndarray,
    textos: list,
    labels_cluster: np.ndarray,
    n_exemplos: int = 3,
) -> list:
    """
    Seleciona exemplos reais representativos e diversos por cluster.
    Técnica: Maximum Marginal Relevance (MMR) —
    1 exemplo centróide (mais típico do cluster) +
    2 exemplos diversos (máxima distância entre si dentro do cluster).
    Evita exemplos redundantes que seriam inúteis pra LLM.

    Pré-filtragem: textos com menos de 3 tokens são excluídos do pool
    antes de qualquer seleção — evita artefatos de tradução e strings vazias.

    Fallback: se nenhum cluster válido se formar (tudo ruído no HDBSCAN),
    aplica MMR global sobre o pool válido — seleciona o centróide global
    como primeiro exemplo, depois escolhe os mais diversos entre si
    via mínima similaridade coseno iterativa.
    """
    # Filtra textos com menos de 3 tokens — remove artefatos e vazios
    indices_validos = [i for i, t in enumerate(textos) if len(str(t).strip().split()) >= 3]

    if not indices_validos:
        return []

    textos_validos = [textos[i] for i in indices_validos]
    embs_validos = embeddings[indices_validos]
    labels_validos = labels_cluster[indices_validos]

    selecionados = []
    clusters_unicos = set(labels_validos)
    clusters_unicos.discard(-1)

    for cluster_id in clusters_unicos:
        indices = np.where(labels_validos == cluster_id)[0]
        embs_cluster = embs_validos[indices]
        textos_cluster = [textos_validos[i] for i in indices]

        if len(textos_cluster) == 1:
            selecionados.append(textos_cluster[0])
            continue

        # Centróide: embedding mais próximo da média do cluster
        centroide = embs_cluster.mean(axis=0, keepdims=True)
        sims = cosine_similarity(centroide, embs_cluster)[0]
        idx_centroide = sims.argmax()
        selecionados.append(textos_cluster[idx_centroide])

        if len(textos_cluster) < 3:
            continue

        # Diversidade: 2 exemplos com máxima distância entre si
        restantes = [i for i in range(len(textos_cluster)) if i != idx_centroide]
        embs_restantes = embs_cluster[restantes]
        sims_restantes = cosine_similarity(embs_restantes, embs_restantes)

        np.fill_diagonal(sims_restantes, 1.0)
        i, j = np.unravel_index(sims_restantes.argmin(), sims_restantes.shape)
        selecionados.append(textos_cluster[restantes[i]])
        selecionados.append(textos_cluster[restantes[j]])

    # Fallback: nenhum cluster válido — MMR global sobre pool filtrado
    if not selecionados:
        centroide_global = embs_validos.mean(axis=0, keepdims=True)
        sims_global = cosine_similarity(centroide_global, embs_validos)[0]
        idx_centro = sims_global.argmax()
        selecionados.append(textos_validos[idx_centro])

        restantes = [i for i in range(len(textos_validos)) if i != idx_centro]
        if len(restantes) >= 2:
            embs_restantes = embs_validos[restantes]
            sims_restantes = cosine_similarity(embs_restantes, embs_restantes)
            np.fill_diagonal(sims_restantes, 1.0)
            i, j = np.unravel_index(sims_restantes.argmin(), sims_restantes.shape)
            selecionados.append(textos_validos[restantes[i]])
            selecionados.append(textos_validos[restantes[j]])
        elif len(restantes) == 1:
            selecionados.append(textos_validos[restantes[0]])

    return selecionados[:n_exemplos]


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 2 — EXTRAÇÃO DE PADRÕES DO TÍTULO
# ════════════════════════════════════════════════════════════════════════════


def extrair_padroes_titulo(df_nicho: pd.DataFrame, modelo: SentenceTransformer) -> dict:
    """
    Extrai todos os padrões do título para o nicho:
    - fórmula de construção dominante (pergunta/imperativo/afirmação)
    - comprimento alvo em chars (mediana)
    - termos obrigatórios (TF-IDF + filtro semântico via SBERT)
    - posições e intensidade de CAPS (mediana de titulo_caps_intensidade)
    - quais emojis usar e onde (mais frequentes de titulo_emojis_posicao)
    - usar pontuação de impacto? (% de títulos com !, ?)
    - tom/sentimento alvo (dominante de titulo_sentimento)
    - molde de estrutura (derivado de clickbait_score + caps + emojis + formula)
    - exemplos reais (MMR sobre embeddings de titulo_en)
    Retorna dict com todos os campos do structure_content.titulo
    """
    titulos = df_nicho["titulo_en"].fillna("").tolist()

    def limpar_titulo(titulo):
        t = re.sub(r"#\S+", "", titulo)
        t = re.sub(r"@\S+", "", t)
        t = emoji.replace_emoji(t, replace="")
        return t.strip()

    titulos_limpos = [limpar_titulo(t) for t in titulos]

    # Fórmula dominante
    formula_dominante = df_nicho["titulo_formula_abertura"].mode()[0]

    # Comprimento alvo
    comprimento_alvo = int(df_nicho["titulo_comprimento"].median())

    # Termos candidatos via TF-IDF — pool amplo pra SBERT filtrar depois
    vectorizer = TfidfVectorizer(stop_words="english", max_features=50)
    termos_obrigatorios = []
    try:
        matriz = vectorizer.fit_transform(titulos_limpos)
        scores = np.asarray(matriz.mean(axis=0)).flatten()
        termos = vectorizer.get_feature_names_out()
        indices_top = scores.argsort()[::-1][:50]
        candidatos = [termos[i] for i in indices_top]

        # Filtro semântico via SBERT
        # len(t) >= 4 elimina partículas curtas de qualquer idioma (ki, ka, vs, ji)
        # threshold 0.28 elimina nomes próprios transliterados sem semântica real
        frases_contexto = [f"this video is about {t}" for t in candidatos]
        embedding_contexto = modelo.encode(frases_contexto, convert_to_numpy=True)
        embedding_nicho = modelo.encode(titulos_limpos, convert_to_numpy=True).mean(axis=0, keepdims=True)

        sims = cosine_similarity(embedding_nicho, embedding_contexto)[0]
        termos_obrigatorios = [t for t, s in zip(candidatos, sims) if s >= 0.28 and len(t) >= 4][:20]
    except Exception:
        termos_obrigatorios = []

    # CAPS
    caps_intensidade = round(df_nicho["titulo_caps_intensidade"].median(), 3)

    # Emojis mais frequentes — já deserializados no maestro
    todos_emojis = []
    for lista in df_nicho["titulo_emojis_posicao"].dropna():
        if isinstance(lista, list):
            todos_emojis.extend(lista)
    contagem_emojis = Counter((e["emoji"], e["posicao"]) for e in todos_emojis if isinstance(e, dict))
    emojis_dominantes = [{"emoji": em, "posicao": posicao, "frequencia": freq} for (em, posicao), freq in contagem_emojis.most_common(5)]

    # Pontuação de impacto
    usar_pontuacao = df_nicho["titulo_pontuacao_impacto"].mean() >= 0.3

    # Sentimento alvo
    sentimento_alvo = df_nicho["titulo_sentimento"].mode()[0]

    # Molde de estrutura
    clickbait_medio = round(df_nicho["clickbait_score"].median(), 3)
    molde_estrutura = {
        "formula": formula_dominante,
        "caps_intensidade": caps_intensidade,
        "clickbait_score_mediano": clickbait_medio,
        "usar_pontuacao": usar_pontuacao,
        "sentimento_alvo": sentimento_alvo,
        "emojis_sugeridos": emojis_dominantes[:2] if emojis_dominantes else [],
    }

    # Exemplos reais via MMR
    embeddings = embeddar_textos(titulos, modelo)
    labels = clusterizar_por_padrao(embeddings)
    exemplos = selecionar_exemplos_mmr(embeddings, titulos, labels)

    return {
        "formula_construcao": formula_dominante,
        "comprimento_alvo_chars": comprimento_alvo,
        "termos_obrigatorios": termos_obrigatorios,
        "caps_intensidade": caps_intensidade,
        "emojis": emojis_dominantes,
        "usar_pontuacao_impacto": usar_pontuacao,
        "sentimento_alvo": sentimento_alvo,
        "molde_estrutura": molde_estrutura,
        "exemplos_reais": exemplos,
    }


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 3 — EXTRAÇÃO DE PADRÕES DA DESCRIÇÃO
# ════════════════════════════════════════════════════════════════════════════


def extrair_padroes_descricao(df_nicho: pd.DataFrame, modelo: SentenceTransformer) -> dict:
    """
    Extrai todos os padrões da descrição para o nicho:
    - comprimento alvo total e da primeira linha (medianas)
    - tom/sentimento da primeira linha (dominante)
    - termos SEO obrigatórios (TF-IDF + filtro semântico via SBERT)
    - moldes de frase (bigrams/trigrams TF-IDF + filtro SBERT sobre descricao_en)
    - quais emojis usar e onde (mais frequentes)
    - CTA: estilo dominante, intensidade e posição
    - usar links? onde? (% e posição de descricao_tem_link)
    - hashtags: quais, quantas, onde (de palavras_chave_en)
    - exemplos reais (MMR sobre embeddings de descricao_en — filtrado por tamanho)
    Retorna dict com todos os campos do structure_content.descricao
    """
    descricoes = df_nicho["descricao_en"].fillna("").tolist()

    # Comprimentos alvo
    comprimento_alvo = int(df_nicho["descricao_comprimento"].median())
    primeira_linha_alvo = int(df_nicho["descricao_primeira_linha_comprimento"].median())

    # Sentimento da primeira linha
    sentimento_primeira_linha = df_nicho["descricao_primeira_linha_sentimento"].mode()[0]

    # Termos SEO candidatos via TF-IDF — pool amplo pra SBERT filtrar
    vectorizer_seo = TfidfVectorizer(stop_words="english", max_features=50)
    termos_obrigatorios = []
    try:
        matriz_seo = vectorizer_seo.fit_transform(descricoes)
        scores_seo = np.asarray(matriz_seo.mean(axis=0)).flatten()
        termos_seo = vectorizer_seo.get_feature_names_out()
        indices_seo = scores_seo.argsort()[::-1][:50]
        candidatos = [termos_seo[i] for i in indices_seo]

        # Filtro semântico via SBERT
        frases_contexto = [f"this video is about {t}" for t in candidatos]
        embedding_contexto = modelo.encode(frases_contexto, convert_to_numpy=True)
        embedding_nicho = modelo.encode(descricoes, convert_to_numpy=True).mean(axis=0, keepdims=True)

        sims = cosine_similarity(embedding_nicho, embedding_contexto)[0]
        termos_obrigatorios = [t for t, s in zip(candidatos, sims) if s >= 0.28 and len(t) >= 4][:20]
    except Exception:
        termos_obrigatorios = []

    # Moldes de frase via bigrams/trigrams TF-IDF + filtro SBERT
    # token_pattern restrito a latino — bloqueia tokens não-latinos de transcrições
    vectorizer_ngrama = TfidfVectorizer(
        ngram_range=(2, 3),
        stop_words="english",
        token_pattern=r"[a-zA-Z]{3,}",
        max_features=50,
    )
    moldes_frase = []
    try:
        matriz_ngrama = vectorizer_ngrama.fit_transform(descricoes)
        scores_ngrama = np.asarray(matriz_ngrama.mean(axis=0)).flatten()
        termos_ngrama = vectorizer_ngrama.get_feature_names_out()
        indices_ngrama = scores_ngrama.argsort()[::-1][:50]
        candidatos_ngrama = [termos_ngrama[i] for i in indices_ngrama]

        # Filtro semântico via SBERT sobre bigrams/trigrams
        frases_contexto_ngrama = [f"this video description contains the phrase {t}" for t in candidatos_ngrama]
        embedding_contexto_ngrama = modelo.encode(frases_contexto_ngrama, convert_to_numpy=True)

        sims_ngrama = cosine_similarity(embedding_nicho, embedding_contexto_ngrama)[0]
        moldes_frase = [t for t, s in zip(candidatos_ngrama, sims_ngrama) if s >= 0.28][:10]
    except Exception:
        moldes_frase = []

    # Emojis mais frequentes na descrição
    todos_emojis = []
    for descricao in descricoes:
        for char in str(descricao):
            if char in emoji.EMOJI_DATA:
                todos_emojis.append(char)
    contagem_emojis = Counter(todos_emojis)
    emojis_dominantes = [{"emoji": e, "frequencia": f} for e, f in contagem_emojis.most_common(5)]

    # CTA
    # CTA
    cta_posicao = df_nicho["descricao_cta_posicao"].mode()[0]
    cta_intensidade = df_nicho["descricao_cta_intensidade"].mode()[0]
    cta_score_mediano = round(df_nicho["descricao_cta_score"].median(), 3)

    # Links
    usar_links = df_nicho["descricao_tem_link"].mean() >= 0.3

    # Hashtags — top termos de palavras_chave_en
    todas_hashtags = []
    for kw in df_nicho["palavras_chave_en"].fillna("").tolist():
        termos = [t.strip() for t in str(kw).split(",") if t.strip()]
        todas_hashtags.extend(termos)
    contagem_hashtags = Counter(todas_hashtags)
    hashtags_top = [h for h, _ in contagem_hashtags.most_common(15)]

    # Quantidade de hashtags — conta # nas descrições com fallback
    # pra nichos que listam keywords sem # (formato de lista separada por vírgula)
    # clamp garante que quantidade nunca excede o tamanho real da lista
    qtd_hashtags_desc = df_nicho["descricao_en"].fillna("").apply(lambda x: len(re.findall(r"#\S+", str(x)))).median()
    quantidade_hashtags = int(qtd_hashtags_desc) if qtd_hashtags_desc > 0 else int(df_nicho["palavras_chave_en"].fillna("").apply(lambda x: len([t.strip() for t in str(x).split(",") if t.strip()])).median())
    quantidade_hashtags = min(quantidade_hashtags, len(hashtags_top))

    # Exemplos reais via MMR — filtra descrições com SEO spam
    # limite de 500 chars — acima disso é quase sempre lista de keywords
    descricoes_filtradas = [d for d in descricoes if 50 <= len(str(d).strip()) <= 500]
    if not descricoes_filtradas:
        descricoes_filtradas = descricoes

    embeddings = embeddar_textos(descricoes_filtradas, modelo)
    labels = clusterizar_por_padrao(embeddings)
    exemplos = selecionar_exemplos_mmr(embeddings, descricoes_filtradas, labels)

    return {
        "comprimento_alvo_chars": comprimento_alvo,
        "primeira_linha_comprimento_alvo": primeira_linha_alvo,
        "sentimento_primeira_linha": sentimento_primeira_linha,
        "termos_seo_obrigatorios": termos_obrigatorios,
        "moldes_frase": moldes_frase,
        "emojis": emojis_dominantes,
        "cta_posicao": cta_posicao,
        "cta_intensidade": cta_intensidade,
        "cta_score_mediano": cta_score_mediano,
        "usar_links": usar_links,
        "hashtags": hashtags_top,
        "quantidade_hashtags": quantidade_hashtags,
        "exemplos_reais": exemplos,
    }


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 4 — EXTRAÇÃO DE PADRÕES DE PALAVRAS-CHAVE
# ════════════════════════════════════════════════════════════════════════════


def extrair_padroes_palavras_chave(df_nicho: pd.DataFrame) -> dict:
    """
    Extrai padrões de palavras-chave para associar ao vídeo:
    - termos short-tail obrigatórios (1 palavra, mais frequentes)
    - termos mid-tail do nicho (2 palavras, mais frequentes)
    - termos long-tail do nicho (3+ palavras, mais frequentes)
    - proporção ideal short/mid/long-tail (mediana de palavras_chave_proporcao,
      normalizada para somar 1.0)
    Técnica: agregação de palavras_chave_shorttail, midtail, longtail do ouro.
    Retorna dict com todos os campos do structure_content.palavras_chave
    """

    def agregar_termos(coluna, top_n=15):
        todos = []
        for lista in df_nicho[coluna].dropna():
            if isinstance(lista, list):
                todos.extend(lista)
        return [t for t, _ in Counter(todos).most_common(top_n)]

    shorttail = agregar_termos("palavras_chave_shorttail")
    midtail = agregar_termos("palavras_chave_midtail")
    longtail = agregar_termos("palavras_chave_longtail")

    # Proporção ideal — guard contra dicts vazios antes do np.median
    proporcoes = [p for p in df_nicho["palavras_chave_proporcao"].dropna().tolist() if isinstance(p, dict) and p.get("shorttail", 0) + p.get("midtail", 0) + p.get("longtail", 0) > 0]

    if proporcoes:
        mediana_short = np.median([p["shorttail"] for p in proporcoes])
        mediana_mid = np.median([p["midtail"] for p in proporcoes])
        mediana_long = np.median([p["longtail"] for p in proporcoes])
        total = mediana_short + mediana_mid + mediana_long
        if total > 0:
            proporcao_mediana = {
                "shorttail": round(mediana_short / total, 3),
                "midtail": round(mediana_mid / total, 3),
                "longtail": round(mediana_long / total, 3),
            }
        else:
            proporcao_mediana = {"shorttail": 0.0, "midtail": 0.0, "longtail": 0.0}
    else:
        proporcao_mediana = {"shorttail": 0.0, "midtail": 0.0, "longtail": 0.0}

    return {
        "shorttail": shorttail,
        "midtail": midtail,
        "longtail": longtail,
        "proporcao_ideal": proporcao_mediana,
    }


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 5 — EXTRAÇÃO DE PADRÕES DA THUMBNAIL
# ════════════════════════════════════════════════════════════════════════════


def extrair_padroes_thumbnail(df_nicho: pd.DataFrame, modelo: SentenceTransformer) -> dict:
    """
    Extrai padrões da thumbnail para o nicho:
    - texto da capa: comprimento alvo, termos obrigatórios (TF-IDF + filtro SBERT),
      CAPS (mediana thumbnail_caps_intensidade), emojis, sentimento
    - cena visual: elementos obrigatórios (TF-IDF + filtro SBERT sobre descricao_visual_thumb),
      presença humana (% thumbnail_tem_pessoa), composição dominante
    - sentimento visual alvo (dominante de thumbnail_sentimento_visual)
    - exemplos reais de texto de thumbnail (MMR sobre embeddings de texto_thumbnail)
    Retorna dict com todos os campos do structure_content.thumbnail
    """
    textos_capa = df_nicho["texto_thumbnail"].fillna("").tolist()
    descricoes_visuais = df_nicho["descricao_visual_thumb"].fillna("").tolist()

    # Limpeza de handles, hashtags e tokens com dígitos ou underscores embutidos
    # que vazam do texto da capa (ex: "anandraja_86173", "#shorts", "@canal")
    def limpar_texto_capa(texto):
        t = re.sub(r"#\S+", "", texto)
        t = re.sub(r"@\S+", "", t)
        # remove tokens com underscore ou dígito embutido (handles concatenados)
        t = re.sub(r"\b\w*[\d_]\w*\b", "", t)
        return t.strip()

    textos_capa_limpos = [limpar_texto_capa(t) for t in textos_capa]

    # Comprimento alvo — só sobre textos originais não vazios (antes da limpeza)
    textos_capa_validos = [t for t in textos_capa if str(t).strip()]
    comprimento_alvo = int(np.median([len(t) for t in textos_capa_validos])) if textos_capa_validos else 0

    # Termos obrigatórios do texto da capa via TF-IDF + filtro SBERT
    # usa textos limpos — handles e IDs já removidos
    vectorizer_capa = TfidfVectorizer(
        stop_words="english",
        token_pattern=r"[a-zA-Z]{3,}",
        max_features=50,
    )
    termos_obrigatorios_capa = []
    try:
        matriz_capa = vectorizer_capa.fit_transform(textos_capa_limpos)
        scores_capa = np.asarray(matriz_capa.mean(axis=0)).flatten()
        termos_capa = vectorizer_capa.get_feature_names_out()
        indices_capa = scores_capa.argsort()[::-1][:50]
        candidatos_capa = [termos_capa[i] for i in indices_capa]

        # Filtro semântico via SBERT
        frases_contexto = [f"this video thumbnail text says {t}" for t in candidatos_capa]
        embedding_contexto = modelo.encode(frases_contexto, convert_to_numpy=True)
        textos_capa_limpos_validos = [t for t in textos_capa_limpos if t.strip()]
        if not textos_capa_limpos_validos:
            textos_capa_limpos_validos = textos_capa_limpos
        embedding_nicho = modelo.encode(textos_capa_limpos_validos, convert_to_numpy=True).mean(axis=0, keepdims=True)

        sims = cosine_similarity(embedding_nicho, embedding_contexto)[0]
        termos_obrigatorios_capa = [t for t, s in zip(candidatos_capa, sims) if s >= 0.28 and len(t) >= 4][:15]
    except Exception:
        termos_obrigatorios_capa = []

    # CAPS do texto da capa
    caps_intensidade = round(df_nicho["thumbnail_caps_intensidade"].median(), 3)

    # Emojis no texto da capa — usa textos originais (emojis removidos na limpeza)
    todos_emojis = []
    for texto in textos_capa:
        for char in str(texto):
            if char in emoji.EMOJI_DATA:
                todos_emojis.append(char)
    emojis_dominantes = [{"emoji": e, "frequencia": f} for e, f in Counter(todos_emojis).most_common(5)]

    # Sentimento visual alvo
    sentimento_visual = df_nicho["thumbnail_sentimento_visual"].mode()[0]

    # Elementos visuais obrigatórios via TF-IDF + filtro SBERT
    vectorizer_visual = TfidfVectorizer(
        stop_words="english",
        token_pattern=r"[a-zA-Z]{3,}",
        max_features=50,
    )
    elementos_visuais = []
    try:
        matriz_visual = vectorizer_visual.fit_transform(descricoes_visuais)
        scores_visual = np.asarray(matriz_visual.mean(axis=0)).flatten()
        termos_visual = vectorizer_visual.get_feature_names_out()
        indices_visual = scores_visual.argsort()[::-1][:50]
        candidatos_visual = [termos_visual[i] for i in indices_visual]

        # Filtro semântico via SBERT
        frases_contexto_visual = [f"this video thumbnail scene shows {t}" for t in candidatos_visual]
        embedding_contexto_visual = modelo.encode(frases_contexto_visual, convert_to_numpy=True)
        embedding_nicho_visual = modelo.encode(descricoes_visuais, convert_to_numpy=True).mean(axis=0, keepdims=True)

        sims_visual = cosine_similarity(embedding_nicho_visual, embedding_contexto_visual)[0]
        elementos_visuais = [t for t, s in zip(candidatos_visual, sims_visual) if s >= 0.28 and len(t) >= 4][:15]
    except Exception:
        elementos_visuais = []

    # Presença humana
    presenca_humana = round(df_nicho["thumbnail_tem_pessoa"].mean(), 3)

    # Exemplos reais via MMR — usa textos originais (não limpos)
    # pra preservar o exemplo real como aparece na thumbnail
    embeddings = embeddar_textos(textos_capa, modelo)
    labels = clusterizar_por_padrao(embeddings)
    exemplos = selecionar_exemplos_mmr(embeddings, textos_capa, labels)

    return {
        "texto_capa": {
            "comprimento_alvo_chars": comprimento_alvo,
            "termos_obrigatorios": termos_obrigatorios_capa,
            "caps_intensidade": caps_intensidade,
            "emojis": emojis_dominantes,
            "sentimento_alvo": sentimento_visual,
        },
        "cena_visual": {
            "elementos_obrigatorios": elementos_visuais,
            "presenca_humana": presenca_humana,
        },
        "sentimento_visual_alvo": sentimento_visual,
        "exemplos_reais": exemplos,
    }


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 6 — EXTRAÇÃO DE PADRÕES DE POSTAGEM
# ════════════════════════════════════════════════════════════════════════════


def extrair_padroes_postagem(df_nicho: pd.DataFrame) -> dict:
    """
    Extrai os top 3 slots de postagem do nicho.
    Técnica: contagem de frequência por combinação dia_postagem × janela_postagem.
    Retorna dict com top 3 slots (dia, janela, quantidade de vídeos virais nesse slot
    e justificativa baseada na proporção de virais naquele slot).
    """
    total = len(df_nicho)

    contagem = df_nicho.groupby(["dia_postagem", "janela_postagem"]).size().reset_index(name="quantidade").sort_values("quantidade", ascending=False).head(3)

    slots = [
        {
            "dia": row["dia_postagem"],
            "janela": row["janela_postagem"],
            "quantidade_virais": int(row["quantidade"]),
            "justificativa": f"{round(row['quantidade'] / total * 100, 1)}% dos vídeos virais desse nicho foram postados nesse slot.",
        }
        for _, row in contagem.iterrows()
    ]

    return {"top_3_slots": slots}


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 7 — EXTRAÇÃO DE PADRÕES DO GANCHO
# ════════════════════════════════════════════════════════════════════════════


def extrair_padroes_gancho(df_nicho: pd.DataFrame, modelo: SentenceTransformer) -> dict:
    """
    Extrai todos os padrões do gancho para o nicho:
    - fórmula de abertura dominante (dominante de gancho_formula_abertura)
    - comprimento alvo em palavras (mediana de gancho_comprimento)
    - sentimento alvo (dominante de gancho_sentimento)
    - termos obrigatórios (TF-IDF + filtro semântico via SBERT)
    - uso de pontuação de impacto (mediana de gancho_pontuacao_impacto)
    - exemplos reais (MMR sobre embeddings de gancho_primeira_frase —
      filtrado por comprimento mínimo e ausência de artefatos de transcrição)
    Retorna dict com todos os campos do script_content.gancho
    """
    ganchos = df_nicho["gancho_primeira_frase"].fillna("").tolist()

    # Fórmula dominante
    formula_dominante = df_nicho["gancho_formula_abertura"].mode()[0]

    # Comprimento alvo
    comprimento_alvo = int(df_nicho["gancho_comprimento"].median())

    # Sentimento alvo
    sentimento_alvo = df_nicho["gancho_sentimento"].mode()[0]

    # Termos candidatos via TF-IDF — pool amplo pra SBERT filtrar
    vectorizer = TfidfVectorizer(stop_words="english", max_features=50)
    termos_obrigatorios = []
    try:
        matriz = vectorizer.fit_transform(ganchos)
        scores = np.asarray(matriz.mean(axis=0)).flatten()
        termos = vectorizer.get_feature_names_out()
        indices_top = scores.argsort()[::-1][:50]
        candidatos = [termos[i] for i in indices_top]

        # Filtro semântico via SBERT
        # len(t) >= 4 elimina partículas curtas de qualquer idioma (ji, ka, vs)
        frases_contexto = [f"this video hook starts with {t}" for t in candidatos]
        embedding_contexto = modelo.encode(frases_contexto, convert_to_numpy=True)
        embedding_nicho = modelo.encode(ganchos, convert_to_numpy=True).mean(axis=0, keepdims=True)

        sims = cosine_similarity(embedding_nicho, embedding_contexto)[0]
        termos_obrigatorios = [t for t, s in zip(candidatos, sims) if s >= 0.25 and len(t) >= 4][:15]
    except Exception:
        termos_obrigatorios = []

    # Pontuação de impacto
    usar_pontuacao = df_nicho["gancho_pontuacao_impacto"].mean() >= 0.3

    # Exemplos reais via MMR — filtro dinâmico baseado em gancho_comprimento do nicho
    # threshold mínimo: max(5, mediana - desvio_padrão) palavras — adapta ao nicho
    # exclui também ganchos com sequências numéricas soltas (artefato de transcrição)
    comprimentos = df_nicho["gancho_comprimento"].dropna()
    threshold_palavras = max(5, int(comprimentos.median() - comprimentos.std()))
    ganchos_validos = [g for g in ganchos if len(str(g).strip().split()) >= threshold_palavras and not re.search(r"\b\d{4,}\b", str(g))]
    if not ganchos_validos:
        ganchos_validos = ganchos

    embeddings = embeddar_textos(ganchos_validos, modelo)
    labels = clusterizar_por_padrao(embeddings)
    exemplos = selecionar_exemplos_mmr(embeddings, ganchos_validos, labels)

    # Comprimento alvo em chars — mediana sobre gancho_primeira_frase diretamente
    comprimento_alvo_chars = int(df_nicho["gancho_primeira_frase"].fillna("").apply(lambda x: len(str(x))).median())

    return {
        "formula_abertura": formula_dominante,
        "comprimento_alvo_palavras": comprimento_alvo,
        "comprimento_alvo_chars": comprimento_alvo_chars,
        "sentimento_alvo": sentimento_alvo,
        "termos_obrigatorios": termos_obrigatorios,
        "usar_pontuacao_impacto": usar_pontuacao,
        "exemplos_reais": exemplos,
    }


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 8 — EXTRAÇÃO DE PADRÕES DE RITMO E LINGUAGEM
# ════════════════════════════════════════════════════════════════════════════


def extrair_padroes_ritmo(df_nicho: pd.DataFrame) -> dict:
    """
    Extrai padrões de ritmo e linguagem do roteiro:
    - palavras por segundo (mediana de ritmo_palavras_seg)
    - comprimento médio de frase (mediana de comprimento_medio_frase)
    - variância de ritmo (mediana de variancia_ritmo)
    - densidade de pontuação de impacto (mediana de densidade_pontuacao_impacto)
    - moldes de frase do nicho (top bigrams/trigrams via class-based TF-IDF
      sobre texto_falado_limpo_en por cluster)
    Retorna dict com todos os campos do script_content.ritmo_linguagem
    """
    # Métricas de ritmo
    palavras_por_segundo = round(df_nicho["ritmo_palavras_seg"].median(), 3)
    comprimento_medio = round(df_nicho["comprimento_medio_frase"].median(), 3)
    variancia = round(df_nicho["variancia_ritmo"].median(), 3)
    densidade_pontuacao = round(df_nicho["densidade_pontuacao_impacto"].median(), 3)

    # Moldes de frase via agregação de ngramas_roteiro
    # O 02_pre_processa.py já calculou bigrams/trigrams por vídeo via spacy-ngram
    # com lemmatização — agrega por frequência no nicho em vez de recalcular do zero
    contagem_ngramas = Counter()
    for lista in df_nicho["ngramas_roteiro"].dropna():
        if isinstance(lista, list):
            contagem_ngramas.update(lista)
    moldes_frase = [ngrama for ngrama, _ in contagem_ngramas.most_common(10)]

    return {
        "palavras_por_segundo": palavras_por_segundo,
        "comprimento_medio_frase": comprimento_medio,
        "variancia_ritmo": variancia,
        "densidade_pontuacao_impacto": densidade_pontuacao,
        "moldes_frase": moldes_frase,
    }


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 9 — EXTRAÇÃO DO ARCO EMOCIONAL
# ════════════════════════════════════════════════════════════════════════════


def extrair_arco_emocional(df_nicho: pd.DataFrame) -> dict:
    """
    Extrai o padrão de arco emocional do nicho por terço do roteiro:
    - tom dominante início/meio/fim (dominante de sentimento_inicio/meio/fim,
      vindos prontos do 02_pre_processa.py)
    - vocabulário obrigatório por terço: agrega vocabulario_falado dos vídeos
      cujo tom no terço correspondente coincide com o tom dominante do nicho —
      vocabulário ancorado no tom real, não em corte posicional artificial do texto
    Retorna dict com todos os campos do script_content.arco_emocional
    """
    # Tom dominante por terço — vindos prontos do 02
    tom_inicio = df_nicho["sentimento_inicio"].mode()[0]
    tom_meio = df_nicho["sentimento_meio"].mode()[0]
    tom_fim = df_nicho["sentimento_fim"].mode()[0]

    def vocabulario_por_tom(coluna_sentimento: str, tom_alvo: str, top_n: int = 10) -> list:
        """
        Agrega vocabulario_falado dos vídeos cujo sentimento no terço
        coincide com o tom dominante. Counter simples sobre os termos
        pré-computados pelo 02 — sem recalcular embeddings nem TF-IDF.
        """
        mask = df_nicho[coluna_sentimento] == tom_alvo
        subset = df_nicho.loc[mask, "vocabulario_falado"].fillna("")
        contagem = Counter()
        for vocab in subset:
            termos = [t.strip() for t in str(vocab).split() if t.strip()]
            contagem.update(termos)
        # Fallback: se o tom dominante não tiver vídeos suficientes,
        # agrega sobre o nicho inteiro
        if len(contagem) < top_n:
            for vocab in df_nicho["vocabulario_falado"].fillna(""):
                termos = [t.strip() for t in str(vocab).split() if t.strip()]
                contagem.update(termos)
        return [termo for termo, _ in contagem.most_common(top_n)]

    vocabulario_inicio = vocabulario_por_tom("sentimento_inicio", tom_inicio)
    vocabulario_meio = vocabulario_por_tom("sentimento_meio", tom_meio)
    vocabulario_fim = vocabulario_por_tom("sentimento_fim", tom_fim)

    return {
        "inicio": {
            "tom": tom_inicio,
            "vocabulario_obrigatorio": vocabulario_inicio,
        },
        "meio": {
            "tom": tom_meio,
            "vocabulario_obrigatorio": vocabulario_meio,
        },
        "fim": {
            "tom": tom_fim,
            "vocabulario_obrigatorio": vocabulario_fim,
        },
    }


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 10 — EXTRAÇÃO DE PADRÕES DE ÁUDIO
# ════════════════════════════════════════════════════════════════════════════


def extrair_padroes_audio(df_nicho: pd.DataFrame) -> dict:
    """
    Extrai padrões de áudio do nicho:
    - tipo de áudio dominante (dominante de tipo_audio_dominante)
    - clima sonoro sugerido (tags individuais mais frequentes de pistas_audio_en)
    - frequência de uso de áudio no nicho (% de vídeos com pista identificada
      calculada sobre o total do nicho, não sobre o subset filtrado)
    Retorna dict com todos os campos do script_content.audio
    """
    # Tipo dominante
    tipo_dominante = df_nicho["tipo_audio_dominante"].dropna().mode()
    tipo_dominante = tipo_dominante[0] if len(tipo_dominante) > 0 else "desconhecido"

    # Pistas mais frequentes — extrai tags individuais ([laughter], [music], etc.)
    # via regex para evitar contar combinações concatenadas como pistas distintas
    todas_pistas = []
    for pista in df_nicho["pistas_audio_en"].dropna():
        tags = re.findall(r"\[[^\]]+\]", str(pista))
        todas_pistas.extend(tags)

    pistas_dominantes = [{"pista": pista, "frequencia": freq} for pista, freq in Counter(todas_pistas).most_common(5)]

    # Frequência de uso — % sobre total do nicho, não sobre subset com pista
    total = len(df_nicho)
    com_pista = df_nicho["pistas_audio_en"].apply(lambda x: bool(re.findall(r"\[[^\]]+\]", str(x))) if isinstance(x, str) else False).sum()
    frequencia_uso = round(com_pista / total, 3) if total > 0 else 0.0

    return {
        "tipo_dominante": tipo_dominante,
        "clima_sonoro": pistas_dominantes,
        "frequencia_uso_no_nicho": frequencia_uso,
    }


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 11 — EXTRAÇÃO DE PADRÕES DE REPETIÇÃO
# ════════════════════════════════════════════════════════════════════════════


def extrair_padroes_repeticao(df_nicho: pd.DataFrame) -> dict:
    """
    Define se o nicho usa repetição da ideia central e com que frequência:
    - ativar repetição? (True se % de tem_repeticao_roteiro > 30%)
    - frequência média de repetição (mediana de quantas vezes o termo mais
      frequente do roteiro se repete nos vídeos que têm repeticao=True)
    Retorna dict com todos os campos do script_content.repeticao
    """
    taxa_repeticao = df_nicho["tem_repeticao_roteiro"].mean()
    ativar = taxa_repeticao >= 0.3

    com_repeticao = df_nicho[df_nicho["tem_repeticao_roteiro"]]["texto_falado_limpo_en"].fillna("").tolist()

    frequencia_media = 0
    if com_repeticao:
        contagens = []
        stop_words = set(stopwords.words("english"))
        for roteiro in com_repeticao:
            if not roteiro.strip():
                continue
            tokens = [t for t in re.findall(r"\b[a-z]{3,}\b", roteiro.lower()) if t not in stop_words]
            if not tokens:
                continue
            # Conta quantas vezes o termo mais frequente do roteiro se repete
            mais_frequente = Counter(tokens).most_common(1)
            if mais_frequente:
                contagens.append(mais_frequente[0][1])

        frequencia_media = int(np.median(contagens)) if contagens else 0

    return {
        "ativar": ativar,
        "taxa_no_nicho": round(taxa_repeticao, 3),
        "frequencia_media": frequencia_media,
    }


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 12 — EXTRAÇÃO DE PADRÕES DE CTA
# ════════════════════════════════════════════════════════════════════════════


def extrair_padroes_cta(df_nicho: pd.DataFrame, modelo: SentenceTransformer) -> dict:
    """
    Extrai padrões de CTA do nicho:
    - estilo e intensidade (derivado de descricao_cta_intensidade
      calibrado por taxa_conversao mediana do nicho)
    - gatilho de debate (ativar se taxa_discussao mediana > threshold)
    - posição no roteiro (dominante de descricao_cta_posicao)
    - molde de frase do CTA (TF-IDF + filtro SBERT sobre frases candidatas
      com threshold mais alto pra garantir que só verbos de ação passam)
    - shortcircuit: se nicho não tem CTA (ausente+ausente), retorna molde vazio
      sem rodar pipeline — evita minerar diálogo como CTA
    Retorna dict com todos os campos do script_content.cta
    """
    # Intensidade calibrada por taxa_conversao mediana
    taxa_conversao = df_nicho["taxa_conversao"].median()
    if taxa_conversao >= 5.0:
        intensidade = "direto"
    elif taxa_conversao >= 2.0:
        intensidade = "moderado"
    else:
        intensidade = "suave"

    # Estilo dominante
    estilo_dominante = df_nicho["descricao_cta_intensidade"].mode()[0]

    # Gatilho de debate
    taxa_discussao = df_nicho["taxa_discussao"].median()
    threshold_debate = float(np.percentile(df_nicho["taxa_discussao"].dropna(), 75))
    ativar_debate = taxa_discussao >= threshold_debate

    # Posição dominante
    posicao_dominante = df_nicho["descricao_cta_posicao"].mode()[0]

    # Shortcircuit — nicho sem CTA identificado na descrição
    # Minerar roteiro de diálogo como CTA gera lixo (ex: "come here", "watch out")
    cta_score_mediano = round(df_nicho["descricao_cta_score"].median(), 3)
    if estilo_dominante == "ausente" and posicao_dominante == "ausente":
        return {
            "intensidade": intensidade,
            "estilo": estilo_dominante,
            "ativar_gatilho_debate": ativar_debate,
            "taxa_discussao_mediana": round(taxa_discussao, 3),
            "cta_score_mediano": cta_score_mediano,
            "posicao": posicao_dominante,
            "molde_termos": [],
        }

    padrao_cta = re.compile(
        r"\b(subscribe|follow|like|comment|share|click|check out|visit|"
        r"buy|get|download|sign up|join|watch|learn more|tap|swipe|"
        r"turn on|hit the bell|save|tag|dm|contact|order|shop)\b",
        re.IGNORECASE,
    )

    # Coleta candidatas via regex — pool amplo
    frases_candidatas = []
    for roteiro in df_nicho["texto_falado_limpo_en"].fillna("").tolist():
        frases = re.split(r"[.!?]+", roteiro.strip())
        for frase in frases:
            frase = frase.strip()
            if padrao_cta.search(frase) and len(frase.split()) >= 3:
                frases_candidatas.append(frase)

    if not frases_candidatas:
        molde_cta = []
    else:
        # Zero-shot via SBERT com threshold mais alto (0.4)
        # pra garantir que só frases genuinamente de CTA passam
        rotulos = [
            "subscribe like comment share follow the channel call to action",
            "narrative context storytelling describing events or dialogue",
        ]
        embs_candidatas = modelo.encode(frases_candidatas, convert_to_numpy=True)
        embs_rotulos = modelo.encode(rotulos, convert_to_numpy=True)

        sims = cosine_similarity(embs_candidatas, embs_rotulos)

        # Threshold mais alto e margem mínima entre os dois rótulos
        # evita classificar diálogo ambíguo como CTA
        frases_cta = [frase for frase, sim in zip(frases_candidatas, sims) if sim[0] > sim[1] and (sim[0] - sim[1]) >= 0.05]

        if len(frases_cta) < 3:
            molde_cta = []
        else:
            vectorizer = TfidfVectorizer(stop_words="english", max_features=50)
            try:
                matriz = vectorizer.fit_transform(frases_cta)
                scores = np.asarray(matriz.mean(axis=0)).flatten()
                termos = vectorizer.get_feature_names_out()
                indices_top = scores.argsort()[::-1][:50]
                candidatos = [termos[i] for i in indices_top]

                # Filtro semântico via SBERT — threshold alto pra CTA
                frases_contexto = [f"call to action asking viewer to {t}" for t in candidatos]
                embedding_contexto = modelo.encode(frases_contexto, convert_to_numpy=True)
                embedding_cta = modelo.encode(frases_cta, convert_to_numpy=True).mean(axis=0, keepdims=True)

                sims_termos = cosine_similarity(embedding_cta, embedding_contexto)[0]
                molde_cta = [t for t, s in zip(candidatos, sims_termos) if s >= 0.3][:10]
            except Exception:
                molde_cta = []

    return {
        "intensidade": intensidade,
        "estilo": estilo_dominante,
        "ativar_gatilho_debate": ativar_debate,
        "taxa_discussao_mediana": round(taxa_discussao, 3),
        "cta_score_mediano": cta_score_mediano,
        "posicao": posicao_dominante,
        "molde_termos": molde_cta,
    }


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 13 — EXTRAÇÃO DE VOCABULÁRIO GERAL
# ════════════════════════════════════════════════════════════════════════════


def extrair_vocabulario_geral(df_nicho: pd.DataFrame) -> dict:
    """
    Extrai vocabulário geral obrigatório do roteiro no nicho:
    - termos obrigatórios (TF-IDF + filtro SBERT por cluster HDBSCAN —
      garante termos discriminativos e semanticamente relevantes do nicho)
    - co-ocorrências obrigatórias (pares de termos mais frequentes
      de coocorrencias_roteiro do ouro — já sem pares auto-referentes
      após correção no 02_pre_processa.py)
    Retorna dict com todos os campos do script_content.vocabulario_geral
    """
    # Termos obrigatórios via agregação de vocabulario_falado
    # O 02_pre_processa.py já calculou os top 15 termos TF-IDF por vídeo.
    # Agrega por frequência no nicho — equivalente ao class-based TF-IDF
    # mas sem recalcular embeddings nem clustering do zero.
    contagem_vocab = Counter()
    for vocab in df_nicho["vocabulario_falado"].fillna("").tolist():
        termos = [t.strip() for t in str(vocab).split() if t.strip()]
        contagem_vocab.update(termos)

    termos_obrigatorios = [termo for termo, _ in contagem_vocab.most_common(30)]

    # Co-ocorrências — já sem pares auto-referentes após correção no 02
    todas_coocorrencias = []
    for lista in df_nicho["coocorrencias_roteiro"].dropna():
        if isinstance(lista, list):
            todas_coocorrencias.extend([tuple(par) for par in lista if isinstance(par, list)])

    coocorrencias_top = [list(par) for par, _ in Counter(todas_coocorrencias).most_common(10)]

    return {
        "termos_obrigatorios": termos_obrigatorios,
        "coocorrencias_obrigatorias": coocorrencias_top,
    }


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 14 — CONSOLIDAÇÃO E SALVAMENTO
# ════════════════════════════════════════════════════════════════════════════


def extrair_padroes_dialogo(df_nicho: pd.DataFrame) -> dict:
    """
    Determina se o nicho usa formato de diálogo (roteiro com múltiplos
    interlocutores, marcado por >> no texto_falado original) ou monólogo.
    tem_dialogo foi gerado pelo 02_pre_processa.py e chega pronto no ouro.
    Retorna usa_dialogo (bool) e taxa_dialogo (proporção do nicho)
    para que a LLM saiba o formato narrativo correto ao gerar o roteiro.
    """
    if "tem_dialogo" not in df_nicho.columns:
        return {"usa_dialogo": False, "taxa_dialogo_no_nicho": 0.0}

    taxa = round(float(df_nicho["tem_dialogo"].mean()), 3)
    usa = taxa >= 0.3

    return {
        "usa_dialogo": usa,
        "taxa_dialogo_no_nicho": taxa,
    }


def extrair_estrutura_geral(df_nicho: pd.DataFrame) -> dict:
    """
    Extrai e descreve semanticamente o formato narrativo dominante do nicho.
    O 02_pre_processa.py gera estrutura_blocos via KMeans com labels formato_1,
    formato_2, ... sem semântica. Esta função identifica o cluster dominante,
    calcula as medianas das features que o definem e deriva uma descrição
    legível para a LLM.
    Também incorpora tem_dialogo para indicar se o nicho usa monólogo ou diálogo.
    """
    # Cluster dominante
    cluster_dominante = df_nicho["estrutura_blocos"].mode()[0]
    df_cluster = df_nicho[df_nicho["estrutura_blocos"] == cluster_dominante]

    # Medianas das features do cluster dominante
    ritmo_mediano = round(df_cluster["ritmo_palavras_seg"].median(), 3)
    densidade_mediana = int(df_cluster["densidade_roteiro"].median())
    faixa_dominante = df_cluster["faixa_duracao"].mode()[0]
    repeticao = bool(df_cluster["tem_repeticao_roteiro"].mean() >= 0.3)

    # Diálogo — delega para extrair_padroes_dialogo
    dialogo = extrair_padroes_dialogo(df_nicho)
    usa_dialogo = dialogo["usa_dialogo"]
    taxa_dialogo = dialogo["taxa_dialogo_no_nicho"]

    # Descrição semântica derivada das features
    if ritmo_mediano >= 4.0 and densidade_mediana <= 150:
        estilo = "impacto_rapido"
    elif repeticao and ritmo_mediano >= 3.5:
        estilo = "esquete_com_hook"
    elif densidade_mediana >= 400:
        estilo = "narrativa"
    else:
        estilo = "esquete"

    return {
        "estrutura_blocos": estilo,
        "faixa_duracao": faixa_dominante,
        "limite_palavras": densidade_mediana,
        "usa_dialogo": usa_dialogo,
        "taxa_dialogo_no_nicho": taxa_dialogo,
        "usa_repeticao": repeticao,
    }


def consolidar_padroes_nicho(
    df_nicho: pd.DataFrame,
    nicho: str,
    modelo: SentenceTransformer,
) -> dict:
    """
    Consolida todos os padrões extraídos num único dict estruturado
    com exatamente os campos definidos em structure_content e script_content.
    Chama todos os blocos de extração e monta o JSON final do nicho.
    """
    return {
        "nicho": nicho,
        "structure_content": {
            "titulo": extrair_padroes_titulo(df_nicho, modelo),
            "descricao": extrair_padroes_descricao(df_nicho, modelo),
            "palavras_chave": extrair_padroes_palavras_chave(df_nicho),
            "thumbnail": extrair_padroes_thumbnail(df_nicho, modelo),
            "postagem": extrair_padroes_postagem(df_nicho),
        },
        "script_content": {
            "estrutura_geral": extrair_estrutura_geral(df_nicho),
            "gancho": extrair_padroes_gancho(df_nicho, modelo),
            "ritmo_linguagem": extrair_padroes_ritmo(df_nicho),
            "arco_emocional": extrair_arco_emocional(df_nicho),
            "audio": extrair_padroes_audio(df_nicho),
            "repeticao": extrair_padroes_repeticao(df_nicho),
            "cta": extrair_padroes_cta(df_nicho, modelo),
            "vocabulario_geral": extrair_vocabulario_geral(df_nicho),
        },
    }


def salvar_padroes_por_nicho(df: pd.DataFrame, modelo: SentenceTransformer) -> None:
    """
    Itera sobre todos os nichos do CSV ouro,
    chama consolidar_padroes_nicho() para cada um
    e salva o JSON em models/padroes_virais/{nicho}.json.
    """
    nichos = df["nicho"].unique()

    for nicho in nichos:
        print(f"[03] Processando nicho: {nicho}...")
        df_nicho = df[df["nicho"] == nicho].reset_index(drop=True)

        padroes = consolidar_padroes_nicho(df_nicho, nicho, modelo)

        caminho = os.path.join(PASTA_PADROES, f"{nicho}.json")
        with open(caminho, "w", encoding="utf-8") as f:
            json.dump(padroes, f, ensure_ascii=False, indent=2, default=lambda o: bool(o) if isinstance(o, np.bool_) else int(o) if isinstance(o, np.integer) else float(o) if isinstance(o, np.floating) else o.tolist() if isinstance(o, np.ndarray) else TypeError(f"Tipo não serializável: {type(o)}"))

        print(f"[03] ✓ {nicho}.json salvo ({len(df_nicho)} vídeos).")


def calcular_similaridade_entre_nichos(df: pd.DataFrame, modelo: SentenceTransformer) -> None:
    """
    Calcula e salva vetores de embedding agregados por nicho
    para uso no fallback de nicho desconhecido no inferencia_ml.py.
    Técnica: média dos embeddings de palavras_chave_en por nicho +
    cosine similarity entre nichos.
    Salva nicho_similaridade.pkl com embeddings, matriz e lista de nichos.
    """
    nichos = df["nicho"].unique().tolist()
    embeddings_por_nicho = []

    for nicho in nichos:
        df_nicho = df[df["nicho"] == nicho]
        textos = df_nicho["palavras_chave_en"].fillna("").tolist()
        embs = embeddar_textos(textos, modelo)
        embedding_agregado = embs.mean(axis=0)
        embeddings_por_nicho.append(embedding_agregado)

    matriz_embeddings = np.stack(embeddings_por_nicho)

    caminho = os.path.join(BASE_DIR, "models", "nicho_similaridade.pkl")
    with open(caminho, "wb") as f:
        pickle.dump(
            {
                "nichos": nichos,
                "embeddings": matriz_embeddings,
            },
            f,
        )

    print(f"[03] ✓ nicho_similaridade.pkl salvo ({len(nichos)} nichos).")


# ════════════════════════════════════════════════════════════════════════════
# MAESTRO
# ════════════════════════════════════════════════════════════════════════════


def maestro_treinamento() -> None:
    """
    Orquestra a execução sequencial de todos os blocos:
    1. Baixa CSV ouro do Supabase
    2. Deserializa colunas que chegam como string do CSV
    3. Carrega modelo Sentence-BERT uma única vez
    4. Para cada nicho: extrai e consolida todos os padrões
    5. Salva JSON por nicho em models/padroes_virais/
    6. Calcula e salva similaridade entre nichos para fallback
    """
    print("[03] Baixando CSV ouro...")
    df = baixar_csv_ouro()
    if df.empty:
        print("[03] ERRO: CSV ouro vazio ou não encontrado.")
        return

    # Deserializa colunas que o pandas carrega como string
    colunas_lista = [
        "titulo_emojis_posicao",
        "palavras_chave_shorttail",
        "palavras_chave_midtail",
        "palavras_chave_longtail",
        "ngramas_roteiro",
        "coocorrencias_roteiro",
    ]
    colunas_dict = [
        "palavras_chave_proporcao",
    ]
    for col in colunas_lista + colunas_dict:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: ast.literal_eval(x) if isinstance(x, str) and x.strip() else ([] if col in colunas_lista else {}))

    # Cast de colunas que o pandas pode carregar como string do CSV
    if "tem_dialogo" in df.columns:
        df["tem_dialogo"] = df["tem_dialogo"].map(lambda x: str(x).strip().lower() == "true" if not isinstance(x, bool) else x)

    if "descricao_cta_score" in df.columns:
        df["descricao_cta_score"] = pd.to_numeric(df["descricao_cta_score"], errors="coerce").fillna(0.0)

    print("[03] Carregando modelo Sentence-BERT...")
    modelo = SentenceTransformer("all-MiniLM-L6-v2")

    print("[03] Extraindo e salvando padrões por nicho...")
    salvar_padroes_por_nicho(df, modelo)

    print("[03] Calculando similaridade entre nichos...")
    calcular_similaridade_entre_nichos(df, modelo)

    print("[03] Concluído.")


if __name__ == "__main__":
    maestro_treinamento()
