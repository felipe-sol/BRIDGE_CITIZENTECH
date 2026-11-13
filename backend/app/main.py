"""Ponto de entrada da API Bridge.

Executar (na pasta backend/, com o venv ativo):
    uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

import logging
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.errors import registrar_handlers, resposta_erro
from app.routes import estatisticas, health, identificacoes, ocorrencias, regioes
from app.routes.health import VERSAO_API
from app.services.ia import criar_classificador

DESCRICAO = """
API do **Bridge**: registro, classificação e priorização de problemas de
infraestrutura urbana (calçadas, buracos, iluminação, obstáculos).

Projeto acadêmico (FIAP Global Solution 2026.2 — CitizenTech). Não há integração
oficial com prefeituras. A prioridade é calculada por regras documentadas, não por
Machine Learning. Contrato completo: `docs/CONTRATO_API.md`.
"""

# Folga para os cabeçalhos/limites do multipart além do arquivo em si.
FOLGA_MULTIPART = 64 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    # Modelo de IA carregado UMA vez por processo.
    app.state.classificador = criar_classificador(settings)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Bridge API", version=VERSAO_API, description=DESCRICAO, lifespan=lifespan)

    if settings.cors_origins_lista:
        # Só necessário para clientes web. CORS NÃO é mecanismo de autenticação.
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins_lista,
            allow_methods=["GET", "POST", "PATCH", "DELETE"],
            allow_headers=["Content-Type", "Idempotency-Key", "X-Identificacao-Id", "X-Admin-Token"],
        )

    @app.middleware("http")
    async def limitar_tamanho_upload(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        # Recusa cedo uploads declaradamente grandes, antes de o corpo ser processado.
        if request.method == "POST" and request.url.path.endswith("/imagem"):
            tamanho = request.headers.get("content-length")
            if tamanho and tamanho.isdigit() and int(tamanho) > settings.max_upload_bytes + FOLGA_MULTIPART:
                return resposta_erro(
                    413, "ARQUIVO_MUITO_GRANDE", f"A imagem excede o limite de {settings.max_upload_mb} MB."
                )
        return await call_next(request)

    registrar_handlers(app)
    app.include_router(health.router)
    app.include_router(identificacoes.router)
    app.include_router(ocorrencias.router)
    app.include_router(regioes.router)
    app.include_router(estatisticas.router)
    return app


app = create_app()
