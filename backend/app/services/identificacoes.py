"""Casos de uso de Identificação (pseudônimo do cidadão; não é autenticação)."""

import uuid
from dataclasses import dataclass

from sqlalchemy import distinct, func, or_, select
from sqlalchemy.orm import Session

from app.enums import OrigemOcorrencia, StatusOcorrencia
from app.errors import nao_encontrado
from app.models import AvisoNaoResolvido, Confirmacao, Identificacao, Ocorrencia
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


def trocar_apelido(db: Session, identificacao_id: uuid.UUID, apelido: str) -> Identificacao:
    """Troca o apelido da PRÓPRIA identificação (a do cabeçalho)."""
    identificacao = obter_identificacao(db, identificacao_id)
    identificacao.apelido = apelido
    db.commit()
    db.refresh(identificacao)
    return identificacao


@dataclass(frozen=True)
class Participacao:
    registradas: int
    confirmadas: int
    resolvidas_acompanhadas: int  # registradas OU confirmadas pela pessoa que estão RESOLVIDA
    avisos_nao_resolvido: int


def participacao(db: Session, identificacao_id: uuid.UUID) -> Participacao:
    """O que a pessoa já fez no Bridge (só registros reais). Zeros para quem ainda não fez nada."""
    obter_identificacao(db, identificacao_id)
    reais = Ocorrencia.origem == OrigemOcorrencia.APP
    registradas = db.scalar(
        select(func.count()).select_from(Ocorrencia).where(reais, Ocorrencia.identificacao_id == identificacao_id)
    )
    confirmadas = db.scalar(
        select(func.count(Confirmacao.id))
        .join(Ocorrencia, Ocorrencia.id == Confirmacao.ocorrencia_id)
        .where(reais, Confirmacao.identificacao_id == identificacao_id)
    )
    confirmou = select(Confirmacao.ocorrencia_id).where(Confirmacao.identificacao_id == identificacao_id)
    resolvidas = db.scalar(
        select(func.count(distinct(Ocorrencia.id))).where(
            reais,
            Ocorrencia.status == StatusOcorrencia.RESOLVIDA,
            or_(Ocorrencia.identificacao_id == identificacao_id, Ocorrencia.id.in_(confirmou)),
        )
    )
    avisos = db.scalar(
        select(func.count(AvisoNaoResolvido.id)).where(AvisoNaoResolvido.identificacao_id == identificacao_id)
    )
    return Participacao(
        registradas=registradas or 0,
        confirmadas=confirmadas or 0,
        resolvidas_acompanhadas=resolvidas or 0,
        avisos_nao_resolvido=avisos or 0,
    )
