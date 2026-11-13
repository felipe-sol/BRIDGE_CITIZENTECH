from typing import Annotated

from fastapi import APIRouter, Query

from app.deps import DbSession
from app.enums import OrigemOcorrencia
from app.schemas import ErroResposta, EstatisticaRegiaoResposta, EstatisticasRegioesResposta
from app.services import estatisticas as servico

router = APIRouter(prefix="/estatisticas", tags=["estatisticas"])


@router.get(
    "/regioes",
    response_model=EstatisticasRegioesResposta,
    summary="Ocorrências por subprefeitura (total, abertas, alta gravidade, resolvidas, densidade por km²)",
    responses={422: {"model": ErroResposta}},
)
def por_regiao(
    db: DbSession,
    origem: Annotated[
        OrigemOcorrencia, Query(description="APP = registros reais (padrão); SIMULADA = dados fictícios.")
    ] = OrigemOcorrencia.APP,
    dias: Annotated[int | None, Query(ge=1, le=365, description="Só as criadas nos últimos N dias.")] = None,
) -> EstatisticasRegioesResposta:
    itens = servico.por_regiao(db, origem, dias)
    return EstatisticasRegioesResposta(
        origem=origem,
        dias=dias,
        itens=[EstatisticaRegiaoResposta.model_validate(i, from_attributes=True) for i in itens],
    )
