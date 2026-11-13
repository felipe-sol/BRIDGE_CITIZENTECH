import json
import uuid

import pytest
from pydantic import ValidationError

from app.schemas import IdentificacaoCriar, OcorrenciaCriar

BASE = {
    "identificacao_id": str(uuid.uuid4()),
    "titulo": "Buraco na calçada",
    "descricao": "Buraco grande perto do ponto de ônibus.",
    "categoria": "BURACO",
    "latitude": -23.5,
    "longitude": -46.6,
}


def validar(**alteracoes: object) -> OcorrenciaCriar:
    return OcorrenciaCriar.model_validate_json(json.dumps({**BASE, **alteracoes}))


def test_valido_com_padroes() -> None:
    o = validar()
    assert (o.risco_imediato, o.bloqueia_passagem, o.afeta_acessibilidade) == (False, False, False)


def test_coordenada_inteira_e_aceita() -> None:
    assert validar(latitude=-23, longitude=-46).latitude == -23.0


@pytest.mark.parametrize(
    "alteracao",
    [
        {"latitude": 90.0001},
        {"latitude": -90.5},
        {"longitude": 180.01},
        {"longitude": -181},
        {"latitude": "-23.5"},  # texto não é aceito como número
        {"latitude": 0, "longitude": 0},  # localização ausente
        {"latitude": None},
        {"risco_imediato": "sim"},
        {"categoria": "ALAGAMENTO"},
        {"titulo": "abc"},
        {"titulo": "x" * 121},
        {"descricao": "curta"},
        {"identificacao_id": "nao-e-uuid"},
        {"campo_extra": 1},
    ],
)
def test_invalidos(alteracao: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        validar(**alteracao)


def test_textos_sao_aparados() -> None:
    o = validar(titulo="   Poste apagado   ")
    assert o.titulo == "Poste apagado"


def test_apelido_so_espacos_e_invalido() -> None:
    with pytest.raises(ValidationError):
        IdentificacaoCriar(apelido="   ")
