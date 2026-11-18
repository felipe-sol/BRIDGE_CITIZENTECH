"""Roda a IA nas ocorrências registradas antes de o modelo ser ativado.

Uso (na pasta backend/, com o .env apontando para o banco e para o modelo):
    python scripts/analisar_ia.py                 # reais e fictícias sem análise
    python scripts/analisar_ia.py --origem APP    # só as reais
    python scripts/analisar_ia.py --origem SIMULADA

Analisa só as que estão "INDISPONIVEL" ou "FALHOU"; as já concluídas não são refeitas.
Não muda a categoria escolhida, a prioridade nem a data de atualização. Mostra só contagens.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.enums import OrigemOcorrencia  # noqa: E402
from app.services.ia import criar_classificador  # noqa: E402
from app.services.ocorrencias import analisar_pendentes  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--origem", choices=[o.value for o in OrigemOcorrencia], help="padrão: todas")
    args = parser.parse_args()

    classificador = criar_classificador(get_settings())
    if not classificador.disponivel:
        print("Nenhum modelo de IA carregado. Confira MODELO_IA_CAMINHO no backend/.env.")
        sys.exit(1)

    origem = OrigemOcorrencia(args.origem) if args.origem else None
    with SessionLocal() as db:
        resumo = analisar_pendentes(db, classificador, origem)
    print(
        f"Modelo {classificador.versao}: {resumo.analisadas} ocorrências analisadas "
        f"({resumo.concluidas} concluídas, {resumo.falharam} com falha)."
    )


if __name__ == "__main__":
    main()
