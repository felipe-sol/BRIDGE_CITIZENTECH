"""API: endereço e região no cadastro, filtros da listagem, regiões e densidade."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from app.services.regioes import regiao_por_codigo
from tests.conftest import ADMIN_TOKEN_TESTE
from tests.test_api import assert_erro, nova_identificacao, nova_ocorrencia, payload

ADMIN = {"X-Admin-Token": ADMIN_TOKEN_TESTE}
PRACA_DA_SE = {"latitude": -23.5503, "longitude": -46.6340}
ARENA_ITAQUERA = {"latitude": -23.5453, "longitude": -46.4742}
RIO_DE_JANEIRO = {"latitude": -22.9068, "longitude": -43.1729}


def inserir_simulada(engine: Engine, identificacao_id: str) -> int:
    with engine.begin() as conn:
        return int(
            conn.execute(
                text(
                    "INSERT INTO ocorrencias (identificacao_id, titulo, descricao, categoria, latitude, longitude,"
                    " status, prioridade, prioridade_pontuacao, prioridade_justificativa, ia_status, origem,"
                    " subprefeitura_codigo)"
                    " VALUES (:i, 'Buraco fictício', 'Registro fictício de demonstração (dado fictício).', 'BURACO',"
                    " -23.5506, -46.6337, 'ABERTA', 'BAIXA', 3, 'Teste', 'INDISPONIVEL', 'SIMULADA', '09') RETURNING id"
                ),
                {"i": uuid.UUID(identificacao_id)},
            ).scalar_one()
        )


# ------------------------------------------------------------ cadastro


def test_cadastro_com_endereco_e_regiao(client: TestClient) -> None:
    ident = nova_identificacao(client)
    oc = nova_ocorrencia(client, ident, **PRACA_DA_SE, endereco="  Praça da Sé — Sé  ")
    assert oc["endereco"] == "Praça da Sé — Sé"
    assert oc["subprefeitura"] == {"codigo": "09", "nome": "Sé"}
    assert oc["confirmacoes"] == 0 and oc["origem"] == "APP"


def test_cadastro_sem_endereco_ou_endereco_vazio_fica_nulo(client: TestClient) -> None:
    ident = nova_identificacao(client)
    assert nova_ocorrencia(client, ident)["endereco"] is None
    assert nova_ocorrencia(client, ident, endereco="   ")["endereco"] is None


def test_cadastro_fora_de_sp_tem_regiao_nula(client: TestClient) -> None:
    ident = nova_identificacao(client)
    assert nova_ocorrencia(client, ident, **RIO_DE_JANEIRO)["subprefeitura"] is None


def test_endereco_longo_rejeitado(client: TestClient) -> None:
    ident = nova_identificacao(client)
    corpo = assert_erro(client.post("/ocorrencias", json=payload(ident, endereco="x" * 201)), 422, "VALIDACAO")
    assert corpo["erro"]["detalhes"] == [{"campo": "endereco", "mensagem": "Deve ter no máximo 200 caracteres."}]
    assert nova_ocorrencia(client, ident, endereco="x" * 200)["endereco"] == "x" * 200


# ------------------------------------------------------------ listagem


def test_listagem_exclui_simuladas_por_padrao(client: TestClient, banco_migrado: Engine) -> None:
    ident = nova_identificacao(client)
    real = nova_ocorrencia(client, ident, **PRACA_DA_SE)["id"]
    simulada = inserir_simulada(banco_migrado, ident)

    padrao = client.get("/ocorrencias").json()
    assert (padrao["total"], [o["id"] for o in padrao["itens"]]) == (1, [real])
    so_simuladas = client.get("/ocorrencias", params={"origem": "SIMULADA"}).json()
    assert [o["id"] for o in so_simuladas["itens"]] == [simulada]
    assert so_simuladas["itens"][0]["origem"] == "SIMULADA"


def test_filtro_bbox_q_e_subprefeitura(client: TestClient) -> None:
    ident = nova_identificacao(client)
    se = nova_ocorrencia(client, ident, **PRACA_DA_SE, titulo="Buraco na Praça da Sé")["id"]
    itaquera = nova_ocorrencia(client, ident, **ARENA_ITAQUERA, titulo="Calçada solta perto do estádio")["id"]

    def ids(**params: str) -> list[int]:
        return [o["id"] for o in client.get("/ocorrencias", params=params).json()["itens"]]

    assert ids(bbox="-46.70,-23.60,-46.60,-23.50") == [se]
    assert ids(q="praça") == [se]
    assert ids(q="ESTÁDIO") == [itaquera]
    assert ids(q="%%") == []  # curingas do LIKE são tratados como texto
    assert ids(subprefeitura="27") == [itaquera]


def test_filtros_invalidos(client: TestClient) -> None:
    for params in (
        {"bbox": "1,2,3"},
        {"bbox": "-46.6,-23.5,-46.7,-23.6"},  # mínimo maior que o máximo
        {"bbox": "a,b,c,d"},
        {"bbox": "-200,-23.6,-46.6,-23.5"},  # fora do intervalo de longitude
        {"q": "a"},
        {"subprefeitura": "9"},
        {"origem": "OUTRA"},
    ):
        corpo = assert_erro(client.get("/ocorrencias", params=params), 422, "VALIDACAO")
        assert corpo["erro"]["detalhes"][0]["campo"] == next(iter(params)), params


# ------------------------------------------------------- regiões e densidade


def confirmar_por_sql(engine: Engine, ocorrencia_id: int, identificacao_id: str) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("INSERT INTO confirmacoes (ocorrencia_id, identificacao_id) VALUES (:o, :i)"),
            {"o": ocorrencia_id, "i": uuid.UUID(identificacao_id)},
        )


def test_regioes_geojson(client: TestClient) -> None:
    r = client.get("/regioes")
    assert r.status_code == 200 and r.headers["cache-control"] == "public, max-age=86400"
    corpo = r.json()
    assert corpo["type"] == "FeatureCollection" and len(corpo["features"]) == 32
    se = next(f for f in corpo["features"] if f["properties"]["codigo"] == "09")
    assert se["properties"]["nome"] == "Sé" and se["geometry"]["type"] == "Polygon"


def test_estatisticas_por_regiao(client: TestClient, banco_migrado: Engine) -> None:
    ident, outra = nova_identificacao(client), nova_identificacao(client, "Outra pessoa")
    alta = nova_ocorrencia(client, ident, **PRACA_DA_SE)["id"]  # payload padrão: ALTA (7)
    resolvida = nova_ocorrencia(
        client, ident, **PRACA_DA_SE, categoria="OUTRO", risco_imediato=False, afeta_acessibilidade=False
    )["id"]
    for status in ("EM_ANALISE", "EM_ANDAMENTO", "RESOLVIDA"):
        assert client.patch(f"/ocorrencias/{resolvida}/status", json={"status": status}, headers=ADMIN).status_code == 200
    itaquera = nova_ocorrencia(client, ident, **ARENA_ITAQUERA)["id"]
    confirmar_por_sql(banco_migrado, alta, outra)
    confirmar_por_sql(banco_migrado, resolvida, outra)  # encerrada: não soma
    inserir_simulada(banco_migrado, ident)  # fictícia: não entra no modo APP

    corpo = client.get("/estatisticas/regioes").json()
    assert (corpo["origem"], corpo["dias"]) == ("APP", None)
    itens = {i["codigo"]: i for i in corpo["itens"]}
    assert len(itens) == 32
    se = itens["09"]
    assert (se["nome"], se["total"], se["abertas"], se["alta_abertas"], se["resolvidas"], se["confirmacoes"]) == (
        "Sé", 2, 1, 1, 1, 1,
    )
    area_se = regiao_por_codigo("09").area_km2  # área oficial da camada GeoSampa
    assert se["densidade_km2"] == round(2 / area_se, 3)
    assert itens["27"]["total"] == 1
    assert {k: v for k, v in itens["11"].items() if k not in ("codigo", "nome")} == {
        "total": 0, "abertas": 0, "alta_abertas": 0, "resolvidas": 0, "confirmacoes": 0, "densidade_km2": 0.0,
    }

    simuladas = client.get("/estatisticas/regioes", params={"origem": "SIMULADA"}).json()
    assert {i["codigo"]: i["total"] for i in simuladas["itens"] if i["total"]} == {"09": 1}

    with banco_migrado.begin() as conn:
        conn.execute(text("UPDATE ocorrencias SET criado_em = now() - interval '40 days' WHERE id = :o"), {"o": itaquera})
    recentes = {i["codigo"]: i["total"] for i in client.get("/estatisticas/regioes", params={"dias": 30}).json()["itens"]}
    assert (recentes["27"], recentes["09"]) == (0, 2)


def test_estatisticas_parametros_invalidos(client: TestClient) -> None:
    for params in ({"dias": 0}, {"dias": 366}, {"origem": "OUTRA"}):
        assert_erro(client.get("/estatisticas/regioes", params=params), 422, "VALIDACAO")
