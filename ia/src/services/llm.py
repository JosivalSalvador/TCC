"""
llm.py

Responsabilidade: receber os padrões do nicho vindos do inferencia_ml.py
e o audience_country opcional, e retornar os dois blocos finais
(structure_content e script_content) prontos para o usuário.

Fluxo em duas chamadas:
    Chamada 1 — Limpeza:
        O Gemini varre o JSON bruto do ML campo a campo e devolve
        a mesma estrutura, mas sanitizada: remove nomes próprios,
        tenta retraduzir termos que vazaram em outro idioma (remove
        se a retradução não fizer sentido), remove valores sem
        sentido/irrelevantes, e mantém vazio o que já vinha vazio.
        Sem interpretação de conteúdo — só filtro.

    Chamada 2 — Geração final:
        Recebe o JSON já limpo (não mais o bruto) e gera, numa única
        passada, o conteúdo final em JSON estruturado conforme
        structure_content e script_content. Aqui sim há raciocínio:
        a LLM decide como interpretar cada campo (traduzir número em
        linguagem humana, adaptar ao público) e como lidar com campos
        que ficaram pobres ou vazios após a limpeza — generalizando a
        partir do que sobrou, sem nunca devolver instrução vazia.
"""

import json
import os
import re
from typing import Optional

from google import genai
from google.genai import types

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.5-flash"


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 1 — INSTRUÇÃO DA CHAMADA 1 (LIMPEZA)
# ════════════════════════════════════════════════════════════════════════════


def _instrucao_papel(nicho: str) -> str:
    """Parágrafo de papel e contexto do sanitizador de dados."""
    return (
        f"Você é um sanitizador de dados especialista em conteúdo de vídeos curtos (Shorts).\n\n"
        f'Abaixo está um JSON com dados extraídos por ML de vídeos virais do nicho "{nicho}".\n'
        f"Esses dados foram gerados automaticamente a partir de vídeos de diversas origens ao redor do mundo\n"
        f"e podem conter imperfeições: nomes próprios de canais ou pessoas reais, termos que vazaram\n"
        f"em outro idioma sem tradução correta, valores ou termos sem sentido fora de contexto,\n"
        f'campos com valor "ausente", "desconhecido", ou listas vazias.\n\n'
        f"Sua tarefa NÃO é interpretar, traduzir conceito, resumir ou opinar sobre os dados.\n"
        f"Sua tarefa é apenas limpar: percorrer o JSON inteiro, campo por campo, em qualquer\n"
        f"nível de profundidade, e devolver a MESMA estrutura recebida, com o mesmo formato\n"
        f"de cada campo (string continua string, lista continua lista, número continua número),\n"
        f"removendo ou corrigindo apenas o que for sujeira, conforme as regras a seguir."
    )


def _instrucao_tratamento_dados() -> str:
    """Regras de filtro para a limpeza dos dados do ML."""
    return (
        "Regras de limpeza — aplique a CADA valor do JSON, em qualquer campo, em qualquer\n"
        "nível de profundidade (strings soltas, itens de listas, valores dentro de dicts):\n\n"
        "1. NOME PRÓPRIO de pessoa, canal, ator, personagem ou marca específica\n"
        "   → REMOVA o valor inteiro (não apenas a palavra do nome — se o nome estiver\n"
        "     dentro de uma frase maior e a frase ficar sem sentido sem ele, remova a\n"
        "     frase toda, não deixe fragmento truncado tipo 'Pepper' virar '23 Sabores').\n"
        "   Exemplos: nomes de atores reais, nomes de canais, nomes de personagens\n"
        "   específicos de um vídeo, handles, usernames, nomes de marcas/produtos\n"
        "   específicos que não representam o nicho (ex: marca de refrigerante\n"
        "   citada incidentalmente em uma thumbnail).\n\n"
        "2. TERMO QUE NÃO ESTÁ EM INGLÊS (vazou sem tradução, ou tradução ficou incompleta)\n"
        "   → Primeiro TENTE traduzir mentalmente para o inglês.\n"
        "   → Se a tradução fizer sentido e for um termo útil e genérico do nicho, substitua\n"
        "     o valor pela tradução em inglês.\n"
        "   → Se não houver tradução sensata, ou o termo for específico de uma cultura/contexto\n"
        "     que não generaliza para o nicho como um todo (ex: nome de feriado regional,\n"
        "     termo de parentesco em outro idioma, referência cultural muito local),\n"
        "     REMOVA o valor.\n\n"
        "3. VALOR SEM SENTIDO, IRRELEVANTE OU ESPECÍFICO DEMAIS para o nicho\n"
        "   → REMOVA. Isso inclui:\n"
        "     - ruído de outro nicho que vazou na amostra\n"
        "     - repetições sem sentido ou fragmentos truncados\n"
        "     - artefatos de processamento (ex: tags vazias ou malformadas como '[__]',\n"
        "       marcadores técnicos sem conteúdo real)\n"
        "     - boilerplate de canal específico: avisos de direitos autorais, convites\n"
        "       de inscrição citando nomes de pessoas/canais, links de redes sociais\n"
        "       (Linktree, Discord, Instagram, etc.) — isso NUNCA é padrão de nicho,\n"
        "       é sempre específico de um criador\n"
        "     - frases ou termos longtail que descrevem o enredo específico de UM vídeo\n"
        "       em vez de um padrão replicável (ex: 'comédia de esposa de primo',\n"
        "       'vídeos de empregada e dono maluco' — isso é sinopse de vídeo, não\n"
        "       palavra-chave de nicho)\n"
        "     - onomatopeias deformadas por transcrição/tradução, fragmentos sonoros\n"
        "       sem grafia estável (ex: variações tipo 'au', 'hum', 'miau miau' que\n"
        "       são pedaços de um mesmo som cortado de formas diferentes) — eles não\n"
        "       são vocabulário, são ruído de captura de áudio\n\n"
        "4. CAMPO JÁ VAZIO, 'ausente' ou 'desconhecido'\n"
        "   → MANTENHA como está. Não invente valor para preencher.\n\n"
        "5. VALORES NUMÉRICOS, BOOLEANOS, OU CATEGÓRICOS JÁ LIMPOS (ex: scores, médias,\n"
        "   proporções, taxas, classificações como 'positivo'/'neutro'/'negativo')\n"
        "   → MANTENHA sem alteração. Esses valores já vêm calculados corretamente do ML\n"
        "     e não precisam de limpeza — a limpeza é sobre texto/termos, não sobre métricas.\n\n"
        "TESTE PRÁTICO antes de manter qualquer termo ou frase: esse valor ajuda a perceber\n"
        "um PADRÃO real e replicável do nicho, ou é um detalhe específico de UM vídeo/criador\n"
        "que só vai confundir quem for raciocinar sobre esse dado depois? Lembre-se que\n"
        "ninguém vai citar esse valor literalmente na etapa seguinte — ele só serve como\n"
        "evidência para alguém decidir uma estratégia. Se o valor for ambíguo, estranho fora\n"
        "de contexto, ou exigir conhecimento de UM vídeo específico para fazer sentido,\n"
        "REMOVA — é melhor um campo mais enxuto e confiável do que um campo cheio de ruído\n"
        "que pode levar a uma leitura errada do padrão do nicho.\n\n"
        "IMPORTANTE: ao remover um item de uma LISTA, apenas remova esse item específico —\n"
        "não remova a lista inteira, nem outros itens válidos dela. Ao remover o único\n"
        "conteúdo de um campo string, o campo deve virar string vazia (''), nunca null\n"
        "e nunca a chave inteira removida do JSON."
    )


def _instrucao_audience(audience_country: str) -> str:
    """Instrução de adaptação cultural para o público informado."""
    return (
        f'Público-alvo informado: "{audience_country}".\n\n'
        "Adapte toda a análise para esse público:\n"
        "- Tom e registro de linguagem (formal, informal, regional)\n"
        "- Gírias e expressões típicas desse público\n"
        "- Referências culturais que ressoam com esse perfil\n"
        "- Vocabulário e exemplos que fazem sentido para essa audiência\n\n"
        "Isso vale para todos os 13 tópicos — não adapte só o vocabulário,\n"
        "adapte a forma de instruir também."
    )


def montar_prompt_limpeza(padroes: dict) -> str:
    """
    Monta o prompt completo da chamada de limpeza.
    Combina: papel + regras de filtro + dados brutos do ML serializados.
    Não recebe audience_country — a limpeza é neutra a público,
    e não tem instrução de cobertura — limpeza não interpreta conteúdo.
    """
    nicho = padroes.get("nicho", "")
    padroes_serializados = json.dumps(padroes, ensure_ascii=False, indent=2)

    partes = [
        _instrucao_papel(nicho),
        _instrucao_tratamento_dados(),
        (f"Dados do ML:\n{padroes_serializados}\n\nDevolva APENAS o JSON limpo, com a mesma estrutura recebida acima,\nsem markdown, sem explicações, sem texto fora do JSON."),
    ]

    return "\n\n".join(partes)


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 2 — INSTRUÇÃO DA CHAMADA 2 (GERAÇÃO FINAL)
# ════════════════════════════════════════════════════════════════════════════


def _instrucao_papel_final(nicho: str) -> str:
    """Parágrafo de papel e contexto do consultor de geração final."""
    return (
        f"Você é um consultor especialista em conteúdo viral de vídeos curtos (Shorts),\n"
        f'focado no nicho "{nicho}".\n\n'
        f"Abaixo está um JSON com padrões extraídos por ML de vídeos virais desse nicho,\n"
        f"já limpo de nomes próprios, termos sem sentido e ruído de outros nichos.\n\n"
        f"Sua tarefa NÃO é traduzir, listar ou repassar os campos do JSON um a um, e\n"
        f"NUNCA copie, filtre ou recorte diretamente um array, lista ou valor do dado\n"
        f"de entrada para colocar na resposta — nem mesmo quando o valor já parecer\n"
        f"limpo e correto. Toda saída, seja texto corrido ou lista, precisa nascer de\n"
        f"RACIOCÍNIO seu sobre o conjunto de dados daquele bloco — todos os campos\n"
        f"juntos, números, listas e categorias — nunca de uma cópia mecânica do que\n"
        f"veio no JSON.\n\n"
        f"Use 100% dos dados de cada bloco como evidência e base do seu raciocínio.\n"
        f"Nada deve ser ignorado na hora de decidir a estratégia — mas a forma como\n"
        f"isso aparece na resposta é sempre fruto da sua decisão, como um consultor\n"
        f"que estudou centenas de vídeos virais do nicho e está sintetizando o que\n"
        f"aprendeu, nunca como alguém que está repassando uma planilha.\n\n"
        f"O entregável final é um GUIA DE ESTRATÉGIA para o criador montar o vídeo —\n"
        f"não um vídeo pronto, não um roteiro escrito palavra por palavra. Onde envolver\n"
        f"roteiro ou fala, entregue estrutura/esqueleto (ex: 'abra com uma reação exagerada\n"
        f"a algo banal, desenvolva mostrando a consequência cômica, feche sem chamada\n"
        f"explícita para ação'), nunca uma fala pronta ou frase literal tirada do dado.\n\n"
        f"Mesmo quando o schema de saída pedir uma lista (de palavras-chave, hashtags,\n"
        f"vocabulário, horários de postagem etc.), essa lista deve ser o resultado do\n"
        f"seu julgamento sobre o padrão do nicho — pode coincidir com termos do dado de\n"
        f"entrada quando eles realmente forem os mais representativos, mas nunca é uma\n"
        f"cópia direta, recorte ou reformulação superficial do array original.\n\n"
        f"Toda métrica, score ou estatística do JSON deve virar orientação prática em\n"
        f"linguagem simples, nunca aparecer como número cru ou nome técnico de campo.\n"
        f"O resultado final é um produto pronto para o público comum — criadores de\n"
        f"conteúdo, não analistas de dados."
    )


def _instrucao_interpretacao() -> str:
    """Regras de tradução de métricas numéricas em linguagem humana."""
    return (
        "Regras de interpretação — ao usar valores numéricos, scores ou taxas do JSON\n"
        "para embasar uma instrução, traduza para linguagem humana em vez de citar o\n"
        "número cru. Use estas faixas como referência geral (adapte a redação ao contexto):\n\n"
        "- 0.0 a 0.3 → 'raramente', 'pouco comum', 'discreto', 'quase ausente'\n"
        "- 0.3 a 0.6 → 'moderado', 'presente mas equilibrado', 'parte considerável'\n"
        "- 0.6 a 1.0 → 'forte', 'predominante', 'intenso', 'a maioria dos casos'\n\n"
        "Para contagens (ex: quantidade de hashtags, frequência de repetição), pode\n"
        "usar o número diretamente na instrução quando isso ajudar o criador a aplicar\n"
        "a orientação na prática (ex: 'repita a ideia central por volta de X vezes').\n\n"
        "Nunca escreva o nome técnico do campo (ex: não escreva 'clickbait_score' ou\n"
        "'cta_score_mediano') — sempre converta em orientação direta e natural."
    )


def _instrucao_cobertura() -> str:
    """Lista dos 13 tópicos que devem ser cobertos na análise, com todos os campos do ML."""
    return (
        "Cubra obrigatoriamente todos os tópicos abaixo, sem exceção.\n"
        "Para cada tópico, os campos do ML listados são a EVIDÊNCIA que embasa sua\n"
        "decisão — use 100% deles para raciocinar, mas a resposta nunca é uma cópia,\n"
        "recorte ou tradução direta desses campos. É sempre uma estratégia decidida\n"
        "por você a partir do padrão que esses dados revelam.\n\n"
        "Se algum sub-dado de um tópico faltar ou tiver ficado pobre após a limpeza,\n"
        "NÃO deixe a instrução vazia ou genérica demais: raciocine a partir dos demais\n"
        "campos do mesmo tópico que sobreviveram, ou recorra ao padrão mais comum do\n"
        "nicho como um todo. A instrução final de cada tópico é sempre obrigatória e\n"
        "precisa ser útil na prática, mesmo quando o dado bruto for limitado.\n\n"
        "IMPORTANTE SOBRE IDIOMA: os dados de entrada (termos, exemplos_reais, moldes_frase)\n"
        "vêm em inglês, pois foram normalizados pelo pipeline de ML. TODA a saída deve ser\n"
        "em português brasileiro. Isso vale tanto para texto corrido quanto para qualquer\n"
        "lista do schema — nada em inglês pode aparecer na resposta final.\n\n"
        "IMPORTANTE SOBRE COMO USAR O DADO: nunca copie, filtre ou cite literalmente um\n"
        "termo, frase, exemplo ou item de lista do dado de entrada. Os campos termos_*,\n"
        "exemplos_reais e moldes_frase de cada bloco frequentemente trazem nomes de\n"
        "personagens recorrentes da amostra, fragmentos de transcrição truncados,\n"
        "termos culturais muito específicos ou frases de um vídeo só — eles servem\n"
        "para você PERCEBER O PADRÃO do nicho (tom, vocabulário típico, tipo de situação,\n"
        "estilo de humor), nunca para serem citados, filtrados ou usados como base de uma\n"
        "lista de saída. Toda lista ou termo que aparecer na resposta final deve ser\n"
        "escrito/decidido por você a partir desse padrão percebido — nunca extraído\n"
        "mecanicamente do array de entrada.\n\n"
        "ANTES DE USAR QUALQUER TERMO OU PAR DE TERMOS COMO BASE PARA UMA LISTA: descarte\n"
        "mentalmente qualquer item que seja ruído de transcrição (fragmento sonoro\n"
        "deformado, onomatopeia cortada pela tradução, interjeição isolada sem\n"
        "significado claro), específico de um único criador ou vídeo (nome de\n"
        "personagem, animal de estimação ou apelido recorrente que não representa\n"
        "o nicho como um todo), ou um par/termo sem relação semântica clara entre\n"
        "si. Esse tipo de item não revela um padrão replicável — é ruído que vazou\n"
        "da amostra, e nunca deve aparecer, direta ou indiretamente, na lista final.\n\n"
        "IMPORTANTE SOBRE CRUZAMENTO ENTRE BLOCOS: os campos visuais do bloco THUMBNAIL\n"
        "(elementos_obrigatorios da cena, presenca_humana, sentimento_visual_alvo) não\n"
        "servem só para orientar a thumbnail — eles também são pista de quem aparece\n"
        "no vídeo e que tipo de situação visual o nicho retrata. Use-os como evidência\n"
        "adicional ao decidir os tópicos 6 (ESTRUTURA DO VÍDEO) e 9 (ARCO EMOCIONAL),\n"
        "cruzando o que a cena visual revela com o que o roteiro e o tom emocional\n"
        "precisam comunicar.\n\n"
        "1. TÍTULO\n"
        "   Campos: formula_construcao, comprimento_alvo_chars, caps_intensidade,\n"
        "   usar_pontuacao_impacto, sentimento_alvo,\n"
        "   molde_estrutura.clickbait_score_mediano (interprete em linguagem humana,\n"
        "   conforme as regras de interpretação), emojis (emoji + posicao + frequencia),\n"
        "   termos_obrigatorios, exemplos_reais.\n"
        "   Entregue: instrução de como montar o título — estratégia de fórmula, tom,\n"
        "   uso de emoji e que tipo de assunto/situação funciona, nunca um título\n"
        "   citado ou termo copiado do dado.\n\n"
        "2. DESCRIÇÃO\n"
        "   Campos: comprimento_alvo_chars, primeira_linha_comprimento_alvo,\n"
        "   sentimento_primeira_linha, termos_seo_obrigatorios, moldes_frase,\n"
        "   emojis, cta_posicao, cta_intensidade, cta_score_mediano (interprete em\n"
        "   linguagem humana), usar_links, hashtags, quantidade_hashtags, exemplos_reais.\n"
        "   Entregue: instrução de como montar a descrição, e uma lista de hashtags\n"
        "   recomendadas decidida por você a partir do padrão temático do nicho\n"
        "   (nunca a lista de hashtags do dado copiada ou recortada).\n\n"
        "3. THUMBNAIL\n"
        "   Campos: texto_capa (comprimento_alvo_chars, termos_obrigatorios,\n"
        "   caps_intensidade, emojis, sentimento_alvo),\n"
        "   cena_visual (elementos_obrigatorios, presenca_humana),\n"
        "   sentimento_visual_alvo, exemplos_reais.\n"
        "   Entregue: um RETRATO do padrão visual predominante nas thumbnails virais\n"
        "   desse nicho — descreva o que costuma aparecer (quem está na cena, expressões,\n"
        "   ambientação, presença ou ausência de texto e seu tom) como uma leitura do\n"
        "   padrão observado, não como um passo a passo de produção. A composição da\n"
        "   cena e o texto da capa continuam como duas observações distintas.\n\n"
        "4. PALAVRAS-CHAVE\n"
        "   Campos: shorttail, midtail, longtail, proporcao_ideal.\n"
        "   Entregue: instrução de como combinar os tipos de palavra-chave e em que\n"
        "   proporção, mais uma lista de palavras-chave recomendadas — decidida por\n"
        "   você a partir do padrão temático que as listas de entrada revelam, nunca\n"
        "   uma cópia, recorte ou filtro dessas listas.\n\n"
        "5. QUANDO POSTAR\n"
        "   Campos: top_3_slots (dia, janela, quantidade_virais, justificativa).\n"
        "   Entregue: instrução de quando postar e por quê — recomendação decidida\n"
        "   por você a partir do padrão dos 3 slots, nunca os slots repassados tal\n"
        "   e qual como vieram do dado.\n\n"
        "6. ESTRUTURA DO VÍDEO\n"
        "   Campos: estrutura_blocos, faixa_duracao, limite_palavras,\n"
        "   usa_dialogo, taxa_dialogo_no_nicho (interprete em linguagem humana),\n"
        "   usa_repeticao. Cruze também com os campos visuais da THUMBNAIL\n"
        "   (elementos_obrigatorios, presenca_humana) para situar que tipo de cena\n"
        "   e quantos personagens o vídeo costuma ter.\n"
        "   Entregue: instrução de como dividir e limitar o vídeo, se o roteiro\n"
        "   deve ser escrito em formato de diálogo (múltiplos interlocutores,\n"
        "   marcado por falas alternadas) ou monólogo (um único narrador),\n"
        "   e se o formato típico desse nicho usa repetição da ideia central\n"
        "   (usa_repeticao se refere ao formato dominante do nicho — não repita\n"
        "   a instrução de frequência de repetição, que já é tratada no tópico 11).\n\n"
        "7. GANCHO\n"
        "   Campos: formula_abertura, comprimento_alvo_palavras, comprimento_alvo_chars,\n"
        "   sentimento_alvo, termos_obrigatorios, usar_pontuacao_impacto, exemplos_reais.\n"
        "   Entregue: estratégia/esqueleto concreto de como abrir o vídeo — o tipo de\n"
        "   situação ou frase de abertura que funciona, nunca uma fala pronta ou\n"
        "   exemplo citado do dado.\n\n"
        "8. RITMO\n"
        "   Campos: palavras_por_segundo, comprimento_medio_frase,\n"
        "   variancia_ritmo (interprete em linguagem humana), densidade_pontuacao_impacto\n"
        "   (interprete em linguagem humana), moldes_frase.\n"
        "   Entregue: instrução de como falar e escrever o roteiro (velocidade, tamanho\n"
        "   de frase, variação de ritmo), nunca citando os n-gramas do dado.\n\n"
        "9. ARCO EMOCIONAL\n"
        "   Campos: inicio (tom, vocabulario_obrigatorio),\n"
        "   meio (tom, vocabulario_obrigatorio),\n"
        "   fim (tom, vocabulario_obrigatorio). Cruze também com sentimento_visual_alvo\n"
        "   e elementos_obrigatorios da THUMBNAIL para embasar como os personagens\n"
        "   devem reagir e se portar visualmente em cada terço.\n"
        "   Entregue: instrução concreta de como conduzir cada terço — não basta nomear\n"
        "   o tom, explique o que o criador deve fazer: que tipo de situação criar,\n"
        "   como os personagens devem reagir, qual energia transmitir em cada parte.\n"
        "   Use o vocabulário de cada terço só para perceber o tipo de interação\n"
        "   (ex: relação familiar, tom afetuoso), nunca cite os termos literalmente.\n\n"
        "10. ÁUDIO\n"
        "    Campos: tipo_dominante, clima_sonoro, frequencia_uso_no_nicho (interprete\n"
        "    em linguagem humana).\n"
        "    Entregue: instrução de que tipo de som usar e qual o clima sonoro\n"
        "    predominante, descrito com suas próprias palavras (ex: trilha animada,\n"
        "    efeitos de riso) a partir do padrão das pistas de áudio, nunca citando\n"
        "    a tag técnica original, e com que frequência o nicho usa áudio de fundo.\n\n"
        "11. REPETIÇÃO\n"
        "    Campos: ativar, taxa_no_nicho (interprete em linguagem humana),\n"
        "    frequencia_media.\n"
        "    Entregue: instrução de se repetir, quanto (pode citar o número de\n"
        "    frequencia_media diretamente, já que é uma métrica e não um termo do\n"
        "    dado) e como variar.\n\n"
        "12. CTA\n"
        "    Campos: intensidade, estilo, ativar_gatilho_debate,\n"
        "    taxa_discussao_mediana (interprete em linguagem humana),\n"
        "    cta_score_mediano (interprete em linguagem humana), posicao, molde_termos.\n"
        "    Se estilo e posicao forem 'ausente': oriente o criador que esse nicho\n"
        "    não usa CTA explícito e instrua como encerrar o vídeo naturalmente\n"
        "    dentro da narrativa, sem chamada direta para ação.\n"
        "    Caso contrário: entregue instrução única de como fechar o vídeo.\n\n"
        "13. VOCABULÁRIO GERAL\n"
        "    Campos: termos_obrigatorios, coocorrencias_obrigatorias.\n"
        "    Entregue: uma lista de palavras e expressões recomendadas para o roteiro,\n"
        "    decidida por você a partir do padrão de linguagem que o vocabulário do\n"
        "    dado revela (tipo de relação entre personagens, registro de fala, tom),\n"
        "    nunca a lista de termos do dado copiada diretamente nem pares sem sentido\n"
        "    semântico claro entre si."
    )


def _instrucao_schema_saida() -> str:
    """Descreve o schema JSON de saída esperado: structure_content + script_content."""
    return (
        "Schema obrigatório de saída — retorne APENAS o JSON abaixo preenchido,\n"
        "sem markdown, sem explicações, sem texto fora do JSON:\n\n"
        "{\n"
        '  "structure_content": {\n'
        '    "titulo": {\n'
        '      "instrucao": string\n'
        "    },\n"
        '    "descricao": {\n'
        '      "instrucao": string,\n'
        '      "hashtags": [string],\n'
        '      "quantidade_hashtags": number\n'
        "    },\n"
        '    "thumbnail": {\n'
        '      "texto_capa_instrucao": string,\n'
        '      "cena_instrucao": string\n'
        "    },\n"
        '    "palavras_chave": {\n'
        '      "instrucao": string,\n'
        '      "shorttail": [string],\n'
        '      "midtail": [string],\n'
        '      "longtail": [string],\n'
        '      "proporcao_ideal": {\n'
        '        "shorttail": number,\n'
        '        "midtail": number,\n'
        '        "longtail": number\n'
        "      }\n"
        "    },\n"
        '    "postagem": {\n'
        '      "instrucao": string,\n'
        '      "slots": [\n'
        "        {\n"
        '          "dia": string,\n'
        '          "janela": string,\n'
        '          "justificativa": string\n'
        "        }\n"
        "      ]\n"
        "    }\n"
        "  },\n"
        '  "script_content": {\n'
        '    "estrutura": {\n'
        '      "instrucao": string,\n'
        '      "limite_palavras": number\n'
        "    },\n"
        '    "gancho": {\n'
        '      "instrucao": string\n'
        "    },\n"
        '    "ritmo": {\n'
        '      "instrucao": string\n'
        "    },\n"
        '    "arco_emocional": {\n'
        '      "inicio": {"instrucao": string},\n'
        '      "meio": {"instrucao": string},\n'
        '      "fim": {"instrucao": string}\n'
        "    },\n"
        '    "audio": {\n'
        '      "instrucao": string\n'
        "    },\n"
        '    "repeticao": {\n'
        '      "instrucao": string\n'
        "    },\n"
        '    "cta": {\n'
        '      "instrucao": string\n'
        "    },\n"
        '    "vocabulario_geral": {\n'
        '      "instrucao": string,\n'
        '      "termos_recomendados": [string],\n'
        '      "coocorrencias": [[string, string]]\n'
        "    }\n"
        "  }\n"
        "}\n\n"
        "Regras:\n"
        "- Todos os campos do schema são obrigatórios, mesmo quando o dado de origem\n"
        "  for limitado — nesse caso, gere a melhor instrução possível com o que houver\n"
        "  (nunca deixe 'instrucao' vazia); listas podem ficar vazias ([]) se realmente\n"
        "  não sobrar nenhum termo confiável, mas isso deve ser exceção, não regra.\n"
        "- Números devem respeitar o tipo (number, nunca string).\n"
        "- Nenhuma lista do schema (hashtags, shorttail, midtail, longtail,\n"
        "  termos_recomendados, coocorrencias, slots) pode ser uma cópia, recorte ou\n"
        "  filtro direto de um array do dado de entrada — cada item deve ser decidido\n"
        "  por você a partir do padrão percebido no bloco correspondente.\n"
        "- TODO o conteúdo de texto da resposta deve estar em português brasileiro,\n"
        "  SEM EXCEÇÃO — isso inclui instrucao, listas de palavras-chave, hashtags,\n"
        "  vocabulário e qualquer outro campo de texto. Os dados de entrada vêm em\n"
        "  inglês (pipeline de ML), mas nada em inglês pode aparecer na resposta final.\n"
        "- Strings de instrução devem ser claras, diretas, e utilizáveis por um criador\n"
        "  de conteúdo sem conhecimento técnico de dados — sempre como guia/estratégia,\n"
        "  nunca como roteiro pronto ou fala literal escrita palavra por palavra."
    )


def montar_prompt_final(padroes_limpos: dict, audience_country: Optional[str]) -> str:
    """
    Monta o prompt completo da chamada de geração final.
    Combina: papel + interpretação + cobertura + audience (se informado)
    + schema de saída + dados já limpos serializados.
    Único prompt — gera conteúdo e formata em JSON na mesma passada.
    """
    nicho = padroes_limpos.get("nicho", "")
    padroes_serializados = json.dumps(padroes_limpos, ensure_ascii=False, indent=2)

    partes = [
        _instrucao_papel_final(nicho),
        _instrucao_interpretacao(),
        _instrucao_cobertura(),
    ]

    if audience_country:
        partes.append(_instrucao_audience(audience_country))

    partes.append(_instrucao_schema_saida())
    partes.append(f"Dados do ML (já limpos):\n{padroes_serializados}")

    return "\n\n".join(partes)


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 3 — CHAMADAS AO GEMINI
# ════════════════════════════════════════════════════════════════════════════


def _cliente_gemini() -> genai.Client:
    """Instancia e retorna o cliente Gemini."""
    return genai.Client(api_key=GEMINI_API_KEY)


def chamar_gemini_limpeza(prompt: str) -> str:
    """
    Chamada de limpeza — filtro campo a campo, sem interpretação.
    Thinking budget moderado/alto, temperature baixa (tarefa mecânica
    mas que exige julgamento contextual em alguns casos, ex: termo
    ambíguo que pode ou não ser nome próprio).
    Retorna JSON puro (mesma estrutura recebida, dados filtrados).
    """
    cliente = _cliente_gemini()

    resposta = cliente.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
            thinking_config=types.ThinkingConfig(
                thinking_budget=2048,
            ),
        ),
    )

    if not resposta.text:
        raise ValueError("[llm] Resposta vazia do Gemini na chamada de limpeza.")

    return resposta.text


def chamar_gemini_final(prompt: str) -> str:
    """
    Chamada de geração final — única chamada que decide conteúdo
    e já devolve no formato JSON do schema de saída.
    Thinking budget alto (raciocínio sobre dado limpo, possivelmente
    incompleto, e decisão de schema na mesma passada), temperature
    moderada (precisa de alguma criatividade pra generalizar quando
    o dado limpo ficou pobre, mas sem fugir do que os dados sustentam).
    Retorna JSON puro com structure_content e script_content.
    """
    cliente = _cliente_gemini()

    resposta = cliente.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.4,
            thinking_config=types.ThinkingConfig(
                thinking_budget=4096,
            ),
        ),
    )

    if not resposta.text:
        raise ValueError("[llm] Resposta vazia do Gemini na chamada de geração final.")

    return resposta.text


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 4 — PARSE E VALIDAÇÃO
# ════════════════════════════════════════════════════════════════════════════


def _limpar_markdown(texto: str) -> str:
    """Remove blocos de markdown residuais do texto."""
    return re.sub(r"```(?:json)?|```", "", texto).strip()


def _validar_structure_content(dados: dict) -> None:
    """Valida presença e tipo dos campos obrigatórios em structure_content."""
    sc = dados.get("structure_content", {})

    campos_string = [
        (sc.get("titulo", {}), "titulo.instrucao", "instrucao"),
        (sc.get("descricao", {}), "descricao.instrucao", "instrucao"),
        (sc.get("thumbnail", {}), "thumbnail.texto_capa_instrucao", "texto_capa_instrucao"),
        (sc.get("thumbnail", {}), "thumbnail.cena_instrucao", "cena_instrucao"),
        (sc.get("palavras_chave", {}), "palavras_chave.instrucao", "instrucao"),
        (sc.get("postagem", {}), "postagem.instrucao", "instrucao"),
    ]

    campos_lista = [
        (sc.get("descricao", {}), "descricao.hashtags", "hashtags"),
        (sc.get("palavras_chave", {}), "palavras_chave.shorttail", "shorttail"),
        (sc.get("palavras_chave", {}), "palavras_chave.midtail", "midtail"),
        (sc.get("palavras_chave", {}), "palavras_chave.longtail", "longtail"),
        (sc.get("postagem", {}), "postagem.slots", "slots"),
    ]

    campos_numero = [
        (sc.get("descricao", {}), "descricao.quantidade_hashtags", "quantidade_hashtags"),
    ]

    for bloco, caminho, campo in campos_string:
        if campo not in bloco or not isinstance(bloco[campo], str):
            raise ValueError(f"[llm] Campo obrigatório ausente ou tipo inválido em structure_content.{caminho} (esperado: str).")

    for bloco, caminho, campo in campos_lista:
        if campo not in bloco or not isinstance(bloco[campo], list):
            raise ValueError(f"[llm] Campo obrigatório ausente ou tipo inválido em structure_content.{caminho} (esperado: list).")

    for bloco, caminho, campo in campos_numero:
        if campo not in bloco or not isinstance(bloco[campo], (int, float)):
            raise ValueError(f"[llm] Campo obrigatório ausente ou tipo inválido em structure_content.{caminho} (esperado: number).")

    # proporcao_ideal — dict com 3 números
    proporcao = sc.get("palavras_chave", {}).get("proporcao_ideal")
    if not isinstance(proporcao, dict) or not all(k in proporcao and isinstance(proporcao[k], (int, float)) for k in ("shorttail", "midtail", "longtail")):
        raise ValueError("[llm] Campo obrigatório ausente ou tipo inválido em structure_content.palavras_chave.proporcao_ideal.")

    # slots — lista de dicts com dia, janela, justificativa
    slots = sc.get("postagem", {}).get("slots", [])
    for i, slot in enumerate(slots):
        if not isinstance(slot, dict) or not all(k in slot for k in ("dia", "janela", "justificativa")):
            raise ValueError(f"[llm] Slot {i} de postagem.slots incompleto ou malformado.")


def _validar_script_content(dados: dict) -> None:
    """Valida presença e tipo dos campos obrigatórios em script_content."""
    sk = dados.get("script_content", {})

    campos_string = [
        (sk.get("estrutura", {}), "estrutura.instrucao", "instrucao"),
        (sk.get("gancho", {}), "gancho.instrucao", "instrucao"),
        (sk.get("ritmo", {}), "ritmo.instrucao", "instrucao"),
        (sk.get("audio", {}), "audio.instrucao", "instrucao"),
        (sk.get("repeticao", {}), "repeticao.instrucao", "instrucao"),
        (sk.get("cta", {}), "cta.instrucao", "instrucao"),
        (sk.get("vocabulario_geral", {}), "vocabulario_geral.instrucao", "instrucao"),
        (sk.get("arco_emocional", {}).get("inicio", {}), "arco_emocional.inicio.instrucao", "instrucao"),
        (sk.get("arco_emocional", {}).get("meio", {}), "arco_emocional.meio.instrucao", "instrucao"),
        (sk.get("arco_emocional", {}).get("fim", {}), "arco_emocional.fim.instrucao", "instrucao"),
    ]

    campos_lista = [
        (sk.get("vocabulario_geral", {}), "vocabulario_geral.termos_recomendados", "termos_recomendados"),
        (sk.get("vocabulario_geral", {}), "vocabulario_geral.coocorrencias", "coocorrencias"),
    ]

    campos_numero = [
        (sk.get("estrutura", {}), "estrutura.limite_palavras", "limite_palavras"),
    ]

    for bloco, caminho, campo in campos_string:
        if campo not in bloco or not isinstance(bloco[campo], str):
            raise ValueError(f"[llm] Campo obrigatório ausente ou tipo inválido em script_content.{caminho} (esperado: str).")

    for bloco, caminho, campo in campos_lista:
        if campo not in bloco or not isinstance(bloco[campo], list):
            raise ValueError(f"[llm] Campo obrigatório ausente ou tipo inválido em script_content.{caminho} (esperado: list).")

    for bloco, caminho, campo in campos_numero:
        if campo not in bloco or not isinstance(bloco[campo], (int, float)):
            raise ValueError(f"[llm] Campo obrigatório ausente ou tipo inválido em script_content.{caminho} (esperado: number).")


def parsear_resposta(texto: str) -> dict:
    """
    Limpa, parseia e valida o JSON retornado pela chamada de geração final.
    Lança ValueError se inválido ou incompleto.
    """
    texto_limpo = _limpar_markdown(texto)

    try:
        dados = json.loads(texto_limpo)
    except json.JSONDecodeError as e:
        raise ValueError(f"[llm] JSON inválido retornado pelo Gemini: {e}")

    if "structure_content" not in dados:
        raise ValueError("[llm] Campo 'structure_content' ausente na resposta.")
    if "script_content" not in dados:
        raise ValueError("[llm] Campo 'script_content' ausente na resposta.")

    _validar_structure_content(dados)
    _validar_script_content(dados)

    return dados


def parsear_resposta_limpeza(texto: str) -> dict:
    """
    Limpa e parseia o JSON retornado pela chamada de limpeza.
    Valida apenas que o resultado é um dict com a chave 'nicho' presente —
    não há schema de saída próprio pra validar aqui, já que a estrutura
    deve espelhar 1:1 a estrutura de entrada (o JSON bruto do ML).
    Lança ValueError se inválido.
    """
    texto_limpo = _limpar_markdown(texto)

    try:
        dados = json.loads(texto_limpo)
    except json.JSONDecodeError as e:
        raise ValueError(f"[llm] JSON inválido retornado pelo Gemini na limpeza: {e}")

    if not isinstance(dados, dict) or "nicho" not in dados:
        raise ValueError("[llm] Resposta da limpeza não tem a estrutura esperada (faltando 'nicho').")

    return dados


# ════════════════════════════════════════════════════════════════════════════
# BLOCO 5 — PONTO DE ENTRADA
# ════════════════════════════════════════════════════════════════════════════


def gerar_conteudo(padroes: dict, audience_country: Optional[str] = None) -> dict:
    """
    Ponto de entrada principal.
    Fluxo:
        1. Monta prompt de limpeza
        2. Chama Gemini para limpar o JSON bruto do ML
        3. Parseia padroes_limpos
        4. Monta prompt de geração final (com padroes_limpos + audience)
        5. Chama Gemini para gerar e formatar em JSON na mesma passada
        6. Parseia e valida structure_content e script_content
        7. Retorna o dict final
    """
    prompt_limpeza = montar_prompt_limpeza(padroes)
    texto_limpeza = chamar_gemini_limpeza(prompt_limpeza)
    padroes_limpos = parsear_resposta_limpeza(texto_limpeza)

    prompt_final = montar_prompt_final(padroes_limpos, audience_country)
    texto_final = chamar_gemini_final(prompt_final)

    return parsear_resposta(texto_final)
