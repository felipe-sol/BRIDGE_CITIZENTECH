"""Dados FICTÍCIOS de demonstração (modo Exemplo do app).

- Gerados por uma função pura e determinística (`gerar_lote`): mesma semente, mesmo lote.
- Gravados com `origem = SIMULADA`, separados dos reais em todas as consultas.
- Autores e confirmações vêm de 40 identificações fictícias com UUIDs fixos (uuid5),
  o que permite removê-las sem marcar nada no esquema.
- `remover_ficticios` apaga SOMENTE o que é fictício.
Endereço "Endereço fictício · <região>" e descrição terminada em "(dado fictício)".
"""

import random
import uuid
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import delete, exists, or_, select
from sqlalchemy.orm import Session

from app.enums import CategoriaOcorrencia, NivelAlerta, OrigemOcorrencia, Prioridade, StatusAnaliseIA
from app.enums import StatusOcorrencia as S
from app.models import Confirmacao, HistoricoStatus, Identificacao, Ocorrencia
from app.services.alertas import JANELA_ALERTA_DIAS, alerta_de
from app.services.prioridade import calcular_prioridade
from app.services.regioes import Regiao, carregar_regioes, localizar_regiao
from app.services.transicoes import STATUS_ABERTOS

SEMENTE_PADRAO = 2026
QUANTIDADE_PADRAO = 1200
DIAS_PADRAO = 120

IDENTIFICACOES_FICTICIAS: tuple[uuid.UUID, ...] = tuple(
    uuid.uuid5(uuid.NAMESPACE_URL, f"bridge:ficticio:{i:03d}") for i in range(1, 41)
)

# Focos (subprefeitura, peso): Sé, Mooca, Itaquera, Capela do Socorro, Campo Limpo,
# Freguesia/Brasilândia. Pesos diferentes deixam a cidade com intensidades variadas.
FOCOS: tuple[tuple[str, int], ...] = (("09", 3), ("25", 3), ("27", 2), ("19", 2), ("17", 1), ("03", 1))
FRACAO_EM_FOCOS = 0.4
DISPERSAO_FOCO_GRAUS = 0.006  # ~650 m

PESOS_CATEGORIA: dict[CategoriaOcorrencia, int] = {
    CategoriaOcorrencia.CALCADA_DANIFICADA: 30,
    CategoriaOcorrencia.BURACO: 25,
    CategoriaOcorrencia.ILUMINACAO_DEFEITUOSA: 20,
    CategoriaOcorrencia.OBSTACULO_CIRCULACAO: 15,
    CategoriaOcorrencia.OUTRO: 10,
}
TEXTOS: dict[CategoriaOcorrencia, tuple[tuple[str, str], ...]] = {
    CategoriaOcorrencia.CALCADA_DANIFICADA: (
        ("Calçada quebrada", "Placas soltas e buracos na calçada"),
        ("Desnível na calçada", "Degrau alto no meio da calçada, difícil para cadeira de rodas"),
        ("Piso solto na calçada", "Pedras soltas que fazem tropeçar"),
    ),
    CategoriaOcorrencia.BURACO: (
        ("Buraco na rua", "Buraco grande perto da guia"),
        ("Asfalto afundado", "Trecho afundado na faixa da direita"),
        ("Buraco perto da faixa de pedestres", "Buraco na travessia de pedestres"),
    ),
    CategoriaOcorrencia.ILUMINACAO_DEFEITUOSA: (
        ("Poste apagado", "Poste sem luz há vários dias"),
        ("Lâmpada piscando", "Lâmpada do poste acende e apaga a noite toda"),
        ("Rua sem iluminação", "Trecho inteiro escuro à noite"),
    ),
    CategoriaOcorrencia.OBSTACULO_CIRCULACAO: (
        ("Entulho na calçada", "Entulho ocupando toda a calçada"),
        ("Galho caído", "Galho grande bloqueando a passagem"),
        ("Lixo bloqueando a passagem", "Sacos de lixo acumulados na calçada"),
    ),
    CategoriaOcorrencia.OUTRO: (
        ("Bueiro sem tampa", "Bueiro aberto na esquina"),
        ("Sinalização apagada", "Faixa de pedestres quase apagada"),
    ),
}
SUFIXO_DESCRICAO = "Registro de demonstração gerado automaticamente (dado fictício)"
PREFIXO_OBSERVACAO = "Equipe responsável (fictício):"
OBSERVACOES: dict[S, str] = {
    S.ABERTA: "registro recebido.",
    S.EM_ANALISE: "vistoria agendada.",
    S.EM_ANDAMENTO: "serviço em execução.",
    S.RESOLVIDA: "problema corrigido no local.",
    S.REJEITADA: "não foi possível localizar o problema no endereço.",
}

Passo = tuple[S | None, S, datetime, str]


@dataclass(frozen=True)
class OcorrenciaFicticia:
    autor: int  # 1..40, índice em IDENTIFICACOES_FICTICIAS
    titulo: str
    descricao: str
    categoria: CategoriaOcorrencia
    latitude: float
    longitude: float
    subprefeitura_codigo: str
    endereco: str
    risco_imediato: bool
    bloqueia_passagem: bool
    afeta_acessibilidade: bool
    pontuacao: int
    prioridade: Prioridade
    justificativa: str
    criado_em: datetime
    historico: tuple[Passo, ...]
    confirmadores: tuple[int, ...]

    @property
    def status(self) -> S:
        return self.historico[-1][1]


def _ponto_na_regiao(rng: random.Random, regiao: Regiao) -> tuple[float, float]:
    min_lon, min_lat, max_lon, max_lat = regiao.caixa
    while True:
        lat = round(rng.uniform(min_lat, max_lat), 6)
        lon = round(rng.uniform(min_lon, max_lon), 6)
        achada = localizar_regiao(lat, lon)
        if achada is not None and achada.codigo == regiao.codigo:
            return lat, lon


def _ponto_perto(rng: random.Random, centro: tuple[float, float]) -> tuple[float, float]:
    for _ in range(50):
        lat = round(rng.gauss(centro[0], DISPERSAO_FOCO_GRAUS), 6)
        lon = round(rng.gauss(centro[1], DISPERSAO_FOCO_GRAUS), 6)
        if localizar_regiao(lat, lon) is not None:
            return lat, lon
    return centro


def _caminho(rng: random.Random, idade_dias: float) -> list[S]:
    """Status percorridos (sempre transições permitidas). Mais antigas: mais resolvidas."""
    if idade_dias > 60:
        p_resolvida, p_rejeitada = 0.75, 0.10
    elif idade_dias > 30:
        p_resolvida, p_rejeitada = 0.50, 0.05
    elif idade_dias > 7:
        p_resolvida, p_rejeitada = 0.25, 0.05
    else:
        p_resolvida, p_rejeitada = 0.05, 0.0
    sorteio = rng.random()
    if sorteio < p_resolvida:
        return [S.ABERTA, S.EM_ANALISE, S.EM_ANDAMENTO, S.RESOLVIDA]
    if sorteio < p_resolvida + p_rejeitada:
        return [S.ABERTA, S.EM_ANALISE, S.REJEITADA]
    em_aberto = (
        [S.ABERTA],
        [S.ABERTA, S.EM_ANALISE],
        [S.ABERTA, S.EM_ANALISE, S.EM_ANDAMENTO],
    )
    pesos = (5, 3, 2) if idade_dias <= 7 else (2, 3, 3)
    return list(rng.choices(em_aberto, weights=pesos)[0])


def _historico(rng: random.Random, caminho: list[S], criado_em: datetime, agora: datetime) -> tuple[Passo, ...]:
    passos: list[Passo] = []
    anterior: S | None = None
    momento = criado_em
    for indice, status in enumerate(caminho):
        if indice > 0:
            momento = min(momento + timedelta(days=rng.uniform(1, 10)), agora)
        passos.append((anterior, status, momento, f"{PREFIXO_OBSERVACAO} {OBSERVACOES[status]}"))
        anterior = status
    return tuple(passos)


def gerar_lote(semente: int, quantidade: int, dias: int, agora: datetime) -> list[OcorrenciaFicticia]:
    """Lote fictício reproduzível: a mesma semente gera exatamente as mesmas ocorrências."""
    rng = random.Random(semente)
    regioes = carregar_regioes()
    por_codigo = {r.codigo: r for r in regioes}
    centros = [(_ponto_na_regiao(rng, por_codigo[codigo]), peso) for codigo, peso in FOCOS]
    categorias = list(PESOS_CATEGORIA)
    pesos_categoria = list(PESOS_CATEGORIA.values())

    lote: list[OcorrenciaFicticia] = []
    for _ in range(quantidade):
        no_foco = rng.random() < FRACAO_EM_FOCOS
        if no_foco:
            centro = rng.choices([c for c, _ in centros], weights=[p for _, p in centros])[0]
            lat, lon = _ponto_perto(rng, centro)
        else:
            lat, lon = _ponto_na_regiao(rng, rng.choice(regioes))
        regiao = localizar_regiao(lat, lon)
        assert regiao is not None  # os sorteios só aceitam pontos dentro de SP

        categoria = rng.choices(categorias, weights=pesos_categoria)[0]
        titulo, frase = rng.choice(TEXTOS[categoria])
        risco = rng.random() < 0.25
        bloqueio = rng.random() < 0.30
        acessibilidade = rng.random() < (0.6 if categoria is CategoriaOcorrencia.CALCADA_DANIFICADA else 0.25)
        prioridade = calcular_prioridade(categoria, risco, bloqueio, acessibilidade)

        idade = rng.uniform(0, dias)
        criado_em = agora - timedelta(days=idade)
        historico = _historico(rng, _caminho(rng, idade), criado_em, agora)

        autor = rng.randint(1, len(IDENTIFICACOES_FICTICIAS))
        quantos = rng.choice((0, 1, 1, 2, 2, 3, 4, 5, 6) if no_foco else (0, 0, 0, 1, 1, 2, 3))
        if prioridade.prioridade is Prioridade.ALTA:
            quantos += rng.choice((0, 1, 2))
        candidatos = [i for i in range(1, len(IDENTIFICACOES_FICTICIAS) + 1) if i != autor]
        confirmadores = tuple(rng.sample(candidatos, min(quantos, 6)))

        lote.append(
            OcorrenciaFicticia(
                autor=autor,
                titulo=titulo,
                descricao=f"{frase}. {SUFIXO_DESCRICAO}",
                categoria=categoria,
                latitude=lat,
                longitude=lon,
                subprefeitura_codigo=regiao.codigo,
                endereco=f"Endereço fictício · {regiao.nome}",
                risco_imediato=risco,
                bloqueia_passagem=bloqueio,
                afeta_acessibilidade=acessibilidade,
                pontuacao=prioridade.pontuacao,
                prioridade=prioridade.prioridade,
                justificativa=prioridade.justificativa,
                criado_em=criado_em,
                historico=historico,
                confirmadores=confirmadores,
            )
        )
    return lote


def distribuicao_alertas(lote: list[OcorrenciaFicticia], agora: datetime) -> Counter[NivelAlerta]:
    """Níveis de alerta das 32 regiões se o lote fosse gravado agora (usado na calibração)."""
    limite = agora - timedelta(days=JANELA_ALERTA_DIAS)
    por_regiao: dict[str, list[tuple[int, int, bool]]] = defaultdict(list)
    for o in lote:
        if o.status in STATUS_ABERTOS and o.criado_em >= limite:
            por_regiao[o.subprefeitura_codigo].append(
                (o.pontuacao, len(o.confirmadores), o.prioridade is Prioridade.ALTA)
            )
    return Counter(alerta_de(por_regiao.get(r.codigo, [])).nivel for r in carregar_regioes())


# ------------------------------------------------------------------ banco


def existem_ficticios(db: Session) -> bool:
    return bool(
        db.scalar(
            select(
                or_(
                    exists().where(Ocorrencia.origem == OrigemOcorrencia.SIMULADA),
                    exists().where(Identificacao.id.in_(IDENTIFICACOES_FICTICIAS)),
                )
            )
        )
    )


def gravar_lote(db: Session, lote: list[OcorrenciaFicticia]) -> int:
    """Grava o lote (origem SIMULADA) numa transação. Devolve quantas ocorrências gravou."""
    existentes = set(db.scalars(select(Identificacao.id).where(Identificacao.id.in_(IDENTIFICACOES_FICTICIAS))))
    for indice, ident in enumerate(IDENTIFICACOES_FICTICIAS, start=1):
        if ident not in existentes:
            db.add(Identificacao(id=ident, apelido=f"Pessoa fictícia {indice:03d}"))
    db.flush()

    pares: list[tuple[Ocorrencia, tuple[int, ...]]] = []
    for o in lote:
        ocorrencia = Ocorrencia(
            identificacao_id=IDENTIFICACOES_FICTICIAS[o.autor - 1],
            titulo=o.titulo,
            descricao=o.descricao,
            categoria=o.categoria,
            latitude=Decimal(f"{o.latitude:.6f}"),
            longitude=Decimal(f"{o.longitude:.6f}"),
            endereco=o.endereco,
            subprefeitura_codigo=o.subprefeitura_codigo,
            origem=OrigemOcorrencia.SIMULADA,
            risco_imediato=o.risco_imediato,
            bloqueia_passagem=o.bloqueia_passagem,
            afeta_acessibilidade=o.afeta_acessibilidade,
            status=o.status,
            prioridade=o.prioridade,
            prioridade_pontuacao=o.pontuacao,
            prioridade_justificativa=o.justificativa,
            ia_status=StatusAnaliseIA.INDISPONIVEL,
            criado_em=o.criado_em,
            atualizado_em=o.historico[-1][2],
        )
        ocorrencia.historico.extend(
            HistoricoStatus(status_anterior=de, status_novo=para, observacao=obs, alterado_em=quando)
            for de, para, quando, obs in o.historico
        )
        db.add(ocorrencia)
        pares.append((ocorrencia, o.confirmadores))
    db.flush()
    for ocorrencia, confirmadores in pares:
        db.add_all(
            Confirmacao(ocorrencia_id=ocorrencia.id, identificacao_id=IDENTIFICACOES_FICTICIAS[c - 1])
            for c in confirmadores
        )
    db.commit()
    return len(lote)


def remover_ficticios(db: Session) -> tuple[int, int]:
    """Apaga SOMENTE as ocorrências SIMULADA (histórico e confirmações vão em cascata) e as
    identificações fictícias. Devolve (ocorrências, identificações) removidas."""
    ocorrencias = db.execute(delete(Ocorrencia).where(Ocorrencia.origem == OrigemOcorrencia.SIMULADA)).rowcount
    identificacoes = db.execute(delete(Identificacao).where(Identificacao.id.in_(IDENTIFICACOES_FICTICIAS))).rowcount
    db.commit()
    return ocorrencias, identificacoes
