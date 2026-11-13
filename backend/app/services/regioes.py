"""Regiões oficiais de São Paulo: as 32 subprefeituras (fonte: GeoSampa).

O GeoJSON simplificado e a proveniência ficam em app/dados/ (ver FONTE_REGIOES.md).
"""

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.services.geo import Ponto, ponto_em_poligono

CAMINHO_GEOJSON = Path(__file__).resolve().parents[1] / "dados" / "subprefeituras_sp.geojson"

# Nome oficial (que vem sem acentos na camada) escrito com a grafia correta.
NOMES_EXIBICAO: dict[str, str] = {
    "01": "Perus/Anhanguera",
    "02": "Pirituba/Jaraguá",
    "03": "Freguesia/Brasilândia",
    "04": "Casa Verde/Limão/Cachoeirinha",
    "05": "Santana/Tucuruvi",
    "06": "Jaçanã/Tremembé",
    "07": "Vila Maria/Vila Guilherme",
    "08": "Lapa",
    "09": "Sé",
    "10": "Butantã",
    "11": "Pinheiros",
    "12": "Vila Mariana",
    "13": "Ipiranga",
    "14": "Santo Amaro",
    "15": "Jabaquara",
    "16": "Cidade Ademar",
    "17": "Campo Limpo",
    "18": "M'Boi Mirim",
    "19": "Capela do Socorro",
    "20": "Parelheiros",
    "21": "Penha",
    "22": "Ermelino Matarazzo",
    "23": "São Miguel",
    "24": "Itaim Paulista",
    "25": "Mooca",
    "26": "Aricanduva/Formosa/Carrão",
    "27": "Itaquera",
    "28": "Guaianases",
    "29": "Vila Prudente",
    "30": "São Mateus",
    "31": "Cidade Tiradentes",
    "32": "Sapopemba",
}


@dataclass(frozen=True)
class Regiao:
    codigo: str
    nome: str
    nome_oficial: str
    area_km2: float
    zona: str | None
    aneis: tuple[tuple[Ponto, ...], ...]
    caixa: tuple[float, float, float, float]  # min_lon, min_lat, max_lon, max_lat


def _regiao_de(feature: dict[str, Any]) -> Regiao:
    props = feature["properties"]
    aneis = tuple(tuple((float(x), float(y)) for x, y in anel) for anel in feature["geometry"]["coordinates"])
    xs = [x for x, _ in aneis[0]]
    ys = [y for _, y in aneis[0]]
    codigo = str(props["codigo"])
    return Regiao(
        codigo=codigo,
        nome=NOMES_EXIBICAO[codigo],
        nome_oficial=str(props["nome_oficial"]),
        area_km2=float(props["area_km2"]),
        zona=props.get("zona"),
        aneis=aneis,
        caixa=(min(xs), min(ys), max(xs), max(ys)),
    )


@lru_cache(maxsize=1)
def carregar_regioes() -> tuple[Regiao, ...]:
    colecao = json.loads(CAMINHO_GEOJSON.read_text(encoding="utf-8"))
    return tuple(_regiao_de(f) for f in colecao["features"])


def localizar_regiao(latitude: float, longitude: float) -> Regiao | None:
    """Subprefeitura que contém o ponto, ou None fora do município."""
    for regiao in carregar_regioes():
        min_lon, min_lat, max_lon, max_lat = regiao.caixa
        if min_lon <= longitude <= max_lon and min_lat <= latitude <= max_lat:
            if ponto_em_poligono(longitude, latitude, regiao.aneis):
                return regiao
    return None


def regiao_por_codigo(codigo: str) -> Regiao | None:
    return next((r for r in carregar_regioes() if r.codigo == codigo), None)


@lru_cache(maxsize=1)
def regioes_geojson() -> dict[str, object]:
    """FeatureCollection pública (GET /regioes), com o nome de exibição."""
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "codigo": r.codigo,
                    "nome": r.nome,
                    "nome_oficial": r.nome_oficial,
                    "area_km2": r.area_km2,
                    "zona": r.zona,
                },
                "geometry": {"type": "Polygon", "coordinates": [[list(p) for p in anel] for anel in r.aneis]},
            }
            for r in carregar_regioes()
        ],
    }
