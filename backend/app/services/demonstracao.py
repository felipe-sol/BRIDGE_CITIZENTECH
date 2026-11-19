"""Pacote de DEMONSTRAÇÃO: registros feitos pela equipe no app, para uma instalação nova.

O banco de cada máquina começa vazio (as migrações criam só a estrutura). Para quem avalia
ver como o app fica com uso real, `backend/dados_demo/` traz registros que a equipe fez no
iPhone durante os testes, prontos para importar com `scripts/dados_demo.py importar`.

- Os textos, categorias, fatores e datas são os que a equipe informou no app.
- A localização foi deslocada algumas dezenas de metros (sem sair da região) e o endereço
  não tem número, para não expor o ponto exato.
- As fotos são ILUSTRATIVAS, do Wikimedia Commons (autores e licenças em `CREDITOS.md`), e a
  descrição de cada registro diz isso. Elas passam pela mesma limpeza de metadados do upload.
- Gravados com `origem = APP` (aparecem no "Ao vivo"). Os autores têm UUIDs fixos (uuid5),
  o que permite remover só a demonstração, sem marcar nada no esquema.
"""

import json
import uuid
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import delete, exists, select
from sqlalchemy.orm import Session

from app.enums import CategoriaOcorrencia, OrigemOcorrencia, StatusAnaliseIA, StatusOcorrencia
from app.models import AvisoNaoResolvido, Confirmacao, HistoricoStatus, Identificacao, Ocorrencia
from app.services.armazenamento import ImagemInvalida, remover_imagem, salvar_imagem
from app.services.prioridade import calcular_prioridade
from app.services.regioes import localizar_regiao

PASTA_DEMO = Path(__file__).resolve().parents[2] / "dados_demo"
NOTA_DEMONSTRACAO = (
    "Registro de demonstração feito pela equipe no app; local aproximado; "
    "foto ilustrativa do Wikimedia Commons (créditos em backend/dados_demo/CREDITOS.md)."
)
_TAMANHO_MAX_DESCRICAO = 2000


class PacoteInvalido(Exception):
    """O pacote de demonstração tem um registro que o cadastro do app recusaria."""


class DemonstracaoJaImportada(Exception):
    """A demonstração já está no banco; importar de novo duplicaria os registros."""


class RegistroDemo(BaseModel):
    """Um registro do pacote, com as mesmas regras de tamanho do cadastro pelo app."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    autor: str = Field(min_length=2, max_length=60)
    titulo: str = Field(min_length=5, max_length=120)
    descricao: str = Field(min_length=10, max_length=_TAMANHO_MAX_DESCRICAO - len(NOTA_DEMONSTRACAO) - 2)
    categoria: CategoriaOcorrencia
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    endereco: str | None = Field(default=None, max_length=200)
    risco_imediato: bool
    bloqueia_passagem: bool
    afeta_acessibilidade: bool
    criado_em: datetime
    foto: str | None = Field(default=None, pattern=r"^[a-z0-9-]+\.jpg$")


@dataclass(frozen=True)
class PacoteDemo:
    registros: tuple[RegistroDemo, ...]


def identificacao_demo(apelido: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_URL, f"bridge:demo:{apelido}")


def ler_pacote(pasta: Path) -> PacoteDemo:
    """Lê e valida `registros.json`. Recusa o pacote inteiro se um registro for inválido."""
    try:
        bruto = json.loads((pasta / "registros.json").read_text(encoding="utf-8"))
        registros = tuple(RegistroDemo.model_validate(r) for r in bruto["registros"])
    except (OSError, ValueError, KeyError, TypeError, ValidationError) as exc:
        raise PacoteInvalido(f"registros.json inválido: {exc}") from exc
    for indice, r in enumerate(registros, start=1):
        if r.latitude == 0 and r.longitude == 0:
            raise PacoteInvalido(f"Registro {indice}: localização ausente (0, 0).")
        if r.foto is not None and not (pasta / "fotos" / r.foto).is_file():
            raise PacoteInvalido(f"Registro {indice}: a foto {r.foto} não está em fotos/.")
    return PacoteDemo(registros=registros)


def _autores(pacote: PacoteDemo) -> dict[str, uuid.UUID]:
    return {r.autor: identificacao_demo(r.autor) for r in pacote.registros}


def _ids_demo(db: Session) -> list[uuid.UUID]:
    """Identificações de demonstração existentes (as de qualquer pacote já importado)."""
    pacote = ler_pacote(PASTA_DEMO) if (PASTA_DEMO / "registros.json").is_file() else PacoteDemo(())
    candidatos = set(_autores(pacote).values())
    marcados = db.scalars(
        select(Ocorrencia.identificacao_id).where(Ocorrencia.descricao.endswith(NOTA_DEMONSTRACAO))
    )
    candidatos.update(marcados)
    return list(candidatos)


def existe_demonstracao(db: Session) -> bool:
    return bool(db.scalar(select(exists().where(Ocorrencia.descricao.endswith(NOTA_DEMONSTRACAO)))))


def importar_demonstracao(db: Session, pacote: PacoteDemo, pasta: Path, diretorio_uploads: Path) -> int:
    """Grava os registros (origem APP) numa transação. Devolve quantos gravou."""
    if existe_demonstracao(db):
        raise DemonstracaoJaImportada("A demonstração já foi importada. Use 'remover' antes de importar de novo.")

    autores = _autores(pacote)
    existentes = set(db.scalars(select(Identificacao.id).where(Identificacao.id.in_(autores.values()))))
    for apelido, ident in autores.items():
        if ident not in existentes:
            primeiro_registro = min(r.criado_em for r in pacote.registros if r.autor == apelido)
            db.add(Identificacao(id=ident, apelido=apelido, criado_em=primeiro_registro))
    db.flush()

    salvas: list[str] = []
    try:
        for r in pacote.registros:
            prioridade = calcular_prioridade(r.categoria, r.risco_imediato, r.bloqueia_passagem, r.afeta_acessibilidade)
            regiao = localizar_regiao(r.latitude, r.longitude)
            ocorrencia = Ocorrencia(
                identificacao_id=autores[r.autor],
                titulo=r.titulo,
                descricao=f"{r.descricao.rstrip('. ')}. {NOTA_DEMONSTRACAO}",
                categoria=r.categoria,
                latitude=Decimal(f"{r.latitude:.6f}"),
                longitude=Decimal(f"{r.longitude:.6f}"),
                endereco=r.endereco,
                subprefeitura_codigo=regiao.codigo if regiao else None,
                origem=OrigemOcorrencia.APP,
                risco_imediato=r.risco_imediato,
                bloqueia_passagem=r.bloqueia_passagem,
                afeta_acessibilidade=r.afeta_acessibilidade,
                status=StatusOcorrencia.ABERTA,
                prioridade=prioridade.prioridade,
                prioridade_pontuacao=prioridade.pontuacao,
                prioridade_justificativa=prioridade.justificativa,
                ia_status=StatusAnaliseIA.INDISPONIVEL,
                criado_em=r.criado_em,
                atualizado_em=r.criado_em,
            )
            if r.foto is not None:
                imagem = salvar_imagem((pasta / "fotos" / r.foto).read_bytes(), diretorio_uploads)
                salvas.append(imagem.nome_arquivo)
                ocorrencia.imagem_arquivo = imagem.nome_arquivo
                ocorrencia.imagem_tipo = imagem.mime
            ocorrencia.historico.append(
                HistoricoStatus(
                    status_anterior=None,
                    status_novo=StatusOcorrencia.ABERTA,
                    observacao="Ocorrência registrada.",
                    alterado_em=r.criado_em,
                )
            )
            db.add(ocorrencia)
        db.commit()
    except (ImagemInvalida, OSError):
        db.rollback()
        for nome in salvas:
            remover_imagem(nome, diretorio_uploads)
        raise
    return len(pacote.registros)


def remover_demonstracao(db: Session, diretorio_uploads: Path) -> tuple[int, int]:
    """Apaga SOMENTE a demonstração (registros, fotos copiadas e autores). Devolve (ocorrências, autores)."""
    ids = _ids_demo(db)
    alvo = select(Ocorrencia.id).where(
        Ocorrencia.identificacao_id.in_(ids), Ocorrencia.descricao.endswith(NOTA_DEMONSTRACAO)
    )
    fotos = list(db.scalars(select(Ocorrencia.imagem_arquivo).where(Ocorrencia.id.in_(alvo))))
    ocorrencias = db.execute(delete(Ocorrencia).where(Ocorrencia.id.in_(alvo))).rowcount
    # Um autor só sai se não tiver mais nada no banco (nenhum dado real é apagado junto).
    em_uso = (
        select(Ocorrencia.identificacao_id)
        .union(select(Confirmacao.identificacao_id), select(AvisoNaoResolvido.identificacao_id))
    )
    autores = db.execute(
        delete(Identificacao).where(Identificacao.id.in_(ids), Identificacao.id.not_in(em_uso))
    ).rowcount
    db.commit()
    for nome in fotos:
        if nome:
            remover_imagem(nome, diretorio_uploads)
    return ocorrencias, autores
