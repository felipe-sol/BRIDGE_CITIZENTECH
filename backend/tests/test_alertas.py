"""Regra de alerta por região (pura). Usa as constantes, para valer depois da calibração."""

from app.enums import NivelAlerta
from app.services.alertas import (
    LIMIAR_ALERTA,
    LIMIAR_ATENCAO,
    MAX_CONFIRMACOES_NO_INDICE,
    MIN_ALTAS_PARA_ALERTA,
    indice_alerta,
    nivel_alerta,
)


def test_indice_soma_pontuacao_e_confirmacoes_limitadas() -> None:
    assert indice_alerta([(8, 0), (5, 2), (3, 9)]) == 8 + 5 + 2 + 3 + MAX_CONFIRMACOES_NO_INDICE
    assert indice_alerta([]) == 0


def test_niveis_nas_bordas() -> None:
    assert nivel_alerta(LIMIAR_ATENCAO - 1, 10) is NivelAlerta.NORMAL
    assert nivel_alerta(LIMIAR_ATENCAO, 0) is NivelAlerta.ATENCAO
    assert nivel_alerta(LIMIAR_ALERTA, MIN_ALTAS_PARA_ALERTA - 1) is NivelAlerta.ATENCAO
    assert nivel_alerta(LIMIAR_ALERTA, MIN_ALTAS_PARA_ALERTA) is NivelAlerta.ALERTA


def test_limiares_coerentes() -> None:
    assert 0 < LIMIAR_ATENCAO < LIMIAR_ALERTA
