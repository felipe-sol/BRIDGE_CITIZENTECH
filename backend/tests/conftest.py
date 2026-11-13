"""Configuração dos testes.

- Testes unitários (prioridade, transições, armazenamento, schemas) não usam banco.
- Testes de API usam um banco PostgreSQL SEPARADO, cujo nome termina em "_test".
  A cada sessão ele é levado a "base" e migrado até "head" com o Alembic
  (isso também testa o downgrade/upgrade das migrações).
"""

import os
import shutil
import tempfile
from collections.abc import Iterator
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://bridge:bridge_dev@localhost:5432/bridge_test"
)
NOME_BANCO_TESTE = TEST_DATABASE_URL.rsplit("/", 1)[-1].split("?", 1)[0]
if not NOME_BANCO_TESTE.endswith("_test"):
    raise RuntimeError("Por segurança, os testes só rodam em um banco cujo nome termina com '_test'.")

UPLOAD_DIR_TESTE = Path(tempfile.mkdtemp(prefix="bridge-uploads-teste-"))
ADMIN_TOKEN_TESTE = "token-admin-de-teste-123456"

# Precisa acontecer ANTES de importar o app (as Settings são lidas uma vez).
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["UPLOAD_DIR"] = str(UPLOAD_DIR_TESTE)
os.environ["ADMIN_TOKEN"] = ADMIN_TOKEN_TESTE
os.environ["MAX_UPLOAD_MB"] = "1"
os.environ["MODELO_IA_CAMINHO"] = ""
os.environ["CORS_ORIGINS"] = ""


@pytest.fixture(scope="session")
def banco_migrado() -> Iterator[object]:
    from sqlalchemy import create_engine
    from sqlalchemy.exc import OperationalError

    from alembic import command
    from alembic.config import Config

    engine = create_engine(TEST_DATABASE_URL, connect_args={"connect_timeout": 3})
    try:
        with engine.connect():
            pass
    except OperationalError:
        pytest.skip(f"PostgreSQL de teste indisponível em {TEST_DATABASE_URL.split('@')[-1]}")

    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    yield engine
    engine.dispose()


@pytest.fixture
def client(banco_migrado: object) -> Iterator[object]:
    from fastapi.testclient import TestClient
    from sqlalchemy import Engine, text

    from app.main import create_app

    assert isinstance(banco_migrado, Engine)
    with banco_migrado.begin() as conn:
        conn.execute(
            text("TRUNCATE avisos_nao_resolvido, confirmacoes, historico_status, ocorrencias, identificacoes RESTART IDENTITY CASCADE")
        )
    shutil.rmtree(UPLOAD_DIR_TESTE, ignore_errors=True)
    UPLOAD_DIR_TESTE.mkdir(parents=True, exist_ok=True)

    app = create_app()
    with TestClient(app) as cliente:
        yield cliente
    app.dependency_overrides.clear()
