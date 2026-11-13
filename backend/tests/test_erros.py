"""Formato e tradução dos erros — rotas que falham na validação, antes de usar o banco."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def cliente_sem_banco() -> Iterator[TestClient]:
    with TestClient(create_app()) as cliente:
        yield cliente


def test_limites_numericos_sem_casa_decimal(cliente_sem_banco: TestClient) -> None:
    corpo = {
        "identificacao_id": "00000000-0000-4000-8000-000000000000",
        "titulo": "Título válido",
        "descricao": "Descrição válida de teste.",
        "categoria": "BURACO",
        "latitude": 91,
        "longitude": -181,
    }
    r = cliente_sem_banco.post("/ocorrencias", json=corpo)
    assert r.status_code == 422
    assert r.json()["erro"]["detalhes"] == [
        {"campo": "latitude", "mensagem": "Deve ser menor ou igual a 90."},
        {"campo": "longitude", "mensagem": "Deve ser maior ou igual a -180."},
    ]


def test_valores_aceitos_em_portugues(cliente_sem_banco: TestClient) -> None:
    r = cliente_sem_banco.get("/ocorrencias", params={"ordenar": "aleatorio"})
    assert r.status_code == 422
    assert r.json()["erro"]["detalhes"] == [
        {"campo": "ordenar", "mensagem": "Valor inválido. Valores aceitos: 'recentes' ou 'prioridade'."}
    ]


def test_json_malformado(cliente_sem_banco: TestClient) -> None:
    r = cliente_sem_banco.post(
        "/identificacoes", content=b"{apelido: sem aspas}", headers={"Content-Type": "application/json"}
    )
    assert r.status_code == 422
    assert r.json()["erro"]["codigo"] == "VALIDACAO"
    assert r.json()["erro"]["detalhes"][0]["mensagem"] == "JSON inválido."


def test_metodo_nao_permitido(cliente_sem_banco: TestClient) -> None:
    r = cliente_sem_banco.delete("/ocorrencias")
    assert r.status_code == 405
    assert r.json()["erro"]["codigo"] == "METODO_NAO_PERMITIDO"
