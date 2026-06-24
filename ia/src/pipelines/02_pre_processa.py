import json
import os
import pickle
import re

import emoji
import numpy as np
import pandas as pd
import scipy.sparse as sp
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from src.core.supabase_client import BASE_DIR, baixar_csv_prata, subir_csv_ouro

# ── Caminhos ────────────────────────────────────────────────────────────────
PASTA_PREPROCESSORS = os.path.join(BASE_DIR, "models", "preprocessors")
os.makedirs(PASTA_PREPROCESSORS, exist_ok=True)


# ════════════════════════════════════════════════════════════════════════════
# PARTE 1 — GERAR O CSV OURO
# ════════════════════════════════════════════════════════════════════════════


def remover_colunas_inuteis(df: pd.DataFrame) -> pd.DataFrame:
    """
    Remove identificadores, textos brutos originais e colunas intermediárias
    já substituídas por versões melhores no processador de features.

    SAEM:
    - video_id, canal_id, canal_nome       : identificadores puros
    - titulo, descricao, texto_falado      : substituídos pelas versões _en
    - texto_falado_limpo                   : substituído por texto_falado_limpo_en
    - tags, topicos_wikipedia, categoria_id: absorvidos em palavras_chave_en
    - palavras_chave                       : substituído por palavras_chave_en
    - pistas_audio                         : substituído por pistas_audio_en
    - data_publicacao                      : virou dia_postagem, hora_postagem,
                                             janela_postagem, idade_dias
    - thumb_maxres                         : URL sem valor para o modelo
    - idioma_texto_default                 : menos confiável que idioma_audio_default
    """
    colunas_para_remover = [
        "video_id",
        "canal_id",
        "canal_nome",
        "titulo",
        "descricao",
        "texto_falado",
        "texto_falado_limpo",
        "tags",
        "topicos_wikipedia",
        "categoria_id",
        "palavras_chave",
        "pistas_audio",
        "data_publicacao",
        "thumb_maxres",
        "idioma_texto_default",
    ]

    antes = df.shape[1]
    df = df.drop(columns=colunas_para_remover, errors="ignore")
    depois = df.shape[1]

    print(" Bloco 1 | remover_colunas_inuteis")
    print(f"   Colunas removidas : {antes - depois}")
    print(f"   Colunas restantes : {depois}")

    return df


def tratar_nulos_residuais(df: pd.DataFrame) -> pd.DataFrame:
    """
    Trata nulos residuais antes de salvar o CSV ouro.
    vibe_emojis e pistas_audio_en recebem string vazia — preservadas
    no CSV ouro para o 03_treinamento.py extrair padrões textuais.
    A conversão para numérico ocorre depois, apenas para a matriz ML.
    """
    tratamentos = {
        "tipo_audio_dominante": "sem_audio",
        "vibe_emojis": "",
        "pistas_audio_en": "",
        "vocabulario_falado": "",
        "texto_falado_limpo_en": "",
        "gancho_primeira_frase": "",
        "descricao_visual_thumb": "",
        "texto_thumbnail": "",
        "descricao_en": "",
        "titulo_en": "",
    }

    for coluna, valor in tratamentos.items():
        if coluna in df.columns:
            nulos_antes = df[coluna].isna().sum()
            df[coluna] = df[coluna].fillna(valor)
            if nulos_antes > 0:
                print(f"   {coluna:<25}: {nulos_antes} nulos → '{valor}'")

    print(" Bloco 1 | tratar_nulos_residuais concluído")

    return df


def aplicar_log_metricas_engajamento(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aplica log1p nas métricas de engajamento com cauda pesada.
    log1p suporta zeros sem quebrar.
    Salva log_cols.json para que o endpoint online aplique
    a mesma transformação antes de escalar.

    Colunas transformadas:
    - visualizacoes  (skew alto)
    - curtidas       (skew alto)
    - comentarios    (skew alto)
    - velocidade_views (herda distorção de visualizacoes)
    """
    log_cols = [
        "visualizacoes",
        "curtidas",
        "comentarios",
        "velocidade_views",
    ]

    cols_transformadas = []

    for col in log_cols:
        if col in df.columns:
            df[col] = np.log1p(df[col])
            cols_transformadas.append(col)
            print(f"   log1p aplicado → {col}")

    caminho_json = os.path.join(PASTA_PREPROCESSORS, "log_cols.json")
    with open(caminho_json, "w", encoding="utf-8") as f:
        json.dump(cols_transformadas, f, ensure_ascii=False, indent=2)

    print(" Bloco 2 | aplicar_log_metricas_engajamento concluído")
    print(f"   log_cols.json salvo em: {caminho_json}")

    return df


def salvar_e_subir_ouro(df: pd.DataFrame) -> None:
    """
    Salva o CSV ouro com vibe_emojis e pistas_audio_en ainda intactas.
    O 03_treinamento.py precisa dessas colunas para extrair padrões textuais
    dos super_viral — emojis dominantes e pistas de áudio reais do nicho.
    A conversão para numérico acontece DEPOIS, apenas para a matriz ML.
    """
    print(" Bloco 3 | salvar_e_subir_ouro")
    print(f"   Shape do ouro : {df.shape[0]} linhas × {df.shape[1]} colunas")
    print(f"   Colunas       : {df.columns.tolist()}")

    subir_csv_ouro(df)


# ════════════════════════════════════════════════════════════════════════════
# PARTE 2 — CONVERSÃO PARA MATRIZ ML (não vai para o CSV ouro)
# ════════════════════════════════════════════════════════════════════════════


def converter_emojis_para_numerico(df: pd.DataFrame) -> pd.DataFrame:
    """
    Converte vibe_emojis em features numéricas para a matriz ML.
    Chamada APÓS salvar_e_subir_ouro — o CSV ouro já foi salvo
    com vibe_emojis intacta para o 03_treinamento.py usar.

    Features geradas:
    - emoji_qtd_total    : total de emojis no vídeo
    - emoji_grp_*        : uma coluna por grupo único encontrado no dataset

    Remove vibe_emojis após extração.
    """
    if "vibe_emojis" not in df.columns:
        print("   [SKIP] vibe_emojis não encontrada.")
        return df

    def obter_grupo(e: str) -> str:
        dados = emoji.EMOJI_DATA.get(e, {})
        return dados.get("group", "outros")

    def extrair_contagens(texto: str) -> dict:
        if not isinstance(texto, str) or not texto.strip():
            return {}
        contagens = {}
        for item in emoji.emoji_list(texto):
            grupo = obter_grupo(item["emoji"])
            contagens[grupo] = contagens.get(grupo, 0) + 1
        return contagens

    contagens_series = df["vibe_emojis"].apply(extrair_contagens)

    df["emoji_qtd_total"] = contagens_series.apply(lambda x: sum(x.values()))

    df_grupos = pd.DataFrame(contagens_series.tolist(), index=df.index).fillna(0).astype(int)
    df_grupos.columns = [f"emoji_grp_{col.lower().replace(' ', '_').replace('-', '_')}" for col in df_grupos.columns]

    df = pd.concat([df, df_grupos], axis=1)
    df = df.drop(columns=["vibe_emojis"], errors="ignore")

    print(" Parte 2 | converter_emojis_para_numerico concluído")
    print(f"   Features geradas : emoji_qtd_total + {len(df_grupos.columns)} grupos")
    print(f"   Grupos: {list(df_grupos.columns)}")

    return df


def converter_audio_para_numerico(df: pd.DataFrame) -> pd.DataFrame:
    """
    Converte pistas_audio_en em features binárias para a matriz ML.
    Chamada APÓS salvar_e_subir_ouro — o CSV ouro já foi salvo
    com pistas_audio_en intacta para o 03_treinamento.py usar.

    Features geradas:
    - audio_tem_qualquer : 1 se o vídeo tem qualquer pista de áudio
    - audio_tag_*        : 1 por cada tag única encontrada no dataset

    Remove pistas_audio_en após extração.
    """
    if "pistas_audio_en" not in df.columns:
        print("   [SKIP] pistas_audio_en não encontrada.")
        return df

    def extrair_tags(texto: str) -> list:
        if not isinstance(texto, str) or not texto.strip():
            return []
        return re.findall(r"\[([^\]]+)\]", texto.lower())

    tags_series = df["pistas_audio_en"].apply(extrair_tags)

    df["audio_tem_qualquer"] = tags_series.apply(lambda x: 1 if x else 0)

    todas_tags = sorted(set(tag for lista in tags_series for tag in lista))
    for tag in todas_tags:
        col = f"audio_tag_{tag.replace(' ', '_')}"
        df[col] = tags_series.apply(lambda x: 1 if tag in x else 0)

    df = df.drop(columns=["pistas_audio_en"], errors="ignore")

    print(" Parte 2 | converter_audio_para_numerico concluído")
    print(f"   Features geradas : audio_tem_qualquer + {len(todas_tags)} tags")
    print(f"   Tags: {todas_tags}")

    return df


# ════════════════════════════════════════════════════════════════════════════
# PARTE 3 — VETORIZAÇÃO E PREPROCESSORS
# ════════════════════════════════════════════════════════════════════════════


def vetorizar_textos_roteiro(df: pd.DataFrame) -> tuple:
    """
    TF-IDF unificado das colunas de roteiro:
    - gancho_primeira_frase + vocabulario_falado + texto_falado_limpo_en
    Unificadas pois derivam do mesmo texto falado.
    stop_words="english" para eliminar stopwords que contaminavam os termos.
    max_features=200, ngram_range=(1,2), min_df=2
    Salva tfidf_roteiro.pkl
    """
    colunas = ["gancho_primeira_frase", "vocabulario_falado", "texto_falado_limpo_en"]
    colunas_presentes = [c for c in colunas if c in df.columns]

    corpus = df[colunas_presentes].fillna("").apply(lambda row: " ".join(row.values.astype(str)), axis=1)

    vetorizador = TfidfVectorizer(
        max_features=200,
        ngram_range=(1, 2),
        min_df=2,
        strip_accents="unicode",
        lowercase=True,
        stop_words="english",
    )

    matriz = vetorizador.fit_transform(corpus)

    caminho = os.path.join(PASTA_PREPROCESSORS, "tfidf_roteiro.pkl")
    with open(caminho, "wb") as f:
        pickle.dump(vetorizador, f)

    print(" Bloco 5 | vetorizar_textos_roteiro concluído")
    print(f"   Colunas unificadas : {colunas_presentes}")
    print(f"   Shape da matriz    : {matriz.shape}")

    return matriz, vetorizador


def vetorizar_titulo(df: pd.DataFrame) -> tuple:
    """
    TF-IDF do titulo_en.
    stop_words="english" para eliminar stopwords.
    ngram_range=(1,3) para capturar moldes de frase.
    max_features=100, min_df=2
    Salva tfidf_titulo.pkl
    """
    if "titulo_en" not in df.columns:
        print("   [SKIP] titulo_en não encontrada.")
        return None, None

    corpus = df["titulo_en"].fillna("")

    vetorizador = TfidfVectorizer(
        max_features=100,
        ngram_range=(1, 3),
        min_df=2,
        strip_accents="unicode",
        lowercase=True,
        stop_words="english",
    )

    matriz = vetorizador.fit_transform(corpus)

    caminho = os.path.join(PASTA_PREPROCESSORS, "tfidf_titulo.pkl")
    with open(caminho, "wb") as f:
        pickle.dump(vetorizador, f)

    print(" Bloco 5 | vetorizar_titulo concluído")
    print(f"   Shape da matriz : {matriz.shape}")

    return matriz, vetorizador


def vetorizar_seo(df: pd.DataFrame) -> tuple:
    """
    TF-IDF das palavras_chave_en.
    Consolida tags + tópicos Wikipedia + hashtags + categorias.
    stop_words="english" para eliminar termos genéricos.
    max_features=150, ngram_range=(1,2), min_df=2
    Salva tfidf_seo.pkl
    """
    if "palavras_chave_en" not in df.columns:
        print("   [SKIP] palavras_chave_en não encontrada.")
        return None, None

    corpus = df["palavras_chave_en"].fillna("")

    vetorizador = TfidfVectorizer(
        max_features=150,
        ngram_range=(1, 2),
        min_df=2,
        strip_accents="unicode",
        lowercase=True,
        stop_words="english",
    )

    matriz = vetorizador.fit_transform(corpus)

    caminho = os.path.join(PASTA_PREPROCESSORS, "tfidf_seo.pkl")
    with open(caminho, "wb") as f:
        pickle.dump(vetorizador, f)

    print(" Bloco 5 | vetorizar_seo concluído")
    print(f"   Shape da matriz : {matriz.shape}")

    return matriz, vetorizador


def vetorizar_descricao(df: pd.DataFrame) -> tuple:
    """
    TF-IDF da descricao_en.
    Captura padrões de linguagem e CTAs dominantes no nicho.
    stop_words="english" para eliminar termos genéricos.
    max_features=100, ngram_range=(1,2), min_df=2
    Salva tfidf_descricao.pkl
    """
    if "descricao_en" not in df.columns:
        print("   [SKIP] descricao_en não encontrada.")
        return None, None

    corpus = df["descricao_en"].fillna("")

    vetorizador = TfidfVectorizer(
        max_features=100,
        ngram_range=(1, 2),
        min_df=2,
        strip_accents="unicode",
        lowercase=True,
        stop_words="english",
    )

    matriz = vetorizador.fit_transform(corpus)

    caminho = os.path.join(PASTA_PREPROCESSORS, "tfidf_descricao.pkl")
    with open(caminho, "wb") as f:
        pickle.dump(vetorizador, f)

    print(" Bloco 5 | vetorizar_descricao concluído")
    print(f"   Shape da matriz : {matriz.shape}")

    return matriz, vetorizador


def vetorizar_thumbnail(df: pd.DataFrame) -> tuple:
    """
    TF-IDF unificado de texto_thumbnail + descricao_visual_thumb.
    stop_words="english" para eliminar termos genéricos como
    'an', 'and', 'in' que apareciam nos cenas_visuais_dominantes.
    max_features=100, ngram_range=(1,2), min_df=2
    Salva tfidf_thumb.pkl
    """
    colunas = ["texto_thumbnail", "descricao_visual_thumb"]
    colunas_presentes = [c for c in colunas if c in df.columns]

    if not colunas_presentes:
        print("   [SKIP] nenhuma coluna de thumbnail encontrada.")
        return None, None

    corpus = df[colunas_presentes].fillna("").apply(lambda row: " ".join(row.values.astype(str)), axis=1)

    vetorizador = TfidfVectorizer(
        max_features=100,
        ngram_range=(1, 2),
        min_df=2,
        strip_accents="unicode",
        lowercase=True,
        stop_words="english",
    )

    matriz = vetorizador.fit_transform(corpus)

    caminho = os.path.join(PASTA_PREPROCESSORS, "tfidf_thumb.pkl")
    with open(caminho, "wb") as f:
        pickle.dump(vetorizador, f)

    print(" Bloco 5 | vetorizar_thumbnail concluído")
    print(f"   Colunas unificadas : {colunas_presentes}")
    print(f"   Shape da matriz    : {matriz.shape}")

    return matriz, vetorizador


def codificar_categoricas(df: pd.DataFrame) -> tuple:
    """
    OneHotEncoder nas colunas categóricas nominais.
    handle_unknown='ignore' para o endpoint online não travar com valor novo.
    sparse_output=False para facilitar concatenação com o restante da matriz.
    Salva encoder_categoricas.pkl
    """
    colunas = [
        "nicho",
        "dia_postagem",
        "janela_postagem",
        "faixa_duracao",
        "estrutura_blocos",
        "sentimento_roteiro",
        "tipo_audio_dominante",
        "idioma_audio_default",
    ]

    colunas_presentes = [c for c in colunas if c in df.columns]

    if not colunas_presentes:
        print("   [SKIP] nenhuma coluna categórica encontrada.")
        return None, None

    encoder = OneHotEncoder(
        handle_unknown="ignore",
        sparse_output=False,
    )

    matriz = encoder.fit_transform(df[colunas_presentes])

    caminho = os.path.join(PASTA_PREPROCESSORS, "encoder_categoricas.pkl")
    with open(caminho, "wb") as f:
        pickle.dump(encoder, f)

    print(" Bloco 6 | codificar_categoricas concluído")
    print(f"   Colunas codificadas : {colunas_presentes}")
    print(f"   Shape da matriz     : {matriz.shape}")

    return matriz, encoder


def escalar_numericas(df: pd.DataFrame) -> tuple:
    """
    StandardScaler nas colunas numéricas pós-log.
    score_viral e label_viral ficam de fora — são targets.
    Inclui taxa_discussao, taxa_conversao, velocidade_views e
    completude_seo que antes não estavam sendo escaladas mas
    existem no CSV ouro e são sinais relevantes de engajamento.
    Salva scaler_numericas.pkl
    """
    colunas = [
        # Engajamento (já com log1p aplicado)
        "visualizacoes",
        "curtidas",
        "comentarios",
        "velocidade_views",
        # Métricas de engajamento e qualidade
        "taxa_conversao",
        "taxa_discussao",
        "clickbait_score",
        "completude_seo",
        # Roteiro
        "ritmo_palavras_seg",
        "densidade_roteiro",
        # Temporais
        "idade_dias",
        "hora_postagem",
        # Formato
        "duracao_segundos",
        # Emojis
        "emoji_qtd_total",
    ]

    colunas += [c for c in df.columns if c.startswith("emoji_grp_")]
    colunas += [c for c in df.columns if c.startswith("audio_tag_")]
    colunas += ["audio_tem_qualquer"]

    colunas_presentes = [c for c in colunas if c in df.columns]

    if not colunas_presentes:
        print("   [SKIP] nenhuma coluna numérica encontrada.")
        return None, None

    scaler = StandardScaler()
    matriz = scaler.fit_transform(df[colunas_presentes])

    caminho = os.path.join(PASTA_PREPROCESSORS, "scaler_numericas.pkl")
    with open(caminho, "wb") as f:
        pickle.dump(scaler, f)

    print(" Bloco 6 | escalar_numericas concluído")
    print(f"   Colunas escaladas : {colunas_presentes}")
    print(f"   Shape da matriz   : {matriz.shape}")

    return matriz, scaler


def montar_e_salvar_matriz_ml(
    df: pd.DataFrame,
    mat_roteiro,
    mat_titulo,
    mat_seo,
    mat_descricao,
    mat_thumb,
    mat_ohe,
    mat_scaled,
) -> None:
    """
    Concatena horizontalmente todos os blocos em uma única
    matriz numérica homogênea pronta para o XGBoost.
    Targets score_viral e label_viral separados.
    Valida ausência de NaN.
    Salva feature_names.json e matriz_ml.pkl.
    """
    blocos = []
    nomes_blocos = []

    def adicionar_bloco(mat, nome):
        if mat is not None:
            blocos.append(mat)
            nomes_blocos.append(nome)

    adicionar_bloco(mat_scaled, "scaled_numericas")
    adicionar_bloco(mat_ohe, "ohe_categoricas")
    adicionar_bloco(mat_roteiro, "tfidf_roteiro")
    adicionar_bloco(mat_titulo, "tfidf_titulo")
    adicionar_bloco(mat_seo, "tfidf_seo")
    adicionar_bloco(mat_descricao, "tfidf_descricao")
    adicionar_bloco(mat_thumb, "tfidf_thumb")

    colunas_bool = [
        "tem_legenda_nativa",
        "conteudo_licenciado",
        "feito_para_criancas",
        "tem_repeticao_roteiro",
    ]
    colunas_bool_presentes = [c for c in colunas_bool if c in df.columns]
    if colunas_bool_presentes:
        mat_bool = df[colunas_bool_presentes].astype(int).values
        adicionar_bloco(mat_bool, "booleanas")

    blocos_esparsos = [sp.csr_matrix(b) for b in blocos]
    matriz_final = hstack(blocos_esparsos).tocsr()

    if np.isnan(matriz_final.data).any():
        raise ValueError("ERRO: NaN detectado na matriz final.")

    targets = df[["score_viral", "label_viral"]].copy()

    feature_names = {
        "blocos": nomes_blocos,
        "bool_colunas": colunas_bool_presentes,
        "shape": list(matriz_final.shape),
    }

    caminho_json = os.path.join(PASTA_PREPROCESSORS, "feature_names.json")
    with open(caminho_json, "w", encoding="utf-8") as f:
        json.dump(feature_names, f, ensure_ascii=False, indent=2)

    caminho_matriz = os.path.join(PASTA_PREPROCESSORS, "matriz_ml.pkl")
    with open(caminho_matriz, "wb") as f:
        pickle.dump({"X": matriz_final, "y": targets}, f)

    print(" Bloco 7 | montar_e_salvar_matriz_ml concluído")
    print(f"   Blocos concatenados : {nomes_blocos}")
    print(f"   Shape final         : {matriz_final.shape}")


# ════════════════════════════════════════════════════════════════════════════
# MAESTRO
# ════════════════════════════════════════════════════════════════════════════


def maestro_pre_processa() -> None:
    """
    Orquestra as partes em sequência:

    PARTE 1 — CSV OURO
      1. baixar_csv_prata()
      2. remover_colunas_inuteis()
      3. tratar_nulos_residuais()
      4. aplicar_log_metricas_engajamento()
      5. salvar_e_subir_ouro()
         → CSV ouro sobe com vibe_emojis e pistas_audio_en intactas
         → 03_treinamento.py vai ler esse CSV e usar essas colunas

    PARTE 2 — CONVERSÃO PARA MATRIZ ML
      6. converter_emojis_para_numerico()
      7. converter_audio_para_numerico()

    PARTE 3 — VETORIZAÇÃO E PREPROCESSORS
      8.  vetorizar_textos_roteiro()
      9.  vetorizar_titulo()
      10. vetorizar_seo()
      11. vetorizar_descricao()
      12. vetorizar_thumbnail()
      13. codificar_categoricas()
      14. escalar_numericas()
      15. montar_e_salvar_matriz_ml()
    """
    print("\n" + "=" * 55)
    print("🔧 INICIANDO PRÉ-PROCESSAMENTO")
    print("=" * 55)

    # ── PARTE 1 — CSV OURO ───────────────────────────────────
    print("\n── PARTE 1: GERANDO CSV OURO ──────────────────────────")

    df = baixar_csv_prata()

    if df is None or df.empty:
        print("ERRO: CSV prata vazio ou não carregado. Abortando.")
        return

    print(f"   CSV prata carregado: {df.shape[0]} linhas × {df.shape[1]} colunas")

    df = remover_colunas_inuteis(df)
    df = tratar_nulos_residuais(df)
    df = aplicar_log_metricas_engajamento(df)

    salvar_e_subir_ouro(df)

    # ── PARTE 2 — CONVERSÃO PARA MATRIZ ML ───────────────────
    print("\n── PARTE 2: CONVERSÃO PARA MATRIZ ML ──────────────────")

    df = converter_emojis_para_numerico(df)
    df = converter_audio_para_numerico(df)

    # ── PARTE 3 — VETORIZAÇÃO E PREPROCESSORS ────────────────
    print("\n── PARTE 3: VETORIZAÇÃO E PREPROCESSORS ───────────────")

    mat_roteiro, _ = vetorizar_textos_roteiro(df)
    mat_titulo, _ = vetorizar_titulo(df)
    mat_seo, _ = vetorizar_seo(df)
    mat_descricao, _ = vetorizar_descricao(df)
    mat_thumb, _ = vetorizar_thumbnail(df)
    mat_ohe, _ = codificar_categoricas(df)
    mat_scaled, _ = escalar_numericas(df)

    montar_e_salvar_matriz_ml(
        df,
        mat_roteiro,
        mat_titulo,
        mat_seo,
        mat_descricao,
        mat_thumb,
        mat_ohe,
        mat_scaled,
    )

    print("\n" + "=" * 55)
    print("✅ PRÉ-PROCESSAMENTO CONCLUÍDO")
    print("   CSV ouro no Supabase com vibe_emojis e pistas_audio_en intactas")
    print(f"   Preprocessors em: {PASTA_PREPROCESSORS}")
    print("=" * 55 + "\n")


if __name__ == "__main__":
    maestro_pre_processa()
