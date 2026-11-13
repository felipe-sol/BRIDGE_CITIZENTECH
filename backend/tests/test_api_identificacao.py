"""Identificação pelo cabeçalho: trocar apelido e participação da pessoa (Perfil do app)."""

import uuid

from fastapi.testclient import TestClient

from tests.test_api import assert_erro, nova_identificacao, nova_ocorrencia
from tests.test_api_avisos import avisar
from tests.test_api_confirmacoes import resolver

ZERADA = {"registradas": 0, "confirmadas": 0, "resolvidas_acompanhadas": 0, "avisos_nao_resolvido": 0}


def cabecalho(ident: str) -> dict[str, str]:
    return {"X-Identificacao-Id": ident}


def test_trocar_apelido_pelo_cabecalho(client: TestClient) -> None:
    ident = nova_identificacao(client)
    r = client.patch("/identificacoes/atual", headers=cabecalho(ident), json={"apelido": "  Nova Vizinha "})
    assert r.status_code == 200 and r.json()["apelido"] == "Nova Vizinha" and r.json()["id"] == ident
    assert client.get("/identificacoes/atual", headers=cabecalho(ident)).json()["apelido"] == "Nova Vizinha"


def test_trocar_apelido_invalido_ou_inexistente(client: TestClient) -> None:
    ident = nova_identificacao(client, "Vizinha Antiga")
    assert_erro(client.patch("/identificacoes/atual", headers=cabecalho(ident), json={"apelido": "A"}), 422, "VALIDACAO")
    assert client.get("/identificacoes/atual", headers=cabecalho(ident)).json()["apelido"] == "Vizinha Antiga"
    desconhecida = cabecalho(str(uuid.uuid4()))
    assert_erro(client.patch("/identificacoes/atual", headers=desconhecida, json={"apelido": "Outra"}), 404, "NAO_ENCONTRADO")
    assert_erro(client.patch("/identificacoes/atual", json={"apelido": "Outra"}), 422, "VALIDACAO")


def test_participacao_zerada_e_com_dados(client: TestClient) -> None:
    ident = nova_identificacao(client)
    assert client.get("/identificacoes/atual/participacao", headers=cabecalho(ident)).json() == ZERADA

    minha_resolvida = nova_ocorrencia(client, ident)["id"]
    nova_ocorrencia(client, ident)  # aberta
    outra = nova_identificacao(client, "Outra Pessoa")
    dela = nova_ocorrencia(client, outra)["id"]
    assert client.post(f"/ocorrencias/{dela}/confirmacoes", headers=cabecalho(ident)).status_code == 201
    resolver(client, minha_resolvida)
    resolver(client, dela)
    avisar(client, minha_resolvida, ident)

    r = client.get("/identificacoes/atual/participacao", headers=cabecalho(ident))
    assert r.status_code == 200
    assert r.json() == {"registradas": 2, "confirmadas": 1, "resolvidas_acompanhadas": 2, "avisos_nao_resolvido": 1}
    assert_erro(client.get("/identificacoes/atual/participacao", headers=cabecalho(str(uuid.uuid4()))), 404, "NAO_ENCONTRADO")
