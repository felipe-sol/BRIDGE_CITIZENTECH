"""Valores controlados do domínio (ver docs/CONTRATO_API.md)."""

from enum import StrEnum


class CategoriaOcorrencia(StrEnum):
    CALCADA_DANIFICADA = "CALCADA_DANIFICADA"
    BURACO = "BURACO"
    ILUMINACAO_DEFEITUOSA = "ILUMINACAO_DEFEITUOSA"
    OBSTACULO_CIRCULACAO = "OBSTACULO_CIRCULACAO"
    OUTRO = "OUTRO"


class StatusOcorrencia(StrEnum):
    ABERTA = "ABERTA"
    EM_ANALISE = "EM_ANALISE"
    EM_ANDAMENTO = "EM_ANDAMENTO"
    RESOLVIDA = "RESOLVIDA"
    REJEITADA = "REJEITADA"


class Prioridade(StrEnum):
    BAIXA = "BAIXA"
    MEDIA = "MEDIA"
    ALTA = "ALTA"


class OrigemOcorrencia(StrEnum):
    """APP = registrada por uma pessoa; SIMULADA = dado fictício de demonstração."""

    APP = "APP"
    SIMULADA = "SIMULADA"


class StatusAnaliseIA(StrEnum):
    PENDENTE = "PENDENTE"
    CONCLUIDA = "CONCLUIDA"
    INDISPONIVEL = "INDISPONIVEL"
    FALHOU = "FALHOU"
