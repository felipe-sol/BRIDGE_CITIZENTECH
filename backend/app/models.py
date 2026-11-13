"""Modelos do domínio mapeados para o PostgreSQL (SQLAlchemy 2.x).

Entidades:
- Identificacao: pseudônimo do cidadão (não é conta de usuário nem login).
- Ocorrencia: problema de infraestrutura urbana registrado pelo cidadão.
- HistoricoStatus: trilha de cada mudança de status de uma ocorrência.
- Confirmacao: outra pessoa relatou o mesmo problema ("eu também vi").

O esquema do banco é criado e evoluído SOMENTE por migrações Alembic
(backend/alembic/versions). Não usamos Base.metadata.create_all().
"""

import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Identity,
    Index,
    Integer,
    MetaData,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    false,
    func,
    select,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, column_property, mapped_column, relationship

from app.enums import CategoriaOcorrencia, OrigemOcorrencia, Prioridade, StatusAnaliseIA, StatusOcorrencia

# Nomes determinísticos para constraints/índices: deixa as migrações estáveis.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def enum_coluna(tipo: type[StrEnum], nome: str) -> SAEnum:
    """Enum guardado como VARCHAR + CHECK (mais simples de evoluir que ENUM nativo)."""
    return SAEnum(
        tipo,
        name=nome,
        native_enum=False,
        create_constraint=True,
        length=30,
        validate_strings=True,
        values_callable=lambda membros: [m.value for m in membros],
    )


class Identificacao(Base):
    __tablename__ = "identificacoes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    apelido: Mapped[str] = mapped_column(String(60))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ocorrencias: Mapped[list["Ocorrencia"]] = relationship(back_populates="identificacao")


class Ocorrencia(Base):
    __tablename__ = "ocorrencias"
    __table_args__ = (
        CheckConstraint("latitude >= -90 AND latitude <= 90", name="latitude_valida"),
        CheckConstraint("longitude >= -180 AND longitude <= 180", name="longitude_valida"),
        CheckConstraint(
            "prioridade_pontuacao >= 0 AND prioridade_pontuacao <= 10", name="pontuacao_valida"
        ),
        CheckConstraint(
            "ia_confianca IS NULL OR (ia_confianca >= 0 AND ia_confianca <= 1)",
            name="ia_confianca_valida",
        ),
        CheckConstraint("char_length(descricao) <= 2000", name="descricao_tamanho"),
        Index("ix_ocorrencias_criado_em_id", "criado_em", "id"),
        Index("ix_ocorrencias_prioridade_pontuacao", "prioridade_pontuacao"),
        Index("ix_ocorrencias_origem_criado_em", "origem", "criado_em"),
        Index("ix_ocorrencias_latitude_longitude", "latitude", "longitude"),
    )

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    identificacao_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("identificacoes.id", ondelete="RESTRICT"), index=True
    )
    # Chave enviada pelo app para evitar ocorrências duplicadas em reenvios.
    chave_idempotencia: Mapped[uuid.UUID | None] = mapped_column(Uuid, unique=True)

    titulo: Mapped[str] = mapped_column(String(120))
    descricao: Mapped[str] = mapped_column(Text)
    categoria: Mapped[CategoriaOcorrencia] = mapped_column(enum_coluna(CategoriaOcorrencia, "categoria"))

    # Numeric(9, 6): 6 casas decimais (~0,1 m), sem erro de arredondamento de float.
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))

    # Endereço legível vindo do aparelho (geocodificação reversa); opcional.
    endereco: Mapped[str | None] = mapped_column(String(200))
    # Código da subprefeitura (GeoSampa) calculado pelo servidor; nulo fora de SP.
    subprefeitura_codigo: Mapped[str | None] = mapped_column(String(2), index=True)
    origem: Mapped[OrigemOcorrencia] = mapped_column(enum_coluna(OrigemOcorrencia, "origem"), server_default="APP")

    risco_imediato: Mapped[bool] = mapped_column(Boolean, server_default=false())
    bloqueia_passagem: Mapped[bool] = mapped_column(Boolean, server_default=false())
    afeta_acessibilidade: Mapped[bool] = mapped_column(Boolean, server_default=false())

    status: Mapped[StatusOcorrencia] = mapped_column(
        enum_coluna(StatusOcorrencia, "status"), index=True
    )
    prioridade: Mapped[Prioridade] = mapped_column(enum_coluna(Prioridade, "prioridade"))
    prioridade_pontuacao: Mapped[int] = mapped_column(SmallInteger)
    prioridade_justificativa: Mapped[str] = mapped_column(String(300))

    # Somente o nome gerado pelo servidor (UUID + extensão), nunca um caminho do cliente.
    imagem_arquivo: Mapped[str | None] = mapped_column(String(64))
    imagem_tipo: Mapped[str | None] = mapped_column(String(20))

    ia_status: Mapped[StatusAnaliseIA] = mapped_column(enum_coluna(StatusAnaliseIA, "ia_status"))
    ia_categoria_sugerida: Mapped[str | None] = mapped_column(String(50))
    ia_confianca: Mapped[float | None] = mapped_column(Float)
    ia_versao_modelo: Mapped[str | None] = mapped_column(String(50))
    ia_analisada_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    identificacao: Mapped[Identificacao] = relationship(back_populates="ocorrencias")
    historico: Mapped[list["HistoricoStatus"]] = relationship(
        back_populates="ocorrencia",
        order_by="(HistoricoStatus.alterado_em, HistoricoStatus.id)",
        cascade="all, delete-orphan",
    )


class HistoricoStatus(Base):
    __tablename__ = "historico_status"

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    ocorrencia_id: Mapped[int] = mapped_column(
        ForeignKey("ocorrencias.id", ondelete="CASCADE"), index=True
    )
    status_anterior: Mapped[StatusOcorrencia | None] = mapped_column(
        enum_coluna(StatusOcorrencia, "status_anterior")
    )
    status_novo: Mapped[StatusOcorrencia] = mapped_column(enum_coluna(StatusOcorrencia, "status_novo"))
    observacao: Mapped[str | None] = mapped_column(String(500))
    alterado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ocorrencia: Mapped[Ocorrencia] = relationship(back_populates="historico")


class Confirmacao(Base):
    """Uma identificação diz que viu o mesmo problema. No máximo uma por par."""

    __tablename__ = "confirmacoes"
    __table_args__ = (UniqueConstraint("ocorrencia_id", "identificacao_id"),)

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    ocorrencia_id: Mapped[int] = mapped_column(ForeignKey("ocorrencias.id", ondelete="CASCADE"), index=True)
    identificacao_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("identificacoes.id", ondelete="RESTRICT"), index=True
    )
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# Total de confirmações calculado pelo banco a cada consulta (sem contador duplicado).
Ocorrencia.confirmacoes_total = column_property(
    select(func.count(Confirmacao.id))
    .where(Confirmacao.ocorrencia_id == Ocorrencia.id)
    .correlate_except(Confirmacao)
    .scalar_subquery()
)
