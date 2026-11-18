"""Schemas Pydantic: contrato de entrada e saída da API (docs/CONTRATO_API.md)."""

import math
import uuid
from datetime import date, datetime
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.enums import (
    CategoriaOcorrencia,
    NivelAlerta,
    OrigemOcorrencia,
    Prioridade,
    StatusAnaliseIA,
    StatusOcorrencia,
)
from app.models import HistoricoStatus, Identificacao, Ocorrencia
from app.services.regioes import regiao_por_codigo

# ---------------------------------------------------------------- Entrada


class EntradaBase(BaseModel):
    # Campos desconhecidos são rejeitados; textos chegam sem espaços nas pontas.
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class IdentificacaoCriar(EntradaBase):
    apelido: str = Field(min_length=2, max_length=60, examples=["Maria do Bairro"])


class OcorrenciaCriar(EntradaBase):
    identificacao_id: uuid.UUID
    titulo: str = Field(min_length=5, max_length=120)
    descricao: str = Field(min_length=10, max_length=2000)
    categoria: CategoriaOcorrencia
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False, strict=True)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False, strict=True)
    risco_imediato: bool = Field(default=False, strict=True)
    bloqueia_passagem: bool = Field(default=False, strict=True)
    afeta_acessibilidade: bool = Field(default=False, strict=True)
    # Endereço legível sugerido pelo aparelho (geocodificação reversa); opcional.
    endereco: str | None = Field(default=None, max_length=200)

    @field_validator("endereco")
    @classmethod
    def _endereco_vazio_vira_nulo(cls, valor: str | None) -> str | None:
        return valor or None

    @model_validator(mode="after")
    def _coordenadas_presentes(self) -> Self:
        # (0, 0) fica no oceano Atlântico: na prática indica GPS ausente/padrão.
        if math.isclose(self.latitude, 0.0) and math.isclose(self.longitude, 0.0):
            raise ValueError("Coordenadas (0, 0) indicam localização ausente; informe a posição real.")
        return self


class StatusAtualizar(EntradaBase):
    status: StatusOcorrencia
    observacao: str | None = Field(default=None, max_length=500)


# ---------------------------------------------------------------- Saída


class IdentificacaoResposta(BaseModel):
    id: uuid.UUID
    apelido: str
    criado_em: datetime

    @classmethod
    def de_modelo(cls, identificacao: Identificacao) -> Self:
        return cls(id=identificacao.id, apelido=identificacao.apelido, criado_em=identificacao.criado_em)


class AnaliseIAResposta(BaseModel):
    status: StatusAnaliseIA
    categoria_sugerida: str | None
    confianca: float | None
    versao_modelo: str | None
    analisada_em: datetime | None


class SubprefeituraResposta(BaseModel):
    codigo: str
    nome: str


class OcorrenciaResposta(BaseModel):
    """Visão pública: não inclui o autor (identificacao_id/apelido)."""

    id: int
    titulo: str
    descricao: str
    categoria: CategoriaOcorrencia
    latitude: float
    longitude: float
    endereco: str | None
    subprefeitura: SubprefeituraResposta | None
    confirmacoes: int
    origem: OrigemOcorrencia
    risco_imediato: bool
    bloqueia_passagem: bool
    afeta_acessibilidade: bool
    status: StatusOcorrencia
    prioridade: Prioridade
    prioridade_pontuacao: int
    prioridade_justificativa: str
    imagem_url: str | None
    analise_ia: AnaliseIAResposta
    criado_em: datetime
    atualizado_em: datetime

    @staticmethod
    def campos_de_modelo(o: Ocorrencia) -> dict[str, object]:
        regiao = regiao_por_codigo(o.subprefeitura_codigo) if o.subprefeitura_codigo else None
        return {
            "id": o.id,
            "titulo": o.titulo,
            "descricao": o.descricao,
            "categoria": o.categoria,
            "latitude": float(o.latitude),
            "longitude": float(o.longitude),
            "endereco": o.endereco,
            "subprefeitura": SubprefeituraResposta(codigo=regiao.codigo, nome=regiao.nome) if regiao else None,
            "confirmacoes": o.confirmacoes_total or 0,
            "origem": o.origem,
            "risco_imediato": o.risco_imediato,
            "bloqueia_passagem": o.bloqueia_passagem,
            "afeta_acessibilidade": o.afeta_acessibilidade,
            "status": o.status,
            "prioridade": o.prioridade,
            "prioridade_pontuacao": o.prioridade_pontuacao,
            "prioridade_justificativa": o.prioridade_justificativa,
            "imagem_url": f"/ocorrencias/{o.id}/imagem" if o.imagem_arquivo else None,
            "analise_ia": AnaliseIAResposta(
                status=o.ia_status,
                categoria_sugerida=o.ia_categoria_sugerida,
                confianca=o.ia_confianca,
                versao_modelo=o.ia_versao_modelo,
                analisada_em=o.ia_analisada_em,
            ),
            "criado_em": o.criado_em,
            "atualizado_em": o.atualizado_em,
        }

    @classmethod
    def de_modelo(cls, o: Ocorrencia) -> Self:
        return cls.model_validate(cls.campos_de_modelo(o))


class OcorrenciaProximaResposta(OcorrenciaResposta):
    distancia_m: int

    @classmethod
    def de_par(cls, o: Ocorrencia, distancia: float) -> Self:
        campos = cls.campos_de_modelo(o)
        campos["distancia_m"] = round(distancia)
        return cls.model_validate(campos)


class ProximasResposta(BaseModel):
    itens: list[OcorrenciaProximaResposta]


class HistoricoStatusResposta(BaseModel):
    status_anterior: StatusOcorrencia | None
    status_novo: StatusOcorrencia
    observacao: str | None
    alterado_em: datetime

    @classmethod
    def de_modelo(cls, h: HistoricoStatus) -> Self:
        return cls(
            status_anterior=h.status_anterior,
            status_novo=h.status_novo,
            observacao=h.observacao,
            alterado_em=h.alterado_em,
        )


class RelacaoResposta(BaseModel):
    """Relação de QUEM PERGUNTA com a ocorrência (só aparece com X-Identificacao-Id)."""

    registrei: bool
    confirmei: bool
    avisei_nao_resolvido: bool = False


class OcorrenciaDetalheResposta(OcorrenciaResposta):
    historico_status: list[HistoricoStatusResposta]
    avisos_nao_resolvido: int = Field(
        default=0, description='Quantas pessoas avisaram que ainda não foi resolvido (só em RESOLVIDA; não reabre).'
    )
    minha_relacao: RelacaoResposta | None = None

    @classmethod
    def de_modelo(cls, o: Ocorrencia, relacao: RelacaoResposta | None = None) -> Self:
        campos = cls.campos_de_modelo(o)
        campos["historico_status"] = [HistoricoStatusResposta.de_modelo(h) for h in o.historico]
        campos["avisos_nao_resolvido"] = o.avisos_nao_resolvido_total or 0
        campos["minha_relacao"] = relacao
        return cls.model_validate(campos)


class ConfirmacaoResposta(BaseModel):
    ocorrencia_id: int
    confirmacoes: int
    confirmado: bool


class AvisoNaoResolvidoResposta(BaseModel):
    ocorrencia_id: int
    avisos_nao_resolvido: int
    avisado: bool


class PaginaOcorrencias(BaseModel):
    itens: list[OcorrenciaResposta]
    pagina: int
    tamanho: int
    total: int
    total_paginas: int


class AlertaRegiaoResposta(BaseModel):
    """Alerta Bridge: calculado automaticamente a partir dos relatos (não é oficial)."""

    nivel: NivelAlerta
    indice: int
    abertas_30d: int
    abertas_alta_30d: int


class EstatisticaRegiaoResposta(BaseModel):
    codigo: str
    nome: str
    total: int
    abertas: int
    alta_abertas: int
    resolvidas: int
    confirmacoes: int
    densidade_km2: float
    alerta: AlertaRegiaoResposta


class EstatisticasRegioesResposta(BaseModel):
    origem: OrigemOcorrencia
    dias: int | None
    itens: list[EstatisticaRegiaoResposta]


class ModeloIAStatus(BaseModel):
    disponivel: bool
    versao: str | None


class HealthResposta(BaseModel):
    status: Literal["ok", "degradado"]
    banco: Literal["ok", "indisponivel"]
    modelo_ia: ModeloIAStatus
    versao_api: str


class SugestaoCategoriaPedido(EntradaBase):
    """O que o app já tem na revisão do registro. Mesmas regras do cadastro (`OcorrenciaCriar`)."""

    titulo: str = Field(min_length=5, max_length=120)
    descricao: str = Field(min_length=10, max_length=2000)
    categoria: CategoriaOcorrencia
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False, strict=True)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False, strict=True)
    risco_imediato: bool = Field(default=False, strict=True)
    bloqueia_passagem: bool = Field(default=False, strict=True)
    afeta_acessibilidade: bool = Field(default=False, strict=True)


class SugestaoCategoriaResposta(BaseModel):
    disponivel: bool
    categoria_sugerida: str | None
    confianca: float | None
    versao_modelo: str | None


# ---------------------------------------------------------------- Erros


class ErroDetalhe(BaseModel):
    campo: str
    mensagem: str


class ErroCorpo(BaseModel):
    codigo: str
    mensagem: str
    detalhes: list[ErroDetalhe] = []


class ErroResposta(BaseModel):
    erro: ErroCorpo


class CategoriaTotalResposta(BaseModel):
    categoria: CategoriaOcorrencia
    total: int


class SemanaResposta(BaseModel):
    inicio: date = Field(description="Segunda-feira da semana (horário de São Paulo).")
    registradas: int
    resolvidas: int = Field(description="Transições para RESOLVIDA ocorridas na semana.")


class RegiaoRankingResposta(BaseModel):
    codigo: str
    nome: str
    total: int


class ResumoResposta(BaseModel):
    origem: OrigemOcorrencia
    dias: int | None
    total: int
    abertas: int
    resolvidas: int
    rejeitadas: int
    percentual_resolvidas: float | None = Field(description="Resolvidas ÷ total × 100 (1 casa); null sem ocorrências.")
    tempo_medio_resolucao_dias: float | None = Field(
        description="Média de dias entre o registro e a resolução (1 casa); null sem resolvidas."
    )
    alertas_ativos: int = Field(description="Regiões em ALERTA (Alerta Bridge, não oficial).")
    regioes_em_atencao: int
    por_categoria: list[CategoriaTotalResposta]
    semanal: list[SemanaResposta]
    ranking_regioes: list[RegiaoRankingResposta]


class OcorrenciaMapaResposta(BaseModel):
    """Ponto do mapa: só o necessário para desenhar o marcador e o cartão."""

    id: int
    latitude: float
    longitude: float
    categoria: CategoriaOcorrencia
    prioridade: Prioridade
    status: StatusOcorrencia
    titulo: str
    endereco: str | None
    confirmacoes: int

    @classmethod
    def de_modelo(cls, o: Ocorrencia) -> "OcorrenciaMapaResposta":
        return cls(
            id=o.id,
            latitude=float(o.latitude),
            longitude=float(o.longitude),
            categoria=o.categoria,
            prioridade=o.prioridade,
            status=o.status,
            titulo=o.titulo,
            endereco=o.endereco,
            confirmacoes=o.confirmacoes_total,
        )


class PontosMapaResposta(BaseModel):
    itens: list[OcorrenciaMapaResposta]
    total: int = Field(description="Quantas existem na área com esses filtros.")
    truncado: bool = Field(description="true quando a área tem mais do que o limite devolvido: aproxime o mapa.")


class ParticipacaoResposta(BaseModel):
    """O que a identificação já fez (só registros reais). Usado no Perfil do app."""

    registradas: int
    confirmadas: int
    resolvidas_acompanhadas: int = Field(description="Registradas ou confirmadas pela pessoa que estão RESOLVIDA.")
    avisos_nao_resolvido: int
