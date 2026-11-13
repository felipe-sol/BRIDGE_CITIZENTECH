"""Preenche a subprefeitura das ocorrências que ainda não têm (ex.: depois da migração 0003).

Uso (na pasta backend/, com o .env apontando para o banco desejado):
    python scripts/recalcular_regioes.py          # só as ocorrências sem região
    python scripts/recalcular_regioes.py --todas  # recalcula todas

Idempotente: rodar de novo não muda o resultado.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.services.ocorrencias import recalcular_subprefeituras  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--todas", action="store_true", help="recalcula também as que já têm região")
    args = parser.parse_args()
    with SessionLocal() as db:
        com_regiao, fora = recalcular_subprefeituras(db, todas=args.todas)
    print(f"{com_regiao} atualizadas, {fora} fora de SP")


if __name__ == "__main__":
    main()
