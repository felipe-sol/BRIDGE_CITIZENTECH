"""Cria a tabela historico_status e registra o status atual das ocorrências existentes.

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-11

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002"
down_revision: str | Sequence[str] | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

STATUS = ("ABERTA", "EM_ANALISE", "EM_ANDAMENTO", "RESOLVIDA", "REJEITADA")
LISTA_STATUS = ", ".join(f"'{s}'" for s in STATUS)  # constantes do código


def upgrade() -> None:
    op.create_table(
        "historico_status",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("ocorrencia_id", sa.Integer(), nullable=False),
        sa.Column("status_anterior", sa.String(length=30), nullable=True),
        sa.Column("status_novo", sa.String(length=30), nullable=False),
        sa.Column("observacao", sa.String(length=500), nullable=True),
        sa.Column("alterado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_historico_status")),
        sa.ForeignKeyConstraint(
            ["ocorrencia_id"],
            ["ocorrencias.id"],
            name=op.f("fk_historico_status_ocorrencia_id_ocorrencias"),
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            f"status_anterior IS NULL OR status_anterior IN ({LISTA_STATUS})",
            name=op.f("ck_historico_status_status_anterior"),
        ),
        sa.CheckConstraint(f"status_novo IN ({LISTA_STATUS})", name=op.f("ck_historico_status_status_novo")),
    )
    op.create_index(op.f("ix_historico_status_ocorrencia_id"), "historico_status", ["ocorrencia_id"])

    # Migração de dados: ocorrências criadas antes desta versão ganham um registro
    # inicial com o status que tinham no momento da migração.
    op.execute(
        """
        INSERT INTO historico_status (ocorrencia_id, status_anterior, status_novo, observacao, alterado_em)
        SELECT id, NULL, status, 'Registro inicial criado pela migração 0002.', criado_em
        FROM ocorrencias
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_historico_status_ocorrencia_id"), table_name="historico_status")
    op.drop_table("historico_status")
