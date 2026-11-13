import math
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Header, Query, Response, UploadFile, status
from fastapi.responses import FileResponse

from app.deps import Classificador, Config, DbSession, exigir_admin
from app.enums import CategoriaOcorrencia, OrigemOcorrencia, Prioridade, StatusOcorrencia
from app.errors import ErroAPI
from app.schemas import (
    ConfirmacaoResposta,
    ErroResposta,
    OcorrenciaCriar,
    OcorrenciaDetalheResposta,
    OcorrenciaProximaResposta,
    OcorrenciaResposta,
    PaginaOcorrencias,
    ProximasResposta,
    StatusAtualizar,
)
from app.services import confirmacoes as servico_confirmacoes
from app.services import ocorrencias as servico

router = APIRouter(prefix="/ocorrencias", tags=["ocorrencias"])

ERROS_COMUNS: dict[int | str, dict[str, object]] = {422: {"model": ErroResposta}}


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=OcorrenciaResposta,
    summary="Registra uma ocorrência (201) ou devolve a existente para a mesma Idempotency-Key (200)",
    responses={200: {"model": OcorrenciaResposta, "description": "Chave de idempotência já usada"}, **ERROS_COMUNS},
)
def criar(
    dados: OcorrenciaCriar,
    response: Response,
    db: DbSession,
    classificador: Classificador,
    idempotency_key: Annotated[
        uuid.UUID | None,
        Header(alias="Idempotency-Key", description="UUID gerado pelo cliente para evitar duplicatas."),
    ] = None,
) -> OcorrenciaResposta:
    ocorrencia, criada = servico.criar_ocorrencia(db, dados, idempotency_key, classificador)
    if not criada:
        response.status_code = status.HTTP_200_OK
    return OcorrenciaResposta.de_modelo(ocorrencia)


@router.get(
    "",
    response_model=PaginaOcorrencias,
    summary="Lista ocorrências com paginação, filtros e ordenação estável",
    responses=ERROS_COMUNS,
)
def listar(
    db: DbSession,
    pagina: Annotated[int, Query(ge=1)] = 1,
    tamanho: Annotated[int, Query(ge=1, le=100)] = 20,
    ordenar: Annotated[servico.Ordenacao, Query()] = "recentes",
    status_filtro: Annotated[StatusOcorrencia | None, Query(alias="status")] = None,
    categoria: Annotated[CategoriaOcorrencia | None, Query()] = None,
    prioridade: Annotated[Prioridade | None, Query()] = None,
    origem: Annotated[
        OrigemOcorrencia, Query(description="APP = registros reais (padrão); SIMULADA = dados fictícios.")
    ] = OrigemOcorrencia.APP,
    bbox: Annotated[
        str | None, Query(description="Área do mapa: min_lon,min_lat,max_lon,max_lat (graus).")
    ] = None,
    q: Annotated[
        str | None, Query(min_length=2, max_length=60, description="Texto no título, descrição ou endereço.")
    ] = None,
    subprefeitura: Annotated[
        str | None, Query(pattern=r"^\d{2}$", description="Código da subprefeitura (GeoSampa), ex.: 09.")
    ] = None,
) -> PaginaOcorrencias:
    caixa = servico.interpretar_caixa(bbox) if bbox is not None else None
    itens, total = servico.listar_ocorrencias(
        db, pagina, tamanho, ordenar, status_filtro, categoria, prioridade, origem, caixa, q, subprefeitura
    )
    return PaginaOcorrencias(
        itens=[OcorrenciaResposta.de_modelo(o) for o in itens],
        pagina=pagina,
        tamanho=tamanho,
        total=total,
        total_paginas=math.ceil(total / tamanho),
    )


# As rotas fixas abaixo precisam vir ANTES de "/{ocorrencia_id}": senão "minhas" e
# "proximas" seriam lidos como id.
@router.get(
    "/minhas",
    response_model=PaginaOcorrencias,
    summary="O que esta identificação registrou ou confirmou (aba Andamento do app)",
    responses={422: {"model": ErroResposta}},
)
def minhas(
    db: DbSession,
    x_identificacao_id: Annotated[
        uuid.UUID,
        Header(description="UUID da identificação (vai no cabeçalho para não aparecer em URLs e logs de acesso)."),
    ],
    relacao: Annotated[servico.RelacaoLista, Query()] = "registradas",
    pagina: Annotated[int, Query(ge=1)] = 1,
    tamanho: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginaOcorrencias:
    itens, total = servico.listar_da_identificacao(db, x_identificacao_id, relacao, pagina, tamanho)
    return PaginaOcorrencias(
        itens=[OcorrenciaResposta.de_modelo(o) for o in itens],
        pagina=pagina,
        tamanho=tamanho,
        total=total,
        total_paginas=math.ceil(total / tamanho),
    )


@router.get(
    "/proximas",
    response_model=ProximasResposta,
    summary="Ocorrências reais e abertas perto de um ponto (para evitar registros duplicados)",
    responses=ERROS_COMUNS,
)
def proximas(
    db: DbSession,
    latitude: Annotated[float, Query(ge=-90, le=90)],
    longitude: Annotated[float, Query(ge=-180, le=180)],
    raio_m: Annotated[int, Query(ge=10, le=500, description="Raio em metros.")] = 100,
    categoria: Annotated[CategoriaOcorrencia | None, Query()] = None,
) -> ProximasResposta:
    pares = servico.buscar_proximas(db, latitude, longitude, raio_m, categoria)
    return ProximasResposta(itens=[OcorrenciaProximaResposta.de_par(o, d) for o, d in pares])


@router.get(
    "/{ocorrencia_id}",
    response_model=OcorrenciaDetalheResposta,
    summary="Detalha uma ocorrência com o histórico de status",
    responses={404: {"model": ErroResposta}, **ERROS_COMUNS},
)
def obter(
    ocorrencia_id: int,
    db: DbSession,
    x_identificacao_id: Annotated[
        uuid.UUID | None,
        Header(description="Opcional: preenche minha_relacao (registrei/confirmei) para esta identificação."),
    ] = None,
) -> OcorrenciaDetalheResposta:
    ocorrencia = servico.obter_ocorrencia(db, ocorrencia_id)
    relacao = servico_confirmacoes.relacao(db, ocorrencia, x_identificacao_id) if x_identificacao_id else None
    return OcorrenciaDetalheResposta.de_modelo(ocorrencia, relacao)


IdentificacaoObrigatoria = Annotated[
    uuid.UUID, Header(description="UUID da identificação de quem confirma (salvo no app).")
]
ERROS_CONFIRMACAO: dict[int | str, dict[str, object]] = {
    404: {"model": ErroResposta},
    409: {"model": ErroResposta},
    **ERROS_COMUNS,
}


@router.post(
    "/{ocorrencia_id}/confirmacoes",
    status_code=status.HTTP_201_CREATED,
    response_model=ConfirmacaoResposta,
    summary="'Eu também vi': confirma o problema (201) ou devolve a confirmação existente (200)",
    responses={200: {"model": ConfirmacaoResposta, "description": "Já confirmada antes"}, **ERROS_CONFIRMACAO},
)
def confirmar(
    ocorrencia_id: int, response: Response, db: DbSession, x_identificacao_id: IdentificacaoObrigatoria
) -> ConfirmacaoResposta:
    total, criada = servico_confirmacoes.confirmar(db, ocorrencia_id, x_identificacao_id)
    if not criada:
        response.status_code = status.HTTP_200_OK
    return ConfirmacaoResposta(ocorrencia_id=ocorrencia_id, confirmacoes=total, confirmado=True)


@router.delete(
    "/{ocorrencia_id}/confirmacoes",
    response_model=ConfirmacaoResposta,
    summary="Desfaz a confirmação desta identificação (idempotente)",
    responses=ERROS_CONFIRMACAO,
)
def desfazer_confirmacao(
    ocorrencia_id: int, db: DbSession, x_identificacao_id: IdentificacaoObrigatoria
) -> ConfirmacaoResposta:
    total = servico_confirmacoes.desfazer(db, ocorrencia_id, x_identificacao_id)
    return ConfirmacaoResposta(ocorrencia_id=ocorrencia_id, confirmacoes=total, confirmado=False)


@router.patch(
    "/{ocorrencia_id}/status",
    response_model=OcorrenciaDetalheResposta,
    summary="[Administrativa] Altera o status respeitando as transições permitidas",
    dependencies=[Depends(exigir_admin)],
    responses={
        401: {"model": ErroResposta},
        403: {"model": ErroResposta},
        404: {"model": ErroResposta},
        409: {"model": ErroResposta},
        **ERROS_COMUNS,
    },
)
def alterar_status(ocorrencia_id: int, dados: StatusAtualizar, db: DbSession) -> OcorrenciaDetalheResposta:
    return OcorrenciaDetalheResposta.de_modelo(servico.atualizar_status(db, ocorrencia_id, dados))


@router.post(
    "/{ocorrencia_id}/imagem",
    response_model=OcorrenciaResposta,
    summary="Envia a foto da ocorrência (multipart, campo 'arquivo')",
    responses={
        403: {"model": ErroResposta},
        404: {"model": ErroResposta},
        409: {"model": ErroResposta},
        413: {"model": ErroResposta},
        415: {"model": ErroResposta},
        **ERROS_COMUNS,
    },
)
def enviar_imagem(
    ocorrencia_id: int,
    arquivo: Annotated[UploadFile, File(description="Foto JPEG ou PNG.")],
    x_identificacao_id: Annotated[
        uuid.UUID, Header(description="UUID da identificação que registrou a ocorrência.")
    ],
    db: DbSession,
    settings: Config,
    classificador: Classificador,
) -> OcorrenciaResposta:
    limite = settings.max_upload_bytes
    conteudo = arquivo.file.read(limite + 1)  # lê no máximo limite+1 bytes
    if len(conteudo) > limite:
        raise ErroAPI(
            status.HTTP_413_CONTENT_TOO_LARGE,
            "ARQUIVO_MUITO_GRANDE",
            f"A imagem excede o limite de {settings.max_upload_mb} MB.",
        )
    if not conteudo:
        raise ErroAPI(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "VALIDACAO",
            "Os dados enviados são inválidos.",
            [{"campo": "arquivo", "mensagem": "Arquivo vazio."}],
        )
    ocorrencia = servico.anexar_imagem(
        db, ocorrencia_id, x_identificacao_id, conteudo, settings.upload_dir, classificador
    )
    return OcorrenciaResposta.de_modelo(ocorrencia)


@router.get(
    "/{ocorrencia_id}/imagem",
    summary="Baixa a foto da ocorrência",
    response_class=FileResponse,
    responses={
        200: {"content": {"image/jpeg": {}, "image/png": {}}},
        404: {"model": ErroResposta},
        **ERROS_COMUNS,
    },
)
def baixar_imagem(ocorrencia_id: int, db: DbSession, settings: Config) -> FileResponse:
    caminho, mime = servico.caminho_da_imagem(db, ocorrencia_id, settings.upload_dir)
    return FileResponse(
        caminho,
        media_type=mime,
        headers={"Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff"},
    )
