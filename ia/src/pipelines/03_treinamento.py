import json
import os
import pickle

import nltk
import numpy as np
import pandas as pd
from nltk.sentiment import SentimentIntensityAnalyzer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
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


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 1 — PREPARAÇÃO DOS DADOS PARA TREINO
# ════════════════════════════════════════════════════════════════════════════


def separar_features_e_target(caminho_matriz_pkl: str):
    """
    Carrega a matriz numérica já vetorizada (matriz_ml.pkl, gerado pelo 02)
    e separa X (features numéricas) e y (targets) para o treino.

    Diferente do CSV ouro, que mantém texto e categorias em formato legível
    para o Bloco 3, essa matriz já passou por TF-IDF + OneHotEncoder + Scaler
    e está 100% numérica — pronta para o XGBoost.
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
    garantindo que todos os níveis (frio, aquecido, viral, super_viral)
    estejam representados nos dois conjuntos.
    """
    from sklearn.model_selection import train_test_split

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
    Treina o modelo preditivo usando X_train e y_train.
    XGBoost para classificação multiclasse (frio, aquecido, viral, super_viral).
    Usa label_viral como target principal.
    Retorna o modelo treinado.
    """

    # Codifica label_viral em inteiro para o XGBoost
    le = LabelEncoder()
    y_encoded = le.fit_transform(y_train["label_viral"])

    # Salva o LabelEncoder para decodificar as previsões no endpoint
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
    print(f"   label_encoder.pkl salvo em: {caminho_le}")

    return modelo, le


def avaliar_modelo(modelo, le, X_test, y_test) -> dict:
    """
    Avalia o modelo no conjunto de teste.
    Retorna métricas: accuracy, f1 por classe, matriz de confusão.
    Loga os resultados no terminal.
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
    Salva o modelo treinado em models/predictors/motor_modelo.pkl
    Salva também as métricas de avaliação em motor_modelo_metricas.json
    para referência futura sem precisar re-avaliar.
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
# (Contexto mastigado para a LLM)
# ════════════════════════════════════════════════════════════════════════════


def filtrar_super_virais(df: pd.DataFrame) -> pd.DataFrame:
    """
    Filtra apenas os vídeos com label_viral == 'super_viral'.
    Base de referência para extração de todos os padrões abaixo.
    """
    if "label_viral" not in df.columns:
        raise ValueError("ERRO: coluna 'label_viral' não encontrada no DataFrame.")

    df_super = df[df["label_viral"] == "super_viral"].copy()

    print(" Bloco 3 | filtrar_super_virais concluído")
    print(f"   Total no dataset : {len(df)} vídeos")
    print(f"   Super virais     : {len(df_super)} vídeos ({len(df_super) / len(df) * 100:.1f}%)")

    return df_super


def extrair_padroes_estrutura(df_super: pd.DataFrame, df_frio: pd.DataFrame, nicho: str) -> dict:
    """
    Extrai padrões de estrutura/formato dos super_viral do nicho.
    Recebe também df_frio para gerar contraste e alertas.

    Extrai:
    - faixa_duracao dominante
    - estrutura_blocos dominante
    - ritmo_palavras_seg (mediana)
    - densidade_roteiro (mediana — max_words para a LLM)
    - sentimento_roteiro dominante
    - top 3 slots de postagem (dia × janela)
    - tem_repeticao_roteiro (ativar regra dos 5x se > 30%)
    - tipo_audio_dominante
    - clickbait_score (mediana)
    """

    def dominante(serie):
        return serie.value_counts().index[0] if not serie.empty else None

    def top3_slots(df):
        if "dia_postagem" not in df.columns or "janela_postagem" not in df.columns:
            return []
        slots = df.groupby(["dia_postagem", "janela_postagem"]).size()
        slots = slots.sort_values(ascending=False).head(3)
        return [{"dia": d, "janela": j, "qtd": int(c)} for (d, j), c in slots.items()]

    padroes = {
        "faixa_duracao_dominante": dominante(df_super["faixa_duracao"]) if "faixa_duracao" in df_super.columns else None,
        "estrutura_blocos_dominante": dominante(df_super["estrutura_blocos"]) if "estrutura_blocos" in df_super.columns else None,
        "ritmo_palavras_seg_mediana": round(df_super["ritmo_palavras_seg"].median(), 2) if "ritmo_palavras_seg" in df_super.columns else None,
        "densidade_roteiro_mediana": int(df_super["densidade_roteiro"].median()) if "densidade_roteiro" in df_super.columns else None,
        "sentimento_dominante": dominante(df_super["sentimento_roteiro"]) if "sentimento_roteiro" in df_super.columns else None,
        "top3_slots_postagem": top3_slots(df_super),
        "ativar_repeticao_5x": bool(df_super["tem_repeticao_roteiro"].mean() > 0.30) if "tem_repeticao_roteiro" in df_super.columns else False,
        "tipo_audio_dominante": dominante(df_super["tipo_audio_dominante"]) if "tipo_audio_dominante" in df_super.columns else None,
        "clickbait_score_mediana": round(df_super["clickbait_score"].median(), 3) if "clickbait_score" in df_super.columns else None,
        # Contraste com frio — alerta para o endpoint
        "faixa_duracao_evitar": dominante(df_frio["faixa_duracao"]) if "faixa_duracao" in df_frio.columns and not df_frio.empty else None,
        "sentimento_evitar": dominante(df_frio["sentimento_roteiro"]) if "sentimento_roteiro" in df_frio.columns and not df_frio.empty else None,
    }

    print(f"   [{nicho}] extrair_padroes_estrutura concluído")

    return padroes


def extrair_padroes_textuais(df_super: pd.DataFrame, df_frio: pd.DataFrame, nicho: str) -> dict:
    """
    Extrai padrões textuais dos super_viral para mastigar o roteiro da LLM.
    Recebe df_frio para gerar lista de termos a evitar.
    """
    from sklearn.feature_extraction.text import TfidfVectorizer

    def top_tfidf(corpus, n=10):
        corpus_limpo = [str(t) for t in corpus if isinstance(t, str) and t.strip()]
        if len(corpus_limpo) < 2:
            return []
        vec = TfidfVectorizer(max_features=50, ngram_range=(1, 2), min_df=1, strip_accents="unicode")
        vec.fit_transform(corpus_limpo)
        scores = zip(vec.get_feature_names_out(), vec.idf_)
        return [t for t, _ in sorted(scores, key=lambda x: x[1])[:n]]

    def top_tfidf_exclusivo(corpus_super, corpus_frio, n=10):
        """Termos que aparecem nos super_viral mas não nos frio."""
        corpus_s = [str(t) for t in corpus_super if isinstance(t, str) and t.strip()]
        corpus_f = [str(t) for t in corpus_frio if isinstance(t, str) and t.strip()]
        if len(corpus_s) < 2:
            return []
        vec = TfidfVectorizer(max_features=100, ngram_range=(1, 2), min_df=1, strip_accents="unicode")
        vec.fit(corpus_s)
        termos_super = set(vec.get_feature_names_out())
        if corpus_f:
            vec_f = TfidfVectorizer(max_features=100, ngram_range=(1, 2), min_df=1, strip_accents="unicode")
            vec_f.fit(corpus_f)
            termos_frio = set(vec_f.get_feature_names_out())
            return list(termos_super - termos_frio)[:n]
        return list(termos_super)[:n]

    def arco_emocional(df):
        """Sentimento por terço do roteiro usando texto_falado_limpo_en."""
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

    def exemplos_reais(df, coluna, n=5):
        if coluna not in df.columns:
            return []
        return [str(v) for v in df[coluna].dropna().head(n).tolist()]

    padroes = {
        # Termos do gancho exclusivos dos super_viral
        "termos_gancho_usar": top_tfidf_exclusivo(df_super.get("gancho_primeira_frase", []), df_frio.get("gancho_primeira_frase", [])),
        # Vocabulário falado dominante
        "termos_vocabulario": top_tfidf(df_super.get("vocabulario_falado", []), n=10),
        # SEO exclusivo dos super_viral
        "termos_seo_usar": top_tfidf_exclusivo(df_super.get("palavras_chave_en", []), df_frio.get("palavras_chave_en", [])),
        # N-gramas do roteiro
        "ngramas_roteiro": top_tfidf(df_super.get("texto_falado_limpo_en", []), n=10),
        # Arco emocional por terço
        "arco_emocional": arco_emocional(df_super),
        # Exemplos reais
        "exemplos_ganchos": exemplos_reais(df_super, "gancho_primeira_frase"),
        "exemplos_titulos": exemplos_reais(df_super, "titulo_en"),
        # Termos a evitar — exclusivos do frio
        "termos_gancho_evitar": top_tfidf_exclusivo(df_frio.get("gancho_primeira_frase", []), df_super.get("gancho_primeira_frase", [])),
        "termos_roteiro_evitar": top_tfidf_exclusivo(df_frio.get("texto_falado_limpo_en", []), df_super.get("texto_falado_limpo_en", [])),
    }

    print(f"   [{nicho}] extrair_padroes_textuais concluído")

    return padroes


def extrair_padroes_thumbnail(df_super: pd.DataFrame, df_frio: pd.DataFrame, nicho: str) -> dict:
    """
    Extrai padrões visuais da thumbnail dos super_viral.
    Recebe df_frio para contraste.

    Extrai:
    - comprimento alvo do texto_thumbnail
    - termos TF-IDF exclusivos no texto_thumbnail
    - cenas visuais dominantes da descricao_visual_thumb
    - exemplos reais de texto de thumbnail super_viral
    """
    from sklearn.feature_extraction.text import TfidfVectorizer

    def top_tfidf_exclusivo(corpus_super, corpus_frio, n=10):
        corpus_s = [str(t) for t in corpus_super if isinstance(t, str) and t.strip()]
        corpus_f = [str(t) for t in corpus_frio if isinstance(t, str) and t.strip()]
        if len(corpus_s) < 2:
            return []
        vec = TfidfVectorizer(max_features=100, ngram_range=(1, 2), min_df=1, strip_accents="unicode")
        vec.fit(corpus_s)
        termos_super = set(vec.get_feature_names_out())
        if corpus_f:
            vec_f = TfidfVectorizer(max_features=100, ngram_range=(1, 2), min_df=1, strip_accents="unicode")
            vec_f.fit(corpus_f)
            termos_frio = set(vec_f.get_feature_names_out())
            return list(termos_super - termos_frio)[:n]
        return list(termos_super)[:n]

    def comprimento_alvo(df, coluna):
        if coluna not in df.columns:
            return None
        serie = df[coluna].dropna().apply(lambda x: len(str(x)))
        return int(serie.median()) if not serie.empty else None

    def cenas_dominantes(df, n=5):
        if "descricao_visual_thumb" not in df.columns:
            return []
        vec = TfidfVectorizer(max_features=20, ngram_range=(1, 2), min_df=1, strip_accents="unicode")
        corpus = [str(t) for t in df["descricao_visual_thumb"].dropna() if str(t).strip()]
        if len(corpus) < 2:
            return corpus[:n]
        vec.fit(corpus)
        return list(vec.get_feature_names_out())[:n]

    def exemplos_reais(df, coluna, n=5):
        if coluna not in df.columns:
            return []
        return [str(v) for v in df[coluna].dropna().head(n).tolist()]

    padroes = {
        # Comprimento alvo do texto na capa
        "comprimento_alvo_chars": comprimento_alvo(df_super, "texto_thumbnail"),
        # Termos exclusivos dos super_viral na thumbnail
        "termos_thumbnail_usar": top_tfidf_exclusivo(df_super.get("texto_thumbnail", []), df_frio.get("texto_thumbnail", [])),
        # Termos a evitar na thumbnail
        "termos_thumbnail_evitar": top_tfidf_exclusivo(df_frio.get("texto_thumbnail", []), df_super.get("texto_thumbnail", [])),
        # Elementos visuais dominantes nas cenas dos super_viral
        "cenas_visuais_dominantes": cenas_dominantes(df_super),
        # Exemplos reais de texto de thumbnail super_viral
        "exemplos_texto_thumbnail": exemplos_reais(df_super, "texto_thumbnail"),
        # Exemplos reais de cena visual super_viral
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
    e salva um JSON por nicho em models/padroes_virais/{nicho}.json
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
    Usado pelo endpoint online para encontrar o nicho mais similar
    quando o usuário entra com um nicho ainda não visto no treino.

    Estratégia:
    - Agrega todas as palavras_chave_en dos super_viral de cada nicho
    - Vetoriza com TF-IDF
    - Salva os vetores e o vetorizador em nicho_similaridade.pkl
    - Salva também um JSON legível com os top termos por nicho
    """
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    if "nicho" not in df.columns or "palavras_chave_en" not in df.columns:
        print("   [SKIP] colunas necessárias não encontradas.")
        return

    # Agrega palavras-chave dos super_viral por nicho
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
    )

    matriz = vetorizador.fit_transform(corpus)

    # Matriz de similaridade entre todos os nichos
    sim_matrix = cosine_similarity(matriz)
    similaridade = {nichos[i]: {nichos[j]: round(float(sim_matrix[i][j]), 4) for j in range(len(nichos)) if i != j} for i in range(len(nichos))}

    # Top termos por nicho — legível para debug
    top_termos = {}
    feature_names = vetorizador.get_feature_names_out()
    for i, nicho in enumerate(nichos):
        scores = zip(feature_names, matriz[i].toarray()[0])
        top_termos[nicho] = [t for t, s in sorted(scores, key=lambda x: x[1], reverse=True) if s > 0][:20]

    # Salva vetorizador + matriz + nichos para uso online
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

    # Salva JSON legível
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
      2. carrega CSV ouro (baixar_csv_ouro) para extração de padrões legíveis
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

    # Matriz numérica para o treino — vem do 02 (TF-IDF + OHE + Scaler já aplicados)
    caminho_matriz = os.path.join(PASTA_PREPROCESSORS, "matriz_ml.pkl")

    if not os.path.exists(caminho_matriz):
        print(f"ERRO: '{caminho_matriz}' não encontrado. Rode o 02_pre_processa.py primeiro.")
        return

    X, y = separar_features_e_target(caminho_matriz)
    X_train, X_test, y_train, y_test = split_treino_teste(X, y)

    # CSV ouro legível — usado só no Bloco 3, para extração de padrões textuais
    df = baixar_csv_ouro()

    if df is None or df.empty:
        print("ERRO: CSV ouro vazio ou não carregado. Abortando.")
        return

    print(f"   CSV ouro carregado: {df.shape[0]} linhas × {df.shape[1]} colunas")

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
