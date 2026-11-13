"""Casos de uso de Identificação (pseudônimo do cidadão; não é autenticação)."""

import uuid

from sqlalchemy.orm import Session

from app.errors import nao_encontrado
from app.models import Identificacao
from app.schemas import IdentificacaoCriar


def criar_identificacao(db: Session, dados: IdentificacaoCriar) -> Identificacao:
    identificacao = Identificacao(apelido=dados.apelido)
    db.add(identificacao)
    db.commit()
    db.refresh(identificacao)
    return identificacao


def obter_identificacao(db: Session, identificacao_id: uuid.UUID) -> Identificacao:
    identificacao = db.get(Identificacao, identificacao_id)
    if identificacao is None:
        raise nao_encontrado("Identificação")
    return identificacao
