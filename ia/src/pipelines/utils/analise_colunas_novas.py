"""
analise_colunas_novas.py
========================
Análise das colunas geradas pelo processador_features.py com foco em
replicabilidade (Obj 1) e lógica de automação de roteiros (Obj 2).

Organização
-----------
PARTE 1 — Análise individual de cada coluna
    A. Numéricas  (10 colunas)
    B. Booleana   (1 coluna)
    C. Categóricas (7 colunas)

PARTE 2 — Cruzamentos estratégicos
    D. Fôrma Narrativa Mecânica
       ritmo_palavras_seg + densidade_roteiro  vs.  estrutura_blocos + faixa_duracao
    E. Catalisador de Engajamento Psicológico
       taxa_discussao  vs.  tem_repeticao_roteiro + sentimento_roteiro
    F. Embalagem Externa vs. Retenção Interna
       clickbait_score  vs.  score_viral + label_viral
    G. Motor de Entrega Algorítmica
       velocidade_views  vs.  janela_postagem + completude_seo

PARTE 3 — Completude geral
    H. Missing values de todas as colunas novas

Ponto de entrada público
------------------------
    analisar_matematica_colunas_novas(df_nicho, pasta_img_nicho)
"""

from __future__ import annotations

import os

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from scipy import stats

# ─────────────────────────────────────────────────────────────
# CONFIGURAÇÃO CENTRAL DE COLUNAS
# ─────────────────────────────────────────────────────────────

COLUNAS_NUMERICAS: list[str] = [
    "score_viral",
    "clickbait_score",
    "completude_seo",
    "velocidade_views",
    "taxa_conversao",
    "taxa_discussao",
    "ritmo_palavras_seg",
    "densidade_roteiro",
    "idade_dias",
    "hora_postagem",
]

COLUNAS_BOOLEANAS: list[str] = [
    "tem_repeticao_roteiro",
]

COLUNAS_CATEGORICAS: list[str] = [
    "label_viral",
    "faixa_duracao",
    "estrutura_blocos",
    "janela_postagem",
    "dia_postagem",
    "sentimento_roteiro",
    "tipo_audio_dominante",
]

# Ordens para variáveis ordinais conhecidas
ORDENS_CATEGORICAS: dict[str, list[str]] = {
    "label_viral": ["frio", "aquecido", "viral", "super_viral"],
    "faixa_duracao": ["ultra_curto", "short_padrao", "short_longo"],
    "janela_postagem": ["madrugada", "manha", "tarde", "noite"],
    "sentimento_roteiro": ["negativo", "neutro", "positivo"],
    "dia_postagem": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
}

# Limiares de negócio usados nas análises individuais e cruzamentos
LIMIAR_SCORE_VIRAL_BENCHMARK: float = 0.8  # score_viral >= 0.8 → benchmark few-shot
LIMIAR_CLICKBAIT_AGRESSIVO: float = 0.7  # clickbait_score >= 0.7 → prompt agressivo
LIMIAR_RITMO_ACELERADO: float = 3.5  # ritmo >= 3.5 palavras/seg → pacing intenso
TETO_IDADE_DIAS: int = 365  # teto do pipeline


# ─────────────────────────────────────────────────────────────
# HELPERS INTERNOS
# ─────────────────────────────────────────────────────────────


def _salvar(fig: plt.Figure, pasta: str, nome: str) -> None:
    """Salva a figura em pasta/nome com dpi=130 e fecha o plot."""
    fig.savefig(os.path.join(pasta, nome), dpi=130, bbox_inches="tight")
    plt.close(fig)


def _cabecalho_coluna(col: str, serie_bruta: pd.Series) -> None:
    """Imprime cabeçalho padrão com nome da coluna e taxa de completude."""
    total = len(serie_bruta)
    nulos = serie_bruta.isna().sum()
    print(f"\n    ── Coluna: '{col.upper()}' ──")
    print(f"       Completude : {total - nulos}/{total} registros válidos ({(total - nulos) / total * 100:.1f}% preenchido)")


def _serie_numerica(col: str, df: pd.DataFrame) -> pd.Series | None:
    """
    Extrai e converte uma coluna numérica do DataFrame.
    Retorna None (com print de aviso) se a coluna não existir ou ficar vazia.
    """
    if col not in df.columns:
        print(f"       [SKIP] Coluna '{col}' não encontrada no DataFrame.")
        return None

    serie = pd.to_numeric(df[col], errors="coerce").dropna()

    if serie.empty:
        print(f"       [SKIP] Coluna '{col}' sem valores numéricos válidos após conversão.")
        return None

    return serie


# ─────────────────────────────────────────────────────────────
# PARTE 1-A — ANÁLISE INDIVIDUAL: COLUNAS NUMÉRICAS
# ─────────────────────────────────────────────────────────────


def _analisar_score_viral(dados: pd.Series, pasta: str) -> None:
    """..."""
    _cabecalho_coluna("score_viral", dados)

    mediana = dados.median()
    p75 = dados.quantile(0.75)
    p90 = dados.quantile(0.90)
    maximo = dados.max()

    benchmark = dados[dados >= LIMIAR_SCORE_VIRAL_BENCHMARK]
    n_bench = len(benchmark)
    pct_bench = n_bench / len(dados) * 100

    print(f"       Mediana : {mediana:.3f}  |  P75: {p75:.3f}  |  P90: {p90:.3f}  |  Máx: {maximo:.3f}")
    print(f"       Benchmark (>= {LIMIAR_SCORE_VIRAL_BENCHMARK}): {n_bench} vídeos ({pct_bench:.1f}%)")
    print(f"       [Insight Obj 2] {n_bench} vídeos passam no filtro e alimentarão o few-shot do gerador.")

    fig, ax = plt.subplots(figsize=(10, 5))

    sns.histplot(dados, bins=40, kde=True, ax=ax, color="#95a5a6", edgecolor="white", linewidth=0.3, line_kws={"linewidth": 2, "color": "#2c3e50"})

    # Área verde acima do limiar benchmark
    ax.axvspan(LIMIAR_SCORE_VIRAL_BENCHMARK, dados.max() * 1.01, alpha=0.15, color="#2ecc71", label="Zona benchmark (few-shot)")
    ax.axvline(LIMIAR_SCORE_VIRAL_BENCHMARK, color="#2ecc71", linestyle="--", linewidth=2, label=f"Limiar benchmark: {LIMIAR_SCORE_VIRAL_BENCHMARK}")
    ax.axvline(mediana, color="#e74c3c", linestyle="-", linewidth=1.5, label=f"Mediana: {mediana:.3f}")

    ax.annotate(
        f"{n_bench} vídeos\n({pct_bench:.1f}%) few-shot",
        xy=(LIMIAR_SCORE_VIRAL_BENCHMARK + 0.01, ax.get_ylim()[1] * 0.85),
        fontsize=9,
        color="#27ae60",
        fontweight="bold",
    )

    ax.set_title("score_viral — Filtro de Qualidade do Banco de Dados\nZona verde = vídeos que alimentam o few-shot do gerador", fontsize=11, fontweight="bold")
    ax.set_xlabel("score_viral")
    ax.set_ylabel("Frequência")
    ax.legend(fontsize=8)
    plt.tight_layout()
    _salvar(fig, pasta, "score_viral_benchmark.png")
    print("       [+] score_viral_benchmark.png salvo.")


def _analisar_clickbait_score(dados: pd.Series, pasta: str) -> None:
    """..."""
    _cabecalho_coluna("clickbait_score", dados)

    mediana = dados.median()
    n_agressivo = int((dados >= LIMIAR_CLICKBAIT_AGRESSIVO).sum())
    n_organico = len(dados) - n_agressivo
    pct_agr = n_agressivo / len(dados) * 100
    pct_org = 100 - pct_agr
    regime_dom = "AGRESSIVO" if pct_agr >= 50 else "ORGÂNICO"
    estrategia = "Ganchos de curiosidade extrema, CAPS e emojis obrigatórios." if regime_dom == "AGRESSIVO" else "Foco total no roteiro — título secundário e descritivo."

    print(f"       Mediana clickbait_score : {mediana:.3f}")
    print(f"       Agressivo (>= {LIMIAR_CLICKBAIT_AGRESSIVO}) : {n_agressivo} ({pct_agr:.1f}%)")
    print(f"       Orgânico  (<  {LIMIAR_CLICKBAIT_AGRESSIVO}) : {n_organico} ({pct_org:.1f}%)")
    print(f"       [Insight Obj 2] Regime dominante: {regime_dom} → {estrategia}")

    fig, ax = plt.subplots(figsize=(10, 5))

    dados_org = dados[dados < LIMIAR_CLICKBAIT_AGRESSIVO]
    dados_agr = dados[dados >= LIMIAR_CLICKBAIT_AGRESSIVO]

    sns.histplot(dados_org, bins=30, kde=False, ax=ax, color="#3498db", edgecolor="white", linewidth=0.3, label=f"Orgânico ({pct_org:.1f}%)")
    sns.histplot(dados_agr, bins=15, kde=False, ax=ax, color="#e74c3c", edgecolor="white", linewidth=0.3, label=f"Agressivo ({pct_agr:.1f}%)")

    ax.axvline(LIMIAR_CLICKBAIT_AGRESSIVO, color="#2c3e50", linestyle="--", linewidth=1.8, label=f"Limiar: {LIMIAR_CLICKBAIT_AGRESSIVO}")
    ax.axvline(mediana, color="#f39c12", linestyle="-", linewidth=1.5, label=f"Mediana: {mediana:.3f}")

    ax.set_title(f"clickbait_score — Temperatura do Gerador de Títulos\nRegime dominante: {regime_dom}  →  {estrategia}", fontsize=10, fontweight="bold")
    ax.set_xlabel("clickbait_score")
    ax.set_ylabel("Frequência")
    ax.legend(fontsize=8)
    plt.tight_layout()
    _salvar(fig, pasta, "clickbait_score_grupos.png")
    print("       [+] clickbait_score_grupos.png salvo.")


def _analisar_completude_seo(dados: pd.Series, pasta: str) -> None:
    """..."""
    _cabecalho_coluna("completude_seo", dados)

    mediana = dados.median()
    # Normaliza para 0–100 se ainda não estiver
    d_norm = dados if dados.max() <= 100 else dados / dados.max() * 100

    pct_baixo = (d_norm < 34).sum() / len(d_norm) * 100
    pct_medio = ((d_norm >= 34) & (d_norm < 67)).sum() / len(d_norm) * 100
    pct_alto = (d_norm >= 67).sum() / len(d_norm) * 100
    faixa_dom = "ALTO" if pct_alto >= max(pct_baixo, pct_medio) else "MÉDIO" if pct_medio >= pct_baixo else "BAIXO"
    decisao = "Reservar tokens para metadados (hashtags/tags)." if faixa_dom == "ALTO" else "Todos os tokens vão para o corpo do roteiro." if faixa_dom == "BAIXO" else "Equilíbrio: bloco moderado de metadados."

    print(f"       Mediana : {mediana:.1f}")
    print(f"       Baixo SEO (0–33%)  : {pct_baixo:.1f}%")
    print(f"       SEO médio (34–66%) : {pct_medio:.1f}%")
    print(f"       SEO alto (67–100%) : {pct_alto:.1f}%")
    print(f"       [Insight Obj 2] Faixa dominante: {faixa_dom} → {decisao}")

    fig, ax = plt.subplots(figsize=(10, 5))
    sns.histplot(d_norm, bins=40, kde=True, ax=ax, color="#bdc3c7", edgecolor="white", linewidth=0.3, line_kws={"linewidth": 2, "color": "#2c3e50"})

    ax.axvspan(0, 34, alpha=0.12, color="#2ecc71", label="Baixo SEO — foco no roteiro")
    ax.axvspan(34, 67, alpha=0.12, color="#f39c12", label="SEO médio — equilíbrio")
    ax.axvspan(67, 101, alpha=0.12, color="#e74c3c", label="SEO alto — tokens p/ metadados")
    ax.axvline(mediana, color="#2c3e50", linestyle="--", linewidth=1.5, label=f"Mediana: {mediana:.1f}")

    ax.set_title(f"completude_seo — Dependência do Nicho em Otimização Técnica\nFaixa dominante: {faixa_dom}  →  {decisao}", fontsize=10, fontweight="bold")
    ax.set_xlabel("completude_seo")
    ax.set_ylabel("Frequência")
    ax.legend(fontsize=8)
    plt.tight_layout()
    _salvar(fig, pasta, "completude_seo_faixas.png")
    print("       [+] completude_seo_faixas.png salvo.")


def _analisar_velocidade_views(dados: pd.Series, pasta: str) -> None:
    """..."""
    _cabecalho_coluna("velocidade_views", dados)

    mediana = dados.median()
    p75 = dados.quantile(0.75)
    p90 = dados.quantile(0.90)
    n_hype = int((dados > p90).sum())
    pct_hype = n_hype / len(dados) * 100

    print(f"       Mediana : {mediana:,.0f} views/dia  |  P75: {p75:,.0f}  |  P90: {p90:,.0f}")
    print(f"       Modo hype (> P90): {n_hype} vídeos ({pct_hype:.1f}%)")
    print(f"       [Insight Obj 2] {n_hype} roteiros vão para fila de resposta rápida (trend urgente).")

    dados_pos = dados[dados > 0]
    log_dados = np.log1p(dados_pos)

    fig, ax = plt.subplots(figsize=(10, 5))
    sns.histplot(log_dados, bins=40, kde=True, ax=ax, color="#9b59b6", edgecolor="white", linewidth=0.3, line_kws={"linewidth": 2, "color": "#6c3483"})

    log_p90 = np.log1p(p90)
    ax.axvline(log_p90, color="#e74c3c", linestyle="--", linewidth=2, label=f"P90 (hype): {p90:,.0f} views/dia")
    ax.axvline(np.log1p(mediana), color="#2ecc71", linestyle="-", linewidth=1.5, label=f"Mediana: {mediana:,.0f} views/dia")

    ax.annotate(f"{n_hype} vídeos\nem modo hype\n({pct_hype:.1f}%)", xy=(log_p90 + 0.1, ax.get_ylim()[1] * 0.75), fontsize=9, color="#e74c3c", fontweight="bold")

    ax.set_title("velocidade_views — Hype Ativo vs. Crescimento Orgânico\nEscala log(1+x)  |  Acima do P90 = trend urgente → fila de resposta rápida", fontsize=10, fontweight="bold")
    ax.set_xlabel("log(1 + velocidade_views)")
    ax.set_ylabel("Frequência")
    ax.legend(fontsize=8)
    plt.tight_layout()
    _salvar(fig, pasta, "velocidade_views_hype.png")
    print("       [+] velocidade_views_hype.png salvo.")


def _analisar_taxa_conversao(dados: pd.Series, pasta: str) -> None:
    """..."""
    _cabecalho_coluna("taxa_conversao", dados)

    mediana = dados.median()
    p75 = dados.quantile(0.75)
    n_excelente = int((dados >= p75).sum())
    pct_exc = n_excelente / len(dados) * 100

    print(f"       Mediana : {mediana:.3f}%  |  P75: {p75:.3f}%")
    print(f"       Zona desfecho excelente (>= P75): {n_excelente} vídeos ({pct_exc:.1f}%)")
    print(f"       [Insight Obj 2] Encerramentos desses {n_excelente} vídeos → template de CTA padrão.")

    fig, ax = plt.subplots(figsize=(10, 5))
    sns.histplot(dados, bins=40, kde=True, ax=ax, color="#95a5a6", edgecolor="white", linewidth=0.3, line_kws={"linewidth": 2, "color": "#2c3e50"})

    ax.axvspan(p75, dados.max() * 1.01, alpha=0.15, color="#f39c12", label=f"Zona CTA excelente (>= P75: {p75:.3f}%)")
    ax.axvline(p75, color="#f39c12", linestyle="--", linewidth=2)
    ax.axvline(mediana, color="#e74c3c", linestyle="-", linewidth=1.5, label=f"Mediana: {mediana:.3f}%")

    ax.annotate(f"{n_excelente} vídeos\n({pct_exc:.1f}%)\n→ template CTA", xy=(p75 + (dados.max() - p75) * 0.05, ax.get_ylim()[1] * 0.80), fontsize=9, color="#d35400", fontweight="bold")

    ax.set_title("taxa_conversao — Qualidade do Desfecho e CTA\nZona laranja = melhores encerramentos → modelo de fechamento padrão", fontsize=10, fontweight="bold")
    ax.set_xlabel("taxa_conversao (%)")
    ax.set_ylabel("Frequência")
    ax.legend(fontsize=8)
    plt.tight_layout()
    _salvar(fig, pasta, "taxa_conversao_cta.png")
    print("       [+] taxa_conversao_cta.png salvo.")


def _analisar_taxa_discussao(dados: pd.Series, pasta: str) -> None:
    """..."""
    _cabecalho_coluna("taxa_discussao", dados)

    mediana = dados.median()
    p90 = dados.quantile(0.90)
    outliers = dados[dados > p90]
    n_out = len(outliers)
    pct_out = n_out / len(dados) * 100

    print(f"       Mediana : {mediana:.5f}%  |  P90: {p90:.5f}%")
    print(f"       Outliers de fricção (> P90): {n_out} vídeos ({pct_out:.1f}%)")
    print("       [Insight Obj 2] Terço final desses roteiros contém o gatilho de debate.")

    fig, ax = plt.subplots(figsize=(10, 5))
    sns.histplot(dados, bins=40, kde=True, ax=ax, color="#bdc3c7", edgecolor="white", linewidth=0.3, line_kws={"linewidth": 2, "color": "#2c3e50"})

    ax.axvspan(p90, dados.max() * 1.01, alpha=0.18, color="#e74c3c", label=f"Gatilho de debate (> P90: {p90:.5f}%)")
    ax.axvline(p90, color="#e74c3c", linestyle="--", linewidth=2)
    ax.axvline(mediana, color="#3498db", linestyle="-", linewidth=1.5, label=f"Mediana: {mediana:.5f}%")

    ax.annotate(f"{n_out} vídeos\n({pct_out:.1f}%)\ngatilho de debate", xy=(p90 + (dados.max() - p90) * 0.05, ax.get_ylim()[1] * 0.80), fontsize=9, color="#c0392b", fontweight="bold")

    ax.set_title("taxa_discussao — Gatilho de Fricção e Debate\nZona vermelha = roteiros que forçaram o usuário a comentar", fontsize=10, fontweight="bold")
    ax.set_xlabel("taxa_discussao (%)")
    ax.set_ylabel("Frequência")
    ax.legend(fontsize=8)
    plt.tight_layout()
    _salvar(fig, pasta, "taxa_discussao_gatilho.png")
    print("       [+] taxa_discussao_gatilho.png salvo.")


def _analisar_ritmo_palavras_seg(dados: pd.Series, pasta: str) -> None:
    """..."""
    _cabecalho_coluna("ritmo_palavras_seg", dados)

    mediana = dados.median()
    pct_acelerado = (dados >= LIMIAR_RITMO_ACELERADO).sum() / len(dados) * 100
    duracoes_ref = [30, 45, 60]

    print(f"       Mediana ritmo : {mediana:.2f} palavras/seg")
    print(f"       Acima de {LIMIAR_RITMO_ACELERADO} (pacing intenso): {pct_acelerado:.1f}%")
    print(f"       Tabela de restrição textual (ritmo mediano = {mediana:.2f}):")
    for d in duracoes_ref:
        print(f"         {d}s → máx {mediana * d:.0f} palavras no prompt")
    print("       [Insight Obj 2] Parâmetro max_words = ritmo_mediano × duração_desejada")

    fig, axes = plt.subplots(1, 2, figsize=(13, 5))

    # — Histograma —
    sns.histplot(dados, bins=40, kde=True, ax=axes[0], color="#3498db", edgecolor="white", linewidth=0.3, line_kws={"linewidth": 2, "color": "#1a5276"})
    axes[0].axvline(LIMIAR_RITMO_ACELERADO, color="#e74c3c", linestyle="--", linewidth=2, label=f"Limiar acelerado: {LIMIAR_RITMO_ACELERADO}")
    axes[0].axvline(mediana, color="#2ecc71", linestyle="-", linewidth=1.5, label=f"Mediana: {mediana:.2f}")
    axes[0].set_title("Distribuição do Ritmo", fontsize=10, fontweight="bold")
    axes[0].set_xlabel("palavras/seg")
    axes[0].set_ylabel("Frequência")
    axes[0].legend(fontsize=8)

    # — Tabela de restrição —
    duracoes_tabela = [15, 30, 45, 60, 90]
    linhas = [[f"{d}s", f"{mediana:.2f}", f"{mediana * d:.0f}"] for d in duracoes_tabela]
    tabela = axes[1].table(
        cellText=linhas,
        colLabels=["Duração", "Ritmo mediano", "Max palavras"],
        cellLoc="center",
        loc="center",
    )
    tabela.auto_set_font_size(False)
    tabela.set_fontsize(10)
    tabela.scale(1.2, 2.0)
    axes[1].axis("off")
    axes[1].set_title("Equação de Restrição Textual\nmax_palavras = ritmo × duração", fontsize=10, fontweight="bold")

    fig.suptitle("ritmo_palavras_seg — Limitador Matemático da Automação", fontsize=12, fontweight="bold", y=1.02)
    plt.tight_layout()
    _salvar(fig, pasta, "ritmo_palavras_limitador.png")
    print("       [+] ritmo_palavras_limitador.png salvo.")


def _analisar_densidade_roteiro(dados: pd.Series, pasta: str) -> None:
    """..."""
    _cabecalho_coluna("densidade_roteiro", dados)

    n_zeros = int((dados == 0).sum())
    pct_zeros = n_zeros / len(dados) * 100
    dados_fala = dados[dados > 0]
    mediana = dados_fala.median()
    p25 = dados_fala.quantile(0.25)
    p75 = dados_fala.quantile(0.75)

    print(f"       Vídeos sem fala (densidade == 0): {n_zeros} ({pct_zeros:.1f}%) — excluídos do gerador")
    print(f"       Mediana (com fala): {mediana:.0f} palavras")
    print(f"       IQR (range alvo):   {p25:.0f} – {p75:.0f} palavras")
    print(f"       [Insight Obj 2] max_words padrão do prompt = {mediana:.0f} palavras")

    fig, ax = plt.subplots(figsize=(10, 5))
    sns.histplot(dados_fala, bins=40, kde=True, ax=ax, color="#1abc9c", edgecolor="white", linewidth=0.3, line_kws={"linewidth": 2, "color": "#0e6655"})

    ax.axvspan(p25, p75, alpha=0.15, color="#f39c12", label=f"IQR range alvo: {p25:.0f}–{p75:.0f} palavras")
    ax.axvline(mediana, color="#e74c3c", linestyle="--", linewidth=2, label=f"Mediana (max_words): {mediana:.0f}")

    ax.set_title(f"densidade_roteiro — Parâmetro max_words do Prompt\n{n_zeros} vídeos sem fala ({pct_zeros:.1f}%) excluídos desta análise", fontsize=10, fontweight="bold")
    ax.set_xlabel("palavras por vídeo")
    ax.set_ylabel("Frequência")
    ax.legend(fontsize=8)
    plt.tight_layout()
    _salvar(fig, pasta, "densidade_roteiro_maxwords.png")
    print("       [+] densidade_roteiro_maxwords.png salvo.")


def _analisar_idade_dias(dados: pd.Series, pasta: str) -> None:
    """..."""
    _cabecalho_coluna("idade_dias", dados)

    mediana = dados.median()
    n_recente = int((dados <= 30).sum())
    n_transicao = int(((dados > 30) & (dados < 180)).sum())
    n_perene = int((dados >= 180).sum())
    total = len(dados)
    regime_dom = "FACTUAL/HYPE" if n_recente == max(n_recente, n_transicao, n_perene) else "EVERGREEN" if n_perene == max(n_recente, n_transicao, n_perene) else "TRANSIÇÃO"
    estrategia = "Vídeos recentes → templates de resposta rápida a trends." if regime_dom == "FACTUAL/HYPE" else "Vídeos perenes → moldes fixos (blueprints atemporais)." if regime_dom == "EVERGREEN" else "Mix de conteúdo — usar ambas as estratégias."

    print(f"       Mediana : {mediana:.0f} dias")
    print(f"       Recente  (≤ 30 dias)  : {n_recente}  ({n_recente / total * 100:.1f}%)")
    print(f"       Transição(31–179 dias): {n_transicao} ({n_transicao / total * 100:.1f}%)")
    print(f"       Perene   (≥ 180 dias) : {n_perene}  ({n_perene / total * 100:.1f}%)")
    print(f"       [Insight Obj 2] Regime dominante: {regime_dom} → {estrategia}")

    fig, ax = plt.subplots(figsize=(10, 5))
    sns.histplot(dados, bins=40, kde=False, ax=ax, color="#bdc3c7", edgecolor="white", linewidth=0.3)

    ax.axvspan(0, 31, alpha=0.20, color="#2ecc71", label=f"Recente ≤30d ({n_recente / total * 100:.1f}%)")
    ax.axvspan(31, 180, alpha=0.10, color="#95a5a6", label=f"Transição 31–179d ({n_transicao / total * 100:.1f}%)")
    ax.axvspan(180, TETO_IDADE_DIAS + 1, alpha=0.20, color="#3498db", label=f"Perene ≥180d ({n_perene / total * 100:.1f}%)")
    ax.axvline(mediana, color="#e74c3c", linestyle="--", linewidth=2, label=f"Mediana: {mediana:.0f} dias")

    ax.set_title(f"idade_dias — Factual vs. Evergreen\nRegime dominante: {regime_dom}  →  {estrategia}", fontsize=10, fontweight="bold")
    ax.set_xlabel("dias desde a postagem")
    ax.set_ylabel("Frequência")
    ax.legend(fontsize=8)
    plt.tight_layout()
    _salvar(fig, pasta, "idade_dias_regimes.png")
    print("       [+] idade_dias_regimes.png salvo.")


def _analisar_hora_postagem(dados: pd.Series, pasta: str) -> None:
    """..."""
    _cabecalho_coluna("hora_postagem", dados)

    mediana = dados.median()
    moda = int(dados.mode().iloc[0])
    contagem = dados.value_counts().sort_index()
    top3 = dados.value_counts().head(3).index.tolist()

    print(f"       Mediana : {mediana:.0f}h  |  Moda (pico): {moda}h")
    print(f"       Top 3 horas de postagem: {top3}")
    print(f"       [Insight Obj 2] Metadado de agendamento → horários {top3} injetados nos roteiros.")

    fig, ax = plt.subplots(figsize=(12, 5))
    cores = ["#e74c3c" if h in top3 else "#3498db" for h in range(24)]
    ax.bar(range(24), [contagem.get(h, 0) for h in range(24)], color=cores, edgecolor="white", width=0.7)

    for h in top3:
        ax.annotate(f"#{top3.index(h) + 1}\n{h}h", xy=(h, contagem.get(h, 0)), xytext=(h, contagem.get(h, 0) + contagem.max() * 0.04), ha="center", fontsize=8, color="#c0392b", fontweight="bold")

    ax.set_xticks(range(24))
    ax.set_xticklabels([f"{h}h" for h in range(24)], fontsize=7, rotation=45)
    ax.set_title(f"hora_postagem — Metadado de Agendamento Automático\nTop 3: {top3}h  |  Vermelho = slots prioritários de agendamento", fontsize=10, fontweight="bold")
    ax.set_xlabel("hora do dia")
    ax.set_ylabel("Quantidade de vídeos")
    plt.tight_layout()
    _salvar(fig, pasta, "hora_postagem_agendamento.png")
    print("       [+] hora_postagem_agendamento.png salvo.")


def analisar_colunas_numericas(
    df_nicho: pd.DataFrame,
    pasta: str,
    acumulado: dict[str, pd.Series],
) -> None:
    """
    Orquestra a análise individual de todas as colunas numéricas.
    """
    mapa = {
        "score_viral": _analisar_score_viral,
        "clickbait_score": _analisar_clickbait_score,
        "completude_seo": _analisar_completude_seo,
        "velocidade_views": _analisar_velocidade_views,
        "taxa_conversao": _analisar_taxa_conversao,
        "taxa_discussao": _analisar_taxa_discussao,
        "ritmo_palavras_seg": _analisar_ritmo_palavras_seg,
        "densidade_roteiro": _analisar_densidade_roteiro,
        "idade_dias": _analisar_idade_dias,
        "hora_postagem": _analisar_hora_postagem,
    }

    for col, fn in mapa.items():
        dados = _serie_numerica(col, df_nicho)
        if dados is None:
            continue
        acumulado[col] = dados
        fn(dados, pasta)


# ─────────────────────────────────────────────────────────────
# PARTE 1-B — ANÁLISE INDIVIDUAL: COLUNA BOOLEANA
# ─────────────────────────────────────────────────────────────


def analisar_coluna_booleana(col: str, df_nicho: pd.DataFrame, pasta: str) -> None:
    """..."""
    if col not in df_nicho.columns:
        print(f"    - [Booleana] Coluna '{col}': NÃO ENCONTRADA.")
        return

    serie_bruta = df_nicho[col]
    _cabecalho_coluna(col, serie_bruta)

    try:
        dados_bool = serie_bruta.dropna().astype(str).str.lower().map({"true": 1, "false": 0, "1": 1, "0": 0}).dropna().astype(int)
    except Exception as e:
        print(f"       [ERRO] Conversão booleana falhou: {e}")
        return

    if dados_bool.empty:
        print("       [SKIP] Sem dados válidos.")
        return

    qtd_true = int(dados_bool.sum())
    qtd_false = len(dados_bool) - qtd_true
    pct_true = qtd_true / len(dados_bool) * 100
    pct_false = 100 - pct_true

    regra_ativa = pct_true > 30
    if regra_ativa:
        insight = f"Regra ATIVADA ({pct_true:.1f}% > 30%) → gerador deve repetir a palavra-chave central pelo menos 5x organicamente no script."
    else:
        insight = f"Regra DESATIVADA ({pct_true:.1f}% <= 30%) → nicho não usa bordão, gerador não aplica repetição forçada."

    print(f"       True  : {qtd_true}  ({pct_true:.1f}%)")
    print(f"       False : {qtd_false} ({pct_false:.1f}%)")
    print(f"       [Insight Obj 2] {insight}")

    fig, ax = plt.subplots(figsize=(6, 4))
    cores = ["#2ecc71", "#e74c3c"]
    bars = ax.bar(["True", "False"], [qtd_true, qtd_false], color=cores, edgecolor="white", width=0.5)

    for bar, valor, pct in zip(bars, [qtd_true, qtd_false], [pct_true, pct_false]):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + max(qtd_true, qtd_false) * 0.02,
            f"{valor:,}\n({pct:.1f}%)",
            ha="center",
            va="bottom",
            fontsize=9,
            fontweight="bold",
        )

    status = "✅ ATIVADA" if regra_ativa else "⛔ DESATIVADA"
    ax.set_title(f"{col}\nRegra de repetição de bordão: {status}", fontsize=10, fontweight="bold")
    ax.set_ylabel("Quantidade de Vídeos")
    ax.set_ylim(0, max(qtd_true, qtd_false) * 1.30)

    rodape = "→ Gerador repete keyword 5x no script" if regra_ativa else "→ Gerador NÃO força repetição"
    ax.text(0.5, -0.18, rodape, transform=ax.transAxes, ha="center", fontsize=8, color="#7f8c8d", style="italic")

    plt.tight_layout()
    _salvar(fig, pasta, f"bool_{col}.png")
    print(f"       [+] bool_{col}.png salvo.")


# ─────────────────────────────────────────────────────────────
# PARTE 1-C — ANÁLISE INDIVIDUAL: COLUNAS CATEGÓRICAS
# ─────────────────────────────────────────────────────────────


def _analisar_label_viral(serie: pd.Series, pasta: str) -> None:
    """..."""
    _cabecalho_coluna("label_viral", serie)

    ordem = ORDENS_CATEGORICAS["label_viral"]
    contagem = serie.value_counts().reindex(ordem).dropna()
    total = contagem.sum()

    aprovados = int(contagem.get("viral", 0) + contagem.get("super_viral", 0))
    descartados = int(contagem.get("frio", 0) + contagem.get("aquecido", 0))
    pct_aprov = aprovados / total * 100

    print("       Distribuição:")
    for cat, qtd in contagem.items():
        print(f"         {str(cat):15s}: {int(qtd):5d} ({qtd / total * 100:.1f}%)")
    print(f"       Aprovados (viral+super_viral) : {aprovados} ({pct_aprov:.1f}%)")
    print(f"       Descartados (frio+aquecido)   : {descartados} ({100 - pct_aprov:.1f}%)")
    print("       [Insight Obj 2] Apenas super_viral alimenta o gerador de roteiros.")

    cores_label = {
        "frio": "#bdc3c7",
        "aquecido": "#95a5a6",
        "viral": "#2ecc71",
        "super_viral": "#27ae60",
    }
    simbolos = {
        "frio": "✗ Ignora",
        "aquecido": "✗ Ignora",
        "viral": "✓ Aprende",
        "super_viral": "✓ Aprende",
    }
    labels = [str(c) for c in contagem.index]
    vals = contagem.values
    bar_cores = [cores_label.get(lbl, "#3498db") for lbl in labels]

    fig, ax = plt.subplots(figsize=(8, 4))
    bars = ax.barh(labels[::-1], vals[::-1], color=bar_cores[::-1], edgecolor="white", height=0.5)

    for bar, qtd, lbl in zip(bars, vals[::-1], labels[::-1]):
        pct = qtd / total * 100
        ax.text(bar.get_width() + total * 0.005, bar.get_y() + bar.get_height() / 2, f"{qtd:,} ({pct:.1f}%)", va="center", fontsize=8.5)

    for i, lbl in enumerate(labels[::-1]):
        simbolo = simbolos.get(lbl, "")
        cor_sim = "#27ae60" if "Aprende" in simbolo else "#e74c3c"
        ax.text(-total * 0.01, i, simbolo, va="center", ha="right", fontsize=8, color=cor_sim, fontweight="bold")

    ax.set_xlim(-total * 0.15, max(vals) * 1.35)
    ax.set_title("label_viral — Filtro de Corte do Banco de Dados\nVerde = aprovados para aprendizado  |  Cinza = descartados", fontsize=10, fontweight="bold")
    ax.set_xlabel("Quantidade de Vídeos")
    plt.tight_layout()
    _salvar(fig, pasta, "cat_label_viral.png")
    print("       [+] cat_label_viral.png salvo.")


def _analisar_faixa_duracao(serie: pd.Series, pasta: str) -> None:
    """..."""
    _cabecalho_coluna("faixa_duracao", serie)

    ordem = ORDENS_CATEGORICAS["faixa_duracao"]
    contagem = serie.value_counts().reindex(ordem).dropna()
    total = contagem.sum()
    dominante = str(contagem.idxmax())

    prompts = {
        "ultra_curto": "Prompt de impacto direto — 1 ideia, 1 gancho, sem estrutura",
        "short_padrao": "Prompt padrão balanceado — gancho + desenvolvimento + CTA",
        "short_longo": "Prompt estruturado — listas, storytelling ou blocos temáticos",
    }
    prompt_ativo = prompts.get(dominante, "Prompt padrão")

    print("       Distribuição:")
    for cat, qtd in contagem.items():
        print(f"         {str(cat):15s}: {int(qtd):5d} ({qtd / total * 100:.1f}%)")
    print(f"       Faixa dominante : {dominante}")
    print(f"       [Insight Obj 2] Prompt ativado → {prompt_ativo}")

    cores_faixa = {
        "ultra_curto": "#e74c3c",
        "short_padrao": "#3498db",
        "short_longo": "#2ecc71",
    }
    labels = [str(c) for c in contagem.index]
    vals = contagem.values
    bar_cores = [cores_faixa.get(lbl, "#95a5a6") for lbl in labels]

    fig, ax = plt.subplots(figsize=(8, 4))
    bars = ax.barh(labels[::-1], vals[::-1], color=bar_cores[::-1], edgecolor="white", height=0.5)

    for bar, qtd, lbl in zip(bars, vals[::-1], labels[::-1]):
        pct = qtd / total * 100
        ax.text(bar.get_width() + total * 0.005, bar.get_y() + bar.get_height() / 2, f"{qtd:,} ({pct:.1f}%)  →  {prompts.get(lbl, '')}", va="center", fontsize=7.5)

    ax.set_xlim(0, max(vals) * 1.80)
    ax.set_title(f"faixa_duracao — Arquitetura do Prompt de Geração\nDominante: {dominante}  →  {prompt_ativo}", fontsize=10, fontweight="bold")
    ax.set_xlabel("Quantidade de Vídeos")
    plt.tight_layout()
    _salvar(fig, pasta, "cat_faixa_duracao.png")
    print("       [+] cat_faixa_duracao.png salvo.")


def _analisar_estrutura_blocos(serie: pd.Series, pasta: str) -> None:
    """..."""
    _cabecalho_coluna("estrutura_blocos", serie)

    contagem = serie.value_counts()
    total = contagem.sum()
    dominante = str(contagem.idxmax())

    blueprints = {
        "impacto_rapido": "Frase única de alto impacto + CTA imediato",
        "esquete": "Diálogos: Narrador: X | Personagem: Y",
        "esquete_com_hook": "Hook 3s + Diálogos: Narrador: X | Personagem: Y",
        "narrativa": "Texto corrido para locução única em primeira pessoa",
    }
    blueprint_ativo = blueprints.get(dominante, "Blueprint padrão")

    print("       Distribuição:")
    for cat, qtd in contagem.items():
        print(f"         {str(cat):20s}: {int(qtd):5d} ({qtd / total * 100:.1f}%)")
    print(f"       Estrutura dominante : {dominante}")
    print(f"       [Insight Obj 2] Blueprint de saída → {blueprint_ativo}")

    labels = [str(c) for c in contagem.index]
    vals = contagem.values
    cmap = plt.cm.get_cmap("tab10", len(labels))
    bar_cores = [cmap(i) for i in range(len(labels))]

    fig, ax = plt.subplots(figsize=(10, max(4, len(labels) * 0.7 + 1.5)))
    bars = ax.barh(labels[::-1], vals[::-1], color=bar_cores[::-1], edgecolor="white", height=0.55)

    for bar, qtd, lbl in zip(bars, vals[::-1], labels[::-1]):
        pct = qtd / total * 100
        bp = blueprints.get(lbl, "")
        destaque = " ◀ DOMINANTE" if lbl == dominante else ""
        ax.text(bar.get_width() + total * 0.005, bar.get_y() + bar.get_height() / 2, f"{qtd:,} ({pct:.1f}%)  →  {bp}{destaque}", va="center", fontsize=7.5, fontweight="bold" if lbl == dominante else "normal")

    ax.set_xlim(0, max(vals) * 1.90)
    ax.set_title(f"estrutura_blocos — Molde de Saída (JSON Blueprint)\nDominante: {dominante}  →  {blueprint_ativo}", fontsize=10, fontweight="bold")
    ax.set_xlabel("Quantidade de Vídeos")
    plt.tight_layout()
    _salvar(fig, pasta, "cat_estrutura_blocos.png")
    print("       [+] cat_estrutura_blocos.png salvo.")


def _analisar_janela_e_dia_postagem(
    serie_janela: pd.Series,
    serie_dia: pd.Series,
    pasta: str,
) -> None:
    """..."""
    _cabecalho_coluna("janela_postagem", serie_janela)
    _cabecalho_coluna("dia_postagem", serie_dia)

    ordem_janela = ORDENS_CATEGORICAS["janela_postagem"]
    ordem_dia = ORDENS_CATEGORICAS["dia_postagem"]

    df_comb = pd.DataFrame(
        {
            "janela": serie_janela.astype(str).str.strip(),
            "dia": serie_dia.astype(str).str.strip(),
        }
    ).dropna()

    pivot = df_comb.groupby(["dia", "janela"]).size().unstack(fill_value=0).reindex(index=ordem_dia, columns=ordem_janela, fill_value=0)

    flat = pivot.stack().reset_index()
    flat.columns = ["dia", "janela", "qtd"]
    top3 = flat.nlargest(3, "qtd")[["dia", "janela", "qtd"]].values.tolist()

    cont_janela = df_comb["janela"].value_counts().reindex(ordem_janela).dropna()
    cont_dia = df_comb["dia"].value_counts().reindex(ordem_dia).dropna()
    total = len(df_comb)

    print("       Distribuição por janela:")
    for janela, qtd in cont_janela.items():
        print(f"         {str(janela):12s}: {int(qtd):5d} ({qtd / total * 100:.1f}%)")

    print("       Distribuição por dia:")
    for dia, qtd in cont_dia.items():
        print(f"         {str(dia):12s}: {qtd:5d} ({qtd / total * 100:.1f}%)")

    print("       Top 3 slots (dia × janela):")
    for dia, janela, qtd in top3:
        print(f"         {str(dia):12s} × {str(janela):12s} : {qtd} vídeos")
    print("       [Insight Obj 2] Esses slots definem o batch schedule da automação.")

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    sns.heatmap(pivot, annot=True, fmt="d", cmap="YlOrRd", linewidths=0.5, linecolor="white", ax=axes[0], annot_kws={"size": 9, "weight": "bold"})
    axes[0].set_title("Heatmap: Dia × Janela de Postagem\nIntensidade = quantidade de vídeos virais", fontsize=10, fontweight="bold")
    axes[0].set_xlabel("Janela do dia")
    axes[0].set_ylabel("Dia da semana")

    slot_labels = [f"{dia}\n{janela}" for dia, janela, _ in top3]
    slot_vals = [int(qtd) for _, _, qtd in top3]
    axes[1].bar(slot_labels, slot_vals, color=["#e74c3c", "#e67e22", "#f39c12"], edgecolor="white", width=0.5)
    for i, (lbl, val) in enumerate(zip(slot_labels, slot_vals)):
        axes[1].text(i, val + max(slot_vals) * 0.02, f"#{i + 1}\n{val} vídeos", ha="center", fontsize=9, fontweight="bold")
    axes[1].set_title("Top 3 Slots de Agendamento\n→ batch schedule da automação", fontsize=10, fontweight="bold")
    axes[1].set_ylabel("Quantidade de Vídeos")
    axes[1].set_ylim(0, max(slot_vals) * 1.30)

    plt.tight_layout()
    _salvar(fig, pasta, "cat_janela_dia_heatmap.png")
    print("       [+] cat_janela_dia_heatmap.png salvo.")


def _analisar_sentimento_roteiro(serie: pd.Series, pasta: str) -> None:
    """..."""
    _cabecalho_coluna("sentimento_roteiro", serie)

    ordem = ORDENS_CATEGORICAS["sentimento_roteiro"]
    contagem = serie.value_counts().reindex(ordem).dropna()
    total = contagem.sum()
    dominante = str(contagem.idxmax())

    dicionarios = {
        "negativo": ["pare", "perigo", "nunca faça", "erro grave", "cuidado", "urgente"],
        "neutro": ["saiba", "entenda", "veja", "descubra", "conheça"],
        "positivo": ["conquiste", "transforme", "aprenda agora", "descubra", "ganhe"],
    }
    palavras_ativas = dicionarios.get(dominante, [])

    print("       Distribuição:")
    for cat, qtd in contagem.items():
        print(f"         {str(cat):12s}: {int(qtd):5d} ({qtd / total * 100:.1f}%)")
    print(f"       Tom dominante : {dominante}")
    print(f"       [Insight Obj 2] Dicionário ativado → {palavras_ativas}")

    cores_sent = {"negativo": "#e74c3c", "neutro": "#95a5a6", "positivo": "#2ecc71"}
    labels = [str(c) for c in contagem.index]
    vals = contagem.values
    bar_cores = [cores_sent.get(lbl, "#3498db") for lbl in labels]

    fig, ax = plt.subplots(figsize=(8, 4))
    bars = ax.bar(labels, vals, color=bar_cores, edgecolor="white", width=0.5)

    for bar, qtd, lbl in zip(bars, vals, labels):
        pct = qtd / total * 100
        words = dicionarios.get(lbl, [])
        sample = ", ".join(words[:3]) + ("..." if len(words) > 3 else "")
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + max(vals) * 0.02, f'{qtd:,} ({pct:.1f}%)\n"{sample}"', ha="center", va="bottom", fontsize=7.5, fontweight="bold" if lbl == dominante else "normal")

    ax.set_ylim(0, max(vals) * 1.40)
    ax.set_title(f"sentimento_roteiro — Dicionário de Adjetivos do Gerador\nTom dominante: {dominante}  →  palavras-gatilho: {palavras_ativas[:3]}", fontsize=10, fontweight="bold")
    ax.set_ylabel("Quantidade de Vídeos")
    plt.tight_layout()
    _salvar(fig, pasta, "cat_sentimento_roteiro.png")
    print("       [+] cat_sentimento_roteiro.png salvo.")


def _analisar_tipo_audio_dominante(serie: pd.Series, pasta: str) -> None:
    """..."""
    _cabecalho_coluna("tipo_audio_dominante", serie)

    contagem = serie.value_counts()
    total = contagem.sum()
    dominante = str(contagem.idxmax())

    tags_producao = {
        "[music]": "[Inserir trilha musical de fundo aqui]",
        "[laughter]": "[Inserir efeito sonoro de risada aqui]",
        "[applause]": "[Inserir efeito sonoro de aplauso aqui]",
        "[silence]": "[Sem áudio de fundo — voz limpa]",
    }
    tag_gerada = tags_producao.get(dominante, f"[Inserir áudio: {dominante}]")

    print("       Distribuição:")
    for cat, qtd in contagem.items():
        print(f"         {str(cat):20s}: {int(qtd):5d} ({qtd / total * 100:.1f}%)")
    print(f"       Tipo dominante : {dominante}")
    print(f"       [Insight Obj 2] Tag de produção gerada → {tag_gerada}")

    labels = [str(c) for c in contagem.index]
    vals = contagem.values
    cmap = plt.cm.get_cmap("tab10", len(labels))
    bar_cores = [cmap(i) for i in range(len(labels))]
    altura = max(4, len(labels) * 0.55 + 1.5)

    fig, ax = plt.subplots(figsize=(10, altura))
    bars = ax.barh(labels[::-1], vals[::-1], color=bar_cores[::-1], edgecolor="white", height=0.6)

    for bar, qtd, lbl in zip(bars, vals[::-1], labels[::-1]):
        pct = qtd / total * 100
        tag = tags_producao.get(lbl, f"[Inserir áudio: {lbl}]")
        destaque = " ◀ DOMINANTE" if lbl == dominante else ""
        ax.text(bar.get_width() + total * 0.005, bar.get_y() + bar.get_height() / 2, f"{qtd:,} ({pct:.1f}%)  →  {tag}{destaque}", va="center", fontsize=7.5, fontweight="bold" if lbl == dominante else "normal")

    ax.set_xlim(0, max(vals) * 1.90)
    ax.set_title(f"tipo_audio_dominante — Gerador de Notas de Edição\nDominante: {dominante}  →  {tag_gerada}", fontsize=10, fontweight="bold")
    ax.set_xlabel("Quantidade de Vídeos")
    plt.tight_layout()
    _salvar(fig, pasta, "cat_tipo_audio_dominante.png")
    print("       [+] cat_tipo_audio_dominante.png salvo.")


def analisar_colunas_categoricas(df_nicho: pd.DataFrame, pasta: str) -> None:
    """
    Orquestra a análise individual de todas as colunas categóricas.
    """

    def _extrair(col: str) -> pd.Series | None:
        if col not in df_nicho.columns:
            print(f"    - [Categórica] Coluna '{col}': NÃO ENCONTRADA.")
            return None
        s = df_nicho[col].dropna().astype(str).str.strip()
        s = s[s != ""]
        if s.empty:
            print(f"       [SKIP] '{col}' sem dados válidos.")
            return None
        return s

    for col, fn in [
        ("label_viral", _analisar_label_viral),
        ("faixa_duracao", _analisar_faixa_duracao),
        ("estrutura_blocos", _analisar_estrutura_blocos),
        ("sentimento_roteiro", _analisar_sentimento_roteiro),
        ("tipo_audio_dominante", _analisar_tipo_audio_dominante),
    ]:
        s = _extrair(col)
        if s is not None:
            fn(s, pasta)

    s_janela = _extrair("janela_postagem")
    s_dia = _extrair("dia_postagem")
    if s_janela is not None and s_dia is not None:
        _analisar_janela_e_dia_postagem(s_janela, s_dia, pasta)


# ─────────────────────────────────────────────────────────────
# PARTE 2 — CRUZAMENTOS ESTRATÉGICOS
# ─────────────────────────────────────────────────────────────


def cruzamento_a_forma_narrativa(
    acumulado: dict[str, pd.Series],
    df_nicho: pd.DataFrame,
    pasta: str,
) -> None:
    """..."""
    print("\n    ── Cruzamento A: Fôrma Narrativa Mecânica ──")

    for col in ["ritmo_palavras_seg", "densidade_roteiro"]:
        if col not in acumulado:
            print(f"       [SKIP] '{col}' ausente no acumulado.")
            return
    for col in ["estrutura_blocos", "faixa_duracao"]:
        if col not in df_nicho.columns:
            print(f"       [SKIP] '{col}' ausente no DataFrame.")
            return

    ritmo = acumulado["ritmo_palavras_seg"]
    estrutura = df_nicho["estrutura_blocos"].astype(str).str.strip()
    faixa = df_nicho["faixa_duracao"].astype(str).str.strip()

    df_cruz = pd.DataFrame(
        {
            "ritmo": ritmo,
            "estrutura": estrutura,
            "faixa": faixa,
        }
    ).dropna()

    ordem_estrutura = ["impacto_rapido", "esquete", "esquete_com_hook", "narrativa"]
    ordem_faixa = ORDENS_CATEGORICAS["faixa_duracao"]
    duracoes_ref = {"ultra_curto": 20, "short_padrao": 45, "short_longo": 75}

    estruturas_present = [e for e in ordem_estrutura if e in df_cruz["estrutura"].unique()]
    faixas_present = [f for f in ordem_faixa if f in df_cruz["faixa"].unique()]

    med_estrutura = df_cruz.groupby("estrutura")["ritmo"].median().reindex(estruturas_present)
    med_faixa = df_cruz.groupby("faixa")["ritmo"].median().reindex(faixas_present)

    print("       Mediana de ritmo por estrutura:")
    for est, med in med_estrutura.items():
        print(f"         {str(est):20s}: {med:.2f} palavras/seg")

    print("       Mediana de ritmo por faixa:")
    for fx, med in med_faixa.items():
        print(f"         {str(fx):15s}: {med:.2f} palavras/seg")

    # Tabela de restrição: estrutura × faixa → max_palavras
    print("       Tabela de restrição textual (estrutura × faixa → max_palavras):")
    linhas_tabela = []
    for est in estruturas_present:
        for fx in faixas_present:
            subset = df_cruz[(df_cruz["estrutura"] == est) & (df_cruz["faixa"] == fx)]["ritmo"]
            med_combo = subset.median()
            dur = duracoes_ref.get(fx, 45)
            if np.isnan(med_combo):
                max_palavras = "—"
                ritmo_str = "—"
            else:
                max_palavras = str(round(med_combo * dur))
                ritmo_str = f"{med_combo:.2f}"
            linhas_tabela.append([est, fx, ritmo_str, f"{dur}s", max_palavras])
            print(f"         {str(est):20s} × {str(fx):15s}: ritmo={ritmo_str} × {dur}s = {max_palavras} palavras")

    print("       [Insight Obj 2] Equação: max_palavras = ritmo_mediano(estrutura, faixa) × duração")

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # — Boxplot ritmo por estrutura, colorido por faixa —
    cores_faixa = {"ultra_curto": "#e74c3c", "short_padrao": "#3498db", "short_longo": "#2ecc71"}
    posicoes = np.arange(len(estruturas_present))
    n_faixas = len(faixas_present)
    largura = 0.2
    offsets = np.linspace(-largura * (n_faixas - 1) / 2, largura * (n_faixas - 1) / 2, n_faixas)

    for i, fx in enumerate(faixas_present):
        dados_box = [df_cruz[(df_cruz["estrutura"] == est) & (df_cruz["faixa"] == fx)]["ritmo"].dropna().values for est in estruturas_present]
        # ignora se todos os grupos estiverem vazios
        if all(len(d) == 0 for d in dados_box):
            continue
        # substitui grupos vazios por array com NaN para manter posição
        dados_box = [d if len(d) > 0 else np.array([np.nan]) for d in dados_box]

        axes[0].boxplot(
            dados_box,
            positions=posicoes + offsets[i],
            widths=largura * 0.85,
            patch_artist=True,
            boxprops=dict(facecolor=cores_faixa.get(fx, "#95a5a6"), alpha=0.65),
            medianprops=dict(color="#2c3e50", linewidth=2),
            whiskerprops=dict(color="#555"),
            capprops=dict(color="#555"),
            flierprops=dict(marker="o", markersize=2, alpha=0.3),
            manage_ticks=False,
        )
        # patch invisível só para a legenda
        axes[0].plot([], [], color=cores_faixa.get(fx, "#95a5a6"), linewidth=6, alpha=0.65, label=fx)

    axes[0].set_xticks(posicoes)
    axes[0].set_xticklabels(estruturas_present, fontsize=8, rotation=15)
    axes[0].set_title("Ritmo por Estrutura Narrativa\ncolorido por faixa_duracao", fontsize=10, fontweight="bold")
    axes[0].set_ylabel("palavras/seg")
    axes[0].legend(fontsize=8, title="faixa_duracao")

    # — Tabela de restrição —
    col_headers = ["Estrutura", "Faixa", "Ritmo med.", "Duração", "Max palavras"]
    tabela = axes[1].table(
        cellText=linhas_tabela,
        colLabels=col_headers,
        cellLoc="center",
        loc="center",
    )
    tabela.auto_set_font_size(False)
    tabela.set_fontsize(8)
    tabela.scale(1.1, 1.8)
    axes[1].axis("off")
    axes[1].set_title("Equação de Restrição Textual\nmax_palavras = ritmo × duração", fontsize=10, fontweight="bold")

    fig.suptitle("Cruzamento A — Fôrma Narrativa Mecânica", fontsize=12, fontweight="bold", y=1.02)
    plt.tight_layout()
    _salvar(fig, pasta, "cruzamento_a_forma_narrativa.png")
    print("       [+] cruzamento_a_forma_narrativa.png salvo.")


def cruzamento_b_engajamento_psicologico(
    acumulado: dict[str, pd.Series],
    df_nicho: pd.DataFrame,
    pasta: str,
) -> None:
    """..."""
    print("\n    ── Cruzamento B: Catalisador de Engajamento Psicológico ──")

    if "taxa_discussao" not in acumulado:
        print("       [SKIP] 'taxa_discussao' ausente no acumulado.")
        return
    for col in ["tem_repeticao_roteiro", "sentimento_roteiro"]:
        if col not in df_nicho.columns:
            print(f"       [SKIP] '{col}' ausente no DataFrame.")
            return

    taxa = acumulado["taxa_discussao"]
    repeticao = df_nicho["tem_repeticao_roteiro"].astype(str).str.lower().map({"true": True, "false": False, "1": True, "0": False})
    sentimento = df_nicho["sentimento_roteiro"].astype(str).str.strip()

    df_cruz = pd.DataFrame(
        {
            "taxa": taxa,
            "repeticao": repeticao,
            "sentimento": sentimento,
        }
    ).dropna()

    # 3 grupos combinados — sem comparação com True
    mask_neg_rep = (df_cruz["sentimento"] == "negativo") & df_cruz["repeticao"]
    mask_neg_no = (df_cruz["sentimento"] == "negativo") & ~df_cruz["repeticao"]
    mask_outros = df_cruz["sentimento"] != "negativo"

    grupos = {
        "Negativo\n+ Repetição": df_cruz[mask_neg_rep]["taxa"],
        "Negativo\nsem Repetição": df_cruz[mask_neg_no]["taxa"],
        "Positivo\n/ Neutro": df_cruz[mask_outros]["taxa"],
    }

    print("       Mediana de taxa_discussao por grupo:")
    for nome, serie_g in grupos.items():
        med = serie_g.median()
        n = len(serie_g)
        print(f"         {nome.replace(chr(10), ' '):30s}: {med:.5f}%  (n={n})")

    pct_rep_por_sent = df_cruz.groupby("sentimento")["repeticao"].apply(lambda x: x.sum() / len(x) * 100)
    print("       % com repeticao_roteiro=True por sentimento:")
    for sent, pct in pct_rep_por_sent.items():
        print(f"         {str(sent):12s}: {pct:.1f}%")

    grupo_max = max(grupos, key=lambda g: grupos[g].median())
    print(f"       Grupo com maior taxa_discussao: {grupo_max.replace(chr(10), ' ')}")
    print("       [Insight Obj 2] SE objetivo=viralizar_por_comentários → ativar tom negativo + repetição 5x da keyword.")

    fig, axes = plt.subplots(1, 2, figsize=(13, 5))

    # — Boxplot dos 3 grupos —
    cores_grupos = ["#e74c3c", "#e67e22", "#3498db"]
    dados_box = [serie_g.values for serie_g in grupos.values()]
    nomes_grupos = list(grupos.keys())

    bp = axes[0].boxplot(
        dados_box,
        patch_artist=True,
        widths=0.5,
        medianprops=dict(color="#2c3e50", linewidth=2.5),
        whiskerprops=dict(color="#555", linestyle="--"),
        capprops=dict(color="#555"),
        flierprops=dict(marker="o", markersize=2, alpha=0.3),
    )
    for patch, cor in zip(bp["boxes"], cores_grupos):
        patch.set_facecolor(cor)
        patch.set_alpha(0.6)

    axes[0].set_xticks(range(1, len(nomes_grupos) + 1))
    axes[0].set_xticklabels(nomes_grupos, fontsize=8)
    axes[0].set_title("taxa_discussao por Grupo Combinado\nNegativo+Repetição vs. demais", fontsize=10, fontweight="bold")
    axes[0].set_ylabel("taxa_discussao (%)")

    for i, (nome, serie_g) in enumerate(grupos.items()):
        med = serie_g.median()
        axes[0].text(i + 1, med, f" {med:.5f}%", va="bottom", fontsize=7, color="#2c3e50", fontweight="bold")

    # — Barras de mediana por sentimento com overlay de % repeticao —
    ordem_sent = ORDENS_CATEGORICAS["sentimento_roteiro"]
    med_por_sent = df_cruz.groupby("sentimento")["taxa"].median().reindex(ordem_sent).dropna()
    pct_rep_align = pct_rep_por_sent.reindex(med_por_sent.index).fillna(0)

    cores_sent = {"negativo": "#e74c3c", "neutro": "#95a5a6", "positivo": "#2ecc71"}
    bar_cores = [cores_sent.get(s, "#3498db") for s in med_por_sent.index]

    bars = axes[1].bar(med_por_sent.index, med_por_sent.values, color=bar_cores, edgecolor="white", width=0.5, alpha=0.8)

    for bar, (sent, med), pct_r in zip(bars, med_por_sent.items(), pct_rep_align.values):
        axes[1].text(bar.get_x() + bar.get_width() / 2, bar.get_height() + med_por_sent.max() * 0.02, f"med: {med:.5f}%\n{pct_r:.1f}% c/ repetição", ha="center", va="bottom", fontsize=7.5, fontweight="bold")

    axes[1].set_title("Mediana de taxa_discussao por Sentimento\noverlay: % com repeticao_roteiro=True", fontsize=10, fontweight="bold")
    axes[1].set_ylabel("taxa_discussao mediana (%)")
    axes[1].set_ylim(0, med_por_sent.max() * 1.45)

    fig.suptitle("Cruzamento B — Catalisador de Engajamento Psicológico", fontsize=12, fontweight="bold", y=1.02)
    plt.tight_layout()
    _salvar(fig, pasta, "cruzamento_b_engajamento_psicologico.png")
    print("       [+] cruzamento_b_engajamento_psicologico.png salvo.")


def cruzamento_c_embalagem_vs_retencao(
    acumulado: dict[str, pd.Series],
    df_nicho: pd.DataFrame,
    pasta: str,
) -> None:
    """..."""
    print("\n    ── Cruzamento C: Embalagem Externa vs. Retenção Interna ──")

    for col in ["clickbait_score", "score_viral"]:
        if col not in acumulado:
            print(f"       [SKIP] '{col}' ausente no acumulado.")
            return
    if "label_viral" not in df_nicho.columns:
        print("       [SKIP] 'label_viral' ausente no DataFrame.")
        return

    clickbait = acumulado["clickbait_score"]
    score = acumulado["score_viral"]
    label = df_nicho["label_viral"].astype(str).str.strip()

    df_cruz = pd.DataFrame(
        {
            "clickbait": clickbait,
            "score": score,
            "label": label,
        }
    ).dropna()

    ordem_label = ORDENS_CATEGORICAS["label_viral"]
    labels_present = [lbl for lbl in ordem_label if lbl in df_cruz["label"].unique()]

    med_click_por_label = df_cruz.groupby("label")["clickbait"].median().reindex(labels_present)

    r_spearman, p_valor = stats.spearmanr(df_cruz["clickbait"], df_cruz["score"])

    # Quadrante dominante nos super_viral
    sv = df_cruz[df_cruz["label"] == "super_viral"]
    med_click_sv = sv["clickbait"].median()
    med_score_sv = sv["score"].median()

    if med_click_sv >= LIMIAR_CLICKBAIT_AGRESSIVO and med_score_sv >= LIMIAR_SCORE_VIRAL_BENCHMARK:
        quadrante = "CLIQUE CARREGA — nicho agressivo, título carrega o vídeo"
        regras = "CAPS, paradoxos no gancho, emojis de impacto obrigatórios"
    elif med_click_sv < LIMIAR_CLICKBAIT_AGRESSIVO and med_score_sv >= LIMIAR_SCORE_VIRAL_BENCHMARK:
        quadrante = "ROTEIRO CARREGA — retenção pura, sem necessidade de capa forçada"
        regras = "Título descritivo e direto, sem artificialismo"
    else:
        quadrante = "INDEFINIDO — distribuição mista no nicho"
        regras = "Testar ambas as abordagens"

    print("       Mediana de clickbait_score por label_viral:")
    for lbl, med in med_click_por_label.items():
        print(f"         {str(lbl):15s}: {med:.3f}")
    print(f"       Correlação Spearman (clickbait × score_viral): r={r_spearman:+.3f}  p={p_valor:.4f}")
    print(f"       Quadrante dominante (super_viral): {quadrante}")
    print(f"       [Insight Obj 2] Regras do gerador de títulos → {regras}")

    cores_label = {
        "frio": "#bdc3c7",
        "aquecido": "#95a5a6",
        "viral": "#2ecc71",
        "super_viral": "#e74c3c",
    }

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # — Scatter com 4 quadrantes —
    for lbl in labels_present:
        subset = df_cruz[df_cruz["label"] == lbl]
        axes[0].scatter(subset["clickbait"], subset["score"], c=cores_label.get(lbl, "#3498db"), alpha=0.4, s=15, label=lbl)

    axes[0].axvline(LIMIAR_CLICKBAIT_AGRESSIVO, color="#555", linestyle="--", linewidth=1)
    axes[0].axhline(LIMIAR_SCORE_VIRAL_BENCHMARK, color="#555", linestyle="--", linewidth=1)

    y_min = df_cruz["score"].min()
    x_min = df_cruz["clickbait"].min()

    axes[0].text(LIMIAR_CLICKBAIT_AGRESSIVO + 0.01, LIMIAR_SCORE_VIRAL_BENCHMARK + 0.01, "Clique\ncarrega", fontsize=7, color="#c0392b", fontweight="bold")
    axes[0].text(x_min + 0.01, LIMIAR_SCORE_VIRAL_BENCHMARK + 0.01, "Roteiro\ncarrega", fontsize=7, color="#27ae60", fontweight="bold")
    axes[0].text(LIMIAR_CLICKBAIT_AGRESSIVO + 0.01, y_min + 0.01, "Medíocre\nexterno", fontsize=7, color="#e67e22")
    axes[0].text(x_min + 0.01, y_min + 0.01, "Invisível", fontsize=7, color="#7f8c8d")

    axes[0].set_title(f"clickbait_score × score_viral\nSpearman r={r_spearman:+.3f}  |  Quadrante: {quadrante.split('—')[0].strip()}", fontsize=9, fontweight="bold")
    axes[0].set_xlabel("clickbait_score")
    axes[0].set_ylabel("score_viral")
    axes[0].legend(fontsize=7, title="label_viral")

    # — Boxplot clickbait por label_viral —
    dados_box = [df_cruz[df_cruz["label"] == lbl]["clickbait"].values for lbl in labels_present]

    bp = axes[1].boxplot(
        dados_box,
        patch_artist=True,
        widths=0.5,
        medianprops=dict(color="#2c3e50", linewidth=2.5),
        whiskerprops=dict(color="#555", linestyle="--"),
        capprops=dict(color="#555"),
        flierprops=dict(marker="o", markersize=2, alpha=0.3),
    )
    for patch, lbl in zip(bp["boxes"], labels_present):
        patch.set_facecolor(cores_label.get(lbl, "#95a5a6"))
        patch.set_alpha(0.7)

    axes[1].set_xticks(range(1, len(labels_present) + 1))
    axes[1].set_xticklabels(labels_present, fontsize=8)
    axes[1].axhline(LIMIAR_CLICKBAIT_AGRESSIVO, color="#e74c3c", linestyle="--", linewidth=1.2, label=f"Limiar agressivo: {LIMIAR_CLICKBAIT_AGRESSIVO}")
    axes[1].set_title("clickbait_score por label_viral\nMediana de cada categoria", fontsize=10, fontweight="bold")
    axes[1].set_ylabel("clickbait_score")
    axes[1].legend(fontsize=8)

    for i, (lbl, med) in enumerate(med_click_por_label.items()):
        axes[1].text(i + 1, med + 0.01, f"{med:.3f}", ha="center", fontsize=8, color="#2c3e50", fontweight="bold")

    fig.suptitle("Cruzamento C — Embalagem Externa vs. Retenção Interna", fontsize=12, fontweight="bold", y=1.02)
    plt.tight_layout()
    _salvar(fig, pasta, "cruzamento_c_embalagem_retencao.png")
    print("       [+] cruzamento_c_embalagem_retencao.png salvo.")


def cruzamento_d_motor_entrega_algoritmica(
    acumulado: dict[str, pd.Series],
    df_nicho: pd.DataFrame,
    pasta: str,
) -> None:
    """..."""
    print("\n    ── Cruzamento D: Motor de Entrega Algorítmica ──")

    for col in ["velocidade_views", "completude_seo"]:
        if col not in acumulado:
            print(f"       [SKIP] '{col}' ausente no acumulado.")
            return
    if "janela_postagem" not in df_nicho.columns:
        print("       [SKIP] 'janela_postagem' ausente no DataFrame.")
        return

    velocidade = acumulado["velocidade_views"]
    seo = acumulado["completude_seo"]
    janela = df_nicho["janela_postagem"].astype(str).str.strip()

    df_cruz = pd.DataFrame(
        {
            "velocidade": velocidade,
            "seo": seo,
            "janela": janela,
        }
    ).dropna()

    ordem_janela = ORDENS_CATEGORICAS["janela_postagem"]
    janelas_present = [j for j in ordem_janela if j in df_cruz["janela"].unique()]

    med_vel_por_janela = df_cruz.groupby("janela")["velocidade"].median().reindex(janelas_present)

    print("       Mediana de velocidade_views por janela_postagem:")
    for janela_nome, med in med_vel_por_janela.items():
        print(f"         {str(janela_nome):12s}: {med:,.0f} views/dia")

    print("       Correlação Spearman (completude_seo × velocidade_views) por janela:")
    correlacoes: dict[str, tuple[float, float]] = {}
    for janela_nome in janelas_present:
        subset = df_cruz[df_cruz["janela"] == janela_nome]
        if len(subset) < 5:
            correlacoes[janela_nome] = (float("nan"), float("nan"))
            print(f"         {str(janela_nome):12s}: n insuficiente (< 5)")
            continue
        r, p = stats.spearmanr(subset["seo"], subset["velocidade"])
        correlacoes[janela_nome] = (r, p)
        sig = "✓ significativa" if p < 0.05 else "✗ não significativa"
        print(f"         {str(janela_nome):12s}: r={r:+.3f}  p={p:.4f}  {sig}")

    r_geral, p_geral = stats.spearmanr(df_cruz["seo"], df_cruz["velocidade"])
    if abs(r_geral) < 0.2 or p_geral >= 0.05:
        decisao = "SEO irrelevante → focar 100% no refinamento do texto e timing de publicação"
    else:
        decisao = "SEO relevante → reservar tokens e tempo de geração para metadados técnicos"

    print(f"       Correlação geral: r={r_geral:+.3f}  p={p_geral:.4f}")
    print(f"       [Insight Obj 2] {decisao}")

    cores_janela = {
        "madrugada": "#9b59b6",
        "manha": "#f39c12",
        "tarde": "#3498db",
        "noite": "#2c3e50",
    }

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # — Boxplot velocidade por janela —
    dados_box = [df_cruz[df_cruz["janela"] == j]["velocidade"].values for j in janelas_present]

    bp = axes[0].boxplot(
        dados_box,
        patch_artist=True,
        widths=0.5,
        medianprops=dict(color="#e74c3c", linewidth=2.5),
        whiskerprops=dict(color="#555", linestyle="--"),
        capprops=dict(color="#555"),
        flierprops=dict(marker="o", markersize=2, alpha=0.3),
    )
    for patch, janela_nome in zip(bp["boxes"], janelas_present):
        patch.set_facecolor(cores_janela.get(janela_nome, "#95a5a6"))
        patch.set_alpha(0.7)

    axes[0].set_xticks(range(1, len(janelas_present) + 1))
    axes[0].set_xticklabels(janelas_present, fontsize=9)
    axes[0].set_yscale("log")
    axes[0].set_title("velocidade_views por janela_postagem\n(escala log)", fontsize=10, fontweight="bold")
    axes[0].set_ylabel("views/dia (log)")

    for i, (janela_nome, med) in enumerate(med_vel_por_janela.items()):
        axes[0].text(i + 1, med, f" {med:,.0f}", va="bottom", fontsize=7, color="#2c3e50", fontweight="bold")

    # — Scatter seo × velocidade colorido por janela, com linha de tendência —
    for janela_nome in janelas_present:
        subset = df_cruz[df_cruz["janela"] == janela_nome]
        axes[1].scatter(subset["seo"], np.log1p(subset["velocidade"]), c=cores_janela.get(janela_nome, "#95a5a6"), alpha=0.35, s=12, label=janela_nome)

        if len(subset) >= 5:
            z = np.polyfit(subset["seo"], np.log1p(subset["velocidade"]), 1)
            p_fit = np.poly1d(z)
            x_line = np.linspace(subset["seo"].min(), subset["seo"].max(), 50)
            axes[1].plot(x_line, p_fit(x_line), color=cores_janela.get(janela_nome, "#95a5a6"), linewidth=1.5, alpha=0.9)

    axes[1].set_title(f"completude_seo × velocidade_views\nSpearman geral r={r_geral:+.3f}  |  linha = tendência por janela", fontsize=10, fontweight="bold")
    axes[1].set_xlabel("completude_seo")
    axes[1].set_ylabel("log(1 + velocidade_views)")
    axes[1].legend(fontsize=8, title="janela_postagem")

    fig.suptitle("Cruzamento D — Motor de Entrega Algorítmica", fontsize=12, fontweight="bold", y=1.02)
    plt.tight_layout()
    _salvar(fig, pasta, "cruzamento_d_motor_entrega.png")
    print("       [+] cruzamento_d_motor_entrega.png salvo.")


# ─────────────────────────────────────────────────────────────
# PARTE 3 — COMPLETUDE GERAL
# ─────────────────────────────────────────────────────────────


def analisar_completude(df_nicho: pd.DataFrame, pasta: str) -> None:
    """..."""
    print("\n    ── Completude Geral (Missing Values) ──")

    todas = COLUNAS_NUMERICAS + COLUNAS_BOOLEANAS + COLUNAS_CATEGORICAS
    presentes = [c for c in todas if c in df_nicho.columns]

    if not presentes:
        print("\n       [SKIP] Nenhuma coluna nova encontrada.")
        return

    nulos_serie = df_nicho[presentes].isna().sum()
    pct_serie = (nulos_serie / len(df_nicho) * 100).round(1)

    print(f"\n       {'Coluna':30s}  {'% ausente':>10}  Status")
    print(f"       {'-' * 55}")
    for col, pct in pct_serie.items():
        status = "✅ OK" if pct == 0 else ("⚠ Atenção" if pct <= 10 else "🔴 Crítico")
        print(f"       {str(col):30s}  {pct:>9.1f}%  {status}")

    cores_bar = ["#e74c3c" if p > 10 else "#f39c12" if p > 0 else "#2ecc71" for p in pct_serie.values]

    altura = max(4, len(presentes) * 0.4 + 1.5)
    fig, ax = plt.subplots(figsize=(10, altura))

    bars = ax.barh(presentes, pct_serie.values, color=cores_bar, edgecolor="white")
    ax.set_xlabel("% de valores ausentes")
    ax.set_title(
        "Completude das Colunas Novas — Features Engineered\nVerde = 0% ausente  |  Laranja = até 10%  |  Vermelho = crítico (> 10%)",
        fontsize=10,
        fontweight="bold",
    )
    ax.axvline(10, color="#e74c3c", linestyle="--", linewidth=0.9, alpha=0.5, label="Limite 10%")
    ax.set_xlim(0, max(pct_serie.max() * 1.3, 15))
    ax.legend(fontsize=8)

    for bar, (col, pct), n_nulos in zip(bars, pct_serie.items(), nulos_serie.values):
        ax.text(
            bar.get_width() + 0.3,
            bar.get_y() + bar.get_height() / 2,
            f"{pct:.1f}%  ({n_nulos:,} linhas)",
            va="center",
            fontsize=8,
        )

    plt.tight_layout()
    _salvar(fig, pasta, "missing_colunas_novas.png")
    print("       [+] missing_colunas_novas.png salvo.")


# ─────────────────────────────────────────────────────────────
# PONTO DE ENTRADA PÚBLICO
# ─────────────────────────────────────────────────────────────


def analisar_matematica_colunas_novas(df_nicho: pd.DataFrame, pasta_img_nicho: str) -> None:
    """
    Orquestra a análise completa das colunas novas.

    Chamada por analise_colunas_novas() em 01_eda.py, com stdout já
    redirecionado para o arquivo .log do nicho.

    Parâmetros
    ----------
    df_nicho        : DataFrame filtrado para um único nicho,
                      já com as colunas do processador_features.py.
    pasta_img_nicho : Subpasta features/matematica do nicho — destino
                      de todos os gráficos gerados.
    """
    os.makedirs(pasta_img_nicho, exist_ok=True)

    # Acumula séries numéricas para os cruzamentos da Parte 2
    acumulado: dict[str, pd.Series] = {}

    # ── Parte 1-A: Numéricas ────────────────────────────────────
    print("\n  -> PARTE 1-A. COLUNAS NUMÉRICAS")
    analisar_colunas_numericas(df_nicho, pasta_img_nicho, acumulado)

    # ── Parte 1-B: Booleanas ────────────────────────────────────
    print("\n  -> PARTE 1-B. COLUNAS BOOLEANAS")
    for col in COLUNAS_BOOLEANAS:
        analisar_coluna_booleana(col, df_nicho, pasta_img_nicho)

    # ── Parte 1-C: Categóricas ──────────────────────────────────
    print("\n  -> PARTE 1-C. COLUNAS CATEGÓRICAS")
    analisar_colunas_categoricas(df_nicho, pasta_img_nicho)

    # ── Parte 2-D: Cruzamento A — Fôrma Narrativa ───────────────
    print("\n  -> PARTE 2-D. CRUZAMENTO A: FÔRMA NARRATIVA MECÂNICA")
    cruzamento_a_forma_narrativa(acumulado, df_nicho, pasta_img_nicho)

    # ── Parte 2-E: Cruzamento B — Engajamento Psicológico ───────
    print("\n  -> PARTE 2-E. CRUZAMENTO B: CATALISADOR DE ENGAJAMENTO PSICOLÓGICO")
    cruzamento_b_engajamento_psicologico(acumulado, df_nicho, pasta_img_nicho)

    # ── Parte 2-F: Cruzamento C — Embalagem vs. Retenção ────────
    print("\n  -> PARTE 2-F. CRUZAMENTO C: EMBALAGEM EXTERNA VS. RETENÇÃO INTERNA")
    cruzamento_c_embalagem_vs_retencao(acumulado, df_nicho, pasta_img_nicho)

    # ── Parte 2-G: Cruzamento D — Motor de Entrega ──────────────
    print("\n  -> PARTE 2-G. CRUZAMENTO D: MOTOR DE ENTREGA ALGORÍTMICA")
    cruzamento_d_motor_entrega_algoritmica(acumulado, df_nicho, pasta_img_nicho)

    # ── Parte 3-H: Completude ────────────────────────────────────
    print("\n  -> PARTE 3-H. COMPLETUDE (Missing Values)")
    analisar_completude(df_nicho, pasta_img_nicho)

    print("\n  [✓] Análise das colunas novas concluída.")
    print(f"      Gráficos salvos em: {pasta_img_nicho}")
