"""API: ocorrências próximas (duplicatas), confirmações e lista por identificação."""

import uuid
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from tests.conftest import ADMIN_TOKEN_TESTE
from tests.test_api import assert_erro, nova_identificacao, nova_ocorrencia

ADMIN = {"X-Admin-Token": ADMIN_TOKEN_TESTE}
BASE = {"latitude": -23.5503, "longitude": -46.6340}  # Praça da Sé
# 0,00027° de latitude ≈ 30 m; 0,00045° ≈ 50 m; 0,0027° ≈ 300 m.
A_30M = {"latitude": -23.55003, "longitude": -46.6340}
C_50M = {"latitude": -23.54985, "longitude": -46.6340}
B_300M = {"latitude": -23.5476, "longitude": -46.6340}


def resolver(client: TestClient, ocorrencia_id: int) -> None:
    for status in ("EM_ANALISE", "EM_ANDAMENTO", "RESOLVIDA"):
        r = client.patch(f"/ocorrencias/{ocorrencia_id}/status", json={"status": status}, headers=ADMIN)
        assert r.status_code == 200, r.text


def inserir_simulada_calcada(engine: Engine, identificacao_id: str, ponto: dict[str, float]) -> int:
    with engine.begin() as conn:
        return int(
            conn.execute(
                text(
                    "INSERT INTO ocorrencias (identificacao_id, titulo, descricao, categoria, latitude, longitude,"
                    " status, prioridade, prioridade_pontuacao, prioridade_justificativa, ia_status, origem)"
                    " VALUES (:i, 'Calçada fictícia', 'Registro fictício de demonstração (dado fictício).',"
                    " 'CALCADA_DANIFICADA', :lat, :lon, 'ABERTA', 'MEDIA', 4, 'Teste', 'INDISPONIVEL', 'SIMULADA')"
                    " RETURNING id"
                ),
                {"i": uuid.UUID(identificacao_id), "lat": ponto["latitude"], "lon": ponto["longitude"]},
            ).scalar_one()
        )


def proximas(client: TestClient, **params: Any) -> list[dict[str, Any]]:
    r = client.get("/ocorrencias/proximas", params={**BASE, **params})
    assert r.status_code == 200, r.text
    itens: list[dict[str, Any]] = r.json()["itens"]
    return itens


# ------------------------------------------------------------ proximidade


def test_proximas_raio_categoria_status_e_origem(client: TestClient, banco_migrado: Engine) -> None:
    ident = nova_identificacao(client)
    a = nova_ocorrencia(client, ident, **A_30M)["id"]  # CALCADA_DANIFICADA (payload padrão)
    b = nova_ocorrencia(client, ident, **B_300M)["id"]
    c = nova_ocorrencia(client, ident, **C_50M, categoria="BURACO")["id"]
    d = nova_ocorrencia(client, ident, **A_30M)["id"]
    resolver(client, d)
    inserir_simulada_calcada(banco_migrado, ident, A_30M)

    calcadas = proximas(client, categoria="CALCADA_DANIFICADA")
    assert [i["id"] for i in calcadas] == [a]
    assert abs(calcadas[0]["distancia_m"] - 30) <= 2
    assert [i["id"] for i in proximas(client)] == [a, c]  # sem categoria: por distância
    assert [i["id"] for i in proximas(client, categoria="CALCADA_DANIFICADA", raio_m=500)] == [a, b]


def test_proximas_vazio_e_parametros_invalidos(client: TestClient) -> None:
    assert proximas(client) == []
    for params in (
        {**BASE, "raio_m": 1000},
        {**BASE, "raio_m": 5},
        {"latitude": 91, "longitude": -46.6},
        {"latitude": -23.5},
        {**BASE, "categoria": "ALAGAMENTO"},
    ):
        assert_erro(client.get("/ocorrencias/proximas", params=params), 422, "VALIDACAO")


# ------------------------------------------------------------ confirmações


def confirmar(client: TestClient, ocorrencia_id: int, identificacao_id: str) -> Any:
    return client.post(f"/ocorrencias/{ocorrencia_id}/confirmacoes", headers={"X-Identificacao-Id": identificacao_id})


def desfazer(client: TestClient, ocorrencia_id: int, identificacao_id: str) -> Any:
    return client.delete(f"/ocorrencias/{ocorrencia_id}/confirmacoes", headers={"X-Identificacao-Id": identificacao_id})


def test_confirmacao_ciclo_completo(client: TestClient) -> None:
    autor, outra = nova_identificacao(client), nova_identificacao(client, "Outra pessoa")
    oid = nova_ocorrencia(client, autor)["id"]

    r1 = confirmar(client, oid, outra)
    assert r1.status_code == 201 and r1.json() == {"ocorrencia_id": oid, "confirmacoes": 1, "confirmado": True}
    r2 = confirmar(client, oid, outra)
    assert r2.status_code == 200 and r2.json()["confirmacoes"] == 1

    detalhe = client.get(f"/ocorrencias/{oid}", headers={"X-Identificacao-Id": outra}).json()
    assert detalhe["minha_relacao"] == {"registrei": False, "confirmei": True}
    assert detalhe["confirmacoes"] == 1
    do_autor = client.get(f"/ocorrencias/{oid}", headers={"X-Identificacao-Id": autor}).json()
    assert do_autor["minha_relacao"] == {"registrei": True, "confirmei": False}
    anonimo = client.get(f"/ocorrencias/{oid}").json()
    assert anonimo["minha_relacao"] is None
    assert "identificacao_id" not in anonimo and "apelido" not in anonimo

    for _ in range(2):  # idempotente
        r = desfazer(client, oid, outra)
        assert r.status_code == 200 and r.json() == {"ocorrencia_id": oid, "confirmacoes": 0, "confirmado": False}
    assert client.get(f"/ocorrencias/{oid}").json()["confirmacoes"] == 0


def test_confirmacao_regras(client: TestClient, banco_migrado: Engine) -> None:
    autor, outra = nova_identificacao(client), nova_identificacao(client, "Outra pessoa")
    aberta = nova_ocorrencia(client, autor)["id"]
    resolvida = nova_ocorrencia(client, autor)["id"]
    resolver(client, resolvida)
    simulada = inserir_simulada_calcada(banco_migrado, autor, A_30M)

    assert_erro(confirmar(client, aberta, autor), 409, "PROPRIA_OCORRENCIA")
    assert_erro(confirmar(client, resolvida, outra), 409, "OCORRENCIA_ENCERRADA")
    assert_erro(confirmar(client, simulada, outra), 409, "OCORRENCIA_SIMULADA")
    assert_erro(confirmar(client, 999999, outra), 404, "NAO_ENCONTRADO")
    corpo = assert_erro(confirmar(client, aberta, str(uuid.uuid4())), 422, "IDENTIFICACAO_INEXISTENTE")
    assert corpo["erro"]["detalhes"][0]["campo"] == "X-Identificacao-Id"
    assert_erro(client.post(f"/ocorrencias/{aberta}/confirmacoes"), 422, "VALIDACAO")  # sem cabeçalho
    assert_erro(confirmar(client, aberta, "nao-e-uuid"), 422, "VALIDACAO")
    assert client.get(f"/ocorrencias/{aberta}").json()["confirmacoes"] == 0


def test_confirmacao_nao_muda_prioridade(client: TestClient) -> None:
    autor, outra = nova_identificacao(client), nova_identificacao(client, "Outra pessoa")
    antes = nova_ocorrencia(client, autor)
    assert confirmar(client, antes["id"], outra).status_code == 201
    depois = client.get(f"/ocorrencias/{antes['id']}").json()
    campos = ("prioridade", "prioridade_pontuacao", "prioridade_justificativa", "status", "atualizado_em")
    assert {k: depois[k] for k in campos} == {k: antes[k] for k in campos}


# ---------------------------------------------- ocorrências de uma identificação


def minhas(client: TestClient, ident: str, **params: Any) -> Any:
    # O UUID vai no cabeçalho, nunca na URL (URLs aparecem em logs de acesso).
    return client.get("/ocorrencias/minhas", params=params, headers={"X-Identificacao-Id": ident})


def da_identificacao(client: TestClient, ident: str, relacao: str) -> list[int]:
    r = minhas(client, ident, relacao=relacao)
    assert r.status_code == 200, r.text
    return [o["id"] for o in r.json()["itens"]]


def test_lista_da_identificacao(client: TestClient) -> None:
    a, b = nova_identificacao(client, "Pessoa A"), nova_identificacao(client, "Pessoa B")
    a1 = nova_ocorrencia(client, a)["id"]
    a2 = nova_ocorrencia(client, a)["id"]
    b1 = nova_ocorrencia(client, b)["id"]
    assert confirmar(client, a1, b).status_code == 201

    assert da_identificacao(client, a, "registradas") == [a2, a1]  # mais recente primeiro
    assert da_identificacao(client, b, "registradas") == [b1]
    assert da_identificacao(client, b, "confirmadas") == [a1]
    assert da_identificacao(client, a, "confirmadas") == []

    r = client.patch(f"/ocorrencias/{a1}/status", json={"status": "EM_ANALISE"}, headers=ADMIN)
    assert r.status_code == 200
    assert da_identificacao(client, a, "registradas") == [a1, a2]  # atualizada sobe

    pagina = minhas(client, a, tamanho=1, pagina=2).json()
    assert (pagina["total"], pagina["total_paginas"], [o["id"] for o in pagina["itens"]]) == (2, 2, [a2])


def test_lista_da_identificacao_erros(client: TestClient) -> None:
    corpo = assert_erro(minhas(client, str(uuid.uuid4())), 422, "IDENTIFICACAO_INEXISTENTE")
    assert corpo["erro"]["detalhes"][0]["campo"] == "X-Identificacao-Id"
    ident = nova_identificacao(client)
    assert_erro(minhas(client, ident, relacao="todas"), 422, "VALIDACAO")
    assert_erro(client.get("/ocorrencias/minhas"), 422, "VALIDACAO")  # sem cabeçalho


def test_uuid_da_identificacao_nao_vai_na_url(client: TestClient) -> None:
    # A rota antiga com o UUID no caminho não existe (privacidade: logs de acesso).
    ident = nova_identificacao(client)
    assert_erro(client.get(f"/identificacoes/{ident}/ocorrencias"), 404, "NAO_ENCONTRADO")
