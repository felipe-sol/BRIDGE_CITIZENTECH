"""Acesso ao banco: engine e sessões do SQLAlchemy (PostgreSQL via psycopg 3)."""

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

engine = create_engine(
    get_settings().database_url,
    pool_pre_ping=True,
    connect_args={
        # Sessão do banco em UTC: datas saem sempre com fuso explícito e consistente.
        "options": "-c timezone=utc",
        # Falha rápida (503) se o banco estiver fora do ar, em vez de travar a requisição.
        "connect_timeout": 5,
    },
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """Dependência do FastAPI: uma sessão por requisição, sempre fechada no final."""
    with SessionLocal() as session:
        yield session
