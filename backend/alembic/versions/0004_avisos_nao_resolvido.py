"""Bridge 2.0, fase 3: tabela de avisos "ainda não foi resolvido".

Uma pessoa avisa que uma ocorrência RESOLVIDA ainda não foi resolvida no local. O aviso
não reabre a ocorrência: conta e aparece no detalhe. Um por identificação e ocorrência.

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-13
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004"
down_revision: str | Sequence[str] | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "avisos_nao_resolvido",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("ocorrencia_id", sa.Integer(), nullable=False),
        sa.Column("identificacao_id", sa.Uuid(), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_avisos_nao_resolvido")),
        sa.ForeignKeyConstraint(
            ["ocorrencia_id"],
            ["ocorrencias.id"],
            name=op.f("fk_avisos_nao_resolvido_ocorrencia_id_ocorrencias"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["identificacao_id"],
            ["identificacoes.id"],
            name=op.f("fk_avisos_nao_resolvido_identificacao_id_identificacoes"),
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "ocorrencia_id", "identificacao_id", name=op.f("uq_avisos_nao_resolvido_ocorrencia_id")
        ),
    )
    op.create_index(op.f("ix_avisos_nao_resolvido_ocorrencia_id"), "avisos_nao_resolvido", ["ocorrencia_id"])
    op.create_index(op.f("ix_avisos_nao_resolvido_identificacao_id"), "avisos_nao_resolvido", ["identificacao_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_avisos_nao_resolvido_identificacao_id"), table_name="avisos_nao_resolvido")
    op.drop_index(op.f("ix_avisos_nao_resolvido_ocorrencia_id"), table_name="avisos_nao_resolvido")
    op.drop_table("avisos_nao_resolvido")
