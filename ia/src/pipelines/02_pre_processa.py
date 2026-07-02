"""
02_pre_processa.py

Responsabilidade: receber o CSV prata (já com as 52 colunas do processador_features.py),
selecionar e criar as colunas que vão compor o CSV ouro,
que será a entrada do 03_treinamento.py.

Colunas que FICAM do CSV prata:
    nicho, titulo_en, descricao_en, palavras_chave_en,
    texto_thumbnail, descricao_visual_thumb,
    gancho_primeira_frase, texto_falado_limpo_en,
    vocabulario_falado, vibe_emojis, faixa_duracao,
    estrutura_blocos, ritmo_palavras_seg, densidade_roteiro,
    sentimento_roteiro, tem_repeticao_roteiro,
    tipo_audio_dominante, clickbait_score, completude_seo,
    taxa_conversao, taxa_discussao, dia_postagem,
    janela_postagem, hora_postagem, pistas_audio_en

Colunas que SAEM:
    todo o restante — identificadores, originais substituídas,
    métricas de engajamento brutas, targets do modelo antigo

Colunas NOVAS criadas aqui (features derivadas para o ouro):
    titulo_formula_abertura, titulo_comprimento,
    titulo_caps_intensidade, titulo_pontuacao_impacto,
    titulo_sentimento, titulo_emojis_posicao,
    descricao_comprimento, descricao_primeira_linha_comprimento,
    descricao_primeira_linha_sentimento, descricao_tem_link,
    descricao_cta_posicao, descricao_cta_intensidade,
    descricao_cta_score, thumbnail_caps_intensidade,
    thumbnail_sentimento_visual, thumbnail_tem_pessoa,
    gancho_formula_abertura, gancho_comprimento,
    gancho_sentimento, gancho_pontuacao_impacto,
    comprimento_medio_frase, variancia_ritmo,
    densidade_pontuacao_impacto, sentimento_inicio,
    sentimento_meio, sentimento_fim,
    palavras_chave_shorttail, palavras_chave_midtail,
    palavras_chave_longtail, palavras_chave_proporcao,
    coocorrencias_roteiro, ngramas_roteiro
"""

import ast
import re
import textwrap
import time
from collections import Counter
from urllib.parse import unquote

import emoji
import nltk
import numpy as np
import pandas as pd
import spacy
import spacy_ngram  # noqa: F401 — efeito colateral: registra "spacy-ngram" como factory no spaCy
import textdescriptives  # noqa: F401 — efeito colateral: registra "textdescriptives/*" como factory no spaCy
from deep_translator import GoogleTranslator
from lingua import Language, LanguageDetectorBuilder
from nltk.corpus import stopwords
from nrclex import NRCLex
from sentence_transformers import SentenceTransformer, util
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import LabelEncoder, MinMaxScaler, StandardScaler
from textblob import TextBlob
from tqdm import tqdm
from transformers import pipeline as hf_pipeline

from src.core.supabase_client import baixar_csv_prata, subir_csv_ouro

# ════════════════════════════════════════════════════════════════════════════
# BLOCO 0 — Ajuste de colunas
# ════════════════════════════════════════════════════════════════════════════


def reprocessar_texto_falado(df: pd.DataFrame) -> pd.DataFrame:
    """
    Reprocessa texto_falado atualizando/adicionando:
    - tem_dialogo (nova)
    - pistas_audio
    - pistas_audio_en
    - texto_falado_limpo
    - texto_falado_limpo_en
    """
    tradutor = GoogleTranslator(source="auto", target="en")
    detector = LanguageDetectorBuilder.from_all_languages().build()

    def _detectar_dialogo(texto: str) -> bool:
        if not texto or pd.isna(texto):
            return False
        return len(re.findall(r">>", str(texto))) >= 2

    def _extrair_pistas_audio(texto: str) -> str:
        if not texto or pd.isna(texto):
            return ""
        matches = re.findall(r"\[.*?\]|\(.*?\)|♪", str(texto))
        return " ".join(list(dict.fromkeys(matches))) if matches else ""

    def _limpar_texto(texto: str) -> str:
        if not texto or pd.isna(texto):
            return ""
        t = str(texto)
        t = re.sub(r"\[.*?\]|\(.*?\)|♪", " ", t)
        t = re.sub(r">>\s*[\w\s]+:", " ", t)
        t = re.sub(r">>", " ", t)
        t = re.sub(r"\s+", " ", t).strip()
        return t

    def _e_ingles(texto: str) -> bool:
        if not any(c.isalpha() for c in texto):
            return True
        if len(texto.split()) <= 2:
            return True
        lang_frase = detector.detect_language_of(texto)
        return lang_frase is None or lang_frase == Language.ENGLISH

    def _traduzir_pistas_audio(texto: str) -> str:
        """Traduz pistas de áudio mantendo estrutura dos marcadores. Lowercase, sem remover pontuação."""
        if not texto or not texto.strip():
            return ""
        texto_sem_marcadores = re.sub(r"[\[\]()♪]", "", texto).strip()
        if not texto_sem_marcadores or not any(c.isalpha() for c in texto_sem_marcadores):
            return texto.lower()

        def _chunk(t):
            try:
                r = tradutor.translate(t)
                return r if r and r.strip() else None
            except Exception as e:
                print(f"    [erro chunk] {str(e)[:60]}")
                return None

        tentativa = 1
        while True:
            resultado = _chunk(texto)
            if not resultado:
                print(f"    [pistas_audio tentativa {tentativa}] retornou vazio, aguardando 10s...")
                tentativa += 1
                time.sleep(10)
                continue

            print(f"    [pistas_audio tentativa {tentativa}] traduzido com sucesso")
            return resultado.lower()

    def _traduzir_texto_falado(texto: str) -> str:
        """Traduz texto falado limpo. Lowercase + remove pontuação para NLP/ML."""
        if not texto or not texto.strip():
            return ""
        if not any(c.isalpha() for c in texto):
            return texto

        def _chunk(t):
            try:
                r = tradutor.translate(t)
                return r if r and r.strip() else None
            except Exception as e:
                print(f"    [erro chunk] {str(e)[:60]}")
                return None

        def _traduzir(t):
            if len(t) < 1500:
                return _chunk(t)
            pedacos = textwrap.wrap(t, width=1500, break_long_words=False)
            resultado = ""
            for p in pedacos:
                r = None
                while r is None:
                    r = _chunk(p)
                    if r is None:
                        print("    [chunk] falhou, tentando novamente em 10s...")
                        time.sleep(10)
                resultado += r + " "
            return resultado.strip()

        tentativa = 1
        max_tentativas = 3
        while True:
            resultado = _traduzir(texto)
            if not resultado:
                print(f"    [texto_falado tentativa {tentativa}] retornou vazio, aguardando 10s...")
                tentativa += 1
                time.sleep(10)
                continue

            resultado_lower = resultado.lower()
            if _e_ingles(resultado_lower) or tentativa >= max_tentativas:
                if tentativa >= max_tentativas:
                    print(f"    [texto_falado] desistindo após {max_tentativas} tentativas — possível contaminação no texto original")
                else:
                    print(f"    [texto_falado tentativa {tentativa}] 100% inglês confirmado")
                t = re.sub(r"[^\w\s]", " ", resultado_lower)
                t = re.sub(r"\s+", " ", t).strip()
                return t

            tentativa += 1

    tqdm.pandas()

    print("[02/BLOCO0] Processando tem_dialogo, pistas_audio, texto_falado_limpo...")
    df["tem_dialogo"] = df["texto_falado"].progress_apply(_detectar_dialogo)
    df["pistas_audio"] = df["texto_falado"].progress_apply(_extrair_pistas_audio)
    df["texto_falado_limpo"] = df["texto_falado"].progress_apply(_limpar_texto)

    print("[02/BLOCO0] Traduzindo pistas_audio → pistas_audio_en...")
    df["pistas_audio_en"] = df["pistas_audio"].progress_apply(_traduzir_pistas_audio)

    print("[02/BLOCO0] Traduzindo texto_falado_limpo → texto_falado_limpo_en...")
    df["texto_falado_limpo_en"] = df["texto_falado_limpo"].progress_apply(_traduzir_texto_falado)

    print("[02/BLOCO0] texto_falado concluído.")
    return df


def reprocessar_textos_principais(df: pd.DataFrame) -> pd.DataFrame:
    """
    Reprocessa textos principais atualizando:
    - palavras_chave
    - palavras_chave_en
    - titulo_en
    - descricao_en
    """
    tradutor = GoogleTranslator(source="auto", target="en")
    detector = LanguageDetectorBuilder.from_all_languages().build()

    YOUTUBE_CATEGORY_IDS = {
        "1": "Film & Animation",
        "2": "Autos & Vehicles",
        "10": "Music",
        "15": "Pets & Animals",
        "17": "Sports",
        "19": "Travel & Events",
        "20": "Gaming",
        "22": "People & Blogs",
        "23": "Comedy",
        "24": "Entertainment",
        "25": "News & Politics",
        "26": "Howto & Style",
        "27": "Education",
        "28": "Science & Technology",
        "29": "Nonprofits & Activism",
        "18": "Short Movies",
        "21": "Videoblogging",
        "30": "Movies",
        "31": "Anime/Animation",
        "32": "Action/Adventure",
        "33": "Classics",
        "34": "Comedy (Backend/Movies)",
        "35": "Documentary",
        "36": "Drama",
        "37": "Family",
        "38": "Foreign",
        "39": "Horror",
        "40": "Sci-Fi/Fantasy",
        "41": "Thriller",
        "42": "Shorts",
        "43": "Shows",
        "44": "Trailers",
    }

    def _construir_palavras_chave(row) -> str:
        palavras = []

        topicos = row.get("topicos_wikipedia", "[]")
        if isinstance(topicos, str):
            try:
                topicos = ast.literal_eval(topicos)
            except (ValueError, SyntaxError):
                topicos = []
        if isinstance(topicos, list):
            for url in topicos:
                termo = unquote(url.split("/")[-1]).replace("_", " ")
                palavras.append(termo)

        cat_id = str(row.get("categoria_id", ""))
        if cat_id in YOUTUBE_CATEGORY_IDS:
            palavras.append(YOUTUBE_CATEGORY_IDS[cat_id])

        titulo = str(row.get("titulo", ""))
        descricao = str(row.get("descricao", ""))
        palavras.extend(re.findall(r"#(\w+)", titulo))
        palavras.extend(re.findall(r"#(\w+)", descricao))

        tags = row.get("tags", "[]")
        if isinstance(tags, str):
            try:
                tags = ast.literal_eval(tags)
            except (ValueError, SyntaxError):
                tags = []
        if isinstance(tags, list):
            palavras.extend(tags)

        palavras_limpas = set()
        for p in palavras:
            if p and isinstance(p, str):
                palavras_limpas.add(p.strip().lower())

        return ", ".join(sorted(list(palavras_limpas)))

    def _e_ingles_termo(termo: str) -> bool:
        """
        Checagem por termo individual (não por palavra solta do texto todo).
        Termos de 1-2 palavras (a maioria de tags/hashtags/nomes próprios)
        passam direto — não há contexto suficiente pra detecção de idioma
        confiável nesse tamanho.
        """
        if not termo.strip() or not any(c.isalpha() for c in termo):
            return True
        if len(termo.split()) <= 2:
            return True
        lang = detector.detect_language_of(termo)
        return lang is None or lang == Language.ENGLISH

    def _chunk(t: str):
        try:
            r = tradutor.translate(t)
            return r if r and r.strip() else None
        except Exception as e:
            print(f"    [erro chunk] {str(e)[:60]}")
            return None

    def _traduzir_palavras_chave(texto: str) -> str:
        """
        Traduz palavras_chave termo a termo (separado por vírgula).
        Cada termo é avaliado isoladamente — evita que um nome próprio
        ou hashtag intraduzível force retradução do texto inteiro.
        Termos que não mudam após a tradução (sinal de que o tradutor
        não tem o que traduzir) são aceitos sem insistir.
        """
        if not texto or not texto.strip():
            return ""

        termos = [t.strip() for t in texto.split(",") if t.strip()]
        resultado_termos = []

        for termo in termos:
            if _e_ingles_termo(termo):
                resultado_termos.append(termo.lower())
                continue

            atual = termo
            tentativa = 1
            max_tentativas = 2
            while tentativa <= max_tentativas:
                traduzido = _chunk(atual)
                if not traduzido:
                    tentativa += 1
                    continue

                if traduzido.strip().lower() == atual.strip().lower():
                    break

                atual = traduzido
                if _e_ingles_termo(atual.lower()):
                    break

                tentativa += 1

            resultado_termos.append(atual.lower())

        resultado = ", ".join(resultado_termos)
        t = re.sub(r"[^\w\s,]", " ", resultado)
        t = re.sub(r"\s+", " ", t).strip()
        return t

    def _e_ingles(texto: str) -> bool:
        # Checagem por frase inteira (igual a texto_falado) em vez de
        # palavra por palavra — título/descrição de YouTube Short são
        # curtos, e checar palavra a palavra reprova o texto inteiro
        # por causa de um único termo mal classificado (nome de marca,
        # sigla, número de modelo), mesmo quando o texto já está em inglês.
        if not any(c.isalpha() for c in texto):
            return True
        if len(texto.split()) <= 2:
            return True
        lang = detector.detect_language_of(texto)
        return lang is None or lang == Language.ENGLISH

    def _traduzir_sem_alterar(texto, label: str) -> str:
        """Traduz titulo e descricao. 100% inglês, sem lowercase, sem remover pontuação."""
        # pd.isna cobre NaN/None antes de qualquer .strip() — texto chega
        # como float quando a célula do CSV está vazia (NaN do pandas),
        # e not texto sozinho não pega esse caso (NaN é truthy em Python)
        if pd.isna(texto) or not str(texto).strip():
            return ""
        texto = str(texto)
        if not any(c.isalpha() for c in texto):
            return texto

        def _traduzir(t):
            if len(t) < 1500:
                return _chunk(t)
            pedacos = textwrap.wrap(t, width=1500, break_long_words=False)
            resultado = ""
            for p in pedacos:
                r = None
                while r is None:
                    r = _chunk(p)
                    if r is None:
                        print(f"    [{label} chunk] falhou, tentando novamente em 10s...")
                        time.sleep(10)
                resultado += r + " "
            return resultado.strip()

        tentativa = 1
        max_tentativas = 3
        while True:
            resultado = _traduzir(texto)
            if not resultado:
                print(f"    [{label} tentativa {tentativa}] retornou vazio, aguardando 10s...")
                tentativa += 1
                time.sleep(10)
                continue

            if _e_ingles(resultado.lower()) or tentativa >= max_tentativas:
                if tentativa >= max_tentativas:
                    print(f"    [{label}] desistindo após {max_tentativas} tentativas — possível contaminação no texto original")
                else:
                    print(f"    [{label} tentativa {tentativa}] 100% inglês confirmado")
                return resultado

            tentativa += 1

    tqdm.pandas()

    print("[02/BLOCO0] Construindo palavras_chave...")
    df["palavras_chave"] = df.progress_apply(_construir_palavras_chave, axis=1)

    print("[02/BLOCO0] Traduzindo palavras_chave → palavras_chave_en...")
    df["palavras_chave_en"] = df["palavras_chave"].progress_apply(_traduzir_palavras_chave)

    print("[02/BLOCO0] Traduzindo titulo → titulo_en...")
    df["titulo_en"] = df["titulo"].progress_apply(lambda t: _traduzir_sem_alterar(t, "titulo"))

    print("[02/BLOCO0] Traduzindo descricao → descricao_en...")
    df["descricao_en"] = df["descricao"].progress_apply(lambda t: _traduzir_sem_alterar(t, "descricao"))

    print("[02/BLOCO0] textos principais concluídos.")
    return df


def reprocessar_features_texto_falado(df: pd.DataFrame) -> pd.DataFrame:
    """
    Reprocessa features derivadas de texto_falado_limpo_en atualizando:
    - gancho_primeira_frase
    - densidade_roteiro
    - ritmo_palavras_seg
    - tem_repeticao_roteiro
    - sentimento_roteiro
    - vocabulario_falado
    """

    try:
        stop_words = set(stopwords.words("english"))
    except LookupError:
        nltk.download("stopwords", quiet=True)
        stop_words = set(stopwords.words("english"))

    tqdm.pandas()

    # ── gancho_primeira_frase ─────────────────────────────────────────────────
    def _gancho(t):
        if pd.isna(t) or not str(t).strip():
            return ""
        return " ".join(str(t).split()[:15])

    print("[02/BLOCO0] Calculando gancho_primeira_frase...")
    df["gancho_primeira_frase"] = df["texto_falado_limpo_en"].progress_apply(_gancho)

    # ── densidade_roteiro ─────────────────────────────────────────────────────
    def _densidade(t):
        if pd.isna(t) or not str(t).strip():
            return 0
        return len(str(t).split())

    print("[02/BLOCO0] Calculando densidade_roteiro...")
    df["densidade_roteiro"] = df["texto_falado_limpo_en"].progress_apply(_densidade)

    # ── ritmo_palavras_seg ────────────────────────────────────────────────────
    print("[02/BLOCO0] Calculando ritmo_palavras_seg...")
    df["ritmo_palavras_seg"] = np.where(df["duracao_segundos"] > 0, df["densidade_roteiro"] / df["duracao_segundos"], 0.0)

    # ── tem_repeticao_roteiro ─────────────────────────────────────────────────
    def _tem_repeticao(t):
        if pd.isna(t) or not str(t).strip():
            return False
        palavras = re.findall(r"\b[a-z]{3,}\b", str(t))
        relevantes = [p for p in palavras if p not in stop_words]
        if not relevantes:
            return False
        return pd.Series(relevantes).value_counts().iloc[0] >= 5

    print("[02/BLOCO0] Calculando tem_repeticao_roteiro...")
    df["tem_repeticao_roteiro"] = df["texto_falado_limpo_en"].progress_apply(_tem_repeticao)

    # ── sentimento_roteiro ────────────────────────────────────────────────────
    # TextBlob em vez de VADER — funciona melhor em texto sem pontuação
    # polarity: -1.0 (negativo) a 1.0 (positivo)
    # limiares simétricos: >= 0.05 positivo | <= -0.05 negativo | entre: neutro
    def _sentimento(t):
        if pd.isna(t) or not str(t).strip():
            return "neutro"
        polarity = TextBlob(str(t)).sentiment.polarity
        if polarity >= 0.05:
            return "positivo"
        if polarity <= -0.05:
            return "negativo"
        return "neutro"

    print("[02/BLOCO0] Calculando sentimento_roteiro...")
    df["sentimento_roteiro"] = df["texto_falado_limpo_en"].progress_apply(_sentimento)

    # ── vocabulario_falado ────────────────────────────────────────────────────
    # TF-IDF por documento — peso real da palavra no vídeo vs corpus inteiro
    # Remove stopwords via parâmetro nativo do TfidfVectorizer
    # top 15 termos mais relevantes por vídeo como string separada por espaço
    print("[02/BLOCO0] Calculando vocabulario_falado...")

    corpus = df["texto_falado_limpo_en"].fillna("").tolist()
    corpus_valido = [t if t.strip() else "empty" for t in corpus]

    vectorizer = TfidfVectorizer(stop_words="english", token_pattern=r"\b[a-z]{3,}\b", max_features=5000)
    matriz = vectorizer.fit_transform(corpus_valido)
    termos = vectorizer.get_feature_names_out()

    def _vocab_tfidf(idx):
        linha = matriz[idx]
        if linha.nnz == 0:
            return ""
        scores = zip(linha.indices, linha.data)
        top = sorted(scores, key=lambda x: x[1], reverse=True)[:15]
        return " ".join(termos[i] for i, _ in top)

    df["vocabulario_falado"] = [_vocab_tfidf(i) for i in range(len(df))]

    print("[02/BLOCO0] features de texto_falado_limpo_en concluídas.")
    return df


def reprocessar_features_engajamento(df: pd.DataFrame) -> pd.DataFrame:
    """
    Reprocessa features de engajamento e atração atualizando:
    - tipo_audio_dominante
    - vibe_emojis
    - completude_seo
    - clickbait_score
    """

    tqdm.pandas()

    # ── tipo_audio_dominante ──────────────────────────────────────────────────
    # Tag de áudio mais frequente em pistas_audio_en
    def _tipo_audio(t):
        if pd.isna(t) or not str(t).strip():
            return ""
        tags = re.findall(r"\[.*?\]|\(.*?\)|♪", str(t))
        if not tags:
            return ""
        return pd.Series(tags).value_counts().index[0]

    print("[02/BLOCO0] Calculando tipo_audio_dominante...")
    df["tipo_audio_dominante"] = df["pistas_audio_en"].progress_apply(_tipo_audio)

    # ── vibe_emojis ───────────────────────────────────────────────────────────
    # Emojis são Unicode — preservados na tradução
    # Usa titulo_en + descricao_en, deduplicado
    def _vibe_emojis(row):
        titulo = str(row.get("titulo_en", ""))
        desc = str(row.get("descricao_en", ""))
        texto = titulo + " " + desc
        emojis = set(e["emoji"] for e in emoji.emoji_list(texto))
        return "".join(sorted(emojis))

    print("[02/BLOCO0] Calculando vibe_emojis...")
    df["vibe_emojis"] = df.progress_apply(_vibe_emojis, axis=1)

    # ── completude_seo ────────────────────────────────────────────────────────
    # Score contínuo de intensidade SEO
    # Sinais: descricao preenchida, riqueza de palavras_chave_en,
    #         hashtags, menções @, emojis — tudo via _en
    # Normalizado Min-Max no final
    def _completude_seo(row):
        pontos = 0.0

        desc = str(row.get("descricao_en", ""))
        if desc.strip():
            pontos += 1.0

        palavras_chave = str(row.get("palavras_chave_en", ""))
        qtd_termos = len([t for t in palavras_chave.split(",") if t.strip()])
        pontos += min(3.0, qtd_termos / 5)

        texto_completo = str(row.get("titulo_en", "")) + " " + desc
        pontos += len(re.findall(r"#\w+", texto_completo))
        pontos += len(re.findall(r"@\w+", texto_completo))
        pontos += len(emoji.emoji_list(texto_completo))

        return pontos

    print("[02/BLOCO0] Calculando completude_seo...")
    scores_seo = df.progress_apply(_completude_seo, axis=1)
    scaler = MinMaxScaler()
    df["completude_seo"] = scaler.fit_transform(scores_seo.values.reshape(-1, 1)).flatten()

    # ── clickbait_score ───────────────────────────────────────────────────────
    # Três pilares: título | thumbnail | descrição
    # Título: sentence-transformers mede impacto semântico do título
    #         vs média do corpus — títulos que se destacam têm score alto
    #         + sinais estruturais: emojis, hashtags, comprimento ideal
    # Thumbnail: presença de texto na capa + riqueza semântica da cena (qtd palavras)
    # Descrição: hashtags, emojis, densidade da primeira linha
    # Score final: média dos três pilares normalizados Min-Max

    print("[02/BLOCO0] Carregando sentence-transformers para clickbait_score...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    titulos = df["titulo_en"].fillna("").tolist()
    embeddings = model.encode(titulos, show_progress_bar=True, convert_to_tensor=True)
    media_corpus = embeddings.mean(dim=0)
    distancias = util.cos_sim(embeddings, media_corpus.unsqueeze(0)).squeeze().tolist()
    if isinstance(distancias, float):
        distancias = [distancias]

    def _score_titulo(row, distancia):
        t = str(row.get("titulo_en", ""))
        if not t.strip():
            return 0.0
        qtd_emojis = len(emoji.emoji_list(t))
        qtd_hashtags = len(re.findall(r"#\w+", t))
        comprimento = len(t)
        score_comp = 1.0 if 40 <= comprimento <= 70 else max(0.0, 1.0 - abs(comprimento - 55) / 55)
        return distancia + qtd_emojis + qtd_hashtags + score_comp

    def _score_thumbnail(row):
        t = str(row.get("texto_thumbnail", ""))
        d = str(row.get("descricao_visual_thumb", ""))
        pontos = 0.0
        if t.strip():
            pontos += 1.0
            pontos += max(0.0, 1.0 - max(0, len(t.split()) - 8) / 8)
        if d.strip():
            pontos += min(1.0, len(d.split()) / 15)
        return pontos

    def _score_descricao(row):
        t = str(row.get("descricao_en", ""))
        if not t.strip():
            return 0.0
        qtd_hashtags = len(re.findall(r"#\w+", t))
        qtd_emojis = len(emoji.emoji_list(t))
        primeira_linha = t[:100].strip()
        score_densidade = min(1.0, len(primeira_linha.split()) / 15)
        return qtd_hashtags + qtd_emojis + score_densidade

    scores_titulo = pd.Series([_score_titulo(df.iloc[i], distancias[i]) for i in range(len(df))])
    scores_thumb = df.progress_apply(_score_thumbnail, axis=1)
    scores_desc = df.progress_apply(_score_descricao, axis=1)

    def _minmax(serie):
        mn, mx = serie.min(), serie.max()
        if mx == mn:
            return pd.Series(0.0, index=serie.index)
        return (serie - mn) / (mx - mn)

    print("[02/BLOCO0] Calculando clickbait_score...")
    df["clickbait_score"] = (_minmax(scores_titulo) + _minmax(scores_thumb) + _minmax(scores_desc)) / 3.0

    print("[02/BLOCO0] features de engajamento concluídas.")
    return df


def reprocessar_estrutura_blocos(df: pd.DataFrame) -> pd.DataFrame:
    """
    Reprocessa estrutura_blocos usando KMeans com k otimizado via silhouette score.
    Features: faixa_duracao, ritmo_palavras_seg, densidade_roteiro,
              tem_repeticao_roteiro, tipo_audio_dominante, tem_dialogo
    Labels: formato_1, formato_2, ... (emergem dos dados, sem labels fixas)
    """

    # ── Preparação das features ───────────────────────────────────────────────
    # faixa_duracao e tipo_audio_dominante são categóricas — encode numérico
    # tem_repeticao_roteiro e tem_dialogo são bool — cast para int
    # ritmo_palavras_seg e densidade_roteiro já são numéricas

    df_feat = pd.DataFrame()

    le_faixa = LabelEncoder()
    df_feat["faixa_duracao"] = le_faixa.fit_transform(df["faixa_duracao"].fillna("desconhecido"))

    le_audio = LabelEncoder()
    df_feat["tipo_audio_dominante"] = le_audio.fit_transform(df["tipo_audio_dominante"].fillna(""))

    df_feat["ritmo_palavras_seg"] = pd.to_numeric(df["ritmo_palavras_seg"], errors="coerce").fillna(0.0)
    df_feat["densidade_roteiro"] = pd.to_numeric(df["densidade_roteiro"], errors="coerce").fillna(0.0)
    df_feat["tem_repeticao_roteiro"] = df["tem_repeticao_roteiro"].astype(int)
    df_feat["tem_dialogo"] = df["tem_dialogo"].astype(int)

    # Normaliza tudo — KMeans é sensível a escala
    scaler = StandardScaler()
    X = scaler.fit_transform(df_feat)

    # ── Busca do k ótimo via silhouette score ─────────────────────────────────
    # Testa k de 2 a 8 — abaixo de 2 não faz sentido, acima de 8 é granular demais
    print("[02/BLOCO0] Buscando k ótimo para estrutura_blocos...")

    melhor_k = 2
    melhor_score = -1

    for k in range(2, 9):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X)
        score = silhouette_score(X, labels)
        print(f"    k={k} → silhouette={score:.4f}")
        if score > melhor_score:
            melhor_score = score
            melhor_k = k

    print(f"    [k ótimo] k={melhor_k} (silhouette={melhor_score:.4f})")

    # ── Fit final com k ótimo ─────────────────────────────────────────────────
    km_final = KMeans(n_clusters=melhor_k, random_state=42, n_init=10)
    clusters = km_final.fit_predict(X)

    df["estrutura_blocos"] = [f"formato_{c + 1}" for c in clusters]

    dist = df["estrutura_blocos"].value_counts().to_dict()
    print("[02/BLOCO0] estrutura_blocos concluída.")
    print(f"    Distribuição: {dist}")

    return df


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 1 — SELEÇÃO DE COLUNAS
# ════════════════════════════════════════════════════════════════════════════


def selecionar_colunas_ouro(df: pd.DataFrame) -> pd.DataFrame:
    """
    Mantém apenas as colunas do CSV prata que vão pro ouro.
    Descarta identificadores, originais substituídas, métricas brutas
    e targets do modelo antigo (score_viral, label_viral).
    """
    colunas_ouro = [
        # Identidade
        "nicho",
        # Título
        "titulo_en",
        # Descrição
        "descricao_en",
        # Palavras-chave
        "palavras_chave_en",
        # Thumbnail
        "texto_thumbnail",
        "descricao_visual_thumb",
        # Roteiro
        "gancho_primeira_frase",
        "texto_falado_limpo_en",
        "vocabulario_falado",
        # Emojis
        "vibe_emojis",
        # Formato
        "faixa_duracao",
        "estrutura_blocos",
        "ritmo_palavras_seg",
        "densidade_roteiro",
        # Sentimento e repetição
        "sentimento_roteiro",
        "tem_repeticao_roteiro",
        # Áudio
        "tipo_audio_dominante",
        "pistas_audio_en",
        # SEO e engajamento
        "clickbait_score",
        "completude_seo",
        "taxa_conversao",
        "taxa_discussao",
        # Postagem
        "dia_postagem",
        "janela_postagem",
        "hora_postagem",
        "tem_dialogo",
    ]

    colunas_presentes = [c for c in colunas_ouro if c in df.columns]
    colunas_faltando = [c for c in colunas_ouro if c not in df.columns]

    if colunas_faltando:
        print(f"[02] AVISO: colunas ausentes no prata: {colunas_faltando}")

    return df[colunas_presentes]


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 2 — FEATURES DO TÍTULO
# ════════════════════════════════════════════════════════════════════════════


def extrair_formula_abertura_titulo(df: pd.DataFrame, nlp) -> pd.DataFrame:
    """
    Detecta se o título começa com pergunta, imperativo ou afirmação.
    Técnica: spaCy POS tagging + dependency parsing sobre titulo_en.
    Gera: titulo_formula_abertura (str: pergunta | imperativo | afirmacao)
    """

    def classificar(titulo):
        if pd.isna(titulo) or not str(titulo).strip():
            return "afirmacao"
        t = str(titulo).strip()
        doc = nlp(t)
        tokens = [tok for tok in doc if not tok.is_punct and not tok.is_space]
        if not tokens:
            return "afirmacao"
        primeiro = tokens[0]
        # Pergunta: começa com AUX, SCONJ, ou palavra interrogativa conhecida
        INTERROGATIVAS = {"why", "what", "how", "when", "where", "who", "which", "whose", "whom"}
        if primeiro.pos_ in ("AUX", "SCONJ") or primeiro.text.lower() in INTERROGATIVAS:
            return "pergunta"
        # Imperativo: primeiro token é VERB na forma base (VB) e é ROOT
        if primeiro.pos_ == "VERB" and primeiro.tag_ == "VB" and primeiro.dep_ == "ROOT":
            return "imperativo"
        return "afirmacao"

    df["titulo_formula_abertura"] = df["titulo_en"].apply(classificar)
    return df


def extrair_metricas_titulo(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extrai métricas estruturais do título:
    - comprimento em chars
    - intensidade de CAPS (% de palavras totalmente em maiúsculo)
    - score de impacto (0.0–1.0): combina pontuação !? com intensificadores lexicais
    Técnica: estatística descritiva + regex + léxico sobre titulo_en.
    Gera: titulo_comprimento, titulo_caps_intensidade, titulo_pontuacao_impacto
    """
    INTENSIFICADORES = {
        "never",
        "always",
        "incredible",
        "shocking",
        "worst",
        "best",
        "unbelievable",
        "insane",
        "absolutely",
        "literally",
        "extremely",
        "terrible",
        "amazing",
        "awful",
        "perfect",
        "horrible",
        "fantastic",
        "ridiculous",
        "impossible",
        "urgent",
        "critical",
        "insane",
        "crazy",
        "mindblowing",
        "viral",
        "exposed",
        "banned",
        "secret",
        "leaked",
    }

    def comprimento(titulo):
        if pd.isna(titulo):
            return 0
        return len(str(titulo).strip())

    def caps_intensidade(titulo):
        if pd.isna(titulo) or not str(titulo).strip():
            return 0.0
        palavras = str(titulo).strip().split()
        if not palavras:
            return 0.0
        caps = [p for p in palavras if p.isupper() and len(p) > 1]
        return round(len(caps) / len(palavras), 3)

    def pontuacao_impacto(titulo):
        if pd.isna(titulo) or not str(titulo).strip():
            return 0.0
        t = str(titulo).strip()
        score = 0.0
        # Pontuação de impacto: ! ou ?
        if re.search(r"[!?]", t):
            score += 0.5
        # Intensificadores lexicais
        tokens = re.findall(r"\b\w+\b", t.lower())
        acertos = sum(1 for tok in tokens if tok in INTENSIFICADORES)
        if acertos > 0:
            score += min(0.5, acertos * 0.25)
        return round(min(score, 1.0), 3)

    df["titulo_comprimento"] = df["titulo_en"].apply(comprimento)
    df["titulo_caps_intensidade"] = df["titulo_en"].apply(caps_intensidade)
    df["titulo_pontuacao_impacto"] = df["titulo_en"].apply(pontuacao_impacto)

    return df


def extrair_sentimento_titulo(df: pd.DataFrame, sentiment_pipe) -> pd.DataFrame:
    """
    Calcula sentimento do título usando cardiffnlp/twitter-roberta-base-sentiment-latest.
    Modelo treinado em texto informal de redes sociais — mais adequado que VADER
    para títulos de YouTube Shorts.
    Técnica: transformers pipeline sobre titulo_en.
    Gera: titulo_sentimento (str: positivo | neutro | negativo)
    """
    LABEL_MAP = {
        "positive": "positivo",
        "neutral": "neutro",
        "negative": "negativo",
    }

    def classificar(titulo):
        if pd.isna(titulo) or not str(titulo).strip():
            return "neutro"
        t = str(titulo).strip()
        # Preprocessamento recomendado pelo cardiffnlp: substitui URLs e mentions
        t = re.sub(r"http\S+", "http", t)
        t = re.sub(r"@\w+", "@user", t)
        try:
            resultado = sentiment_pipe(t[:512], truncation=True)[0]
            label = resultado["label"].lower()
            return LABEL_MAP.get(label, "neutro")
        except Exception:
            return "neutro"

    df["titulo_sentimento"] = df["titulo_en"].apply(classificar)
    return df


def extrair_emojis_titulo(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extrai quais emojis aparecem no título e em que posição (início, meio, fim).
    Técnica: biblioteca emoji + análise posicional sobre titulo_en.
    Gera: titulo_emojis_posicao (list de dicts com emoji e posição)
    """

    def extrair(titulo):
        if pd.isna(titulo) or not str(titulo).strip():
            return []
        t = str(titulo).strip()
        tokens = list(t)
        total = len(tokens)
        resultado = []
        for i, char in enumerate(tokens):
            if char in emoji.EMOJI_DATA:
                posicao_relativa = i / total
                if posicao_relativa <= 0.2:
                    posicao = "inicio"
                elif posicao_relativa >= 0.8:
                    posicao = "fim"
                else:
                    posicao = "meio"
                resultado.append({"emoji": char, "posicao": posicao})
        return resultado

    df["titulo_emojis_posicao"] = df["titulo_en"].apply(extrair)
    return df


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 3 — FEATURES DA DESCRIÇÃO
# ════════════════════════════════════════════════════════════════════════════


def extrair_metricas_descricao(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extrai métricas estruturais da descrição:
    - comprimento total em chars
    - comprimento da primeira linha em chars
    - presença de links (booleano)
    Técnica: estatística descritiva + regex sobre descricao_en.
    Gera: descricao_comprimento, descricao_primeira_linha_comprimento, descricao_tem_link
    """

    def comprimento_total(descricao):
        if pd.isna(descricao):
            return 0
        return len(str(descricao).strip())

    def comprimento_primeira_linha(descricao):
        if pd.isna(descricao) or not str(descricao).strip():
            return 0
        primeira_linha = str(descricao).strip().split("\n")[0]
        return len(primeira_linha)

    def tem_link(descricao):
        if pd.isna(descricao):
            return False
        return bool(re.search(r"https?://\S+", str(descricao)))

    df["descricao_comprimento"] = df["descricao_en"].apply(comprimento_total)
    df["descricao_primeira_linha_comprimento"] = df["descricao_en"].apply(comprimento_primeira_linha)
    df["descricao_tem_link"] = df["descricao_en"].apply(tem_link)

    return df


def extrair_sentimento_descricao(df: pd.DataFrame, sentiment_pipe) -> pd.DataFrame:
    """
    Calcula sentimento da primeira linha da descrição usando
    cardiffnlp/twitter-roberta-base-sentiment-latest.
    A primeira linha é o hook do "ver mais" — mais relevante que o corpo todo.
    Reutiliza o mesmo sentiment_pipe carregado no bloco 2.
    Técnica: transformers pipeline sobre primeira linha de descricao_en.
    Gera: descricao_primeira_linha_sentimento (str: positivo | neutro | negativo)
    """
    LABEL_MAP = {
        "positive": "positivo",
        "neutral": "neutro",
        "negative": "negativo",
    }

    def classificar(descricao):
        if pd.isna(descricao) or not str(descricao).strip():
            return "neutro"
        primeira_linha = str(descricao).strip().split("\n")[0]
        if not primeira_linha.strip():
            return "neutro"
        t = re.sub(r"http\S+", "http", primeira_linha)
        t = re.sub(r"@\w+", "@user", t)
        try:
            resultado = sentiment_pipe(t[:512], truncation=True)[0]
            label = resultado["label"].lower()
            return LABEL_MAP.get(label, "neutro")
        except Exception:
            return "neutro"

    df["descricao_primeira_linha_sentimento"] = df["descricao_en"].apply(classificar)
    return df


def extrair_cta_descricao(df: pd.DataFrame, nlp) -> pd.DataFrame:
    """
    Detecta presença, posição e intensidade do CTA na descrição.
    Posição: início (primeiros 20%), meio ou fim do texto.
    Intensidade: score numérico 0.0–1.0 + label (ausente | suave | moderado | direto).
    Técnica: spaCy POS tagging pra detectar verbos no imperativo +
             regex como fallback + léxico de urgência sobre descricao_en.
    Gera: descricao_cta_posicao, descricao_cta_intensidade
    """
    PADRAO_CTA = re.compile(
        r"\b(subscribe|follow|like|comment|share|click|check out|visit|buy|get|download|"
        r"sign up|join|register|watch|see|learn more|find out|tap|swipe|link in bio|"
        r"turn on|hit the bell|notify|save|bookmark|tag|dm|contact|order|shop)\b",
        re.IGNORECASE,
    )

    URGENCIA = {
        "now",
        "today",
        "limited",
        "only",
        "don't miss",
        "hurry",
        "last chance",
        "immediately",
        "exclusive",
        "free",
        "instant",
    }

    def _detectar_verbos_cta_spacy(texto: str, doc) -> list:
        """Detecta verbos no imperativo via spaCy (VB + ROOT ou dobj/advmod)."""
        verbos = []
        for token in doc:
            if token.tag_ == "VB" and token.dep_ in ("ROOT", "conj"):
                verbos.append(token.text.lower())
        return verbos

    def detectar_posicao(descricao):
        if pd.isna(descricao) or not str(descricao).strip():
            return "ausente"
        t = str(descricao).strip()
        doc = nlp(t[:1000])  # limita pra performance
        verbos_spacy = _detectar_verbos_cta_spacy(t, doc)
        # Tenta posição via spaCy primeiro
        if verbos_spacy:
            for token in doc:
                if token.text.lower() in verbos_spacy:
                    posicao_relativa = token.idx / len(t)
                    if posicao_relativa <= 0.2:
                        return "inicio"
                    if posicao_relativa >= 0.8:
                        return "fim"
                    return "meio"
        # Fallback: regex
        match = PADRAO_CTA.search(t)
        if not match:
            return "ausente"
        posicao_relativa = match.start() / len(t)
        if posicao_relativa <= 0.2:
            return "inicio"
        if posicao_relativa >= 0.8:
            return "fim"
        return "meio"

    def detectar_intensidade(descricao):
        if pd.isna(descricao) or not str(descricao).strip():
            return "ausente", 0.0
        t = str(descricao).strip()
        doc = nlp(t[:1000])
        verbos_spacy = _detectar_verbos_cta_spacy(t, doc)
        matches_regex = PADRAO_CTA.findall(t)
        # Une os dois
        todos_verbos = set(verbos_spacy) | set(m.lower() for m in matches_regex)
        if not todos_verbos:
            return "ausente", 0.0
        t_lower = t.lower()
        tem_urgencia = any(u in t_lower for u in URGENCIA)
        qtd_verbos = len(todos_verbos)
        # Score numérico
        score = min(1.0, (qtd_verbos * 0.2) + (0.3 if tem_urgencia else 0.0))
        # Label
        if qtd_verbos >= 3 or (qtd_verbos >= 2 and tem_urgencia):
            label = "direto"
        elif qtd_verbos == 2 or tem_urgencia:
            label = "moderado"
        else:
            label = "suave"
        return label, round(score, 3)

    posicoes = df["descricao_en"].apply(detectar_posicao)
    intensidades = df["descricao_en"].apply(detectar_intensidade)

    df["descricao_cta_posicao"] = posicoes
    df["descricao_cta_intensidade"] = intensidades.apply(lambda x: x[0])
    df["descricao_cta_score"] = intensidades.apply(lambda x: x[1])

    return df


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 4 — FEATURES DA THUMBNAIL
# ════════════════════════════════════════════════════════════════════════════


def extrair_metricas_thumbnail(df: pd.DataFrame, nlp, sentiment_pipe) -> pd.DataFrame:
    """
    Extrai métricas do texto da thumbnail e da cena visual:
    - intensidade de CAPS no texto da capa
    - sentimento visual (cardiffnlp/twitter-roberta sobre descricao_visual_thumb)
    - presença de pessoa na cena (spaCy NER + POS + regex fallback)
    Técnica: regex + spaCy NER + transformers pipeline sobre
             texto_thumbnail e descricao_visual_thumb.
    Gera: thumbnail_caps_intensidade, thumbnail_sentimento_visual, thumbnail_tem_pessoa
    """
    LABEL_MAP = {
        "positive": "positivo",
        "neutral": "neutro",
        "negative": "negativo",
    }

    PALAVRAS_PESSOA = {
        "person",
        "man",
        "woman",
        "boy",
        "girl",
        "child",
        "kid",
        "baby",
        "face",
        "people",
        "human",
        "guy",
        "lady",
        "male",
        "female",
        "teen",
        "adult",
        "elder",
        "crowd",
        "group",
        "couple",
        "family",
    }

    def caps_intensidade(texto):
        if pd.isna(texto) or not str(texto).strip():
            return 0.0
        palavras = str(texto).strip().split()
        if not palavras:
            return 0.0
        caps = [p for p in palavras if p.isupper() and len(p) > 1]
        return round(len(caps) / len(palavras), 3)

    def sentimento_visual(descricao_visual):
        if pd.isna(descricao_visual) or not str(descricao_visual).strip():
            return "neutro"
        t = str(descricao_visual).strip()
        t = re.sub(r"http\S+", "http", t)
        t = re.sub(r"@\w+", "@user", t)
        try:
            resultado = sentiment_pipe(t[:512], truncation=True)[0]
            label = resultado["label"].lower()
            return LABEL_MAP.get(label, "neutro")
        except Exception:
            return "neutro"

    def tem_pessoa(descricao_visual):
        if pd.isna(descricao_visual) or not str(descricao_visual).strip():
            return False
        t = str(descricao_visual).strip()
        doc = nlp(t[:1000])
        # spaCy NER: entidade PERSON detectada
        if any(ent.label_ == "PERSON" for ent in doc.ents):
            return True
        # spaCy POS: NOUN que está na lista de palavras de pessoa
        if any(token.pos_ == "NOUN" and token.text.lower() in PALAVRAS_PESSOA for token in doc):
            return True
        # Fallback: regex
        padrao = re.compile(
            r"\b(" + "|".join(PALAVRAS_PESSOA) + r")\b",
            re.IGNORECASE,
        )
        return bool(padrao.search(t))

    df["thumbnail_caps_intensidade"] = df["texto_thumbnail"].apply(caps_intensidade)
    df["thumbnail_sentimento_visual"] = df["descricao_visual_thumb"].apply(sentimento_visual)
    df["thumbnail_tem_pessoa"] = df["descricao_visual_thumb"].apply(tem_pessoa)

    return df


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 5 — FEATURES DO GANCHO
# ════════════════════════════════════════════════════════════════════════════


def extrair_metricas_gancho(df: pd.DataFrame, nlp, sentiment_pipe) -> pd.DataFrame:
    """
    Extrai métricas do gancho (primeira frase do roteiro):
    - fórmula de abertura (pergunta | imperativo | afirmacao) via spaCy
    - comprimento em palavras
    - sentimento via cardiffnlp/twitter-roberta-base-sentiment-latest
    - score de impacto emocional via NRCLex + pontuação !?
    Técnica: spaCy POS+dep parsing + transformers pipeline + NRCLex
             sobre gancho_primeira_frase.
    Gera: gancho_formula_abertura, gancho_comprimento,
          gancho_sentimento, gancho_pontuacao_impacto
    """

    LABEL_MAP = {
        "positive": "positivo",
        "neutral": "neutro",
        "negative": "negativo",
    }

    INTERROGATIVAS = {
        "why",
        "what",
        "how",
        "when",
        "where",
        "who",
        "which",
        "whose",
        "whom",
    }

    # Emoções de alta intensidade no NRCLex que indicam impacto
    EMOCOES_IMPACTO = {"fear", "anger", "surprise", "anticipation", "disgust"}

    def formula_abertura(gancho):
        if pd.isna(gancho) or not str(gancho).strip():
            return "afirmacao"
        t = str(gancho).strip()
        doc = nlp(t)
        tokens = [tok for tok in doc if not tok.is_punct and not tok.is_space]
        if not tokens:
            return "afirmacao"
        primeiro = tokens[0]
        if primeiro.pos_ in ("AUX", "SCONJ") or primeiro.text.lower() in INTERROGATIVAS:
            return "pergunta"
        if primeiro.pos_ == "VERB" and primeiro.tag_ == "VB" and primeiro.dep_ == "ROOT":
            return "imperativo"
        return "afirmacao"

    def comprimento(gancho):
        if pd.isna(gancho) or not str(gancho).strip():
            return 0
        return len(str(gancho).strip().split())

    def sentimento(gancho):
        if pd.isna(gancho) or not str(gancho).strip():
            return "neutro"
        t = str(gancho).strip()
        t = re.sub(r"http\S+", "http", t)
        t = re.sub(r"@\w+", "@user", t)
        try:
            resultado = sentiment_pipe(t[:512], truncation=True)[0]
            label = resultado["label"].lower()
            return LABEL_MAP.get(label, "neutro")
        except Exception:
            return "neutro"

    def pontuacao_impacto(gancho):
        if pd.isna(gancho) or not str(gancho).strip():
            return 0.0
        t = str(gancho).strip()
        score = 0.0

        # Pontuação !?
        if re.search(r"[!?]", t):
            score += 0.3

        # NRCLex — intensidade emocional
        try:
            nrc = NRCLex(t)
            freq = nrc.affect_frequencies
            # Soma as frequências das emoções de impacto
            impacto_emocional = sum(freq.get(emocao, 0.0) for emocao in EMOCOES_IMPACTO)
            score += min(0.7, impacto_emocional)
        except Exception:
            pass

        return round(min(score, 1.0), 3)

    df["gancho_formula_abertura"] = df["gancho_primeira_frase"].apply(formula_abertura)
    df["gancho_comprimento"] = df["gancho_primeira_frase"].apply(comprimento)
    df["gancho_sentimento"] = df["gancho_primeira_frase"].apply(sentimento)
    df["gancho_pontuacao_impacto"] = df["gancho_primeira_frase"].apply(pontuacao_impacto)

    return df


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 6 — FEATURES DE RITMO E LINGUAGEM
# ════════════════════════════════════════════════════════════════════════════


def extrair_metricas_ritmo(df: pd.DataFrame, nlp) -> pd.DataFrame:
    """
    Extrai métricas de ritmo e linguagem do roteiro:
    - comprimento médio real de sentenças (spaCy sentence segmentation)
    - variância real do comprimento entre sentenças
    - densidade de impacto emocional (NRCLex: fear, anger, surprise, anticipation)
    Técnica: spaCy sentence segmentation + NRCLex
             sobre texto_falado_limpo_en.
    Gera: comprimento_medio_frase, variancia_ritmo, densidade_pontuacao_impacto
    """

    EMOCOES_IMPACTO = {"fear", "anger", "surprise", "anticipation", "disgust"}

    # Adiciona o componente TextDescriptives ao pipeline spaCy uma única vez
    if "textdescriptives/descriptive_stats" not in nlp.pipe_names:
        nlp.add_pipe("textdescriptives/descriptive_stats")

    def calcular_ritmo(texto):
        """
        Retorna (comprimento_medio, variancia_ritmo) usando
        spaCy sentence segmentation + TextDescriptives.
        """
        if pd.isna(texto) or not str(texto).strip():
            return 0.0, 0.0

        t = str(texto).strip()
        doc = nlp(t[:5000])  # limita pra performance

        # Comprimentos reais das sentenças em tokens
        comprimentos = [len([tok for tok in sent if not tok.is_punct and not tok.is_space]) for sent in doc.sents]

        if not comprimentos:
            return 0.0, 0.0

        medio = round(float(np.mean(comprimentos)), 3)
        variancia = round(float(np.var(comprimentos)), 3)

        return medio, variancia

    def calcular_densidade_impacto(texto):
        """
        Retorna densidade de impacto emocional via NRCLex
        (fear, anger, surprise, anticipation, disgust) normalizada 0.0–1.0.
        """
        if pd.isna(texto) or not str(texto).strip():
            return 0.0
        try:
            nrc = NRCLex(str(texto).strip())
            freq = nrc.affect_frequencies
            impacto = sum(freq.get(e, 0.0) for e in EMOCOES_IMPACTO)
            return round(min(impacto, 1.0), 3)
        except Exception:
            return 0.0

    ritmos = df["texto_falado_limpo_en"].apply(calcular_ritmo)
    df["comprimento_medio_frase"] = ritmos.apply(lambda x: x[0])
    df["variancia_ritmo"] = ritmos.apply(lambda x: x[1])
    df["densidade_pontuacao_impacto"] = df["texto_falado_limpo_en"].apply(calcular_densidade_impacto)

    return df


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 7 — FEATURES DO ARCO EMOCIONAL
# ════════════════════════════════════════════════════════════════════════════


def extrair_arco_emocional(df: pd.DataFrame, sentiment_pipe) -> pd.DataFrame:
    """
    Calcula sentimento por terço do roteiro (início 0-20%, meio 20-80%, fim 80-100%).
    Captura a progressão emocional do vídeo — padrão mais relevante que sentimento global.
    Técnica: segmentação por proporção de tokens + cardiffnlp/twitter-roberta
             sobre texto_falado_limpo_en.
    Gera: sentimento_inicio, sentimento_meio, sentimento_fim
    """
    LABEL_MAP = {
        "positive": "positivo",
        "neutral": "neutro",
        "negative": "negativo",
    }

    def classificar(texto):
        if pd.isna(texto) or not str(texto).strip():
            return "neutro"
        t = str(texto).strip()
        t = re.sub(r"http\S+", "http", t)
        t = re.sub(r"@\w+", "@user", t)
        try:
            resultado = sentiment_pipe(t[:512], truncation=True)[0]
            label = resultado["label"].lower()
            return LABEL_MAP.get(label, "neutro")
        except Exception:
            return "neutro"

    def calcular_arco(texto):
        if pd.isna(texto) or not str(texto).strip():
            return "neutro", "neutro", "neutro"

        tokens = str(texto).strip().split()
        n = len(tokens)

        if n == 0:
            return "neutro", "neutro", "neutro"

        segmento_inicio = " ".join(tokens[: int(n * 0.2)])
        segmento_meio = " ".join(tokens[int(n * 0.2) : int(n * 0.8)])
        segmento_fim = " ".join(tokens[int(n * 0.8) :])

        return (
            classificar(segmento_inicio) if segmento_inicio else "neutro",
            classificar(segmento_meio) if segmento_meio else "neutro",
            classificar(segmento_fim) if segmento_fim else "neutro",
        )

    resultados = df["texto_falado_limpo_en"].apply(calcular_arco)
    df["sentimento_inicio"] = resultados.apply(lambda x: x[0])
    df["sentimento_meio"] = resultados.apply(lambda x: x[1])
    df["sentimento_fim"] = resultados.apply(lambda x: x[2])

    return df


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 8 — FEATURES DE PALAVRAS-CHAVE
# ════════════════════════════════════════════════════════════════════════════


def extrair_metricas_palavras_chave(df: pd.DataFrame) -> pd.DataFrame:
    """
    Classifica os termos de palavras_chave_en em short-tail (1 palavra),
    mid-tail (2 palavras) e long-tail (3+ palavras).
    Calcula proporção entre os três grupos.
    Técnica: contagem por número de palavras por termo.
    Gera: palavras_chave_shorttail, palavras_chave_midtail,
          palavras_chave_longtail, palavras_chave_proporcao
    """

    def classificar(palavras_chave):
        if pd.isna(palavras_chave) or not str(palavras_chave).strip():
            return [], [], [], {"shorttail": 0.0, "midtail": 0.0, "longtail": 0.0}

        termos = [t.strip() for t in str(palavras_chave).split(",") if t.strip()]

        shorttail = [t for t in termos if len(t.split()) == 1]
        midtail = [t for t in termos if len(t.split()) == 2]
        longtail = [t for t in termos if len(t.split()) >= 3]

        total = len(termos)
        if total == 0:
            proporcao = {"shorttail": 0.0, "midtail": 0.0, "longtail": 0.0}
        else:
            proporcao = {
                "shorttail": round(len(shorttail) / total, 3),
                "midtail": round(len(midtail) / total, 3),
                "longtail": round(len(longtail) / total, 3),
            }

        return shorttail, midtail, longtail, proporcao

    resultados = df["palavras_chave_en"].apply(classificar)
    df["palavras_chave_shorttail"] = resultados.apply(lambda x: x[0])
    df["palavras_chave_midtail"] = resultados.apply(lambda x: x[1])
    df["palavras_chave_longtail"] = resultados.apply(lambda x: x[2])
    df["palavras_chave_proporcao"] = resultados.apply(lambda x: x[3])

    return df


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 9 — FEATURES DE VOCABULÁRIO E CO-OCORRÊNCIA
# ════════════════════════════════════════════════════════════════════════════


def extrair_ngramas_roteiro(df: pd.DataFrame, nlp) -> pd.DataFrame:
    """
    Extrai bigrams e trigrams mais relevantes do roteiro por vídeo.
    Técnica: spacy-ngram como componente do pipeline spaCy — extrai n-gramas
    via lemmatização com filtragem automática de stopwords e pontuação,
    mais preciso que TF-IDF puro sobre tokens brutos.
    Gera: ngramas_roteiro (lista dos top n-gramas do vídeo)
    """

    if "spacy-ngram" not in nlp.pipe_names:
        nlp.add_pipe(
            "spacy-ngram",
            config={
                "ngrams": (2, 3),
                "doc_level": True,
            },
        )

    def extrair(texto):
        if pd.isna(texto) or not str(texto).strip():
            return []
        t = str(texto).strip()
        try:
            doc = nlp(t[:5000])  # limita pra performance
            bigrams = list(doc._.ngram_2) if hasattr(doc._, "ngram_2") else []
            trigrams = list(doc._.ngram_3) if hasattr(doc._, "ngram_3") else []
            todos = bigrams + trigrams
            # Conta frequência e retorna top 10
            contagem = Counter(todos)
            return [ngrama for ngrama, _ in contagem.most_common(10)]
        except Exception:
            return []

    df["ngramas_roteiro"] = df["texto_falado_limpo_en"].apply(extrair)
    return df


def extrair_coocorrencias_roteiro(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extrai pares de termos que co-ocorrem no mesmo roteiro.
    Identifica combinações obrigatórias de vocabulário do nicho.
    Técnica: contagem de co-ocorrências sobre tokens de texto_falado_limpo_en
    com janela de co-ocorrência fixa de 5 tokens.
    Gera: coocorrencias_roteiro (lista de pares mais frequentes)
    """
    stop_words = set(stopwords.words("english"))

    def extrair_pares(texto, janela=5, top_n=10):
        if pd.isna(texto) or not str(texto).strip():
            return []

        tokens = [t for t in re.findall(r"\b[a-z]{3,}\b", str(texto).lower()) if t not in stop_words]

        if len(tokens) < 2:
            return []

        pares = Counter()
        for i, token in enumerate(tokens):
            for j in range(i + 1, min(i + janela + 1, len(tokens))):
                if token == tokens[j]:
                    continue
                par = tuple(sorted([token, tokens[j]]))
                pares[par] += 1

        return [list(par) for par, _ in pares.most_common(top_n)]

    df["coocorrencias_roteiro"] = df["texto_falado_limpo_en"].apply(extrair_pares)
    return df


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 10 — SALVAR CSV OURO
# ════════════════════════════════════════════════════════════════════════════


def salvar_e_subir_ouro(df: pd.DataFrame) -> None:
    """
    Salva o CSV ouro localmente e sobe pro Supabase.
    O ouro contém todas as colunas selecionadas do prata
    mais todas as features novas criadas neste script.
    """
    subir_csv_ouro(df)
    print(f"[02] CSV ouro salvo e enviado ao Supabase ({len(df)} linhas, {len(df.columns)} colunas).")


# ════════════════════════════════════════════════════════════════════════════
# MAESTRO
# ════════════════════════════════════════════════════════════════════════════


def maestro_pre_processa() -> None:
    """
    Orquestra a execução sequencial de todos os blocos:
    1. Baixa CSV prata do Supabase
    2. Seleciona colunas que vão pro ouro
    3. Cria features do título (bloco 2)
    4. Cria features da descrição (bloco 3)
    5. Cria features da thumbnail (bloco 4)
    6. Cria features do gancho (bloco 5)
    7. Cria features de ritmo e linguagem (bloco 6)
    8. Cria features do arco emocional (bloco 7)
    9. Cria features de palavras-chave (bloco 8)
    10. Cria features de vocabulário e co-ocorrência (bloco 9)
    11. Salva e sobe CSV ouro
    """
    nltk.download("stopwords", quiet=True)

    nlp_spacy = spacy.load("en_core_web_sm")
    sentiment_pipe = hf_pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment-latest", truncation=True)

    print("[02] Baixando CSV prata...")
    df = baixar_csv_prata()
    if df.empty:
        print("[02] ERRO: CSV prata vazio ou não encontrado.")
        return

    print("[02] Reprocessando colunas do bloco 0...")
    df = reprocessar_texto_falado(df)
    df = reprocessar_textos_principais(df)
    df = reprocessar_features_texto_falado(df)
    df = reprocessar_features_engajamento(df)
    df = reprocessar_estrutura_blocos(df)

    print("[02] Selecionando colunas ouro...")
    df = selecionar_colunas_ouro(df)

    print("[02] Extraindo features do título...")
    df = extrair_formula_abertura_titulo(df, nlp_spacy)
    df = extrair_metricas_titulo(df)
    df = extrair_sentimento_titulo(df, sentiment_pipe)
    df = extrair_emojis_titulo(df)

    print("[02] Extraindo features da descrição...")
    df = extrair_metricas_descricao(df)
    df = extrair_sentimento_descricao(df, sentiment_pipe)
    df = extrair_cta_descricao(df, nlp_spacy)

    print("[02] Extraindo features da thumbnail...")
    df = extrair_metricas_thumbnail(df, nlp_spacy, sentiment_pipe)

    print("[02] Extraindo features do gancho...")
    df = extrair_metricas_gancho(df, nlp_spacy, sentiment_pipe)

    print("[02] Extraindo features de ritmo e linguagem...")
    df = extrair_metricas_ritmo(df, nlp_spacy)

    print("[02] Extraindo arco emocional...")
    df = extrair_arco_emocional(df, sentiment_pipe)

    print("[02] Extraindo features de palavras-chave...")
    df = extrair_metricas_palavras_chave(df)

    print("[02] Extraindo n-gramas do roteiro...")
    df = extrair_ngramas_roteiro(df, nlp_spacy)

    print("[02] Extraindo co-ocorrências do roteiro...")
    df = extrair_coocorrencias_roteiro(df)

    print("[02] Salvando e subindo CSV ouro...")
    salvar_e_subir_ouro(df)

    print("[02] Concluído.")


if __name__ == "__main__":
    maestro_pre_processa()
