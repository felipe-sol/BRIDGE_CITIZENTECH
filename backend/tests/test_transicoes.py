import pytest

from app.enums import StatusOcorrencia as S
from app.services.transicoes import transicao_permitida

PERMITIDAS = {
    (S.ABERTA, S.EM_ANALISE),
    (S.ABERTA, S.REJEITADA),
    (S.EM_ANALISE, S.EM_ANDAMENTO),
    (S.EM_ANALISE, S.REJEITADA),
    (S.EM_ANDAMENTO, S.RESOLVIDA),
}


@pytest.mark.parametrize("atual", list(S))
@pytest.mark.parametrize("novo", list(S))
def test_matriz_de_transicoes(atual: S, novo: S) -> None:
    assert transicao_permitida(atual, novo) == ((atual, novo) in PERMITIDAS)


def test_status_finais_nao_saem() -> None:
    for final in (S.RESOLVIDA, S.REJEITADA):
        assert not any(transicao_permitida(final, novo) for novo in S)
