from pathlib import Path

from app.config import Settings
from app.enums import CategoriaOcorrencia
from app.services.ia import EntradaClassificacao, criar_classificador


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
