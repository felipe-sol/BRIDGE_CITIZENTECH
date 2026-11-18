from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.deps import Classificador, DbSession
from app.schemas import HealthResposta, ModeloIAStatus

VERSAO_API = "2.0.0"

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=HealthResposta,
    summary="Verifica API, banco e disponibilidade do modelo de IA",
    responses={503: {"model": HealthResposta, "description": "Banco indisponível"}},
)
def health(db: DbSession, classificador: Classificador) -> HealthResposta | JSONResponse:
    modelo = ModeloIAStatus(disponivel=classificador.disponivel, versao=classificador.versao)
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        corpo = HealthResposta(status="degradado", banco="indisponivel", modelo_ia=modelo, versao_api=VERSAO_API)
        return JSONResponse(status_code=503, content=corpo.model_dump(mode="json"))
    return HealthResposta(status="ok", banco="ok", modelo_ia=modelo, versao_api=VERSAO_API)
