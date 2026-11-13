"""Erros da API em formato único: {"erro": {"codigo", "mensagem", "detalhes"}}."""

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("bridge.erros")


class ErroAPI(Exception):
    """Erro de negócio com status HTTP e código estável para o cliente."""

    def __init__(
        self,
        status_code: int,
        codigo: str,
        mensagem: str,
        detalhes: list[dict[str, str]] | None = None,
    ) -> None:
        super().__init__(mensagem)
        self.status_code = status_code
        self.codigo = codigo
        self.mensagem = mensagem
        self.detalhes = detalhes or []


def nao_encontrado(recurso: str) -> ErroAPI:
    return ErroAPI(status.HTTP_404_NOT_FOUND, "NAO_ENCONTRADO", f"{recurso} não encontrada.")


def resposta_erro(
    status_code: int, codigo: str, mensagem: str, detalhes: list[dict[str, str]] | None = None
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"erro": {"codigo": codigo, "mensagem": mensagem, "detalhes": detalhes or []}},
    )


def _numero(valor: Any) -> str:
    # 90.0 -> "90" (os limites de float aparecem como inteiros na mensagem).
    if isinstance(valor, float) and valor.is_integer():
        return str(int(valor))
    return str(valor)


# Tradução das mensagens mais comuns do Pydantic para português.
def _mensagem_pt(erro: dict[str, Any]) -> str:
    tipo = erro.get("type", "")
    ctx = erro.get("ctx") or {}
    match tipo:
        case "missing":
            return "Campo obrigatório."
        case "string_too_short":
            return f"Deve ter pelo menos {ctx.get('min_length')} caracteres."
        case "string_too_long":
            return f"Deve ter no máximo {ctx.get('max_length')} caracteres."
        case "greater_than_equal":
            return f"Deve ser maior ou igual a {_numero(ctx.get('ge'))}."
        case "less_than_equal":
            return f"Deve ser menor ou igual a {_numero(ctx.get('le'))}."
        case "greater_than":
            return f"Deve ser maior que {_numero(ctx.get('gt'))}."
        case "less_than":
            return f"Deve ser menor que {_numero(ctx.get('lt'))}."
        case "enum" | "literal_error":
            esperado = str(ctx.get("expected", "")).replace(" or ", " ou ")
            return f"Valor inválido. Valores aceitos: {esperado}."
        case "bool_type" | "bool_parsing":
            return "Deve ser verdadeiro ou falso (true/false)."
        case "float_type" | "float_parsing" | "finite_number":
            return "Deve ser um número."
        case "int_type" | "int_parsing" | "int_from_float":
            return "Deve ser um número inteiro."
        case "uuid_type" | "uuid_parsing":
            return "Deve ser um UUID válido."
        case "string_type":
            return "Deve ser um texto."
        case "extra_forbidden":
            return "Campo não permitido."
        case "json_invalid":
            return "JSON inválido."
        case "model_attributes_type" | "dict_type" | "model_type":
            return "O corpo deve ser um objeto JSON."
        case "value_error":
            return str(erro.get("msg", "Valor inválido.")).removeprefix("Value error, ")
        case _:
            return str(erro.get("msg", "Valor inválido."))


def _campo(loc: tuple[Any, ...] | list[Any]) -> str:
    partes = [str(p) for p in loc]
    if partes and partes[0] in {"body", "query", "path", "header", "cookie"}:
        partes = partes[1:]
    return ".".join(partes) or "corpo"


def registrar_handlers(app: FastAPI) -> None:
    @app.exception_handler(ErroAPI)
    async def _erro_api(_: Request, exc: ErroAPI) -> JSONResponse:
        return resposta_erro(exc.status_code, exc.codigo, exc.mensagem, exc.detalhes)

    @app.exception_handler(RequestValidationError)
    async def _validacao(_: Request, exc: RequestValidationError) -> JSONResponse:
        detalhes = [{"campo": _campo(e.get("loc", ())), "mensagem": _mensagem_pt(e)} for e in exc.errors()]
        return resposta_erro(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "VALIDACAO", "Os dados enviados são inválidos.", detalhes
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        codigos = {404: "NAO_ENCONTRADO", 405: "METODO_NAO_PERMITIDO"}
        mensagens = {404: "Rota não encontrada.", 405: "Método HTTP não permitido nesta rota."}
        codigo = codigos.get(exc.status_code, "ERRO_HTTP")
        mensagem = mensagens.get(exc.status_code, str(exc.detail))
        return resposta_erro(exc.status_code, codigo, mensagem)

    @app.exception_handler(OperationalError)
    async def _banco(_: Request, exc: OperationalError) -> JSONResponse:
        # Loga só o tipo do erro: a mensagem do driver pode conter host/usuário.
        logger.error("Falha de conexão com o banco: %s", type(exc.orig).__name__)
        return resposta_erro(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "BANCO_INDISPONIVEL",
            "Banco de dados indisponível. Tente novamente em instantes.",
        )

    @app.exception_handler(Exception)
    async def _inesperado(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Erro inesperado em %s %s", request.method, request.url.path)
        return resposta_erro(
            status.HTTP_500_INTERNAL_SERVER_ERROR, "ERRO_INTERNO", "Erro interno inesperado."
        )
