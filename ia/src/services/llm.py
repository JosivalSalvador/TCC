import json
import os
from typing import Optional

from google import genai
from google.genai import types

# ── Configuração do provider ─────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.5-flash"

# ── Idioma padrão quando audience_country não é informado ───────────────────
IDIOMA_PADRAO = "português brasileiro"


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 1 — MONTAGEM DO PROMPT
# ════════════════════════════════════════════════════════════════════════════


def _montar_prompt(padroes: dict, audience_country: Optional[str], structure_parcial: dict) -> str:
    nicho = padroes.get("nicho", "desconhecido")
    estrutura = padroes.get("estrutura", {})
    textuais = padroes.get("textuais", {})
    thumbnail = padroes.get("thumbnail", {})

    # ──────────────────────────────────────────────────────────────────────
    # BLOCO 1 — CONTEXTO FIXO
    # ──────────────────────────────────────────────────────────────────────

    bloco_1 = """Você é um especialista em criação de conteúdo viral para YouTube Shorts.

## IDIOMA
Todo o conteúdo gerado DEVE estar em português brasileiro.
Isso é fixo e não muda independente de qualquer outro fator."""

    if audience_country:
        bloco_1 += f"""

## PERFIL DA AUDIÊNCIA
Adapte o tom, o vocabulário e as referências culturais para: **{audience_country}**.
Isso não muda o idioma — continua português brasileiro.
O que muda: gírias, exemplos do cotidiano, nível de formalidade, referências culturais."""

    # ──────────────────────────────────────────────────────────────────────
    # BLOCO 2 — DADOS DO ML COM INSTRUÇÃO DE INTERPRETAÇÃO
    # ──────────────────────────────────────────────────────────────────────

    faixa_dominante = estrutura.get("faixa_duracao_dominante")
    faixa_evitar = estrutura.get("faixa_duracao_evitar")
    estrutura_blocos = estrutura.get("estrutura_blocos_dominante")
    ritmo = estrutura.get("ritmo_palavras_seg_mediana")
    densidade = estrutura.get("densidade_roteiro_mediana")
    sentimento_dom = estrutura.get("sentimento_dominante")
    sentimento_evitar = estrutura.get("sentimento_evitar")
    tipo_audio = estrutura.get("tipo_audio_dominante")
    clickbait = estrutura.get("clickbait_score_mediana")
    ativar_5x = estrutura.get("ativar_repeticao_5x")
    taxa_discussao = estrutura.get("taxa_discussao_mediana")
    taxa_conversao = estrutura.get("taxa_conversao_mediana")
    velocidade = estrutura.get("velocidade_views_mediana")
    completude_seo = estrutura.get("completude_seo_mediana")
    slots = estrutura.get("top3_slots_postagem", [])

    # ── Instruções derivadas das métricas ────────────────────────────────
    if clickbait is not None:
        if clickbait >= 0.7:
            clickbait_instrucao = f"clickbait_score {clickbait} — use CAPS, urgência e gancho forte de curiosidade no título e no gancho."
        elif clickbait <= 0.3:
            clickbait_instrucao = f"clickbait_score {clickbait} — título e gancho descritivos e diretos, sem artificialismo."
        else:
            clickbait_instrucao = f"clickbait_score {clickbait} — tom moderado, nem totalmente descritivo nem agressivo."
    else:
        clickbait_instrucao = "clickbait_score não disponível — use tom equilibrado."

    if taxa_discussao is not None:
        if taxa_discussao < 1:
            discussao_instrucao = f"taxa_discussao {taxa_discussao}% — baixa. Não force debate ou polêmica. Foque em entretenimento e clareza."
        else:
            discussao_instrucao = f"taxa_discussao {taxa_discussao}% — alta. Pode incluir um gatilho de opinião no fim do roteiro."
    else:
        discussao_instrucao = "taxa_discussao não disponível — evite polêmica por padrão."

    if taxa_conversao is not None:
        if taxa_conversao >= 5:
            cta_instrucao = f"taxa_conversao {taxa_conversao}% — alta. CTA direto e específico no fim."
        else:
            cta_instrucao = f"taxa_conversao {taxa_conversao}% — baixa. CTA leve, não force."
    else:
        cta_instrucao = "taxa_conversao não disponível — use CTA leve por padrão."

    if completude_seo is not None:
        seo_instrucao = "Invista em palavras-chave na descrição." if completude_seo >= 0.6 else "Foque no texto natural, não force SEO técnico."
    else:
        seo_instrucao = "Use palavras-chave com moderação."

    slots_fmt = "\n".join([f"  {i + 1}. {s['dia']} na janela {s['janela']}" for i, s in enumerate(slots)]) if slots else "  Dados insuficientes"

    secao_formato = f"""### FORMATO E RITMO
- Duração alvo: **{faixa_dominante or "não disponível"}** — pense o roteiro para caber nessa faixa.
- Duração a evitar: {faixa_evitar or "nenhuma"}.
- Estrutura de blocos: **{estrutura_blocos or "não disponível"}**.
  - "esquete" = diálogo narrador/personagem
  - "narrativa" = texto corrido em 1ª pessoa
  - "impacto_rapido" = frase única de alto impacto + CTA imediato
  - "esquete_com_hook" = hook 3s + diálogo
- Ritmo de fala: **{ritmo if ritmo is not None else "não disponível"} palavras/segundo**.
- Máximo de palavras no roteiro: **{densidade if densidade is not None else "não disponível"}** — respeite rigorosamente.
- Sentimento dominante: **{sentimento_dom or "não disponível"}**.
- Sentimento a evitar: {sentimento_evitar or "nenhum"}.
- Tipo de áudio dominante: **{tipo_audio or "não disponível"}**.
- {clickbait_instrucao}
- {discussao_instrucao}
- {cta_instrucao}
- SEO: {seo_instrucao}
- Velocidade de views: {velocidade if velocidade is not None else "não disponível"} views/dia — contexto do hype do nicho, não altera o conteúdo.
- Repetição da ideia central: {"ATIVE — repita a ideia central pelo menos 2x no roteiro de forma natural. É um padrão real dos super_viral deste nicho." if ativar_5x else "não force repetição."}

### MELHORES HORÁRIOS PARA POSTAR
{slots_fmt}
(Já estão no structure_content — são referência de contexto apenas.)"""

    # ── Gancho ────────────────────────────────────────────────────────────
    padrao_abertura = textuais.get("padrao_abertura_dominante")
    comprimento_gancho = textuais.get("comprimento_medio_gancho")
    comprimento_frase = textuais.get("comprimento_medio_frase")
    densidade_pont = textuais.get("densidade_pontuacao", {})
    pont_super = densidade_pont.get("super_viral") if densidade_pont else None
    pont_frio = densidade_pont.get("frio") if densidade_pont else None

    if padrao_abertura == "pergunta":
        abertura_instrucao = "O gancho deve começar com uma pergunta direta ao espectador."
    elif padrao_abertura == "imperativo":
        abertura_instrucao = "O gancho deve começar com um comando/ação direta (ex: 'Para de fazer isso', 'Nunca faça isso')."
    else:
        abertura_instrucao = "O gancho deve começar com uma afirmação direta e impactante."

    if pont_super is not None:
        pontuacao_instrucao = f"Nos super_viral, {pont_super}% das frases usam ! ou ? (vs {pont_frio if pont_frio is not None else '?'}% nos frios). {'Use bastante pontuação de impacto no roteiro.' if pont_super >= 30 else 'Use pontuação de impacto com moderação.'}"
    else:
        pontuacao_instrucao = "Dados de pontuação não disponíveis."

    secao_gancho = f"""### GANCHO
ATENÇÃO: os termos abaixo estão em inglês porque as transcrições de origem são em inglês.
Eles representam um PADRÃO DE LINGUAGEM (coloquial, curto, familiar, direto).
Não traduza as palavras — use o padrão para criar em português.

- Termos de gancho dos super_viral: {", ".join(textuais.get("termos_gancho_usar", [])) or "não disponível"}
- Termos de gancho dos frios (evitar esse padrão): {", ".join(textuais.get("termos_gancho_evitar", [])) or "nenhum"}
- {abertura_instrucao}
- Comprimento alvo do gancho: **{f"{comprimento_gancho:.0f}" if comprimento_gancho else "não disponível"} palavras**
- Comprimento médio de frase no roteiro: **{f"{comprimento_frase:.0f}" if comprimento_frase else "não disponível"} palavras**
- {pontuacao_instrucao}"""

    # ── Vocabulário e arco emocional ──────────────────────────────────────
    arco = textuais.get("arco_emocional", {})
    if arco:
        arco_fmt = f"início {arco.get('inicio', '?')} → meio {arco.get('meio', '?')} → fim {arco.get('fim', '?')}"
        if arco.get("inicio") == arco.get("meio") == arco.get("fim"):
            arco_instrucao = f"Tom constante do início ao fim: **{arco.get('inicio')}**. Mantenha esse sentimento em todo o roteiro."
        else:
            arco_instrucao = f"Siga essa progressão de tom: **{arco_fmt}**."
    else:
        arco_instrucao = "Arco emocional não disponível — mantenha tom consistente."

    vocab_terco = textuais.get("vocabulario_por_terco", {})
    if vocab_terco and any(vocab_terco.get(k) for k in ("inicio", "meio", "fim")):
        vocab_terco_fmt = f"  - Início (0–20%): {', '.join(vocab_terco.get('inicio', [])) or 'não disponível'}\n  - Meio (20–80%): {', '.join(vocab_terco.get('meio', [])) or 'não disponível'}\n  - Fim (80–100%): {', '.join(vocab_terco.get('fim', [])) or 'não disponível'}"
    else:
        vocab_terco_fmt = "  - não disponível"

    secao_vocabulario = f"""### VOCABULÁRIO E TOM DO ROTEIRO
ATENÇÃO: mesma lógica do gancho — termos em inglês representam padrão de linguagem, não palavras para traduzir.

- Vocabulário dominante do nicho: {", ".join(textuais.get("termos_vocabulario", [])) or "não disponível"}
- N-gramas do roteiro (moldes de frase): {", ".join(textuais.get("ngramas_roteiro", [])) or "não disponível"}
- Termos do roteiro a evitar: {", ".join(textuais.get("termos_roteiro_evitar", [])) or "nenhum"}
- {arco_instrucao}
- Vocabulário por terço (o que abordar em cada parte):
{vocab_terco_fmt}"""

    # ── Descrição ─────────────────────────────────────────────────────────
    secao_descricao = f"""### DESCRIÇÃO
- Termos a usar (padrão de linguagem, em inglês): {", ".join(textuais.get("termos_descricao_usar", [])) or "não disponível"}
- As hashtags já estão no structure_content prontas — use os mesmos termos dentro do texto da descrição também."""

    # ── Emojis ────────────────────────────────────────────────────────────
    secao_emojis = f"""### EMOJIS
- Os emojis já estão no structure_content prontos: {" ".join(textuais.get("emojis_usar", [])) or "não disponível"}
- Emojis a evitar: {" ".join(textuais.get("emojis_evitar", [])) or "nenhum"}
- Use esses emojis no título e na descrição onde fizer sentido."""

    # ── Exemplos reais ────────────────────────────────────────────────────
    def _lista(lista):
        return "\n".join(["  - " + str(x) for x in lista]) if lista else "  - Não disponível"

    secao_exemplos = f"""### EXEMPLOS REAIS DOS SUPER_VIRAL
Use como referência de TOM E ESTRUTURA — NUNCA copie ou parafraseie diretamente.

Ganchos virais:
{_lista(textuais.get("exemplos_ganchos", []))}

Títulos virais:
{_lista(textuais.get("exemplos_titulos", []))}

Descrições virais:
{_lista(textuais.get("exemplos_descricoes", []))}

Thumbnails virais:
{_lista(textuais.get("exemplos_thumbnails", []))}"""

    # ── Thumbnail ─────────────────────────────────────────────────────────
    comprimento_thumb = thumbnail.get("comprimento_alvo_chars")

    secao_thumbnail = f"""### THUMBNAIL
- A cena visual já está no structure_content pronta — não gere novamente.
- Gere apenas o TEXTO DA CAPA em português brasileiro.
- Comprimento alvo: **{comprimento_thumb if comprimento_thumb is not None else "não disponível"} caracteres** — respeite.
- Termos a usar: {", ".join(thumbnail.get("termos_thumbnail_usar", [])) or "não disponível"}
- Termos a evitar: {", ".join(thumbnail.get("termos_thumbnail_evitar", [])) or "nenhum"}

Exemplos reais de texto em thumbnails virais (REFERÊNCIA — NUNCA copie):
{_lista(thumbnail.get("exemplos_texto_thumbnail", []))}"""

    bloco_2 = f"""## PADRÕES DOS SUPER_VIRAL DO NICHO **{nicho}**

{secao_formato}

{secao_gancho}

{secao_vocabulario}

{secao_descricao}

{secao_emojis}

{secao_exemplos}

{secao_thumbnail}"""

    # ──────────────────────────────────────────────────────────────────────
    # BLOCO 3 — TAREFA
    # ──────────────────────────────────────────────────────────────────────

    structure_fmt = json.dumps(structure_parcial, ensure_ascii=False, indent=2)

    bloco_3 = f"""## TAREFA

O ML já preencheu os campos determinísticos do structure_content:

```json
{structure_fmt}
```

Gere um JSON com exatamente dois campos: `structure_content` e `script_content`.

### `structure_content`
Preencha APENAS os campos criativos que faltam:
- `titulo`: 3 sugestões de título em português brasileiro. Para cada uma, explique em uma linha por que funciona para este nicho com base nos padrões acima.
- `descricao`: sugestão de descrição em português brasileiro (2-3 linhas com os termos SEO e CTA calibrado).
- `thumbnail.texto`: sugestão de texto da capa em português, respeitando o comprimento alvo.

### `script_content`
Sugestão diretiva completa — não é um roteiro pronto para gravar, é uma orientação detalhada de como construir o roteiro:
- `estrutura_recomendada`: qual estrutura usar e por que funciona neste nicho
- `ritmo`: orientação de ritmo de fala, comprimento de frase e uso de pontuação
- `gancho`: sugestão de gancho com justificativa. Inclua o comprimento alvo em palavras.
- `desenvolvimento`: o que abordar em cada terço (início/meio/fim), quais termos incluir em cada parte e qual tom emocional manter
- `audio`: sugestão de clima sonoro baseado no tipo_audio_dominante
- `cta`: sugestão de CTA calibrada pela taxa_conversao e taxa_discussao
- `palavras_chave_no_roteiro`: lista dos termos do nicho que devem aparecer naturalmente no roteiro
- `total_palavras_maximo`: número inteiro igual à densidade_roteiro_mediana do ML
- `exemplo_gancho`: um exemplo concreto de gancho em português seguindo todos os padrões acima

Responda APENAS com JSON puro, sem explicações, sem markdown, sem blocos de código."""

    return f"{bloco_1}\n\n---\n\n{bloco_2}\n\n---\n\n{bloco_3}"


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 2 — CHAMADA AO PROVIDER
# ════════════════════════════════════════════════════════════════════════════


def _chamar_gemini(prompt: str) -> str:
    """
    Envia o prompt para a API do Gemini e retorna o texto da resposta.
    Lança exceção em caso de falha na chamada ou resposta inválida.
    """
    if not GEMINI_API_KEY:
        raise EnvironmentError("GEMINI_API_KEY não definida nas variáveis de ambiente.")

    client = genai.Client(api_key=GEMINI_API_KEY)

    resposta = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=("Você é um especialista em conteúdo viral para YouTube Shorts. Responda sempre e somente com JSON puro e válido, sem qualquer texto adicional, sem markdown, sem blocos de código."),
            temperature=0.7,
            max_output_tokens=16384,
        ),
    )

    return resposta.text.strip()


def _parsear_resposta(texto: str, padroes: dict) -> dict:
    """
    Faz o parse do JSON retornado pela LLM.
    Remove possíveis blocos de markdown residuais antes de parsear.
    Valida que os dois campos obrigatórios estão presentes.

    Validação não bloqueante: se total_palavras_maximo do script_content
    ultrapassar densidade_roteiro_mediana do ML, loga aviso mas não bloqueia.
    """
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

    # ── Validação não bloqueante: limite de palavras ──────────────────────
    densidade_roteiro_mediana = padroes.get("estrutura", {}).get("densidade_roteiro_mediana")
    total_palavras = dados["script_content"].get("total_palavras_maximo")

    if densidade_roteiro_mediana is not None and total_palavras is not None:
        if total_palavras > densidade_roteiro_mediana:
            print(f" [llm] AVISO: total_palavras_maximo={total_palavras} > densidade_roteiro_mediana={densidade_roteiro_mediana}. Seguindo com a resposta mesmo assim.")

    return dados


def _montar_structure_deterministico(padroes: dict) -> dict:
    """
    Monta os campos do structure_content que o ML já resolve sozinho.
    Esses campos não vão para a LLM gerar — chegam prontos.
    """
    estrutura = padroes.get("estrutura", {})
    textuais = padroes.get("textuais", {})
    thumbnail = padroes.get("thumbnail", {})

    # Hashtags — termos SEO dos super_viral formatados com #
    termos_seo = textuais.get("termos_seo_usar", [])
    hashtags = [f"#{t.replace(' ', '')}" for t in termos_seo[:8]] if termos_seo else []

    # Horário — primeiro slot real dos super_viral
    slots = estrutura.get("top3_slots_postagem", [])
    horario = slots[0] if slots else None

    # Cena visual — termos dominantes das thumbnails dos super_viral
    cenas = thumbnail.get("cenas_visuais_dominantes", [])
    cena_visual = ", ".join(cenas) if cenas else None

    return {
        "hashtags": hashtags,
        "emojis": textuais.get("emojis_usar", [])[:5],
        "horario_postagem": {"dia": horario["dia"], "janela": horario["janela"]} if horario else None,
        "duracao_alvo": estrutura.get("faixa_duracao_dominante"),
        "estrutura_blocos": estrutura.get("estrutura_blocos_dominante"),
        "thumbnail": {"cena_visual": cena_visual},
    }


def gerar_conteudo(padroes: dict, audience_country: Optional[str] = None) -> dict:
    print(f" [llm] Gerando conteúdo para nicho: {padroes.get('nicho', '?')}")
    if audience_country:
        print(f"   audience_country: {audience_country}")
    else:
        print("   audience_country: não informado → tom neutro")

    # Monta structure_content determinístico direto do ML
    structure_determinístico = _montar_structure_deterministico(padroes)

    # LLM completa só o que falta
    prompt = _montar_prompt(padroes, audience_country, structure_determinístico)
    resposta_bruta = _chamar_gemini(prompt)
    resultado = _parsear_resposta(resposta_bruta, padroes)

    # Mescla ML + LLM
    structure_final = {**structure_determinístico, **resultado["structure_content"]}

    print(" [llm] Conteúdo gerado com sucesso.")

    return {
        "structure_content": structure_final,
        "script_content": resultado["script_content"],
    }
