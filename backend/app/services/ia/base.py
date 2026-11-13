"""Interface do classificador de ocorrências (docs/CONTRATO_IA.md).

Qualquer modelo do colega deve ser encapsulado em uma classe que siga
`ClassificadorOcorrencia`. O restante do backend só conhece esta interface.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from app.enums import CategoriaOcorrencia


@dataclass(frozen=True)
class EntradaClassificacao:
    """Dados disponíveis para o modelo. Nada além do que foi coletado."""

    titulo: str
    descricao: str
    categoria_informada: CategoriaOcorrencia
    latitude: float
    longitude: float
    risco_imediato: bool
    bloqueia_passagem: bool
    afeta_acessibilidade: bool
    caminho_imagem: Path | None


@dataclass(frozen=True)
class ResultadoClassificacao:
    categoria_sugerida: str
    # Somente se o modelo realmente fornecer probabilidade/score (0 a 1).
    confianca: float | None


class ClassificadorOcorrencia(Protocol):
    @property
    def disponivel(self) -> bool: ...

    @property
    def versao(self) -> str | None: ...

    @property
    def requer_imagem(self) -> bool: ...

    def classificar(self, entrada: EntradaClassificacao) -> ResultadoClassificacao: ...
