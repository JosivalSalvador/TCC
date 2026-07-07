"""
analisar_texto_grupo2.py  —  v3.0
==================================
Análise das colunas de texto por nicho.
Detecção de idioma via langdetect (universal — todos os idiomas do mundo).

Colunas analisadas:
    titulo | descricao | tags | topicos_wikipedia | texto_falado

Análises cruzadas:
    - Coerência de script/idioma entre colunas
    - Associação título + descrição ↔ texto_falado
"""

from __future__ import annotations

# ── stdlib ──────────────────────────────────────────────────
import ast
import os
import re
import unicodedata
import urllib.parse
import warnings
from collections import Counter

# ── third-party ─────────────────────────────────────────────
import emoji
import matplotlib.pyplot as plt
import pandas as pd

# ── langdetect (detecta todos os idiomas do mundo)
# fallback silencioso se não instalado: pip install langdetect ──
try:
    from langdetect import DetectorFactory
    from langdetect import detect as _langdetect_detect

    DetectorFactory.seed = 0  # resultados reproduzíveis
    _LANGDETECT_OK = True
except ImportError:
    _LANGDETECT_OK = False

# ── suprimir avisos de fonte/glyph do matplotlib ────────────
warnings.filterwarnings("ignore", message="Glyph.*missing from font")
warnings.filterwarnings("ignore", message="Matplotlib currently does not support")


# ─────────────────────────────────────────────────────────────
# CONSTANTES
# ─────────────────────────────────────────────────────────────

COLUNAS_TEXTO = ["titulo", "descricao", "tags", "topicos_wikipedia", "texto_falado"]

_INVALIDOS = {"", "[]", "nan", "None", "none", "NaN"}
_MIN_TOKEN_LEN = 3  # mínimo de chars para ser considerado token
_TOP_N = 20  # quantos tokens/tags mostrar nos rankings


# ─────────────────────────────────────────────────────────────
# ANÁLISE DE TÍTULO
# ─────────────────────────────────────────────────────────────


def analisar_titulo(serie: pd.Series, pasta: str, nicho: str) -> None:
    """
    Entende COMO o título é construído — não o que ele diz.

    Métricas
    --------
    Comprimento
        - Mediana de chars por título
        - Mediana de tokens por título
        - Estatísticas descritivas de comprimento (min, max, percentis)

    Perfil de construção (% de títulos que contêm cada padrão)
        - Tem emoji? Quais emojis e com que frequência?
        - Tem hashtag (#palavra)?
        - Tem @mention?
        - Tem número?
        - Tem ? ou ! (indicador de clickbait / urgência)?
        - Tem reticências (...)?
        - Proporção de palavras inteiramente em CAIXA ALTA por título
          (palavras 100% maiúsculas vs. título normal)

    Idioma
        - Detecção de script Unicode por título (latin, cyrillic, arabic,
          cjk, devanagari, hangul, hebrew, thai, greek, mixed, ascii_only)
          — proxy de idioma universal, não depende de langdetect
        - Detecção de idioma via langdetect → distribuição dos idiomas
          encontrados no nicho

    Gráficos gerados
    ----------------
        nlp_titulo_comprimento.png  — histograma de chars + tokens com mediana,
                                      P10, P25, P75 e P90 marcados
        nlp_titulo_construcao.png   — barras horizontais com % de cada padrão de construção
                                      + top 10 emojis mais frequentes
        nlp_titulo_idioma.png       — script Unicode (proxy) + idioma via langdetect
    """
    n = len(serie)

    # ── helpers locais ────────────────────────────────────────

    def _tokenizar(texto: str) -> list[str]:
        s = re.sub(r"https?://\S+", " ", texto)
        s = re.sub(r"[#@]\w+", " ", s)
        return [t for t in re.findall(r"\w+", s.lower()) if len(t) >= _MIN_TOKEN_LEN]

    def _detectar_script(texto: str) -> str:
        cont: Counter = Counter()
        for ch in texto:
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
            elif "ARABIC" in nome or "FARSI" in nome:
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
        if not _LANGDETECT_OK:
            return "desconhecido"
        try:
            if len(texto.strip()) < 10:
                return "desconhecido"
            return _langdetect_detect(texto)
        except Exception:
            return "desconhecido"

    def _salvar(fig: plt.Figure, nome: str) -> None:
        fig.savefig(os.path.join(pasta, nome), dpi=110, bbox_inches="tight")
        plt.close(fig)

    # ── 1. COMPRIMENTO ───────────────────────────────────────

    comp_chars = serie.str.len()
    comp_tokens = serie.apply(lambda t: len(_tokenizar(t)))
    med_chars = comp_chars.median()
    med_tokens = comp_tokens.median()

    # percentis calculados uma única vez para reutilizar no gráfico e no print
    percentis_chars = {p: comp_chars.quantile(p / 100) for p in [10, 25, 75, 90]}
    percentis_tokens = {p: comp_tokens.quantile(p / 100) for p in [10, 25, 75, 90]}

    print(f"    Comprimento — mediana: {med_chars:.0f} chars | {med_tokens:.0f} tokens")
    print(f"    Comprimento — min: {comp_chars.min()} | max: {comp_chars.max()} chars")
    for p in [10, 25, 50, 75, 90]:
        val = med_chars if p == 50 else comp_chars.quantile(p / 100)
        print(f"      p{p:02d}: {val:.0f} chars")

    # gráfico: histograma chars (esq) + tokens (dir), ambos com P10/P25/P75/P90
    fig, axes = plt.subplots(1, 2, figsize=(14, 4))
    fig.suptitle(f"Título — Comprimento  [{nicho}]  (n={n})", fontsize=11, fontweight="bold")

    # cores e estilos das linhas de referência
    _COR_MED = "#e74c3c"  # vermelho  → mediana
    _COR_IQR = "#f39c12"  # laranja   → P25 / P75
    _COR_OUTER = "#8e44ad"  # roxo      → P10 / P90

    for ax, dados, cor_hist, titulo, xlabel, med, pcts in [
        (axes[0], comp_chars, "#3498db", "Chars por título", "chars", med_chars, percentis_chars),
        (axes[1], comp_tokens[comp_tokens > 0], "#8e44ad", "Tokens por título", "tokens", med_tokens, percentis_tokens),
    ]:
        ax.hist(dados, bins=40, color=cor_hist, edgecolor="white", linewidth=0.3)
        ax.axvline(pcts[10], color=_COR_OUTER, linestyle="-.", linewidth=1.0, label=f"P10: {pcts[10]:.0f}")
        ax.axvline(pcts[25], color=_COR_IQR, linestyle=":", linewidth=1.2, label=f"P25: {pcts[25]:.0f}")
        ax.axvline(med, color=_COR_MED, linestyle="--", linewidth=1.8, label=f"Mediana: {med:.0f}")
        ax.axvline(pcts[75], color=_COR_IQR, linestyle=":", linewidth=1.2, label=f"P75: {pcts[75]:.0f}")
        ax.axvline(pcts[90], color=_COR_OUTER, linestyle="-.", linewidth=1.0, label=f"P90: {pcts[90]:.0f}")
        ax.set_title(titulo)
        ax.set_xlabel(xlabel)
        ax.set_ylabel("frequência")
        ax.legend(fontsize=8)

    plt.tight_layout()
    _salvar(fig, "nlp_titulo_comprimento.png")
    print("    [+] nlp_titulo_comprimento.png")

    # ── 2. PERFIL DE CONSTRUÇÃO ──────────────────────────────

    def _pct(mask: pd.Series) -> float:
        return mask.sum() / n * 100

    def _ratio_caps(texto: str) -> float:
        palavras = re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ]+", texto)
        if not palavras:
            return 0.0
        return sum(1 for p in palavras if p.isupper() and len(p) > 1) / len(palavras)

    # coleta emojis
    tem_emoji: pd.Series = serie.apply(lambda t: bool(emoji.emoji_list(t)))
    todos_emojis: list[str] = []
    for t in serie:
        todos_emojis.extend(e["emoji"] for e in emoji.emoji_list(t))
    top_emojis = Counter(todos_emojis).most_common(10)

    caps_por_titulo = serie.apply(_ratio_caps)
    med_caps = caps_por_titulo.median() * 100

    padroes = {
        "Tem emoji": _pct(tem_emoji),
        "Tem hashtag (#)": _pct(serie.str.contains(r"#\w+", regex=True, na=False)),
        "Tem @mention": _pct(serie.str.contains(r"@\w+", regex=True, na=False)),
        "Tem número": _pct(serie.str.contains(r"\d", regex=True, na=False)),
        "Tem ? ou !": _pct(serie.str.contains(r"[?!]", regex=True, na=False)),
        "Tem reticências...": _pct(serie.str.contains(r"\.\.\.", regex=True, na=False)),
        "CAPS ≥10% palavras": _pct(caps_por_titulo >= 0.10),
        "CAPS ≥50% palavras": _pct(caps_por_titulo >= 0.50),
    }

    print("\n    Perfil de construção (% de títulos):")
    for k, v in padroes.items():
        print(f"      {k:28s}: {v:5.1f}%")
    print(f"    Mediana de palavras em CAPS por título: {med_caps:.1f}%")
    if top_emojis:
        print(f"    Top emojis: {' '.join(f'{e}({c})' for e, c in top_emojis[:5])}")

    # dimensões dinâmicas — cada painel tem altura proporcional ao seu nº de itens
    n_padroes = len(padroes)
    n_emojis = len(top_emojis) if top_emojis else 1
    altura = max(5, max(n_padroes, n_emojis) * 0.52 + 1.5)

    fig, axes = plt.subplots(1, 2, figsize=(20, altura))
    fig.suptitle(f"Título — Perfil de Construção  [{nicho}]", fontsize=11, fontweight="bold")

    # painel esquerdo: padrões de construção
    labels_pad = list(padroes.keys())
    vals_pad = list(padroes.values())
    cores_pad = ["#e74c3c" if v > 50 else "#f39c12" if v > 20 else "#2ecc71" for v in vals_pad]
    axes[0].barh(labels_pad[::-1], vals_pad[::-1], color=cores_pad[::-1], edgecolor="white", height=0.6)
    axes[0].set_xlabel("% de títulos")
    axes[0].set_title("Padrões de construção")
    axes[0].axvline(50, color="gray", linestyle="--", linewidth=0.8)
    axes[0].set_xlim(0, 118)
    for i, v in enumerate(vals_pad[::-1]):
        axes[0].text(v + 1, i, f"{v:.1f}%", va="center", fontsize=8)

    # painel direito: top emojis
    if top_emojis:
        em_labels = []
        for rank, (em, cnt) in enumerate(top_emojis, 1):
            try:
                nome_em = emoji.demojize(em).strip(":")
            except Exception:
                nome_em = "emoji"
            nome_curto = (nome_em[:25] + "…") if len(nome_em) > 25 else nome_em
            em_labels.append(f"{rank}. :{nome_curto}: ({cnt})")

        em_vals = [c for _, c in top_emojis]
        axes[1].barh(em_labels[::-1], em_vals[::-1], color="#e67e22", edgecolor="white", height=0.6)
        axes[1].set_xlabel("frequência")
        axes[1].set_title(f"Top {len(top_emojis)} emojis nos títulos")
        axes[1].set_xlim(0, max(em_vals) * 1.3)
        for i, v in enumerate(em_vals[::-1]):
            axes[1].text(v + max(em_vals) * 0.02, i, str(v), va="center", fontsize=8)
    else:
        axes[1].text(0.5, 0.5, "Nenhum emoji encontrado", ha="center", va="center", transform=axes[1].transAxes, fontsize=11, color="gray")
        axes[1].set_title("Emojis")
        axes[1].set_xticks([])

    # wspace controlado — gap suficiente para labels longas do painel direito
    fig.subplots_adjust(left=0.16, right=0.97, wspace=0.45)
    _salvar(fig, "nlp_titulo_construcao.png")
    print("    [+] nlp_titulo_construcao.png")

    # ── 3. IDIOMA ────────────────────────────────────────────

    scripts = serie.apply(_detectar_script)
    cnt_script = scripts.value_counts()

    idiomas = serie.apply(_detectar_idioma)
    cnt_idioma = idiomas.value_counts()

    print(f"\n    Scripts Unicode: {dict(cnt_script.head(5))}")
    print(f"    Idiomas (langdetect): {dict(cnt_idioma.head(5))}")

    n_sc = len(cnt_script)
    n_id = len(cnt_idioma)
    altura_id = max(4, max(n_sc, n_id) * 0.48 + 1.5)

    fig, axes = plt.subplots(1, 2, figsize=(14, altura_id))
    fig.suptitle(f"Título — Idioma  [{nicho}]", fontsize=11, fontweight="bold")

    # script Unicode
    sc_labels = list(cnt_script.index)
    axes[0].barh(sc_labels[::-1], cnt_script.values[::-1], color="#1abc9c", edgecolor="white", height=0.6)
    axes[0].set_xlabel("nº de títulos")
    axes[0].set_title("Script Unicode (proxy de idioma)")
    axes[0].set_xlim(0, cnt_script.values.max() * 1.3)
    for i, v in enumerate(cnt_script.values[::-1]):
        axes[0].text(v + cnt_script.values.max() * 0.01, i, f"{v} ({v / n * 100:.1f}%)", va="center", fontsize=8)

    # langdetect
    id_labels = list(cnt_idioma.index)
    axes[1].barh(id_labels[::-1], cnt_idioma.values[::-1], color="#2980b9", edgecolor="white", height=0.6)
    axes[1].set_xlabel("nº de títulos")
    axes[1].set_title("Idioma detectado (langdetect)")
    axes[1].set_xlim(0, cnt_idioma.values.max() * 1.3)
    for i, v in enumerate(cnt_idioma.values[::-1]):
        axes[1].text(v + cnt_idioma.values.max() * 0.01, i, f"{v} ({v / n * 100:.1f}%)", va="center", fontsize=8)

    plt.tight_layout()
    _salvar(fig, "nlp_titulo_idioma.png")
    print("    [+] nlp_titulo_idioma.png")


# ─────────────────────────────────────────────────────────────
# ANÁLISE DE DESCRIÇÃO
# ─────────────────────────────────────────────────────────────


def analisar_descricao(serie: pd.Series, pasta: str, nicho: str) -> None:
    """
    Entende COMO a descrição é construída — estrutura, não conteúdo.

    Aplica todos os mesmos padrões do título, mais extras específicos
    de descrição.

    Métricas
    --------
    Comprimento
        - Mediana de chars por descrição
        - Mediana de tokens por descrição
        - Proporção de descrições vazias ou muito curtas (< 50 chars)

    Perfil de construção (% de descrições que contêm cada padrão)
        - Tem emoji? Quais e com que frequência?
        - Tem hashtag (#palavra)?
        - Tem @mention?
        - Tem número?
        - Tem ? ou ! ?
        - Tem reticências (...)?
        - Proporção de palavras inteiramente em CAIXA ALTA

    Extras de descrição
        - Tem URL(s)? Mediana de URLs por descrição
        - Proporção de linhas com URL vs. linhas de texto puro
          (detecta se a descrição é basicamente uma lista de links)
        - Comprimento mediano da primeira linha separada do resto
          (muitos criadores colocam CTA ou frase de impacto na 1ª linha)

    Idioma
        - Detecção de script Unicode por descrição
        - Detecção de idioma via langdetect → distribuição

    Gráficos gerados
    ----------------
        nlp_descricao_comprimento.png  — histograma de chars + tokens com mediana marcada
        nlp_descricao_construcao.png   — barras horizontais com % de cada padrão
        nlp_descricao_idioma.png       — distribuição de idiomas detectados (langdetect)
    """
    n = len(serie)

    # ── helpers locais ────────────────────────────────────────

    def _tokenizar(texto: str) -> list[str]:
        s = re.sub(r"https?://\S+", " ", texto)
        s = re.sub(r"[#@]\w+", " ", s)
        return [t for t in re.findall(r"\w+", s.lower()) if len(t) >= _MIN_TOKEN_LEN]

    def _detectar_script(texto: str) -> str:
        cont: Counter = Counter()
        for ch in texto:
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
            elif "ARABIC" in nome or "FARSI" in nome:
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
        if not _LANGDETECT_OK:
            return "desconhecido"
        try:
            if len(texto.strip()) < 10:
                return "desconhecido"
            return _langdetect_detect(texto)
        except Exception:
            return "desconhecido"

    def _ratio_caps(texto: str) -> float:
        palavras = re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ]+", texto)
        if not palavras:
            return 0.0
        return sum(1 for p in palavras if p.isupper() and len(p) > 1) / len(palavras)

    def _salvar(fig: plt.Figure, nome: str) -> None:
        fig.savefig(os.path.join(pasta, nome), dpi=110, bbox_inches="tight")
        plt.close(fig)

    _COR_MED = "#e74c3c"
    _COR_IQR = "#f39c12"
    _COR_OUTER = "#8e44ad"

    # ── 1. COMPRIMENTO ───────────────────────────────────────

    comp_chars = serie.str.len()
    comp_tokens = serie.apply(lambda t: len(_tokenizar(t)))
    med_chars = comp_chars.median()
    med_tokens = comp_tokens.median()

    curtas = (comp_chars < 50).sum()
    pct_curtas = curtas / n * 100

    percentis_chars = {p: comp_chars.quantile(p / 100) for p in [10, 25, 75, 90]}
    percentis_tokens = {p: comp_tokens.quantile(p / 100) for p in [10, 25, 75, 90]}

    print(f"    Comprimento — mediana: {med_chars:.0f} chars | {med_tokens:.0f} tokens")
    print(f"    Comprimento — min: {comp_chars.min()} | max: {comp_chars.max()} chars")
    for p in [10, 25, 50, 75, 90]:
        val = med_chars if p == 50 else comp_chars.quantile(p / 100)
        print(f"      p{p:02d}: {val:.0f} chars")
    print(f"    Descrições curtas (< 50 chars): {curtas} ({pct_curtas:.1f}%)")

    fig, axes = plt.subplots(1, 2, figsize=(14, 4))
    fig.suptitle(f"Descrição — Comprimento  [{nicho}]  (n={n})", fontsize=11, fontweight="bold")

    for ax, dados, cor_hist, titulo, xlabel, med, pcts in [
        (axes[0], comp_chars, "#3498db", "Chars por descrição", "chars", med_chars, percentis_chars),
        (axes[1], comp_tokens[comp_tokens > 0], "#8e44ad", "Tokens por descrição", "tokens", med_tokens, percentis_tokens),
    ]:
        ax.hist(dados, bins=40, color=cor_hist, edgecolor="white", linewidth=0.3)
        ax.axvline(pcts[10], color=_COR_OUTER, linestyle="-.", linewidth=1.0, label=f"P10: {pcts[10]:.0f}")
        ax.axvline(pcts[25], color=_COR_IQR, linestyle=":", linewidth=1.2, label=f"P25: {pcts[25]:.0f}")
        ax.axvline(med, color=_COR_MED, linestyle="--", linewidth=1.8, label=f"Mediana: {med:.0f}")
        ax.axvline(pcts[75], color=_COR_IQR, linestyle=":", linewidth=1.2, label=f"P75: {pcts[75]:.0f}")
        ax.axvline(pcts[90], color=_COR_OUTER, linestyle="-.", linewidth=1.0, label=f"P90: {pcts[90]:.0f}")
        ax.set_title(titulo)
        ax.set_xlabel(xlabel)
        ax.set_ylabel("frequência")
        ax.legend(fontsize=8)

    # anotação de curtas no painel de chars
    axes[0].text(0.98, 0.97, f"< 50 chars: {pct_curtas:.1f}%", transform=axes[0].transAxes, fontsize=8, color="#e74c3c", ha="right", va="top", bbox=dict(boxstyle="round,pad=0.3", facecolor="#fdecea", edgecolor="#e74c3c", alpha=0.8))

    plt.tight_layout()
    _salvar(fig, "nlp_descricao_comprimento.png")
    print("    [+] nlp_descricao_comprimento.png")

    # ── 2. PERFIL DE CONSTRUÇÃO ──────────────────────────────

    def _pct(mask: pd.Series) -> float:
        return mask.sum() / n * 100

    # emojis
    tem_emoji: pd.Series = serie.apply(lambda t: bool(emoji.emoji_list(t)))
    todos_emojis: list[str] = []
    for t in serie:
        todos_emojis.extend(e["emoji"] for e in emoji.emoji_list(t))
    top_emojis = Counter(todos_emojis).most_common(10)

    caps_por_desc = serie.apply(_ratio_caps)
    med_caps = caps_por_desc.median() * 100

    padroes = {
        "Tem emoji": _pct(tem_emoji),
        "Tem hashtag (#)": _pct(serie.str.contains(r"#\w+", regex=True, na=False)),
        "Tem @mention": _pct(serie.str.contains(r"@\w+", regex=True, na=False)),
        "Tem número": _pct(serie.str.contains(r"\d", regex=True, na=False)),
        "Tem ? ou !": _pct(serie.str.contains(r"[?!]", regex=True, na=False)),
        "Tem reticências...": _pct(serie.str.contains(r"\.\.\.", regex=True, na=False)),
        "CAPS ≥10% palavras": _pct(caps_por_desc >= 0.10),
        "CAPS ≥50% palavras": _pct(caps_por_desc >= 0.50),
    }

    print("\n    Perfil de construção (% de descrições):")
    for k, v in padroes.items():
        print(f"      {k:28s}: {v:5.1f}%")
    print(f"    Mediana de palavras em CAPS por descrição: {med_caps:.1f}%")
    if top_emojis:
        print(f"    Top emojis: {' '.join(f'{e}({c})' for e, c in top_emojis[:5])}")

    # ── 3. EXTRAS DE DESCRIÇÃO ───────────────────────────────

    _RE_URL = re.compile(r"https?://\S+")

    # URLs
    qtd_urls_por_desc = serie.apply(lambda t: len(_RE_URL.findall(t)))
    tem_url = qtd_urls_por_desc > 0
    pct_tem_url = _pct(tem_url)
    med_urls = qtd_urls_por_desc.median()

    # proporção de linhas com URL vs linhas de texto puro
    def _ratio_linhas_url(texto: str) -> float:
        linhas = [linha for linha in texto.splitlines() if linha.strip()]
        if not linhas:
            return 0.0
        com_url = sum(1 for linha in linhas if _RE_URL.search(linha))
        return com_url / len(linhas)

    ratio_linhas_url = serie.apply(_ratio_linhas_url)
    med_ratio_linhas_url = ratio_linhas_url.median() * 100
    pct_link_farm = (ratio_linhas_url >= 0.5).sum() / n * 100  # maioria das linhas é URL

    # primeira linha vs resto
    primeira_linha_chars = serie.apply(lambda t: len(t.splitlines()[0].strip()) if t.splitlines() else 0)
    med_primeira_linha = primeira_linha_chars.median()

    print("\n    Extras de descrição:")
    print(f"      Tem URL                      : {pct_tem_url:.1f}% das descrições")
    print(f"      Mediana de URLs por descrição: {med_urls:.1f}")
    print(f"      Mediana de linhas com URL    : {med_ratio_linhas_url:.1f}%")
    print(f"      Link-farm (≥50% linhas=URL)  : {pct_link_farm:.1f}% das descrições")
    print(f"      Mediana 1ª linha             : {med_primeira_linha:.0f} chars")

    # ── Gráfico de construção (padrões + emojis) ──────────────

    # adiciona extras ao dicionário de padrões para o gráfico
    padroes_graf = {
        **padroes,
        "Tem URL": pct_tem_url,
        "Link-farm (≥50% l.)": pct_link_farm,
    }

    n_padroes = len(padroes_graf)
    n_emojis = len(top_emojis) if top_emojis else 1
    altura = max(5, max(n_padroes, n_emojis) * 0.52 + 1.5)

    fig, axes = plt.subplots(1, 2, figsize=(20, altura))
    fig.suptitle(f"Descrição — Perfil de Construção  [{nicho}]", fontsize=11, fontweight="bold")

    # painel esquerdo: padrões
    labels_pad = list(padroes_graf.keys())
    vals_pad = list(padroes_graf.values())
    cores_pad = ["#e74c3c" if v > 50 else "#f39c12" if v > 20 else "#2ecc71" for v in vals_pad]
    axes[0].barh(labels_pad[::-1], vals_pad[::-1], color=cores_pad[::-1], edgecolor="white", height=0.6)
    axes[0].set_xlabel("% de descrições")
    axes[0].set_title("Padrões de construção")
    axes[0].axvline(50, color="gray", linestyle="--", linewidth=0.8)
    axes[0].set_xlim(0, 118)
    for i, v in enumerate(vals_pad[::-1]):
        axes[0].text(v + 1, i, f"{v:.1f}%", va="center", fontsize=8)

    # painel direito: top emojis
    if top_emojis:
        em_labels = []
        for rank, (em, cnt) in enumerate(top_emojis, 1):
            try:
                nome_em = emoji.demojize(em).strip(":")
            except Exception:
                nome_em = "emoji"
            nome_curto = (nome_em[:25] + "…") if len(nome_em) > 25 else nome_em
            em_labels.append(f"{rank}. :{nome_curto}: ({cnt})")

        em_vals = [c for _, c in top_emojis]
        axes[1].barh(em_labels[::-1], em_vals[::-1], color="#e67e22", edgecolor="white", height=0.6)
        axes[1].set_xlabel("frequência")
        axes[1].set_title(f"Top {len(top_emojis)} emojis nas descrições")
        axes[1].set_xlim(0, max(em_vals) * 1.3)
        for i, v in enumerate(em_vals[::-1]):
            axes[1].text(v + max(em_vals) * 0.02, i, str(v), va="center", fontsize=8)
    else:
        axes[1].text(0.5, 0.5, "Nenhum emoji encontrado", ha="center", va="center", transform=axes[1].transAxes, fontsize=11, color="gray")
        axes[1].set_title("Emojis")
        axes[1].set_xticks([])

    fig.subplots_adjust(left=0.16, right=0.97, wspace=0.45)
    _salvar(fig, "nlp_descricao_construcao.png")
    print("    [+] nlp_descricao_construcao.png")

    # ── 4. IDIOMA ────────────────────────────────────────────

    scripts = serie.apply(_detectar_script)
    cnt_script = scripts.value_counts()

    idiomas = serie.apply(_detectar_idioma)
    cnt_idioma = idiomas.value_counts()

    print(f"\n    Scripts Unicode: {dict(cnt_script.head(5))}")
    print(f"    Idiomas (langdetect): {dict(cnt_idioma.head(5))}")

    n_sc = len(cnt_script)
    n_id = len(cnt_idioma)
    altura_id = max(4, max(n_sc, n_id) * 0.48 + 1.5)

    fig, axes = plt.subplots(1, 2, figsize=(14, altura_id))
    fig.suptitle(f"Descrição — Idioma  [{nicho}]", fontsize=11, fontweight="bold")

    sc_labels = list(cnt_script.index)
    axes[0].barh(sc_labels[::-1], cnt_script.values[::-1], color="#1abc9c", edgecolor="white", height=0.6)
    axes[0].set_xlabel("nº de descrições")
    axes[0].set_title("Script Unicode (proxy de idioma)")
    axes[0].set_xlim(0, cnt_script.values.max() * 1.3)
    for i, v in enumerate(cnt_script.values[::-1]):
        axes[0].text(v + cnt_script.values.max() * 0.01, i, f"{v} ({v / n * 100:.1f}%)", va="center", fontsize=8)

    id_labels = list(cnt_idioma.index)
    axes[1].barh(id_labels[::-1], cnt_idioma.values[::-1], color="#2980b9", edgecolor="white", height=0.6)
    axes[1].set_xlabel("nº de descrições")
    axes[1].set_title("Idioma detectado (langdetect)")
    axes[1].set_xlim(0, cnt_idioma.values.max() * 1.3)
    for i, v in enumerate(cnt_idioma.values[::-1]):
        axes[1].text(v + cnt_idioma.values.max() * 0.01, i, f"{v} ({v / n * 100:.1f}%)", va="center", fontsize=8)

    plt.tight_layout()
    _salvar(fig, "nlp_descricao_idioma.png")
    print("    [+] nlp_descricao_idioma.png")


# ─────────────────────────────────────────────────────────────
# ANÁLISE DE TAGS
# ─────────────────────────────────────────────────────────────


def analisar_tags(serie: pd.Series, pasta: str, nicho: str) -> None:
    """
    Entende o perfil de tags do nicho — volume, assunto e estratégia SEO.

    Métricas
    --------
    Volume
        - Mediana de tags por vídeo
        - Distribuição de quantidade de tags por vídeo

    Assunto do nicho
        - Top N tags mais frequentes em todo o nicho
          (revela os temas dominantes)

    Estratégia SEO
        - Comprimento médio de cada tag em palavras:
            short-tail  : 1 palavra
            mid         : 2 palavras
            long-tail   : 3+ palavras
        - % de tags em cada categoria

    Idioma
        - Detecção de script Unicode das tags (proxy de idioma)
        - Detecção de idioma via langdetect aplicada ao conjunto
          concatenado de todas as tags do vídeo

    Gráficos gerados
    ----------------
        nlp_tags_distribuicao.png  — histograma de qtd de tags por vídeo com mediana marcada
        nlp_tags_top.png           — barras horizontais top N tags mais frequentes
        nlp_tags_perfil.png        — barras short-tail / mid / long-tail + distribuição de idioma
    """
    n = len(serie)

    # ── helpers locais ────────────────────────────────────────

    def _extrair_tags(texto: str) -> list[str]:
        """Converte string de lista (API) ou CSV em lista de tags limpas."""
        texto = texto.strip()
        if texto.startswith("["):
            try:
                lista = ast.literal_eval(texto)
                if isinstance(lista, list):
                    return [str(t).strip().lower() for t in lista if str(t).strip()]
            except Exception:
                pass
            # fallback: remove colchetes e divide por vírgula
            texto = texto.strip("[]")
        return [t.strip().strip("'\"").lower() for t in texto.split(",") if t.strip().strip("'\"")]

    def _detectar_script(texto: str) -> str:
        cont: Counter = Counter()
        for ch in texto:
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
            elif "ARABIC" in nome or "FARSI" in nome:
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
        if not _LANGDETECT_OK:
            return "desconhecido"
        try:
            if len(texto.strip()) < 10:
                return "desconhecido"
            return _langdetect_detect(texto)
        except Exception:
            return "desconhecido"

    def _salvar(fig: plt.Figure, nome: str) -> None:
        fig.savefig(os.path.join(pasta, nome), dpi=110, bbox_inches="tight")
        plt.close(fig)

    # ── extração de todas as tags ─────────────────────────────

    tags_por_video: list[list[str]] = serie.apply(_extrair_tags).tolist()
    qtd_por_video = pd.Series([len(t) for t in tags_por_video])
    todas_tags = [tag for lista in tags_por_video for tag in lista]

    if not todas_tags:
        print("    [skip] Nenhuma tag válida encontrada.")
        return

    med_tags = qtd_por_video.median()

    print(f"    Volume — mediana de tags por vídeo: {med_tags:.0f}")
    print(f"    Volume — min: {qtd_por_video.min()} | max: {qtd_por_video.max()} tags/vídeo")
    print(f"    Total de tags (todas as ocorrências): {len(todas_tags)}")
    print(f"    Tags únicas no nicho: {len(set(todas_tags))}")

    # ── 1. DISTRIBUIÇÃO DE VOLUME ─────────────────────────────

    percentis = {p: qtd_por_video.quantile(p / 100) for p in [10, 25, 75, 90]}

    fig, ax = plt.subplots(figsize=(9, 4))
    fig.suptitle(f"Tags — Distribuição de Volume  [{nicho}]  (n={n})", fontsize=11, fontweight="bold")

    ax.hist(qtd_por_video, bins=30, color="#27ae60", edgecolor="white", linewidth=0.3)
    ax.axvline(percentis[10], color="#8e44ad", linestyle="-.", linewidth=1.0, label=f"P10: {percentis[10]:.0f}")
    ax.axvline(percentis[25], color="#f39c12", linestyle=":", linewidth=1.2, label=f"P25: {percentis[25]:.0f}")
    ax.axvline(med_tags, color="#e74c3c", linestyle="--", linewidth=1.8, label=f"Mediana: {med_tags:.0f}")
    ax.axvline(percentis[75], color="#f39c12", linestyle=":", linewidth=1.2, label=f"P75: {percentis[75]:.0f}")
    ax.axvline(percentis[90], color="#8e44ad", linestyle="-.", linewidth=1.0, label=f"P90: {percentis[90]:.0f}")
    ax.set_xlabel("quantidade de tags por vídeo")
    ax.set_ylabel("frequência")
    ax.legend(fontsize=8)

    plt.tight_layout()
    _salvar(fig, "nlp_tags_distribuicao.png")
    print("    [+] nlp_tags_distribuicao.png")

    # ── 2. TOP N TAGS MAIS FREQUENTES ────────────────────────

    cnt_tags = Counter(todas_tags)
    top_tags = cnt_tags.most_common(_TOP_N)
    top_labels = [t for t, _ in top_tags]
    top_vals = [c for _, c in top_tags]

    # trunca labels longas para não vazar no gráfico
    top_labels_vis = [(lb[:35] + "…") if len(lb) > 35 else lb for lb in top_labels]

    altura_top = max(5, len(top_tags) * 0.45 + 1.5)
    fig, ax = plt.subplots(figsize=(11, altura_top))
    fig.suptitle(f"Tags — Top {_TOP_N} mais frequentes  [{nicho}]", fontsize=11, fontweight="bold")

    ax.barh(top_labels_vis[::-1], top_vals[::-1], color="#2980b9", edgecolor="white", height=0.6)
    ax.set_xlabel("frequência (nº de vídeos)")
    ax.set_xlim(0, max(top_vals) * 1.3)
    for i, v in enumerate(top_vals[::-1]):
        ax.text(v + max(top_vals) * 0.01, i, str(v), va="center", fontsize=8)

    print(f"\n    Top {_TOP_N} tags mais frequentes:")
    for tag, cnt in top_tags:
        print(f"      {tag:35s}: {cnt}")

    plt.tight_layout()
    _salvar(fig, "nlp_tags_top.png")
    print("    [+] nlp_tags_top.png")

    # ── 3. PERFIL SEO + IDIOMA ────────────────────────────────

    # classificação por nº de palavras
    n_palavras_por_tag = [len(tag.split()) for tag in todas_tags]
    total_tags = len(n_palavras_por_tag)

    qtd_short = sum(1 for x in n_palavras_por_tag if x == 1)
    qtd_mid = sum(1 for x in n_palavras_por_tag if x == 2)
    qtd_long = sum(1 for x in n_palavras_por_tag if x >= 3)

    pct_short = qtd_short / total_tags * 100
    pct_mid = qtd_mid / total_tags * 100
    pct_long = qtd_long / total_tags * 100

    print("\n    Estratégia SEO:")
    print(f"      Short-tail (1 palavra) : {qtd_short:5d}  ({pct_short:.1f}%)")
    print(f"      Mid        (2 palavras): {qtd_mid:5d}  ({pct_mid:.1f}%)")
    print(f"      Long-tail  (3+ palavras): {qtd_long:5d}  ({pct_long:.1f}%)")

    # idioma — concatena todas as tags do vídeo e detecta no conjunto
    textos_concat = serie.apply(lambda t: " ".join(_extrair_tags(t)))
    scripts_serie = textos_concat.apply(_detectar_script)
    idiomas_serie = textos_concat.apply(_detectar_idioma)
    cnt_script = scripts_serie.value_counts()
    cnt_idioma = idiomas_serie.value_counts()

    print(f"\n    Scripts Unicode (tags): {dict(cnt_script.head(5))}")
    print(f"    Idiomas (langdetect)  : {dict(cnt_idioma.head(5))}")

    # gráfico: 3 painéis lado a lado
    n_id = len(cnt_idioma)
    n_sc = len(cnt_script)
    altura = max(5, max(3, n_id, n_sc) * 0.52 + 1.5)

    fig, axes = plt.subplots(1, 3, figsize=(18, altura))
    fig.suptitle(f"Tags — Perfil SEO e Idioma  [{nicho}]", fontsize=11, fontweight="bold")

    # painel 1: short / mid / long-tail
    seo_labels = ["Short-tail\n(1 palavra)", "Mid\n(2 palavras)", "Long-tail\n(3+ palavras)"]
    seo_vals = [pct_short, pct_mid, pct_long]
    seo_cores = ["#e74c3c", "#f39c12", "#2ecc71"]
    bars = axes[0].bar(seo_labels, seo_vals, color=seo_cores, edgecolor="white", width=0.5)
    axes[0].set_ylabel("% de tags")
    axes[0].set_title("Estratégia SEO")
    axes[0].set_ylim(0, max(seo_vals) * 1.25)
    for bar, v in zip(bars, seo_vals):
        axes[0].text(bar.get_x() + bar.get_width() / 2, bar.get_height() + max(seo_vals) * 0.02, f"{v:.1f}%", ha="center", va="bottom", fontsize=9, fontweight="bold")

    # painel 2: script Unicode
    sc_labels = list(cnt_script.index)
    axes[1].barh(sc_labels[::-1], cnt_script.values[::-1], color="#1abc9c", edgecolor="white", height=0.6)
    axes[1].set_xlabel("nº de vídeos")
    axes[1].set_title("Script Unicode (proxy de idioma)")
    axes[1].set_xlim(0, cnt_script.values.max() * 1.3)
    for i, v in enumerate(cnt_script.values[::-1]):
        axes[1].text(v + cnt_script.values.max() * 0.01, i, f"{v} ({v / n * 100:.1f}%)", va="center", fontsize=8)

    # painel 3: idioma langdetect
    id_labels = list(cnt_idioma.index)
    axes[2].barh(id_labels[::-1], cnt_idioma.values[::-1], color="#2980b9", edgecolor="white", height=0.6)
    axes[2].set_xlabel("nº de vídeos")
    axes[2].set_title("Idioma detectado (langdetect)")
    axes[2].set_xlim(0, cnt_idioma.values.max() * 1.3)
    for i, v in enumerate(cnt_idioma.values[::-1]):
        axes[2].text(v + cnt_idioma.values.max() * 0.01, i, f"{v} ({v / n * 100:.1f}%)", va="center", fontsize=8)

    fig.subplots_adjust(left=0.08, right=0.97, wspace=0.45)
    _salvar(fig, "nlp_tags_perfil.png")
    print("    [+] nlp_tags_perfil.png")


# ─────────────────────────────────────────────────────────────
# ANÁLISE DE TÓPICOS WIKIPEDIA
# ─────────────────────────────────────────────────────────────


def analisar_topicos_wikipedia(serie: pd.Series, pasta: str, nicho: str) -> None:
    """
    Entende os temas do nicho a partir dos tópicos vinculados pelo YouTube.

    Observação: esta coluna é gerada automaticamente pelo YouTube,
    não pelo criador. O idioma do slug não é relevante para análise.

    Métricas
    --------
    Extração
        - Extrai o slug final da URL (tudo após o último '/')
        - Decodifica %xx para texto legível (urllib.parse.unquote)
        - Substitui '_' por espaço para leitura humana

    Volume
        - Mediana de tópicos por vídeo

    Assunto do nicho
        - Top N tópicos mais frequentes
          (revela as categorias temáticas do nicho)
        - Distribuição de frequência dos tópicos (curva Zipf em log-log)
          para entender se há poucos temas dominantes ou muita diversidade

    Gráficos gerados
    ----------------
        nlp_topicos_distribuicao.png  — histograma de qtd de tópicos por vídeo
        nlp_topicos_top.png           — barras horizontais top N tópicos
    """
    n = len(serie)

    # ── helpers locais ────────────────────────────────────────

    def _extrair_urls(texto: str) -> list[str]:
        """Converte string de lista ou CSV em lista de URLs brutas."""
        texto = texto.strip()
        if texto.startswith("["):
            try:
                lista = ast.literal_eval(texto)
                if isinstance(lista, list):
                    return [str(u).strip() for u in lista if str(u).strip()]
            except Exception:
                pass
            texto = texto.strip("[]")
        return [u.strip().strip("'\"") for u in texto.split(",") if u.strip().strip("'\"")]

    def _url_para_slug(url: str) -> str:
        """Extrai slug legível do final da URL Wikipedia."""
        # pega tudo após o último '/'
        slug = url.rstrip("/").split("/")[-1]
        # decodifica %xx → texto unicode
        slug = urllib.parse.unquote(slug)
        # substitui '_' por espaço
        slug = slug.replace("_", " ")
        return slug.strip().lower()

    def _salvar(fig: plt.Figure, nome: str) -> None:
        fig.savefig(os.path.join(pasta, nome), dpi=110, bbox_inches="tight")
        plt.close(fig)

    # ── extração de slugs ─────────────────────────────────────

    slugs_por_video: list[list[str]] = []
    for texto in serie:
        urls = _extrair_urls(texto)
        slugs = [_url_para_slug(u) for u in urls if u]
        slugs = [s for s in slugs if s]  # remove vazios pós-processamento
        slugs_por_video.append(slugs)

    qtd_por_video = pd.Series([len(s) for s in slugs_por_video])
    todos_slugs = [slug for lista in slugs_por_video for slug in lista]

    if not todos_slugs:
        print("    [skip] Nenhum tópico válido encontrado.")
        return

    med_topicos = qtd_por_video.median()

    print(f"    Volume — mediana de tópicos por vídeo: {med_topicos:.0f}")
    print(f"    Volume — min: {qtd_por_video.min()} | max: {qtd_por_video.max()} tópicos/vídeo")
    print(f"    Total de tópicos (todas as ocorrências): {len(todos_slugs)}")
    print(f"    Tópicos únicos no nicho: {len(set(todos_slugs))}")

    # ── 1. DISTRIBUIÇÃO DE VOLUME ─────────────────────────────

    percentis = {p: qtd_por_video.quantile(p / 100) for p in [10, 25, 75, 90]}

    fig, ax = plt.subplots(figsize=(9, 4))
    fig.suptitle(f"Tópicos Wikipedia — Volume por Vídeo  [{nicho}]  (n={n})", fontsize=11, fontweight="bold")

    ax.hist(qtd_por_video, bins=max(10, int(qtd_por_video.max())), color="#8e44ad", edgecolor="white", linewidth=0.3)
    ax.axvline(percentis[10], color="#8e44ad", linestyle="-.", linewidth=1.0, label=f"P10: {percentis[10]:.0f}")
    ax.axvline(percentis[25], color="#f39c12", linestyle=":", linewidth=1.2, label=f"P25: {percentis[25]:.0f}")
    ax.axvline(med_topicos, color="#e74c3c", linestyle="--", linewidth=1.8, label=f"Mediana: {med_topicos:.0f}")
    ax.axvline(percentis[75], color="#f39c12", linestyle=":", linewidth=1.2, label=f"P75: {percentis[75]:.0f}")
    ax.axvline(percentis[90], color="#8e44ad", linestyle="-.", linewidth=1.0, label=f"P90: {percentis[90]:.0f}")
    ax.set_xlabel("quantidade de tópicos por vídeo")
    ax.set_ylabel("frequência")
    ax.legend(fontsize=8)

    plt.tight_layout()
    _salvar(fig, "nlp_topicos_distribuicao.png")
    print("    [+] nlp_topicos_distribuicao.png")

    # ── 2. TOP N TÓPICOS + CURVA ZIPF ────────────────────────

    cnt_slugs = Counter(todos_slugs)
    top_slugs = cnt_slugs.most_common(_TOP_N)
    top_labels = [s for s, _ in top_slugs]
    top_vals = [c for _, c in top_slugs]

    # trunca labels longas
    top_labels_vis = [(lb[:40] + "…") if len(lb) > 40 else lb for lb in top_labels]

    print(f"\n    Top {_TOP_N} tópicos mais frequentes:")
    for slug, cnt in top_slugs:
        print(f"      {slug:40s}: {cnt}")

    # gráfico com 2 painéis: barras top N (esq) + curva Zipf log-log (dir)
    altura_top = max(5, len(top_slugs) * 0.48 + 1.5)
    fig, axes = plt.subplots(1, 2, figsize=(16, altura_top))
    fig.suptitle(f"Tópicos Wikipedia  [{nicho}]", fontsize=11, fontweight="bold")

    # painel esquerdo: top N barras horizontais
    axes[0].barh(top_labels_vis[::-1], top_vals[::-1], color="#9b59b6", edgecolor="white", height=0.6)
    axes[0].set_xlabel("frequência (nº de vídeos)")
    axes[0].set_title(f"Top {_TOP_N} tópicos mais frequentes")
    axes[0].set_xlim(0, max(top_vals) * 1.3)
    for i, v in enumerate(top_vals[::-1]):
        axes[0].text(v + max(top_vals) * 0.01, i, str(v), va="center", fontsize=8)

    # painel direito: curva Zipf em log-log
    # ordena todas as frequências em ordem decrescente
    freqs_ordenadas = sorted(cnt_slugs.values(), reverse=True)
    ranks = list(range(1, len(freqs_ordenadas) + 1))

    axes[1].loglog(ranks, freqs_ordenadas, color="#e74c3c", linewidth=1.5, marker="o", markersize=2.5, alpha=0.7)
    axes[1].set_xlabel("rank do tópico (escala log)")
    axes[1].set_ylabel("frequência (escala log)")
    axes[1].set_title("Distribuição de Frequência — Curva Zipf\n(linha reta = poucos temas dominam;\n curva longa = muita diversidade temática)")
    axes[1].grid(True, which="both", linestyle="--", linewidth=0.4, alpha=0.5)

    # anotação do tópico mais frequente
    axes[1].annotate(
        f"#{1}: {top_labels_vis[0]}\n({top_vals[0]}x)",
        xy=(1, freqs_ordenadas[0]),
        xytext=(3, freqs_ordenadas[0] * 0.6),
        fontsize=7,
        color="#c0392b",
        arrowprops=dict(arrowstyle="->", color="#c0392b", lw=0.8),
    )

    fig.subplots_adjust(left=0.12, right=0.97, wspace=0.38)
    _salvar(fig, "nlp_topicos_top.png")
    print("    [+] nlp_topicos_top.png")


# ─────────────────────────────────────────────────────────────
# ANÁLISE DE TEXTO FALADO
# ─────────────────────────────────────────────────────────────


def analisar_texto_falado(serie: pd.Series, pasta: str, nicho: str) -> None:
    """
    Analisa o conteúdo falado dos vídeos — coluna multilíngue por natureza.

    Métricas
    --------
    Comprimento, lixo de transcrição, idioma e volume por parte do roteiro.

    Gráficos gerados
    ----------------
        nlp_texto_falado_comprimento.png
        nlp_texto_falado_lixo.png
        nlp_texto_falado_idioma.png
        nlp_texto_falado_partes.png  — barras: total de tokens em início / meio / fim
    """
    n = len(serie)

    def _tokenizar(texto: str) -> list[str]:
        s = re.sub(r"\[.*?\]", " ", texto)
        s = re.sub(r"\(.*?\)", " ", s)
        s = s.replace("♪", " ")
        s = re.sub(r"https?://\S+", " ", s)
        return [t for t in re.findall(r"\w+", s.lower()) if len(t) >= _MIN_TOKEN_LEN]

    def _detectar_script(texto: str) -> str:
        cont: Counter = Counter()
        for ch in texto:
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
            elif "ARABIC" in nome or "FARSI" in nome:
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
        if not _LANGDETECT_OK:
            return "desconhecido"
        try:
            amostra = texto.strip()[:500]
            if len(amostra) < 10:
                return "desconhecido"
            return _langdetect_detect(amostra)
        except Exception:
            return "desconhecido"

    def _tem_repeticao(texto: str) -> bool:
        tokens = re.findall(r"\b\w+\b", texto.lower())
        for i in range(len(tokens) - 2):
            if tokens[i] == tokens[i + 1] == tokens[i + 2]:
                return True
        return False

    def _salvar(fig: plt.Figure, nome: str) -> None:
        fig.savefig(os.path.join(pasta, nome), dpi=110, bbox_inches="tight")
        plt.close(fig)

    _COR_MED = "#e74c3c"
    _COR_IQR = "#f39c12"
    _COR_OUTER = "#8e44ad"

    # ══════════════════════════════════════════════════════════════
    # BLOCO 1 — COMPRIMENTO
    # ══════════════════════════════════════════════════════════════

    comp_chars = serie.str.len()
    comp_tokens = serie.apply(lambda t: len(_tokenizar(t)))
    med_chars = comp_chars.median()
    med_tokens = comp_tokens.median()

    percentis_tokens = {p: comp_tokens.quantile(p / 100) for p in [10, 25, 75, 90]}
    percentis_chars = {p: comp_chars.quantile(p / 100) for p in [10, 25, 75, 90]}

    print(f"    Comprimento — mediana: {med_chars:.0f} chars | {med_tokens:.0f} tokens")
    print(f"    Comprimento — min: {comp_chars.min()} | max: {comp_chars.max()} chars")
    for p in [10, 25, 50, 75, 90]:
        val = med_tokens if p == 50 else comp_tokens.quantile(p / 100)
        print(f"      p{p:02d}: {val:.0f} tokens")

    fig, axes = plt.subplots(1, 2, figsize=(14, 4))
    fig.suptitle(f"Texto Falado — Comprimento  [{nicho}]  (n={n})", fontsize=11, fontweight="bold")

    for ax, dados, cor_hist, titulo, xlabel, med, pcts in [
        (axes[0], comp_chars, "#3498db", "Chars por transcrição", "chars", med_chars, percentis_chars),
        (axes[1], comp_tokens[comp_tokens > 0], "#27ae60", "Tokens por transcrição", "tokens", med_tokens, percentis_tokens),
    ]:
        ax.hist(dados, bins=40, color=cor_hist, edgecolor="white", linewidth=0.3)
        ax.axvline(pcts[10], color=_COR_OUTER, linestyle="-.", linewidth=1.0, label=f"P10: {pcts[10]:.0f}")
        ax.axvline(pcts[25], color=_COR_IQR, linestyle=":", linewidth=1.2, label=f"P25: {pcts[25]:.0f}")
        ax.axvline(med, color=_COR_MED, linestyle="--", linewidth=1.8, label=f"Mediana: {med:.0f}")
        ax.axvline(pcts[75], color=_COR_IQR, linestyle=":", linewidth=1.2, label=f"P75: {pcts[75]:.0f}")
        ax.axvline(pcts[90], color=_COR_OUTER, linestyle="-.", linewidth=1.0, label=f"P90: {pcts[90]:.0f}")
        ax.set_title(titulo)
        ax.set_xlabel(xlabel)
        ax.set_ylabel("frequência")
        ax.legend(fontsize=8)

    plt.tight_layout()
    _salvar(fig, "nlp_texto_falado_comprimento.png")
    print("    [+] nlp_texto_falado_comprimento.png")

    # ══════════════════════════════════════════════════════════════
    # BLOCO 2 — LIXO DE TRANSCRIÇÃO AUTOMÁTICA
    # ══════════════════════════════════════════════════════════════

    def _pct(mask: pd.Series) -> float:
        return mask.sum() / n * 100

    tem_colchetes = serie.str.contains(r"\[.*?\]", regex=True, na=False)
    tem_parenteses = serie.str.contains(r"\(.*?\)", regex=True, na=False)
    tem_musica = serie.str.contains(r"♪", regex=False, na=False)
    tem_repeticao = serie.apply(_tem_repeticao)

    exemplos_colchete: list[str] = []
    exemplos_parentese: list[str] = []
    for texto in serie[tem_colchetes].head(20):
        exemplos_colchete.extend(re.findall(r"\[.*?\]", texto))
    for texto in serie[tem_parenteses].head(20):
        exemplos_parentese.extend(re.findall(r"\(.*?\)", texto))

    top_colchetes = Counter(exemplos_colchete).most_common(5)
    top_parenteses = Counter(exemplos_parentese).most_common(5)

    lixo = {
        "Tem [tags entre colchetes]": _pct(tem_colchetes),
        "Tem (tags entre parênteses)": _pct(tem_parenteses),
        "Tem ♪ (música/trilha sonora)": _pct(tem_musica),
        "Tem repetições (palavra 3x+)": _pct(tem_repeticao),
    }

    print("\n    Lixo de transcrição automática (% de textos):")
    for k, v in lixo.items():
        print(f"      {k:40s}: {v:5.1f}%")
    if top_colchetes:
        print(f"    Tags [colchete] mais comuns: {[t for t, _ in top_colchetes]}")
    if top_parenteses:
        print(f"    Tags (parêntese) mais comuns: {[t for t, _ in top_parenteses]}")

    altura_lixo = max(4, len(lixo) * 0.65 + 1.8)
    fig, ax = plt.subplots(figsize=(11, altura_lixo))
    fig.suptitle(f"Texto Falado — Lixo de Transcrição Automática  [{nicho}]", fontsize=11, fontweight="bold")

    labels_lixo = list(lixo.keys())
    vals_lixo = list(lixo.values())
    cores_lixo = ["#e74c3c" if v > 50 else "#f39c12" if v > 20 else "#2ecc71" for v in vals_lixo]

    bars = ax.barh(labels_lixo[::-1], vals_lixo[::-1], color=cores_lixo[::-1], edgecolor="white", height=0.55)
    ax.set_xlabel("% de textos")
    ax.axvline(50, color="gray", linestyle="--", linewidth=0.8, alpha=0.6)
    ax.set_xlim(0, 115)
    for bar, v in zip(bars, vals_lixo[::-1]):
        ax.text(v + 1.5, bar.get_y() + bar.get_height() / 2, f"{v:.1f}%", va="center", fontsize=9, fontweight="bold")

    legenda = [
        plt.matplotlib.patches.Patch(facecolor="#e74c3c", label="> 50% — alto"),
        plt.matplotlib.patches.Patch(facecolor="#f39c12", label="20–50% — moderado"),
        plt.matplotlib.patches.Patch(facecolor="#2ecc71", label="< 20% — baixo"),
    ]
    ax.legend(handles=legenda, fontsize=8, loc="lower right")
    plt.tight_layout()
    _salvar(fig, "nlp_texto_falado_lixo.png")
    print("    [+] nlp_texto_falado_lixo.png")

    # ══════════════════════════════════════════════════════════════
    # BLOCO 3 — IDIOMA
    # ══════════════════════════════════════════════════════════════

    scripts = serie.apply(_detectar_script)
    cnt_script = scripts.value_counts()
    idiomas = serie.apply(_detectar_idioma)
    cnt_idioma = idiomas.value_counts()

    print(f"\n    Scripts Unicode: {dict(cnt_script.head(5))}")
    print(f"    Idiomas (langdetect): {dict(cnt_idioma.head(5))}")

    n_sc = len(cnt_script)
    n_id = len(cnt_idioma)
    altura_id = max(4, max(n_sc, n_id) * 0.52 + 1.5)

    fig, axes = plt.subplots(1, 2, figsize=(14, altura_id))
    fig.suptitle(f"Texto Falado — Idioma  [{nicho}]", fontsize=11, fontweight="bold")

    axes[0].barh(list(cnt_script.index)[::-1], cnt_script.values[::-1], color="#1abc9c", edgecolor="white", height=0.6)
    axes[0].set_xlabel("nº de transcrições")
    axes[0].set_title("Script Unicode (proxy de idioma)")
    axes[0].set_xlim(0, cnt_script.values.max() * 1.3)
    for i, v in enumerate(cnt_script.values[::-1]):
        axes[0].text(v + cnt_script.values.max() * 0.01, i, f"{v} ({v / n * 100:.1f}%)", va="center", fontsize=8)

    axes[1].barh(list(cnt_idioma.index)[::-1], cnt_idioma.values[::-1], color="#2980b9", edgecolor="white", height=0.6)
    axes[1].set_xlabel("nº de transcrições")
    axes[1].set_title("Idioma detectado — langdetect\n(distribuição completa do nicho)")
    axes[1].set_xlim(0, cnt_idioma.values.max() * 1.3)
    for i, v in enumerate(cnt_idioma.values[::-1]):
        axes[1].text(v + cnt_idioma.values.max() * 0.01, i, f"{v} ({v / n * 100:.1f}%)", va="center", fontsize=8)

    plt.tight_layout()
    _salvar(fig, "nlp_texto_falado_idioma.png")
    print("    [+] nlp_texto_falado_idioma.png")

    # ══════════════════════════════════════════════════════════════
    # BLOCO 4 — VOLUME DE TOKENS POR PARTE DO ROTEIRO
    # (Início 0–20% | Meio 20–80% | Fim 80–100%)
    # Gráfico simples de barras: total e mediana de tokens por parte.
    # ══════════════════════════════════════════════════════════════

    tokens_inicio_counts: list[int] = []
    tokens_meio_counts: list[int] = []
    tokens_fim_counts: list[int] = []

    for texto in serie:
        tokens = _tokenizar(texto)
        total = len(tokens)
        if total < 5:
            tokens_meio_counts.append(total)
            tokens_inicio_counts.append(0)
            tokens_fim_counts.append(0)
            continue
        corte_ini = max(1, int(total * 0.20))
        corte_fim = max(corte_ini + 1, int(total * 0.80))
        tokens_inicio_counts.append(corte_ini)
        tokens_meio_counts.append(corte_fim - corte_ini)
        tokens_fim_counts.append(total - corte_fim)

    s_ini = pd.Series(tokens_inicio_counts)
    s_mei = pd.Series(tokens_meio_counts)
    s_fim = pd.Series(tokens_fim_counts)

    partes = ["Início\n(0–20%)", "Meio\n(20–80%)", "Fim\n(80–100%)"]
    totais = [int(s_ini.sum()), int(s_mei.sum()), int(s_fim.sum())]
    medianas = [float(s_ini.median()), float(s_mei.median()), float(s_fim.median())]
    cores_partes = ["#e74c3c", "#3498db", "#2ecc71"]

    print("\n    Volume de tokens por parte do roteiro:")
    for parte, tot, med in zip(["Início", "Meio", "Fim"], totais, medianas):
        print(f"      {parte:6s}: total={tot:,}  mediana por vídeo={med:.0f}")

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    fig.suptitle(f"Texto Falado — Volume de Tokens por Parte do Roteiro  [{nicho}]", fontsize=11, fontweight="bold")

    # painel esquerdo: total acumulado
    bars0 = axes[0].bar(partes, totais, color=cores_partes, edgecolor="white", width=0.5)
    axes[0].set_ylabel("total de tokens (soma)")
    axes[0].set_title("Total acumulado de tokens")
    axes[0].set_ylim(0, max(totais) * 1.25)
    for bar, v in zip(bars0, totais):
        axes[0].text(bar.get_x() + bar.get_width() / 2, bar.get_height() + max(totais) * 0.02, f"{v:,}", ha="center", va="bottom", fontsize=9, fontweight="bold")

    # painel direito: mediana por vídeo
    bars1 = axes[1].bar(partes, medianas, color=cores_partes, edgecolor="white", width=0.5)
    axes[1].set_ylabel("tokens por vídeo (mediana)")
    axes[1].set_title("Mediana de tokens por vídeo")
    axes[1].set_ylim(0, max(medianas) * 1.25)
    for bar, v in zip(bars1, medianas):
        axes[1].text(bar.get_x() + bar.get_width() / 2, bar.get_height() + max(medianas) * 0.02, f"{v:.0f}", ha="center", va="bottom", fontsize=9, fontweight="bold")

    plt.tight_layout()
    _salvar(fig, "nlp_texto_falado_partes.png")
    print("    [+] nlp_texto_falado_partes.png")


# ─────────────────────────────────────────────────────────────
# ANÁLISES CRUZADAS
# ─────────────────────────────────────────────────────────────
def analisar_cruzamentos(df_nicho: pd.DataFrame, pasta: str, nicho: str) -> None:
    """
    Análises cruzadas entre colunas — coerência e associação.
    Baseadas exclusivamente em análise de string, sem NLP externo.
    Funcionam em qualquer idioma do mundo.

    Análise 1 — COERÊNCIA DE IDIOMA
    --------------------------------
    Detecta o script Unicode de titulo, descricao, tags e texto_falado
    para cada vídeo individualmente e verifica se estão alinhados.
        - % de vídeos onde todas as 4 colunas estão no mesmo script
        - Mapeamento das combinações de scripts que aparecem
        - Heatmap mostrando qual script domina em cada coluna

    Gráfico: nlp_cruzamento_idioma.png

    Análise 2 — ASSOCIAÇÃO TÍTULO + DESCRIÇÃO ↔ TEXTO FALADO
    ----------------------------------------------------------
    Verifica se o vídeo entrega o que o título e a descrição prometem,
    usando apenas sobreposição de tokens (análise de string pura).
        - Por vídeo: % de tokens do título que aparecem no texto_falado
        - Por vídeo: % de tokens da descrição que aparecem no texto_falado
        - Mediana dessas duas % sobre todos os vídeos do nicho

    Gráfico: nlp_cruzamento_associacao.png — histograma lado a lado
             das duas distribuições de % de sobreposição
    """

    def _salvar(fig: plt.Figure, nome: str) -> None:
        fig.savefig(os.path.join(pasta, nome), dpi=110, bbox_inches="tight")
        plt.close(fig)

    def _detectar_script(texto: str) -> str:
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
            elif "ARABIC" in nome or "FARSI" in nome:
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

    def _tokenizar(texto: str) -> set[str]:
        s = re.sub(r"https?://\S+", " ", str(texto))
        s = re.sub(r"[#@]\w+", " ", s)
        s = re.sub(r"\[.*?\]|\(.*?\)", " ", s)
        return {t for t in re.findall(r"\w+", s.lower()) if len(t) >= _MIN_TOKEN_LEN}

    def _limpar(serie: pd.Series) -> pd.Series:
        return serie.fillna("").astype(str).str.strip().replace(list(_INVALIDOS), "")

    # ══════════════════════════════════════════════════════════════
    # ANÁLISE 1 — COERÊNCIA DE IDIOMA / SCRIPT
    # ══════════════════════════════════════════════════════════════

    colunas_script = ["titulo", "descricao", "tags", "texto_falado"]
    colunas_presentes = [c for c in colunas_script if c in df_nicho.columns]

    if len(colunas_presentes) < 2:
        print("    [skip] Cruzamento de idioma: menos de 2 colunas disponíveis.")
    else:
        scripts_df = pd.DataFrame(index=df_nicho.index)
        for col in colunas_presentes:
            scripts_df[col] = _limpar(df_nicho[col]).apply(_detectar_script)

        # % de vídeos com mesmo script em todas as colunas presentes
        coerente = scripts_df.apply(lambda row: len(set(row.values)) == 1, axis=1)
        pct_coerente = coerente.sum() / len(scripts_df) * 100

        print(f"\n    Coerência de idioma: {pct_coerente:.1f}% dos vídeos têm o mesmo script em todas as colunas.")

        # combinações mais frequentes
        combo = scripts_df.apply(lambda row: " | ".join(row.values), axis=1)
        top_combos = combo.value_counts().head(8)
        print("    Top combinações de scripts:")
        for combinacao, cnt in top_combos.items():
            print(f"      {combinacao:60s}: {cnt} vídeos ({cnt / len(scripts_df) * 100:.1f}%)")

        # heatmap: proporção de cada script por coluna
        todos_scripts = sorted({s for col in colunas_presentes for s in scripts_df[col].unique()})
        heatmap_data = pd.DataFrame(0.0, index=todos_scripts, columns=colunas_presentes)
        for col in colunas_presentes:
            vc = scripts_df[col].value_counts(normalize=True) * 100
            for script, pct in vc.items():
                heatmap_data.loc[script, col] = pct

        n_scripts = len(todos_scripts)
        altura_hm = max(4, n_scripts * 0.55 + 1.5)

        fig, axes = plt.subplots(1, 2, figsize=(16, altura_hm))
        fig.suptitle(f"Cruzamento — Coerência de Idioma/Script  [{nicho}]", fontsize=11, fontweight="bold")

        # painel esquerdo: heatmap
        im = axes[0].imshow(heatmap_data.values, aspect="auto", cmap="YlOrRd", vmin=0, vmax=100)
        axes[0].set_xticks(range(len(colunas_presentes)))
        axes[0].set_xticklabels(colunas_presentes, fontsize=9)
        axes[0].set_yticks(range(n_scripts))
        axes[0].set_yticklabels(todos_scripts, fontsize=9)
        axes[0].set_title("% de vídeos por script em cada coluna")
        plt.colorbar(im, ax=axes[0], label="%")
        for i in range(n_scripts):
            for j in range(len(colunas_presentes)):
                val = heatmap_data.iloc[i, j]
                axes[0].text(j, i, f"{val:.0f}%", ha="center", va="center", fontsize=8, color="black" if val < 60 else "white")

        # painel direito: barras das top combinações
        combo_labels = [c[:55] + "…" if len(c) > 55 else c for c in top_combos.index]
        combo_vals = top_combos.values
        axes[1].barh(combo_labels[::-1], combo_vals[::-1], color="#8e44ad", edgecolor="white", height=0.6)
        axes[1].set_xlabel("nº de vídeos")
        axes[1].set_title(f"Top combinações de scripts\n({pct_coerente:.1f}% totalmente coerentes)")
        axes[1].set_xlim(0, max(combo_vals) * 1.3)
        for i, v in enumerate(combo_vals[::-1]):
            axes[1].text(v + max(combo_vals) * 0.01, i, f"{v} ({v / len(scripts_df) * 100:.1f}%)", va="center", fontsize=8)

        fig.subplots_adjust(left=0.10, right=0.97, wspace=0.45)
        _salvar(fig, "nlp_cruzamento_idioma.png")
        print("    [+] nlp_cruzamento_idioma.png")

    # ══════════════════════════════════════════════════════════════
    # ANÁLISE 2 — ASSOCIAÇÃO TÍTULO + DESCRIÇÃO ↔ TEXTO FALADO
    # ══════════════════════════════════════════════════════════════

    colunas_assoc = ["titulo", "descricao", "texto_falado"]
    if not all(c in df_nicho.columns for c in colunas_assoc):
        faltando = [c for c in colunas_assoc if c not in df_nicho.columns]
        print(f"    [skip] Cruzamento de associação: colunas ausentes — {faltando}")
        return

    titulos = _limpar(df_nicho["titulo"])
    descricoes = _limpar(df_nicho["descricao"])
    textos = _limpar(df_nicho["texto_falado"])

    overlap_titulo: list[float] = []
    overlap_descricao: list[float] = []

    for tit, desc, fala in zip(titulos, descricoes, textos):
        tokens_fala = _tokenizar(fala)

        # sobreposição título → texto_falado
        tokens_tit = _tokenizar(tit)
        if tokens_tit:
            overlap_titulo.append(len(tokens_tit & tokens_fala) / len(tokens_tit) * 100)

        # sobreposição descrição → texto_falado
        tokens_desc = _tokenizar(desc)
        if tokens_desc:
            overlap_descricao.append(len(tokens_desc & tokens_fala) / len(tokens_desc) * 100)

    s_tit = pd.Series(overlap_titulo)
    s_desc = pd.Series(overlap_descricao)

    med_tit = s_tit.median()
    med_desc = s_desc.median()

    print(f"\n    Associação título ↔ texto_falado    — mediana de sobreposição: {med_tit:.1f}%")
    print(f"    Associação descrição ↔ texto_falado — mediana de sobreposição: {med_desc:.1f}%")

    if med_tit < 10:
        print("    [Insight] Baixa sobreposição título↔fala: o conteúdo falado diverge do que o título promete.")
    elif med_tit > 40:
        print("    [Insight] Alta sobreposição título↔fala: o conteúdo entrega bem o que o título anuncia.")

    fig, axes = plt.subplots(1, 2, figsize=(14, 4))
    fig.suptitle(f"Cruzamento — Associação Título/Descrição ↔ Texto Falado  [{nicho}]", fontsize=11, fontweight="bold")

    _COR_MED = "#e74c3c"
    _COR_IQR = "#f39c12"
    _COR_OUTER = "#8e44ad"

    for ax, serie_plot, cor, titulo_ax, med in [
        (axes[0], s_tit, "#e74c3c", "Tokens do título presentes no texto falado", med_tit),
        (axes[1], s_desc, "#3498db", "Tokens da descrição presentes no texto falado", med_desc),
    ]:
        pcts = {p: serie_plot.quantile(p / 100) for p in [10, 25, 75, 90]}
        ax.hist(serie_plot, bins=40, color=cor, edgecolor="white", linewidth=0.3, alpha=0.85)
        ax.axvline(pcts[10], color=_COR_OUTER, linestyle="-.", linewidth=1.0, label=f"P10: {pcts[10]:.1f}%")
        ax.axvline(pcts[25], color=_COR_IQR, linestyle=":", linewidth=1.2, label=f"P25: {pcts[25]:.1f}%")
        ax.axvline(med, color=_COR_MED, linestyle="--", linewidth=1.8, label=f"Mediana: {med:.1f}%")
        ax.axvline(pcts[75], color=_COR_IQR, linestyle=":", linewidth=1.2, label=f"P75: {pcts[75]:.1f}%")
        ax.axvline(pcts[90], color=_COR_OUTER, linestyle="-.", linewidth=1.0, label=f"P90: {pcts[90]:.1f}%")
        ax.set_title(titulo_ax, fontsize=9)
        ax.set_xlabel("% de tokens em comum")
        ax.set_ylabel("nº de vídeos")
        ax.set_xlim(0, 105)
        ax.legend(fontsize=8)

    plt.tight_layout()
    _salvar(fig, "nlp_cruzamento_associacao.png")
    print("    [+] nlp_cruzamento_associacao.png")


# ─────────────────────────────────────────────────────────────
# PONTO DE ENTRADA PÚBLICO
# ─────────────────────────────────────────────────────────────


def analisar_texto_grupo2(df_nicho: pd.DataFrame, pasta_img_nicho: str, nicho: str) -> None:
    """
    Orquestra toda a análise de texto do grupo 2.

    Chama cada função de coluna na ordem definida em _ANALISADORES,
    filtrando dados inválidos antes de passar a série para cada função.
    Por último chama analisar_cruzamentos, que recebe o df completo.

    Parâmetros
    ----------
    df_nicho        : DataFrame filtrado para um único nicho.
    pasta_img_nicho : Diretório de saída dos gráficos.
    nicho           : Nome do nicho (obrigatório — usado nos títulos dos gráficos).
    """
    os.makedirs(pasta_img_nicho, exist_ok=True)
    label = nicho.upper()

    print(f"\n{'=' * 60}")
    print(f"  ANÁLISE DE TEXTO (v3) — [{label}]  ({len(df_nicho)} vídeos)")
    print(f"{'=' * 60}")

    _ANALISADORES = {
        "titulo": analisar_titulo,
        "descricao": analisar_descricao,
        "tags": analisar_tags,
        "topicos_wikipedia": analisar_topicos_wikipedia,
        "texto_falado": analisar_texto_falado,
    }

    for col, fn in _ANALISADORES.items():
        if col not in df_nicho.columns:
            print(f"  [skip] '{col}': coluna não encontrada.")
            continue

        serie = df_nicho[col].dropna().astype(str).str.strip()
        serie = serie[~serie.isin(_INVALIDOS)]

        if serie.empty:
            print(f"  [skip] '{col}': sem dados válidos.")
            continue

        print(f"\n  ── Coluna: {col.upper()} ──")
        fn(serie, pasta_img_nicho, label)

    print("\n  ── Análises Cruzadas ──")
    analisar_cruzamentos(df_nicho, pasta_img_nicho, label)

    print(f"\n  Gráficos salvos em: {pasta_img_nicho}")
    print(f"{'=' * 60}\n")
