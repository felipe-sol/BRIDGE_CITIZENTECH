"""Integração com o modelo de IA do colega (ver docs/CONTRATO_IA.md)."""

import logging

from app.config import Settings
from app.services.ia.base import ClassificadorOcorrencia, EntradaClassificacao, ResultadoClassificacao
from app.services.ia.indisponivel import ClassificadorIndisponivel

logger = logging.getLogger("bridge.ia")

__all__ = [
    "ClassificadorOcorrencia",
    "ClassificadorIndisponivel",
    "EntradaClassificacao",
    "ResultadoClassificacao",
    "criar_classificador",
]


def criar_classificador(settings: Settings) -> ClassificadorOcorrencia:
    """Chamado UMA vez na inicialização da API (lifespan).

    Enquanto o modelo do colega não for entregue e um adaptador não for escrito
    para ele, devolve sempre o classificador indisponível.
    """
    if not settings.modelo_ia_caminho:
        logger.info("IA: nenhum modelo configurado (MODELO_IA_CAMINHO vazio). Análises ficarão INDISPONIVEL.")
        return ClassificadorIndisponivel()

    # Ponto de extensão: quando o modelo chegar, instanciar aqui o adaptador real
    # (ex.: ClassificadorImagemSklearn(settings.modelo_ia_caminho, settings.modelo_ia_versao)).
    logger.warning(
        "IA: MODELO_IA_CAMINHO foi definido, mas nenhum adaptador foi implementado ainda. "
        "Usando classificador indisponível."
    )
    return ClassificadorIndisponivel()
