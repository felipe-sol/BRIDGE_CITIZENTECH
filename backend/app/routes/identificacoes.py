import uuid
from typing import Annotated

from fastapi import APIRouter, Header, status

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


# Declarada antes de /{identificacao_id} para "atual" não ser lida como UUID.
@router.get(
    "/atual",
    response_model=IdentificacaoResposta,
    summary="Confere a identificação salva no app (UUID no cabeçalho, nunca na URL)",
    responses={404: {"model": ErroResposta}, 422: {"model": ErroResposta}},
)
def obter_atual(
    x_identificacao_id: Annotated[
        uuid.UUID,
        Header(description="UUID da identificação salva no app (no cabeçalho para não aparecer em URLs e logs de acesso)."),
    ],
    db: DbSession,
) -> IdentificacaoResposta:
    return IdentificacaoResposta.de_modelo(servico.obter_identificacao(db, x_identificacao_id))


@router.get(
    "/{identificacao_id}",
    response_model=IdentificacaoResposta,
    summary="Consulta uma identificação pelo caminho (obsoleta: use GET /identificacoes/atual)",
    description="Mantida por compatibilidade com os testes manuais da Rodada 1. O app usa `/identificacoes/atual`.",
    deprecated=True,
    responses={404: {"model": ErroResposta}, 422: {"model": ErroResposta}},
)
def obter(identificacao_id: uuid.UUID, db: DbSession) -> IdentificacaoResposta:
    return IdentificacaoResposta.de_modelo(servico.obter_identificacao(db, identificacao_id))
