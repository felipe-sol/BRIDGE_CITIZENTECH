"""GET /estatisticas/resumo: indicadores, categorias, semanas (horário de SP) e ranking."""

from datetime import UTC, datetime, timedelta
from typing import TypedDict

from fastapi.testclient import TestClient
from sqlalchemy import Engine

from tests.fabricas import inserir_historico, inserir_ocorrencia
from tests.test_api import assert_erro, nova_identificacao

class Local(TypedDict):
    latitude: float
    longitude: float
    subprefeitura: str


SE: Local = {"latitude": -23.5503, "longitude": -46.6340, "subprefeitura": "09"}
ITAQUERA: Local = {"latitude": -23.5453, "longitude": -46.4742, "subprefeitura": "27"}


def resolvida(engine: Engine, ident: str, local: Local, criado_em: datetime, dias_ate_resolver: int) -> int:
    oid = inserir_ocorrencia(engine, ident, **local, status="RESOLVIDA", criado_em=criado_em, categoria="CALCADA_DANIFICADA")
    inserir_historico(engine, oid, None, "ABERTA", criado_em)
    inserir_historico(engine, oid, "ABERTA", "RESOLVIDA", criado_em + timedelta(days=dias_ate_resolver))
    return oid


def test_resumo_vazio(client: TestClient) -> None:
    r = client.get("/estatisticas/resumo").json()
    assert (r["origem"], r["dias"], r["total"]) == ("APP", None, 0)
    assert (r["percentual_resolvidas"], r["tempo_medio_resolucao_dias"]) == (None, None)
    assert r["semanal"] == [] and r["ranking_regioes"] == []
    assert [c["total"] for c in r["por_categoria"]] == [0, 0, 0, 0, 0]
    assert (r["alertas_ativos"], r["regioes_em_atencao"]) == (0, 0)


def test_resumo_com_resolucoes(client: TestClient, banco_migrado: Engine) -> None:
    ident = nova_identificacao(client)
    dez_dias = datetime.now(UTC) - timedelta(days=10)
    resolvida(banco_migrado, ident, SE, dez_dias, 2)
    resolvida(banco_migrado, ident, SE, dez_dias, 4)
    inserir_ocorrencia(banco_migrado, ident, **SE, categoria="BURACO")
    inserir_ocorrencia(banco_migrado, ident, **ITAQUERA, categoria="ILUMINACAO_DEFEITUOSA")
    inserir_ocorrencia(banco_migrado, ident, **SE, origem="SIMULADA")

    r = client.get("/estatisticas/resumo").json()
    assert (r["total"], r["abertas"], r["resolvidas"], r["rejeitadas"]) == (4, 2, 2, 0)
    assert (r["percentual_resolvidas"], r["tempo_medio_resolucao_dias"]) == (50.0, 3.0)
    assert [c["total"] for c in r["por_categoria"]] == [2, 1, 1, 0, 0]
    assert r["por_categoria"][0]["categoria"] == "CALCADA_DANIFICADA"
    assert r["ranking_regioes"] == [
        {"codigo": "09", "nome": "Sé", "total": 3},
        {"codigo": "27", "nome": "Itaquera", "total": 1},
    ]
    assert sum(s["registradas"] for s in r["semanal"]) == 4
    assert sum(s["resolvidas"] for s in r["semanal"]) == 2

    simuladas = client.get("/estatisticas/resumo", params={"origem": "SIMULADA"}).json()
    assert simuladas["total"] == 1


def test_resumo_filtra_periodo_por_criacao(client: TestClient, banco_migrado: Engine) -> None:
    ident = nova_identificacao(client)
    inserir_ocorrencia(banco_migrado, ident, **SE, criado_em=datetime.now(UTC) - timedelta(days=40))
    inserir_ocorrencia(banco_migrado, ident, **SE)
    r = client.get("/estatisticas/resumo", params={"dias": 30}).json()
    assert (r["dias"], r["total"]) == (30, 1)
    assert 5 <= len(r["semanal"]) <= 6  # semanas de (agora − 30 dias) até agora, com zeros


def test_semana_usa_horario_de_sao_paulo(client: TestClient, banco_migrado: Engine) -> None:
    # Domingo 08/11/2026 23:30 em SP = segunda 09/11 02:30 UTC: conta na semana que começa em 02/11.
    ident = nova_identificacao(client)
    inserir_ocorrencia(banco_migrado, ident, **SE, criado_em=datetime(2026, 11, 9, 2, 30, tzinfo=UTC))
    r = client.get("/estatisticas/resumo").json()
    assert r["semanal"][0] == {"inicio": "2026-11-02", "registradas": 1, "resolvidas": 0}


def test_resumo_dias_invalido(client: TestClient) -> None:
    assert_erro(client.get("/estatisticas/resumo", params={"dias": 0}), 422, "VALIDACAO")
    assert_erro(client.get("/estatisticas/resumo", params={"origem": "OUTRA"}), 422, "VALIDACAO")
