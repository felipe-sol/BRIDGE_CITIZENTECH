"""Transições de status permitidas (docs/REGRAS_DE_NEGOCIO.md, seção 2)."""

from app.enums import StatusOcorrencia as S

TRANSICOES_PERMITIDAS: dict[S, frozenset[S]] = {
    S.ABERTA: frozenset({S.EM_ANALISE, S.REJEITADA}),
    S.EM_ANALISE: frozenset({S.EM_ANDAMENTO, S.REJEITADA}),
    S.EM_ANDAMENTO: frozenset({S.RESOLVIDA}),
    S.RESOLVIDA: frozenset(),
    S.REJEITADA: frozenset(),
}

# Ainda não encerradas: podem receber confirmações e contam para alertas/duplicatas.
STATUS_ABERTOS: tuple[S, ...] = (S.ABERTA, S.EM_ANALISE, S.EM_ANDAMENTO)


def transicao_permitida(atual: S, novo: S) -> bool:
    return novo in TRANSICOES_PERMITIDAS[atual]


def destinos_possiveis(atual: S) -> list[str]:
    return sorted(s.value for s in TRANSICOES_PERMITIDAS[atual])
