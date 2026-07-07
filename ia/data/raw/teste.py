# teste.py
import re
import textwrap
import time

import pandas as pd
from deep_translator import GoogleTranslator
from lingua import Language, LanguageDetectorBuilder

CSV = "dataset_youtube_processado_modulo2.csv"
SAIDA = "resultado_teste.md"

detector = LanguageDetectorBuilder.from_all_languages().build()

# ─── FUNÇÕES ────────────────────────────────────────────────────────────────


def detectar_dialogo(texto: str) -> bool:
    if not texto or pd.isna(texto):
        return False
    return len(re.findall(r">>", str(texto))) >= 2


def extrair_pistas_audio(texto: str) -> str:
    if not texto or pd.isna(texto):
        return ""
    matches = re.findall(r"\[.*?\]|\(.*?\)|♪", str(texto))
    return " ".join(list(dict.fromkeys(matches))) if matches else ""


def limpar_texto(texto: str) -> str:
    if not texto or pd.isna(texto):
        return ""
    t = str(texto)
    t = re.sub(r"\[.*?\]|\(.*?\)|♪", " ", t)
    t = re.sub(r">>\s*[\w\s]+:", " ", t)
    t = re.sub(r">>", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def remover_pontuacao(texto: str) -> str:
    t = re.sub(r"[^\w\s]", " ", texto)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def e_ingles(texto: str) -> bool:
    palavras = texto.split()
    nao_ingles = []
    for palavra in palavras:
        if not any(c.isalpha() for c in palavra):
            continue
        lang = detector.detect_language_of(palavra)
        if lang is not None and lang != Language.ENGLISH:
            nao_ingles.append((palavra, lang.name))
    if nao_ingles:
        print(f"    [lingua] tokens não-inglês detectados: {nao_ingles[:5]}")
        return False
    return True


def traduzir_com_garantia(texto: str, tradutor: GoogleTranslator) -> str:
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
    while True:
        resultado = _traduzir(texto)
        if not resultado:
            print(f"    [tentativa {tentativa}] retornou vazio, aguardando 10s...")
            tentativa += 1
            time.sleep(10)
            continue

        resultado_lower = resultado.lower()
        print(f"    [tentativa {tentativa}] verificando tokens...")

        if e_ingles(resultado_lower):
            print(f"    [tentativa {tentativa}] 100% inglês confirmado")
            return remover_pontuacao(resultado_lower)

        print(f"    [tentativa {tentativa}] tokens não-inglês encontrados, retraduzindo...")
        tentativa += 1
        time.sleep(5)


# ─── EXECUÇÃO ───────────────────────────────────────────────────────────────

df = pd.read_csv(CSV, usecols=["texto_falado"])
amostra = df.sample(5, random_state=42).reset_index(drop=True)

tradutor = GoogleTranslator(source="auto", target="en")
linhas_md = []

for i, row in amostra.iterrows():
    texto_falado = row["texto_falado"] if pd.notna(row["texto_falado"]) else ""

    tem_dialogo = detectar_dialogo(texto_falado)
    pistas_audio = extrair_pistas_audio(texto_falado)
    texto_falado_limpo = limpar_texto(texto_falado)

    print(f"\nVideo {i + 1}: traduzindo...")
    texto_falado_limpo_en = traduzir_com_garantia(texto_falado_limpo, tradutor)
    time.sleep(3)

    bloco = f"""# Video {i + 1}

**texto_falado:** {texto_falado}

**tem_dialogo:** {tem_dialogo}

**pistas_audio:** {pistas_audio}

**texto_falado_limpo:** {texto_falado_limpo}

**texto_falado_limpo_en:** {texto_falado_limpo_en}

---
"""
    linhas_md.append(bloco)

with open(SAIDA, "w", encoding="utf-8") as f:
    f.write("\n".join(linhas_md))

print(f"\nSalvo em {SAIDA}")
