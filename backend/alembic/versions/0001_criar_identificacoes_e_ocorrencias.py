"""Cria as tabelas identificacoes e ocorrencias.

Revision ID: 0001
Revises:
Create Date: 2026-11-11

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CATEGORIAS = ("CALCADA_DANIFICADA", "BURACO", "ILUMINACAO_DEFEITUOSA", "OBSTACULO_CIRCULACAO", "OUTRO")
STATUS = ("ABERTA", "EM_ANALISE", "EM_ANDAMENTO", "RESOLVIDA", "REJEITADA")
PRIORIDADES = ("BAIXA", "MEDIA", "ALTA")
STATUS_IA = ("PENDENTE", "CONCLUIDA", "INDISPONIVEL", "FALHOU")


def _check_valores(coluna: str, valores: tuple[str, ...]) -> str:
    lista = ", ".join(f"'{v}'" for v in valores)  # constantes do código, não entrada de usuário
    return f"{coluna} IN ({lista})"


def upgrade() -> None:
    op.create_table(
        "identificacoes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("apelido", sa.String(length=60), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_identificacoes")),
    )

    op.create_table(
        "ocorrencias",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("identificacao_id", sa.Uuid(), nullable=False),
        sa.Column("chave_idempotencia", sa.Uuid(), nullable=True),
        sa.Column("titulo", sa.String(length=120), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=False),
        sa.Column("categoria", sa.String(length=30), nullable=False),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("risco_imediato", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("bloqueia_passagem", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("afeta_acessibilidade", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("prioridade", sa.String(length=30), nullable=False),
        sa.Column("prioridade_pontuacao", sa.SmallInteger(), nullable=False),
        sa.Column("prioridade_justificativa", sa.String(length=300), nullable=False),
        sa.Column("imagem_arquivo", sa.String(length=64), nullable=True),
        sa.Column("imagem_tipo", sa.String(length=20), nullable=True),
        sa.Column("ia_status", sa.String(length=30), nullable=False),
        sa.Column("ia_categoria_sugerida", sa.String(length=50), nullable=True),
        sa.Column("ia_confianca", sa.Float(), nullable=True),
        sa.Column("ia_versao_modelo", sa.String(length=50), nullable=True),
        sa.Column("ia_analisada_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_ocorrencias")),
        sa.ForeignKeyConstraint(
            ["identificacao_id"],
            ["identificacoes.id"],
            name=op.f("fk_ocorrencias_identificacao_id_identificacoes"),
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("chave_idempotencia", name=op.f("uq_ocorrencias_chave_idempotencia")),
        sa.CheckConstraint(_check_valores("categoria", CATEGORIAS), name=op.f("ck_ocorrencias_categoria")),
        sa.CheckConstraint(_check_valores("status", STATUS), name=op.f("ck_ocorrencias_status")),
        sa.CheckConstraint(_check_valores("prioridade", PRIORIDADES), name=op.f("ck_ocorrencias_prioridade")),
        sa.CheckConstraint(_check_valores("ia_status", STATUS_IA), name=op.f("ck_ocorrencias_ia_status")),
        sa.CheckConstraint("latitude >= -90 AND latitude <= 90", name=op.f("ck_ocorrencias_latitude_valida")),
        sa.CheckConstraint("longitude >= -180 AND longitude <= 180", name=op.f("ck_ocorrencias_longitude_valida")),
        sa.CheckConstraint(
            "prioridade_pontuacao >= 0 AND prioridade_pontuacao <= 10", name=op.f("ck_ocorrencias_pontuacao_valida")
        ),
        sa.CheckConstraint(
            "ia_confianca IS NULL OR (ia_confianca >= 0 AND ia_confianca <= 1)",
            name=op.f("ck_ocorrencias_ia_confianca_valida"),
        ),
        sa.CheckConstraint("char_length(descricao) <= 2000", name=op.f("ck_ocorrencias_descricao_tamanho")),
    )
    op.create_index(op.f("ix_ocorrencias_identificacao_id"), "ocorrencias", ["identificacao_id"])
    op.create_index(op.f("ix_ocorrencias_status"), "ocorrencias", ["status"])
    op.create_index("ix_ocorrencias_criado_em_id", "ocorrencias", ["criado_em", "id"])
    op.create_index("ix_ocorrencias_prioridade_pontuacao", "ocorrencias", ["prioridade_pontuacao"])


def downgrade() -> None:
    op.drop_index("ix_ocorrencias_prioridade_pontuacao", table_name="ocorrencias")
    op.drop_index("ix_ocorrencias_criado_em_id", table_name="ocorrencias")
    op.drop_index(op.f("ix_ocorrencias_status"), table_name="ocorrencias")
    op.drop_index(op.f("ix_ocorrencias_identificacao_id"), table_name="ocorrencias")
    op.drop_table("ocorrencias")
    op.drop_table("identificacoes")
