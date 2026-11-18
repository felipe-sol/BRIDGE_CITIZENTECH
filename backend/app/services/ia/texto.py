"""O que vai para a IA: só o texto que a PESSOA escreveu.

O app preenche o título sozinho com o nome da categoria escolhida ("Calçada danificada").
Se esse título entrar no texto, a IA lê a própria escolha da pessoa e só a repete (caso real
do teste no iPhone em 17/11/2026). Por isso, título igual ao nome de uma categoria não vai
para a IA; o título gravado na ocorrência não muda.
"""

import unicodedata

from app.enums import CategoriaOcorrencia

# Mesmos nomes de ROTULO_CATEGORIA em mobile/src/models/ocorrencia.ts.
ROTULOS_DAS_CATEGORIAS: dict[CategoriaOcorrencia, str] = {
    CategoriaOcorrencia.CALCADA_DANIFICADA: "Calçada danificada",
    CategoriaOcorrencia.BURACO: "Buraco",
    CategoriaOcorrencia.ILUMINACAO_DEFEITUOSA: "Iluminação defeituosa",
    CategoriaOcorrencia.OBSTACULO_CIRCULACAO: "Obstáculo à circulação",
    CategoriaOcorrencia.OUTRO: "Outro problema",
}


def _normalizar(texto: str) -> str:
    sem_acentos = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    return " ".join(sem_acentos.lower().split())


_TITULOS_AUTOMATICOS = {_normalizar(rotulo) for rotulo in ROTULOS_DAS_CATEGORIAS.values()}


def titulo_para_ia(titulo: str) -> str:
    """O título, ou "" se ele for só o nome de uma categoria (preenchido pelo app)."""
    return "" if _normalizar(titulo) in _TITULOS_AUTOMATICOS else titulo
