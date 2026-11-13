"""Testes de integração: API real + PostgreSQL de teste migrado pelo Alembic."""

import uuid
from io import BytesIO
from typing import Any

from fastapi.testclient import TestClient
from PIL import Image

from app.config import Settings, get_settings
from tests import imagens
from tests.conftest import ADMIN_TOKEN_TESTE

ADMIN = {"X-Admin-Token": ADMIN_TOKEN_TESTE}


def nova_identificacao(client: TestClient, apelido: str = "Vizinha Teste") -> str:
    r = client.post("/identificacoes", json={"apelido": apelido})
    assert r.status_code == 201, r.text
    return str(r.json()["id"])


def payload(identificacao_id: str, **alteracoes: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "identificacao_id": identificacao_id,
        "titulo": "Calçada quebrada em frente à escola",
        "descricao": "Placas soltas e buraco de ~40 cm na calçada.",
        "categoria": "CALCADA_DANIFICADA",
        "latitude": -23.564224,
        "longitude": -46.652857,
        "risco_imediato": True,
        "bloqueia_passagem": False,
        "afeta_acessibilidade": True,
    }
    return {**base, **alteracoes}


def nova_ocorrencia(client: TestClient, identificacao_id: str, **alteracoes: Any) -> dict[str, Any]:
    r = client.post("/ocorrencias", json=payload(identificacao_id, **alteracoes))
    assert r.status_code == 201, r.text
    corpo: dict[str, Any] = r.json()
    return corpo


def assert_erro(resposta: Any, status: int, codigo: str) -> dict[str, Any]:
    assert resposta.status_code == status, resposta.text
    corpo: dict[str, Any] = resposta.json()
    assert set(corpo) == {"erro"}
    assert corpo["erro"]["codigo"] == codigo
    assert isinstance(corpo["erro"]["mensagem"], str) and corpo["erro"]["mensagem"]
    assert isinstance(corpo["erro"]["detalhes"], list)
    return corpo


# ------------------------------------------------------------------ health


def test_health_ok(client: TestClient) -> None:
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {
        "status": "ok",
        "banco": "ok",
        "modelo_ia": {"disponivel": False, "versao": None},
        "versao_api": "1.0.0",
    }


def test_rota_inexistente_usa_formato_de_erro(client: TestClient) -> None:
    assert_erro(client.get("/nao-existe"), 404, "NAO_ENCONTRADO")


# ------------------------------------------------------------ identificação


def test_criar_e_consultar_identificacao(client: TestClient) -> None:
    r = client.post("/identificacoes", json={"apelido": "  Maria do Bairro  "})
    assert r.status_code == 201
    corpo = r.json()
    assert corpo["apelido"] == "Maria do Bairro"
    uuid.UUID(corpo["id"])
    assert client.get(f"/identificacoes/{corpo['id']}").json() == corpo


def test_identificacao_invalida_e_inexistente(client: TestClient) -> None:
    corpo = assert_erro(client.post("/identificacoes", json={"apelido": "A"}), 422, "VALIDACAO")
    assert corpo["erro"]["detalhes"] == [{"campo": "apelido", "mensagem": "Deve ter pelo menos 2 caracteres."}]
    assert_erro(client.post("/identificacoes", json={}), 422, "VALIDACAO")
    assert_erro(client.get(f"/identificacoes/{uuid.uuid4()}"), 404, "NAO_ENCONTRADO")
    assert_erro(client.get("/identificacoes/123"), 422, "VALIDACAO")


def test_identificacao_atual_pelo_cabecalho(client: TestClient) -> None:
    ident = nova_identificacao(client)
    r = client.get("/identificacoes/atual", headers={"X-Identificacao-Id": ident})
    assert r.status_code == 200 and r.json()["id"] == ident


def test_identificacao_atual_inexistente_e_sem_cabecalho(client: TestClient) -> None:
    inexistente = {"X-Identificacao-Id": str(uuid.uuid4())}
    assert_erro(client.get("/identificacoes/atual", headers=inexistente), 404, "NAO_ENCONTRADO")
    assert_erro(client.get("/identificacoes/atual"), 422, "VALIDACAO")
    assert_erro(client.get("/identificacoes/atual", headers={"X-Identificacao-Id": "abc"}), 422, "VALIDACAO")


def test_rota_com_uuid_no_caminho_marcada_obsoleta(client: TestClient) -> None:
    caminho = client.get("/openapi.json").json()["paths"]["/identificacoes/{identificacao_id}"]
    assert caminho["get"]["deprecated"] is True


# ------------------------------------------------------------- cadastro


def test_cadastro_valido_calcula_prioridade_e_historico(client: TestClient) -> None:
    ident = nova_identificacao(client)
    o = nova_ocorrencia(client, ident)

    assert o["status"] == "ABERTA"
    assert (o["prioridade"], o["prioridade_pontuacao"]) == ("ALTA", 7)
    assert o["prioridade_justificativa"].endswith("Total 7/10 → ALTA.")
    assert o["imagem_url"] is None
    assert o["analise_ia"] == {
        "status": "INDISPONIVEL",
        "categoria_sugerida": None,
        "confianca": None,
        "versao_modelo": None,
        "analisada_em": None,
    }
    assert (o["latitude"], o["longitude"]) == (-23.564224, -46.652857)
    # Autor não é exposto na resposta pública.
    assert "identificacao_id" not in o and "apelido" not in o

    detalhe = client.get(f"/ocorrencias/{o['id']}").json()
    assert [(h["status_anterior"], h["status_novo"]) for h in detalhe["historico_status"]] == [(None, "ABERTA")]


def test_cadastro_campos_invalidos(client: TestClient) -> None:
    ident = nova_identificacao(client)
    r = client.post(
        "/ocorrencias",
        json=payload(ident, titulo="abc", descricao="curta", categoria="ALAGAMENTO", risco_imediato="sim", extra=1),
    )
    corpo = assert_erro(r, 422, "VALIDACAO")
    campos = {d["campo"] for d in corpo["erro"]["detalhes"]}
    assert campos == {"titulo", "descricao", "categoria", "risco_imediato", "extra"}


def test_cadastro_coordenadas_invalidas(client: TestClient) -> None:
    ident = nova_identificacao(client)
    casos = [
        ({"latitude": 91}, "latitude", "Deve ser menor ou igual a 90."),
        ({"latitude": -90.1}, "latitude", "Deve ser maior ou igual a -90."),
        ({"longitude": 180.5}, "longitude", "Deve ser menor ou igual a 180."),
        ({"longitude": -181}, "longitude", "Deve ser maior ou igual a -180."),
        ({"latitude": "abc"}, "latitude", "Deve ser um número."),
    ]
    for alteracao, campo, mensagem in casos:
        corpo = assert_erro(client.post("/ocorrencias", json=payload(ident, **alteracao)), 422, "VALIDACAO")
        assert {"campo": campo, "mensagem": mensagem} in corpo["erro"]["detalhes"], alteracao

    corpo = assert_erro(client.post("/ocorrencias", json=payload(ident, latitude=0, longitude=0)), 422, "VALIDACAO")
    assert "localização ausente" in corpo["erro"]["detalhes"][0]["mensagem"]


def test_cadastro_com_identificacao_inexistente(client: TestClient) -> None:
    r = client.post("/ocorrencias", json=payload(str(uuid.uuid4())))
    assert_erro(r, 422, "IDENTIFICACAO_INEXISTENTE")


def test_idempotencia_nao_duplica(client: TestClient) -> None:
    ident = nova_identificacao(client)
    chave = {"Idempotency-Key": str(uuid.uuid4())}
    r1 = client.post("/ocorrencias", json=payload(ident), headers=chave)
    r2 = client.post("/ocorrencias", json=payload(ident), headers=chave)
    assert (r1.status_code, r2.status_code) == (201, 200)
    assert r1.json()["id"] == r2.json()["id"]
    assert client.get("/ocorrencias").json()["total"] == 1

    assert_erro(
        client.post("/ocorrencias", json=payload(ident), headers={"Idempotency-Key": "abc"}), 422, "VALIDACAO"
    )


# ------------------------------------------------------------- listagem


def test_listagem_vazia(client: TestClient) -> None:
    assert client.get("/ocorrencias").json() == {
        "itens": [],
        "pagina": 1,
        "tamanho": 20,
        "total": 0,
        "total_paginas": 0,
    }


def test_listagem_paginacao_ordenacao_e_filtros(client: TestClient) -> None:
    ident = nova_identificacao(client)
    ids = [
        nova_ocorrencia(client, ident, categoria=cat, risco_imediato=risco, afeta_acessibilidade=False)["id"]
        for cat, risco in [("OUTRO", False), ("BURACO", True), ("ILUMINACAO_DEFEITUOSA", False)]
    ]  # pontuações: 1, 6, 2

    recentes = client.get("/ocorrencias", params={"tamanho": 2}).json()
    assert (recentes["total"], recentes["total_paginas"]) == (3, 2)
    assert [o["id"] for o in recentes["itens"]] == [ids[2], ids[1]]
    pagina2 = client.get("/ocorrencias", params={"tamanho": 2, "pagina": 2}).json()
    assert [o["id"] for o in pagina2["itens"]] == [ids[0]]

    por_prioridade = client.get("/ocorrencias", params={"ordenar": "prioridade"}).json()
    assert [o["id"] for o in por_prioridade["itens"]] == [ids[1], ids[2], ids[0]]

    altas = client.get("/ocorrencias", params={"prioridade": "ALTA"}).json()
    assert [o["id"] for o in altas["itens"]] == [ids[1]]
    buracos = client.get("/ocorrencias", params={"categoria": "BURACO"}).json()
    assert buracos["total"] == 1

    for params in ({"pagina": 0}, {"tamanho": 101}, {"ordenar": "aleatorio"}, {"status": "X"}):
        assert_erro(client.get("/ocorrencias", params=params), 422, "VALIDACAO")


def test_detalhe_inexistente(client: TestClient) -> None:
    assert_erro(client.get("/ocorrencias/999999"), 404, "NAO_ENCONTRADO")
    assert_erro(client.get("/ocorrencias/abc"), 422, "VALIDACAO")


# ---------------------------------------------------------------- status


def test_fluxo_de_status_com_historico(client: TestClient) -> None:
    oid = nova_ocorrencia(client, nova_identificacao(client))["id"]

    for novo, obs in [("EM_ANALISE", "Triagem"), ("EM_ANDAMENTO", None), ("RESOLVIDA", "Calçada refeita")]:
        r = client.patch(f"/ocorrencias/{oid}/status", json={"status": novo, "observacao": obs}, headers=ADMIN)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == novo

    historico = client.get(f"/ocorrencias/{oid}").json()["historico_status"]
    assert [(h["status_anterior"], h["status_novo"], h["observacao"]) for h in historico] == [
        (None, "ABERTA", "Ocorrência registrada."),
        ("ABERTA", "EM_ANALISE", "Triagem"),
        ("EM_ANALISE", "EM_ANDAMENTO", None),
        ("EM_ANDAMENTO", "RESOLVIDA", "Calçada refeita"),
    ]

    # RESOLVIDA é final.
    r = client.patch(f"/ocorrencias/{oid}/status", json={"status": "ABERTA"}, headers=ADMIN)
    assert_erro(r, 409, "TRANSICAO_INVALIDA")


def test_transicao_invalida_nao_altera_nada(client: TestClient) -> None:
    oid = nova_ocorrencia(client, nova_identificacao(client))["id"]
    r = client.patch(f"/ocorrencias/{oid}/status", json={"status": "RESOLVIDA"}, headers=ADMIN)
    corpo = assert_erro(r, 409, "TRANSICAO_INVALIDA")
    assert "EM_ANALISE, REJEITADA" in corpo["erro"]["mensagem"]
    detalhe = client.get(f"/ocorrencias/{oid}").json()
    assert detalhe["status"] == "ABERTA" and len(detalhe["historico_status"]) == 1


def test_status_exige_token_admin(client: TestClient) -> None:
    oid = nova_ocorrencia(client, nova_identificacao(client))["id"]
    corpo = {"status": "EM_ANALISE"}
    assert_erro(client.patch(f"/ocorrencias/{oid}/status", json=corpo), 401, "NAO_AUTORIZADO")
    assert_erro(
        client.patch(f"/ocorrencias/{oid}/status", json=corpo, headers={"X-Admin-Token": "errado"}),
        401,
        "NAO_AUTORIZADO",
    )
    assert_erro(client.patch("/ocorrencias/999999/status", json=corpo, headers=ADMIN), 404, "NAO_ENCONTRADO")
    assert_erro(
        client.patch(f"/ocorrencias/{oid}/status", json={"status": "X"}, headers=ADMIN), 422, "VALIDACAO"
    )


def test_status_com_admin_desabilitado(client: TestClient) -> None:
    oid = nova_ocorrencia(client, nova_identificacao(client))["id"]
    sem_admin = Settings(admin_token="")
    client.app.dependency_overrides[get_settings] = lambda: sem_admin  # type: ignore[attr-defined]
    r = client.patch(f"/ocorrencias/{oid}/status", json={"status": "EM_ANALISE"}, headers=ADMIN)
    assert_erro(r, 403, "ADMIN_DESABILITADO")


# ---------------------------------------------------------------- imagem


def enviar(client: TestClient, oid: int, ident: str, conteudo: bytes, nome: str = "foto.jpg", tipo: str = "image/jpeg") -> Any:
    return client.post(
        f"/ocorrencias/{oid}/imagem",
        files={"arquivo": (nome, conteudo, tipo)},
        headers={"X-Identificacao-Id": ident},
    )


def test_upload_valido_e_download_sem_exif(client: TestClient) -> None:
    ident = nova_identificacao(client)
    oid = nova_ocorrencia(client, ident)["id"]

    r = enviar(client, oid, ident, imagens.jpeg_com_exif())
    assert r.status_code == 200, r.text
    assert r.json()["imagem_url"] == f"/ocorrencias/{oid}/imagem"
    # Sem modelo: a análise continua indisponível, nada é inventado.
    assert r.json()["analise_ia"]["status"] == "INDISPONIVEL"

    baixada = client.get(f"/ocorrencias/{oid}/imagem")
    assert baixada.status_code == 200
    assert baixada.headers["content-type"] == "image/jpeg"
    img = Image.open(BytesIO(baixada.content))
    assert img.format == "JPEG" and len(img.getexif()) == 0


def test_upload_valida_conteudo_e_nao_extensao(client: TestClient) -> None:
    ident = nova_identificacao(client)
    oid = nova_ocorrencia(client, ident)["id"]
    # Texto com nome e MIME de JPEG: recusado pelo conteúdo.
    assert_erro(enviar(client, oid, ident, b"nao sou imagem"), 415, "FORMATO_NAO_SUPORTADO")
    assert_erro(enviar(client, oid, ident, imagens.gif(), "x.png", "image/png"), 415, "FORMATO_NAO_SUPORTADO")
    # PNG real enviado com nome/MIME "errados" é aceito (vale o conteúdo).
    r = enviar(client, oid, ident, imagens.png(), "../../foto.exe", "application/octet-stream")
    assert r.status_code == 200, r.text
    assert client.get(f"/ocorrencias/{oid}/imagem").headers["content-type"] == "image/png"


def test_upload_regras_de_negocio(client: TestClient) -> None:
    ident = nova_identificacao(client)
    outra = nova_identificacao(client, "Outra pessoa")
    oid = nova_ocorrencia(client, ident)["id"]

    assert_erro(enviar(client, oid, outra, imagens.png()), 403, "PROIBIDO")
    assert_erro(enviar(client, 999999, ident, imagens.png()), 404, "NAO_ENCONTRADO")
    assert_erro(enviar(client, oid, ident, b""), 422, "VALIDACAO")
    assert_erro(client.post(f"/ocorrencias/{oid}/imagem", files={"arquivo": ("a.png", imagens.png())}), 422, "VALIDACAO")
    assert enviar(client, oid, ident, imagens.png()).status_code == 200
    assert_erro(enviar(client, oid, ident, imagens.png()), 409, "IMAGEM_JA_ENVIADA")


def test_upload_acima_do_limite(client: TestClient) -> None:
    ident = nova_identificacao(client)
    oid = nova_ocorrencia(client, ident)["id"]
    # Limite de teste: 1 MB. Pouco acima: barrado na leitura do arquivo.
    pouco_acima = imagens.png() + b"\0" * (1024 * 1024 + 10)
    assert_erro(enviar(client, oid, ident, pouco_acima), 413, "ARQUIVO_MUITO_GRANDE")
    # Muito acima: barrado antes, pelo Content-Length (middleware).
    muito_acima = imagens.png() + b"\0" * (2 * 1024 * 1024)
    assert_erro(enviar(client, oid, ident, muito_acima), 413, "ARQUIVO_MUITO_GRANDE")
    assert client.get(f"/ocorrencias/{oid}").json()["imagem_url"] is None


def test_imagem_inexistente(client: TestClient) -> None:
    oid = nova_ocorrencia(client, nova_identificacao(client))["id"]
    assert_erro(client.get(f"/ocorrencias/{oid}/imagem"), 404, "NAO_ENCONTRADO")
    assert_erro(client.get("/ocorrencias/999999/imagem"), 404, "NAO_ENCONTRADO")
