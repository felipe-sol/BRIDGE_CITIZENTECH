"""Confirmações ("eu também vi"): outra pessoa relata o mesmo problema.

Regras (docs/REGRAS_DE_NEGOCIO.md): no máximo uma por identificação e ocorrência;
não vale para a própria ocorrência, para ocorrências encerradas nem para dados
fictícios. A confirmação NÃO altera a prioridade da ocorrência.
"""

import uuid

from fastapi import status as http
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.enums import OrigemOcorrencia
from app.errors import ErroAPI, nao_encontrado
from app.models import Confirmacao, Identificacao, Ocorrencia
from app.schemas import RelacaoResposta
from app.services.transicoes import STATUS_ABERTOS


def _ocorrencia_e_identificacao(db: Session, ocorrencia_id: int, identificacao_id: uuid.UUID) -> Ocorrencia:
    ocorrencia = db.get(Ocorrencia, ocorrencia_id)
    if ocorrencia is None:
        raise nao_encontrado("Ocorrência")
    if db.get(Identificacao, identificacao_id) is None:
        raise ErroAPI(
            http.HTTP_422_UNPROCESSABLE_CONTENT,
            "IDENTIFICACAO_INEXISTENTE",
            "A identificação informada não existe. Cadastre-se novamente no app.",
            [{"campo": "X-Identificacao-Id", "mensagem": "Identificação não encontrada."}],
        )
    return ocorrencia


def contar(db: Session, ocorrencia_id: int) -> int:
    return db.scalar(select(func.count(Confirmacao.id)).where(Confirmacao.ocorrencia_id == ocorrencia_id)) or 0


def confirmar(db: Session, ocorrencia_id: int, identificacao_id: uuid.UUID) -> tuple[int, bool]:
    """Registra a confirmação. Devolve (total de confirmações, criada_agora)."""
    ocorrencia = _ocorrencia_e_identificacao(db, ocorrencia_id, identificacao_id)
    if ocorrencia.origem == OrigemOcorrencia.SIMULADA:
        raise ErroAPI(
            http.HTTP_409_CONFLICT, "OCORRENCIA_SIMULADA", "Esta ocorrência é um dado fictício de demonstração."
        )
    if ocorrencia.identificacao_id == identificacao_id:
        raise ErroAPI(
            http.HTTP_409_CONFLICT, "PROPRIA_OCORRENCIA", "Você registrou esta ocorrência; não é preciso confirmá-la."
        )
    if ocorrencia.status not in STATUS_ABERTOS:
        raise ErroAPI(
            http.HTTP_409_CONFLICT,
            "OCORRENCIA_ENCERRADA",
            f"Esta ocorrência já está encerrada ({ocorrencia.status.value}) e não recebe confirmações.",
        )

    ja_existe = db.scalar(
        select(Confirmacao.id).where(
            Confirmacao.ocorrencia_id == ocorrencia_id, Confirmacao.identificacao_id == identificacao_id
        )
    )
    criada = False
    if ja_existe is None:
        db.add(Confirmacao(ocorrencia_id=ocorrencia_id, identificacao_id=identificacao_id))
        try:
            db.commit()
            criada = True
        except IntegrityError:
            # Dois toques simultâneos: a restrição UNIQUE garante uma só confirmação.
            db.rollback()
    return contar(db, ocorrencia_id), criada


def desfazer(db: Session, ocorrencia_id: int, identificacao_id: uuid.UUID) -> int:
    """Remove a confirmação (idempotente). Devolve o total restante."""
    _ocorrencia_e_identificacao(db, ocorrencia_id, identificacao_id)
    db.execute(
        delete(Confirmacao).where(
            Confirmacao.ocorrencia_id == ocorrencia_id, Confirmacao.identificacao_id == identificacao_id
        )
    )
    db.commit()
    return contar(db, ocorrencia_id)


def relacao(db: Session, ocorrencia: Ocorrencia, identificacao_id: uuid.UUID) -> RelacaoResposta:
    """O que esta identificação tem com a ocorrência (sem expor quem é o autor)."""
    confirmei = db.scalar(
        select(Confirmacao.id).where(
            Confirmacao.ocorrencia_id == ocorrencia.id, Confirmacao.identificacao_id == identificacao_id
        )
    )
    return RelacaoResposta(registrei=ocorrencia.identificacao_id == identificacao_id, confirmei=confirmei is not None)
