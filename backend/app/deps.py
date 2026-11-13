"""Dependências compartilhadas pelas rotas."""

import secrets
from typing import Annotated

from fastapi import Depends, Header, Request, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.errors import ErroAPI
from app.services.ia import ClassificadorOcorrencia

DbSession = Annotated[Session, Depends(get_db)]
Config = Annotated[Settings, Depends(get_settings)]


def get_classificador(request: Request) -> ClassificadorOcorrencia:
    # Instância única criada no lifespan (modelo carregado uma vez por processo).
    classificador: ClassificadorOcorrencia = request.app.state.classificador
    return classificador


Classificador = Annotated[ClassificadorOcorrencia, Depends(get_classificador)]


def exigir_admin(
    settings: Config,
    x_admin_token: Annotated[str | None, Header(description="Token administrativo (ADMIN_TOKEN do .env).")] = None,
) -> None:
    """Proteção simples para operações administrativas (ambiente local de demonstração).

    O token fica só no .env do servidor e no ambiente do Insomnia; nunca no app.
    """
    if not settings.admin_token:
        raise ErroAPI(
            status.HTTP_403_FORBIDDEN,
            "ADMIN_DESABILITADO",
            "Operações administrativas estão desabilitadas neste servidor (ADMIN_TOKEN não configurado).",
        )
    if not x_admin_token or not secrets.compare_digest(x_admin_token.encode(), settings.admin_token.encode()):
        raise ErroAPI(status.HTTP_401_UNAUTHORIZED, "NAO_AUTORIZADO", "Token administrativo ausente ou inválido.")
