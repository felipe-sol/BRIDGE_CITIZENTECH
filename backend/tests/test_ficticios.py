"""Dados fictícios de demonstração: geração pura e determinística, gravação e remoção seguras."""

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.enums import NivelAlerta, StatusOcorrencia
from app.services.ficticios import (
    DIAS_PADRAO,
    IDENTIFICACOES_FICTICIAS,
    QUANTIDADE_PADRAO,
    SEMENTE_PADRAO,
    OcorrenciaFicticia,
    distribuicao_alertas,
    existem_ficticios,
    gerar_lote,
    gravar_lote,
    remover_ficticios,
)
from app.services.regioes import localizar_regiao
from app.services.transicoes import TRANSICOES_PERMITIDAS
from tests.test_api import nova_identificacao, nova_ocorrencia

AGORA = datetime(2026, 11, 14, 12, 0, tzinfo=UTC)
LOTE = gerar_lote(SEMENTE_PADRAO, QUANTIDADE_PADRAO, DIAS_PADRAO, AGORA)


def fracao_resolvidas(lote: list[OcorrenciaFicticia], minimo: int = 0, maximo: int = 10**6) -> float:
    grupo = [o for o in lote if minimo <= (AGORA - o.criado_em).days < maximo]
    return sum(1 for o in grupo if o.historico[-1][1] is StatusOcorrencia.RESOLVIDA) / len(grupo)


# ------------------------------------------------------------ geração (pura)


def test_lote_deterministico_e_no_tamanho() -> None:
    assert len(LOTE) == 1200
    assert LOTE == gerar_lote(SEMENTE_PADRAO, 1200, 120, AGORA)
    assert LOTE[:10] != gerar_lote(SEMENTE_PADRAO + 1, 10, 120, AGORA)


def test_pontos_dentro_de_sp_e_rotulados() -> None:
    for o in LOTE:
        regiao = localizar_regiao(o.latitude, o.longitude)
        assert regiao is not None and regiao.codigo == o.subprefeitura_codigo
        assert o.endereco == f"Endereço fictício · {regiao.nome}"
        assert o.descricao.endswith("(dado fictício)")
        assert AGORA - timedelta(days=120) <= o.criado_em <= AGORA
    assert len({o.subprefeitura_codigo for o in LOTE}) == 32  # a cidade inteira tem dados


def test_historico_valido_e_cronologico() -> None:
    for o in LOTE:
        anterior, momento = None, o.criado_em
        assert o.historico[0][:2] == (None, StatusOcorrencia.ABERTA)
        for de, para, quando, obs in o.historico:
            assert de == anterior and (de is None or para in TRANSICOES_PERMITIDAS[de])
            assert momento <= quando <= AGORA
            assert obs.startswith("Equipe responsável (fictício):")
            anterior, momento = para, quando


def test_mais_antigas_mais_resolvidas() -> None:
    assert fracao_resolvidas(LOTE, minimo=60) > 0.5 > fracao_resolvidas(LOTE, maximo=30)


def test_confirmadores_sem_autor_e_sem_repeticao() -> None:
    for o in LOTE:
        assert 1 <= o.autor <= len(IDENTIFICACOES_FICTICIAS)
        assert o.autor not in o.confirmadores and len(set(o.confirmadores)) == len(o.confirmadores)
        assert all(1 <= c <= len(IDENTIFICACOES_FICTICIAS) for c in o.confirmadores)
    assert any(o.confirmadores for o in LOTE)


def test_calibracao_do_exemplo() -> None:
    d = distribuicao_alertas(LOTE, AGORA)
    assert sum(d.values()) == 32
    assert 2 <= d[NivelAlerta.ALERTA] <= 4 and 4 <= d[NivelAlerta.ATENCAO] <= 8


# ------------------------------------------------------------ gravação e remoção (banco)


def test_gravar_e_remover_nao_tocam_dados_reais(client: TestClient, banco_migrado: Engine) -> None:
    real = nova_identificacao(client)
    oid = nova_ocorrencia(client, real)["id"]
    with Session(banco_migrado) as db:
        assert not existem_ficticios(db)
        assert gravar_lote(db, LOTE[:50]) == 50
        assert existem_ficticios(db)
        assert remover_ficticios(db) == (50, len(IDENTIFICACOES_FICTICIAS))
        assert not existem_ficticios(db)
    assert client.get(f"/ocorrencias/{oid}").status_code == 200
    assert client.get("/identificacoes/atual", headers={"X-Identificacao-Id": real}).status_code == 200


def test_ficticios_gravados_ficam_separados(client: TestClient, banco_migrado: Engine) -> None:
    with Session(banco_migrado) as db:
        gravar_lote(db, LOTE[:20])
    assert client.get("/ocorrencias").json()["total"] == 0
    simuladas = client.get("/ocorrencias", params={"origem": "SIMULADA", "tamanho": 100}).json()
    assert simuladas["total"] == 20
    detalhe = client.get(f"/ocorrencias/{simuladas['itens'][0]['id']}").json()
    assert detalhe["origem"] == "SIMULADA" and detalhe["imagem_url"] is None
    assert detalhe["historico_status"][0]["observacao"].startswith("Equipe responsável (fictício):")
