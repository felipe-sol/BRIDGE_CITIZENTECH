"""Classificador usado quando NENHUM modelo real está configurado.

Não gera previsão alguma: as ocorrências ficam com análise "INDISPONIVEL".
"""

from app.services.ia.base import EntradaClassificacao, ResultadoClassificacao


class ClassificadorIndisponivel:
    @property
    def disponivel(self) -> bool:
        return False

    @property
    def versao(self) -> str | None:
        return None

    @property
    def requer_imagem(self) -> bool:
        return False

    def classificar(self, entrada: EntradaClassificacao) -> ResultadoClassificacao:
        raise RuntimeError("Nenhum modelo de IA configurado; classificar() não deve ser chamado.")
