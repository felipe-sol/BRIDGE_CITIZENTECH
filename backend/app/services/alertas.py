"""Alerta Bridge por região (subprefeitura): calculado automaticamente a partir dos relatos.

Regra (docs/REGRAS_DE_NEGOCIO.md):
- considera as ocorrências ABERTAS (aberta, em análise, em andamento) da origem pedida,
  criadas nos últimos JANELA_ALERTA_DIAS dias;
- índice = Σ (pontuação de prioridade + mín(confirmações, MAX_CONFIRMACOES_NO_INDICE));
- ATENCAO quando índice ≥ LIMIAR_ATENCAO;
- ALERTA quando índice ≥ LIMIAR_ALERTA e há pelo menos MIN_ALTAS_PARA_ALERTA abertas de
  prioridade ALTA.
Não é alerta oficial de nenhum órgão.
"""

from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import NivelAlerta, OrigemOcorrencia, Prioridade
from app.models import Ocorrencia
from app.services.regioes import carregar_regioes
from app.services.transicoes import STATUS_ABERTOS

JANELA_ALERTA_DIAS = 30
MAX_CONFIRMACOES_NO_INDICE = 5
MIN_ALTAS_PARA_ALERTA = 3
# Calibrados em 13/11/2026 com o Exemplo (semente 2026, 1.200 ocorrências, 120 dias):
# índice da região típica = 27; ATENCAO ≈ 1,7× a típica; ALERTA > 3× a típica e ≥ 3 altas.
# Resultado no Exemplo: 3 regiões em ALERTA e 7 em ATENCAO (teste test_calibracao_do_exemplo).
LIMIAR_ATENCAO = 45
LIMIAR_ALERTA = 90


@dataclass(frozen=True)
class AlertaRegiao:
    nivel: NivelAlerta
    indice: int
    abertas_30d: int
    abertas_alta_30d: int


def indice_alerta(itens: Iterable[tuple[int, int]]) -> int:
    """Cada item é (pontuação de prioridade, confirmações)."""
    return sum(pontuacao + min(confirmacoes, MAX_CONFIRMACOES_NO_INDICE) for pontuacao, confirmacoes in itens)


def nivel_alerta(indice: int, abertas_alta: int) -> NivelAlerta:
    if indice >= LIMIAR_ALERTA and abertas_alta >= MIN_ALTAS_PARA_ALERTA:
        return NivelAlerta.ALERTA
    if indice >= LIMIAR_ATENCAO:
        return NivelAlerta.ATENCAO
    return NivelAlerta.NORMAL


def alerta_de(itens: list[tuple[int, int, bool]]) -> AlertaRegiao:
    """Itens = (pontuação, confirmações, é ALTA) das abertas recentes de uma região."""
    indice = indice_alerta((p, c) for p, c, _ in itens)
    altas = sum(1 for _, _, alta in itens if alta)
    return AlertaRegiao(nivel=nivel_alerta(indice, altas), indice=indice, abertas_30d=len(itens), abertas_alta_30d=altas)


def alertas_por_regiao(db: Session, origem: OrigemOcorrencia, agora: datetime) -> dict[str, AlertaRegiao]:
    """Alerta de cada uma das 32 regiões (NORMAL e zeros onde não há abertas recentes)."""
    consulta = select(
        Ocorrencia.subprefeitura_codigo,
        Ocorrencia.prioridade_pontuacao,
        Ocorrencia.confirmacoes_total,
        Ocorrencia.prioridade,
    ).where(
        Ocorrencia.origem == origem,
        Ocorrencia.status.in_(STATUS_ABERTOS),
        Ocorrencia.subprefeitura_codigo.is_not(None),
        Ocorrencia.criado_em >= agora - timedelta(days=JANELA_ALERTA_DIAS),
    )
    por_regiao: dict[str, list[tuple[int, int, bool]]] = defaultdict(list)
    for codigo, pontuacao, confirmacoes, prioridade in db.execute(consulta):
        por_regiao[codigo].append((pontuacao, confirmacoes, prioridade == Prioridade.ALTA))
    return {r.codigo: alerta_de(por_regiao.get(r.codigo, [])) for r in carregar_regioes()}
