""""Ainda não foi resolvido? Avise": só em ocorrência resolvida e real, um por pessoa, não reabre."""

import uuid
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import Engine

from tests.fabricas import inserir_ocorrencia
from tests.test_api import assert_erro, nova_identificacao, nova_ocorrencia
from tests.test_api_confirmacoes import resolver


def avisar(client: TestClient, ocorrencia_id: int, ident: str) -> Any:
    return client.post(f"/ocorrencias/{ocorrencia_id}/nao-resolvido", headers={"X-Identificacao-Id": ident})


def desfazer(client: TestClient, ocorrencia_id: int, ident: str) -> Any:
    return client.delete(f"/ocorrencias/{ocorrencia_id}/nao-resolvido", headers={"X-Identificacao-Id": ident})


def test_aviso_so_em_resolvida_real_e_idempotente(client: TestClient) -> None:
    ident = nova_identificacao(client)
    outra = nova_identificacao(client, "Outra Pessoa")
    oid = nova_ocorrencia(client, ident)["id"]
    assert_erro(avisar(client, oid, outra), 409, "OCORRENCIA_NAO_RESOLVIDA")
    resolver(client, oid)

    r = avisar(client, oid, outra)
    assert r.status_code == 201 and r.json() == {"ocorrencia_id": oid, "avisos_nao_resolvido": 1, "avisado": True}
    repetido = avisar(client, oid, outra)
    assert repetido.status_code == 200 and repetido.json()["avisos_nao_resolvido"] == 1  # não duplica
    assert avisar(client, oid, ident).json()["avisos_nao_resolvido"] == 2  # quem registrou também pode avisar

    detalhe = client.get(f"/ocorrencias/{oid}", headers={"X-Identificacao-Id": outra}).json()
    assert detalhe["status"] == "RESOLVIDA"  # o aviso não reabre
    assert detalhe["avisos_nao_resolvido"] == 2
    assert detalhe["minha_relacao"] == {"registrei": False, "confirmei": False, "avisei_nao_resolvido": True}
    sem_cabecalho = client.get(f"/ocorrencias/{oid}").json()
    assert sem_cabecalho["avisos_nao_resolvido"] == 2 and sem_cabecalho["minha_relacao"] is None


def test_desfazer_aviso_idempotente(client: TestClient) -> None:
    ident = nova_identificacao(client)
    oid = nova_ocorrencia(client, ident)["id"]
    resolver(client, oid)
    avisar(client, oid, ident)
    for _ in range(2):
        r = desfazer(client, oid, ident)
        assert r.status_code == 200 and r.json() == {"ocorrencia_id": oid, "avisos_nao_resolvido": 0, "avisado": False}
    detalhe = client.get(f"/ocorrencias/{oid}", headers={"X-Identificacao-Id": ident}).json()
    assert detalhe["minha_relacao"]["avisei_nao_resolvido"] is False


def test_aviso_em_simulada_inexistente_e_sem_cabecalho(client: TestClient, banco_migrado: Engine) -> None:
    ident = nova_identificacao(client)
    simulada = inserir_ocorrencia(
        banco_migrado, ident, latitude=-23.55, longitude=-46.63, status="RESOLVIDA", origem="SIMULADA"
    )
    assert_erro(avisar(client, simulada, ident), 409, "OCORRENCIA_SIMULADA")
    oid = nova_ocorrencia(client, ident)["id"]
    resolver(client, oid)
    assert_erro(avisar(client, oid, str(uuid.uuid4())), 422, "IDENTIFICACAO_INEXISTENTE")
    assert_erro(avisar(client, 999999, ident), 404, "NAO_ENCONTRADO")
    assert_erro(client.post(f"/ocorrencias/{oid}/nao-resolvido"), 422, "VALIDACAO")
