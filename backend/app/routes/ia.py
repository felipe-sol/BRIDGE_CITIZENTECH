"""Sugestão da IA durante o registro: o app pergunta antes de enviar. Não grava nada."""

import logging
import math

from fastapi import APIRouter

from app.deps import Classificador
from app.schemas import SugestaoCategoriaPedido, SugestaoCategoriaResposta
from app.services.ia import EntradaClassificacao

logger = logging.getLogger("bridge.ia")

router = APIRouter(prefix="/ia", tags=["ia"])

INDISPONIVEL = SugestaoCategoriaResposta(disponivel=False, categoria_sugerida=None, confianca=None, versao_modelo=None)


@router.post(
    "/sugestao-categoria",
    response_model=SugestaoCategoriaResposta,
    summary="Sugere a categoria pelo que a pessoa escreveu (só sugestão; não grava nada)",
)
def sugerir_categoria(dados: SugestaoCategoriaPedido, classificador: Classificador) -> SugestaoCategoriaResposta:
    # Sem modelo (ou modelo que precisa da foto, que ainda não foi enviada): sem sugestão.
    if not classificador.disponivel or classificador.requer_imagem:
        return INDISPONIVEL
    entrada = EntradaClassificacao(
        titulo=dados.titulo,
        descricao=dados.descricao,
        categoria_informada=dados.categoria,
        latitude=dados.latitude,
        longitude=dados.longitude,
        risco_imediato=dados.risco_imediato,
        bloqueia_passagem=dados.bloqueia_passagem,
        afeta_acessibilidade=dados.afeta_acessibilidade,
        caminho_imagem=None,
    )
    try:
        resultado = classificador.classificar(entrada)
        confianca = resultado.confianca
        if confianca is not None and not (math.isfinite(confianca) and 0.0 <= confianca <= 1.0):
            raise ValueError("Confiança fora do intervalo 0–1.")
    except Exception:
        # Sem os textos do cidadão no log.
        logger.exception("Falha na sugestão de categoria da IA")
        return INDISPONIVEL
    return SugestaoCategoriaResposta(
        disponivel=True,
        categoria_sugerida=resultado.categoria_sugerida[:50],
        confianca=confianca,
        versao_modelo=classificador.versao,
    )
