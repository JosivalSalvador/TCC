"""
analisar_texto_colunas_novas.py  — v3.0 (objetivo-driven + ML)
===============================================================
EDA profundo orientado a dois objetivos concretos por coluna:
    1. REPLICAR — fórmula exata do conteúdo viral
    2. ROTEIRO  — moldes e diretrizes acionáveis para gerar novo conteúdo

Melhorias v3.0 vs v2.0
-----------------------
- TF-IDF substitui contagem bruta em TODOS os módulos de léxico
  (elimina stopwords matematicamente; valoriza termos discriminativos)
- RandomForest feature_importance por coluna x label_viral
  (sabe exatamente quais variáveis causam viralidade)
- KMeans nos ganchos e títulos → clusters reais de fórmulas
  (os dados revelam os padrões, não regex hardcoded)
- TF-IDF exclusivo super_viral vs frio em cada módulo
- Bigrams/Trigrams rodados sobre texto já filtrado de stopwords
- Arco emocional VADER por terço do roteiro
- Perfil textual comparativo super_viral x frio em todas as dimensões
- _tokenizar() agora SEMPRE filtra stopwords (nltk + extra)
- _tokenizar_raw() mantido apenas para métricas de comprimento

Ponto de entrada público
------------------------
    analisar_texto_colunas_novas(df_nicho, pasta_img_nicho, nicho)
"""

from __future__ import annotations

import os
import re
import unicodedata
import warnings
from collections import Counter
from itertools import combinations

import emoji
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

# ── scikit-learn (TF-IDF, KMeans, RandomForest) ──────────────
try:
    from sklearn.cluster import KMeans
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.preprocessing import LabelEncoder

    _SKLEARN_OK = True
except ImportError:
    _SKLEARN_OK = False

# ── langdetect ────────────────────────────────────────────────
try:
    from langdetect import DetectorFactory
    from langdetect import detect as _langdetect_detect

    DetectorFactory.seed = 0
    _LANGDETECT_OK = True
except ImportError:
    _LANGDETECT_OK = False

# ── nltk (stopwords + VADER) ──────────────────────────────────
try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.sentiment import SentimentIntensityAnalyzer

    try:
        _STOPWORDS_EN = set(stopwords.words("english"))
    except LookupError:
        nltk.download("stopwords", quiet=True)
        _STOPWORDS_EN = set(stopwords.words("english"))
    try:
        _SIA = SentimentIntensityAnalyzer()
    except LookupError:
        nltk.download("vader_lexicon", quiet=True)
        _SIA = SentimentIntensityAnalyzer()
    _NLTK_OK = True
except Exception:
    _STOPWORDS_EN = set()
    _SIA = None
    _NLTK_OK = False

warnings.filterwarnings("ignore", message="Glyph.*missing from font")
warnings.filterwarnings("ignore", message="Matplotlib currently does not support")
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)


# ─────────────────────────────────────────────────────────────
# CONSTANTES
# ─────────────────────────────────────────────────────────────

_MIN_TOKEN = 3
_TOP_N_VOCAB = 20
_TOP_N_NGRAM = 15
_N_CLUSTERS = 5

# Stopwords expandidas: inglês NLTK + termos genéricos de transcrição/YouTube
# Aplicadas em _tokenizar() e em todos os TfidfVectorizer do arquivo
_SW_EXTRA = {
    "like",
    "just",
    "know",
    "going",
    "get",
    "got",
    "one",
    "make",
    "made",
    "want",
    "really",
    "right",
    "good",
    "think",
    "look",
    "say",
    "said",
    "time",
    "way",
    "come",
    "back",
    "even",
    "well",
    "much",
    "also",
    "take",
    "use",
    "used",
    "new",
    "actually",
    "yeah",
    "okay",
    "hey",
    "let",
    "see",
    "need",
    "thing",
    "things",
    "something",
    "everything",
    "nothing",
    "someone",
    "everyone",
    "nobody",
    "every",
    "many",
    "little",
    "big",
    "great",
    "best",
    "first",
    "last",
    "next",
    "lot",
    "bit",
    # transcrição / YouTube
    "video",
    "channel",
    "subscribe",
    "comment",
    "watch",
    "watching",
    "today",
    "show",
    "tell",
    "talking",
}


def _get_stopwords() -> set:
    """Retorna stopwords completas: NLTK EN + _SW_EXTRA."""
    return _STOPWORDS_EN | _SW_EXTRA


_PAL = {
    "azul": "#3498db",
    "verde": "#2ecc71",
    "vermelho": "#e74c3c",
    "laranja": "#f39c12",
    "roxo": "#8e44ad",
    "verde_e": "#16a085",
    "laranja_e": "#e67e22",
    "cinza": "#95a5a6",
}
_COR_MED = _PAL["vermelho"]
_COR_IQR = _PAL["laranja"]
_COR_OUTER = _PAL["roxo"]

_ORDEM_VIRAL = ["frio", "aquecido", "viral", "super_viral"]
_CORES_VIRAL = ["#95a5a6", "#f39c12", "#e74c3c", "#8e44ad"]


# ─────────────────────────────────────────────────────────────
# HELPERS BASE
# ─────────────────────────────────────────────────────────────


def _salvar(fig: plt.Figure, pasta: str, nome: str) -> None:
    """Salva figura e fecha."""
    fig.savefig(os.path.join(pasta, nome), dpi=110, bbox_inches="tight")
    plt.close(fig)


def _tokenizar_raw(texto: str) -> list[str]:
    """
    Tokens alfanuméricos ≥ MIN_TOKEN, sem URLs/tags/mentions.
    SEM filtro de stopwords — usar SOMENTE para métricas de comprimento
    (char count, token count) onde queremos o texto real.
    """
    s = re.sub(r"https?://\S+", " ", str(texto))
    s = re.sub(r"\[.*?\]|\(.*?\)", " ", s)
    s = re.sub(r"[#@]\w+", " ", s)
    return [t for t in re.findall(r"\w+", s.lower()) if len(t) >= _MIN_TOKEN]


def _tokenizar(texto: str) -> list[str]:
    """
    Tokens filtrados por stopwords completas (_get_stopwords()).
    Usar em TODAS as análises de conteúdo: TF-IDF, n-gramas, TTR, léxico.
    Esta é a função padrão — nunca usar _tokenizar_raw para análise de conteúdo.
    """
    sw = _get_stopwords()
    return [t for t in _tokenizar_raw(texto) if t not in sw]


def _tokenizar_frases(texto: str) -> list[str]:
    """Divide o texto em frases aproximadas por pontuação."""
    return [f.strip() for f in re.split(r"[.!?]+", str(texto)) if len(f.strip()) > 5]


def _ngramas(tokens: list[str], n: int) -> list[tuple]:
    """Gera n-gramas a partir de lista de tokens."""
    return list(zip(*[tokens[i:] for i in range(n)]))


def _ttr(tokens: list[str]) -> float:
    """Type-Token Ratio: riqueza lexical (0–1). Requer tokens já filtrados."""
    if not tokens:
        return 0.0
    return len(set(tokens)) / len(tokens)


def _sentimento_vader(texto: str) -> tuple[float, str]:
    """Retorna (compound, label). Label: positivo/negativo/neutro."""
    if _SIA is None or not str(texto).strip():
        return 0.0, "neutro"
    compound = _SIA.polarity_scores(str(texto))["compound"]
    label = "positivo" if compound >= 0.05 else "negativo" if compound <= -0.05 else "neutro"
    return compound, label


def _detectar_script(texto: str) -> str:
    """Detecta script Unicode dominante (latin, cyrillic, arabic, cjk, etc.)."""
    cont: Counter = Counter()
    for ch in str(texto):
        if not ch.isalpha():
            continue
        try:
            nome = unicodedata.name(ch, "")
        except (ValueError, TypeError):
            continue
        if "LATIN" in nome:
            cont["latin"] += 1
        elif "CYRILLIC" in nome:
            cont["cyrillic"] += 1
        elif "ARABIC" in nome:
            cont["arabic"] += 1
        elif any(x in nome for x in ("CJK", "HIRAGANA", "KATAKANA")):
            cont["cjk"] += 1
        elif "DEVANAGARI" in nome:
            cont["devanagari"] += 1
        elif "HANGUL" in nome:
            cont["hangul"] += 1
        elif "HEBREW" in nome:
            cont["hebrew"] += 1
        elif "THAI" in nome:
            cont["thai"] += 1
        elif "GREEK" in nome:
            cont["greek"] += 1
        else:
            cont["outros"] += 1
    if not cont:
        return "ascii_only"
    dom, qtd = cont.most_common(1)[0]
    return dom if qtd / sum(cont.values()) >= 0.80 else "mixed"


def _detectar_idioma(texto: str) -> str:
    """Detecta idioma via langdetect. Fallback: 'desconhecido'."""
    if not _LANGDETECT_OK:
        return "desconhecido"
    try:
        amostra = str(texto).strip()[:500]
        if len(amostra) < 10:
            return "desconhecido"
        return _langdetect_detect(amostra)
    except Exception:
        return "desconhecido"


# ─────────────────────────────────────────────────────────────
# HELPERS DE GRÁFICO
# ─────────────────────────────────────────────────────────────


def _grafico_barras_h(
    labels: list,
    vals: list,
    titulo: str,
    xlabel: str,
    pasta: str,
    nome_arquivo: str,
    cor: str = "#2980b9",
    suptitle: str | None = None,
) -> None:
    if not labels or not vals:
        return
    altura = max(4, len(labels) * 0.52 + 1.5)
    fig, ax = plt.subplots(figsize=(11, altura))
    if suptitle:
        fig.suptitle(suptitle, fontsize=11, fontweight="bold")
    bars = ax.barh(labels[::-1], vals[::-1], color=cor, edgecolor="white", height=0.6)
    ax.set_xlabel(xlabel)
    ax.set_title(titulo, fontsize=10, fontweight="bold")
    ax.set_xlim(0, max(vals) * 1.30)
    for bar, v in zip(bars, vals[::-1]):
        ax.text(
            bar.get_width() + max(vals) * 0.01,
            bar.get_y() + bar.get_height() / 2,
            str(round(v, 4)) if isinstance(v, float) else str(v),
            va="center",
            fontsize=8,
        )
    plt.tight_layout()
    _salvar(fig, pasta, nome_arquivo)


def _boxplot_por_grupo(
    df: pd.DataFrame,
    col_valor: str,
    col_grupo: str,
    ordem: list,
    titulo: str,
    ylabel: str,
    pasta: str,
    nome: str,
    palette: list | None = None,
) -> None:
    grupos = [g for g in ordem if g in df[col_grupo].values]
    if not grupos:
        return
    fig, ax = plt.subplots(figsize=(10, max(4, len(grupos) * 0.8 + 1.5)))
    dados = [df.loc[df[col_grupo] == g, col_valor].dropna().values for g in grupos]
    bp = ax.boxplot(
        dados,
        vert=False,
        patch_artist=True,
        medianprops=dict(color="#e74c3c", linewidth=2),
        whiskerprops=dict(linestyle="--", linewidth=1),
        flierprops=dict(marker="o", markersize=3, alpha=0.4),
    )
    cores = palette or _CORES_VIRAL[: len(grupos)]
    for patch, cor in zip(bp["boxes"], cores):
        patch.set_facecolor(cor)
        patch.set_alpha(0.7)
    ax.set_yticks(range(1, len(grupos) + 1))
    ax.set_yticklabels(grupos)
    ax.set_xlabel(ylabel)
    ax.set_title(titulo, fontsize=10, fontweight="bold")
    fig.suptitle(f"{col_valor} × {col_grupo}", fontsize=11, fontweight="bold")
    plt.tight_layout()
    _salvar(fig, pasta, nome)


def _barras_agrupadas_viral(
    df: pd.DataFrame,
    col: str,
    pasta: str,
    nome: str,
    titulo: str,
    xlabel: str,
    col_viral: str = "label_viral",
) -> None:
    if col_viral not in df.columns or col not in df.columns:
        return
    grupos = [g for g in _ORDEM_VIRAL if g in df[col_viral].values]
    medias = [df.loc[df[col_viral] == g, col].mean() for g in grupos]
    if not medias or max(medias) == 0:
        return
    cores = [c for c, g in zip(_CORES_VIRAL, _ORDEM_VIRAL) if g in grupos]
    fig, ax = plt.subplots(figsize=(9, max(3, len(grupos) * 0.8 + 1)))
    bars = ax.barh(grupos[::-1], medias[::-1], color=cores[::-1], edgecolor="white", height=0.6)
    ax.set_xlabel(xlabel)
    ax.set_title(titulo, fontsize=10, fontweight="bold")
    ax.set_xlim(0, max(medias) * 1.3)
    for bar, v in zip(bars, medias[::-1]):
        ax.text(
            bar.get_width() + max(medias) * 0.01,
            bar.get_y() + bar.get_height() / 2,
            f"{v:.2f}",
            va="center",
            fontsize=9,
        )
    plt.tight_layout()
    _salvar(fig, pasta, nome)


def _grafico_idioma_duplo(
    cnt_script,
    cnt_idioma,
    n: int,
    titulo: str,
    pasta: str,
    nome: str,
) -> None:
    n_sc = len(cnt_script)
    n_id = len(cnt_idioma)
    altura = max(4, max(n_sc, n_id) * 0.48 + 1.5)
    fig, axes = plt.subplots(1, 2, figsize=(14, altura))
    fig.suptitle(titulo, fontsize=11, fontweight="bold")
    for ax, cnt, cor, rotulo in [
        (axes[0], cnt_script, "#1abc9c", "Script Unicode"),
        (axes[1], cnt_idioma, "#2980b9", "Idioma (langdetect)"),
    ]:
        labels = list(cnt.index)
        vals = cnt.values
        ax.barh(labels[::-1], vals[::-1], color=cor, edgecolor="white", height=0.6)
        ax.set_xlabel("nº de entradas")
        ax.set_title(rotulo)
        ax.set_xlim(0, vals.max() * 1.3)
        for i, v in enumerate(vals[::-1]):
            ax.text(v + vals.max() * 0.01, i, f"{v} ({v / n * 100:.1f}%)", va="center", fontsize=8)
    plt.tight_layout()
    _salvar(fig, pasta, nome)


# ─────────────────────────────────────────────────────────────
# HELPERS ML (TF-IDF, KMeans, RandomForest)
# ─────────────────────────────────────────────────────────────


def _tfidf_top_terms(
    corpus: list[str],
    top_n: int = _TOP_N_VOCAB,
    extra_stopwords: set | None = None,
) -> list[tuple[str, float]]:
    if not _SKLEARN_OK or len(corpus) < 2:
        return []
    sw = list(_get_stopwords() | (extra_stopwords or set()))
    try:
        vec = TfidfVectorizer(
            max_features=300,
            stop_words=sw,
            token_pattern=r"(?u)\b[a-z]{3,}\b",
            ngram_range=(1, 1),
            sublinear_tf=True,
        )
        X = vec.fit_transform(corpus)
        scores = np.asarray(X.mean(axis=0)).flatten()
        terms = vec.get_feature_names_out()
        ordem = scores.argsort()[::-1][:top_n]
        return [(terms[i], float(scores[i])) for i in ordem]
    except Exception:
        return []


def _tfidf_exclusivos(
    corpus_a: list[str],
    corpus_b: list[str],
    top_n: int = 10,
) -> tuple[list, list]:
    if not _SKLEARN_OK or len(corpus_a) < 2 or len(corpus_b) < 2:
        return [], []
    sw = list(_get_stopwords())
    try:
        vec = TfidfVectorizer(
            max_features=500,
            stop_words=sw,
            token_pattern=r"(?u)\b[a-z]{3,}\b",
            sublinear_tf=True,
        )
        X = vec.fit_transform(corpus_a + corpus_b)
        terms = vec.get_feature_names_out()
        xa = np.asarray(X[: len(corpus_a)].mean(axis=0)).flatten()
        xb = np.asarray(X[len(corpus_a) :].mean(axis=0)).flatten()
        diff_a = xa - xb
        diff_b = xb - xa
        top_a = [(terms[i], float(diff_a[i])) for i in diff_a.argsort()[::-1][:top_n]]
        top_b = [(terms[i], float(diff_b[i])) for i in diff_b.argsort()[::-1][:top_n]]
        return top_a, top_b
    except Exception:
        return [], []


def _kmeans_clusters(
    corpus: list[str],
    n_clusters: int = _N_CLUSTERS,
    indices: list | None = None,
) -> dict | None:
    if not _SKLEARN_OK or len(corpus) < n_clusters * 2:
        return None
    sw = list(_get_stopwords())
    try:
        vec = TfidfVectorizer(
            max_features=200,
            stop_words=sw,
            token_pattern=r"(?u)\b[a-z]{3,}\b",
            sublinear_tf=True,
        )
        X = vec.fit_transform(corpus)
        km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = km.fit_predict(X)
        terms = vec.get_feature_names_out()
        result = {}
        for cid in range(n_clusters):
            mask = labels == cid
            center = km.cluster_centers_[cid]
            top_idx = center.argsort()[::-1][:6]
            top_tms = [terms[i] for i in top_idx]
            amostras = [corpus[i] for i, m in enumerate(mask) if m][:3]
            result[cid] = {
                "n": int(mask.sum()),
                "termos": top_tms,
                "amostras": amostras,
                "labels": labels,
            }
            if indices is not None:
                result[cid]["indices"] = [indices[i] for i, m in enumerate(mask) if m]
        return result
    except Exception:
        return None


def _rf_feature_importance(
    df: pd.DataFrame,
    col_viral: str = "label_viral",
    pasta: str = "",
    nome: str = "",
    titulo: str = "",
    nicho: str = "",
) -> None:
    if not _SKLEARN_OK:
        return
    cols_feat = [c for c in df.columns if c != col_viral and pd.api.types.is_numeric_dtype(df[c])]
    if len(cols_feat) < 2:
        return
    df_rf = df[[col_viral] + cols_feat].dropna()
    if len(df_rf) < 20:
        return
    grupos = [g for g in _ORDEM_VIRAL if g in df_rf[col_viral].values]
    if len(grupos) < 2:
        return
    try:
        le = LabelEncoder()
        y = le.fit_transform(df_rf[col_viral])
        X = df_rf[cols_feat].values
        rf = RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)
        rf.fit(X, y)
        imp = rf.feature_importances_
        pares = sorted(zip(cols_feat, imp), key=lambda x: -x[1])
        print(f"\n    [RF] Feature importance → {col_viral}:")
        for col, v in pares:
            print(f"      {col:35s}: {v:.4f}")
        if pasta and nome:
            labels_fi = [c for c, _ in pares]
            vals_fi = [float(v) for _, v in pares]
            _grafico_barras_h(
                labels_fi,
                vals_fi,
                titulo=titulo or "Feature Importance (RandomForest) → label_viral",
                xlabel="importance",
                pasta=pasta,
                nome_arquivo=nome,
                cor=_PAL["roxo"],
                suptitle=f"RF Feature Importance — {nicho.upper()}",
            )
            print(f"    [+] {nome}")
    except Exception as e:
        print(f"    [RF] erro: {e}")


# ─────────────────────────────────────────────────────────────
# MÓDULO 1 — gancho_primeira_frase
# ─────────────────────────────────────────────────────────────


def analisar_gancho_primeira_frase(
    serie: pd.Series,
    pasta: str,
    nicho: str,
    df_nicho: pd.DataFrame | None = None,
) -> None:
    n = len(serie)
    label = nicho.upper()
    print(f"\n  [GANCHO] n={n}")

    # ── Comprimento ─────────────────────────────────────────
    comp_chars = serie.str.len()
    comp_tokens = serie.apply(lambda t: len(_tokenizar_raw(t)))
    med_chars = comp_chars.median()
    sem_gancho = (serie.str.strip() == "").sum()

    print(f"    Comprimento — mediana: {med_chars:.0f} chars | sem gancho: {sem_gancho} ({sem_gancho / n * 100:.1f}%)")

    pcts_c = {p: comp_chars.quantile(p / 100) for p in [10, 25, 75, 90]}

    fig, ax = plt.subplots(figsize=(10, 4))
    fig.suptitle(f"Gancho — Comprimento  [{label}]  (n={n})", fontsize=11, fontweight="bold")
    ax.hist(comp_chars, bins=30, color=_PAL["azul"], edgecolor="white", lw=0.3)
    for p, cor, ls in [(10, _COR_OUTER, "-."), (25, _COR_IQR, ":"), (75, _COR_IQR, ":"), (90, _COR_OUTER, "-.")]:
        ax.axvline(pcts_c[p], color=cor, linestyle=ls, lw=1.2, label=f"P{p}:{pcts_c[p]:.0f}")
    ax.axvline(med_chars, color=_COR_MED, linestyle="--", lw=1.8, label=f"Med:{med_chars:.0f}")
    ax.set_xlabel("chars")
    ax.set_ylabel("freq")
    ax.legend(fontsize=7)
    plt.tight_layout()
    _salvar(fig, pasta, "nlp_gancho_comprimento.png")
    print("    [+] nlp_gancho_comprimento.png")

    # ── TF-IDF léxico ────────────────────────────────────────
    corpus = serie.tolist()
    top_tfidf = _tfidf_top_terms(corpus)

    if top_tfidf:
        print("\n    Top termos TF-IDF no gancho:")
        for t, v in top_tfidf[:10]:
            print(f"      {t:20s}: {v:.4f}")
        _grafico_barras_h(
            [t for t, _ in top_tfidf],
            [round(v, 4) for _, v in top_tfidf],
            titulo=f"Top {_TOP_N_VOCAB} termos TF-IDF (gancho)",
            xlabel="TF-IDF médio",
            pasta=pasta,
            nome_arquivo="nlp_gancho_tfidf.png",
            cor=_PAL["vermelho"],
            suptitle=f"Gancho — TF-IDF  [{label}]",
        )
        print("    [+] nlp_gancho_tfidf.png")

    # ── N-gramas TF-IDF ──────────────────────────────────────
    if _SKLEARN_OK:
        try:
            sw = list(_get_stopwords())

            vec_bi = TfidfVectorizer(
                ngram_range=(2, 2),
                max_features=200,
                stop_words=sw,
                token_pattern=r"(?u)\b[a-z]{3,}\b",
                sublinear_tf=True,
            )
            vec_tr = TfidfVectorizer(
                ngram_range=(3, 3),
                max_features=200,
                stop_words=sw,
                token_pattern=r"(?u)\b[a-z]{3,}\b",
                sublinear_tf=True,
            )

            Xbi = vec_bi.fit_transform(corpus)
            Xtr = vec_tr.fit_transform(corpus)
            sc_bi = np.asarray(Xbi.mean(axis=0)).flatten()
            sc_tr = np.asarray(Xtr.mean(axis=0)).flatten()
            tms_bi = vec_bi.get_feature_names_out()
            tms_tr = vec_tr.get_feature_names_out()

            top_bi = [(tms_bi[i], float(sc_bi[i])) for i in sc_bi.argsort()[::-1][:_TOP_N_NGRAM]]
            top_tr = [(tms_tr[i], float(sc_tr[i])) for i in sc_tr.argsort()[::-1][:_TOP_N_NGRAM]]

            if top_bi or top_tr:
                altura = max(4, max(len(top_bi), len(top_tr)) * 0.45 + 1.5)
                fig, axes = plt.subplots(1, 2, figsize=(18, altura))
                fig.suptitle(
                    f"Gancho — N-gramas TF-IDF (moldes de abertura)  [{label}]",
                    fontsize=11,
                    fontweight="bold",
                )

                for ax_ng, top_ng, cor_ng, nm_ng in [
                    (axes[0], top_bi, _PAL["azul"], f"Top {len(top_bi)} Bigrams"),
                    (axes[1], top_tr, _PAL["verde_e"], f"Top {len(top_tr)} Trigrams"),
                ]:
                    if not top_ng:
                        continue
                    ls = [t for t, _ in top_ng]
                    vs = [v for _, v in top_ng]
                    ax_ng.barh(ls[::-1], vs[::-1], color=cor_ng, edgecolor="white", height=0.6)
                    ax_ng.set_title(nm_ng)
                    ax_ng.set_xlabel("TF-IDF médio")
                    ax_ng.set_xlim(0, max(vs) * 1.3)
                    for i, v in enumerate(vs[::-1]):
                        ax_ng.text(v + max(vs) * 0.01, i, f"{v:.4f}", va="center", fontsize=8)

                plt.tight_layout()
                _salvar(fig, pasta, "nlp_gancho_ngramas.png")
                print("    [+] nlp_gancho_ngramas.png")

        except Exception as e:
            print(f"    [skip ngrams gancho] {e}")

    # ── Padrões sintáticos de abertura ───────────────────────
    _INTERROGATIVAS = re.compile(
        r"^(what|who|why|how|when|where|which|is|are|do|did|will|can|would|should|have)\b",
        re.I,
    )
    _IMPERATIVOS = re.compile(
        r"^(stop|never|don't|avoid|forget|quit|start|try|make|look|watch|come|get|take|check|find|use|learn|save|discover)\b",
        re.I,
    )
    _PROBLEMA = re.compile(
        r"\b(wrong|fail|mistake|bad|worse|worst|problem|issue|broken|danger|warning|risk)\b",
        re.I,
    )
    _PROMESSA = re.compile(
        r"\b(secret|truth|reveal|hack|trick|easy|simple|best|ultimate|proven|guaranteed|works)\b",
        re.I,
    )
    _POLEMIC = re.compile(
        r"\b(nobody|everyone|always|never|most people|lie|myth|actually|real reason|exposed)\b",
        re.I,
    )

    padroes = {
        "❓ Pergunta direta": serie.apply(lambda t: bool(_INTERROGATIVAS.match(str(t).strip()))).sum(),
        "⚡ Imperativo/ação": serie.apply(lambda t: bool(_IMPERATIVOS.match(str(t).strip()))).sum(),
        "🚨 Sinaliza problema": serie.str.contains(_PROBLEMA.pattern, case=False, na=False, regex=True).sum(),
        "💡 Promessa/segredo": serie.str.contains(_PROMESSA.pattern, case=False, na=False, regex=True).sum(),
        "🔥 Polêmico/mito": serie.str.contains(_POLEMIC.pattern, case=False, na=False, regex=True).sum(),
        "🔢 Número no início": serie.str.match(r"^\d", na=False).sum(),
        "❗ Reticências emocionais": serie.str.contains(r"[?!]", na=False).sum(),
    }
    pct_padroes = {k: v / n * 100 for k, v in padroes.items()}

    print("\n    Fórmulas psicológicas de abertura:")
    for k, v in pct_padroes.items():
        print(f"      {k:35s}: {v:5.1f}%  (n={padroes[k]})")

    fig, ax = plt.subplots(figsize=(10, max(4, len(padroes) * 0.65 + 1)))
    fig.suptitle(f"Gancho — Fórmulas Psicológicas de Abertura  [{label}]", fontsize=11, fontweight="bold")
    pks = list(pct_padroes.keys())
    pvs = list(pct_padroes.values())
    cores_p = [_PAL["vermelho"] if v > 30 else _PAL["laranja"] if v > 10 else _PAL["verde"] for v in pvs]
    bars = ax.barh(pks[::-1], pvs[::-1], color=cores_p[::-1], edgecolor="white", height=0.6)
    ax.set_xlabel("% dos ganchos")
    ax.axvline(30, color="gray", linestyle="--", lw=0.8)
    ax.set_xlim(0, max(pvs + [30]) * 1.3)
    for bar, v in zip(bars, pvs[::-1]):
        ax.text(
            bar.get_width() + 0.5,
            bar.get_y() + bar.get_height() / 2,
            f"{v:.1f}%",
            va="center",
            fontsize=9,
        )
    plt.tight_layout()
    _salvar(fig, pasta, "nlp_gancho_padroes.png")
    print("    [+] nlp_gancho_padroes.png")

    # ── KMeans — clusters de fórmulas ────────────────────────
    corpus_valido = [t for t in serie if t.strip()]
    clusters = _kmeans_clusters(
        corpus_valido,
        n_clusters=min(_N_CLUSTERS, max(2, len(corpus_valido) // 5)),
    )

    if clusters:
        print(f"\n    KMeans — {len(clusters)} clusters de fórmulas de gancho:")
        for cid, info in clusters.items():
            print(f"      Cluster {cid + 1} (n={info['n']}): {', '.join(info['termos'][:5])}")
            for a in info["amostras"][:2]:
                print(f'        → "{a[:70]}"')

        cids = [f"Cluster {c + 1}\n{info['n']} ganchos" for c, info in clusters.items()]
        sizes = [info["n"] for info in clusters.values()]
        descr = [", ".join(info["termos"][:3]) for info in clusters.values()]

        fig, ax = plt.subplots(figsize=(10, max(4, len(clusters) * 0.9 + 1.5)))
        fig.suptitle(f"Gancho — Clusters TF-IDF (KMeans)  [{label}]", fontsize=11, fontweight="bold")
        bars = ax.barh(cids[::-1], sizes[::-1], color=_PAL["roxo"], edgecolor="white", height=0.6)
        for bar, v, lbl in zip(bars, sizes[::-1], descr[::-1]):
            ax.text(
                bar.get_width() + max(sizes) * 0.01,
                bar.get_y() + bar.get_height() / 2,
                f"{v}  [{lbl}]",
                va="center",
                fontsize=8,
            )
        ax.set_xlabel("nº de ganchos")
        ax.set_xlim(0, max(sizes) * 2.2)
        ax.set_title("Cada cluster = uma fórmula de abertura distinta")
        plt.tight_layout()
        _salvar(fig, pasta, "nlp_gancho_clusters.png")
        print("    [+] nlp_gancho_clusters.png")

    # ── Sentimento VADER ─────────────────────────────────────
    if _NLTK_OK:
        compounds = serie.apply(lambda t: _sentimento_vader(t)[0])
        labels_sent = serie.apply(lambda t: _sentimento_vader(t)[1])
        dist_sent = labels_sent.value_counts()
        med_comp = compounds.median()

        print(f"\n    Sentimento VADER — mediana compound: {med_comp:.3f}")
        print(f"    Distribuição: {dist_sent.to_dict()}")

        fig, axes = plt.subplots(1, 2, figsize=(13, 4))
        fig.suptitle(f"Gancho — Sentimento VADER  [{label}]", fontsize=11, fontweight="bold")

        axes[0].hist(compounds, bins=25, color=_PAL["azul"], edgecolor="white", lw=0.3)
        axes[0].axvline(med_comp, color=_COR_MED, linestyle="--", lw=1.8, label=f"Med:{med_comp:.3f}")
        axes[0].axvline(0.05, color="green", linestyle=":", lw=1.2, label="+0.05 positivo")
        axes[0].axvline(-0.05, color="orange", linestyle=":", lw=1.2, label="-0.05 negativo")
        axes[0].set_xlabel("VADER compound")
        axes[0].set_ylabel("freq")
        axes[0].legend(fontsize=8)

        cats_s = list(dist_sent.index)
        vals_s = list(dist_sent.values)
        cores_s = {"positivo": "#2ecc71", "negativo": "#e74c3c", "neutro": "#95a5a6"}
        axes[1].bar(
            cats_s,
            vals_s,
            color=[cores_s.get(c, "#3498db") for c in cats_s],
            edgecolor="white",
            width=0.5,
        )
        axes[1].set_ylabel("nº de ganchos")
        axes[1].set_ylim(0, max(vals_s) * 1.3)
        for bar, v in zip(axes[1].patches, vals_s):
            axes[1].text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + max(vals_s) * 0.02,
                f"{v} ({v / n * 100:.1f}%)",
                ha="center",
                fontsize=9,
                fontweight="bold",
            )

        plt.tight_layout()
        _salvar(fig, pasta, "nlp_gancho_sentimento.png")
        print("    [+] nlp_gancho_sentimento.png")

    # ── Correlação × viralidade + RF ─────────────────────────
    if df_nicho is not None and "label_viral" in df_nicho.columns:
        df_v = df_nicho[["label_viral"]].copy()
        df_v["gancho_chars"] = comp_chars.values
        df_v["gancho_tokens"] = comp_tokens.values
        df_v["gancho_pergunta"] = serie.apply(lambda t: bool(_INTERROGATIVAS.match(str(t).strip()))).astype(int).values
        df_v["gancho_imperativo"] = serie.apply(lambda t: bool(_IMPERATIVOS.match(str(t).strip()))).astype(int).values
        df_v["gancho_problema"] = serie.str.contains(_PROBLEMA.pattern, case=False, na=False, regex=True).astype(int).values
        df_v["gancho_promessa"] = serie.str.contains(_PROMESSA.pattern, case=False, na=False, regex=True).astype(int).values
        df_v["gancho_numero"] = serie.str.match(r"^\d", na=False).astype(int).values
        if _NLTK_OK:
            df_v["gancho_compound"] = compounds.values

        _boxplot_por_grupo(
            df_v,
            "gancho_chars",
            "label_viral",
            _ORDEM_VIRAL,
            "Comprimento do Gancho × Viralidade",
            "chars no gancho",
            pasta,
            "nlp_gancho_viral.png",
        )
        print("    [+] nlp_gancho_viral.png")

        # Fórmulas por faixa viral
        cols_pad = [
            "gancho_pergunta",
            "gancho_imperativo",
            "gancho_problema",
            "gancho_promessa",
            "gancho_numero",
        ]
        grupos_v = [g for g in _ORDEM_VIRAL if g in df_v["label_viral"].values]
        mat = pd.DataFrame(
            {g: [df_v.loc[df_v["label_viral"] == g, c].mean() * 100 for c in cols_pad] for g in grupos_v},
            index=[c.replace("gancho_", "") for c in cols_pad],
        )
        if not mat.empty:
            fig, ax = plt.subplots(figsize=(9, max(4, len(grupos_v) + 2)))
            fig.suptitle(f"Gancho — Fórmulas por Faixa Viral  [{label}]", fontsize=11, fontweight="bold")
            mat.T.plot(kind="barh", ax=ax, edgecolor="white")
            ax.set_xlabel("% dos vídeos com esse padrão")
            ax.set_title("Qual fórmula domina nos virais?")
            ax.legend(loc="lower right", fontsize=8)
            plt.tight_layout()
            _salvar(fig, pasta, "nlp_gancho_formulas_viral.png")
            print("    [+] nlp_gancho_formulas_viral.png")

        _rf_feature_importance(
            df_v,
            pasta=pasta,
            nome="nlp_gancho_rf_importance.png",
            titulo="Quais atributos do gancho mais explicam viralidade",
            nicho=nicho,
        )

        # TF-IDF exclusivos super_viral vs frio
        sv = df_nicho.loc[df_nicho["label_viral"] == "super_viral"]
        fr = df_nicho.loc[df_nicho["label_viral"] == "frio"]

        if len(sv) > 2 and len(fr) > 2:
            idx_sv = sv.index.intersection(serie.index)
            idx_fr = fr.index.intersection(serie.index)
            top_sv, top_fr = _tfidf_exclusivos(
                serie.loc[idx_sv].tolist(),
                serie.loc[idx_fr].tolist(),
            )

            print("\n    TF-IDF exclusivo super_viral no gancho (moldes para o novo roteiro):")
            for w, s in top_sv:
                print(f"      {w:20s}: {s:.4f}")

            print("    TF-IDF exclusivo frio no gancho (evitar):")
            for w, s in top_fr:
                print(f"      {w:20s}: {s:.4f}")

            print("\n    Exemplos reais de ganchos SUPER_VIRAL:")
            for txt in serie.loc[idx_sv[:5]]:
                print(f'      → "{txt}"')

            med_sv = comp_chars.loc[idx_sv].median()
            med_fr = comp_chars.loc[idx_fr].median()
            print(f"\n    Comprimento-alvo → super_viral: {med_sv:.0f} chars | frio: {med_fr:.0f} chars")

    # ── Idioma ───────────────────────────────────────────────
    cnt_script = serie.apply(_detectar_script).value_counts()
    cnt_idioma = serie.apply(_detectar_idioma).value_counts()
    print(f"\n    Scripts: {dict(cnt_script.head(4))}")
    _grafico_idioma_duplo(
        cnt_script,
        cnt_idioma,
        n,
        f"Gancho — Idioma  [{label}]",
        pasta,
        "nlp_gancho_idioma.png",
    )
    print("    [+] nlp_gancho_idioma.png")


# ─────────────────────────────────────────────────────────────
# MÓDULO 2 — vocabulario_falado
# ─────────────────────────────────────────────────────────────


def analisar_vocabulario_falado(
    serie: pd.Series,
    pasta: str,
    nicho: str,
    df_nicho: pd.DataFrame | None = None,
) -> None:
    n = len(serie)
    label = nicho.upper()
    print(f"\n  [VOCABULÁRIO FALADO] n={n}")

    # O campo já vem sem stopwords principais, mas aplica _SW_EXTRA como residual
    sw = _SW_EXTRA

    def _tokens_vocab(t: str) -> list[str]:
        return [w for w in str(t).split() if w not in sw and len(w) >= _MIN_TOKEN]

    qtd_por_video = serie.apply(lambda t: len(_tokens_vocab(t)))
    sem_vocab = (qtd_por_video == 0).sum()
    med_vocab = qtd_por_video[qtd_por_video > 0].median()

    print(f"    Mediana de palavras por vídeo: {med_vocab:.0f}")
    print(f"    Sem vocabulário: {sem_vocab} ({sem_vocab / n * 100:.1f}%)")

    todos_tokens = [w for t in serie for w in _tokens_vocab(t)]
    top_tokens = Counter(todos_tokens).most_common(_TOP_N_VOCAB)

    if not top_tokens:
        print("    [skip] Nenhum token encontrado.")
        return

    # ── Volume por vídeo ─────────────────────────────────────
    pcts = {p: qtd_por_video.quantile(p / 100) for p in [10, 25, 75, 90]}

    fig, ax = plt.subplots(figsize=(9, 4))
    fig.suptitle(f"Vocabulário Falado — Volume por Vídeo  [{label}]", fontsize=11, fontweight="bold")
    ax.hist(qtd_por_video[qtd_por_video > 0], bins=30, color=_PAL["verde"], edgecolor="white", lw=0.3)
    for p, cor, ls in [(10, _COR_OUTER, "-."), (25, _COR_IQR, ":"), (75, _COR_IQR, ":"), (90, _COR_OUTER, "-.")]:
        ax.axvline(pcts[p], color=cor, linestyle=ls, lw=1.2, label=f"P{p}:{pcts[p]:.0f}")
    ax.axvline(med_vocab, color=_COR_MED, linestyle="--", lw=1.8, label=f"Med:{med_vocab:.0f}")
    ax.set_xlabel("palavras")
    ax.set_ylabel("freq")
    ax.legend(fontsize=8)
    plt.tight_layout()
    _salvar(fig, pasta, "nlp_vocabulario_volume.png")
    print("    [+] nlp_vocabulario_volume.png")

    # ── Frequência + dispersão ───────────────────────────────
    dispersao = {w: serie.apply(lambda t: w in _tokens_vocab(t)).sum() for w, _ in top_tokens}
    labels_top = [t for t, _ in top_tokens]
    vals_freq = [c for _, c in top_tokens]
    vals_disp = [dispersao[t] for t in labels_top]

    print("\n    Top 10 palavras do vocabulário falado:")
    for tok, frq in top_tokens[:10]:
        print(f"      {tok:20s}: freq={frq:4d}  vídeos={dispersao[tok]:3d} ({dispersao[tok] / n * 100:.0f}%)")

    fig, axes = plt.subplots(1, 2, figsize=(16, max(4, len(labels_top) * 0.45 + 1.5)))
    fig.suptitle(f"Vocabulário Falado — Frequência vs Dispersão  [{label}]", fontsize=11, fontweight="bold")

    axes[0].barh(labels_top[::-1], vals_freq[::-1], color=_PAL["verde"], edgecolor="white", height=0.6)
    axes[0].set_title("Frequência total")
    axes[0].set_xlabel("ocorrências")
    axes[0].set_xlim(0, max(vals_freq) * 1.3)
    for i, v in enumerate(vals_freq[::-1]):
        axes[0].text(v + max(vals_freq) * 0.01, i, str(v), va="center", fontsize=8)

    axes[1].barh(labels_top[::-1], vals_disp[::-1], color=_PAL["laranja_e"], edgecolor="white", height=0.6)
    axes[1].set_title("Dispersão (vídeos distintos)")
    axes[1].set_xlabel("vídeos")
    axes[1].set_xlim(0, max(vals_disp) * 1.3)
    for i, v in enumerate(vals_disp[::-1]):
        axes[1].text(v + max(vals_disp) * 0.01, i, f"{v} ({v / n * 100:.0f}%)", va="center", fontsize=8)

    plt.tight_layout()
    _salvar(fig, pasta, "nlp_vocabulario_top.png")
    print("    [+] nlp_vocabulario_top.png")

    # ── Classificação de tipo ────────────────────────────────
    _ACAO = {
        "get",
        "make",
        "use",
        "start",
        "stop",
        "try",
        "learn",
        "do",
        "go",
        "take",
        "find",
        "create",
        "build",
        "run",
        "move",
        "change",
        "help",
        "fix",
        "avoid",
        "reach",
    }
    _EMOCIO = {
        "best",
        "great",
        "amazing",
        "love",
        "hate",
        "fail",
        "bad",
        "good",
        "wrong",
        "secret",
        "danger",
        "easy",
        "hard",
        "never",
        "always",
        "money",
        "power",
        "life",
        "death",
        "fear",
        "happy",
        "sad",
    }

    def _classi(w: str) -> str:
        if w in _ACAO:
            return "ação"
        if w in _EMOCIO:
            return "emocional/impacto"
        return "técnico/temático"

    dist_tipo = Counter(_classi(w) for w, _ in top_tokens)
    print(f"\n    Tipo de palavras no top-{_TOP_N_VOCAB}: {dict(dist_tipo)}")

    # ── TTR por vídeo ────────────────────────────────────────
    ttrs = serie.apply(lambda t: _ttr(_tokens_vocab(t)) if str(t).strip() else 0.0)
    med_ttr = ttrs[ttrs > 0].median()
    print(f"\n    TTR mediana (riqueza lexical): {med_ttr:.3f}")

    fig, ax = plt.subplots(figsize=(8, 4))
    fig.suptitle(f"Vocabulário Falado — TTR  [{label}]", fontsize=11, fontweight="bold")
    ax.hist(ttrs[ttrs > 0], bins=25, color=_PAL["azul"], edgecolor="white", lw=0.3)
    ax.axvline(med_ttr, color=_COR_MED, linestyle="--", lw=1.8, label=f"Med:{med_ttr:.3f}")
    ax.set_xlabel("TTR")
    ax.set_ylabel("freq")
    ax.legend(fontsize=9)
    ax.text(
        0.98,
        0.97,
        "TTR alto = vocabulário diverso\nTTR baixo = vocabulário repetitivo",
        transform=ax.transAxes,
        ha="right",
        va="top",
        fontsize=8,
        color="#555",
    )
    plt.tight_layout()
    _salvar(fig, pasta, "nlp_vocabulario_ttr.png")
    print("    [+] nlp_vocabulario_ttr.png")

    # ── Co-ocorrência top-10 ─────────────────────────────────
    top10_words = [w for w, _ in top_tokens[:10]]
    cooc = np.zeros((10, 10), dtype=int)

    for t in serie:
        palavras_video = set(_tokens_vocab(t))
        for i, wi in enumerate(top10_words):
            for j, wj in enumerate(top10_words):
                if i < j and wi in palavras_video and wj in palavras_video:
                    cooc[i, j] += 1
                    cooc[j, i] += 1

    fig, ax = plt.subplots(figsize=(8, 7))
    fig.suptitle(f"Vocabulário — Co-ocorrência Top-10  [{label}]", fontsize=11, fontweight="bold")
    sns.heatmap(
        cooc,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=top10_words,
        yticklabels=top10_words,
        mask=np.tril(np.ones_like(cooc, dtype=bool), k=0),
        ax=ax,
        linewidths=0.5,
        linecolor="white",
    )
    ax.set_title("Conceitos que co-ocorrem no mesmo vídeo (→ molde temático)")
    plt.tight_layout()
    _salvar(fig, pasta, "nlp_vocabulario_coocorrencia.png")
    print("    [+] nlp_vocabulario_coocorrencia.png")

    # ── Correlação × viralidade + RF ─────────────────────────
    if df_nicho is not None and "label_viral" in df_nicho.columns:
        df_v = df_nicho[["label_viral"]].copy()
        df_v["vocab_qtd"] = qtd_por_video.values
        df_v["vocab_ttr"] = ttrs.values

        _barras_agrupadas_viral(
            df_v,
            "vocab_qtd",
            pasta,
            "nlp_vocabulario_viral.png",
            "Volume de Vocabulário × Viralidade",
            "palavras no vocabulário (média)",
        )
        print("    [+] nlp_vocabulario_viral.png")

        _rf_feature_importance(
            df_v,
            pasta=pasta,
            nome="nlp_vocabulario_rf_importance.png",
            titulo="Volume/riqueza do vocabulário → label_viral",
            nicho=nicho,
        )

        # TF-IDF exclusivo super_viral vs frio
        sv = df_nicho.loc[df_nicho["label_viral"] == "super_viral"]
        fr = df_nicho.loc[df_nicho["label_viral"] == "frio"]

        if len(sv) > 2 and len(fr) > 2:
            idx_sv = sv.index.intersection(serie.index)
            idx_fr = fr.index.intersection(serie.index)
            top_sv, top_fr = _tfidf_exclusivos(
                serie.loc[idx_sv].tolist(),
                serie.loc[idx_fr].tolist(),
            )

            print("\n    Vocabulário TF-IDF exclusivo super_viral (usar no roteiro):")
            for w, s in top_sv:
                print(f"      {w:20s}: {s:.4f}")

            print("    Vocabulário TF-IDF exclusivo frio (sinal de alerta):")
            for w, s in top_fr:
                print(f"      {w:20s}: {s:.4f}")

            if top_sv or top_fr:
                n_sv = len(top_sv)
                n_fr = len(top_fr)
                altura = max(5, max(n_sv, n_fr) * 0.48 + 1.5)
                fig, axes = plt.subplots(1, 2, figsize=(16, altura))
                fig.suptitle(
                    f"Vocabulário — TF-IDF Exclusivo super_viral vs frio  [{label}]",
                    fontsize=11,
                    fontweight="bold",
                )

                if top_sv:
                    ls = [t for t, _ in top_sv]
                    vs = [v for _, v in top_sv]
                    axes[0].barh(ls[::-1], vs[::-1], color=_PAL["roxo"], edgecolor="white", height=0.6)
                    axes[0].set_title("SUPER_VIRAL — usar no roteiro")
                    axes[0].set_xlabel("TF-IDF diferencial")
                    axes[0].set_xlim(0, max(vs) * 1.3)
                    for i, v in enumerate(vs[::-1]):
                        axes[0].text(v + max(vs) * 0.01, i, f"{v:.4f}", va="center", fontsize=8)

                if top_fr:
                    ls = [t for t, _ in top_fr]
                    vs = [v for _, v in top_fr]
                    axes[1].barh(ls[::-1], vs[::-1], color=_PAL["cinza"], edgecolor="white", height=0.6)
                    axes[1].set_title("FRIO — sinal de alerta")
                    axes[1].set_xlabel("TF-IDF diferencial")
                    axes[1].set_xlim(0, max(vs) * 1.3)
                    for i, v in enumerate(vs[::-1]):
                        axes[1].text(v + max(vs) * 0.01, i, f"{v:.4f}", va="center", fontsize=8)

                plt.tight_layout()
                _salvar(fig, pasta, "nlp_vocabulario_tfidf_viral.png")
                print("    [+] nlp_vocabulario_tfidf_viral.png")

            med_sv = qtd_por_video.loc[idx_sv].median()
            med_fr = qtd_por_video.loc[idx_fr].median()
            print(f"\n    Volume ideal → super_viral: {med_sv:.0f} palavras | frio: {med_fr:.0f} palavras")


# ─────────────────────────────────────────────────────────────
# MÓDULO 3 — palavras_chave_en
# ─────────────────────────────────────────────────────────────


def analisar_palavras_chave_en(
    serie: pd.Series,
    pasta: str,
    nicho: str,
    df_nicho: pd.DataFrame | None = None,
) -> None:
    n = len(serie)
    label = nicho.upper()
    print(f"\n  [PALAVRAS-CHAVE EN] n={n}")

    def _extrair_termos(t: str) -> list[str]:
        return [term.strip() for term in str(t).split(",") if term.strip()]

    termos_por_video = serie.apply(_extrair_termos)
    qtd_por_video = termos_por_video.apply(len)
    todos_termos = [t for lista in termos_por_video for t in lista]
    sem_chave = (qtd_por_video == 0).sum()
    med_chave = qtd_por_video[qtd_por_video > 0].median()

    print(f"    Mediana de termos/vídeo: {med_chave:.0f}")
    print(f"    Total: {len(todos_termos)} | Únicos: {len(set(todos_termos))}")
    print(f"    Sem palavras-chave: {sem_chave} ({sem_chave / n * 100:.1f}%)")

    if not todos_termos:
        print("    [skip] Nenhum termo encontrado.")
        return

    # ── TF-IDF dos termos (trata lista como documento) ───────
    corpus_kw = [" ".join(_extrair_termos(t)) for t in serie]
    top_tfidf = _tfidf_top_terms(corpus_kw, extra_stopwords=_get_stopwords())

    if top_tfidf:
        print("\n    Top 10 termos SEO TF-IDF (discriminativos):")
        for t, v in top_tfidf[:10]:
            print(f"      {t:35s}: {v:.4f}")

    # ── Frequência + dispersão ───────────────────────────────
    top_termos = Counter(todos_termos).most_common(_TOP_N_VOCAB)
    dispersao = {t: serie.apply(lambda s: t in _extrair_termos(s)).sum() for t, _ in top_termos}
    labels_top = [t for t, _ in top_termos]
    vals_top = [c for _, c in top_termos]
    vals_disp = [dispersao[t] for t in labels_top]

    print("\n    Top 10 termos SEO (contagem):")
    for t, c in top_termos[:10]:
        print(f"      {t:35s}: freq={c:4d}  vídeos={dispersao[t]:3d} ({dispersao[t] / n * 100:.0f}%)")

    fig, axes = plt.subplots(1, 2, figsize=(18, max(4, len(labels_top) * 0.45 + 1.5)))
    fig.suptitle(f"Palavras-Chave EN — Frequência vs Dispersão  [{label}]", fontsize=11, fontweight="bold")

    axes[0].barh(labels_top[::-1], vals_top[::-1], color=_PAL["roxo"], edgecolor="white", height=0.6)
    axes[0].set_title("Frequência total")
    axes[0].set_xlabel("ocorrências")
    axes[0].set_xlim(0, max(vals_top) * 1.3)
    for i, v in enumerate(vals_top[::-1]):
        axes[0].text(v + max(vals_top) * 0.01, i, str(v), va="center", fontsize=8)

    axes[1].barh(labels_top[::-1], vals_disp[::-1], color=_PAL["azul"], edgecolor="white", height=0.6)
    axes[1].set_title("Dispersão (vídeos distintos)")
    axes[1].set_xlabel("vídeos")
    axes[1].set_xlim(0, max(vals_disp) * 1.3)
    for i, v in enumerate(vals_disp[::-1]):
        axes[1].text(v + max(vals_disp) * 0.01, i, f"{v} ({v / n * 100:.0f}%)", va="center", fontsize=8)

    plt.tight_layout()
    _salvar(fig, pasta, "nlp_palavras_chave_top.png")
    print("    [+] nlp_palavras_chave_top.png")

    # ── Estratégia SEO short/mid/long-tail ───────────────────
    n_palavras = [len(t.split()) for t in todos_termos]
    total = len(n_palavras)
    qtd_short = sum(1 for x in n_palavras if x == 1)
    qtd_mid = sum(1 for x in n_palavras if x == 2)
    qtd_long = sum(1 for x in n_palavras if x >= 3)

    print(f"\n    SEO: short={qtd_short / total * 100:.1f}% | mid={qtd_mid / total * 100:.1f}% | long={qtd_long / total * 100:.1f}%")

    fig, ax = plt.subplots(figsize=(7, 4))
    fig.suptitle(f"Palavras-Chave — Estratégia SEO  [{label}]", fontsize=11, fontweight="bold")
    seo_labels = ["Short-tail\n(1 palavra)", "Mid\n(2 palavras)", "Long-tail\n(3+ palavras)"]
    seo_vals = [qtd_short / total * 100, qtd_mid / total * 100, qtd_long / total * 100]
    bars = ax.bar(
        seo_labels,
        seo_vals,
        color=["#e74c3c", "#f39c12", "#2ecc71"],
        edgecolor="white",
        width=0.5,
    )
    ax.set_ylabel("% de termos")
    ax.set_ylim(0, max(seo_vals) * 1.25)
    for bar, v in zip(bars, seo_vals):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + max(seo_vals) * 0.02,
            f"{v:.1f}%",
            ha="center",
            fontsize=9,
            fontweight="bold",
        )
    plt.tight_layout()
    _salvar(fig, pasta, "nlp_palavras_chave_seo.png")
    print("    [+] nlp_palavras_chave_seo.png")

    # ── Co-ocorrência top-10 termos ──────────────────────────
    top10_terms = [t for t, _ in top_termos[:10]]
    cooc = np.zeros((10, 10), dtype=int)

    for termos_v in termos_por_video:
        termos_set = set(termos_v)
        for i, ti in enumerate(top10_terms):
            for j, tj in enumerate(top10_terms):
                if i < j and ti in termos_set and tj in termos_set:
                    cooc[i, j] += 1
                    cooc[j, i] += 1

    fig, ax = plt.subplots(figsize=(8, 7))
    fig.suptitle(
        f"Palavras-Chave — Co-ocorrência SEO (pares obrigatórios)  [{label}]",
        fontsize=11,
        fontweight="bold",
    )
    short_terms = [t[:20] + "…" if len(t) > 20 else t for t in top10_terms]
    sns.heatmap(
        cooc,
        annot=True,
        fmt="d",
        cmap="Purples",
        xticklabels=short_terms,
        yticklabels=short_terms,
        mask=np.tril(np.ones_like(cooc, dtype=bool), k=0),
        ax=ax,
        linewidths=0.5,
        linecolor="white",
    )
    ax.set_title("Pares de termos que devem ir juntos no novo conteúdo")
    plt.tight_layout()
    _salvar(fig, pasta, "nlp_palavras_chave_cooc.png")
    print("    [+] nlp_palavras_chave_cooc.png")

    # ── Correlação × viralidade + RF ─────────────────────────
    if df_nicho is not None and "label_viral" in df_nicho.columns:
        df_v = df_nicho[["label_viral"]].copy()
        df_v["qtd_termos"] = qtd_por_video.values
        df_v["ratio_long"] = serie.apply(lambda s: sum(1 for t in _extrair_termos(s) if len(t.split()) >= 3) / max(1, len(_extrair_termos(s)))).values

        _barras_agrupadas_viral(
            df_v,
            "qtd_termos",
            pasta,
            "nlp_palavras_chave_viral.png",
            "Volume de Termos SEO × Viralidade",
            "nº de termos por vídeo (média)",
        )
        print("    [+] nlp_palavras_chave_viral.png")

        _rf_feature_importance(
            df_v,
            pasta=pasta,
            nome="nlp_palavras_chave_rf_importance.png",
            titulo="Atributos SEO → label_viral",
            nicho=nicho,
        )

        # TF-IDF exclusivo super_viral vs frio
        sv = df_nicho.loc[df_nicho["label_viral"] == "super_viral"]
        fr = df_nicho.loc[df_nicho["label_viral"] == "frio"]

        if len(sv) > 2 and len(fr) > 2:
            idx_sv = sv.index.intersection(serie.index)
            idx_fr = fr.index.intersection(serie.index)
            corp_sv = [" ".join(_extrair_termos(t)) for t in serie.loc[idx_sv]]
            corp_fr = [" ".join(_extrair_termos(t)) for t in serie.loc[idx_fr]]
            top_sv, top_fr = _tfidf_exclusivos(corp_sv, corp_fr)

            print("\n    Termos SEO TF-IDF exclusivos super_viral (incluir no novo conteúdo):")
            for w, s in top_sv:
                print(f"      {w:30s}: {s:.4f}")

            print("    Termos SEO exclusivos frio:")
            for w, s in top_fr:
                print(f"      {w:30s}: {s:.4f}")

            med_sv = qtd_por_video.loc[idx_sv].median()
            med_fr = qtd_por_video.loc[idx_fr].median()
            print(f"\n    Volume ideal de termos SEO → super_viral: {med_sv:.0f} | frio: {med_fr:.0f}")


# ─────────────────────────────────────────────────────────────
# MÓDULO 4 — pistas_audio_en
# ─────────────────────────────────────────────────────────────


def analisar_pistas_audio_en(
    serie: pd.Series,
    pasta: str,
    nicho: str,
    df_nicho: pd.DataFrame | None = None,
) -> None:
    n = len(serie)
    label = nicho.upper()
    print(f"\n  [PISTAS DE ÁUDIO EN] n={n}")

    _RE_TAG = re.compile(r"\[.*?\]|\(.*?\)|♪")

    def _extrair_tags(t: str) -> list[str]:
        return _RE_TAG.findall(str(t).lower())

    tags_por_video = serie.apply(_extrair_tags)
    qtd_por_video = tags_por_video.apply(len)
    todas_tags = [tag for lista in tags_por_video for tag in lista]

    tem_pista = (qtd_por_video > 0).sum()
    pct_pista = tem_pista / n * 100
    med_tags = qtd_por_video[qtd_por_video > 0].median() if tem_pista > 0 else 0

    print(f"    Com pistas: {tem_pista} ({pct_pista:.1f}%) | Med tags/vídeo: {med_tags:.0f}")
    print(f"    Total de ocorrências: {len(todas_tags)}")

    if not todas_tags:
        print("    [skip] Nenhuma pista encontrada.")
        return

    # ── Top tags ─────────────────────────────────────────────
    top_tags = Counter(todas_tags).most_common(_TOP_N_VOCAB)
    labels_top = [t for t, _ in top_tags]
    vals_top = [c for _, c in top_tags]

    print("\n    Top tags de áudio:")
    for tag, cnt in top_tags[:10]:
        print(f"      {tag:25s}: {cnt}")

    _grafico_barras_h(
        labels_top,
        vals_top,
        titulo=f"Top {len(top_tags)} tags de áudio",
        xlabel="frequência",
        pasta=pasta,
        nome_arquivo="nlp_pistas_audio_top.png",
        cor=_PAL["verde_e"],
        suptitle=f"Pistas de Áudio EN  [{label}]",
    )
    print("    [+] nlp_pistas_audio_top.png")

    # ── Pares co-ocorrentes (padrão de edição sonora) ────────
    pares_tags: list[tuple] = []
    for tags in tags_por_video:
        if len(tags) >= 2:
            pares_tags.extend(combinations(sorted(set(tags)), 2))

    if pares_tags:
        top_pares = Counter(pares_tags).most_common(15)
        labels_p = [f"{a} + {b}" for (a, b), _ in top_pares]
        vals_p = [c for _, c in top_pares]

        print("\n    Top pares de tags co-ocorrentes (padrão de edição sonora):")
        for (a, b), c in top_pares[:5]:
            print(f"      {a} + {b}: {c} vídeos")

        _grafico_barras_h(
            labels_p,
            vals_p,
            titulo="Pares de tags de áudio co-ocorrentes",
            xlabel="nº de vídeos",
            pasta=pasta,
            nome_arquivo="nlp_pistas_audio_sequencias.png",
            cor=_PAL["azul"],
            suptitle=f"Pistas de Áudio — Sequências  [{label}]",
        )
        print("    [+] nlp_pistas_audio_sequencias.png")

    # ── Correlação × viralidade ──────────────────────────────
    if df_nicho is not None and "label_viral" in df_nicho.columns:
        df_v = df_nicho[["label_viral"]].copy()
        df_v["tem_audio"] = (qtd_por_video.values > 0).astype(int)
        df_v["qtd_audio"] = qtd_por_video.values

        grupos = [g for g in _ORDEM_VIRAL if g in df_v["label_viral"].values]
        pcts = [df_v.loc[df_v["label_viral"] == g, "tem_audio"].mean() * 100 for g in grupos]

        print("\n    % vídeos com pista de áudio por faixa viral:")
        for g, p in zip(grupos, pcts):
            print(f"      {g:15s}: {p:.1f}%")

        fig, ax = plt.subplots(figsize=(7, max(3, len(grupos) * 0.8 + 1)))
        fig.suptitle(
            f"Pistas de Áudio — % com Pista × Viralidade  [{label}]",
            fontsize=11,
            fontweight="bold",
        )
        cores = [c for c, g in zip(_CORES_VIRAL, _ORDEM_VIRAL) if g in grupos]
        bars = ax.barh(grupos[::-1], pcts[::-1], color=cores[::-1], edgecolor="white", height=0.6)
        ax.set_xlabel("% de vídeos com pista de áudio")
        ax.set_xlim(0, max(pcts + [10]) * 1.3)
        for bar, v in zip(bars, pcts[::-1]):
            ax.text(
                bar.get_width() + 0.5,
                bar.get_y() + bar.get_height() / 2,
                f"{v:.1f}%",
                va="center",
                fontsize=9,
            )
        plt.tight_layout()
        _salvar(fig, pasta, "nlp_pistas_audio_viral.png")
        print("    [+] nlp_pistas_audio_viral.png")

        # Tags exclusivas super_viral vs frio
        sv = df_nicho.loc[df_nicho["label_viral"] == "super_viral"]
        fr = df_nicho.loc[df_nicho["label_viral"] == "frio"]

        if len(sv) > 0 and len(fr) > 0:
            idx_sv = sv.index.intersection(serie.index)
            idx_fr = fr.index.intersection(serie.index)
            cnt_sv = Counter(tag for i in idx_sv for tag in _extrair_tags(serie.loc[i]))
            cnt_fr = Counter(tag for i in idx_fr for tag in _extrair_tags(serie.loc[i]))
            excl_sv = sorted(
                {t: c for t, c in cnt_sv.items() if t not in cnt_fr}.items(),
                key=lambda x: -x[1],
            )[:5]
            excl_fr = sorted(
                {t: c for t, c in cnt_fr.items() if t not in cnt_sv}.items(),
                key=lambda x: -x[1],
            )[:5]

            if excl_sv:
                print(f"\n    Tags exclusivas super_viral: {excl_sv}")
                print("    (→ incluir essas pistas sonoras no novo roteiro)")
            if excl_fr:
                print(f"    Tags exclusivas frio: {excl_fr}")


# ─────────────────────────────────────────────────────────────
# MÓDULO 5 — texto_thumbnail + descricao_visual_thumb
# ─────────────────────────────────────────────────────────────


def analisar_thumbnail_gemini(
    serie_texto: pd.Series,
    serie_visual: pd.Series,
    pasta: str,
    nicho: str,
    df_nicho: pd.DataFrame | None = None,
) -> None:
    n = len(serie_texto)
    label = nicho.upper()
    print(f"\n  [THUMBNAIL GEMINI] n={n}")

    tem_texto = serie_texto.str.strip().ne("").sum()
    tem_visual = serie_visual.str.strip().ne("").sum()
    print(f"    Com texto na capa: {tem_texto} ({tem_texto / n * 100:.1f}%)")
    print(f"    Com desc. visual:  {tem_visual} ({tem_visual / n * 100:.1f}%)")

    # ── Cobertura ────────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(7, 4))
    fig.suptitle(f"Thumbnail Gemini — Cobertura  [{label}]", fontsize=11, fontweight="bold")
    categorias = ["Com texto\nna capa", "Sem texto\nna capa", "Com desc.\nvisual", "Sem desc.\nvisual"]
    valores = [tem_texto, n - tem_texto, tem_visual, n - tem_visual]
    cores_cob = ["#2ecc71", "#e74c3c", "#3498db", "#bdc3c7"]
    bars = ax.bar(categorias, valores, color=cores_cob, edgecolor="white", width=0.6)
    ax.set_ylabel("Vídeos")
    ax.set_ylim(0, max(valores) * 1.25)
    for bar, v in zip(bars, valores):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + max(valores) * 0.02,
            f"{v} ({v / n * 100:.1f}%)",
            ha="center",
            fontsize=9,
            fontweight="bold",
        )
    plt.tight_layout()
    _salvar(fig, pasta, "nlp_thumb_cobertura.png")
    print("    [+] nlp_thumb_cobertura.png")

    # ── Texto na capa — comprimento ──────────────────────────
    serie_texto_v = serie_texto[serie_texto.str.strip() != ""]

    if not serie_texto_v.empty:
        comp = serie_texto_v.str.len()
        med = comp.median()
        print(f"\n    texto_thumbnail — mediana: {med:.0f} chars")

        fig, ax = plt.subplots(figsize=(9, 4))
        fig.suptitle(
            f"Thumbnail — Comprimento do Texto na Capa  [{label}]",
            fontsize=11,
            fontweight="bold",
        )
        ax.hist(comp, bins=30, color=_PAL["laranja_e"], edgecolor="white", lw=0.3)
        ax.axvline(med, color=_COR_MED, linestyle="--", lw=1.8, label=f"Med:{med:.0f}")
        ax.axvline(40, color="#2ecc71", linestyle=":", lw=1.2, label="40 chars (hook ideal)")
        ax.set_xlabel("chars")
        ax.set_ylabel("freq")
        ax.legend(fontsize=8)
        plt.tight_layout()
        _salvar(fig, pasta, "nlp_thumb_texto_comprimento.png")
        print("    [+] nlp_thumb_texto_comprimento.png")

        # TF-IDF do texto na capa
        top_tfidf_txt = _tfidf_top_terms(serie_texto.tolist())
        if top_tfidf_txt:
            print("\n    TF-IDF do texto na capa (palavras de maior impacto visual):")
            for t, v in top_tfidf_txt[:10]:
                print(f"      {t:20s}: {v:.4f}")
            _grafico_barras_h(
                [t for t, _ in top_tfidf_txt],
                [round(v, 4) for _, v in top_tfidf_txt],
                titulo="TF-IDF do texto na capa",
                xlabel="TF-IDF médio",
                pasta=pasta,
                nome_arquivo="nlp_thumb_texto_tfidf.png",
                cor=_PAL["laranja_e"],
                suptitle=f"Thumbnail — Léxico TF-IDF da Capa  [{label}]",
            )
            print("    [+] nlp_thumb_texto_tfidf.png")

        # N-gramas TF-IDF do texto na capa
        if _SKLEARN_OK and len(serie_texto_v) > 5:
            try:
                sw = list(_get_stopwords())
                vec_ng = TfidfVectorizer(
                    ngram_range=(2, 3),
                    max_features=200,
                    stop_words=sw,
                    token_pattern=r"(?u)\b[a-z]{3,}\b",
                    sublinear_tf=True,
                )
                X_ng = vec_ng.fit_transform(serie_texto.tolist())
                sc = np.asarray(X_ng.mean(axis=0)).flatten()
                tms = vec_ng.get_feature_names_out()
                top_ng = [(tms[i], float(sc[i])) for i in sc.argsort()[::-1][:_TOP_N_NGRAM]]

                if top_ng:
                    print("\n    N-gramas TF-IDF no texto da thumbnail (moldes de frase curta):")
                    for t, v in top_ng[:8]:
                        print(f"      {t}: {v:.4f}")
                    _grafico_barras_h(
                        [t for t, _ in top_ng],
                        [round(v, 4) for _, v in top_ng],
                        titulo="N-gramas TF-IDF do texto na thumbnail",
                        xlabel="TF-IDF médio",
                        pasta=pasta,
                        nome_arquivo="nlp_thumb_texto_ngramas.png",
                        cor=_PAL["verde_e"],
                        suptitle=f"Thumbnail — N-gramas TF-IDF  [{label}]",
                    )
                    print("    [+] nlp_thumb_texto_ngramas.png")

            except Exception as e:
                print(f"    [skip ngrams thumb] {e}")

    # ── Descrição visual — TF-IDF + KMeans de cenas ──────────
    corpus_visual = [t for t in serie_visual if t.strip()]

    if corpus_visual:
        top_visual_tfidf = _tfidf_top_terms(corpus_visual)
        if top_visual_tfidf:
            print("\n    TF-IDF da cena visual (elementos visuais dominantes):")
            for t, v in top_visual_tfidf[:10]:
                print(f"      {t:20s}: {v:.4f}")
            _grafico_barras_h(
                [t for t, _ in top_visual_tfidf],
                [round(v, 4) for _, v in top_visual_tfidf],
                titulo="TF-IDF da cena visual",
                xlabel="TF-IDF médio",
                pasta=pasta,
                nome_arquivo="nlp_thumb_visual_tfidf.png",
                cor=_PAL["azul"],
                suptitle=f"Thumbnail — TF-IDF Cena Visual  [{label}]",
            )
            print("    [+] nlp_thumb_visual_tfidf.png")

        # KMeans nas descrições visuais → categorias de cena
        clusters_vis = _kmeans_clusters(
            corpus_visual,
            n_clusters=min(5, max(2, len(corpus_visual) // 5)),
        )
        if clusters_vis:
            print(f"\n    KMeans — categorias de cena visual ({len(clusters_vis)} clusters):")
            for cid, info in clusters_vis.items():
                print(f"      Cena {cid + 1} (n={info['n']}): {', '.join(info['termos'][:5])}")
                for a in info["amostras"][:2]:
                    print(f"        '{a[:80]}'")

            cids = [f"Cena {c + 1}\n{info['n']} thumbs" for c, info in clusters_vis.items()]
            sizes = [info["n"] for info in clusters_vis.values()]
            descr = [", ".join(info["termos"][:3]) for info in clusters_vis.values()]

            fig, ax = plt.subplots(figsize=(10, max(4, len(clusters_vis) * 1.0 + 1.5)))
            fig.suptitle(
                f"Thumbnail — Categorias de Cena (KMeans)  [{label}]",
                fontsize=11,
                fontweight="bold",
            )
            bars = ax.barh(cids[::-1], sizes[::-1], color=_PAL["azul"], edgecolor="white", height=0.6)
            for bar, v, lbl in zip(bars, sizes[::-1], descr[::-1]):
                ax.text(
                    bar.get_width() + max(sizes) * 0.01,
                    bar.get_y() + bar.get_height() / 2,
                    f"{v}  [{lbl}]",
                    va="center",
                    fontsize=8,
                )
            ax.set_xlabel("nº de thumbnails")
            ax.set_xlim(0, max(sizes) * 2.2)
            ax.set_title("Cada cluster = um tipo de cena visual recorrente")
            plt.tight_layout()
            _salvar(fig, pasta, "nlp_thumb_visual_clusters.png")
            print("    [+] nlp_thumb_visual_clusters.png")

    # ── Correlação texto thumbnail × viralidade ───────────────
    if df_nicho is not None and "label_viral" in df_nicho.columns:
        df_v = df_nicho[["label_viral"]].copy()
        df_v["thumb_chars"] = serie_texto.str.len().values
        df_v["thumb_tem_texto"] = serie_texto.str.strip().ne("").astype(int).values

        _barras_agrupadas_viral(
            df_v,
            "thumb_chars",
            pasta,
            "nlp_thumb_viral.png",
            "Comprimento Médio Texto na Capa × Viralidade",
            "chars no texto da thumbnail (média)",
        )
        print("    [+] nlp_thumb_viral.png")

        grupos = [g for g in _ORDEM_VIRAL if g in df_v["label_viral"].values]
        pcts_v = [df_v.loc[df_v["label_viral"] == g, "thumb_tem_texto"].mean() * 100 for g in grupos]
        print("\n    % vídeos com texto na capa por faixa viral:")
        for g, p in zip(grupos, pcts_v):
            print(f"      {g:15s}: {p:.1f}%  (→ referência para briefing visual)")

        # TF-IDF exclusivo super_viral vs frio no texto da capa
        sv = df_nicho.loc[df_nicho["label_viral"] == "super_viral"]
        fr = df_nicho.loc[df_nicho["label_viral"] == "frio"]

        if len(sv) > 2 and len(fr) > 2:
            idx_sv = sv.index.intersection(serie_texto.index)
            idx_fr = fr.index.intersection(serie_texto.index)
            top_sv, top_fr = _tfidf_exclusivos(
                serie_texto.loc[idx_sv].tolist(),
                serie_texto.loc[idx_fr].tolist(),
            )

            if top_sv:
                print("\n    Texto de thumbnail exclusivo super_viral (usar no briefing):")
                for w, s in top_sv[:8]:
                    print(f"      '{w}': {s:.4f}")

            print("\n    Exemplos de texto de thumbnail SUPER_VIRAL:")
            for txt in serie_texto.loc[idx_sv[:5]]:
                if txt.strip():
                    print(f'      → "{txt}"')

            # Comprimento ótimo nos super_virais
            med_sv = serie_texto.loc[idx_sv].str.len().median()
            med_fr = serie_texto.loc[idx_fr].str.len().median()
            print(f"\n    Comprimento-alvo texto thumbnail → super_viral: {med_sv:.0f} chars | frio: {med_fr:.0f} chars")


# ─────────────────────────────────────────────────────────────
# MÓDULO 6 — vibe_emojis
# ─────────────────────────────────────────────────────────────


def analisar_vibe_emojis(
    serie: pd.Series,
    pasta: str,
    nicho: str,
    df_nicho: pd.DataFrame | None = None,
) -> None:
    n = len(serie)
    label = nicho.upper()
    print(f"\n  [VIBE EMOJIS] n={n}")

    def _extrair_emojis(t: str) -> list[str]:
        return [e["emoji"] for e in emoji.emoji_list(str(t))]

    emojis_por_video = serie.apply(_extrair_emojis)
    qtd_por_video = emojis_por_video.apply(len)
    todos_emojis = [e for lista in emojis_por_video for e in lista]
    tem_emoji = (qtd_por_video > 0).sum()
    med_emoji = qtd_por_video[qtd_por_video > 0].median() if tem_emoji > 0 else 0

    print(f"    Com emoji: {tem_emoji} ({tem_emoji / n * 100:.1f}%) | Med/vídeo: {med_emoji:.0f} | Total: {len(todos_emojis)}")

    if not todos_emojis:
        print("    [skip] Nenhum emoji encontrado.")
        return

    # ── Top emojis com nome legível ──────────────────────────
    top_emojis = Counter(todos_emojis).most_common(_TOP_N_VOCAB)

    em_labels = []
    for rank, (em, cnt) in enumerate(top_emojis, 1):
        try:
            nome_em = emoji.demojize(em).strip(":")
        except Exception:
            nome_em = "emoji"
        nm = (nome_em[:25] + "…") if len(nome_em) > 25 else nome_em
        em_labels.append(f"{rank}. {em} :{nm}: ({cnt})")

    em_vals = [c for _, c in top_emojis]

    altura = max(4, len(top_emojis) * 0.52 + 1.5)
    fig, ax = plt.subplots(figsize=(11, altura))
    fig.suptitle(f"Vibe Emojis — Top {_TOP_N_VOCAB}  [{label}]", fontsize=11, fontweight="bold")
    ax.barh(em_labels[::-1], em_vals[::-1], color=_PAL["laranja_e"], edgecolor="white", height=0.6)
    ax.set_xlabel("freq")
    ax.set_xlim(0, max(em_vals) * 1.3)
    for i, v in enumerate(em_vals[::-1]):
        ax.text(v + max(em_vals) * 0.01, i, str(v), va="center", fontsize=8)
    plt.tight_layout()
    _salvar(fig, pasta, "nlp_vibe_emojis_top.png")
    print("    [+] nlp_vibe_emojis_top.png")

    # ── Categorias emocionais ────────────────────────────────
    CATEGORIAS = {
        "urgência/alerta": ["warning", "alert", "rotating_light", "exclamation", "sos", "no_entry", "prohibited", "cross_mark", "scream", "fearful"],
        "humor/leveza": ["joy", "rofl", "laughing", "grin", "sweat_smile", "wink", "zany_face", "clown"],
        "amor/positividade": ["heart", "smiling", "blush", "kiss", "fire", "star", "sparkles", "hundred", "muscle"],
        "surpresa/choque": ["open_mouth", "astonished", "exploding_head", "eyes", "flushed"],
    }

    contagem_cat: dict[str, int] = {k: 0 for k in CATEGORIAS}
    contagem_cat["outros"] = 0

    for em, cnt in top_emojis:
        try:
            nome = emoji.demojize(em).strip(":").lower()
        except Exception:
            nome = ""
        cat = "outros"
        for c, palavras in CATEGORIAS.items():
            if any(p in nome for p in palavras):
                cat = c
                break
        contagem_cat[cat] += cnt

    print("\n    Tom emocional dos emojis:")
    for cat, cnt in contagem_cat.items():
        print(f"      {cat:22s}: {cnt}")

    fig, ax = plt.subplots(figsize=(8, 4))
    fig.suptitle(f"Vibe Emojis — Tom Emocional  [{label}]", fontsize=11, fontweight="bold")
    cats = list(contagem_cat.keys())
    vals = list(contagem_cat.values())
    cores = ["#e74c3c", "#e91e8c", "#3498db", "#9b59b6", "#95a5a6"]
    bars = ax.bar(cats, vals, color=cores[: len(cats)], edgecolor="white", width=0.6)
    ax.set_ylabel("ocorrências")
    ax.set_ylim(0, max(vals) * 1.25 if max(vals) > 0 else 1)
    for bar, v in zip(bars, vals):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + max(vals) * 0.02,
            str(v),
            ha="center",
            fontsize=9,
            fontweight="bold",
        )
    plt.tight_layout()
    _salvar(fig, pasta, "nlp_vibe_emojis_categorias.png")
    print("    [+] nlp_vibe_emojis_categorias.png")

    # ── Pares de emojis co-ocorrentes ────────────────────────
    pares_emojis: list[tuple] = []
    for emjs in emojis_por_video:
        if len(emjs) >= 2:
            pares_emojis.extend(combinations(sorted(set(emjs)), 2))

    if pares_emojis:
        top_pares = Counter(pares_emojis).most_common(15)
        labels_p = [f"{a}+{b}" for (a, b), _ in top_pares]
        vals_p = [c for _, c in top_pares]

        print("\n    Top 5 pares de emojis (combinação emocional para replicar):")
        for (a, b), c in top_pares[:5]:
            print(f"      {a}+{b}: {c} vídeos")

        _grafico_barras_h(
            labels_p,
            vals_p,
            titulo="Top 15 pares de emojis co-ocorrentes",
            xlabel="nº de vídeos",
            pasta=pasta,
            nome_arquivo="nlp_vibe_emojis_pares.png",
            cor=_PAL["laranja"],
            suptitle=f"Vibe Emojis — Pares  [{label}]",
        )
        print("    [+] nlp_vibe_emojis_pares.png")

    # ── Correlação × viralidade + RF ─────────────────────────
    if df_nicho is not None and "label_viral" in df_nicho.columns:
        df_v = df_nicho[["label_viral"]].copy()
        df_v["qtd_emojis"] = qtd_por_video.values
        df_v["ttr_emojis"] = emojis_por_video.apply(lambda e: _ttr(e)).values

        _barras_agrupadas_viral(
            df_v,
            "qtd_emojis",
            pasta,
            "nlp_vibe_emojis_viral.png",
            "Quantidade Média de Emojis × Viralidade",
            "emojis por vídeo (média)",
        )
        print("    [+] nlp_vibe_emojis_viral.png")

        _rf_feature_importance(
            df_v,
            pasta=pasta,
            nome="nlp_vibe_emojis_rf_importance.png",
            titulo="Atributos de emoji → label_viral",
            nicho=nicho,
        )

        # Emojis exclusivos super_viral vs frio
        sv = df_nicho.loc[df_nicho["label_viral"] == "super_viral"]
        fr = df_nicho.loc[df_nicho["label_viral"] == "frio"]

        if len(sv) > 0 and len(fr) > 0:
            idx_sv = sv.index.intersection(serie.index)
            idx_fr = fr.index.intersection(serie.index)
            cnt_sv = Counter(e for i in idx_sv for e in _extrair_emojis(serie.loc[i]))
            cnt_fr = Counter(e for i in idx_fr for e in _extrair_emojis(serie.loc[i]))

            excl_sv = sorted(
                {e: c for e, c in cnt_sv.items() if e not in cnt_fr}.items(),
                key=lambda x: -x[1],
            )[:5]
            excl_fr = sorted(
                {e: c for e, c in cnt_fr.items() if e not in cnt_sv}.items(),
                key=lambda x: -x[1],
            )[:5]

            med_qtd_sv = qtd_por_video.loc[idx_sv].median()
            med_qtd_fr = qtd_por_video.loc[idx_fr].median()

            print(f"\n    Quantidade ideal de emojis → super_viral: {med_qtd_sv:.0f} | frio: {med_qtd_fr:.0f}")

            if excl_sv:
                resumo_sv = " ".join(f"{e}({c})" for e, c in excl_sv)
                print(f"    Emojis exclusivos super_viral: {resumo_sv}")
                print("    (→ usar esses emojis no novo título e descrição)")

            if excl_fr:
                resumo_fr = " ".join(f"{e}({c})" for e, c in excl_fr)
                print(f"    Emojis exclusivos frio: {resumo_fr}")


# ─────────────────────────────────────────────────────────────
# MÓDULO 7 — titulo_en
# ─────────────────────────────────────────────────────────────


def analisar_titulo_en(
    serie: pd.Series,
    pasta: str,
    nicho: str,
    df_nicho: pd.DataFrame | None = None,
) -> None:
    n = len(serie)
    label = nicho.upper()
    print(f"\n  [TÍTULO EN] n={n}")

    # ── Comprimento ──────────────────────────────────────────
    comp_chars = serie.str.len()
    comp_tokens = serie.apply(lambda t: len(_tokenizar_raw(t)))
    med_chars = comp_chars.median()
    med_tokens = comp_tokens.median()

    print(f"    Comprimento — mediana: {med_chars:.0f} chars | {med_tokens:.0f} tokens")

    pcts_c = {p: comp_chars.quantile(p / 100) for p in [10, 25, 75, 90]}

    fig, ax = plt.subplots(figsize=(10, 4))
    fig.suptitle(f"Título EN — Comprimento  [{label}]  (n={n})", fontsize=11, fontweight="bold")
    ax.hist(comp_chars, bins=40, color=_PAL["azul"], edgecolor="white", lw=0.3)
    for p, cor, ls in [(10, _COR_OUTER, "-."), (25, _COR_IQR, ":"), (75, _COR_IQR, ":"), (90, _COR_OUTER, "-.")]:
        ax.axvline(pcts_c[p], color=cor, linestyle=ls, lw=1.2, label=f"P{p}:{pcts_c[p]:.0f}")
    ax.axvline(med_chars, color=_COR_MED, linestyle="--", lw=1.8, label=f"Med:{med_chars:.0f}")
    ax.axvline(40, color="green", linestyle=":", lw=1.0, label="40 chars")
    ax.axvline(70, color="orange", linestyle=":", lw=1.0, label="70 chars")
    ax.set_xlabel("chars")
    ax.set_ylabel("freq")
    ax.legend(fontsize=7)
    plt.tight_layout()
    _salvar(fig, pasta, "nlp_titulo_en_comprimento.png")
    print("    [+] nlp_titulo_en_comprimento.png")

    # ── TF-IDF léxico ────────────────────────────────────────
    corpus = serie.tolist()
    top_tfidf = _tfidf_top_terms(corpus)

    if top_tfidf:
        print("\n    TF-IDF léxico do título:")
        for t, v in top_tfidf[:10]:
            print(f"      {t:20s}: {v:.4f}")
        _grafico_barras_h(
            [t for t, _ in top_tfidf],
            [round(v, 4) for _, v in top_tfidf],
            titulo=f"Top {_TOP_N_VOCAB} termos TF-IDF (título)",
            xlabel="TF-IDF médio",
            pasta=pasta,
            nome_arquivo="nlp_titulo_en_tfidf.png",
            cor=_PAL["azul"],
            suptitle=f"Título EN — TF-IDF  [{label}]",
        )
        print("    [+] nlp_titulo_en_tfidf.png")

    # ── N-gramas TF-IDF ──────────────────────────────────────
    if _SKLEARN_OK:
        try:
            sw = list(_get_stopwords())
            vec_ng = TfidfVectorizer(
                ngram_range=(2, 3),
                max_features=200,
                stop_words=sw,
                token_pattern=r"(?u)\b[a-z]{3,}\b",
                sublinear_tf=True,
            )
            X_ng = vec_ng.fit_transform(corpus)
            sc = np.asarray(X_ng.mean(axis=0)).flatten()
            tms = vec_ng.get_feature_names_out()
            top_ng = [(tms[i], float(sc[i])) for i in sc.argsort()[::-1][:_TOP_N_NGRAM]]

            if top_ng:
                print("\n    N-gramas TF-IDF no título (moldes para copiar e adaptar):")
                for t, v in top_ng[:8]:
                    print(f"      {t}: {v:.4f}")
                _grafico_barras_h(
                    [t for t, _ in top_ng],
                    [round(v, 4) for _, v in top_ng],
                    titulo="N-gramas TF-IDF do título",
                    xlabel="TF-IDF médio",
                    pasta=pasta,
                    nome_arquivo="nlp_titulo_en_ngramas.png",
                    cor=_PAL["verde_e"],
                    suptitle=f"Título EN — N-gramas TF-IDF  [{label}]",
                )
                print("    [+] nlp_titulo_en_ngramas.png")

        except Exception as e:
            print(f"    [skip ngrams titulo] {e}")

    # ── KMeans — clusters de fórmulas de título ──────────────
    clusters = _kmeans_clusters(
        corpus,
        n_clusters=min(_N_CLUSTERS, max(2, len(corpus) // 5)),
    )

    if clusters:
        print(f"\n    KMeans — {len(clusters)} fórmulas de título:")
        for cid, info in clusters.items():
            print(f"      Fórmula {cid + 1} (n={info['n']}): {', '.join(info['termos'][:5])}")
            for a in info["amostras"][:2]:
                print(f"        '{a[:80]}'")

        cids = [f"Fórmula {c + 1}\n{info['n']}" for c, info in clusters.items()]
        sizes = [info["n"] for info in clusters.values()]
        descr = [", ".join(info["termos"][:3]) for info in clusters.values()]

        fig, ax = plt.subplots(figsize=(10, max(4, len(clusters) * 0.9 + 1.5)))
        fig.suptitle(f"Título EN — Clusters TF-IDF (KMeans)  [{label}]", fontsize=11, fontweight="bold")
        bars = ax.barh(cids[::-1], sizes[::-1], color=_PAL["azul"], edgecolor="white", height=0.6)
        for bar, v, lbl in zip(bars, sizes[::-1], descr[::-1]):
            ax.text(
                bar.get_width() + max(sizes) * 0.01,
                bar.get_y() + bar.get_height() / 2,
                f"{v}  [{lbl}]",
                va="center",
                fontsize=8,
            )
        ax.set_xlabel("nº de títulos")
        ax.set_xlim(0, max(sizes) * 2.2)
        ax.set_title("Cada cluster = uma fórmula de título distinta")
        plt.tight_layout()
        _salvar(fig, pasta, "nlp_titulo_en_clusters.png")
        print("    [+] nlp_titulo_en_clusters.png")

    # ── Perfil de construção ─────────────────────────────────
    def _ratio_caps(texto: str) -> float:
        palavras = re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ]+", texto)
        if not palavras:
            return 0.0
        return sum(1 for p in palavras if p.isupper() and len(p) > 1) / len(palavras)

    caps_por_titulo = serie.apply(_ratio_caps)

    padroes = {
        "Tem emoji": serie.apply(lambda t: bool(emoji.emoji_list(t))).sum() / n * 100,
        "Tem hashtag (#)": serie.str.contains(r"#\w+", regex=True, na=False).sum() / n * 100,
        "Tem número": serie.str.contains(r"\d", regex=True, na=False).sum() / n * 100,
        "Tem ? ou !": serie.str.contains(r"[?!]", regex=True, na=False).sum() / n * 100,
        "Tem reticências...": serie.str.contains(r"\.\.\.", regex=True, na=False).sum() / n * 100,
        "CAPS ≥10%": (caps_por_titulo >= 0.10).sum() / n * 100,
        "CAPS ≥50%": (caps_por_titulo >= 0.50).sum() / n * 100,
    }

    print("\n    Perfil de construção do título:")
    for k, v in padroes.items():
        print(f"      {k:28s}: {v:5.1f}%")

    fig, ax = plt.subplots(figsize=(10, max(4, len(padroes) * 0.65 + 1)))
    fig.suptitle(f"Título EN — Perfil de Construção  [{label}]", fontsize=11, fontweight="bold")
    lp = list(padroes.keys())
    vp = list(padroes.values())
    cp = [_PAL["vermelho"] if v > 50 else _PAL["laranja"] if v > 20 else _PAL["verde"] for v in vp]
    bars = ax.barh(lp[::-1], vp[::-1], color=cp[::-1], edgecolor="white", height=0.6)
    ax.set_xlabel("% de títulos")
    ax.axvline(50, color="gray", linestyle="--", lw=0.8)
    ax.set_xlim(0, 118)
    for i, v in enumerate(vp[::-1]):
        ax.text(v + 1, i, f"{v:.1f}%", va="center", fontsize=8)
    plt.tight_layout()
    _salvar(fig, pasta, "nlp_titulo_en_construcao.png")
    print("    [+] nlp_titulo_en_construcao.png")

    # ── Sentimento VADER ─────────────────────────────────────
    if _NLTK_OK:
        compounds_t = serie.apply(lambda t: _sentimento_vader(t)[0])
        labels_sent = serie.apply(lambda t: _sentimento_vader(t)[1])
        dist_sent = labels_sent.value_counts()
        med_comp = compounds_t.median()

        print(f"\n    Sentimento VADER títulos — mediana: {med_comp:.3f}")
        print(f"    Distribuição: {dist_sent.to_dict()}")

        fig, axes = plt.subplots(1, 2, figsize=(13, 4))
        fig.suptitle(f"Título EN — Sentimento VADER  [{label}]", fontsize=11, fontweight="bold")

        axes[0].hist(compounds_t, bins=25, color=_PAL["azul"], edgecolor="white", lw=0.3)
        axes[0].axvline(med_comp, color=_COR_MED, linestyle="--", lw=1.8, label=f"Med:{med_comp:.3f}")
        axes[0].set_xlabel("compound")
        axes[0].legend(fontsize=8)

        cats_s = list(dist_sent.index)
        vals_s = list(dist_sent.values)
        cores_s = {"positivo": "#2ecc71", "negativo": "#e74c3c", "neutro": "#95a5a6"}
        axes[1].bar(
            cats_s,
            vals_s,
            color=[cores_s.get(c, "#3498db") for c in cats_s],
            edgecolor="white",
            width=0.5,
        )
        axes[1].set_ylabel("nº")
        axes[1].set_ylim(0, max(vals_s) * 1.3)
        for bar, v in zip(axes[1].patches, vals_s):
            axes[1].text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + max(vals_s) * 0.02,
                f"{v} ({v / n * 100:.1f}%)",
                ha="center",
                fontsize=9,
                fontweight="bold",
            )

        plt.tight_layout()
        _salvar(fig, pasta, "nlp_titulo_en_sentimento.png")
        print("    [+] nlp_titulo_en_sentimento.png")

    # ── Correlação × viralidade + RF ─────────────────────────
    if df_nicho is not None and "label_viral" in df_nicho.columns:
        df_v = df_nicho[["label_viral"]].copy()
        df_v["titulo_chars"] = comp_chars.values
        df_v["titulo_tokens"] = comp_tokens.values
        df_v["titulo_ttr"] = serie.apply(lambda t: _ttr(_tokenizar(t))).values
        df_v["titulo_hashtags"] = serie.str.count(r"#\w+").values
        df_v["titulo_tem_emoji"] = serie.apply(lambda t: bool(emoji.emoji_list(t))).astype(int).values
        df_v["titulo_tem_num"] = serie.str.contains(r"\d", regex=True, na=False).astype(int).values
        if _NLTK_OK:
            df_v["titulo_compound"] = compounds_t.values

        _boxplot_por_grupo(
            df_v,
            "titulo_chars",
            "label_viral",
            _ORDEM_VIRAL,
            "Comprimento do Título × Viralidade",
            "chars no título",
            pasta,
            "nlp_titulo_en_viral.png",
        )
        print("    [+] nlp_titulo_en_viral.png")

        _rf_feature_importance(
            df_v,
            pasta=pasta,
            nome="nlp_titulo_en_rf_importance.png",
            titulo="Atributos do título → label_viral",
            nicho=nicho,
        )

        # TF-IDF exclusivo super_viral vs frio
        sv = df_nicho.loc[df_nicho["label_viral"] == "super_viral"]
        fr = df_nicho.loc[df_nicho["label_viral"] == "frio"]

        if len(sv) > 2 and len(fr) > 2:
            idx_sv = sv.index.intersection(serie.index)
            idx_fr = fr.index.intersection(serie.index)
            top_sv, top_fr = _tfidf_exclusivos(
                serie.loc[idx_sv].tolist(),
                serie.loc[idx_fr].tolist(),
            )

            print("\n    TF-IDF exclusivo super_viral no título (incluir no novo título):")
            for w, s in top_sv:
                print(f"      {w:20s}: {s:.4f}")

            print("    TF-IDF exclusivo frio no título (evitar):")
            for w, s in top_fr:
                print(f"      {w:20s}: {s:.4f}")

            med_sv = comp_chars.loc[idx_sv].median()
            med_fr = comp_chars.loc[idx_fr].median()
            print(f"\n    Comprimento-alvo → super_viral: {med_sv:.0f} chars | frio: {med_fr:.0f} chars")

            print("\n    Exemplos de títulos SUPER_VIRAL:")
            for txt in serie.loc[idx_sv[:5]]:
                print(f'      → "{txt}"')

    # ── Idioma ───────────────────────────────────────────────
    cnt_script = serie.apply(_detectar_script).value_counts()
    cnt_idioma = serie.apply(_detectar_idioma).value_counts()
    print(f"\n    Scripts: {dict(cnt_script.head(4))}")
    _grafico_idioma_duplo(
        cnt_script,
        cnt_idioma,
        n,
        f"Título EN — Idioma  [{label}]",
        pasta,
        "nlp_titulo_en_idioma.png",
    )
    print("    [+] nlp_titulo_en_idioma.png")


# ─────────────────────────────────────────────────────────────
# MÓDULO 8 — descricao_en
# ─────────────────────────────────────────────────────────────


def analisar_descricao_en(
    serie: pd.Series,
    pasta: str,
    nicho: str,
    df_nicho: pd.DataFrame | None = None,
) -> None:
    n = len(serie)
    label = nicho.upper()
    print(f"\n  [DESCRIÇÃO EN] n={n}")

    _RE_URL = re.compile(r"https?://\S+")
    _CTA = re.compile(
        r"\b(subscribe|follow|like|comment|share|click|watch|tap|join|visit|buy|check|download|sign up|register|get|grab)\b",
        re.I,
    )

    # ── Comprimento ──────────────────────────────────────────
    comp_chars = serie.str.len()
    comp_tokens = serie.apply(lambda t: len(_tokenizar(t)))
    med_chars = comp_chars.median()
    med_tokens = comp_tokens.median()
    curtas = (comp_chars < 50).sum()

    print(f"    Comprimento — mediana: {med_chars:.0f} chars | {med_tokens:.0f} tokens")
    print(f"    Curtas (<50 chars): {curtas} ({curtas / n * 100:.1f}%)")

    pcts_c = {p: comp_chars.quantile(p / 100) for p in [10, 25, 75, 90]}

    fig, ax = plt.subplots(figsize=(10, 4))
    fig.suptitle(f"Descrição EN — Comprimento  [{label}]  (n={n})", fontsize=11, fontweight="bold")
    ax.hist(comp_chars, bins=40, color=_PAL["azul"], edgecolor="white", lw=0.3)
    for p, cor, ls in [(10, _COR_OUTER, "-."), (25, _COR_IQR, ":"), (75, _COR_IQR, ":"), (90, _COR_OUTER, "-.")]:
        ax.axvline(pcts_c[p], color=cor, linestyle=ls, lw=1.2, label=f"P{p}:{pcts_c[p]:.0f}")
    ax.axvline(med_chars, color=_COR_MED, linestyle="--", lw=1.8, label=f"Med:{med_chars:.0f}")
    ax.set_xlabel("chars")
    ax.set_ylabel("freq")
    ax.legend(fontsize=7)
    ax.text(
        0.98,
        0.97,
        f"< 50 chars: {curtas / n * 100:.1f}%",
        transform=ax.transAxes,
        fontsize=8,
        color="#e74c3c",
        ha="right",
        va="top",
        bbox=dict(boxstyle="round,pad=0.3", facecolor="#fdecea", alpha=0.8),
    )
    plt.tight_layout()
    _salvar(fig, pasta, "nlp_descricao_en_comprimento.png")
    print("    [+] nlp_descricao_en_comprimento.png")

    # ── Perfil de construção ─────────────────────────────────
    def _ratio_caps(texto: str) -> float:
        palavras = re.findall(r"[A-Za-z]+", texto)
        if not palavras:
            return 0.0
        return sum(1 for p in palavras if p.isupper() and len(p) > 1) / len(palavras)

    def _is_link_farm(texto: str) -> bool:
        linhas = [linha for linha in texto.splitlines() if linha.strip()]
        if not linhas:
            return False
        com_url = sum(1 for linha in linhas if _RE_URL.search(linha))
        return (com_url / len(linhas)) >= 0.5

    qtd_urls = serie.apply(lambda t: len(_RE_URL.findall(t)))
    caps_desc = serie.apply(_ratio_caps)

    padroes = {
        "Tem emoji": serie.apply(lambda t: bool(emoji.emoji_list(t))).sum() / n * 100,
        "Tem hashtag (#)": serie.str.contains(r"#\w+", regex=True, na=False).sum() / n * 100,
        "Tem número": serie.str.contains(r"\d", regex=True, na=False).sum() / n * 100,
        "Tem ? ou !": serie.str.contains(r"[?!]", regex=True, na=False).sum() / n * 100,
        "Tem URL": (qtd_urls > 0).sum() / n * 100,
        "Tem CTA": serie.apply(lambda t: bool(_CTA.search(str(t)))).sum() / n * 100,
        "CAPS ≥10%": (caps_desc >= 0.10).sum() / n * 100,
        "Link-farm (≥50% l.)": serie.apply(_is_link_farm).sum() / n * 100,
    }

    print("\n    Perfil de construção da descrição:")
    for k, v in padroes.items():
        print(f"      {k:28s}: {v:5.1f}%")

    fig, ax = plt.subplots(figsize=(10, max(4, len(padroes) * 0.65 + 1)))
    fig.suptitle(f"Descrição EN — Perfil de Construção  [{label}]", fontsize=11, fontweight="bold")
    lp = list(padroes.keys())
    vp = list(padroes.values())
    cp = [_PAL["vermelho"] if v > 50 else _PAL["laranja"] if v > 20 else _PAL["verde"] for v in vp]
    ax.barh(lp[::-1], vp[::-1], color=cp[::-1], edgecolor="white", height=0.6)
    ax.set_xlabel("% das descrições")
    ax.axvline(50, color="gray", linestyle="--", lw=0.8)
    ax.set_xlim(0, 118)
    for i, v in enumerate(vp[::-1]):
        ax.text(v + 1, i, f"{v:.1f}%", va="center", fontsize=8)
    plt.tight_layout()
    _salvar(fig, pasta, "nlp_descricao_en_construcao.png")
    print("    [+] nlp_descricao_en_construcao.png")

    # ── N-gramas TF-IDF ──────────────────────────────────────
    corpus = serie.tolist()

    if _SKLEARN_OK:
        try:
            sw = list(_get_stopwords())
            vec_ng = TfidfVectorizer(
                ngram_range=(2, 3),
                max_features=200,
                stop_words=sw,
                token_pattern=r"(?u)\b[a-z]{3,}\b",
                sublinear_tf=True,
            )
            X_ng = vec_ng.fit_transform(corpus)
            sc = np.asarray(X_ng.mean(axis=0)).flatten()
            tms = vec_ng.get_feature_names_out()
            top_ng = [(tms[i], float(sc[i])) for i in sc.argsort()[::-1][:_TOP_N_NGRAM]]

            if top_ng:
                print("\n    N-gramas TF-IDF da descrição (moldes de linguagem do nicho):")
                for t, v in top_ng[:8]:
                    print(f"      {t}: {v:.4f}")
                _grafico_barras_h(
                    [t for t, _ in top_ng],
                    [round(v, 4) for _, v in top_ng],
                    titulo="N-gramas TF-IDF da descrição",
                    xlabel="TF-IDF médio",
                    pasta=pasta,
                    nome_arquivo="nlp_descricao_en_ngramas.png",
                    cor=_PAL["azul"],
                    suptitle=f"Descrição EN — N-gramas TF-IDF  [{label}]",
                )
                print("    [+] nlp_descricao_en_ngramas.png")

        except Exception as e:
            print(f"    [skip ngrams descricao] {e}")

    # ── Primeira linha (hook do "ver mais") ──────────────────
    primeira_linha = serie.apply(lambda t: t.splitlines()[0].strip() if str(t).splitlines() else "")
    comp_1a = primeira_linha.str.len()
    med_1a = comp_1a.median()

    print(f"\n    Primeira linha — mediana: {med_1a:.0f} chars")

    top_1a = _tfidf_top_terms(primeira_linha.tolist())
    if top_1a:
        print("    TF-IDF primeira linha (moldes para o hook da descrição):")
        for t, v in top_1a[:8]:
            print(f"      {t:20s}: {v:.4f}")
        _grafico_barras_h(
            [t for t, _ in top_1a],
            [round(v, 4) for _, v in top_1a],
            titulo="TF-IDF da primeira linha da descrição",
            xlabel="TF-IDF médio",
            pasta=pasta,
            nome_arquivo="nlp_descricao_en_primeira_linha.png",
            cor=_PAL["roxo"],
            suptitle=f"Descrição — Hook da Primeira Linha  [{label}]",
        )
        print("    [+] nlp_descricao_en_primeira_linha.png")

    # ── Sentimento VADER ─────────────────────────────────────
    if _NLTK_OK:
        compounds_d = serie.apply(lambda t: _sentimento_vader(t)[0])
        labels_sent = serie.apply(lambda t: _sentimento_vader(t)[1])
        dist_sent = labels_sent.value_counts()
        med_comp = compounds_d.median()

        print(f"\n    Sentimento VADER — mediana: {med_comp:.3f} | {dist_sent.to_dict()}")

        fig, axes = plt.subplots(1, 2, figsize=(13, 4))
        fig.suptitle(f"Descrição EN — Sentimento VADER  [{label}]", fontsize=11, fontweight="bold")

        axes[0].hist(compounds_d, bins=25, color=_PAL["azul"], edgecolor="white", lw=0.3)
        axes[0].axvline(med_comp, color=_COR_MED, linestyle="--", lw=1.8, label=f"Med:{med_comp:.3f}")
        axes[0].set_xlabel("compound")
        axes[0].legend(fontsize=8)

        cats_s = list(dist_sent.index)
        vals_s = list(dist_sent.values)
        cores_s = {"positivo": "#2ecc71", "negativo": "#e74c3c", "neutro": "#95a5a6"}
        axes[1].bar(
            cats_s,
            vals_s,
            color=[cores_s.get(c, "#3498db") for c in cats_s],
            edgecolor="white",
            width=0.5,
        )
        axes[1].set_ylabel("nº")
        axes[1].set_ylim(0, max(vals_s) * 1.3)
        for bar, v in zip(axes[1].patches, vals_s):
            axes[1].text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + max(vals_s) * 0.02,
                f"{v} ({v / n * 100:.1f}%)",
                ha="center",
                fontsize=9,
                fontweight="bold",
            )

        plt.tight_layout()
        _salvar(fig, pasta, "nlp_descricao_en_sentimento.png")
        print("    [+] nlp_descricao_en_sentimento.png")

    # ── Correlação × viralidade + RF ─────────────────────────
    if df_nicho is not None and "label_viral" in df_nicho.columns:
        df_v = df_nicho[["label_viral"]].copy()
        df_v["desc_chars"] = comp_chars.values
        df_v["desc_tokens"] = comp_tokens.values
        df_v["desc_1a_chars"] = comp_1a.values
        df_v["desc_hashtags"] = serie.str.count(r"#\w+").values
        df_v["desc_tem_cta"] = serie.apply(lambda t: bool(_CTA.search(str(t)))).astype(int).values
        df_v["desc_tem_url"] = (qtd_urls > 0).astype(int).values
        df_v["desc_caps"] = caps_desc.values
        if _NLTK_OK:
            df_v["desc_compound"] = compounds_d.values

        _boxplot_por_grupo(
            df_v,
            "desc_chars",
            "label_viral",
            _ORDEM_VIRAL,
            "Comprimento da Descrição × Viralidade",
            "chars na descrição",
            pasta,
            "nlp_descricao_en_viral.png",
        )
        print("    [+] nlp_descricao_en_viral.png")

        _rf_feature_importance(
            df_v,
            pasta=pasta,
            nome="nlp_descricao_en_rf_importance.png",
            titulo="Atributos da descrição → label_viral",
            nicho=nicho,
        )

        # TF-IDF exclusivo super_viral vs frio
        sv = df_nicho.loc[df_nicho["label_viral"] == "super_viral"]
        fr = df_nicho.loc[df_nicho["label_viral"] == "frio"]

        if len(sv) > 2 and len(fr) > 2:
            idx_sv = sv.index.intersection(serie.index)
            idx_fr = fr.index.intersection(serie.index)
            top_sv, top_fr = _tfidf_exclusivos(
                serie.loc[idx_sv].tolist(),
                serie.loc[idx_fr].tolist(),
            )

            print("\n    TF-IDF exclusivo super_viral na descrição (o que escrever):")
            for w, s in top_sv[:8]:
                print(f"      {w:20s}: {s:.4f}")

            print("    TF-IDF exclusivo frio na descrição (evitar):")
            for w, s in top_fr[:8]:
                print(f"      {w:20s}: {s:.4f}")

            med_sv = comp_chars.loc[idx_sv].median()
            med_fr = comp_chars.loc[idx_fr].median()
            print(f"\n    Comprimento ideal → super_viral: {med_sv:.0f} chars | frio: {med_fr:.0f} chars")

            med_1a_sv = comp_1a.loc[idx_sv].median()
            med_1a_fr = comp_1a.loc[idx_fr].median()
            print(f"    Primeira linha ideal → super_viral: {med_1a_sv:.0f} chars | frio: {med_1a_fr:.0f} chars")

            print("\n    Exemplos de primeira linha SUPER_VIRAL:")
            for txt in primeira_linha.loc[idx_sv[:5]]:
                if txt.strip():
                    print(f'      → "{txt}"')

    # ── Idioma ───────────────────────────────────────────────
    cnt_script = serie.apply(_detectar_script).value_counts()
    cnt_idioma = serie.apply(_detectar_idioma).value_counts()
    print(f"\n    Scripts: {dict(cnt_script.head(4))}")
    _grafico_idioma_duplo(
        cnt_script,
        cnt_idioma,
        n,
        f"Descrição EN — Idioma  [{label}]",
        pasta,
        "nlp_descricao_en_idioma.png",
    )
    print("    [+] nlp_descricao_en_idioma.png")


# ─────────────────────────────────────────────────────────────
# MÓDULO 9 — texto_falado_limpo_en
# ─────────────────────────────────────────────────────────────


def analisar_texto_falado_limpo_en(
    serie: pd.Series,
    pasta: str,
    nicho: str,
    df_nicho: pd.DataFrame | None = None,
) -> None:
    n = len(serie)
    label = nicho.upper()
    print(f"\n  [TEXTO FALADO LIMPO EN] n={n}")

    # ── Comprimento ──────────────────────────────────────────
    comp_chars = serie.str.len()
    comp_tokens = serie.apply(lambda t: len(_tokenizar(t)))
    med_chars = comp_chars.median()
    med_tokens = comp_tokens.median()
    sem_fala = (comp_tokens == 0).sum()

    print(f"    Comprimento — mediana: {med_chars:.0f} chars | {med_tokens:.0f} tokens")
    print(f"    Sem fala: {sem_fala} ({sem_fala / n * 100:.1f}%)")

    pcts_c = {p: comp_chars.quantile(p / 100) for p in [10, 25, 75, 90]}

    fig, ax = plt.subplots(figsize=(10, 4))
    fig.suptitle(f"Texto Falado Limpo EN — Comprimento  [{label}]  (n={n})", fontsize=11, fontweight="bold")
    ax.hist(comp_chars, bins=40, color=_PAL["azul"], edgecolor="white", lw=0.3)
    for p, cor, ls in [(10, _COR_OUTER, "-."), (25, _COR_IQR, ":"), (75, _COR_IQR, ":"), (90, _COR_OUTER, "-.")]:
        ax.axvline(pcts_c[p], color=cor, linestyle=ls, lw=1.2, label=f"P{p}:{pcts_c[p]:.0f}")
    ax.axvline(med_chars, color=_COR_MED, linestyle="--", lw=1.8, label=f"Med:{med_chars:.0f}")
    ax.set_xlabel("chars")
    ax.set_ylabel("freq")
    ax.legend(fontsize=7)
    plt.tight_layout()
    _salvar(fig, pasta, "nlp_falado_en_comprimento.png")
    print("    [+] nlp_falado_en_comprimento.png")

    # ── TF-IDF léxico global ─────────────────────────────────
    corpus = serie.tolist()
    top_tfidf = _tfidf_top_terms(corpus)

    if top_tfidf:
        print("\n    TF-IDF léxico do roteiro (termos do nicho):")
        for t, v in top_tfidf[:10]:
            print(f"      {t:20s}: {v:.4f}")
        _grafico_barras_h(
            [t for t, _ in top_tfidf],
            [round(v, 4) for _, v in top_tfidf],
            titulo=f"Top {_TOP_N_VOCAB} termos TF-IDF do roteiro",
            xlabel="TF-IDF médio",
            pasta=pasta,
            nome_arquivo="nlp_falado_en_tfidf.png",
            cor=_PAL["verde"],
            suptitle=f"Texto Falado — TF-IDF Léxico do Nicho  [{label}]",
        )
        print("    [+] nlp_falado_en_tfidf.png")

    # ── N-gramas TF-IDF ──────────────────────────────────────
    if _SKLEARN_OK:
        try:
            sw = list(_get_stopwords())
            vec_ng = TfidfVectorizer(
                ngram_range=(2, 3),
                max_features=300,
                stop_words=sw,
                token_pattern=r"(?u)\b[a-z]{3,}\b",
                sublinear_tf=True,
            )
            X_ng = vec_ng.fit_transform(corpus)
            sc = np.asarray(X_ng.mean(axis=0)).flatten()
            tms = vec_ng.get_feature_names_out()
            top_ng = [(tms[i], float(sc[i])) for i in sc.argsort()[::-1][:_TOP_N_NGRAM]]

            if top_ng:
                print("\n    N-gramas TF-IDF do roteiro (moldes de frase para replicar):")
                for t, v in top_ng[:8]:
                    print(f"      {t}: {v:.4f}")
                _grafico_barras_h(
                    [t for t, _ in top_ng],
                    [round(v, 4) for _, v in top_ng],
                    titulo="N-gramas TF-IDF do roteiro",
                    xlabel="TF-IDF médio",
                    pasta=pasta,
                    nome_arquivo="nlp_falado_en_ngramas.png",
                    cor=_PAL["verde_e"],
                    suptitle=f"Texto Falado — N-gramas TF-IDF  [{label}]",
                )
                print("    [+] nlp_falado_en_ngramas.png")

        except Exception as e:
            print(f"    [skip ngrams falado] {e}")

    # ── Variância do comprimento de frase (ritmo textual) ────
    variancias_frase: list[float] = []
    for texto in serie:
        frases = _tokenizar_frases(texto)
        if len(frases) >= 2:
            comprimentos = [len(frase.split()) for frase in frases]
            variancias_frase.append(float(np.var(comprimentos)))
        else:
            variancias_frase.append(0.0)

    serie_var = pd.Series(variancias_frase, index=serie.index)
    med_var = serie_var[serie_var > 0].median() if (serie_var > 0).any() else 0.0

    print(f"\n    Variância de ritmo — mediana: {med_var:.2f}  (alta = roteiro dinâmico)")

    fig, ax = plt.subplots(figsize=(9, 4))
    fig.suptitle(f"Texto Falado — Variância de Ritmo Textual  [{label}]", fontsize=11, fontweight="bold")
    ax.hist(serie_var[serie_var > 0], bins=30, color=_PAL["laranja"], edgecolor="white", lw=0.3)
    ax.axvline(med_var, color=_COR_MED, linestyle="--", lw=1.8, label=f"Med:{med_var:.2f}")
    ax.set_xlabel("variância do comprimento de frase")
    ax.set_ylabel("freq")
    ax.legend(fontsize=9)
    ax.text(
        0.98,
        0.97,
        "Alta = roteiro dinâmico\nBaixa = frases uniformes",
        transform=ax.transAxes,
        ha="right",
        va="top",
        fontsize=8,
        color="#555",
    )
    plt.tight_layout()
    _salvar(fig, pasta, "nlp_falado_en_ritmo_frase.png")
    print("    [+] nlp_falado_en_ritmo_frase.png")

    # ── Análise por terço (início / meio / fim) ──────────────
    ini_corpus: list[str] = []
    mei_corpus: list[str] = []
    fim_corpus: list[str] = []
    ttrs_ini: list[float] = []
    ttrs_mei: list[float] = []
    ttrs_fim: list[float] = []
    sent_ini: list[float] = []
    sent_mei: list[float] = []
    sent_fim: list[float] = []
    tokens_ini_counts: list[int] = []
    tokens_mei_counts: list[int] = []
    tokens_fim_counts: list[int] = []

    for texto in serie:
        tokens = _tokenizar(texto)
        total = len(tokens)

        if total < 5:
            ini_corpus.append("")
            mei_corpus.append(texto)
            fim_corpus.append("")
            ttrs_ini.append(0.0)
            ttrs_mei.append(_ttr(tokens))
            ttrs_fim.append(0.0)
            tokens_ini_counts.append(0)
            tokens_mei_counts.append(total)
            tokens_fim_counts.append(0)
            if _NLTK_OK:
                c, _ = _sentimento_vader(texto)
                sent_ini.append(0.0)
                sent_mei.append(c)
                sent_fim.append(0.0)
            continue

        ci = max(1, int(total * 0.20))
        cf = max(ci + 1, int(total * 0.80))

        ini_toks = tokens[:ci]
        mei_toks = tokens[ci:cf]
        fim_toks = tokens[cf:]

        ini_corpus.append(" ".join(ini_toks))
        mei_corpus.append(" ".join(mei_toks))
        fim_corpus.append(" ".join(fim_toks))

        ttrs_ini.append(_ttr(ini_toks))
        ttrs_mei.append(_ttr(mei_toks))
        ttrs_fim.append(_ttr(fim_toks))

        tokens_ini_counts.append(ci)
        tokens_mei_counts.append(cf - ci)
        tokens_fim_counts.append(total - cf)

        if _NLTK_OK:
            sent_ini.append(_sentimento_vader(" ".join(ini_toks))[0])
            sent_mei.append(_sentimento_vader(" ".join(mei_toks))[0])
            sent_fim.append(_sentimento_vader(" ".join(fim_toks))[0])

    # TF-IDF por terço
    print("\n    TF-IDF por terço do roteiro:")
    for nome_terco, corp in [
        ("Início (0–20%)", ini_corpus),
        ("Meio   (20–80%)", mei_corpus),
        ("Fim   (80–100%)", fim_corpus),
    ]:
        termos = _tfidf_top_terms([c for c in corp if c.strip()], top_n=8)
        if termos:
            print(f"      {nome_terco}: {', '.join(t for t, _ in termos[:6])}")

    # Gráfico TTR + volume por terço
    serie_ini = pd.Series(tokens_ini_counts, index=serie.index)
    serie_mei = pd.Series(tokens_mei_counts, index=serie.index)
    serie_fim = pd.Series(tokens_fim_counts, index=serie.index)

    partes = ["Início\n(0–20%)", "Meio\n(20–80%)", "Fim\n(80–100%)"]
    totais = [int(serie_ini.sum()), int(serie_mei.sum()), int(serie_fim.sum())]
    medianas = [float(serie_ini.median()), float(serie_mei.median()), float(serie_fim.median())]

    serie_ttrs_ini = pd.Series(ttrs_ini, index=serie.index)
    serie_ttrs_mei = pd.Series(ttrs_mei, index=serie.index)
    serie_ttrs_fim = pd.Series(ttrs_fim, index=serie.index)

    ttr_meds = [
        float(serie_ttrs_ini[serie_ttrs_ini > 0].median()) if (serie_ttrs_ini > 0).any() else 0.0,
        float(serie_ttrs_mei[serie_ttrs_mei > 0].median()) if (serie_ttrs_mei > 0).any() else 0.0,
        float(serie_ttrs_fim[serie_ttrs_fim > 0].median()) if (serie_ttrs_fim > 0).any() else 0.0,
    ]

    print("\n    TTR por terço:")
    for parte, ttr in zip(["Início", "Meio", "Fim"], ttr_meds):
        print(f"      {parte:6s}: {ttr:.3f}")

    cores_p = ["#e74c3c", "#3498db", "#2ecc71"]

    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    fig.suptitle(f"Texto Falado — Volume e TTR por Terço  [{label}]", fontsize=11, fontweight="bold")

    for ax_i, (dados, ylabel, titulo_ax) in enumerate(
        [
            (totais, "tokens total", "Total de tokens"),
            (medianas, "tokens/vídeo (med.)", "Mediana por vídeo"),
            (ttr_meds, "TTR mediana", "Riqueza lexical (TTR)"),
        ]
    ):
        bars = axes[ax_i].bar(partes, dados, color=cores_p, edgecolor="white", width=0.5)
        axes[ax_i].set_ylabel(ylabel)
        axes[ax_i].set_title(titulo_ax)
        mx = max(dados) if max(dados) > 0 else 1
        axes[ax_i].set_ylim(0, mx * 1.3)
        for bar, v in zip(bars, dados):
            axes[ax_i].text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + mx * 0.02,
                f"{v:.3f}" if ax_i == 2 else f"{v:.0f}",
                ha="center",
                fontsize=9,
                fontweight="bold",
            )

    plt.tight_layout()
    _salvar(fig, pasta, "nlp_falado_en_ttr_partes.png")
    print("    [+] nlp_falado_en_ttr_partes.png")

    # ── Arco emocional VADER por terço ───────────────────────
    if _NLTK_OK and sent_ini:
        serie_sent_ini = pd.Series(sent_ini, index=serie.index)
        serie_sent_mei = pd.Series(sent_mei, index=serie.index)
        serie_sent_fim = pd.Series(sent_fim, index=serie.index)

        sent_meds = [
            float(serie_sent_ini.median()),
            float(serie_sent_mei.median()),
            float(serie_sent_fim.median()),
        ]

        print("\n    Arco emocional por terço:")
        for parte, s in zip(["Início", "Meio", "Fim"], sent_meds):
            label_s = "positivo" if s >= 0.05 else "negativo" if s <= -0.05 else "neutro"
            print(f"      {parte:6s}: compound={s:.3f} ({label_s})")

        arco = ["positivo" if s >= 0.05 else "negativo" if s <= -0.05 else "neutro" for s in sent_meds]
        print(f"    → Padrão emocional: {arco}")

        fig, ax = plt.subplots(figsize=(8, 4))
        fig.suptitle(
            f"Texto Falado — Arco Emocional (VADER por Terço)  [{label}]",
            fontsize=11,
            fontweight="bold",
        )
        bars = ax.bar(partes, sent_meds, color=cores_p, edgecolor="white", width=0.5)
        ax.axhline(0, color="gray", linestyle="--", lw=0.8)
        ax.axhline(0.05, color="green", linestyle=":", lw=1.0, label="+0.05")
        ax.axhline(-0.05, color="orange", linestyle=":", lw=1.0, label="-0.05")
        ax.set_ylabel("compound VADER (mediana)")
        ax.legend(fontsize=8)
        ax.set_title("Arco emocional do roteiro viral → replicar no novo")
        for bar, v in zip(bars, sent_meds):
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + (0.005 if v >= 0 else -0.012),
                f"{v:.3f}",
                ha="center",
                fontsize=9,
                fontweight="bold",
            )
        plt.tight_layout()
        _salvar(fig, pasta, "nlp_falado_en_sentimento_partes.png")
        print("    [+] nlp_falado_en_sentimento_partes.png")

    # ── Correlação × viralidade + RF ─────────────────────────
    if df_nicho is not None and "label_viral" in df_nicho.columns:
        df_v = df_nicho[["label_viral"]].copy()
        df_v["falado_chars"] = comp_chars.values
        df_v["falado_tokens"] = comp_tokens.values
        df_v["falado_ttr"] = serie.apply(lambda t: _ttr(_tokenizar(t))).values
        df_v["falado_var_frase"] = serie_var.values
        if _NLTK_OK:
            df_v["falado_compound"] = serie.apply(lambda t: _sentimento_vader(t)[0]).values
        if "ritmo_palavras_seg" in df_nicho.columns:
            df_v["ritmo_palavras_seg"] = pd.to_numeric(df_nicho["ritmo_palavras_seg"], errors="coerce").fillna(0).values

        _boxplot_por_grupo(
            df_v,
            "falado_tokens",
            "label_viral",
            _ORDEM_VIRAL,
            "Densidade do Roteiro × Viralidade",
            "tokens no roteiro",
            pasta,
            "nlp_falado_en_viral.png",
        )
        print("    [+] nlp_falado_en_viral.png")

        _rf_feature_importance(
            df_v,
            pasta=pasta,
            nome="nlp_falado_en_rf_importance.png",
            titulo="Atributos do roteiro → label_viral",
            nicho=nicho,
        )

        # TF-IDF exclusivo super_viral vs frio
        sv = df_nicho.loc[df_nicho["label_viral"] == "super_viral"]
        fr = df_nicho.loc[df_nicho["label_viral"] == "frio"]

        if len(sv) > 2 and len(fr) > 2:
            idx_sv = sv.index.intersection(serie.index)
            idx_fr = fr.index.intersection(serie.index)
            top_sv, top_fr = _tfidf_exclusivos(
                serie.loc[idx_sv].tolist(),
                serie.loc[idx_fr].tolist(),
            )

            print("\n    TF-IDF exclusivo super_viral no roteiro (termos obrigatórios):")
            for w, s in top_sv:
                print(f"      {w:20s}: {s:.4f}")

            print("    TF-IDF exclusivo frio no roteiro (sinal de alerta):")
            for w, s in top_fr:
                print(f"      {w:20s}: {s:.4f}")

            med_sv_tok = comp_tokens.loc[idx_sv].median()
            med_fr_tok = comp_tokens.loc[idx_fr].median()
            med_sv_var = serie_var.loc[idx_sv].median()
            med_fr_var = serie_var.loc[idx_fr].median()

            print(f"\n    Tokens roteiro → super_viral: {med_sv_tok:.0f} | frio: {med_fr_tok:.0f}")
            print(f"    Variância ritmo → super_viral: {med_sv_var:.2f} | frio: {med_fr_var:.2f}")

            if "ritmo_palavras_seg" in df_nicho.columns:
                med_sv_ritmo = pd.to_numeric(df_nicho.loc[idx_sv, "ritmo_palavras_seg"], errors="coerce").median()
                med_fr_ritmo = pd.to_numeric(df_nicho.loc[idx_fr, "ritmo_palavras_seg"], errors="coerce").median()
                print(f"    Ritmo (palavras/s) → super_viral: {med_sv_ritmo:.2f} | frio: {med_fr_ritmo:.2f}")

    # ── Idioma ───────────────────────────────────────────────
    cnt_script = serie.apply(_detectar_script).value_counts()
    cnt_idioma = serie.apply(_detectar_idioma).value_counts()
    print(f"\n    Scripts: {dict(cnt_script.head(4))}")
    _grafico_idioma_duplo(
        cnt_script,
        cnt_idioma,
        n,
        f"Texto Falado Limpo EN — Idioma  [{label}]",
        pasta,
        "nlp_falado_en_idioma.png",
    )
    print("    [+] nlp_falado_en_idioma.png")


# ─────────────────────────────────────────────────────────────
# MÓDULO 10 — ANÁLISES CRUZADAS
# ─────────────────────────────────────────────────────────────


def analisar_cruzamentos_novas(
    df_nicho: pd.DataFrame,
    pasta: str,
    nicho: str,
) -> None:
    label = nicho.upper()
    print("\n  [CRUZAMENTOS TEXTO × VIRALIDADE]")

    # ── Derivar métricas textuais de cada coluna disponível ──
    colunas_metricas: dict[str, np.ndarray] = {}

    def _len_serie(serie: pd.Series) -> pd.Series:
        return serie.str.len()

    def _len_tokenizar(serie: pd.Series) -> pd.Series:
        return serie.apply(lambda t: len(_tokenizar(t)))

    def _len_emojis(serie: pd.Series) -> pd.Series:
        return serie.apply(lambda t: len(emoji.emoji_list(str(t))))

    def _len_termos_seo(serie: pd.Series) -> pd.Series:
        return serie.apply(lambda t: len([x for x in str(t).split(",") if x.strip()]))

    colunas_check = {
        "gancho_primeira_frase": _len_serie,
        "titulo_en": _len_serie,
        "descricao_en": _len_serie,
        "texto_falado_limpo_en": _len_tokenizar,
        "texto_thumbnail": _len_serie,
        "palavras_chave_en": _len_termos_seo,
        "vibe_emojis": _len_emojis,
    }

    for col, fn in colunas_check.items():
        if col in df_nicho.columns:
            serie = df_nicho[col].fillna("").astype(str).str.strip()
            colunas_metricas[f"len_{col[:12]}"] = fn(serie).values

    metricas_num = ["score_viral", "clickbait_score", "completude_seo", "velocidade_views", "taxa_conversao"]
    for col in metricas_num:
        if col in df_nicho.columns:
            colunas_metricas[col] = pd.to_numeric(df_nicho[col], errors="coerce").fillna(0).values

    # ── 1. Correlação Spearman ────────────────────────────────
    if len(colunas_metricas) >= 4:
        df_corr = pd.DataFrame(colunas_metricas, index=df_nicho.index)
        matriz = df_corr.corr(method="spearman")

        largura = max(8, len(df_corr.columns) * 0.8)
        altura = max(7, len(df_corr.columns) * 0.7)
        fig, ax = plt.subplots(figsize=(largura, altura))
        fig.suptitle(
            f"Cruzado — Correlação Spearman Texto × Viralidade  [{label}]",
            fontsize=11,
            fontweight="bold",
        )
        mask = np.triu(np.ones_like(matriz, dtype=bool), k=1)
        sns.heatmap(
            matriz,
            annot=True,
            fmt=".2f",
            cmap="coolwarm",
            center=0,
            vmin=-1,
            vmax=1,
            linewidths=0.5,
            linecolor="white",
            mask=mask,
            ax=ax,
            annot_kws={"size": 8, "weight": "bold"},
        )
        plt.tight_layout()
        _salvar(fig, pasta, "nlp_cruzado_correlacao_texto.png")
        print("    [+] nlp_cruzado_correlacao_texto.png")

        pares: list[tuple] = []
        vistos: set = set()
        for ca in matriz.columns:
            for cb in matriz.columns:
                if ca == cb:
                    continue
                par = tuple(sorted([ca, cb]))
                if par in vistos:
                    continue
                vistos.add(par)
                r = matriz.loc[ca, cb]
                pares.append((abs(r), ca, cb, r))

        print("\n    Top correlações texto × viralidade:")
        for _, ca, cb, r in sorted(pares, reverse=True)[:10]:
            forca = "🔴 Forte" if abs(r) >= 0.7 else "🟡 Moderada" if abs(r) >= 0.4 else "⚪ Fraca"
            print(f"      {ca:22s} ↔ {cb:22s}: r={r:+.3f}  {forca}")

    # ── 2. RF global ─────────────────────────────────────────
    if "label_viral" in df_nicho.columns and len(colunas_metricas) >= 3:
        df_rf_global = pd.DataFrame(colunas_metricas, index=df_nicho.index)
        df_rf_global["label_viral"] = df_nicho["label_viral"].values
        _rf_feature_importance(
            df_rf_global,
            pasta=pasta,
            nome="nlp_cruzado_rf_global.png",
            titulo="Quais métricas textuais mais explicam viralidade (global)",
            nicho=nicho,
        )

    # ── 3. Sentimento por estrutura_blocos ───────────────────
    if "sentimento_roteiro" in df_nicho.columns and "estrutura_blocos" in df_nicho.columns:
        tab = (
            pd.crosstab(
                df_nicho["estrutura_blocos"],
                df_nicho["sentimento_roteiro"],
                normalize="index",
            )
            * 100
        )

        if not tab.empty:
            fig, ax = plt.subplots(figsize=(9, max(4, len(tab) * 0.8 + 1.5)))
            fig.suptitle(
                f"Cruzado — Sentimento do Roteiro × Estrutura  [{label}]",
                fontsize=11,
                fontweight="bold",
            )
            cores_sent = {"positivo": "#2ecc71", "negativo": "#e74c3c", "neutro": "#95a5a6"}
            bottom = np.zeros(len(tab))

            for col in [c for c in ["positivo", "neutro", "negativo"] if c in tab.columns]:
                vals = tab[col].values
                ax.barh(
                    range(len(tab)),
                    vals,
                    left=bottom,
                    label=col,
                    color=cores_sent[col],
                    edgecolor="white",
                    height=0.6,
                )
                bottom += vals

            ax.set_yticks(range(len(tab)))
            ax.set_yticklabels(tab.index)
            ax.set_xlabel("% de vídeos")
            ax.legend(loc="lower right")
            plt.tight_layout()
            _salvar(fig, pasta, "nlp_cruzado_sentimento_blocos.png")
            print("    [+] nlp_cruzado_sentimento_blocos.png")

            print("\n    Sentimento por estrutura_blocos:")
            for idx in tab.index:
                row_str = " | ".join(f"{col}: {tab.loc[idx, col]:.1f}%" for col in tab.columns)
                print(f"      {idx:25s}: {row_str}")

    # ── 4. Consistência título × roteiro ─────────────────────
    if "sentimento_roteiro" in df_nicho.columns and "titulo_en" in df_nicho.columns and _NLTK_OK:
        sent_titulo = df_nicho["titulo_en"].fillna("").apply(lambda t: _sentimento_vader(t)[1])
        sent_roteiro = df_nicho["sentimento_roteiro"]
        consistente = (sent_titulo == sent_roteiro).sum()
        pct_consist = consistente / len(df_nicho) * 100

        print(f"\n    Consistência título × roteiro: {consistente}/{len(df_nicho)} ({pct_consist:.1f}%)")
        print("    (< 50% = título e roteiro em tons opostos — avaliar se é intencional)")

    # ── 5. Perfil completo super_viral vs frio ────────────────
    if "label_viral" in df_nicho.columns:
        sv = df_nicho.loc[df_nicho["label_viral"] == "super_viral"]
        fr = df_nicho.loc[df_nicho["label_viral"] == "frio"]

        cols_perfil = {
            "Chars título": ("titulo_en", _len_serie),
            "Chars descrição": ("descricao_en", _len_serie),
            "Chars gancho": ("gancho_primeira_frase", _len_serie),
            "Tokens roteiro": ("texto_falado_limpo_en", _len_tokenizar),
            "Chars thumb texto": ("texto_thumbnail", _len_serie),
            "Qtd emojis": ("vibe_emojis", _len_emojis),
            "Qtd termos SEO": ("palavras_chave_en", _len_termos_seo),
        }

        linhas: list[tuple] = []
        for nome, (col, fn) in cols_perfil.items():
            if col not in df_nicho.columns:
                continue
            serie_sv = fn(sv[col].fillna("").astype(str).str.strip()) if len(sv) > 0 else pd.Series(dtype=float)
            serie_fr = fn(fr[col].fillna("").astype(str).str.strip()) if len(fr) > 0 else pd.Series(dtype=float)
            med_sv = float(serie_sv.median()) if len(serie_sv) > 0 else 0.0
            med_fr = float(serie_fr.median()) if len(serie_fr) > 0 else 0.0
            linhas.append((nome, med_sv, med_fr, med_sv - med_fr))

        if linhas:
            print(f"\n    Perfil completo: super_viral (n={len(sv)}) vs frio (n={len(fr)})")
            print(f"    {'Métrica':28s}  {'super_viral':>12}  {'frio':>8}  {'delta':>8}")
            for nome, sv_m, fr_m, delta in linhas:
                sinal = "▲" if delta > 0 else "▼" if delta < 0 else "="
                print(f"      {nome:28s}: {sv_m:>10.1f}  {fr_m:>8.1f}  {sinal}{abs(delta):.1f}")

            nomes = [r[0] for r in linhas]
            sv_ms = [r[1] for r in linhas]
            fr_ms = [r[2] for r in linhas]
            x = np.arange(len(nomes))
            width = 0.35

            fig, ax = plt.subplots(figsize=(11, max(4, len(nomes) * 0.6 + 1.5)))
            fig.suptitle(
                f"Cruzado — Perfil Textual super_viral vs frio  [{label}]",
                fontsize=11,
                fontweight="bold",
            )
            bars1 = ax.barh(
                x + width / 2,
                sv_ms,
                width,
                color=_PAL["roxo"],
                label="super_viral",
                edgecolor="white",
            )
            bars2 = ax.barh(
                x - width / 2,
                fr_ms,
                width,
                color=_PAL["cinza"],
                label="frio",
                edgecolor="white",
            )
            ax.set_yticks(x)
            ax.set_yticklabels(nomes)
            ax.set_xlabel("valor mediano")
            ax.legend(fontsize=9)
            mx = max(sv_ms + fr_ms) if sv_ms or fr_ms else 1
            ax.set_xlim(0, mx * 1.3)

            for bar, v in zip(bars1, sv_ms):
                ax.text(
                    bar.get_width() + mx * 0.01,
                    bar.get_y() + bar.get_height() / 2,
                    f"{v:.1f}",
                    va="center",
                    fontsize=8,
                    color=_PAL["roxo"],
                )
            for bar, v in zip(bars2, fr_ms):
                ax.text(
                    bar.get_width() + mx * 0.01,
                    bar.get_y() + bar.get_height() / 2,
                    f"{v:.1f}",
                    va="center",
                    fontsize=8,
                    color="#777",
                )

            plt.tight_layout()
            _salvar(fig, pasta, "nlp_cruzado_perfil_viral.png")
            print("    [+] nlp_cruzado_perfil_viral.png")


# ─────────────────────────────────────────────────────────────
# PONTO DE ENTRADA PÚBLICO
# ─────────────────────────────────────────────────────────────


def analisar_texto_colunas_novas(
    df_nicho: pd.DataFrame,
    pasta_img_nicho: str,
    nicho: str,
) -> None:
    """
    Orquestra a análise profunda orientada a dois objetivos:
      1. REPLICAR — fórmulas exatas do conteúdo viral
      2. ROTEIRO  — moldes e diretrizes acionáveis para gerar novo conteúdo

    Chama todos os módulos na ordem correta e passa df_nicho completo
    para que cada módulo acesse label_viral e outras colunas cruzadas.

    Parâmetros
    ----------
    df_nicho        : DataFrame filtrado para um único nicho,
                      já com colunas do processador_features.py
    pasta_img_nicho : Subpasta destino dos gráficos
    nicho           : Nome do nicho (usado nos títulos)
    """
    os.makedirs(pasta_img_nicho, exist_ok=True)
    label = nicho.upper()

    print(f"\n{'=' * 60}")
    print(f"  ANÁLISE DE TEXTO v3.0 — [{label}]  ({len(df_nicho)} vídeos)")
    print("  Objetivos: REPLICAR fórmulas + construir MOLDES DE ROTEIRO")
    if not _SKLEARN_OK:
        print("  ⚠️  scikit-learn não instalado — TF-IDF/KMeans/RF desabilitados")
    if not _NLTK_OK:
        print("  ⚠️  nltk não instalado — VADER/stopwords desabilitados")
    print(f"{'=' * 60}")

    def _prep(col: str) -> pd.Series:
        s = df_nicho[col].fillna("").astype(str).str.strip()
        return s.replace(list({"nan", "None", "none", "NaN"}), "")

    _ANALISADORES = {
        "gancho_primeira_frase": analisar_gancho_primeira_frase,
        "vocabulario_falado": analisar_vocabulario_falado,
        "palavras_chave_en": analisar_palavras_chave_en,
        "pistas_audio_en": analisar_pistas_audio_en,
        "vibe_emojis": analisar_vibe_emojis,
        "titulo_en": analisar_titulo_en,
        "descricao_en": analisar_descricao_en,
        "texto_falado_limpo_en": analisar_texto_falado_limpo_en,
    }

    for col, fn in _ANALISADORES.items():
        if col not in df_nicho.columns:
            print(f"\n  [skip] '{col}': coluna não encontrada.")
            continue
        serie = _prep(col)
        if serie.eq("").all():
            print(f"\n  [skip] '{col}': sem dados válidos.")
            continue
        print(f"\n  ── Coluna: {col.upper()} ──")
        fn(serie, pasta_img_nicho, label, df_nicho)

    # Thumbnail — duas séries juntas
    col_txt = "texto_thumbnail"
    col_vis = "descricao_visual_thumb"
    if col_txt in df_nicho.columns and col_vis in df_nicho.columns:
        print("\n  ── Colunas: TEXTO_THUMBNAIL + DESCRICAO_VISUAL_THUMB ──")
        analisar_thumbnail_gemini(
            _prep(col_txt),
            _prep(col_vis),
            pasta_img_nicho,
            label,
            df_nicho,
        )
    else:
        faltando = [c for c in [col_txt, col_vis] if c not in df_nicho.columns]
        print(f"\n  [skip] Thumbnail Gemini: colunas ausentes — {faltando}")

    print("\n  ── ANÁLISES CRUZADAS ──")
    analisar_cruzamentos_novas(df_nicho, pasta_img_nicho, label)

    print(f"\n  Gráficos salvos em: {pasta_img_nicho}")
    print(f"{'=' * 60}\n")
