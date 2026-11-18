"""Análise de IA em lote: ocorrências registradas antes do modelo (scripts/analisar_ia.py)."""

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import Engine, text
from sqlalchemy.orm import Session

from app.config import Settings
from app.enums import OrigemOcorrencia
from app.models import Ocorrencia
from app.services.ia import ClassificadorIndisponivel, ClassificadorOcorrencia, criar_classificador
from app.services.ocorrencias import ResumoAnalise, analisar_pendentes
from tests.fabricas import inserir_ocorrencia
from tests.test_api import nova_identificacao
from tests.test_ia_classificador_texto import CAMINHO_MODELO, VERSAO_MODELO

SE = {"latitude": -23.5503, "longitude": -46.634}
POSTE = {"titulo": "Poste apagado na esquina", "descricao": "A lâmpada está queimada e a rua fica escura à noite."}
BURACO = {"titulo": "Buraco enorme na rua", "descricao": "Um buraco fundo no asfalto, quase caí de moto."}


def _modelo() -> ClassificadorOcorrencia:
    return criar_classificador(Settings(modelo_ia_caminho=str(CAMINHO_MODELO), modelo_ia_versao=VERSAO_MODELO))


def _status_ia(engine: Engine, ocorrencia_id: int) -> str:
    with Session(engine) as db:
        ocorrencia = db.get(Ocorrencia, ocorrencia_id)
        assert ocorrencia is not None
        return ocorrencia.ia_status.value


def _definir_ia(engine: Engine, ocorrencia_id: int, status: str, sugerida: str | None, confianca: float | None) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE ocorrencias SET ia_status = :s, ia_categoria_sugerida = :c, ia_confianca = :p WHERE id = :i"),
            {"s": status, "c": sugerida, "p": confianca, "i": ocorrencia_id},
        )


def test_analisa_registros_antigos_reais_e_ficticios_sem_mudar_atualizado_em(
    client: TestClient, banco_migrado: Engine
) -> None:
    ident = nova_identificacao(client)
    antiga = datetime.now(UTC) - timedelta(days=10)
    real = inserir_ocorrencia(banco_migrado, ident, **SE, criado_em=antiga, **POSTE)
    ficticia = inserir_ocorrencia(banco_migrado, ident, **SE, origem="SIMULADA", criado_em=antiga, **BURACO)
    falhou = inserir_ocorrencia(banco_migrado, ident, **SE, criado_em=antiga, **BURACO)
    _definir_ia(banco_migrado, falhou, "FALHOU", None, None)
    ja_analisada = inserir_ocorrencia(banco_migrado, ident, **SE, criado_em=antiga, **POSTE)
    _definir_ia(banco_migrado, ja_analisada, "CONCLUIDA", "OUTRO", 0.9)

    with Session(banco_migrado) as db:
        resumo = analisar_pendentes(db, _modelo())

    assert resumo == ResumoAnalise(analisadas=3, concluidas=3, falharam=0)
    with Session(banco_migrado) as db:
        por_id = {o.id: o for o in db.query(Ocorrencia).all()}
    assert por_id[real].ia_status.value == "CONCLUIDA"
    assert por_id[real].ia_categoria_sugerida == "ILUMINACAO_DEFEITUOSA"
    assert por_id[real].ia_versao_modelo == VERSAO_MODELO
    assert por_id[ficticia].ia_categoria_sugerida == "BURACO"
    assert por_id[falhou].ia_status.value == "CONCLUIDA"
    # A já analisada não é refeita.
    assert por_id[ja_analisada].ia_categoria_sugerida == "OUTRO"
    assert por_id[ja_analisada].ia_confianca == 0.9
    # Analisar não é uma atualização da equipe: o "Atualizada" do app não pode acender.
    for ocorrencia_id in (real, ficticia, falhou):
        assert por_id[ocorrencia_id].atualizado_em == antiga


def test_analise_em_lote_pode_ficar_so_numa_origem(client: TestClient, banco_migrado: Engine) -> None:
    ident = nova_identificacao(client)
    real = inserir_ocorrencia(banco_migrado, ident, **SE, **POSTE)
    ficticia = inserir_ocorrencia(banco_migrado, ident, **SE, origem="SIMULADA", **BURACO)

    with Session(banco_migrado) as db:
        resumo = analisar_pendentes(db, _modelo(), origem=OrigemOcorrencia.APP)

    assert resumo.analisadas == 1
    assert _status_ia(banco_migrado, real) == "CONCLUIDA"
    assert _status_ia(banco_migrado, ficticia) == "INDISPONIVEL"


def test_sem_modelo_a_analise_em_lote_nao_mexe_em_nada(client: TestClient, banco_migrado: Engine) -> None:
    ident = nova_identificacao(client)
    real = inserir_ocorrencia(banco_migrado, ident, **SE, **POSTE)

    with Session(banco_migrado) as db:
        resumo = analisar_pendentes(db, ClassificadorIndisponivel())

    assert resumo == ResumoAnalise(analisadas=0, concluidas=0, falharam=0)
    assert _status_ia(banco_migrado, real) == "INDISPONIVEL"


def test_refazer_reanalisa_tambem_as_ja_concluidas(client: TestClient, banco_migrado: Engine) -> None:
    ident = nova_identificacao(client)
    antiga = datetime.now(UTC) - timedelta(days=3)
    concluida = inserir_ocorrencia(banco_migrado, ident, **SE, criado_em=antiga, **POSTE)
    _definir_ia(banco_migrado, concluida, "CONCLUIDA", "OUTRO", 0.9)

    with Session(banco_migrado) as db:
        resumo = analisar_pendentes(db, _modelo(), refazer=True)

    assert resumo.analisadas == 1
    with Session(banco_migrado) as db:
        ocorrencia = db.get(Ocorrencia, concluida)
        assert ocorrencia is not None
        assert ocorrencia.ia_categoria_sugerida == "ILUMINACAO_DEFEITUOSA"
        assert ocorrencia.atualizado_em == antiga
