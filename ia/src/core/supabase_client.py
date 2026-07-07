import os

import pandas as pd
from supabase import Client, create_client

from src.core.config import SUPABASE_KEY, SUPABASE_URL

# Inicializa o cliente do Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- CONSTANTES DE ARQUIVOS E BUCKETS ---
NOME_DO_BUCKET = "csv-mestre"
ARQUIVO_PRATA_SUPABASE = "dataset_youtube_processado_modulo2.csv"
ARQUIVO_OURO_SUPABASE = "dataset_youtube_ml_features.csv"

# --- RESOLUÇÃO DE CAMINHOS DINÂMICOS (MONOREPO) ---
# Sobe 3 níveis a partir deste arquivo: src/core/supabase_client.py -> src/core -> src -> ia
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PASTA_RAW = os.path.join(BASE_DIR, "data", "raw")
PASTA_PROCESSED = os.path.join(BASE_DIR, "data", "processed")

CAMINHO_PRATA_LOCAL = os.path.join(PASTA_RAW, ARQUIVO_PRATA_SUPABASE)
CAMINHO_OURO_LOCAL = os.path.join(PASTA_PROCESSED, ARQUIVO_OURO_SUPABASE)


def garantir_pastas():
    """Garante que a estrutura data/raw e data/processed exista fisicamente no disco."""
    os.makedirs(PASTA_RAW, exist_ok=True)
    os.makedirs(PASTA_PROCESSED, exist_ok=True)


def baixar_csv_prata() -> pd.DataFrame:
    """
    Carrega o CSV localmente se já existir em data/raw/.
    Caso contrário, faz o download do Supabase.
    """
    garantir_pastas()

    # Verifica se o arquivo já existe no caminho local
    if os.path.exists(CAMINHO_PRATA_LOCAL):
        print(f"[Core/IA] Arquivo '{CAMINHO_PRATA_LOCAL}' encontrado localmente. Carregando...")
        try:
            df_prata = pd.read_csv(CAMINHO_PRATA_LOCAL)
            print(f"[Core/IA] CSV Prata carregado do disco ({len(df_prata)} linhas prontas para ML).")
            return df_prata
        except Exception as e:
            print(f"[Core/IA] Erro ao ler arquivo local: {e}. Tentando baixar novamente...")

    # Se não existir localmente, busca no Supabase
    print(f"\n[Core/IA] Baixando '{ARQUIVO_PRATA_SUPABASE}' do Supabase para data/raw/...")
    try:
        resposta_bytes = supabase.storage.from_(NOME_DO_BUCKET).download(ARQUIVO_PRATA_SUPABASE)

        with open(CAMINHO_PRATA_LOCAL, "wb") as f:
            f.write(resposta_bytes)

        df_prata = pd.read_csv(CAMINHO_PRATA_LOCAL)
        print(f"[Core/IA] CSV Prata baixado e carregado! ({len(df_prata)} linhas prontas para ML).")
        return df_prata

    except Exception as e:
        print(f"[Core/IA] Erro ao baixar o CSV Prata: {e}")
        return pd.DataFrame()


def subir_csv_ouro(df_ouro: pd.DataFrame):
    """
    Salva o CSV Ouro (Features de ML) em data/processed/ e faz o upload pro Supabase.
    """
    garantir_pastas()
    print(f"\n[Core/IA] Salvando arquivo Ouro e subindo para o Supabase ({len(df_ouro)} linhas)...")
    try:
        # 1. Atualiza o arquivo físico na pasta processed
        df_ouro.to_csv(CAMINHO_OURO_LOCAL, index=False)

        # 2. Sobe pro Supabase
        with open(CAMINHO_OURO_LOCAL, "rb") as f:
            supabase.storage.from_(NOME_DO_BUCKET).upload(file=f, path=ARQUIVO_OURO_SUPABASE, file_options={"content-type": "text/csv", "x-upsert": "true"})
        print("[Core/IA] ✓ Upload concluído! Base de ML segura no banco.")
    except Exception as e:
        print(f"[Core/IA] Erro ao subir o CSV Ouro: {e}")


def baixar_csv_ouro() -> pd.DataFrame:
    """
    Carrega o CSV ouro localmente se já existir em data/processed/.
    Caso contrário, faz o download do Supabase.
    """
    garantir_pastas()

    if os.path.exists(CAMINHO_OURO_LOCAL):
        print(f"[Core/IA] Arquivo '{CAMINHO_OURO_LOCAL}' encontrado localmente. Carregando...")
        try:
            df_ouro = pd.read_csv(CAMINHO_OURO_LOCAL)
            print(f"[Core/IA] CSV Ouro carregado do disco ({len(df_ouro)} linhas prontas para treino).")
            return df_ouro
        except Exception as e:
            print(f"[Core/IA] Erro ao ler arquivo local: {e}. Tentando baixar novamente...")

    print(f"\n[Core/IA] Baixando '{ARQUIVO_OURO_SUPABASE}' do Supabase para data/processed/...")
    try:
        resposta_bytes = supabase.storage.from_(NOME_DO_BUCKET).download(ARQUIVO_OURO_SUPABASE)

        with open(CAMINHO_OURO_LOCAL, "wb") as f:
            f.write(resposta_bytes)

        df_ouro = pd.read_csv(CAMINHO_OURO_LOCAL)
        print(f"[Core/IA] CSV Ouro baixado e carregado! ({len(df_ouro)} linhas prontas para treino).")
        return df_ouro

    except Exception as e:
        print(f"[Core/IA] Erro ao baixar o CSV Ouro: {e}")
        return pd.DataFrame()


def limpar_rastro_local():
    """
    Deleta os arquivos CSV das pastas raw e processed para economizar disco.
    """
    print("\n[Core/IA] Iniciando varredura de arquivos locais...")

    if os.path.exists(CAMINHO_PRATA_LOCAL):
        os.remove(CAMINHO_PRATA_LOCAL)
        print(f"  Limpeza: '{ARQUIVO_PRATA_SUPABASE}' apagado de data/raw/.")
    else:
        print("  Limpeza: Nenhum arquivo Prata encontrado para apagar.")

    if os.path.exists(CAMINHO_OURO_LOCAL):
        os.remove(CAMINHO_OURO_LOCAL)
        print(f"  Limpeza: '{ARQUIVO_OURO_SUPABASE}' apagado de data/processed/.")
    else:
        print("  Limpeza: Nenhum arquivo Ouro encontrado para apagar.")


if __name__ == "__main__":
    print("--- Testando módulo supabase_client.py (Serviço IA) ---")

    # Testa baixar e ler
    df_teste = baixar_csv_prata()
    if not df_teste.empty:
        print(f"\nColunas detectadas: {df_teste.columns.tolist()[:5]}...")

    # Descomente a linha abaixo se quiser testar a vassoura rodando o arquivo direto
    # limpar_rastro_local()
