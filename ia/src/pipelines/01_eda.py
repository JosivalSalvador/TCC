import contextlib
import os
import re

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

from src.core.supabase_client import BASE_DIR, baixar_csv_prata
from src.pipelines.utils.analisar_texto_colunas_novas import analisar_texto_colunas_novas

# Substitua pela sua importação real
from src.pipelines.utils.analisar_texto_grupo2 import analisar_texto_grupo2
from src.pipelines.utils.analise_colunas_novas import analisar_matematica_colunas_novas

# Define o caminho correto
PASTA_EDA = os.path.join(BASE_DIR, "data", "eda_relatorios")
os.makedirs(PASTA_EDA, exist_ok=True)


YOUTUBE_CATEGORY_IDS = {
    # Categorias Ativas / Atribuíveis (Aparecem no YouTube Studio)
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
    # Categorias Legadas / Backend / Não Atribuíveis pelo Usuário
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


def analisar_matematica_grupo1(df_nicho, pasta_img_nicho):
    """
    Análise completa de Data Science das colunas matemáticas (Grupo 1).

    Contexto do negócio: entender o que faz um Short ser viral por nicho.
    Métricas como views, curtidas, comentários e duração são os sinais
    primários de performance que alimentam o modelo de viralidade.

    Gera por coluna numérica:
      - Estatísticas descritivas completas (média, mediana, desvio, CV, IQR,
        skewness, curtose, outliers Tukey, zeros, negativos)
      - Histograma + KDE com média, mediana, Q1 e Q3 marcados
      - Boxplot com anotações extraídas do objeto `bp` via PathPatch e Line2D
      - Gráfico em escala log para distribuições com cauda pesada (skew > 1.5)

    Gera por coluna booleana:
      - Contagem e percentual de True/False
      - Gráfico de barras com anotações

    Gera globalmente:
      - Matriz de correlação de Spearman (heatmap triangular)
      - Painel de missing values com código de cor (verde/laranja/vermelho)

    Todos os gráficos são salvos em `pasta_img_nicho`.
    """

    COLUNAS_NUMERICAS = ["visualizacoes", "curtidas", "comentarios", "duracao_segundos"]
    COLUNAS_BOOLEANAS = ["tem_legenda_nativa", "conteudo_licenciado", "feito_para_criancas"]
    TODAS_COLUNAS = COLUNAS_NUMERICAS + COLUNAS_BOOLEANAS

    os.makedirs(pasta_img_nicho, exist_ok=True)

    # ══════════════════════════════════════════════════════════════
    # BLOCO 1 — ANÁLISE INDIVIDUAL DE CADA COLUNA
    # ══════════════════════════════════════════════════════════════
    dados_numericos_validos = {}  # acumulado para o bloco de correlação

    for col in TODAS_COLUNAS:
        if col not in df_nicho.columns:
            print(f"    - [Matemática] Coluna '{col}': NÃO ENCONTRADA neste DataFrame.")
            continue

        serie_bruta = df_nicho[col]
        total_linhas = len(serie_bruta)
        qtd_nulos = serie_bruta.isna().sum()
        pct_nulos = (qtd_nulos / total_linhas) * 100

        print(f"\n    ── Coluna: '{col.upper()}' ──")
        print(f"       Completude : {total_linhas - qtd_nulos}/{total_linhas} registros válidos ({100 - pct_nulos:.1f}% preenchido)")

        if serie_bruta.dropna().empty:
            print("       [SKIP] Sem dados válidos.")
            continue

        # ────────────────────────────────────────
        # COLUNAS BOOLEANAS
        # ────────────────────────────────────────
        if col in COLUNAS_BOOLEANAS:
            try:
                dados_bool = serie_bruta.dropna().astype(str).str.lower().map({"true": 1, "false": 0, "1": 1, "0": 0}).dropna().astype(int)
            except Exception as e:
                print(f"       [ERRO] Conversão booleana falhou: {e}")
                continue

            qtd_true = int(dados_bool.sum())
            qtd_false = len(dados_bool) - qtd_true
            pct_true = (qtd_true / len(dados_bool)) * 100

            print(f"       True  : {qtd_true}  ({pct_true:.1f}%)")
            print(f"       False : {qtd_false} ({100 - pct_true:.1f}%)")

            if col == "tem_legenda_nativa" and pct_true > 60:
                print("       [Insight] Maioria usa legenda nativa — sinal positivo para acessibilidade e alcance.")

            # Gráfico de barras booleano
            fig, ax = plt.subplots(figsize=(5, 4))
            bars = ax.bar(["True", "False"], [qtd_true, qtd_false], color=["#2ecc71", "#e74c3c"], edgecolor="white", width=0.5)
            ax.set_title(f"{col}\nDistribuição Booleana", fontsize=11, fontweight="bold")
            ax.set_ylabel("Quantidade de Vídeos")
            ax.set_ylim(0, max(qtd_true, qtd_false) * 1.25)

            for bar, valor, pct in zip(bars, [qtd_true, qtd_false], [pct_true, 100 - pct_true]):
                ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + max(qtd_true, qtd_false) * 0.02, f"{valor:,}\n({pct:.1f}%)", ha="center", va="bottom", fontsize=9, fontweight="bold")

            plt.tight_layout()
            plt.savefig(os.path.join(pasta_img_nicho, f"bool_{col}.png"), dpi=120)
            plt.close()
            print(f"       [+] Gráfico booleano salvo: bool_{col}.png")

        # ────────────────────────────────────────
        # COLUNAS NUMÉRICAS
        # ────────────────────────────────────────
        else:
            dados_num = pd.to_numeric(serie_bruta, errors="coerce").dropna()

            if dados_num.empty:
                print("       [SKIP] Nenhum valor numérico válido após conversão.")
                continue

            # Estatísticas descritivas
            media = dados_num.mean()
            mediana = dados_num.median()
            desvio = dados_num.std()
            minimo = dados_num.min()
            maximo = dados_num.max()
            p25 = dados_num.quantile(0.25)
            p75 = dados_num.quantile(0.75)
            iqr = p75 - p25
            skewness = dados_num.skew()
            curtose = dados_num.kurt()
            cv = (desvio / media * 100) if media != 0 else float("nan")

            # Outliers Tukey
            limite_inf = p25 - 1.5 * iqr
            limite_sup = p75 + 1.5 * iqr
            outliers = dados_num[(dados_num < limite_inf) | (dados_num > limite_sup)]
            pct_out = (len(outliers) / len(dados_num)) * 100

            qtd_zeros = int((dados_num == 0).sum())
            qtd_negativos = int((dados_num < 0).sum())

            print(f"       Média         : {media:>15,.2f}")
            print(f"       Mediana       : {mediana:>15,.2f}")
            print(f"       Desvio Padrão : {desvio:>15,.2f}  (CV: {cv:.1f}%)")
            print(f"       Min / Max     : {minimo:>15,.0f} / {maximo:,.0f}")
            print(f"       Q1 / Q3       : {p25:>15,.2f} / {p75:,.2f}  (IQR: {iqr:,.2f})")
            print(f"       Assimetria    : {skewness:>15.3f}  " + ("→ cauda direita (vídeos virais puxam a média)" if skewness > 0.5 else "→ cauda esquerda" if skewness < -0.5 else "→ aproximadamente simétrica"))
            print(f"       Curtose       : {curtose:>15.3f}  " + ("→ picos acentuados (outliers dominam)" if curtose > 1 else "→ distribuição achatada" if curtose < -1 else "→ próxima do normal"))
            print(f"       Outliers (IQR): {len(outliers)} registros ({pct_out:.1f}%)  fora de [{limite_inf:,.2f} ; {limite_sup:,.2f}]")

            if len(outliers) > 0:
                top3 = sorted(outliers.values, reverse=True)[:3]
                print(f"         → Top 3 maiores: {[f'{v:,.0f}' for v in top3]}")

            if qtd_zeros > 0:
                print(f"       Zeros         : {qtd_zeros} ({qtd_zeros / len(dados_num) * 100:.1f}%)")
            if qtd_negativos > 0:
                print(f"       ⚠ Negativos   : {qtd_negativos} — verificar origem!")

            # Insights contextualizados para viralidade
            if col == "visualizacoes":
                print(f"       [Insight Viral] Mediana de {mediana:,.0f} views é o benchmark do nicho. Outliers acima de {limite_sup:,.0f} são os candidatos virais reais.")
            elif col == "curtidas" and media > 0 and "visualizacoes" in dados_numericos_validos:
                taxa_eng = (media / dados_numericos_validos["visualizacoes"].mean()) * 100
                print(f"       [Insight Viral] Taxa média de engajamento estimada: {taxa_eng:.2f}% (curtidas/views).")
            elif col == "comentarios" and media > 0 and "visualizacoes" in dados_numericos_validos:
                taxa_disc = (media / dados_numericos_validos["visualizacoes"].mean()) * 100
                print(f"       [Insight Viral] Taxa média de discussão estimada: {taxa_disc:.4f}% (comentários/views).")
            elif col == "duracao_segundos":
                pct_shorts = (dados_num <= 60).sum() / len(dados_num) * 100
                print(f"       [Insight Viral] {pct_shorts:.1f}% dos vídeos têm até 60s — " + ("nicho predominantemente de Shorts." if pct_shorts > 50 else "nicho misto (Shorts + longos)."))

            dados_numericos_validos[col] = dados_num

            # ──────────────────────────────────────────
            # GRÁFICO 1: Histograma + KDE  |  Boxplot anotado
            # ──────────────────────────────────────────
            fig, axes = plt.subplots(1, 2, figsize=(13, 5))

            # — Histograma com KDE —
            sns.histplot(dados_num, bins=40, kde=True, ax=axes[0], color="#3498db", edgecolor="white", linewidth=0.3, line_kws={"linewidth": 2, "color": "#1a5276"})
            axes[0].axvline(media, color="#e74c3c", linestyle="--", linewidth=1.5, label=f"Média: {media:,.0f}")
            axes[0].axvline(mediana, color="#2ecc71", linestyle="-", linewidth=1.5, label=f"Mediana: {mediana:,.0f}")
            axes[0].axvline(p25, color="#f39c12", linestyle=":", linewidth=1.2, label=f"Q1: {p25:,.0f}")
            axes[0].axvline(p75, color="#f39c12", linestyle=":", linewidth=1.2, label=f"Q3: {p75:,.0f}")
            axes[0].set_title(f"{col} — Histograma + KDE", fontsize=10, fontweight="bold")
            axes[0].set_xlabel(col)
            axes[0].set_ylabel("Frequência")
            axes[0].legend(fontsize=8)

            # — Boxplot com anotações via objeto `bp` —
            bp = axes[1].boxplot(
                dados_num,
                vert=True,
                patch_artist=True,  # boxes viram PathPatch — extrair via .get_path().vertices
                widths=0.5,
                boxprops=dict(facecolor="#aed6f1", color="#2980b9", linewidth=1.5),
                medianprops=dict(color="#e74c3c", linewidth=2.5),
                whiskerprops=dict(color="#555555", linewidth=1.2, linestyle="--"),
                capprops=dict(color="#555555", linewidth=2),
                flierprops=dict(marker="o", markerfacecolor="#e74c3c", markeredgecolor="#c0392b", markersize=3, alpha=0.4),
            )

            # Com patch_artist=True a caixa é PathPatch, não Line2D.
            # Os vértices do polígono seguem a ordem:
            #   [0] canto inferior-esquerdo (y = Q1)
            #   [1] canto superior-esquerdo (y = Q3)
            #   [2] canto superior-direito  (y = Q3)
            #   [3] canto inferior-direito  (y = Q1)
            vertices = bp["boxes"][0].get_path().vertices
            val_box_q1 = float(vertices[0][1])  # Q1
            val_box_q3 = float(vertices[1][1])  # Q3

            # whiskers, caps e medianas são sempre Line2D
            val_mediana = float(bp["medians"][0].get_ydata()[0])
            val_cap_lo = float(bp["caps"][0].get_ydata()[0])
            val_cap_hi = float(bp["caps"][1].get_ydata()[0])

            offset_x = 1.35

            anotacoes = [
                (val_cap_hi, f"Máx whisker\n{val_cap_hi:,.0f}", "#555555"),
                (val_box_q3, f"Q3: {val_box_q3:,.0f}", "#2980b9"),
                (val_mediana, f"Mediana: {val_mediana:,.0f}", "#e74c3c"),
                (val_box_q1, f"Q1: {val_box_q1:,.0f}", "#2980b9"),
                (val_cap_lo, f"Mín whisker\n{val_cap_lo:,.0f}", "#555555"),
            ]

            for y_pos, texto, cor in anotacoes:
                axes[1].annotate(texto, xy=(1, y_pos), xytext=(offset_x, y_pos), fontsize=7.5, color=cor, fontweight="bold", va="center", arrowprops=dict(arrowstyle="-", color=cor, lw=0.8, connectionstyle="arc3,rad=0.0"))

            if len(outliers) > 0:
                axes[1].text(1.02, 0.97, f"{len(outliers)} outliers\n({pct_out:.1f}%)", transform=axes[1].transAxes, fontsize=8, color="#e74c3c", va="top", ha="left", bbox=dict(boxstyle="round,pad=0.3", facecolor="#fdecea", edgecolor="#e74c3c", alpha=0.8))

            axes[1].set_title(f"{col} — Boxplot Anotado", fontsize=10, fontweight="bold")
            axes[1].set_ylabel(col)
            axes[1].set_xticks([])
            axes[1].set_xlim(0.5, 2.1)

            fig.suptitle(f"Análise de Distribuição  ·  {col.upper()}  ·  n={len(dados_num):,}", fontsize=12, fontweight="bold", y=1.02)
            plt.tight_layout()
            plt.savefig(os.path.join(pasta_img_nicho, f"dist_{col}.png"), dpi=130, bbox_inches="tight")
            plt.close()
            print(f"       [+] Histograma + Boxplot anotado salvo: dist_{col}.png")

            # ──────────────────────────────────────────
            # GRÁFICO 2: Escala Logarítmica
            # Obrigatório para views/curtidas — a viralidade vive na cauda direita.
            # Só gerado quando skewness > 1.5, evitando log em distribuições simétricas.
            # ──────────────────────────────────────────
            dados_positivos = dados_num[dados_num > 0]
            if skewness > 1.5 and len(dados_positivos) > 10:
                log_data = np.log1p(dados_positivos)
                log_media = log_data.mean()
                log_mediana = log_data.median()

                fig, ax = plt.subplots(figsize=(8, 4))
                sns.histplot(log_data, bins=40, kde=True, ax=ax, color="#9b59b6", edgecolor="white", linewidth=0.3, line_kws={"linewidth": 2, "color": "#6c3483"})
                ax.axvline(log_media, color="#e74c3c", linestyle="--", linewidth=1.5, label=f"Média log: {log_media:.2f}  (≈ {np.expm1(log_media):,.0f})")
                ax.axvline(log_mediana, color="#2ecc71", linestyle="-", linewidth=1.5, label=f"Mediana log: {log_mediana:.2f}  (≈ {np.expm1(log_mediana):,.0f})")
                ax.set_title(f"{col} — Distribuição em Escala Log\n(Assimetria original: {skewness:.2f} → vídeos virais vivem na cauda direita)", fontsize=10, fontweight="bold")
                ax.set_xlabel(f"log(1 + {col})")
                ax.set_ylabel("Frequência")
                ax.legend(fontsize=8)
                plt.tight_layout()
                plt.savefig(os.path.join(pasta_img_nicho, f"log_{col}.png"), dpi=130)
                plt.close()
                print(f"       [+] Escala log salva: log_{col}.png  (skew={skewness:.2f} — cauda pesada confirmada)")

    # ══════════════════════════════════════════════════════════════
    # BLOCO 2 — MATRIZ DE CORRELAÇÃO DE SPEARMAN
    # Spearman é obrigatório aqui: Pearson seria destruído pelos outliers virais.
    # ══════════════════════════════════════════════════════════════
    if len(dados_numericos_validos) >= 2:
        print("\n    ── CORRELAÇÕES (Spearman) ──")

        df_corr = pd.DataFrame(dados_numericos_validos)
        matriz_corr = df_corr.corr(method="spearman")

        pares = []
        pares_vistos = set()
        for col_a in matriz_corr.columns:
            for col_b in matriz_corr.columns:
                if col_a == col_b:
                    continue
                par = tuple(sorted([col_a, col_b]))
                if par in pares_vistos:
                    continue
                pares_vistos.add(par)
                r = matriz_corr.loc[col_a, col_b]
                pares.append((abs(r), col_a, col_b, r))

        for _, col_a, col_b, r in sorted(pares, reverse=True):
            forca = "🔴 Forte" if abs(r) >= 0.7 else "🟡 Moderada" if abs(r) >= 0.4 else "⚪ Fraca"
            direcao = "↑ positiva" if r > 0 else "↓ negativa"
            print(f"       {col_a:20s} ↔ {col_b:20s} : r={r:+.3f}  {forca}  ({direcao})")

        # Heatmap com triângulo inferior visível
        mask = np.zeros_like(matriz_corr, dtype=bool)
        mask[np.triu_indices_from(mask, k=1)] = True

        fig, ax = plt.subplots(figsize=(7, 5))
        sns.heatmap(matriz_corr, annot=True, fmt=".2f", cmap="coolwarm", center=0, vmin=-1, vmax=1, linewidths=0.6, linecolor="white", mask=mask, ax=ax, annot_kws={"size": 10, "weight": "bold"})
        ax.set_title("Matriz de Correlação de Spearman\nColunas Numéricas — Grupo 1", fontsize=11, fontweight="bold")
        plt.tight_layout()
        plt.savefig(os.path.join(pasta_img_nicho, "correlacao_grupo1.png"), dpi=130)
        plt.close()
        print("       [+] Heatmap de correlação salvo: correlacao_grupo1.png")

    # ══════════════════════════════════════════════════════════════
    # BLOCO 3 — PAINEL DE COMPLETUDE (Missing Values)
    # ══════════════════════════════════════════════════════════════
    colunas_presentes = [c for c in TODAS_COLUNAS if c in df_nicho.columns]
    if colunas_presentes:
        print("\n    ── COMPLETUDE GERAL (Grupo 1) ──")

        nulos_serie = df_nicho[colunas_presentes].isna().sum()
        pct_serie = (nulos_serie / len(df_nicho) * 100).round(1)

        for col, pct in pct_serie.items():
            status = "✅ OK" if pct == 0 else ("⚠ Atenção" if pct <= 10 else "🔴 Crítico")
            print(f"       {col:30s}: {pct:5.1f}% ausente  {status}")

        cores_bar = ["#e74c3c" if p > 10 else "#f39c12" if p > 0 else "#2ecc71" for p in pct_serie.values]

        fig, ax = plt.subplots(figsize=(9, 4))
        bars = ax.barh(colunas_presentes, pct_serie.values, color=cores_bar, edgecolor="white")
        ax.set_xlabel("% de valores ausentes")
        ax.set_title("Completude das Colunas Matemáticas — Grupo 1\nVerde = 0% ausente  |  Laranja = até 10%  |  Vermelho = crítico (> 10%)", fontsize=10, fontweight="bold")
        ax.axvline(10, color="#e74c3c", linestyle="--", linewidth=0.9, alpha=0.5, label="Limite 10%")
        ax.set_xlim(0, max(pct_serie.max() * 1.3, 15))
        ax.legend(fontsize=8)

        for bar, (pct, n) in zip(bars, zip(pct_serie.values, nulos_serie.values)):
            ax.text(bar.get_width() + 0.3, bar.get_y() + bar.get_height() / 2, f"{pct:.1f}%  ({n:,} linhas)", va="center", fontsize=8)

        plt.tight_layout()
        plt.savefig(os.path.join(pasta_img_nicho, "missing_grupo1.png"), dpi=130)
        plt.close()
        print("       [+] Painel de completude salvo: missing_grupo1.png")


def analise_matematica_colunas_originais():
    """
    Função principal que faz a análise de contexto (Grupo 3).
    Imprime dados detalhados no terminal, usa gráficos de barras padronizados
    (sem pizza), exibe o Top 10 para canais e resolve erros de timezone e caracteres.
    """
    df = baixar_csv_prata()

    if df is None or df.empty:
        print("Erro: O DataFrame está vazio ou não foi carregado corretamente.")
        return

    col_nicho = next((col for col in df.columns if col.lower() == "nicho"), None)
    if not col_nicho:
        print("Erro: A coluna 'nicho' não foi encontrada.")
        return

    lista_nichos = df[col_nicho].dropna().unique()

    print("\n" + "=" * 60)
    print(f"INICIANDO ANÁLISE NA TELA (Total de nichos a analisar: {len(lista_nichos)})")
    print("=" * 60)

    def tratar_label_grafico(texto, limite=35):
        texto_str = str(texto)
        texto_limpo = re.sub(r"[^\x00-\x7F\u00C0-\u00FF]", "", texto_str).strip()
        if not texto_limpo:
            return "Caracteres Especiais"
        if len(texto_limpo) > limite:
            return texto_limpo[:limite] + "..."
        return texto_limpo

    for nicho in lista_nichos:
        df_nicho = df[df[col_nicho] == nicho].copy()
        nicho_limpo = str(nicho).replace(" ", "_").replace("/", "_").lower()

        # ── Pasta raiz do nicho (só para os logs) ──────────────────
        pasta_raiz = os.path.join(PASTA_EDA, nicho_limpo)
        os.makedirs(pasta_raiz, exist_ok=True)

        # ── Subpastas organizadas por tipo ─────────────────────────
        pasta_orig_mat = os.path.join(pasta_raiz, "colunas_originais", "matematica")
        pasta_orig_txt = os.path.join(pasta_raiz, "colunas_originais", "texto")
        os.makedirs(pasta_orig_mat, exist_ok=True)
        os.makedirs(pasta_orig_txt, exist_ok=True)

        log_path = os.path.join(pasta_raiz, f"{nicho_limpo}.log")

        print(f"  -> Processando nicho: [{str(nicho).upper()}] — log em: {log_path}")

        with open(log_path, "w", encoding="utf-8") as log_file:
            with contextlib.redirect_stdout(log_file):
                print(f"\n[{str(nicho).upper()}] {'-' * 40}")
                print(f"Total de vídeos neste nicho: {len(df_nicho)}\n")

                print("  -> 1. ANÁLISE DE CONTEXTO")

                if "video_id" in df_nicho.columns:
                    print(f"    - 'video_id': {df_nicho['video_id'].nunique()} vídeos únicos.")
                if "canal_id" in df_nicho.columns:
                    print(f"    - 'canal_id': {df_nicho['canal_id'].nunique()} canais distintos.")

                if "canal_nome" in df_nicho.columns:
                    dist_canais = df_nicho["canal_nome"].value_counts()
                    top10_canais = dist_canais.head(10)

                    print("\n    - 'canal_nome' (Top 5 Canais Mais Frequentes):")
                    for canal, qtd in dist_canais.head(5).items():
                        print(f"        * {canal}: {qtd} vídeos")

                    labels_canais = [tratar_label_grafico(c) for c in top10_canais.index]

                    plt.figure(figsize=(10, max(4, len(top10_canais) * 0.5)))
                    sns.barplot(x=top10_canais.values, y=labels_canais, hue=labels_canais, palette="Blues_r", legend=False)
                    plt.title(f"Top 10 Canais - {str(nicho).upper()}")
                    plt.xlabel("Quantidade de Vídeos")
                    plt.tight_layout()
                    plt.savefig(os.path.join(pasta_orig_mat, "canais.png"))
                    plt.close()

                if "data_publicacao" in df_nicho.columns:
                    datas = pd.to_datetime(df_nicho["data_publicacao"], errors="coerce").dropna()
                    if not datas.empty:
                        print("\n    - 'data_publicacao':")
                        print(f"        * Período analisado: de {datas.min().date()} a {datas.max().date()}")

                        datas_sem_tz = datas.dt.tz_localize(None)
                        meses = datas_sem_tz.dt.to_period("M")

                        top_mes = meses.value_counts().head(1)
                        if not top_mes.empty:
                            print(f"        * Mês com mais publicações: {top_mes.index[0]} ({top_mes.values[0]} vídeos)")

                if "categoria_id" in df_nicho.columns:
                    df_nicho["categoria_nome"] = df_nicho["categoria_id"].astype(str).map(YOUTUBE_CATEGORY_IDS).fillna("Desconhecida")
                    dist_cat = df_nicho["categoria_nome"].value_counts()

                    print("\n    - 'categoria_id' (Distribuição):")
                    for cat, qtd in dist_cat.head(5).items():
                        print(f"        * {cat}: {qtd} vídeos")

                    labels_cat = [tratar_label_grafico(c) for c in dist_cat.index]

                    plt.figure(figsize=(10, max(4, len(dist_cat) * 0.5)))
                    sns.barplot(x=dist_cat.values, y=labels_cat, hue=labels_cat, palette="viridis", legend=False)
                    plt.title(f"Categorias - {str(nicho).upper()}")
                    plt.xlabel("Quantidade de Vídeos")
                    plt.tight_layout()
                    plt.savefig(os.path.join(pasta_orig_mat, "categorias.png"))
                    plt.close()

                if "idioma_audio_default" in df_nicho.columns:
                    dist_audio = df_nicho["idioma_audio_default"].value_counts()
                    print("\n    - 'idioma_audio_default' (Idiomas Principais):")
                    for idioma, qtd in dist_audio.head(3).items():
                        print(f"        * {idioma}: {qtd} vídeos")

                    labels_audio = [tratar_label_grafico(c, limite=20) for c in dist_audio.index]

                    plt.figure(figsize=(8, max(4, len(dist_audio) * 0.4)))
                    sns.barplot(x=dist_audio.values, y=labels_audio, hue=labels_audio, palette="magma", legend=False)
                    plt.title(f"Idiomas de Áudio - {str(nicho).upper()}")
                    plt.xlabel("Quantidade de Vídeos")
                    plt.tight_layout()
                    plt.savefig(os.path.join(pasta_orig_mat, "idioma_audio.png"))
                    plt.close()

                if "idioma_texto_default" in df_nicho.columns:
                    dist_texto = df_nicho["idioma_texto_default"].value_counts()
                    print("\n    - 'idioma_texto_default' (Idiomas Principais):")
                    for idioma, qtd in dist_texto.head(3).items():
                        print(f"        * {idioma}: {qtd} vídeos")

                    labels_texto = [tratar_label_grafico(c, limite=20) for c in dist_texto.index]

                    plt.figure(figsize=(8, max(4, len(dist_texto) * 0.4)))
                    sns.barplot(x=dist_texto.values, y=labels_texto, hue=labels_texto, palette="rocket", legend=False)
                    plt.title(f"Idiomas de Texto - {str(nicho).upper()}")
                    plt.xlabel("Quantidade de Vídeos")
                    plt.tight_layout()
                    plt.savefig(os.path.join(pasta_orig_mat, "idioma_texto.png"))
                    plt.close()

                print(f"\n      [+] Gráficos de contexto salvos em: '{pasta_orig_mat}'")

                print("\n  -> 2. ANÁLISE MATEMÁTICA")
                analisar_matematica_grupo1(df_nicho, pasta_orig_mat)

                print("\n  -> 3. ANÁLISE DE TEXTO")
                analisar_texto_grupo2(df_nicho, pasta_orig_txt, nicho_limpo)

                print("-" * 50)

        print(f"  -> [{str(nicho).upper()}] concluído.")

    print("\n>>> Análise concluída de forma limpa e organizada!")


def analise_colunas_novas():
    """
    Ponto de entrada da análise das colunas de features engineered.

    Para cada nicho:
        1. Cria subpastas em data/eda_relatorios/{nicho}/features/matematica e /texto
        2. Redireciona stdout para {nicho}_features.log (na raiz do nicho)
        3. Chama analisar_matematica_colunas_novas() → features/matematica
        4. Chama analisar_texto_colunas_novas()      → features/texto
    """
    df = baixar_csv_prata()

    if df is None or df.empty:
        print("Erro: O DataFrame está vazio ou não foi carregado corretamente.")
        return

    col_nicho = next((col for col in df.columns if col.lower() == "nicho"), None)
    if not col_nicho:
        print("Erro: A coluna 'nicho' não foi encontrada.")
        return

    lista_nichos = df[col_nicho].dropna().unique()

    print("\n" + "=" * 60)
    print(f"INICIANDO ANÁLISE DE COLUNAS NOVAS (Total de nichos: {len(lista_nichos)})")
    print("=" * 60)

    for nicho in lista_nichos:
        df_nicho = df[df[col_nicho] == nicho].copy()
        nicho_limpo = str(nicho).replace(" ", "_").replace("/", "_").lower()

        # ── Pasta raiz do nicho (só para os logs) ──────────────────
        pasta_raiz = os.path.join(PASTA_EDA, nicho_limpo)
        os.makedirs(pasta_raiz, exist_ok=True)

        # ── Subpastas organizadas por tipo ─────────────────────────
        pasta_feat_mat = os.path.join(pasta_raiz, "features", "matematica")
        pasta_feat_txt = os.path.join(pasta_raiz, "features", "texto")
        os.makedirs(pasta_feat_mat, exist_ok=True)
        os.makedirs(pasta_feat_txt, exist_ok=True)

        log_path = os.path.join(pasta_raiz, f"{nicho_limpo}_features.log")

        print(f"  -> Processando nicho: [{str(nicho).upper()}] — log em: {log_path}")

        with open(log_path, "w", encoding="utf-8") as log_file:
            with contextlib.redirect_stdout(log_file):
                print(f"\n[{str(nicho).upper()}] {'-' * 40}")
                print(f"Total de vídeos neste nicho: {len(df_nicho)}\n")

                print("  -> 1. ANÁLISE MATEMÁTICA (colunas novas)")
                analisar_matematica_colunas_novas(df_nicho, pasta_feat_mat)

                print("\n  -> 2. ANÁLISE DE TEXTO (colunas novas)")
                analisar_texto_colunas_novas(df_nicho, pasta_feat_txt, nicho_limpo)

                print("-" * 50)

        print(f"  -> [{str(nicho).upper()}] concluído.")

    print("\n>>> Análise de colunas novas concluída!")


if __name__ == "__main__":
    analise_matematica_colunas_originais()
    analise_colunas_novas()
