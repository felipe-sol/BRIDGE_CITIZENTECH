"""Avisos "Ainda não foi resolvido? Avise": a pessoa discorda de uma resolução.

Regras (docs/REGRAS_DE_NEGOCIO.md, seção 10): só em ocorrência RESOLVIDA e real (APP);
um aviso por identificação e ocorrência; pode ser desfeito; quem registrou também pode
avisar. O aviso NÃO reabre a ocorrência nem muda status ou prioridade: conta e aparece
no detalhe para a equipe responsável.
"""

import uuid

from fastapi import status as http
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.enums import OrigemOcorrencia, StatusOcorrencia
from app.errors import ErroAPI
from app.models import AvisoNaoResolvido
from app.services.confirmacoes import ocorrencia_e_identificacao


def contar(db: Session, ocorrencia_id: int) -> int:
    return (
        db.scalar(select(func.count(AvisoNaoResolvido.id)).where(AvisoNaoResolvido.ocorrencia_id == ocorrencia_id))
        or 0
    )


def avisar(db: Session, ocorrencia_id: int, identificacao_id: uuid.UUID) -> tuple[int, bool]:
    """Registra o aviso. Devolve (total de avisos, criado_agora)."""
    ocorrencia = ocorrencia_e_identificacao(db, ocorrencia_id, identificacao_id)
    if ocorrencia.origem == OrigemOcorrencia.SIMULADA:
        raise ErroAPI(
            http.HTTP_409_CONFLICT, "OCORRENCIA_SIMULADA", "Esta ocorrência é um dado fictício de demonstração."
        )
    if ocorrencia.status != StatusOcorrencia.RESOLVIDA:
        raise ErroAPI(
            http.HTTP_409_CONFLICT, "OCORRENCIA_NAO_RESOLVIDA", "Só dá para avisar em ocorrência resolvida."
        )
    ja_existe = db.scalar(
        select(AvisoNaoResolvido.id).where(
            AvisoNaoResolvido.ocorrencia_id == ocorrencia_id, AvisoNaoResolvido.identificacao_id == identificacao_id
        )
    )
    criado = False
    if ja_existe is None:
        db.add(AvisoNaoResolvido(ocorrencia_id=ocorrencia_id, identificacao_id=identificacao_id))
        try:
            db.commit()
            criado = True
        except IntegrityError:
            # Dois toques simultâneos: a restrição UNIQUE garante um só aviso.
            db.rollback()
    return contar(db, ocorrencia_id), criado


def desfazer(db: Session, ocorrencia_id: int, identificacao_id: uuid.UUID) -> int:
    """Remove o aviso (idempotente). Devolve o total restante."""
    ocorrencia_e_identificacao(db, ocorrencia_id, identificacao_id)
    db.execute(
        delete(AvisoNaoResolvido).where(
            AvisoNaoResolvido.ocorrencia_id == ocorrencia_id, AvisoNaoResolvido.identificacao_id == identificacao_id
        )
    )
    db.commit()
    return contar(db, ocorrencia_id)
