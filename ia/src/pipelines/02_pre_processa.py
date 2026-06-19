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

# ── Bloco 1 — Limpeza e Seleção de Colunas ──────────────────────────────────


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
        # Identificadores puros — causam viés de canal/vídeo
        "video_id",
        "canal_id",
        "canal_nome",
        # Textos brutos — substituídos pelas versões _en normalizadas
        "titulo",
        "descricao",
        "texto_falado",
        "texto_falado_limpo",
        # Colunas semânticas intermediárias — absorvidas em versões consolidadas
        "tags",
        "topicos_wikipedia",
        "categoria_id",
        "palavras_chave",
        "pistas_audio",
        # Temporal — já decomposta em dia_postagem, hora_postagem,
        # janela_postagem e idade_dias
        "data_publicacao",
        # URL sem valor preditivo
        "thumb_maxres",
        # Idioma menos confiável — idioma_audio_default é mais preciso
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
    Trata os nulos residuais apontados pelo verificador.
    Cada coluna recebe o valor neutro correto para seu tipo:
    - tipo_audio_dominante  : 'sem_audio' — ausência de pista é informação real
    - demais textos         : string vazia — vídeo sem fala/emoji/visual
                              produz vetor zero no TF-IDF, matematicamente correto
    """
    tratamentos = {
        # Categórica — ausência vira categoria própria no OHE
        "tipo_audio_dominante": "sem_audio",
        # Strings brutas — vazio é neutro para TF-IDF e contagens
        "vibe_emojis": "",
        "pistas_audio_en": "",
        "vocabulario_falado": "",
        "texto_falado_limpo_en": "",
        "gancho_primeira_frase": "",
        "descricao_visual_thumb": "",
        "texto_thumbnail": "",
    }

    for coluna, valor in tratamentos.items():
        if coluna in df.columns:
            nulos_antes = df[coluna].isna().sum()
            df[coluna] = df[coluna].fillna(valor)
            if nulos_antes > 0:
                print(f"   {coluna:<25}: {nulos_antes} nulos → '{valor}'")

    print(" Bloco 1 | tratar_nulos_residuais concluído")

    return df


# ── Bloco 2 — Transformação Logarítmica (Cauda Longa — Liu et al. 2025) ─────


def aplicar_log_metricas_engajamento(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aplica log1p nas métricas de engajamento com cauda pesada confirmada no EDA.
    log1p (log de 1+x) suporta zeros sem quebrar.
    Salva log_cols.json para que o endpoint online aplique
    a mesma transformação antes de escalar.

    Colunas transformadas:
    - visualizacoes  (skew=2.70)
    - curtidas       (skew=3.30)
    - comentarios    (skew=3.63)
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

    # Salva a lista para uso no endpoint online
    caminho_json = os.path.join(PASTA_PREPROCESSORS, "log_cols.json")
    with open(caminho_json, "w", encoding="utf-8") as f:
        json.dump(cols_transformadas, f, ensure_ascii=False, indent=2)

    print(" Bloco 2 | aplicar_log_metricas_engajamento concluído")
    print(f"   log_cols.json salvo em: {caminho_json}")

    return df


# ── Bloco 3 — Conversão de Strings em Features Numéricas ────────────────────


def converter_emojis_para_numerico(df: pd.DataFrame) -> pd.DataFrame:
    """
    Converte vibe_emojis (string bruta) em features numéricas universais.
    Usa o pacote emoji para extrair e classificar por grupo automaticamente.
    Sem hardcode — funciona para qualquer nicho, idioma ou cultura.

    Features geradas:
    - emoji_qtd_total    : total de emojis no vídeo
    - emoji_qtd_por_grupo: uma coluna por grupo único encontrado no dataset

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

    # Extrai contagens por grupo para cada vídeo
    contagens_series = df["vibe_emojis"].apply(extrair_contagens)

    # Total de emojis por vídeo
    df["emoji_qtd_total"] = contagens_series.apply(lambda x: sum(x.values()))

    # Uma coluna por grupo encontrado no dataset — totalmente automático
    df_grupos = pd.DataFrame(contagens_series.tolist(), index=df.index).fillna(0).astype(int)
    df_grupos.columns = [f"emoji_grp_{col.lower().replace(' ', '_').replace('-', '_')}" for col in df_grupos.columns]

    df = pd.concat([df, df_grupos], axis=1)
    df = df.drop(columns=["vibe_emojis"], errors="ignore")

    print(" Bloco 3 | converter_emojis_para_numerico concluído")
    print(f"   Features geradas : emoji_qtd_total + {len(df_grupos.columns)} grupos automáticos")
    print(f"   Grupos: {list(df_grupos.columns)}")
    print("   vibe_emojis removida após extração")

    return df


def converter_audio_para_numerico(df: pd.DataFrame) -> pd.DataFrame:
    """
    Converte pistas_audio_en (string bruta) em features binárias automáticas.
    Extrai todas as tags no formato [tag] via regex e gera uma coluna
    binária por tag única encontrada no dataset.
    Sem hardcode — funciona para qualquer nicho ou idioma.

    Features geradas:
    - audio_tem_qualquer : 1 se o vídeo tem qualquer pista de áudio
    - audio_tag_{nome}   : 1 por cada tag única encontrada no dataset

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

    # Flag geral — tem qualquer pista de áudio
    df["audio_tem_qualquer"] = tags_series.apply(lambda x: 1 if x else 0)

    # Uma coluna binária por tag única — totalmente automático
    todas_tags = sorted(set(tag for lista in tags_series for tag in lista))
    for tag in todas_tags:
        col = f"audio_tag_{tag.replace(' ', '_')}"
        df[col] = tags_series.apply(lambda x: 1 if tag in x else 0)

    df = df.drop(columns=["pistas_audio_en"], errors="ignore")

    print(" Bloco 3 | converter_audio_para_numerico concluído")
    print(f"   Features geradas : audio_tem_qualquer + {len(todas_tags)} tags automáticas")
    print(f"   Tags: {todas_tags}")
    print("   pistas_audio_en removida após extração")

    return df


# ── Bloco 4 — Salvar e Subir CSV Ouro ───────────────────────────────────────


def salvar_e_subir_ouro(df: pd.DataFrame) -> None:
    """
    Salva o CSV ouro em data/processed/ e sobe para o Supabase
    via subir_csv_ouro() do supabase_client.
    """
    print(" Bloco 4 | salvar_e_subir_ouro")
    print(f"   Shape final do ouro : {df.shape[0]} linhas × {df.shape[1]} colunas")
    print(f"   Colunas             : {df.columns.tolist()}")

    subir_csv_ouro(df)


# ════════════════════════════════════════════════════════════════════════════
# PARTE 2 — VETORIZAÇÃO E PREPROCESSORS
# ════════════════════════════════════════════════════════════════════════════

# ── Bloco 5 — Vetorização Semântica TF-IDF (Modelo 3M) ──────────────────────


def vetorizar_textos_roteiro(df: pd.DataFrame) -> tuple:
    """
    TF-IDF unificado das colunas de roteiro:
    - gancho_primeira_frase + vocabulario_falado + texto_falado_limpo_en
    Unificadas pois derivam do mesmo texto falado — vocabulário se sobrepõe.
    max_features=200, ngram_range=(1,2), min_df=2
    Salva tfidf_roteiro.pkl
    Retorna (matriz_esparsa, vetorizador)
    """
    colunas = ["gancho_primeira_frase", "vocabulario_falado", "texto_falado_limpo_en"]
    colunas_presentes = [c for c in colunas if c in df.columns]

    # Concatena as três colunas em um único texto por vídeo
    corpus = df[colunas_presentes].fillna("").apply(lambda row: " ".join(row.values.astype(str)), axis=1)

    vetorizador = TfidfVectorizer(
        max_features=200,
        ngram_range=(1, 2),
        min_df=2,
        strip_accents="unicode",
        lowercase=True,
    )

    matriz = vetorizador.fit_transform(corpus)

    caminho = os.path.join(PASTA_PREPROCESSORS, "tfidf_roteiro.pkl")
    with open(caminho, "wb") as f:
        pickle.dump(vetorizador, f)

    print(" Bloco 5 | vetorizar_textos_roteiro concluído")
    print(f"   Colunas unificadas : {colunas_presentes}")
    print(f"   Shape da matriz    : {matriz.shape}")
    print(f"   tfidf_roteiro.pkl salvo em: {caminho}")

    return matriz, vetorizador


def vetorizar_titulo(df: pd.DataFrame) -> tuple:
    """
    TF-IDF do titulo_en.
    ngram_range=(1,3) para capturar moldes de frase como
    'shorts comedy funny' confirmados no EDA.
    max_features=100, min_df=2
    Salva tfidf_titulo.pkl
    Retorna (matriz_esparsa, vetorizador)
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
    )

    matriz = vetorizador.fit_transform(corpus)

    caminho = os.path.join(PASTA_PREPROCESSORS, "tfidf_titulo.pkl")
    with open(caminho, "wb") as f:
        pickle.dump(vetorizador, f)

    print(" Bloco 5 | vetorizar_titulo concluído")
    print(f"   Shape da matriz : {matriz.shape}")
    print(f"   tfidf_titulo.pkl salvo em: {caminho}")

    return matriz, vetorizador


def vetorizar_seo(df: pd.DataFrame) -> tuple:
    """
    TF-IDF das palavras_chave_en.
    Consolida tags + tópicos Wikipedia + hashtags + categorias em um único vetor.
    max_features=150, ngram_range=(1,2), min_df=2
    Salva tfidf_seo.pkl
    Retorna (matriz_esparsa, vetorizador)
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
    )

    matriz = vetorizador.fit_transform(corpus)

    caminho = os.path.join(PASTA_PREPROCESSORS, "tfidf_seo.pkl")
    with open(caminho, "wb") as f:
        pickle.dump(vetorizador, f)

    print(" Bloco 5 | vetorizar_seo concluído")
    print(f"   Shape da matriz : {matriz.shape}")
    print(f"   tfidf_seo.pkl salvo em: {caminho}")

    return matriz, vetorizador


def vetorizar_descricao(df: pd.DataFrame) -> tuple:
    """
    TF-IDF da descricao_en.
    max_features=100, ngram_range=(1,2), min_df=2
    Salva tfidf_descricao.pkl
    Retorna (matriz_esparsa, vetorizador)
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
    )

    matriz = vetorizador.fit_transform(corpus)

    caminho = os.path.join(PASTA_PREPROCESSORS, "tfidf_descricao.pkl")
    with open(caminho, "wb") as f:
        pickle.dump(vetorizador, f)

    print(" Bloco 5 | vetorizar_descricao concluído")
    print(f"   Shape da matriz : {matriz.shape}")
    print(f"   tfidf_descricao.pkl salvo em: {caminho}")

    return matriz, vetorizador


def vetorizar_thumbnail(df: pd.DataFrame) -> tuple:
    """
    TF-IDF unificado de texto_thumbnail + descricao_visual_thumb.
    Unificadas pois ambas descrevem a capa — reduz esparsidade.
    max_features=100, ngram_range=(1,2), min_df=2
    Salva tfidf_thumb.pkl
    Retorna (matriz_esparsa, vetorizador)
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
    )

    matriz = vetorizador.fit_transform(corpus)

    caminho = os.path.join(PASTA_PREPROCESSORS, "tfidf_thumb.pkl")
    with open(caminho, "wb") as f:
        pickle.dump(vetorizador, f)

    print(" Bloco 5 | vetorizar_thumbnail concluído")
    print(f"   Colunas unificadas : {colunas_presentes}")
    print(f"   Shape da matriz    : {matriz.shape}")
    print(f"   tfidf_thumb.pkl salvo em: {caminho}")

    return matriz, vetorizador


# ── Bloco 6 — Codificação e Normalização ────────────────────────────────────


def codificar_categoricas(df: pd.DataFrame) -> tuple:
    """
    OneHotEncoder nas colunas categóricas nominais.
    handle_unknown='ignore' para o endpoint online não travar com valor novo.
    sparse_output=False para facilitar concatenação com o restante da matriz.
    Salva encoder_categoricas.pkl
    Retorna (matriz_densa, encoder)
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
    print(f"   encoder_categoricas.pkl salvo em: {caminho}")

    return matriz, encoder


def escalar_numericas(df: pd.DataFrame) -> tuple:
    """
    StandardScaler nas colunas numéricas pós-log onde aplicável.
    score_viral e label_viral ficam de fora — são targets, não features.
    Salva scaler_numericas.pkl
    Retorna (matriz_densa, scaler)
    """
    colunas = [
        # Engajamento (já com log1p aplicado)
        "visualizacoes",
        "curtidas",
        "comentarios",
        "velocidade_views",
        # Métricas calculadas
        "taxa_conversao",
        "taxa_discussao",
        "clickbait_score",
        "completude_seo",
        "ritmo_palavras_seg",
        "densidade_roteiro",
        # Temporais
        "idade_dias",
        "hora_postagem",
        # Formato
        "duracao_segundos",
        # Features geradas de emoji e áudio
        "emoji_qtd_total",
    ]

    # Inclui dinamicamente as colunas de grupos de emoji e tags de áudio
    # geradas automaticamente pelas funções anteriores
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
    print(f"   scaler_numericas.pkl salvo em: {caminho}")

    return matriz, scaler


# ── Bloco 7 — Montagem da Matriz Final e Persistência dos Preprocessors ─────


def montar_e_salvar_matriz_ml(df: pd.DataFrame, mat_roteiro, mat_titulo, mat_seo, mat_descricao, mat_thumb, mat_ohe, mat_scaled) -> None:
    """
    Concatena horizontalmente todos os blocos transformados em uma única
    matriz numérica homogênea pronta para o modelo.
    Mantém score_viral e label_viral como targets separados.
    Valida ausência de NaN e loga shape final.
    Salva feature_names.json com a ordem exata das colunas.
    """

    blocos = []
    nomes_blocos = []

    # Blocos densos e esparsos — trata os dois casos
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

    # Booleanas — cast para int, entram como bloco denso
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

    # Converte tudo para esparso para concatenar de forma eficiente
    blocos_esparsos = [sp.csr_matrix(b) for b in blocos]
    matriz_final = hstack(blocos_esparsos).tocsr()

    # Validação — nenhum NaN pode entrar no modelo
    if np.isnan(matriz_final.data).any():
        raise ValueError("ERRO: NaN detectado na matriz final. Verifique os blocos de transformação.")

    # Targets separados — não escalonados
    targets = df[["score_viral", "label_viral"]].copy()

    # Salva feature_names.json com a ordem exata dos blocos
    feature_names = {
        "blocos": nomes_blocos,
        "bool_colunas": colunas_bool_presentes,
        "shape": list(matriz_final.shape),
    }
    caminho_json = os.path.join(PASTA_PREPROCESSORS, "feature_names.json")
    with open(caminho_json, "w", encoding="utf-8") as f:
        json.dump(feature_names, f, ensure_ascii=False, indent=2)

    # Salva a matriz final como .pkl para o 03 carregar direto
    caminho_matriz = os.path.join(PASTA_PREPROCESSORS, "matriz_ml.pkl")
    with open(caminho_matriz, "wb") as f:
        pickle.dump({"X": matriz_final, "y": targets}, f)

    print(" Bloco 7 | montar_e_salvar_matriz_ml concluído")
    print(f"   Blocos concatenados : {nomes_blocos}")
    print(f"   Shape final         : {matriz_final.shape}")
    print(f"   feature_names.json salvo em: {caminho_json}")
    print(f"   matriz_ml.pkl salvo em: {caminho_matriz}")


# ════════════════════════════════════════════════════════════════════════════
# MAESTRO
# ════════════════════════════════════════════════════════════════════════════


def maestro_pre_processa() -> None:
    """
    Orquestra as duas partes em sequência:

    PARTE 1 — CSV OURO
      1. baixar_csv_prata()
      2. remover_colunas_inuteis()
      3. tratar_nulos_residuais()
      4. aplicar_log_metricas_engajamento()
      5. converter_emojis_para_numerico()
      6. converter_audio_para_numerico()
      7. salvar_e_subir_ouro()

    PARTE 2 — VETORIZAÇÃO E PREPROCESSORS
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
    df = converter_emojis_para_numerico(df)
    df = converter_audio_para_numerico(df)

    salvar_e_subir_ouro(df)

    # ── PARTE 2 — VETORIZAÇÃO E PREPROCESSORS ────────────────
    print("\n── PARTE 2: VETORIZAÇÃO E PREPROCESSORS ───────────────")

    mat_roteiro, vec_roteiro = vetorizar_textos_roteiro(df)
    mat_titulo, vec_titulo = vetorizar_titulo(df)
    mat_seo, vec_seo = vetorizar_seo(df)
    mat_descricao, vec_desc = vetorizar_descricao(df)
    mat_thumb, vec_thumb = vetorizar_thumbnail(df)
    mat_ohe, encoder = codificar_categoricas(df)
    mat_scaled, scaler = escalar_numericas(df)

    montar_e_salvar_matriz_ml(df, mat_roteiro, mat_titulo, mat_seo, mat_descricao, mat_thumb, mat_ohe, mat_scaled)

    print("\n" + "=" * 55)
    print("✅ PRÉ-PROCESSAMENTO CONCLUÍDO")
    print("   CSV ouro no Supabase")
    print(f"   Preprocessors em: {PASTA_PREPROCESSORS}")
    print("=" * 55 + "\n")


if __name__ == "__main__":
    maestro_pre_processa()
