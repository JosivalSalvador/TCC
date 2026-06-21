from fastapi import APIRouter, HTTPException

from src.api.schemas import NichoRequest, NichoResponse
from src.services.inferencia_ml import inferir
from src.services.llm import gerar_conteudo

router = APIRouter()


# ════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════


@router.post(
    "/analisar-nicho",
    response_model=NichoResponse,
    summary="Analisa um nicho e gera estrutura + roteiro viral",
    description="""
    Recebe o nome de um nicho e opcionalmente o público-alvo.
    Retorna estrutura completa do vídeo + sugestão de roteiro
    gerados com base nos padrões dos vídeos mais virais do nicho.
    
    Se o nicho não existir no dataset, ativa o fallback
    por similaridade semântica e usa o nicho mais próximo.
    """,
)
def analisar_nicho(request: NichoRequest) -> NichoResponse:
    resultado = inferir(request.nicho)

    if "erro" in resultado:
        raise HTTPException(status_code=404, detail=resultado["erro"])

    conteudo = gerar_conteudo(
        padroes=resultado["padroes"],
        audience_country=request.audience_country,
    )

    return NichoResponse(
        nicho_solicitado=resultado["nicho_solicitado"],
        nicho_utilizado=resultado["nicho_utilizado"],
        fallback_usado=resultado["fallback_usado"],
        structure_content=conteudo["structure_content"],
        script_content=conteudo["script_content"],
    )


@router.post("/debug-ml")
def debug_ml(request: NichoRequest):
    resultado = inferir(request.nicho)
    return resultado
