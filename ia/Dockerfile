# Usa a imagem oficial e super leve do Python 3.12 (Debian Bookworm)
FROM python:3.12-slim-bookworm

# [MELHOR PRÁTICA 2026]: Copia os binários do uv direto da Astral
# Isso evita instalar curl ou pip para baixar a ferramenta
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# [OTIMIZAÇÕES DE PERFORMANCE DO UV]
# 1. Compila o Python em bytecode no build (o start fica instantâneo)
ENV UV_COMPILE_BYTECODE=1
# 2. Garante que os arquivos sejam copiados, evitando links simbólicos quebrados no Docker
ENV UV_LINK_MODE=copy

WORKDIR /app

# [FIX BUILD ARM64]: hdbscan tem partes em C/Cython e não tem wheel pronta
# pra linux/arm64 no PyPI, então o uv precisa compilar do zero — o que exige
# um compilador C instalado na imagem (a slim não vem com isso por padrão).
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# --- ETAPA DE CACHE 1: DEPENDÊNCIAS ---
# Copia APENAS os locks primeiro
COPY pyproject.toml uv.lock ./
# Instala as bibliotecas puras (ignora pacotes de teste e não tenta instalar a pasta do projeto ainda)
RUN uv sync --frozen --no-dev --no-install-project

# --- ETAPA DE CACHE 2: CÓDIGO FONTE ---
# Agora sim copiamos o seu código (src/main.py, etc)
COPY . .
# Sincroniza o projeto em si (super rápido, pois as libs já estão instaladas)
RUN uv sync --frozen --no-dev

# Segurança: Criação de usuário não-root (Padrão ouro do Docker)
RUN addgroup --system --gid 1001 pythonapp && \
    adduser --system --uid 1001 fastapiuser
RUN chown -R fastapiuser:pythonapp /app
USER fastapiuser

EXPOSE 8000
ENV PORT=8000
ENV HOST="0.0.0.0"

# [MUDANÇA 2026]: Colocamos o ambiente virtual invisível do uv direto no PATH
# Assim, não precisamos nem rodar "uv run", o contêiner já entende o comando fastapi nativamente!
ENV PATH="/app/.venv/bin:$PATH"

# Comando final limpo, puro Python/FastAPI, sem Node.js no meio.
# Comando final limpo, puro Python/FastAPI, sem Node.js no meio.
CMD ["sh", "-c", "fastapi run src/main.py --host $HOST --port $PORT"]