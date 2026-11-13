"""Números por região (subprefeitura) para o mapa de densidade.

A contagem é feita no banco (GROUP BY), e as 32 regiões sempre aparecem,
com zero onde não há ocorrências.
"""

from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import Row, distinct, func, select
from sqlalchemy.orm import Session

from app.enums import CategoriaOcorrencia, NivelAlerta, OrigemOcorrencia, Prioridade, StatusOcorrencia
from app.models import Confirmacao, HistoricoStatus, Ocorrencia
from app.services.alertas import AlertaRegiao, alertas_por_regiao
from app.services.regioes import carregar_regioes, regiao_por_codigo
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
    alerta: AlertaRegiao  # abertas dos últimos 30 dias (independe de `dias`)


def por_regiao(
    db: Session, origem: OrigemOcorrencia, dias: int | None, agora: datetime | None = None
) -> list[EstatisticaRegiao]:
    agora = agora or datetime.now(UTC)
    aberta = Ocorrencia.status.in_(STATUS_ABERTOS)
    filtros = [Ocorrencia.origem == origem, Ocorrencia.subprefeitura_codigo.is_not(None)]
    if dias is not None:
        filtros.append(Ocorrencia.criado_em >= agora - timedelta(days=dias))

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
    alertas = alertas_por_regiao(db, origem, agora)

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
                alerta=alertas[regiao.codigo],
            )
        )
    return resultado


# ------------------------------------------------------------------ resumo (aba Análises)

FUSO_SP = ZoneInfo("America/Sao_Paulo")
TAMANHO_RANKING = 5


@dataclass(frozen=True)
class ItemCategoria:
    categoria: CategoriaOcorrencia
    total: int


@dataclass(frozen=True)
class Semana:
    inicio: date  # segunda-feira, no horário de São Paulo
    registradas: int
    resolvidas: int


@dataclass(frozen=True)
class ItemRanking:
    codigo: str
    nome: str
    total: int


@dataclass(frozen=True)
class Resumo:
    origem: OrigemOcorrencia
    dias: int | None
    total: int
    abertas: int
    resolvidas: int
    rejeitadas: int
    percentual_resolvidas: float | None
    tempo_medio_resolucao_dias: float | None
    alertas_ativos: int
    regioes_em_atencao: int
    por_categoria: list[ItemCategoria]
    semanal: list[Semana]
    ranking_regioes: list[ItemRanking]


def inicio_da_semana(momento: datetime) -> date:
    """Segunda-feira da semana do momento, no horário de São Paulo."""
    dia = momento.astimezone(FUSO_SP).date()
    return dia - timedelta(days=dia.weekday())


def resumo(db: Session, origem: OrigemOcorrencia, dias: int | None, agora: datetime | None = None) -> Resumo:
    """Indicadores da aba Análises. O período (`dias`) filtra por data de criação.

    `semanal.resolvidas` conta as transições para RESOLVIDA ocorridas em cada semana.
    """
    agora = agora or datetime.now(UTC)
    filtros = [Ocorrencia.origem == origem]
    if dias is not None:
        filtros.append(Ocorrencia.criado_em >= agora - timedelta(days=dias))
    linhas = db.execute(
        select(Ocorrencia.id, Ocorrencia.status, Ocorrencia.categoria, Ocorrencia.subprefeitura_codigo, Ocorrencia.criado_em).where(
            *filtros
        )
    ).all()
    resolucoes = db.execute(
        select(HistoricoStatus.ocorrencia_id, func.max(HistoricoStatus.alterado_em))
        .join(Ocorrencia, Ocorrencia.id == HistoricoStatus.ocorrencia_id)
        .where(Ocorrencia.origem == origem, HistoricoStatus.status_novo == StatusOcorrencia.RESOLVIDA)
        .group_by(HistoricoStatus.ocorrencia_id)
    ).all()
    resolvida_em = dict(resolucoes)

    total = len(linhas)
    status = Counter(linha.status for linha in linhas)
    resolvidas = status[StatusOcorrencia.RESOLVIDA]
    duracoes = [
        (resolvida_em[linha.id] - linha.criado_em).total_seconds() / 86400
        for linha in linhas
        if linha.status == StatusOcorrencia.RESOLVIDA and linha.id in resolvida_em
    ]

    categorias = Counter(linha.categoria for linha in linhas)
    por_regiao = Counter(linha.subprefeitura_codigo for linha in linhas if linha.subprefeitura_codigo)
    ranking = sorted(
        (ItemRanking(codigo=c, nome=r.nome, total=n) for c, n in por_regiao.items() if (r := regiao_por_codigo(c))),
        key=lambda item: (-item.total, item.nome),
    )[:TAMANHO_RANKING]

    alertas = Counter(a.nivel for a in alertas_por_regiao(db, origem, agora).values())
    return Resumo(
        origem=origem,
        dias=dias,
        total=total,
        abertas=sum(status[s] for s in STATUS_ABERTOS),
        resolvidas=resolvidas,
        rejeitadas=status[StatusOcorrencia.REJEITADA],
        percentual_resolvidas=round(resolvidas / total * 100, 1) if total else None,
        tempo_medio_resolucao_dias=round(sum(duracoes) / len(duracoes), 1) if duracoes else None,
        alertas_ativos=alertas[NivelAlerta.ALERTA],
        regioes_em_atencao=alertas[NivelAlerta.ATENCAO],
        por_categoria=[ItemCategoria(categoria=c, total=categorias[c]) for c in CategoriaOcorrencia],
        semanal=_semanas(linhas, list(resolvida_em.values()), dias, agora),
        ranking_regioes=ranking,
    )


def _semanas(linhas: Sequence[Row[Any]], resolucoes: list[datetime], dias: int | None, agora: datetime) -> list[Semana]:
    if not linhas:
        return []
    primeira = inicio_da_semana(agora - timedelta(days=dias)) if dias is not None else min(
        inicio_da_semana(linha.criado_em) for linha in linhas
    )
    ultima = inicio_da_semana(agora)
    registradas = Counter(inicio_da_semana(linha.criado_em) for linha in linhas)
    resolvidas = Counter(inicio_da_semana(momento) for momento in resolucoes)
    semanas = []
    inicio = primeira
    while inicio <= ultima:
        semanas.append(Semana(inicio=inicio, registradas=registradas[inicio], resolvidas=resolvidas[inicio]))
        inicio += timedelta(days=7)
    return semanas
