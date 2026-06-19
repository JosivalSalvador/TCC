from fastapi import FastAPI

from src.api.rotas import router

# ════════════════════════════════════════════════════════════════════════════
# APLICAÇÃO
# ════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="YouTube Viral API",
    description="Analisa padrões de vídeos virais por nicho e retorna contexto mastigado para geração de roteiros.",
    version="1.0.0",
)

app.include_router(router, prefix="/api/v1")


# ════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ════════════════════════════════════════════════════════════════════════════


@app.get("/health")
def health():
    return {"status": "ok"}
