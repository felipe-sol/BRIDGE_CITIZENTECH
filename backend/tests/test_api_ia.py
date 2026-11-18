"""POST /ia/sugestao-categoria: sugestão da IA durante o registro, antes de enviar (não grava nada)."""

from typing import Any

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from app.config import Settings
from app.deps import get_classificador
from app.services.ia import EntradaClassificacao, ResultadoClassificacao, criar_classificador
from tests.test_api import assert_erro
from tests.test_ia_classificador_texto import CAMINHO_MODELO, VERSAO_MODELO

ROTA = "/ia/sugestao-categoria"
PEDIDO: dict[str, Any] = {
    "titulo": "Poste apagado na esquina",
    "descricao": "A lâmpada está queimada e a rua fica escura à noite.",
    "categoria": "OUTRO",
    "latitude": -23.5503,
    "longitude": -46.634,
    "risco_imediato": False,
    "bloqueia_passagem": False,
    "afeta_acessibilidade": False,
}


def _usar(client: TestClient, classificador: object) -> None:
    app = client.app
    assert isinstance(app, FastAPI)
    app.dependency_overrides[get_classificador] = lambda: classificador


class _ClassificadorQueFalha:
    disponivel = True
    versao = "teste-falha"
    requer_imagem = False

    def classificar(self, entrada: EntradaClassificacao) -> ResultadoClassificacao:
        raise RuntimeError("falha simulada")


def test_sem_modelo_responde_que_a_ia_esta_indisponivel(client: TestClient) -> None:
    r = client.post(ROTA, json=PEDIDO)

    assert r.status_code == 200
    assert r.json() == {"disponivel": False, "categoria_sugerida": None, "confianca": None, "versao_modelo": None}


def test_com_modelo_sugere_a_categoria_e_nao_grava_nada(client: TestClient, banco_migrado: Engine) -> None:
    _usar(client, criar_classificador(Settings(modelo_ia_caminho=str(CAMINHO_MODELO), modelo_ia_versao=VERSAO_MODELO)))

    r = client.post(ROTA, json=PEDIDO)

    assert r.status_code == 200
    corpo = r.json()
    assert corpo["disponivel"] is True
    assert corpo["categoria_sugerida"] == "ILUMINACAO_DEFEITUOSA"
    assert 0 < corpo["confianca"] <= 1
    assert corpo["versao_modelo"] == VERSAO_MODELO
    with banco_migrado.connect() as conn:
        assert conn.execute(text("SELECT count(*) FROM ocorrencias")).scalar_one() == 0


def test_mesmas_validacoes_do_cadastro(client: TestClient) -> None:
    corpo = assert_erro(client.post(ROTA, json={**PEDIDO, "titulo": "abc", "descricao": "curta"}), 422, "VALIDACAO")
    assert {"titulo", "descricao"} <= {d["campo"] for d in corpo["erro"]["detalhes"]}
    assert_erro(client.post(ROTA, json={**PEDIDO, "campo_extra": 1}), 422, "VALIDACAO")
    assert_erro(client.post(ROTA, json={**PEDIDO, "categoria": "ALAGAMENTO"}), 422, "VALIDACAO")


def test_falha_do_modelo_responde_indisponivel_sem_erro_500(client: TestClient) -> None:
    _usar(client, _ClassificadorQueFalha())

    r = client.post(ROTA, json=PEDIDO)

    assert r.status_code == 200
    assert r.json()["disponivel"] is False
