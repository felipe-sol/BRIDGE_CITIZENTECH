"""Gera Bridge-Mobile.zip (entrega de Mobile) com apenas o necessário.

Uso (na pasta bridge/):
    python scripts/gerar_zip_mobile.py                      # cria ../Bridge-Mobile.zip
    python scripts/gerar_zip_mobile.py --destino C:/tmp/x.zip
    python scripts/gerar_zip_mobile.py --permitir-marcadores  # só para testar antes de preencher authors

Inclui apenas uma lista fechada de arquivos/pastas (nada de node_modules, .expo,
.env, caches ou configurações de ferramentas) e confere o resultado.
"""

import argparse
import json
import sys
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
MOBILE = RAIZ / "mobile"
PASTA_NO_ZIP = "Bridge-Mobile"

ARQUIVOS = [
    "package.json",
    "package-lock.json",
    "app.json",
    "tsconfig.json",
    "eslint.config.js",
    ".env.example",
    ".gitignore",
    "README.md",
    "DECISOES.md",
]
PASTAS = ["src", "assets"]
OBRIGATORIOS = set(ARQUIVOS) | {"src/app/_layout.tsx", "src/app/(tabs)/index.tsx", "assets/icon.png"}
PROIBIDOS = ("node_modules/", ".expo/", "dist/", ".env", ".git/", ".claude/")


def coletar() -> list[Path]:
    caminhos = [MOBILE / a for a in ARQUIVOS]
    for pasta in PASTAS:
        caminhos.extend(p for p in sorted((MOBILE / pasta).rglob("*")) if p.is_file())
    faltando = [str(c.relative_to(MOBILE)) for c in caminhos if not c.is_file()]
    if faltando:
        sys.exit(f"Arquivos esperados não encontrados: {faltando}")
    return caminhos


def conferir_authors(permitir_marcadores: bool) -> list[dict[str, str]]:
    pacote = json.loads((MOBILE / "package.json").read_text(encoding="utf-8"))
    authors = pacote.get("authors")
    if not isinstance(authors, list) or not authors:
        sys.exit("package.json sem o array 'authors'.")
    pendentes = [a for a in authors if "PREENCHER" in json.dumps(a, ensure_ascii=False)]
    if pendentes and not permitir_marcadores:
        sys.exit(
            f"'authors' ainda tem {len(pendentes)} marcador(es) PREENCHER. Preencha nome e RM de todos "
            "antes de gerar o ZIP de entrega (ou use --permitir-marcadores só para teste)."
        )
    return authors


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--destino", type=Path, default=RAIZ.parent / "Bridge-Mobile.zip")
    parser.add_argument("--permitir-marcadores", action="store_true")
    args = parser.parse_args()

    authors = conferir_authors(args.permitir_marcadores)
    arquivos = coletar()

    args.destino.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.destino, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for caminho in arquivos:
            zf.write(caminho, f"{PASTA_NO_ZIP}/{caminho.relative_to(MOBILE).as_posix()}")

    # Conferência do conteúdo final.
    with zipfile.ZipFile(args.destino) as zf:
        nomes = [n.removeprefix(f"{PASTA_NO_ZIP}/") for n in zf.namelist()]
        assert zf.testzip() is None, "ZIP corrompido"
    proibidos = [n for n in nomes if n.startswith(PROIBIDOS) and n != ".env.example"]
    faltando = sorted(OBRIGATORIOS - set(nomes))
    if proibidos or faltando:
        sys.exit(f"ZIP inválido. Proibidos: {proibidos} · Faltando: {faltando}")

    tamanho_kb = args.destino.stat().st_size / 1024
    print(f"Gerado: {args.destino} ({len(nomes)} arquivos, {tamanho_kb:.0f} KB)")
    print(f"authors: {len(authors)} integrante(s)" + (" — COM MARCADORES (não entregar)" if args.permitir_marcadores else ""))
    for nome in nomes:
        print(f"  {PASTA_NO_ZIP}/{nome}")


if __name__ == "__main__":
    main()
