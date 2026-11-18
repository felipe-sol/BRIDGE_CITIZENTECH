from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import Settings
from app.deps import get_classificador
from app.enums import CategoriaOcorrencia
from app.services.ia import ClassificadorIndisponivel, EntradaClassificacao, criar_classificador
from tests.test_api import nova_identificacao, nova_ocorrencia

CAMINHO_MODELO = Path(__file__).resolve().parents[2] / "ia_ml" / "artifacts" / "bridge_text_classifier.joblib"
VERSAO_MODELO = "bridge-text-classifier-1.0.0"


def test_classificador_textual_sugere_categoria_pelo_texto():
    # Teste de integração local do artefato entregue; não depende de banco de dados.
    caminho = Path(__file__).resolve().parents[2] / "ia_ml" / "artifacts" / "bridge_text_classifier.joblib"
    settings = Settings(
        modelo_ia_caminho=str(caminho),
        modelo_ia_versao="bridge-text-classifier-1.0.0",
    )
    classificador = criar_classificador(settings)
    entrada = EntradaClassificacao(
        titulo="Luminária pública apagada",
        descricao="O poste não acende durante a noite e a rua fica escura.",
        categoria_informada=CategoriaOcorrencia.OUTRO,
        latitude=-23.55,
        longitude=-46.63,
        risco_imediato=False,
        bloqueia_passagem=False,
        afeta_acessibilidade=False,
        caminho_imagem=None,
    )

    resultado = classificador.classificar(entrada)

    assert classificador.disponivel is True
    assert classificador.requer_imagem is False
    assert resultado.categoria_sugerida == CategoriaOcorrencia.ILUMINACAO_DEFEITUOSA.value
    assert resultado.confianca is not None and 0 <= resultado.confianca <= 1


def test_modelo_ausente_nao_derruba_a_api(tmp_path: Path) -> None:
    # Caminho errado no .env: a API sobe com a análise "INDISPONIVEL" em vez de falhar.
    classificador = criar_classificador(Settings(modelo_ia_caminho=str(tmp_path / "nao_existe.joblib")))

    assert isinstance(classificador, ClassificadorIndisponivel)
    assert classificador.disponivel is False


def test_arquivo_de_modelo_corrompido_nao_derruba_a_api(tmp_path: Path) -> None:
    corrompido = tmp_path / "corrompido.joblib"
    corrompido.write_bytes(b"isto nao e um modelo")

    classificador = criar_classificador(Settings(modelo_ia_caminho=str(corrompido)))

    assert isinstance(classificador, ClassificadorIndisponivel)


def test_cadastro_com_modelo_grava_sugestao_sem_mudar_categoria_nem_prioridade(client: TestClient) -> None:
    classificador = criar_classificador(Settings(modelo_ia_caminho=str(CAMINHO_MODELO), modelo_ia_versao=VERSAO_MODELO))
    app = client.app
    assert isinstance(app, FastAPI)
    app.dependency_overrides[get_classificador] = lambda: classificador
    identificacao = nova_identificacao(client)

    corpo = nova_ocorrencia(
        client,
        identificacao,
        titulo="Poste apagado na esquina",
        descricao="A lâmpada do poste está queimada e a rua fica escura à noite.",
        categoria="OUTRO",
        risco_imediato=False,
        afeta_acessibilidade=False,
    )

    analise = corpo["analise_ia"]
    assert analise["status"] == "CONCLUIDA"
    assert analise["categoria_sugerida"] == "ILUMINACAO_DEFEITUOSA"
    assert 0 < analise["confianca"] <= 1
    assert analise["versao_modelo"] == VERSAO_MODELO
    # A sugestão é só uma sugestão: a categoria escolhida e a prioridade por regras não mudam.
    assert corpo["categoria"] == "OUTRO"
    assert corpo["prioridade"] == "BAIXA"
    assert corpo["prioridade_pontuacao"] == 1
