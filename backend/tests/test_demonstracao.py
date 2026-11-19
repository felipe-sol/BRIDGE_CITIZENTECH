"""Pacote de demonstração: registros reais da equipe para o professor ver numa instalação nova."""

import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.enums import CategoriaOcorrencia, OrigemOcorrencia
from app.services.demonstracao import (
    NOTA_DEMONSTRACAO,
    PASTA_DEMO,
    DemonstracaoJaImportada,
    PacoteInvalido,
    existe_demonstracao,
    identificacao_demo,
    importar_demonstracao,
    ler_pacote,
    remover_demonstracao,
)
from app.services.ia.base import EntradaClassificacao
from app.services.ia.texto import descricao_para_ia
from app.services.ocorrencias import analisar_pendentes
from app.services.regioes import localizar_regiao
from tests.conftest import UPLOAD_DIR_TESTE
from tests.imagens import jpeg_com_exif
from tests.test_api import nova_identificacao, nova_ocorrencia
from tests.test_ia_lote import _modelo


def registro(**alteracoes: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "autor": "Pessoa Demo",
        "titulo": "Calçada danificada",
        "descricao": "Calçada com buraco",
        "categoria": "CALCADA_DANIFICADA",
        "latitude": -23.6489,
        "longitude": -46.7061,
        "endereco": "Rua de exemplo — Santo Amaro",
        "risco_imediato": False,
        "bloqueia_passagem": True,
        "afeta_acessibilidade": True,
        "criado_em": "2026-11-17T15:00:00Z",
        "foto": "calcada.jpg",
    }
    base.update(alteracoes)
    return base


def montar_pacote(pasta: Path, registros: list[dict[str, Any]], fotos: tuple[str, ...] = ("calcada.jpg",)) -> Path:
    (pasta / "fotos").mkdir(parents=True)
    for nome in fotos:
        (pasta / "fotos" / nome).write_bytes(jpeg_com_exif())
    (pasta / "registros.json").write_text(json.dumps({"registros": registros}, ensure_ascii=False), encoding="utf-8")
    return pasta


# ------------------------------------------------------------- pacote (sem banco)


def test_pacote_do_repositorio_e_valido() -> None:
    pacote = ler_pacote(PASTA_DEMO)
    assert len(pacote.registros) >= 1
    creditos = (PASTA_DEMO / "CREDITOS.md").read_text(encoding="utf-8")
    assert any(localizar_regiao(r.latitude, r.longitude) is not None for r in pacote.registros)
    for r in pacote.registros:
        if r.foto is not None:
            assert (PASTA_DEMO / "fotos" / r.foto).is_file()
            assert r.foto in creditos  # toda foto ilustrativa tem autor e licença registrados


def test_ler_pacote_recusa_categoria_invalida(tmp_path: Path) -> None:
    with pytest.raises(PacoteInvalido):
        ler_pacote(montar_pacote(tmp_path, [registro(categoria="BUEIRO")]))


def test_ler_pacote_recusa_coordenada_invalida(tmp_path: Path) -> None:
    with pytest.raises(PacoteInvalido):
        ler_pacote(montar_pacote(tmp_path, [registro(latitude=91)]))


def test_ler_pacote_aceita_ponto_fora_de_sp_como_o_cadastro(tmp_path: Path) -> None:
    pacote = ler_pacote(montar_pacote(tmp_path, [registro(latitude=-23.6229, longitude=-46.5548)]))  # São Caetano
    assert len(pacote.registros) == 1


def test_ler_pacote_recusa_foto_ausente(tmp_path: Path) -> None:
    with pytest.raises(PacoteInvalido):
        ler_pacote(montar_pacote(tmp_path, [registro(foto="nao-existe.jpg")]))


def test_ler_pacote_recusa_foto_fora_da_pasta(tmp_path: Path) -> None:
    with pytest.raises(PacoteInvalido):
        ler_pacote(montar_pacote(tmp_path, [registro(foto="../registros.json")]))


# ------------------------------------------------------------- banco


def test_importar_cria_registros_reais_rotulados_com_foto(
    client: TestClient, banco_migrado: Engine, tmp_path: Path
) -> None:
    pasta = montar_pacote(tmp_path, [registro(), registro(titulo="Buraco", categoria="BURACO", foto=None)])
    with Session(banco_migrado) as db:
        assert importar_demonstracao(db, ler_pacote(pasta), pasta, UPLOAD_DIR_TESTE) == 2

    lista = client.get("/ocorrencias").json()
    assert lista["total"] == 2  # aparecem no modo "Ao vivo", como registros feitos pelo app
    com_foto = next(o for o in lista["itens"] if o["titulo"] == "Calçada danificada")
    detalhe = client.get(f"/ocorrencias/{com_foto['id']}").json()
    assert detalhe["origem"] == "APP"
    assert detalhe["descricao"] == f"Calçada com buraco. {NOTA_DEMONSTRACAO}"
    assert detalhe["subprefeitura"] is not None
    assert detalhe["prioridade"] == "ALTA"  # mesma regra de pontuação do cadastro
    assert detalhe["criado_em"].startswith("2026-11-17")
    imagem = client.get(f"/ocorrencias/{com_foto['id']}/imagem")
    assert imagem.status_code == 200 and imagem.headers["content-type"] == "image/jpeg"
    assert b"FabricanteFicticio" not in imagem.content  # a foto passa pela mesma limpeza de metadados

    autor = str(identificacao_demo("Pessoa Demo"))
    atual = client.get("/identificacoes/atual", headers={"X-Identificacao-Id": autor})
    assert atual.status_code == 200 and atual.json()["apelido"] == "Pessoa Demo"
    minhas = client.get("/ocorrencias/minhas", headers={"X-Identificacao-Id": autor}).json()
    assert minhas["total"] == 2


def test_aviso_de_demonstracao_nao_vai_para_a_ia() -> None:
    assert descricao_para_ia(f"Calçada quebrada. {NOTA_DEMONSTRACAO}") == "Calçada quebrada."
    assert descricao_para_ia("Calçada quebrada perto da escola") == "Calçada quebrada perto da escola"


def test_ia_analisa_a_demonstracao_so_pelo_texto_da_pessoa(
    client: TestClient, banco_migrado: Engine, tmp_path: Path
) -> None:
    pasta = montar_pacote(tmp_path, [registro(titulo="Poste apagado", descricao="muito pouca luz", foto=None)])
    modelo = _modelo()
    sem_aviso = modelo.classificar(
        EntradaClassificacao(
            titulo="Poste apagado", descricao="muito pouca luz", categoria_informada=CategoriaOcorrencia.CALCADA_DANIFICADA,
            latitude=-23.6489, longitude=-46.7061, risco_imediato=False, bloqueia_passagem=True,
            afeta_acessibilidade=True, caminho_imagem=None,
        )
    )
    with Session(banco_migrado) as db:
        importar_demonstracao(db, ler_pacote(pasta), pasta, UPLOAD_DIR_TESTE)
        analisar_pendentes(db, modelo, OrigemOcorrencia.APP)
    analise = client.get("/ocorrencias").json()["itens"][0]["analise_ia"]
    assert analise["categoria_sugerida"] == sem_aviso.categoria_sugerida
    assert analise["confianca"] == pytest.approx(sem_aviso.confianca)


def test_importar_duas_vezes_e_recusado(client: TestClient, banco_migrado: Engine, tmp_path: Path) -> None:
    pasta = montar_pacote(tmp_path, [registro()])
    with Session(banco_migrado) as db:
        importar_demonstracao(db, ler_pacote(pasta), pasta, UPLOAD_DIR_TESTE)
        assert existe_demonstracao(db)
        with pytest.raises(DemonstracaoJaImportada):
            importar_demonstracao(db, ler_pacote(pasta), pasta, UPLOAD_DIR_TESTE)
    assert client.get("/ocorrencias").json()["total"] == 1


def test_remover_apaga_so_a_demonstracao(client: TestClient, banco_migrado: Engine, tmp_path: Path) -> None:
    professor = nova_identificacao(client, "Professor")
    propria = nova_ocorrencia(client, professor)["id"]
    pasta = montar_pacote(tmp_path, [registro(), registro(titulo="Outra calçada")])
    with Session(banco_migrado) as db:
        importar_demonstracao(db, ler_pacote(pasta), pasta, UPLOAD_DIR_TESTE)
    fotos_antes = set(UPLOAD_DIR_TESTE.iterdir())
    assert len(fotos_antes) == 2

    with Session(banco_migrado) as db:
        assert remover_demonstracao(db, UPLOAD_DIR_TESTE) == (2, 1)
        assert not existe_demonstracao(db)
    assert list(UPLOAD_DIR_TESTE.iterdir()) == []  # as fotos copiadas também saem
    lista = client.get("/ocorrencias").json()
    assert [o["id"] for o in lista["itens"]] == [propria]
    assert client.get("/identificacoes/atual", headers={"X-Identificacao-Id": professor}).status_code == 200
