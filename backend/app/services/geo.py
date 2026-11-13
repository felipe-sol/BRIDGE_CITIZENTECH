"""Geometria simples em coordenadas geográficas (graus), sem dependências externas.

Pontos e anéis usam a ordem do GeoJSON: (longitude, latitude).
"""

import math
from collections.abc import Sequence

RAIO_TERRA_M = 6_371_008.8

Ponto = tuple[float, float]


def distancia_metros(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distância em metros pela fórmula de haversine (esfera de raio médio)."""
    fi1, fi2 = math.radians(lat1), math.radians(lat2)
    d_fi = fi2 - fi1
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_fi / 2) ** 2 + math.cos(fi1) * math.cos(fi2) * math.sin(d_lambda / 2) ** 2
    return 2 * RAIO_TERRA_M * math.asin(math.sqrt(a))


def _dentro_do_anel(lon: float, lat: float, anel: Sequence[Ponto]) -> bool:
    """Ray casting: conta quantas arestas um raio horizontal cruza."""
    dentro = False
    n = len(anel)
    j = n - 1
    for i in range(n):
        xi, yi = anel[i]
        xj, yj = anel[j]
        if (yi > lat) != (yj > lat):
            x_cruzamento = xi + (lat - yi) * (xj - xi) / (yj - yi)
            if lon < x_cruzamento:
                dentro = not dentro
        j = i
    return dentro


def ponto_em_poligono(lon: float, lat: float, aneis: Sequence[Sequence[Ponto]]) -> bool:
    """O primeiro anel é o contorno; os demais são buracos."""
    if not aneis or not _dentro_do_anel(lon, lat, aneis[0]):
        return False
    return not any(_dentro_do_anel(lon, lat, buraco) for buraco in aneis[1:])


def _distancia_ao_segmento(p: Ponto, a: Ponto, b: Ponto) -> float:
    dx, dy = b[0] - a[0], b[1] - a[1]
    if dx == 0 and dy == 0:
        return math.hypot(p[0] - a[0], p[1] - a[1])
    t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
    return math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))


def simplificar_linha(pontos: Sequence[Ponto], tolerancia: float) -> list[Ponto]:
    """Douglas–Peucker iterativo: remove pontos que desviam menos que a tolerância.

    Sempre preserva o primeiro e o último ponto (anéis fechados continuam fechados).
    """
    if len(pontos) <= 2:
        return list(pontos)
    manter = [False] * len(pontos)
    manter[0] = manter[-1] = True
    pilha = [(0, len(pontos) - 1)]
    while pilha:
        inicio, fim = pilha.pop()
        maior, indice = 0.0, -1
        for i in range(inicio + 1, fim):
            d = _distancia_ao_segmento(pontos[i], pontos[inicio], pontos[fim])
            if d > maior:
                maior, indice = d, i
        if indice != -1 and maior > tolerancia:
            manter[indice] = True
            pilha.append((inicio, indice))
            pilha.append((indice, fim))
    return [p for p, fica in zip(pontos, manter, strict=True) if fica]
