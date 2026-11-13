"""Números por região (subprefeitura) para o mapa de densidade.

A contagem é feita no banco (GROUP BY), e as 32 regiões sempre aparecem,
com zero onde não há ocorrências.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session

from app.enums import OrigemOcorrencia, Prioridade, StatusOcorrencia
from app.models import Confirmacao, Ocorrencia
from app.services.regioes import carregar_regioes
from app.services.transicoes import STATUS_ABERTOS


@dataclass(frozen=True)
class EstatisticaRegiao:
    codigo: str
    nome: str
    total: int
    abertas: int
    alta_abertas: int
    resolvidas: int
    confirmacoes: int  # soma das confirmações das ocorrências abertas
    densidade_km2: float  # ocorrências no período ÷ área oficial da região


def por_regiao(db: Session, origem: OrigemOcorrencia, dias: int | None) -> list[EstatisticaRegiao]:
    aberta = Ocorrencia.status.in_(STATUS_ABERTOS)
    filtros = [Ocorrencia.origem == origem, Ocorrencia.subprefeitura_codigo.is_not(None)]
    if dias is not None:
        filtros.append(Ocorrencia.criado_em >= datetime.now(UTC) - timedelta(days=dias))

    consulta = (
        select(
            Ocorrencia.subprefeitura_codigo,
            func.count(distinct(Ocorrencia.id)),
            func.count(distinct(Ocorrencia.id)).filter(aberta),
            func.count(distinct(Ocorrencia.id)).filter(aberta, Ocorrencia.prioridade == Prioridade.ALTA),
            func.count(distinct(Ocorrencia.id)).filter(Ocorrencia.status == StatusOcorrencia.RESOLVIDA),
            func.count(Confirmacao.id).filter(aberta),
        )
        .select_from(Ocorrencia)
        .outerjoin(Confirmacao, Confirmacao.ocorrencia_id == Ocorrencia.id)
        .where(*filtros)
        .group_by(Ocorrencia.subprefeitura_codigo)
    )
    contagens = {linha[0]: linha[1:] for linha in db.execute(consulta)}

    resultado = []
    for regiao in carregar_regioes():
        total, abertas, alta, resolvidas, confirmacoes = contagens.get(regiao.codigo, (0, 0, 0, 0, 0))
        resultado.append(
            EstatisticaRegiao(
                codigo=regiao.codigo,
                nome=regiao.nome,
                total=total,
                abertas=abertas,
                alta_abertas=alta,
                resolvidas=resolvidas,
                confirmacoes=confirmacoes,
                densidade_km2=round(total / regiao.area_km2, 3),
            )
        )
    return resultado
