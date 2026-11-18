"""Adaptador de inferência textual do modelo BRIDGE.

O artefato deve ser um Pipeline scikit-learn contendo TF-IDF + LogisticRegression.
Somente titulo e descricao são usados; categoria_informada não é feature.
"""
from pathlib import Path
from typing import Any

import joblib

from app.config import BACKEND_DIR
from app.enums import CategoriaOcorrencia
from app.services.ia.base import EntradaClassificacao, ResultadoClassificacao


class ClassificadorTextoSklearn:
    """Carrega um pipeline serializado e sugere a categoria da ocorrência."""

    def __init__(self, caminho_modelo: str, versao: str | None = None) -> None:
        caminho = Path(caminho_modelo).expanduser()
        if not caminho.is_absolute():
            caminho = (BACKEND_DIR / caminho).resolve()
        if not caminho.is_file():
            raise FileNotFoundError(f"Artefato de IA não encontrado: {caminho}")

        self._caminho = caminho
        self._modelo: Any = joblib.load(caminho)
        self._versao = versao or "bridge-text-classifier-1.0.0"

        classes_modelo = {str(classe) for classe in getattr(self._modelo, "classes_", [])}
        classes_oficiais = {categoria.value for categoria in CategoriaOcorrencia}
        if classes_modelo != classes_oficiais:
            raise ValueError(
                "Classes do artefato incompatíveis com CategoriaOcorrencia. "
                f"Esperado: {sorted(classes_oficiais)}; recebido: {sorted(classes_modelo)}"
            )
        if not hasattr(self._modelo, "predict_proba"):
            raise TypeError("O pipeline precisa implementar predict_proba para fornecer confianca.")

    @property
    def disponivel(self) -> bool:
        return True

    @property
    def versao(self) -> str | None:
        return self._versao

    @property
    def requer_imagem(self) -> bool:
        return False

    def classificar(self, entrada: EntradaClassificacao) -> ResultadoClassificacao:
        texto = f"{entrada.titulo or ''} {entrada.descricao or ''}".strip()
        if not texto:
            raise ValueError("Título e descrição não podem estar vazios.")

        categoria = str(self._modelo.predict([texto])[0])
        categorias_validas = {item.value for item in CategoriaOcorrencia}
        if categoria not in categorias_validas:
            raise ValueError(f"O modelo retornou uma categoria desconhecida: {categoria}")

        probabilidades = self._modelo.predict_proba([texto])[0]
        confianca = float(max(probabilidades))
        return ResultadoClassificacao(categoria_sugerida=categoria, confianca=confianca)
