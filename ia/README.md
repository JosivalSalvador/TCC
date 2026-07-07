# ia

Serviço de IA em Python, responsável pela coleta, processamento e geração de roteiros a partir de vídeos curtos (YouTube Shorts) para criadores de conteúdo. Um dos três serviços do monorepo — veja o [README raiz](../README.md) para a visão geral do projeto.

> **Nota de transparência**: este README documenta duas camadas. A primeira é o **serviço FastAPI já implementado** (setup, tooling, contêiner). A segunda é a **arquitetura do pipeline de análise**, que é o núcleo do projeto de pesquisa — descrita aqui em nível conceitual, já que os módulos de coleta/ML/LLM evoluem em um ritmo diferente do esqueleto de infraestrutura. Consulte o código-fonte em `src/` para o estado exato de cada etapa.

## Stack

- **Python 3.12**
- **FastAPI** (modo `standard`, com Uvicorn, Jinja2, python-multipart etc. inclusos)
- **uv** ([Astral](https://astral.sh/uv)) como gerenciador de pacotes e ambiente — substitui pip/venv/poetry
- **Ruff** para lint e formatação
- **Pyright** para verificação de tipos
- **Pytest** para testes

### Pipeline de ML/NLP (por módulo, conforme a arquitetura do projeto)

- **NLTK** (stopwords)
- **TextBlob** para análise de sentimento (texto limpo sem pontuação torna o VADER inadequado para este pipeline)
- **Sentence-BERT (SBERT)** para embeddings semânticos
- **K-Means** e **HDBSCAN** para clusterização
- **TF-IDF** (scikit-learn)
- **`lingua`** para detecção de idioma
- **`GoogleTranslator`** para tradução
- **Gemini Vision** (`gemini-2.5-flash-lite`) para extração de sinais visuais dos vídeos

## Arquitetura do pipeline

O sistema é dividido em camadas de dados (nomenclatura interna do projeto: *Camada Prata* → *Camada Ouro*), com um princípio de design central:

> **A ML extrai e reconhece padrões. A LLM só traduz e adapta culturalmente para português brasileiro — ela nunca inventa conteúdo.**

Essa separação de responsabilidades é a decisão arquitetural mais importante do projeto: qualquer dado analítico (padrões, scores, clusters) vem exclusivamente do lado de ML; a LLM entra apenas na etapa final de localização.

### Sequência de execução (visão conceitual)

```
coletor_youtube.py       → coleta de vídeos e metadados
extrator_legendas.py     → extração de legendas/transcrições
02_pre_processa.py       → pré-processamento NLP em passe único
03_treinamento.py        → treinamento dos modelos de padrão
inferencia_ml.py         → inferência sobre novos vídeos
llm.py                   → tradução e adaptação cultural do output da ML (pt-BR)
```

Todo o texto é padronizado para inglês antes de entrar na etapa de NLP/ML — a tradução/adaptação para português acontece só no fim, na camada da LLM.

### Geração de features em duas fases

1. **Fase 1** — gera os campos base em inglês (`titulo_en`, `descricao_en`, `texto_falado_limpo_en`, `palavras_chave_en`, `pistas_audio_en`, além dos campos visuais do Gemini)
2. **Fase 2** — computa todas as features derivadas a partir dos campos `_en` da Fase 1

### Decisões técnicas relevantes do pré-processamento

- **Passe único**: `02_pre_processa.py` roda em uma única passada — não há arquitetura de "duas passadas" de refinamento
- `estrutura_blocos` (K-Means) e `clickbait_score` (SBERT) são ambos computados no *Bloco 0* do pré-processamento
- Rótulos de cluster são **descobertos dinamicamente** (`formato_1`, `formato_2`, ...) em vez de fixos, para acomodar nichos de conteúdo diversos; o valor de K é escolhido dinamicamente via *silhouette score*
- Stopwords vêm sempre de `nltk.corpus.stopwords`, nunca de listas manuais
- Marcadores de áudio (ex.: `[♪]`, `[_]`) são preservados como estão, sem passar por validação de tradução
- Saídas do Gemini seguem um padrão de *verificação* (não de tradução), já que o modelo já responde em inglês
- Detecção de idioma via `lingua` é pouco confiável em tokens isolados (~74% de acurácia); por isso a validação roda sobre a string completa, pula textos com 2 palavras ou menos, e usa um limite de tentativas (`max_tentativas`) para evitar loops infinitos em transcrições contaminadas

## Rodando localmente

```bash
# a partir da raiz do monorepo
npm run dev:ia

# ou, dentro da pasta ia/
uv sync              # instala as dependências (equivalente ao "install")
uv run --env-file .env fastapi dev src/main.py
```

O `package.json` do serviço existe apenas como ponte para o `uv` dentro do Turborepo — não há runtime Node.js envolvido na execução real do serviço.

### Variáveis de ambiente

Copie `.env.example` para `.env` (o exemplo de produção está em `.env.prod.example`).

## Testes

```bash
uv run pytest
```

Hoje há apenas um teste placeholder (`test_main.py`) garantindo que o CI não quebre enquanto a suíte real de testes do pipeline ainda está em construção.

## Lint e tipagem

```bash
uv run ruff check .          # lint
uv run ruff format .         # formatação
uv run pyright               # verificação de tipos
```

Configuração do Ruff em `pyproject.toml`: `line-length = 100`, `target-version = "py312"`, regras `E`, `F`, `I` (pycodestyle, pyflakes, isort).

## Build e produção

```bash
docker build -f ia/Dockerfile -t tcc-ia ./ia
```

O `Dockerfile` usa a imagem oficial `python:3.12-slim-bookworm` com o binário do `uv` copiado direto da distribuição oficial da Astral (`ghcr.io/astral-sh/uv`), evitando a necessidade de `curl` ou `pip` só para instalar a ferramenta.

Otimizações aplicadas:

- `UV_COMPILE_BYTECODE=1` — compila o Python em bytecode durante o build, deixando o start do contêiner mais rápido
- `UV_LINK_MODE=copy` — copia os arquivos em vez de usar symlinks, evitando links quebrados dentro do contêiner
- **Cache em duas etapas**: primeiro copia só `pyproject.toml` + `uv.lock` e instala as dependências (`--no-install-project`), depois copia o código-fonte e sincroniza o projeto em si — assim, mudanças no código não invalidam o cache de dependências
- O ambiente virtual do `uv` é colocado diretamente no `PATH`, então o contêiner reconhece o comando `fastapi` nativamente, sem precisar de `uv run`
- Container roda como usuário não-root (`fastapiuser`)

Comando final: `fastapi run src/main.py --host 0.0.0.0 --port 8000`.

## Estrutura de pastas

```
ia/
├── src/
│   ├── main.py          # aplicação FastAPI
│   └── test_main.py     # testes
├── pyproject.toml        # dependências e configuração do Ruff
├── uv.lock                # lockfile de dependências
├── .python-version        # 3.12
└── Dockerfile
```

Os módulos do pipeline de coleta/pré-processamento/ML/LLM descritos na seção de arquitetura acima evoluem dentro de `src/` conforme o desenvolvimento do TCC avança — consulte o código para o estado atual de cada etapa.