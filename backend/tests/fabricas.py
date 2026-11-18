"""Fábricas de dados para testes: INSERTs parametrizados direto no banco de teste.

Servem para montar cenários que a API não cria sozinha (data antiga, origem SIMULADA,
pontuação exata), sem passar pelas regras de cadastro.
"""

import uuid
from datetime import datetime

from sqlalchemy import Engine, text


def inserir_ocorrencia(
    engine: Engine,
    identificacao_id: str,
    *,
    latitude: float,
    longitude: float,
    prioridade: str = "MEDIA",
    pontuacao: int = 4,
    status: str = "ABERTA",
    origem: str = "APP",
    criado_em: datetime | None = None,
    subprefeitura: str | None = "09",
    categoria: str = "BURACO",
    titulo: str = "Ocorrência de teste",
    descricao: str = "Criada pela fábrica de testes.",
) -> int:
    with engine.begin() as conn:
        return int(
            conn.execute(
                text(
                    "INSERT INTO ocorrencias (identificacao_id, titulo, descricao, categoria, latitude, longitude,"
                    " status, prioridade, prioridade_pontuacao, prioridade_justificativa, ia_status, origem,"
                    " subprefeitura_codigo, criado_em, atualizado_em)"
                    " VALUES (:i, :tit, :desc, :cat, :lat, :lon,"
                    " :st, :pri, :pts, 'Teste', 'INDISPONIVEL', :orig, :sub,"
                    " COALESCE(:criado, now()), COALESCE(:criado, now())) RETURNING id"
                ),
                {
                    "i": uuid.UUID(identificacao_id),
                    "tit": titulo,
                    "desc": descricao,
                    "cat": categoria,
                    "lat": latitude,
                    "lon": longitude,
                    "st": status,
                    "pri": prioridade,
                    "pts": pontuacao,
                    "orig": origem,
                    "sub": subprefeitura,
                    "criado": criado_em,
                },
            ).scalar_one()
        )


def confirmar_n(engine: Engine, ocorrencia_id: int, n: int) -> None:
    """Cria n identificações e uma confirmação de cada uma para a ocorrência."""
    with engine.begin() as conn:
        for k in range(n):
            ident = uuid.uuid4()
            conn.execute(
                text("INSERT INTO identificacoes (id, apelido) VALUES (:i, :a)"),
                {"i": ident, "a": f"Confirmante {k + 1}"},
            )
            conn.execute(
                text("INSERT INTO confirmacoes (ocorrencia_id, identificacao_id) VALUES (:o, :i)"),
                {"o": ocorrencia_id, "i": ident},
            )


def inserir_historico(engine: Engine, ocorrencia_id: int, anterior: str | None, novo: str, alterado_em: datetime) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO historico_status (ocorrencia_id, status_anterior, status_novo, observacao, alterado_em)"
                " VALUES (:o, :a, :n, 'Teste', :quando)"
            ),
            {"o": ocorrencia_id, "a": anterior, "n": novo, "quando": alterado_em},
        )
