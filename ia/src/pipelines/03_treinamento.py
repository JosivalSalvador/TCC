import json
import os
import pickle
import re
from collections import Counter

import nltk
import numpy as np
import pandas as pd
from nltk.sentiment import SentimentIntensityAnalyzer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

from src.core.supabase_client import BASE_DIR, baixar_csv_ouro

# ── Caminhos ────────────────────────────────────────────────────────────────
PASTA_PREPROCESSORS = os.path.join(BASE_DIR, "models", "preprocessors")
PASTA_PREDICTORS = os.path.join(BASE_DIR, "models", "predictors")
PASTA_PADROES = os.path.join(BASE_DIR, "models", "padroes_virais")

os.makedirs(PASTA_PREPROCESSORS, exist_ok=True)
os.makedirs(PASTA_PREDICTORS, exist_ok=True)
os.makedirs(PASTA_PADROES, exist_ok=True)

# ── Stopwords ────────────────────────────────────────────────────────────────
try:
    from nltk.corpus import stopwords

    _STOPWORDS = set(stopwords.words("english"))
except LookupError:
    nltk.download("stopwords", quiet=True)
    from nltk.corpus import stopwords

    _STOPWORDS = set(stopwords.words("english"))


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 1 — PREPARAÇÃO DOS DADOS PARA TREINO
# ════════════════════════════════════════════════════════════════════════════


def separar_features_e_target(caminho_matriz_pkl: str):
    """
    Carrega a matriz numérica já vetorizada (matriz_ml.pkl, gerado pelo 02)
    e separa X (features numéricas) e y (targets) para o treino.
    """
    with open(caminho_matriz_pkl, "rb") as f:
        dados = pickle.load(f)

    X = dados["X"]
    y = dados["y"]

    print(" Bloco 1 | separar_features_e_target concluído")
    print(f"   Features (X) : {X.shape[1]} colunas (matriz esparsa numérica)")
    print(f"   Targets  (y) : {list(y.columns)}")

    return X, y


def split_treino_teste(X, y):
    """
    Divide os dados em treino e teste estratificado por label_viral,
    garantindo que todos os níveis estejam representados nos dois conjuntos.
    """
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y["label_viral"],
    )

    print(" Bloco 1 | split_treino_teste concluído")
    print(f"   Treino : {X_train.shape[0]} linhas ({X_train.shape[0] / X.shape[0] * 100:.1f}%)")
    print(f"   Teste  : {X_test.shape[0]} linhas ({X_test.shape[0] / X.shape[0] * 100:.1f}%)")
    print("   Distribuição treino:")
    for label, count in y_train["label_viral"].value_counts().items():
        print(f"     {label:<15}: {count}")

    return X_train, X_test, y_train, y_test


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 2 — TREINAMENTO DO MODELO
# ════════════════════════════════════════════════════════════════════════════


def treinar_modelo(X_train, y_train):
    """
    Treina XGBoost para classificação multiclasse
    (frio, aquecido, viral, super_viral).
    Salva label_encoder.pkl para decodificar previsões no endpoint.
    """
    le = LabelEncoder()
    y_encoded = le.fit_transform(y_train["label_viral"])

    caminho_le = os.path.join(PASTA_PREPROCESSORS, "label_encoder.pkl")
    with open(caminho_le, "wb") as f:
        pickle.dump(le, f)

    modelo = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1,
    )

    modelo.fit(X_train, y_encoded)

    print(" Bloco 2 | treinar_modelo concluído")
    print("   Algoritmo  : XGBClassifier")
    print(f"   Classes    : {list(le.classes_)}")
    print(f"   Features   : {X_train.shape[1]}")

    return modelo, le


def avaliar_modelo(modelo, le, X_test, y_test) -> dict:
    """
    Avalia o modelo no conjunto de teste.
    Retorna accuracy, f1 por classe e matriz de confusão.
    """
    y_encoded = le.transform(y_test["label_viral"])
    y_pred = modelo.predict(X_test)

    accuracy = accuracy_score(y_encoded, y_pred)
    f1 = f1_score(y_encoded, y_pred, average=None)
    matriz_confusao = confusion_matrix(y_encoded, y_pred)

    print(" Bloco 2 | avaliar_modelo concluído")
    print(f"   Accuracy : {accuracy:.4f}")
    print("\n   Classification Report:")
    print(classification_report(y_encoded, y_pred, target_names=le.classes_))
    print("   Matriz de Confusão:")
    print(matriz_confusao)

    metricas = {
        "accuracy": accuracy,
        "f1_por_classe": dict(zip(le.classes_, f1.tolist())),
        "matriz_confusao": matriz_confusao.tolist(),
    }

    return metricas


def salvar_modelo(modelo, metricas: dict) -> None:
    """
    Salva o modelo treinado e as métricas de avaliação.
    """
    caminho_modelo = os.path.join(PASTA_PREDICTORS, "motor_modelo.pkl")
    with open(caminho_modelo, "wb") as f:
        pickle.dump(modelo, f)

    caminho_metricas = os.path.join(PASTA_PREDICTORS, "motor_modelo_metricas.json")
    with open(caminho_metricas, "w", encoding="utf-8") as f:
        json.dump(metricas, f, ensure_ascii=False, indent=2)

    print(" Bloco 2 | salvar_modelo concluído")
    print(f"   motor_modelo.pkl salvo em     : {caminho_modelo}")
    print(f"   motor_modelo_metricas.json em : {caminho_metricas}")


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 3 — EXTRAÇÃO DE PADRÕES DOS SUPER_VIRAL POR NICHO
# ════════════════════════════════════════════════════════════════════════════


def extrair_padroes_estrutura(df_super: pd.DataFrame, df_frio: pd.DataFrame, nicho: str) -> dict:
    """
    Extrai padrões de estrutura/formato dos super_viral do nicho.
    Recebe df_frio para gerar contraste.

    Extrai:
    - faixa_duracao dominante
    - estrutura_blocos dominante
    - ritmo_palavras_seg mediana
    - densidade_roteiro mediana
    - sentimento_roteiro dominante
    - hora_postagem mediana
    - top 3 slots de postagem (dia × janela)
    - tem_repeticao_roteiro (ativar regra 5x se > 30%)
    - tipo_audio_dominante
    - clickbait_score mediana
    - velocidade_views mediana — proxy de hype do nicho
    - taxa_conversao mediana — qualidade do CTA
    - taxa_discussao mediana — potencial de debate
    - completude_seo mediana — nível de otimização técnica
    - faixa_duracao_evitar — contraste com frio
    - sentimento_evitar — contraste com frio (None se igual ao dominante)
    """

    def dominante(serie):
        serie_limpa = serie.dropna()
        return serie_limpa.value_counts().index[0] if not serie_limpa.empty else None

    def top3_slots(df):
        if "dia_postagem" not in df.columns or "janela_postagem" not in df.columns:
            return []
        slots = df.groupby(["dia_postagem", "janela_postagem"]).size()
        slots = slots.sort_values(ascending=False).head(3)
        return [{"dia": d, "janela": j, "qtd": int(c)} for (d, j), c in slots.items()]

    def mediana_segura(df, col):
        if col not in df.columns:
            return None
        serie = pd.to_numeric(df[col], errors="coerce").dropna()
        return round(float(serie.median()), 3) if not serie.empty else None

    sentimento_dominante = dominante(df_super["sentimento_roteiro"]) if "sentimento_roteiro" in df_super.columns else None
    sentimento_frio = dominante(df_frio["sentimento_roteiro"]) if "sentimento_roteiro" in df_frio.columns and not df_frio.empty else None
    sentimento_evitar = sentimento_frio if sentimento_frio != sentimento_dominante else None

    faixa_evitar = dominante(df_frio["faixa_duracao"]) if "faixa_duracao" in df_frio.columns and not df_frio.empty else None
    faixa_dominante = dominante(df_super["faixa_duracao"]) if "faixa_duracao" in df_super.columns else None
    faixa_evitar = faixa_evitar if faixa_evitar != faixa_dominante else None

    padroes = {
        "faixa_duracao_dominante": faixa_dominante,
        "estrutura_blocos_dominante": dominante(df_super["estrutura_blocos"]) if "estrutura_blocos" in df_super.columns else None,
        "ritmo_palavras_seg_mediana": mediana_segura(df_super, "ritmo_palavras_seg"),
        "densidade_roteiro_mediana": int(df_super["densidade_roteiro"].median()) if "densidade_roteiro" in df_super.columns else None,
        "sentimento_dominante": sentimento_dominante,
        "hora_postagem_mediana": mediana_segura(df_super, "hora_postagem"),
        "top3_slots_postagem": top3_slots(df_super),
        "ativar_repeticao_5x": bool(df_super["tem_repeticao_roteiro"].mean() > 0.30) if "tem_repeticao_roteiro" in df_super.columns else False,
        "tipo_audio_dominante": dominante(df_super["tipo_audio_dominante"]) if "tipo_audio_dominante" in df_super.columns else None,
        "clickbait_score_mediana": mediana_segura(df_super, "clickbait_score"),
        "velocidade_views_mediana": mediana_segura(df_super, "velocidade_views"),
        "taxa_conversao_mediana": mediana_segura(df_super, "taxa_conversao"),
        "taxa_discussao_mediana": mediana_segura(df_super, "taxa_discussao"),
        "completude_seo_mediana": mediana_segura(df_super, "completude_seo"),
        # Contraste com frio
        "faixa_duracao_evitar": faixa_evitar,
        "sentimento_evitar": sentimento_evitar,
    }

    print(f"   [{nicho}] extrair_padroes_estrutura concluído")

    return padroes


def extrair_padroes_textuais(df_super: pd.DataFrame, df_frio: pd.DataFrame, nicho: str) -> dict:
    """
    Extrai padrões textuais dos super_viral para mastigar o roteiro da LLM.
    Recebe df_frio para gerar lista de termos a evitar.

    Extrai:
    - termos_gancho_usar          : TF-IDF exclusivo super_viral em gancho_primeira_frase
    - termos_vocabulario          : TF-IDF dominante em vocabulario_falado
    - termos_seo_usar             : TF-IDF exclusivo super_viral em palavras_chave_en
    - ngramas_roteiro             : TF-IDF dominante em texto_falado_limpo_en
    - termos_descricao_usar       : TF-IDF exclusivo super_viral em descricao_en
    - emojis_usar                 : top 5 emojis mais frequentes nos super_viral
    - emojis_evitar               : top 5 emojis exclusivos dos frio
    - arco_emocional              : sentimento VADER por terço do roteiro
    - vocabulario_por_terco       : top termos TF-IDF de cada terço do roteiro
    - exemplos_ganchos            : exemplos reais de gancho_primeira_frase
    - exemplos_titulos            : exemplos reais de titulo_en
    - termos_gancho_evitar        : TF-IDF exclusivo frio em gancho_primeira_frase
    - termos_roteiro_evitar       : TF-IDF exclusivo frio em texto_falado_limpo_en
    - comprimento_medio_gancho    : média de palavras nos ganchos dos super_viral
    - comprimento_medio_frase     : média de palavras por frase no roteiro dos super_viral
    - padrao_abertura_dominante   : pergunta / imperativo / afirmacao — padrão do gancho
    - densidade_pontuacao         : % de frases com ! ou ? nos super_viral vs frio
    - exemplos_descricoes         : exemplos reais de descricao_en super_viral
    - exemplos_thumbnails         : exemplos reais de texto_thumbnail super_viral
    """

    def top_tfidf(corpus, n=10):
        corpus_limpo = [str(t) for t in corpus if isinstance(t, str) and t.strip()]
        if len(corpus_limpo) < 2:
            return []
        vec = TfidfVectorizer(
            max_features=50,
            ngram_range=(1, 2),
            min_df=1,
            strip_accents="unicode",
            stop_words="english",
        )
        X = vec.fit_transform(corpus_limpo)
        scores = np.asarray(X.mean(axis=0)).flatten()
        terms = vec.get_feature_names_out()
        ordem = scores.argsort()[::-1][:n]
        return [terms[i] for i in ordem]

    def top_tfidf_exclusivo(corpus_super, corpus_frio, n=10):
        corpus_s = [str(t) for t in corpus_super if isinstance(t, str) and t.strip()]
        corpus_f = [str(t) for t in corpus_frio if isinstance(t, str) and t.strip()]
        if len(corpus_s) < 2:
            return []
        vec = TfidfVectorizer(
            max_features=200,
            ngram_range=(1, 2),
            min_df=1,
            strip_accents="unicode",
            stop_words="english",
        )
        todos = corpus_s + corpus_f if corpus_f else corpus_s
        X = vec.fit_transform(todos)
        terms = vec.get_feature_names_out()
        scores_s = np.asarray(X[: len(corpus_s)].mean(axis=0)).flatten()
        scores_f = np.asarray(X[len(corpus_s) :].mean(axis=0)).flatten() if corpus_f else np.zeros(len(terms))
        diff = scores_s - scores_f
        ordem = diff.argsort()[::-1][:n]
        return [terms[i] for i in ordem if diff[i] > 0]

    def extrair_emojis_frequentes(serie, n=5):
        import emoji as emoji_lib

        contagem = Counter()
        for texto in serie:
            if not isinstance(texto, str) or not texto.strip():
                continue
            for item in emoji_lib.emoji_list(texto):
                contagem[item["emoji"]] += 1
        return [e for e, _ in contagem.most_common(n)]

    def arco_emocional(df):
        if "texto_falado_limpo_en" not in df.columns:
            return {}
        try:
            sia = SentimentIntensityAnalyzer()
        except LookupError:
            nltk.download("vader_lexicon", quiet=True)
            sia = SentimentIntensityAnalyzer()

        def sentimento_terco(textos, inicio, fim):
            resultados = []
            for t in textos:
                if not isinstance(t, str) or not t.strip():
                    continue
                palavras = t.split()
                n = len(palavras)
                terco = " ".join(palavras[int(n * inicio) : int(n * fim)])
                if not terco.strip():
                    continue
                resultados.append(sia.polarity_scores(terco)["compound"])
            if not resultados:
                return "neutro"
            media = np.mean(resultados)
            return "positivo" if media >= 0.05 else "negativo" if media <= -0.05 else "neutro"

        textos = df["texto_falado_limpo_en"].tolist()
        return {
            "inicio": sentimento_terco(textos, 0.0, 0.2),
            "meio": sentimento_terco(textos, 0.2, 0.8),
            "fim": sentimento_terco(textos, 0.8, 1.0),
        }

    def vocabulario_por_terco(df, n=8):
        """Top termos TF-IDF de cada terço do texto_falado_limpo_en."""
        if "texto_falado_limpo_en" not in df.columns:
            return {"inicio": [], "meio": [], "fim": []}

        corpus_ini, corpus_mei, corpus_fim = [], [], []
        for t in df["texto_falado_limpo_en"]:
            if not isinstance(t, str) or not t.strip():
                continue
            palavras = t.split()
            total = len(palavras)
            if total < 5:
                continue
            ci = max(1, int(total * 0.20))
            cf = max(ci + 1, int(total * 0.80))
            corpus_ini.append(" ".join(palavras[:ci]))
            corpus_mei.append(" ".join(palavras[ci:cf]))
            corpus_fim.append(" ".join(palavras[cf:]))

        return {
            "inicio": top_tfidf(corpus_ini, n=n),
            "meio": top_tfidf(corpus_mei, n=n),
            "fim": top_tfidf(corpus_fim, n=n),
        }

    def comprimento_medio_gancho(df):
        """Média de palavras nos ganchos dos super_viral."""
        if "gancho_primeira_frase" not in df.columns:
            return None
        serie = df["gancho_primeira_frase"].dropna().astype(str)
        serie = serie[serie.str.strip() != ""]
        if serie.empty:
            return None
        return round(float(serie.apply(lambda t: len(t.split())).mean()), 1)

    def comprimento_medio_frase(df):
        """Média de palavras por frase no texto_falado_limpo_en."""
        if "texto_falado_limpo_en" not in df.columns:
            return None
        medias = []
        for t in df["texto_falado_limpo_en"]:
            if not isinstance(t, str) or not t.strip():
                continue
            frases = [f.strip() for f in re.split(r"[.!?]+", t) if f.strip()]
            if not frases:
                continue
            medias.append(np.mean([len(f.split()) for f in frases]))
        return round(float(np.mean(medias)), 1) if medias else None

    def padrao_abertura_dominante(df):
        """
        Detecta se o gancho começa mais com pergunta, imperativo ou afirmação.
        Baseado nos ganchos dos super_viral.
        """
        if "gancho_primeira_frase" not in df.columns:
            return None

        _INTERROGATIVAS = re.compile(
            r"^(what|who|why|how|when|where|which|is|are|do|did|will|can|would|should|have)\b",
            re.I,
        )
        _IMPERATIVOS = re.compile(
            r"^(stop|never|don't|avoid|forget|quit|start|try|make|look|watch|come|get|take|check|find|use|learn|save|discover)\b",
            re.I,
        )

        contagem = Counter()
        for t in df["gancho_primeira_frase"].dropna().astype(str):
            t = t.strip()
            if not t:
                continue
            if _INTERROGATIVAS.match(t):
                contagem["pergunta"] += 1
            elif _IMPERATIVOS.match(t):
                contagem["imperativo"] += 1
            else:
                contagem["afirmacao"] += 1

        if not contagem:
            return None
        return contagem.most_common(1)[0][0]

    def densidade_pontuacao(df_s, df_f):
        """
        % de frases com ! ou ? nos super_viral vs frio.
        Indica energia e ritmo do roteiro.
        """

        def calcular(df):
            if "texto_falado_limpo_en" not in df.columns:
                return None
            total, com_pontuacao = 0, 0
            for t in df["texto_falado_limpo_en"]:
                if not isinstance(t, str) or not t.strip():
                    continue
                frases = [f.strip() for f in re.split(r"[.!?]+", t) if f.strip()]
                total += len(frases)
                com_pontuacao += sum(1 for f in frases if re.search(r"[!?]", f))
            return round(com_pontuacao / total * 100, 1) if total > 0 else None

        return {
            "super_viral": calcular(df_s),
            "frio": calcular(df_f),
        }

    def exemplos_reais(df, coluna, n=5):
        if coluna not in df.columns:
            return []
        return [str(v) for v in df[coluna].dropna().head(n).tolist()]

    # ── Emojis ───────────────────────────────────────────────────────────────
    emojis_super = extrair_emojis_frequentes(df_super["vibe_emojis"] if "vibe_emojis" in df_super.columns else pd.Series(dtype=str))
    emojis_frio = extrair_emojis_frequentes(df_frio["vibe_emojis"] if "vibe_emojis" in df_frio.columns else pd.Series(dtype=str))
    emojis_evitar = [e for e in emojis_frio if e not in emojis_super][:5]

    padroes = {
        # ── Termos e vocabulário ──────────────────────────────────────────────
        "termos_gancho_usar": top_tfidf_exclusivo(
            df_super.get("gancho_primeira_frase", pd.Series(dtype=str)),
            df_frio.get("gancho_primeira_frase", pd.Series(dtype=str)),
        ),
        "termos_vocabulario": top_tfidf(
            df_super.get("vocabulario_falado", pd.Series(dtype=str)),
        ),
        "termos_seo_usar": top_tfidf_exclusivo(
            df_super.get("palavras_chave_en", pd.Series(dtype=str)),
            df_frio.get("palavras_chave_en", pd.Series(dtype=str)),
        ),
        "ngramas_roteiro": top_tfidf(
            df_super.get("texto_falado_limpo_en", pd.Series(dtype=str)),
        ),
        "termos_descricao_usar": top_tfidf_exclusivo(
            df_super.get("descricao_en", pd.Series(dtype=str)),
            df_frio.get("descricao_en", pd.Series(dtype=str)),
        ),
        "termos_gancho_evitar": top_tfidf_exclusivo(
            df_frio.get("gancho_primeira_frase", pd.Series(dtype=str)),
            df_super.get("gancho_primeira_frase", pd.Series(dtype=str)),
        ),
        "termos_roteiro_evitar": top_tfidf_exclusivo(
            df_frio.get("texto_falado_limpo_en", pd.Series(dtype=str)),
            df_super.get("texto_falado_limpo_en", pd.Series(dtype=str)),
        ),
        # ── Emojis ───────────────────────────────────────────────────────────
        "emojis_usar": emojis_super,
        "emojis_evitar": emojis_evitar,
        # ── Análise do roteiro ────────────────────────────────────────────────
        "arco_emocional": arco_emocional(df_super),
        "vocabulario_por_terco": vocabulario_por_terco(df_super),
        "comprimento_medio_gancho": comprimento_medio_gancho(df_super),
        "comprimento_medio_frase": comprimento_medio_frase(df_super),
        "padrao_abertura_dominante": padrao_abertura_dominante(df_super),
        "densidade_pontuacao": densidade_pontuacao(df_super, df_frio),
        # ── Exemplos reais ────────────────────────────────────────────────────
        "exemplos_ganchos": exemplos_reais(df_super, "gancho_primeira_frase"),
        "exemplos_titulos": exemplos_reais(df_super, "titulo_en"),
        "exemplos_descricoes": exemplos_reais(df_super, "descricao_en"),
        "exemplos_thumbnails": exemplos_reais(df_super, "texto_thumbnail"),
    }

    print(f"   [{nicho}] extrair_padroes_textuais concluído")

    return padroes


def extrair_padroes_thumbnail(df_super: pd.DataFrame, df_frio: pd.DataFrame, nicho: str) -> dict:
    """
    Extrai padrões visuais da thumbnail dos super_viral.
    Recebe df_frio para contraste.

    Extrai:
    - comprimento_alvo_chars    : mediana de chars do texto_thumbnail nos super_viral
    - termos_thumbnail_usar     : TF-IDF exclusivo super_viral em texto_thumbnail
    - termos_thumbnail_evitar   : TF-IDF exclusivo frio em texto_thumbnail
    - cenas_visuais_dominantes  : TF-IDF dominante em descricao_visual_thumb
    - exemplos_texto_thumbnail  : exemplos reais de texto_thumbnail super_viral
    - exemplos_cena_visual      : exemplos reais de descricao_visual_thumb super_viral
    """

    def top_tfidf_exclusivo(corpus_super, corpus_frio, n=10):
        corpus_s = [str(t) for t in corpus_super if isinstance(t, str) and t.strip()]
        corpus_f = [str(t) for t in corpus_frio if isinstance(t, str) and t.strip()]
        if len(corpus_s) < 2:
            return []
        vec = TfidfVectorizer(
            max_features=200,
            ngram_range=(1, 2),
            min_df=1,
            strip_accents="unicode",
            stop_words="english",
        )
        todos = corpus_s + corpus_f if corpus_f else corpus_s
        X = vec.fit_transform(todos)
        terms = vec.get_feature_names_out()
        scores_s = np.asarray(X[: len(corpus_s)].mean(axis=0)).flatten()
        scores_f = np.asarray(X[len(corpus_s) :].mean(axis=0)).flatten() if corpus_f else np.zeros(len(terms))
        diff = scores_s - scores_f
        ordem = diff.argsort()[::-1][:n]
        return [terms[i] for i in ordem if diff[i] > 0]

    def top_tfidf(corpus, n=5):
        corpus_limpo = [str(t) for t in corpus if isinstance(t, str) and t.strip()]
        if len(corpus_limpo) < 2:
            return corpus_limpo[:n]
        vec = TfidfVectorizer(
            max_features=50,
            ngram_range=(1, 2),
            min_df=1,
            strip_accents="unicode",
            stop_words="english",
        )
        X = vec.fit_transform(corpus_limpo)
        scores = np.asarray(X.mean(axis=0)).flatten()
        terms = vec.get_feature_names_out()
        ordem = scores.argsort()[::-1][:n]
        return [terms[i] for i in ordem]

    def comprimento_alvo(df, coluna):
        if coluna not in df.columns:
            return None
        serie = df[coluna].dropna().apply(lambda x: len(str(x)))
        return int(serie.median()) if not serie.empty else None

    def exemplos_reais(df, coluna, n=5):
        if coluna not in df.columns:
            return []
        return [str(v) for v in df[coluna].dropna().head(n).tolist()]

    padroes = {
        "comprimento_alvo_chars": comprimento_alvo(df_super, "texto_thumbnail"),
        "termos_thumbnail_usar": top_tfidf_exclusivo(
            df_super.get("texto_thumbnail", pd.Series(dtype=str)),
            df_frio.get("texto_thumbnail", pd.Series(dtype=str)),
        ),
        "termos_thumbnail_evitar": top_tfidf_exclusivo(
            df_frio.get("texto_thumbnail", pd.Series(dtype=str)),
            df_super.get("texto_thumbnail", pd.Series(dtype=str)),
        ),
        "cenas_visuais_dominantes": top_tfidf(
            df_super.get("descricao_visual_thumb", pd.Series(dtype=str)),
        ),
        "exemplos_texto_thumbnail": exemplos_reais(df_super, "texto_thumbnail"),
        "exemplos_cena_visual": exemplos_reais(df_super, "descricao_visual_thumb"),
    }

    print(f"   [{nicho}] extrair_padroes_thumbnail concluído")

    return padroes


def consolidar_padroes_nicho(df: pd.DataFrame, nicho: str) -> dict:
    """
    Consolida todos os padrões extraídos em um único dicionário por nicho.
    Filtra super_viral e frio do nicho específico para contraste.
    """
    df_nicho = df[df["nicho"] == nicho].copy()
    df_super = df_nicho[df_nicho["label_viral"] == "super_viral"].copy()
    df_frio = df_nicho[df_nicho["label_viral"] == "frio"].copy()

    if df_super.empty:
        print(f"   [{nicho}] SKIP — sem super_viral suficientes.")
        return {}

    padroes = {
        "nicho": nicho,
        "n_videos": len(df_nicho),
        "n_super": len(df_super),
        "n_frio": len(df_frio),
        "estrutura": extrair_padroes_estrutura(df_super, df_frio, nicho),
        "textuais": extrair_padroes_textuais(df_super, df_frio, nicho),
        "thumbnail": extrair_padroes_thumbnail(df_super, df_frio, nicho),
    }

    print(f"   [{nicho}] consolidar_padroes_nicho concluído")
    print(f"   Super virais: {len(df_super)} | Frios: {len(df_frio)}")

    return padroes


def salvar_padroes_por_nicho(df: pd.DataFrame) -> None:
    """
    Itera sobre todos os nichos do dataset, extrai e consolida os padrões
    e salva um JSON por nicho em models/padroes_virais/{nicho}.json.
    Esses JSONs são o contexto mastigado que o endpoint entrega para a LLM.
    """
    if "nicho" not in df.columns:
        raise ValueError("ERRO: coluna 'nicho' não encontrada no DataFrame.")

    nichos = df["nicho"].dropna().unique()

    print(" Bloco 3 | salvar_padroes_por_nicho")
    print(f"   Nichos encontrados: {list(nichos)}")

    for nicho in nichos:
        padroes = consolidar_padroes_nicho(df, nicho)

        if not padroes:
            continue

        nicho_limpo = str(nicho).replace(" ", "_").replace("/", "_").lower()
        caminho = os.path.join(PASTA_PADROES, f"{nicho_limpo}.json")

        with open(caminho, "w", encoding="utf-8") as f:
            json.dump(padroes, f, ensure_ascii=False, indent=2)

        print(f"   [{nicho}] salvo em: {caminho}")

    print(f" Bloco 3 | todos os padrões salvos em: {PASTA_PADROES}")


def calcular_similaridade_entre_nichos(df: pd.DataFrame) -> None:
    """
    Calcula e salva vetores TF-IDF das palavras_chave_en agregadas por nicho.
    Usado pelo inferencia_ml.py para encontrar o nicho mais similar
    quando o usuário entra com um nicho ainda não visto no treino.

    Estratégia:
    - Agrega palavras_chave_en dos super_viral de cada nicho
    - Vetoriza com TF-IDF com stop_words="english"
    - Salva vetores + vetorizador em nicho_similaridade.pkl
    - Salva JSON legível com top termos por nicho
    """
    from sklearn.metrics.pairwise import cosine_similarity

    if "nicho" not in df.columns or "palavras_chave_en" not in df.columns:
        print("   [SKIP] colunas necessárias não encontradas.")
        return

    df_super = df[df["label_viral"] == "super_viral"].copy()
    corpus_por_nicho = df_super.groupby("nicho")["palavras_chave_en"].apply(lambda x: " ".join(x.dropna().astype(str))).to_dict()

    if len(corpus_por_nicho) < 2:
        print("   [SKIP] nichos insuficientes para calcular similaridade.")
        return

    nichos = list(corpus_por_nicho.keys())
    corpus = list(corpus_por_nicho.values())

    vetorizador = TfidfVectorizer(
        max_features=300,
        ngram_range=(1, 2),
        min_df=1,
        strip_accents="unicode",
        lowercase=True,
        stop_words="english",
    )

    matriz = vetorizador.fit_transform(corpus)

    sim_matrix = cosine_similarity(matriz)
    similaridade = {nichos[i]: {nichos[j]: round(float(sim_matrix[i][j]), 4) for j in range(len(nichos)) if i != j} for i in range(len(nichos))}

    feature_names = vetorizador.get_feature_names_out()
    top_termos = {}
    for i, nicho in enumerate(nichos):
        scores = zip(feature_names, matriz[i].toarray()[0])
        top_termos[nicho] = [t for t, s in sorted(scores, key=lambda x: x[1], reverse=True) if s > 0][:20]

    caminho_pkl = os.path.join(PASTA_PADROES, "nicho_similaridade.pkl")
    with open(caminho_pkl, "wb") as f:
        pickle.dump(
            {
                "vetorizador": vetorizador,
                "matriz": matriz,
                "nichos": nichos,
                "similaridade": similaridade,
            },
            f,
        )

    caminho_json = os.path.join(PASTA_PADROES, "nicho_similaridade.json")
    with open(caminho_json, "w", encoding="utf-8") as f:
        json.dump(
            {
                "nichos": nichos,
                "similaridade": similaridade,
                "top_termos": top_termos,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    print(" Bloco 3 | calcular_similaridade_entre_nichos concluído")
    print(f"   Nichos indexados : {nichos}")
    print(f"   nicho_similaridade.pkl  → {caminho_pkl}")
    print(f"   nicho_similaridade.json → {caminho_json}")


# ════════════════════════════════════════════════════════════════════════════
# MAESTRO
# ════════════════════════════════════════════════════════════════════════════


def maestro_treinamento() -> None:
    """
    Orquestra a execução sequencial de todas as etapas:

    BLOCO 1 — PREPARAÇÃO
      1. carrega matriz_ml.pkl (gerado pelo 02) para treino numérico
      2. carrega CSV ouro (baixar_csv_ouro) para extração de padrões
      3. separar_features_e_target()
      4. split_treino_teste()

    BLOCO 2 — TREINAMENTO
      5. treinar_modelo()
      6. avaliar_modelo()
      7. salvar_modelo()

    BLOCO 3 — PADRÕES DOS SUPER_VIRAL
      8. salvar_padroes_por_nicho()
      9. calcular_similaridade_entre_nichos()
    """
    print("\n" + "=" * 55)
    print("🎯 INICIANDO TREINAMENTO")
    print("=" * 55)

    # ── BLOCO 1 — PREPARAÇÃO ─────────────────────────────────
    print("\n── BLOCO 1: PREPARAÇÃO ────────────────────────────────")

    caminho_matriz = os.path.join(PASTA_PREPROCESSORS, "matriz_ml.pkl")

    if not os.path.exists(caminho_matriz):
        print(f"ERRO: '{caminho_matriz}' não encontrado. Rode o 02_pre_processa.py primeiro.")
        return

    X, y = separar_features_e_target(caminho_matriz)
    X_train, X_test, y_train, y_test = split_treino_teste(X, y)

    df = baixar_csv_ouro()

    if df is None or df.empty:
        print("ERRO: CSV ouro vazio ou não carregado. Abortando.")
        return

    print(f"   CSV ouro carregado: {df.shape[0]} linhas × {df.shape[1]} colunas")

    # Valida colunas críticas para extração de padrões
    colunas_criticas = [
        "nicho",
        "label_viral",
        "gancho_primeira_frase",
        "vocabulario_falado",
        "texto_falado_limpo_en",
        "palavras_chave_en",
        "descricao_en",
        "titulo_en",
        "texto_thumbnail",
        "descricao_visual_thumb",
        "vibe_emojis",
        "pistas_audio_en",
        "taxa_discussao",
        "taxa_conversao",
        "velocidade_views",
        "completude_seo",
        "hora_postagem",
    ]
    faltando = [c for c in colunas_criticas if c not in df.columns]
    if faltando:
        print(f"   AVISO: colunas ausentes no CSV ouro: {faltando}")
        print("   Verifique se o 02_pre_processa.py foi rodado com a versão atualizada.")

    # ── BLOCO 2 — TREINAMENTO ─────────────────────────────────
    print("\n── BLOCO 2: TREINAMENTO ───────────────────────────────")

    modelo, le = treinar_modelo(X_train, y_train)
    metricas = avaliar_modelo(modelo, le, X_test, y_test)
    salvar_modelo(modelo, metricas)

    # ── BLOCO 3 — PADRÕES DOS SUPER_VIRAL ────────────────────
    print("\n── BLOCO 3: PADRÕES DOS SUPER_VIRAL ──────────────────")

    salvar_padroes_por_nicho(df)
    calcular_similaridade_entre_nichos(df)

    print("\n" + "=" * 55)
    print("✅ TREINAMENTO CONCLUÍDO")
    print(f"   Modelo salvo em         : {PASTA_PREDICTORS}")
    print(f"   Padrões salvos em       : {PASTA_PADROES}")
    print(f"   Preprocessors salvos em : {PASTA_PREPROCESSORS}")
    print("=" * 55 + "\n")


if __name__ == "__main__":
    maestro_treinamento()
