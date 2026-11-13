"""Dados FICTÍCIOS de demonstração (modo Exemplo do app): gerar, remover e relatório.

Uso (na pasta backend/, com o .env apontando para o banco desejado):
    python scripts/dados_ficticios.py gerar               # ~1.200 ocorrências nos últimos 120 dias
    python scripts/dados_ficticios.py gerar --recriar     # apaga os fictícios e gera de novo
    python scripts/dados_ficticios.py remover             # volta ao real: apaga SÓ os fictícios
    python scripts/dados_ficticios.py relatorio           # quantos existem e níveis de alerta

Tudo é gravado com origem = SIMULADA e nunca se mistura com os registros reais.
O script não mostra coordenadas nem dados de pessoas: só contagens.
"""

import argparse
import sys
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func, select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.enums import NivelAlerta, OrigemOcorrencia  # noqa: E402
from app.models import Ocorrencia  # noqa: E402
from app.services.alertas import alertas_por_regiao  # noqa: E402
from app.services.ficticios import (  # noqa: E402
    DIAS_PADRAO,
    QUANTIDADE_PADRAO,
    SEMENTE_PADRAO,
    existem_ficticios,
    gerar_lote,
    gravar_lote,
    remover_ficticios,
)
from app.services.regioes import regiao_por_codigo  # noqa: E402


def contar(origem: OrigemOcorrencia) -> int:
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(Ocorrencia).where(Ocorrencia.origem == origem)) or 0


def relatorio() -> None:
    with SessionLocal() as db:
        alertas = alertas_por_regiao(db, OrigemOcorrencia.SIMULADA, datetime.now(UTC))
    niveis = Counter(a.nivel for a in alertas.values())
    print(f"Ocorrências reais (APP): {contar(OrigemOcorrencia.APP)}")
    print(f"Ocorrências fictícias (SIMULADA): {contar(OrigemOcorrencia.SIMULADA)}")
    print(f"Alerta Bridge no Exemplo: {niveis[NivelAlerta.ALERTA]} em ALERTA, {niveis[NivelAlerta.ATENCAO]} em ATENCAO")
    for nivel in (NivelAlerta.ALERTA, NivelAlerta.ATENCAO):
        nomes = sorted(r.nome for c, a in alertas.items() if a.nivel is nivel and (r := regiao_por_codigo(c)))
        if nomes:
            print(f"  {nivel.value}: {', '.join(nomes)}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="comando", required=True)
    gerar = sub.add_parser("gerar", help="gera os dados fictícios")
    gerar.add_argument("--quantidade", type=int, default=QUANTIDADE_PADRAO)
    gerar.add_argument("--dias", type=int, default=DIAS_PADRAO)
    gerar.add_argument("--semente", type=int, default=SEMENTE_PADRAO)
    gerar.add_argument("--recriar", action="store_true", help="apaga os fictícios existentes antes")
    sub.add_parser("remover", help="apaga somente os dados fictícios")
    sub.add_parser("relatorio", help="contagens e níveis de alerta")
    args = parser.parse_args()

    if args.comando == "relatorio":
        relatorio()
        return

    with SessionLocal() as db:
        if args.comando == "remover":
            ocorrencias, identificacoes = remover_ficticios(db)
            print(f"Removidos: {ocorrencias} ocorrências fictícias e {identificacoes} identificações fictícias.")
            print(f"Ocorrências reais intactas: {contar(OrigemOcorrencia.APP)}")
            return
        if existem_ficticios(db):
            if not args.recriar:
                print("Já existem dados fictícios. Use --recriar para apagá-los e gerar de novo.")
                sys.exit(1)
            remover_ficticios(db)
        lote = gerar_lote(args.semente, args.quantidade, args.dias, datetime.now(UTC))
        gravados = gravar_lote(db, lote)
    print(f"Gerados: {gravados} ocorrências fictícias (semente {args.semente}, últimos {args.dias} dias).")
    relatorio()


if __name__ == "__main__":
    main()
