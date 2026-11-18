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

    Com `MODELO_IA_CAMINHO` definido, carrega o classificador textual (`ia_ml/`).
    Sem o caminho, ou se o modelo não puder ser carregado (arquivo ausente ou
    corrompido, dependência faltando), a API sobe do mesmo jeito com o
    classificador indisponível: as análises ficam "INDISPONIVEL".
    """
    if not settings.modelo_ia_caminho:
        logger.info("IA: nenhum modelo configurado (MODELO_IA_CAMINHO vazio). Análises ficarão INDISPONIVEL.")
        return ClassificadorIndisponivel()

    try:
        # Importado só aqui: o scikit-learn só é carregado quando há modelo configurado.
        from app.services.ia.classificador_texto import ClassificadorTextoSklearn

        classificador = ClassificadorTextoSklearn(settings.modelo_ia_caminho, settings.modelo_ia_versao or None)
    except Exception:
        logger.exception(
            "IA: não foi possível carregar o modelo de MODELO_IA_CAMINHO. A API segue sem IA (análises INDISPONIVEL)."
        )
        return ClassificadorIndisponivel()

    logger.info("IA: modelo %s carregado.", classificador.versao)
    return classificador
