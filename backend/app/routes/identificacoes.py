import uuid

from fastapi import APIRouter, status

from app.deps import DbSession
from app.schemas import ErroResposta, IdentificacaoCriar, IdentificacaoResposta
from app.services import identificacoes as servico

router = APIRouter(prefix="/identificacoes", tags=["identificacoes"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=IdentificacaoResposta,
    summary="Cria a identificação (pseudônimo) do cidadão — não é login",
    responses={422: {"model": ErroResposta}},
)
def criar(dados: IdentificacaoCriar, db: DbSession) -> IdentificacaoResposta:
    return IdentificacaoResposta.de_modelo(servico.criar_identificacao(db, dados))


@router.get(
    "/{identificacao_id}",
    response_model=IdentificacaoResposta,
    summary="Consulta uma identificação (o app confirma a identificação salva ao reabrir)",
    responses={404: {"model": ErroResposta}, 422: {"model": ErroResposta}},
)
def obter(identificacao_id: uuid.UUID, db: DbSession) -> IdentificacaoResposta:
    return IdentificacaoResposta.de_modelo(servico.obter_identificacao(db, identificacao_id))
