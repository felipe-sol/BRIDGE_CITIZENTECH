"""Gera o GeoJSON simplificado das 32 subprefeituras de São Paulo usado pela API.

Fonte oficial: GeoSampa (Prefeitura de São Paulo), camada "geoportal:subprefeitura".
Baixe o arquivo bruto (≈2,3 MB, fica FORA do repositório) com:

    curl -o subprefeituras_bruto.json "http://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=geoportal:subprefeitura&outputFormat=application/json&srsName=EPSG:4326"

Depois, na pasta backend/:

    python scripts/preparar_regioes.py --entrada subprefeituras_bruto.json --saida app/dados/subprefeituras_sp.geojson

O script simplifica cada contorno (Douglas–Peucker), confere a divergência entre o
bruto e o simplificado em 5.000 pontos sorteados (semente fixa) e falha se passar de 1%.
"""

import argparse
import json
import random
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.geo import Ponto, ponto_em_poligono, simplificar_linha  # noqa: E402

AMOSTRAS = 5_000
SEMENTE = 42
DIVERGENCIA_MAXIMA = 0.01
CASAS = 5

Aneis = list[list[Ponto]]


def _aneis(feature: dict[str, Any]) -> Aneis:
    geometria = feature["geometry"]
    if geometria["type"] != "Polygon":
        raise SystemExit(f"Geometria inesperada ({geometria['type']}) em {feature['properties']}")
    return [[(float(x), float(y)) for x, y in anel] for anel in geometria["coordinates"]]


def _simplificar(aneis: Aneis, tolerancia: float) -> Aneis:
    resultado: Aneis = []
    for anel in aneis:
        reduzido = [(round(x, CASAS), round(y, CASAS)) for x, y in simplificar_linha(anel, tolerancia)]
        if reduzido[0] != reduzido[-1]:
            reduzido.append(reduzido[0])
        if len(reduzido) < 4:
            raise SystemExit("Tolerância alta demais: um anel ficou com menos de 4 pontos.")
        resultado.append(reduzido)
    return resultado


def _area_km2(props: dict[str, Any]) -> float:
    metros = props.get("qt_area_metro")
    if isinstance(metros, (int, float)) and metros > 0:
        return round(float(metros) / 1_000_000, 3)
    return float(props["qt_area_quilometro"])


def _localizar(lon: float, lat: float, regioes: list[tuple[str, Aneis]]) -> str | None:
    for codigo, aneis in regioes:
        if ponto_em_poligono(lon, lat, aneis):
            return codigo
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--entrada", type=Path, required=True)
    parser.add_argument("--saida", type=Path, required=True)
    parser.add_argument("--tolerancia", type=float, default=0.00015)
    args = parser.parse_args()

    bruto = json.loads(args.entrada.read_text(encoding="utf-8"))
    originais: list[tuple[str, Aneis]] = []
    simplificadas: list[tuple[str, Aneis]] = []
    features_saida: list[dict[str, Any]] = []

    for feature in sorted(bruto["features"], key=lambda f: str(f["properties"]["cd_subprefeitura"]).zfill(2)):
        props = feature["properties"]
        codigo = str(props["cd_subprefeitura"]).zfill(2)
        aneis = _aneis(feature)
        reduzidos = _simplificar(aneis, args.tolerancia)
        originais.append((codigo, aneis))
        simplificadas.append((codigo, reduzidos))
        features_saida.append(
            {
                "type": "Feature",
                "properties": {
                    "codigo": codigo,
                    "nome_oficial": props["nm_subprefeitura"],
                    "area_km2": _area_km2(props),
                    "zona": props.get("nm_regiao_05"),
                },
                "geometry": {"type": "Polygon", "coordinates": reduzidos},
            }
        )

    xs = [x for _, aneis in originais for anel in aneis for x, _ in anel]
    ys = [y for _, aneis in originais for anel in aneis for _, y in anel]
    sorteio = random.Random(SEMENTE)
    divergentes = 0
    for _ in range(AMOSTRAS):
        lon, lat = sorteio.uniform(min(xs), max(xs)), sorteio.uniform(min(ys), max(ys))
        if _localizar(lon, lat, originais) != _localizar(lon, lat, simplificadas):
            divergentes += 1
    taxa = divergentes / AMOSTRAS

    vertices_antes = sum(len(anel) for _, aneis in originais for anel in aneis)
    vertices_depois = sum(len(anel) for _, aneis in simplificadas for anel in aneis)
    print(f"Regiões: {len(features_saida)}")
    print(f"Vértices: {vertices_antes} → {vertices_depois} (tolerância {args.tolerancia}°)")
    print(f"Divergência em {AMOSTRAS} pontos (semente {SEMENTE}): {divergentes} ({taxa:.2%})")
    if taxa > DIVERGENCIA_MAXIMA:
        raise SystemExit(f"Divergência acima de {DIVERGENCIA_MAXIMA:.0%}: reduza a tolerância.")

    colecao = {"type": "FeatureCollection", "features": features_saida}
    args.saida.parent.mkdir(parents=True, exist_ok=True)
    args.saida.write_text(json.dumps(colecao, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Gravado: {args.saida} ({args.saida.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
