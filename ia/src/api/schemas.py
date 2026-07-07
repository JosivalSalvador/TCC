from typing import Optional

from pydantic import BaseModel, field_validator

# ════════════════════════════════════════════════════════════════════════════
# REQUEST
# ════════════════════════════════════════════════════════════════════════════


class NichoRequest(BaseModel):
    """
    Entrada do endpoint — nome do nicho e público-alvo opcional.
    """

    nicho: str
    audience_country: Optional[str] = None

    @field_validator("nicho")
    @classmethod
    def nicho_nao_vazio(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("O campo 'nicho' não pode ser vazio.")
        return v.lower()


# ════════════════════════════════════════════════════════════════════════════
# RESPONSE
# ════════════════════════════════════════════════════════════════════════════


class NichoResponse(BaseModel):
    """
    Saída do endpoint — conteúdo gerado pela LLM pronto para salvar.
    """

    nicho_solicitado: str
    nicho_utilizado: str
    fallback_usado: bool
    structure_content: dict
    script_content: dict
