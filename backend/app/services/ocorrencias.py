"""Casos de uso de Ocorrência: cadastro, listagem, detalhe, status e imagem.

Todas as consultas usam o ORM do SQLAlchemy (parâmetros vinculados);
nenhum SQL é montado por concatenação de entradas.
"""

import logging
import math
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Literal

from fastapi import status as http
from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.orm.attributes import flag_modified

from app.enums import CategoriaOcorrencia, OrigemOcorrencia, Prioridade, StatusAnaliseIA, StatusOcorrencia
from app.errors import ErroAPI, nao_encontrado
from app.models import Confirmacao, HistoricoStatus, Identificacao, Ocorrencia
from app.schemas import OcorrenciaCriar, StatusAtualizar
from app.services.armazenamento import ImagemInvalida, caminho_seguro, remover_imagem, salvar_imagem
from app.services.ia import ClassificadorOcorrencia, EntradaClassificacao
from app.services.ia.texto import descricao_para_ia, titulo_para_ia
from app.services.prioridade import calcular_prioridade
from app.services.geo import distancia_metros
from app.services.regioes import localizar_regiao
from app.services.transicoes import STATUS_ABERTOS, destinos_possiveis, transicao_permitida

logger = logging.getLogger("bridge.ocorrencias")

Ordenacao = Literal["recentes", "prioridade"]
# Área retangular do mapa: (min_lon, min_lat, max_lon, max_lat), ordem do GeoJSON.
Caixa = tuple[float, float, float, float]


def interpretar_caixa(texto: str) -> Caixa:
    """Converte "min_lon,min_lat,max_lon,max_lat" em Caixa ou lança 422 no campo bbox."""

    def invalida(motivo: str) -> ErroAPI:
        return ErroAPI(
            http.HTTP_422_UNPROCESSABLE_CONTENT,
            "VALIDACAO",
            "Os dados enviados são inválidos.",
            [{"campo": "bbox", "mensagem": motivo}],
        )

    partes = texto.split(",")
    if len(partes) != 4:
        raise invalida("Use quatro números: min_lon,min_lat,max_lon,max_lat.")
    try:
        min_lon, min_lat, max_lon, max_lat = (float(p) for p in partes)
    except ValueError:
        raise invalida("Use quatro números: min_lon,min_lat,max_lon,max_lat.") from None
    if not all(math.isfinite(v) for v in (min_lon, min_lat, max_lon, max_lat)):
        raise invalida("Use quatro números: min_lon,min_lat,max_lon,max_lat.")
    if not (-180 <= min_lon < max_lon <= 180 and -90 <= min_lat < max_lat <= 90):
        raise invalida("Os mínimos devem ser menores que os máximos e as coordenadas, válidas.")
    return min_lon, min_lat, max_lon, max_lat


def _escapar_like(texto: str) -> str:
    """Faz % e _ valerem como texto comum no ILIKE (o usuário não controla curingas)."""
    return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


# ---------------------------------------------------------------- Cadastro


def _buscar_por_chave(db: Session, chave: uuid.UUID) -> Ocorrencia | None:
    return db.scalar(select(Ocorrencia).where(Ocorrencia.chave_idempotencia == chave))


def criar_ocorrencia(
    db: Session,
    dados: OcorrenciaCriar,
    chave_idempotencia: uuid.UUID | None,
    classificador: ClassificadorOcorrencia,
) -> tuple[Ocorrencia, bool]:
    """Cria a ocorrência. Retorna (ocorrencia, criada_agora).

    Se a chave de idempotência já foi usada, devolve a ocorrência existente
    (criada_agora=False) em vez de criar uma duplicata.
    """
    if chave_idempotencia is not None:
        existente = _buscar_por_chave(db, chave_idempotencia)
        if existente is not None:
            return existente, False

    if db.get(Identificacao, dados.identificacao_id) is None:
        raise ErroAPI(
            http.HTTP_422_UNPROCESSABLE_CONTENT,
            "IDENTIFICACAO_INEXISTENTE",
            "A identificação informada não existe. Cadastre-se novamente no app.",
            [{"campo": "identificacao_id", "mensagem": "Identificação não encontrada."}],
        )

    prioridade = calcular_prioridade(
        dados.categoria, dados.risco_imediato, dados.bloqueia_passagem, dados.afeta_acessibilidade
    )
    regiao = localizar_regiao(dados.latitude, dados.longitude)
    ocorrencia = Ocorrencia(
        identificacao_id=dados.identificacao_id,
        chave_idempotencia=chave_idempotencia,
        titulo=dados.titulo,
        descricao=dados.descricao,
        categoria=dados.categoria,
        latitude=Decimal(f"{dados.latitude:.6f}"),
        longitude=Decimal(f"{dados.longitude:.6f}"),
        endereco=dados.endereco,
        subprefeitura_codigo=regiao.codigo if regiao else None,
        origem=OrigemOcorrencia.APP,
        risco_imediato=dados.risco_imediato,
        bloqueia_passagem=dados.bloqueia_passagem,
        afeta_acessibilidade=dados.afeta_acessibilidade,
        status=StatusOcorrencia.ABERTA,
        prioridade=prioridade.prioridade,
        prioridade_pontuacao=prioridade.pontuacao,
        prioridade_justificativa=prioridade.justificativa,
        ia_status=StatusAnaliseIA.PENDENTE if classificador.disponivel else StatusAnaliseIA.INDISPONIVEL,
    )
    ocorrencia.historico.append(
        HistoricoStatus(status_anterior=None, status_novo=StatusOcorrencia.ABERTA, observacao="Ocorrência registrada.")
    )
    db.add(ocorrencia)

    try:
        db.flush()
        if classificador.disponivel and not classificador.requer_imagem:
            _executar_analise(ocorrencia, classificador, caminho_imagem=None)
        db.commit()
    except IntegrityError:
        # Duas requisições simultâneas com a mesma chave: a segunda reutiliza a primeira.
        db.rollback()
        if chave_idempotencia is not None:
            existente = _buscar_por_chave(db, chave_idempotencia)
            if existente is not None:
                return existente, False
        raise

    db.refresh(ocorrencia)
    return ocorrencia, True


# ---------------------------------------------------------------- Consulta


def _filtros_basicos(
    origem: OrigemOcorrencia,
    status: StatusOcorrencia | None,
    categoria: CategoriaOcorrencia | None,
    prioridade: Prioridade | None,
    caixa: Caixa | None,
) -> list[ColumnElement[bool]]:
    # Dados reais e fictícios nunca se misturam: o padrão é só APP.
    filtros: list[ColumnElement[bool]] = [Ocorrencia.origem == origem]
    if status is not None:
        filtros.append(Ocorrencia.status == status)
    if categoria is not None:
        filtros.append(Ocorrencia.categoria == categoria)
    if prioridade is not None:
        filtros.append(Ocorrencia.prioridade == prioridade)
    if caixa is not None:
        min_lon, min_lat, max_lon, max_lat = caixa
        filtros.append(Ocorrencia.longitude.between(min_lon, max_lon))
        filtros.append(Ocorrencia.latitude.between(min_lat, max_lat))
    return filtros


# Pontos do mapa: limite alto para o agrupamento contar tudo o que está na área;
# acima disso a resposta avisa (truncado) e o app pede para aproximar.
MAX_ITENS_MAPA = 2000


def listar_para_mapa(
    db: Session,
    caixa: Caixa,
    origem: OrigemOcorrencia,
    categoria: CategoriaOcorrencia | None,
    prioridade: Prioridade | None,
    status: StatusOcorrencia | None,
) -> tuple[list[Ocorrencia], int]:
    filtros = _filtros_basicos(origem, status, categoria, prioridade, caixa)
    total = db.scalar(select(func.count()).select_from(Ocorrencia).where(*filtros)) or 0
    consulta = (
        select(Ocorrencia)
        .where(*filtros)
        .order_by(Ocorrencia.prioridade_pontuacao.desc(), Ocorrencia.id.desc())
        .limit(MAX_ITENS_MAPA)
    )
    return list(db.scalars(consulta).all()), total


def listar_ocorrencias(
    db: Session,
    pagina: int,
    tamanho: int,
    ordenar: Ordenacao,
    status: StatusOcorrencia | None,
    categoria: CategoriaOcorrencia | None,
    prioridade: Prioridade | None,
    origem: OrigemOcorrencia = OrigemOcorrencia.APP,
    caixa: Caixa | None = None,
    q: str | None = None,
    subprefeitura: str | None = None,
) -> tuple[list[Ocorrencia], int]:
    filtros = _filtros_basicos(origem, status, categoria, prioridade, caixa)
    if q is not None:
        padrao = f"%{_escapar_like(q)}%"
        filtros.append(
            or_(
                Ocorrencia.titulo.ilike(padrao, escape="\\"),
                Ocorrencia.descricao.ilike(padrao, escape="\\"),
                Ocorrencia.endereco.ilike(padrao, escape="\\"),
            )
        )
    if subprefeitura is not None:
        filtros.append(Ocorrencia.subprefeitura_codigo == subprefeitura)

    total = db.scalar(select(func.count()).select_from(Ocorrencia).where(*filtros)) or 0

    # Ordenação sempre com desempate por id: a paginação é estável e previsível.
    if ordenar == "prioridade":
        ordem = (Ocorrencia.prioridade_pontuacao.desc(), Ocorrencia.criado_em.desc(), Ocorrencia.id.desc())
    else:
        ordem = (Ocorrencia.criado_em.desc(), Ocorrencia.id.desc())

    consulta = select(Ocorrencia).where(*filtros).order_by(*ordem).offset((pagina - 1) * tamanho).limit(tamanho)
    return list(db.scalars(consulta).all()), total


RelacaoLista = Literal["registradas", "confirmadas"]


def listar_da_identificacao(
    db: Session, identificacao_id: uuid.UUID, relacao: RelacaoLista, pagina: int, tamanho: int
) -> tuple[list[Ocorrencia], int]:
    """O que a pessoa registrou ou confirmou, da atualização mais recente para a mais antiga."""
    if db.get(Identificacao, identificacao_id) is None:
        raise ErroAPI(
            http.HTTP_422_UNPROCESSABLE_CONTENT,
            "IDENTIFICACAO_INEXISTENTE",
            "A identificação informada não existe. Cadastre-se novamente no app.",
            [{"campo": "X-Identificacao-Id", "mensagem": "Identificação não encontrada."}],
        )
    if relacao == "registradas":
        filtro = Ocorrencia.identificacao_id == identificacao_id
    else:
        filtro = Ocorrencia.id.in_(
            select(Confirmacao.ocorrencia_id).where(Confirmacao.identificacao_id == identificacao_id)
        )
    total = db.scalar(select(func.count()).select_from(Ocorrencia).where(filtro)) or 0
    consulta = (
        select(Ocorrencia)
        .where(filtro)
        .order_by(Ocorrencia.atualizado_em.desc(), Ocorrencia.id.desc())
        .offset((pagina - 1) * tamanho)
        .limit(tamanho)
    )
    return list(db.scalars(consulta).all()), total


METROS_POR_GRAU = 111_320
MAX_PROXIMAS = 10


def buscar_proximas(
    db: Session, latitude: float, longitude: float, raio_m: int, categoria: CategoriaOcorrencia | None
) -> list[tuple[Ocorrencia, float]]:
    """Ocorrências reais e ainda abertas a até raio_m metros, da mais perto para a mais longe."""
    delta_lat = raio_m / METROS_POR_GRAU
    delta_lon = raio_m / (METROS_POR_GRAU * max(math.cos(math.radians(latitude)), 0.01))
    filtros = [
        Ocorrencia.origem == OrigemOcorrencia.APP,
        Ocorrencia.status.in_(STATUS_ABERTOS),
        Ocorrencia.latitude.between(latitude - delta_lat, latitude + delta_lat),
        Ocorrencia.longitude.between(longitude - delta_lon, longitude + delta_lon),
    ]
    if categoria is not None:
        filtros.append(Ocorrencia.categoria == categoria)

    candidatas = (
        (o, distancia_metros(latitude, longitude, float(o.latitude), float(o.longitude)))
        for o in db.scalars(select(Ocorrencia).where(*filtros))
    )
    dentro = sorted((par for par in candidatas if par[1] <= raio_m), key=lambda par: (par[1], par[0].id))
    return dentro[:MAX_PROXIMAS]


def obter_ocorrencia(db: Session, ocorrencia_id: int) -> Ocorrencia:
    consulta = select(Ocorrencia).where(Ocorrencia.id == ocorrencia_id).options(selectinload(Ocorrencia.historico))
    ocorrencia = db.scalar(consulta)
    if ocorrencia is None:
        raise nao_encontrado("Ocorrência")
    return ocorrencia


def _obter_para_atualizar(db: Session, ocorrencia_id: int) -> Ocorrencia:
    # SELECT ... FOR UPDATE: evita duas alterações concorrentes na mesma linha.
    ocorrencia = db.scalar(select(Ocorrencia).where(Ocorrencia.id == ocorrencia_id).with_for_update())
    if ocorrencia is None:
        raise nao_encontrado("Ocorrência")
    return ocorrencia


# ---------------------------------------------------------------- Status


def atualizar_status(db: Session, ocorrencia_id: int, dados: StatusAtualizar) -> Ocorrencia:
    ocorrencia = _obter_para_atualizar(db, ocorrencia_id)
    anterior = ocorrencia.status

    if not transicao_permitida(anterior, dados.status):
        destinos = destinos_possiveis(anterior)
        permitidas = ", ".join(destinos) if destinos else "nenhuma (status final)"
        raise ErroAPI(
            http.HTTP_409_CONFLICT,
            "TRANSICAO_INVALIDA",
            f"Não é permitido mudar de {anterior.value} para {dados.status.value}. Permitidas: {permitidas}.",
            [{"campo": "status", "mensagem": f"Transições permitidas a partir de {anterior.value}: {permitidas}."}],
        )

    ocorrencia.status = dados.status
    # Mesmo commit: status e histórico são gravados juntos ou nenhum dos dois.
    db.add(
        HistoricoStatus(
            ocorrencia_id=ocorrencia.id,
            status_anterior=anterior,
            status_novo=dados.status,
            observacao=dados.observacao or None,
        )
    )
    db.commit()
    db.expire_all()
    return obter_ocorrencia(db, ocorrencia_id)


# ---------------------------------------------------------------- Imagem


def anexar_imagem(
    db: Session,
    ocorrencia_id: int,
    identificacao_id: uuid.UUID,
    conteudo: bytes,
    diretorio_uploads: Path,
    classificador: ClassificadorOcorrencia,
) -> Ocorrencia:
    ocorrencia = _obter_para_atualizar(db, ocorrencia_id)

    if ocorrencia.identificacao_id != identificacao_id:
        raise ErroAPI(
            http.HTTP_403_FORBIDDEN,
            "PROIBIDO",
            "Somente a identificação que registrou a ocorrência pode enviar a foto.",
        )
    if ocorrencia.imagem_arquivo:
        raise ErroAPI(http.HTTP_409_CONFLICT, "IMAGEM_JA_ENVIADA", "Esta ocorrência já possui uma imagem.")

    try:
        salva = salvar_imagem(conteudo, diretorio_uploads)
    except ImagemInvalida as exc:
        raise ErroAPI(
            http.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "FORMATO_NAO_SUPORTADO",
            f"{exc} Envie uma foto JPEG ou PNG.",
        ) from exc

    ocorrencia.imagem_arquivo = salva.nome_arquivo
    ocorrencia.imagem_tipo = salva.mime
    if classificador.disponivel and classificador.requer_imagem:
        _executar_analise(ocorrencia, classificador, caminho_imagem=diretorio_uploads / salva.nome_arquivo)

    try:
        db.commit()
    except Exception:
        # Sem registro no banco, o arquivo ficaria órfão: removemos.
        db.rollback()
        remover_imagem(salva.nome_arquivo, diretorio_uploads)
        raise

    db.refresh(ocorrencia)
    return ocorrencia


def caminho_da_imagem(db: Session, ocorrencia_id: int, diretorio_uploads: Path) -> tuple[Path, str]:
    ocorrencia = db.get(Ocorrencia, ocorrencia_id)
    if ocorrencia is None:
        raise nao_encontrado("Ocorrência")
    if not ocorrencia.imagem_arquivo or not ocorrencia.imagem_tipo:
        raise nao_encontrado("Imagem da ocorrência")
    caminho = caminho_seguro(ocorrencia.imagem_arquivo, diretorio_uploads)
    if not caminho.is_file():
        logger.error("Arquivo de imagem ausente no disco para a ocorrência %s", ocorrencia_id)
        raise nao_encontrado("Imagem da ocorrência")
    return caminho, ocorrencia.imagem_tipo


# ---------------------------------------------------------------- Regiões


def recalcular_subprefeituras(db: Session, todas: bool = False) -> tuple[int, int]:
    """Preenche subprefeitura_codigo a partir das coordenadas.

    Por padrão só olha as linhas ainda nulas (idempotente). Devolve
    (com_regiao, fora_de_sp) entre as linhas examinadas.
    """
    consulta = select(Ocorrencia)
    if not todas:
        consulta = consulta.where(Ocorrencia.subprefeitura_codigo.is_(None))
    com_regiao = fora = 0
    for ocorrencia in db.scalars(consulta):
        regiao = localizar_regiao(float(ocorrencia.latitude), float(ocorrencia.longitude))
        ocorrencia.subprefeitura_codigo = regiao.codigo if regiao else None
        if regiao:
            com_regiao += 1
        else:
            fora += 1
    db.commit()
    return com_regiao, fora


# ---------------------------------------------------------------- IA


def _executar_analise(
    ocorrencia: Ocorrencia, classificador: ClassificadorOcorrencia, caminho_imagem: Path | None
) -> None:
    """Roda a inferência e grava o resultado. Falha não derruba o cadastro."""
    entrada = EntradaClassificacao(
        # Título que é só o nome da categoria (preenchido pelo app) não vai: a IA repetiria a escolha.
        titulo=titulo_para_ia(ocorrencia.titulo),
        descricao=descricao_para_ia(ocorrencia.descricao),
        categoria_informada=ocorrencia.categoria,
        latitude=float(ocorrencia.latitude),
        longitude=float(ocorrencia.longitude),
        risco_imediato=ocorrencia.risco_imediato,
        bloqueia_passagem=ocorrencia.bloqueia_passagem,
        afeta_acessibilidade=ocorrencia.afeta_acessibilidade,
        caminho_imagem=caminho_imagem,
    )
    ocorrencia.ia_versao_modelo = classificador.versao
    ocorrencia.ia_analisada_em = datetime.now(UTC)
    try:
        resultado = classificador.classificar(entrada)
        confianca = resultado.confianca
        if confianca is not None and not (math.isfinite(confianca) and 0.0 <= confianca <= 1.0):
            raise ValueError("Confiança fora do intervalo 0–1.")
    except Exception:
        # Não registra conteúdo da imagem nem textos do cidadão.
        logger.exception("Falha na inferência de IA da ocorrência %s", ocorrencia.id)
        ocorrencia.ia_status = StatusAnaliseIA.FALHOU
        ocorrencia.ia_categoria_sugerida = None
        ocorrencia.ia_confianca = None
        return

    ocorrencia.ia_status = StatusAnaliseIA.CONCLUIDA
    ocorrencia.ia_categoria_sugerida = resultado.categoria_sugerida[:50]
    ocorrencia.ia_confianca = confianca


@dataclass(frozen=True)
class ResumoAnalise:
    analisadas: int
    concluidas: int
    falharam: int


def analisar_pendentes(
    db: Session,
    classificador: ClassificadorOcorrencia,
    origem: OrigemOcorrencia | None = None,
    refazer: bool = False,
) -> ResumoAnalise:
    """Roda a IA nas ocorrências sem análise (`INDISPONIVEL` ou `FALHOU`), por exemplo as registradas
    antes de o modelo ser ativado. As já concluídas só são refeitas com `refazer=True` (ex.: depois
    de uma correção na forma de analisar). Sem modelo, não faz nada.

    `atualizado_em` é preservado: analisar não é uma atualização da equipe e não pode acender o
    selo "Atualizada" do app nem reordenar o Andamento.
    """
    if not classificador.disponivel or classificador.requer_imagem:
        return ResumoAnalise(analisadas=0, concluidas=0, falharam=0)
    status_alvo = [StatusAnaliseIA.INDISPONIVEL, StatusAnaliseIA.FALHOU]
    if refazer:
        status_alvo.append(StatusAnaliseIA.CONCLUIDA)
    filtros: list[ColumnElement[bool]] = [Ocorrencia.ia_status.in_(status_alvo)]
    if origem is not None:
        filtros.append(Ocorrencia.origem == origem)
    ocorrencias = db.scalars(select(Ocorrencia).where(*filtros).order_by(Ocorrencia.id)).all()
    for ocorrencia in ocorrencias:
        atualizado_em = ocorrencia.atualizado_em
        _executar_analise(ocorrencia, classificador, caminho_imagem=None)
        # Valor explícito no UPDATE: o onupdate=now() da coluna não entra em ação.
        ocorrencia.atualizado_em = atualizado_em
        flag_modified(ocorrencia, "atualizado_em")
    db.commit()
    concluidas = sum(1 for o in ocorrencias if o.ia_status == StatusAnaliseIA.CONCLUIDA)
    return ResumoAnalise(analisadas=len(ocorrencias), concluidas=concluidas, falharam=len(ocorrencias) - concluidas)
