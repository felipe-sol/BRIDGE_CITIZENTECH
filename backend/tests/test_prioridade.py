import itertools

import pytest

from app.enums import CategoriaOcorrencia as C, Prioridade as P
from app.services.prioridade import PONTUACAO_MAXIMA, calcular_prioridade, faixa


@pytest.mark.parametrize(
    ("categoria", "risco", "bloqueia", "acess", "pontos", "prioridade"),
    [
        (C.OUTRO, False, False, False, 1, P.BAIXA),
        (C.BURACO, False, False, False, 3, P.BAIXA),
        (C.CALCADA_DANIFICADA, False, False, True, 4, P.MEDIA),
        (C.ILUMINACAO_DEFEITUOSA, True, False, False, 5, P.MEDIA),
        (C.BURACO, True, False, False, 6, P.ALTA),
        (C.CALCADA_DANIFICADA, False, True, True, 6, P.ALTA),
        (C.CALCADA_DANIFICADA, True, False, True, 7, P.ALTA),
        (C.BURACO, True, True, True, 10, P.ALTA),
    ],
)
def test_exemplos_documentados(
    categoria: C, risco: bool, bloqueia: bool, acess: bool, pontos: int, prioridade: P
) -> None:
    r = calcular_prioridade(categoria, risco, bloqueia, acess)
    assert r.pontuacao == pontos
    assert r.prioridade == prioridade


def test_faixas_nas_fronteiras() -> None:
    assert [faixa(n) for n in range(1, 11)] == [P.BAIXA] * 3 + [P.MEDIA] * 2 + [P.ALTA] * 5


def test_pontuacao_sempre_entre_1_e_10_e_deterministica() -> None:
    for categoria, *flags in itertools.product(C, [False, True], [False, True], [False, True]):
        a = calcular_prioridade(categoria, *flags)
        b = calcular_prioridade(categoria, *flags)
        assert a == b
        assert 1 <= a.pontuacao <= PONTUACAO_MAXIMA == 10


def test_justificativa_lista_fatores() -> None:
    r = calcular_prioridade(C.CALCADA_DANIFICADA, True, False, True)
    assert r.justificativa == (
        "Categoria calçada danificada (+2); risco imediato informado (+3); "
        "afeta acessibilidade (+2). Total 7/10 → ALTA."
    )
