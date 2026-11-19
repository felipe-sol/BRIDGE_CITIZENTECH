"""Pacote de DEMONSTRAÇÃO (registros que a equipe fez no app): importar e remover.

Uso (na pasta backend/, depois de `alembic upgrade head`):
    python scripts/dados_demo.py importar   # grava os registros de backend/dados_demo/
    python scripts/dados_demo.py remover    # apaga SÓ a demonstração (registros, fotos e autores)

Os registros entram como feitos pelo app (aparecem no "Ao vivo"), com local aproximado e
foto ilustrativa do Wikimedia Commons; a descrição de cada um avisa isso.
Para os testes manuais do Insomnia (que esperam um banco vazio), não importe antes da Rodada 1.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.enums import OrigemOcorrencia  # noqa: E402
from app.services.demonstracao import (  # noqa: E402
    PASTA_DEMO,
    DemonstracaoJaImportada,
    PacoteInvalido,
    importar_demonstracao,
    ler_pacote,
    remover_demonstracao,
)
from app.services.ia import criar_classificador  # noqa: E402
from app.services.ocorrencias import analisar_pendentes  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="comando", required=True)
    sub.add_parser("importar", help="grava os registros de demonstração")
    sub.add_parser("remover", help="apaga somente os registros de demonstração")
    args = parser.parse_args()
    settings = get_settings()

    with SessionLocal() as db:
        if args.comando == "remover":
            ocorrencias, autores = remover_demonstracao(db, settings.upload_dir)
            print(f"Removidos: {ocorrencias} registros de demonstração e {autores} autores.")
            return
        try:
            gravados = importar_demonstracao(db, ler_pacote(PASTA_DEMO), PASTA_DEMO, settings.upload_dir)
        except (PacoteInvalido, DemonstracaoJaImportada) as exc:
            print(exc)
            sys.exit(1)
        classificador = criar_classificador(settings)
        analise = analisar_pendentes(db, classificador, OrigemOcorrencia.APP)
    print(f"Importados: {gravados} registros de demonstração (com foto ilustrativa).")
    if classificador.disponivel:
        print(f"IA: {analise.concluidas} analisados pelo modelo {classificador.versao} ({analise.falharam} com falha).")
    else:
        print("IA: nenhum modelo carregado; os registros ficam com a análise INDISPONIVEL.")


if __name__ == "__main__":
    main()
