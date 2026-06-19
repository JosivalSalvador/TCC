import json
import os
from typing import Optional

import requests

# ── Configuração do provider ─────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 1 — MONTAGEM DO PROMPT
# ════════════════════════════════════════════════════════════════════════════


def _montar_prompt(padroes: dict, audience_country: Optional[str]) -> str:
    """
    Transforma o JSON de padrões extraídos pelo ML em um prompt
    estruturado e diretivo para a LLM.

    A LLM recebe apenas o que é necessário — sem ruído, sem campos
    técnicos internos (n_videos, n_super, n_frio).
    Cada seção do prompt ancora a LLM em dados reais para evitar alucinação.
    """
    nicho = padroes.get("nicho", "desconhecido")
    estrutura = padroes.get("estrutura", {})
    textuais = padroes.get("textuais", {})
    thumbnail = padroes.get("thumbnail", {})

    # ── Contexto de público-alvo ─────────────────────────────────────────────
    contexto_publico = f"O conteúdo deve ser adaptado para o público de **{audience_country}** — use referências culturais, tom e vocabulário adequados para esse país." if audience_country else "Mantenha um tom neutro e universalmente acessível."

    # ── Slots de postagem formatados ─────────────────────────────────────────
    slots = estrutura.get("top3_slots_postagem", [])
    slots_fmt = "\n".join([f"  - {s['dia']} na janela {s['janela']}" for s in slots]) if slots else "  - Dados insuficientes"

    # ── Arco emocional formatado ─────────────────────────────────────────────
    arco = textuais.get("arco_emocional", {})
    arco_fmt = f"início {arco.get('inicio', '?')} → meio {arco.get('meio', '?')} → fim {arco.get('fim', '?')}" if arco else "não disponível"

    # ── Regra de repetição ───────────────────────────────────────────────────
    repeticao_instrucao = "IMPORTANTE: vídeos virais deste nicho usam repetição intencional de frases-chave (técnica dos 5x). Inclua a ideia central pelo menos 2 vezes no roteiro." if estrutura.get("ativar_repeticao_5x") else ""

    prompt = f"""Você é um especialista em criação de conteúdo viral para YouTube Shorts.
Com base nos padrões reais extraídos dos vídeos mais virais do nicho **{nicho}**, gere a estrutura completa e o roteiro sugerido para um novo vídeo.

{contexto_publico}

---

## PADRÕES DOS VÍDEOS MAIS VIRAIS DO NICHO (extraídos por ML — use como âncora)

### Formato
- Duração alvo: {estrutura.get("faixa_duracao_dominante", "não disponível")}
- Duração a evitar: {estrutura.get("faixa_duracao_evitar", "não disponível")}
- Estrutura de blocos: {estrutura.get("estrutura_blocos_dominante", "não disponível")}
- Ritmo de fala: {estrutura.get("ritmo_palavras_seg_mediana", "?")} palavras/segundo
- Máximo de palavras no roteiro: {estrutura.get("densidade_roteiro_mediana", "?")}
- Sentimento dominante: {estrutura.get("sentimento_dominante", "não disponível")}
- Sentimento a evitar: {estrutura.get("sentimento_evitar", "não disponível")}
- Tipo de áudio dominante: {estrutura.get("tipo_audio_dominante", "não disponível")}
- Clickbait score alvo (0 a 1): {estrutura.get("clickbait_score_mediana", "?")}

### Melhores horários para postar
{slots_fmt}

### Texto e Roteiro
- Termos de gancho a usar: {", ".join(textuais.get("termos_gancho_usar", [])) or "não disponível"}
- Termos de gancho a evitar: {", ".join(textuais.get("termos_gancho_evitar", [])) or "nenhum"}
- Vocabulário dominante do nicho: {", ".join(textuais.get("termos_vocabulario", [])) or "não disponível"}
- N-gramas do roteiro: {", ".join(textuais.get("ngramas_roteiro", [])) or "não disponível"}
- Termos do roteiro a evitar: {", ".join(textuais.get("termos_roteiro_evitar", [])) or "nenhum"}
- Arco emocional: {arco_fmt}
- SEO — palavras-chave a usar: {", ".join(textuais.get("termos_seo_usar", [])) or "não disponível"}

### Exemplos reais de ganchos virais (inspire-se, não copie)
{chr(10).join(["  - " + g for g in textuais.get("exemplos_ganchos", [])]) or "  - Não disponível"}

### Exemplos reais de títulos virais (inspire-se, não copie)
{chr(10).join(["  - " + t for t in textuais.get("exemplos_titulos", [])]) or "  - Não disponível"}

### Thumbnail
- Comprimento alvo do texto na capa: {thumbnail.get("comprimento_alvo_chars", "?")} caracteres
- Termos a usar na thumbnail: {", ".join(thumbnail.get("termos_thumbnail_usar", [])) or "não disponível"}
- Termos a evitar na thumbnail: {", ".join(thumbnail.get("termos_thumbnail_evitar", [])) or "nenhum"}
- Cenas visuais dominantes: {", ".join(thumbnail.get("cenas_visuais_dominantes", [])) or "não disponível"}

### Exemplos reais de texto em thumbnails virais
{chr(10).join(["  - " + t for t in thumbnail.get("exemplos_texto_thumbnail", [])]) or "  - Não disponível"}

### Exemplos reais de cenas visuais virais
{chr(10).join(["  - " + c for c in thumbnail.get("exemplos_cena_visual", [])]) or "  - Não disponível"}

{repeticao_instrucao}

---

## TAREFA

Gere exatamente um JSON com dois campos: `structure_content` e `script_content`.

**`structure_content`** deve conter:
- `titulo`: título do vídeo (curto, impactante, baseado nos exemplos reais)
- `descricao`: descrição para o YouTube (2-3 linhas, com as palavras-chave de SEO)
- `hashtags`: lista de 5 a 8 hashtags relevantes
- `emojis`: lista de 3 a 5 emojis que combinam com o nicho e sentimento
- `horario_postagem`: objeto com `dia` e `janela` (baseado nos top slots reais)
- `duracao_alvo`: string com a faixa de duração recomendada
- `estrutura_blocos`: string com o formato de blocos recomendado
- `thumbnail`: objeto com `texto` (respeitando o comprimento alvo) e `cena_visual` (descrição da cena)

**`script_content`** deve conter:
- `gancho`: texto do gancho (primeiros segundos — use os termos de gancho reais)
- `meio`: desenvolvimento do conteúdo (respeite o arco emocional e o vocabulário do nicho)
- `cta`: chamada para ação final
- `total_palavras_estimado`: número inteiro estimado de palavras (deve respeitar o máximo indicado)

Responda APENAS com o JSON puro, sem explicações, sem markdown, sem blocos de código.
"""

    return prompt


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 2 — CHAMADA AO PROVIDER
# ════════════════════════════════════════════════════════════════════════════


def _chamar_groq(prompt: str) -> str:
    """
    Envia o prompt para a API do Groq e retorna o texto da resposta.
    Lança exceção em caso de falha na chamada ou resposta inválida.
    """
    if not GROQ_API_KEY:
        raise EnvironmentError("GROQ_API_KEY não definida nas variáveis de ambiente.")

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {
                "role": "system",
                "content": ("Você é um especialista em conteúdo viral para YouTube Shorts. Responda sempre e somente com JSON puro e válido, sem qualquer texto adicional."),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "temperature": 0.7,
        "max_tokens": 2048,
    }

    resposta = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
    resposta.raise_for_status()

    conteudo = resposta.json()["choices"][0]["message"]["content"].strip()

    return conteudo


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 3 — PARSE E VALIDAÇÃO
# ════════════════════════════════════════════════════════════════════════════


def _parsear_resposta(texto: str) -> dict:
    """
    Faz o parse do JSON retornado pela LLM.
    Remove possíveis blocos de markdown residuais antes de parsear.
    Valida que os dois campos obrigatórios estão presentes.
    """
    # Remove blocos de código markdown residuais caso a LLM desobedeça
    texto_limpo = texto.strip()
    if texto_limpo.startswith("```"):
        linhas = texto_limpo.split("\n")
        texto_limpo = "\n".join(linhas[1:-1] if linhas[-1].strip() == "```" else linhas[1:])

    try:
        dados = json.loads(texto_limpo)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM retornou JSON inválido: {e}\nResposta bruta: {texto[:300]}")

    if "structure_content" not in dados:
        raise ValueError("Campo 'structure_content' ausente na resposta da LLM.")
    if "script_content" not in dados:
        raise ValueError("Campo 'script_content' ausente na resposta da LLM.")

    return dados


# ════════════════════════════════════════════════════════════════════════════
# PONTO DE ENTRADA
# ════════════════════════════════════════════════════════════════════════════


def gerar_conteudo(padroes: dict, audience_country: Optional[str] = None) -> dict:
    """
    Ponto de entrada do llm.py.
    Recebe os padrões mastigados pelo ML e o público-alvo opcional,
    e retorna structure_content + script_content gerados pela LLM.

    Fluxo:
    1. Monta o prompt ancorado nos padrões reais
    2. Chama o Groq (Llama 3.1 70B)
    3. Parseia e valida o JSON retornado
    4. Retorna os dois dicts para o rotas.py montar o NichoResponse
    """
    print(f" [llm] Gerando conteúdo para nicho: {padroes.get('nicho', '?')}")
    if audience_country:
        print(f"   audience_country: {audience_country}")

    prompt = _montar_prompt(padroes, audience_country)
    resposta_bruta = _chamar_groq(prompt)
    resultado = _parsear_resposta(resposta_bruta)

    print(" [llm] Conteúdo gerado com sucesso.")

    return {
        "structure_content": resultado["structure_content"],
        "script_content": resultado["script_content"],
    }
