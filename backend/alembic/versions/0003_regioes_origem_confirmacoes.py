"""Endereço, subprefeitura e origem nas ocorrências; tabela de confirmações.

- endereco: texto legível vindo do aparelho (opcional).
- subprefeitura_codigo: região oficial (GeoSampa) calculada pelo servidor; as
  ocorrências que já existem ficam nulas aqui e são preenchidas pelo script
  scripts/recalcular_regioes.py (a migração não importa código da aplicação).
- origem: APP (registro real) ou SIMULADA (dado fictício de demonstração);
  as linhas existentes recebem 'APP' pelo valor padrão.
- confirmacoes: "eu também vi" — no máximo uma por (ocorrência, identificação).

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-12

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003"
down_revision: str | Sequence[str] | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("ocorrencias", sa.Column("endereco", sa.String(length=200), nullable=True))
    op.add_column("ocorrencias", sa.Column("subprefeitura_codigo", sa.String(length=2), nullable=True))
    op.add_column("ocorrencias", sa.Column("origem", sa.String(length=30), server_default="APP", nullable=False))
    op.create_check_constraint(op.f("ck_ocorrencias_origem"), "ocorrencias", "origem IN ('APP', 'SIMULADA')")
    op.create_index(op.f("ix_ocorrencias_subprefeitura_codigo"), "ocorrencias", ["subprefeitura_codigo"])
    op.create_index("ix_ocorrencias_origem_criado_em", "ocorrencias", ["origem", "criado_em"])
    op.create_index("ix_ocorrencias_latitude_longitude", "ocorrencias", ["latitude", "longitude"])

    op.create_table(
        "confirmacoes",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("ocorrencia_id", sa.Integer(), nullable=False),
        sa.Column("identificacao_id", sa.Uuid(), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_confirmacoes")),
        sa.ForeignKeyConstraint(
            ["ocorrencia_id"],
            ["ocorrencias.id"],
            name=op.f("fk_confirmacoes_ocorrencia_id_ocorrencias"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["identificacao_id"],
            ["identificacoes.id"],
            name=op.f("fk_confirmacoes_identificacao_id_identificacoes"),
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("ocorrencia_id", "identificacao_id", name=op.f("uq_confirmacoes_ocorrencia_id")),
    )
    op.create_index(op.f("ix_confirmacoes_ocorrencia_id"), "confirmacoes", ["ocorrencia_id"])
    op.create_index(op.f("ix_confirmacoes_identificacao_id"), "confirmacoes", ["identificacao_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_confirmacoes_identificacao_id"), table_name="confirmacoes")
    op.drop_index(op.f("ix_confirmacoes_ocorrencia_id"), table_name="confirmacoes")
    op.drop_table("confirmacoes")
    op.drop_index("ix_ocorrencias_latitude_longitude", table_name="ocorrencias")
    op.drop_index("ix_ocorrencias_origem_criado_em", table_name="ocorrencias")
    op.drop_index(op.f("ix_ocorrencias_subprefeitura_codigo"), table_name="ocorrencias")
    op.drop_constraint(op.f("ck_ocorrencias_origem"), "ocorrencias", type_="check")
    op.drop_column("ocorrencias", "origem")
    op.drop_column("ocorrencias", "subprefeitura_codigo")
    op.drop_column("ocorrencias", "endereco")
