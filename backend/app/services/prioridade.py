"""Regra de prioridade: pontuação determinística por regras (NÃO é Machine Learning).

Documentação completa: docs/REGRAS_DE_NEGOCIO.md, seção 1.
Usa somente campos informados pelo cidadão no cadastro.
"""

from dataclasses import dataclass

from app.enums import CategoriaOcorrencia, Prioridade

# Fator 1 — gravidade base da categoria (escala 1 a 3), definida pela equipe.
PESO_CATEGORIA: dict[CategoriaOcorrencia, int] = {
    CategoriaOcorrencia.BURACO: 3,
    CategoriaOcorrencia.CALCADA_DANIFICADA: 2,
    CategoriaOcorrencia.OBSTACULO_CIRCULACAO: 2,
    CategoriaOcorrencia.ILUMINACAO_DEFEITUOSA: 2,
    CategoriaOcorrencia.OUTRO: 1,
}

NOME_CATEGORIA: dict[CategoriaOcorrencia, str] = {
    CategoriaOcorrencia.BURACO: "buraco",
    CategoriaOcorrencia.CALCADA_DANIFICADA: "calçada danificada",
    CategoriaOcorrencia.OBSTACULO_CIRCULACAO: "obstáculo à circulação",
    CategoriaOcorrencia.ILUMINACAO_DEFEITUOSA: "iluminação defeituosa",
    CategoriaOcorrencia.OUTRO: "outro",
}

# Fatores 2 a 4 — informados pelo cidadão (sim/não).
PESO_RISCO_IMEDIATO = 3
PESO_BLOQUEIA_PASSAGEM = 2
PESO_AFETA_ACESSIBILIDADE = 2

PONTUACAO_MAXIMA = max(PESO_CATEGORIA.values()) + PESO_RISCO_IMEDIATO + PESO_BLOQUEIA_PASSAGEM + PESO_AFETA_ACESSIBILIDADE

# Faixas: 1–3 BAIXA, 4–5 MEDIA, 6–10 ALTA.
LIMITE_MEDIA = 4
LIMITE_ALTA = 6


@dataclass(frozen=True)
class ResultadoPrioridade:
    pontuacao: int
    prioridade: Prioridade
    justificativa: str


def faixa(pontuacao: int) -> Prioridade:
    if pontuacao >= LIMITE_ALTA:
        return Prioridade.ALTA
    if pontuacao >= LIMITE_MEDIA:
        return Prioridade.MEDIA
    return Prioridade.BAIXA


def calcular_prioridade(
    categoria: CategoriaOcorrencia,
    risco_imediato: bool,
    bloqueia_passagem: bool,
    afeta_acessibilidade: bool,
) -> ResultadoPrioridade:
    peso_categoria = PESO_CATEGORIA[categoria]
    pontuacao = peso_categoria
    partes = [f"Categoria {NOME_CATEGORIA[categoria]} (+{peso_categoria})"]

    if risco_imediato:
        pontuacao += PESO_RISCO_IMEDIATO
        partes.append(f"risco imediato informado (+{PESO_RISCO_IMEDIATO})")
    if bloqueia_passagem:
        pontuacao += PESO_BLOQUEIA_PASSAGEM
        partes.append(f"bloqueia a passagem (+{PESO_BLOQUEIA_PASSAGEM})")
    if afeta_acessibilidade:
        pontuacao += PESO_AFETA_ACESSIBILIDADE
        partes.append(f"afeta acessibilidade (+{PESO_AFETA_ACESSIBILIDADE})")

    prioridade = faixa(pontuacao)
    justificativa = f"{'; '.join(partes)}. Total {pontuacao}/{PONTUACAO_MAXIMA} → {prioridade.value}."
    return ResultadoPrioridade(pontuacao=pontuacao, prioridade=prioridade, justificativa=justificativa)
