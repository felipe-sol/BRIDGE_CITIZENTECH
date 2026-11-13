"""Geometria pura: distância, ponto-em-polígono e simplificação de linhas."""

from app.services.geo import distancia_metros, ponto_em_poligono, simplificar_linha


def test_distancia_um_milesimo_de_grau_de_latitude() -> None:
    # 0,001° de latitude ≈ 111,2 m em qualquer lugar do globo.
    assert abs(distancia_metros(-23.55, -46.63, -23.551, -46.63) - 111.2) < 1.0


def test_distancia_mesmo_ponto_e_zero() -> None:
    assert distancia_metros(-23.55, -46.63, -23.55, -46.63) == 0.0


def test_ponto_em_poligono_com_buraco() -> None:
    quadrado = [(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0), (0.0, 0.0)]
    buraco = [(4.0, 4.0), (6.0, 4.0), (6.0, 6.0), (4.0, 6.0), (4.0, 4.0)]
    assert ponto_em_poligono(1, 1, [quadrado, buraco]) is True
    assert ponto_em_poligono(5, 5, [quadrado, buraco]) is False
    assert ponto_em_poligono(11, 5, [quadrado]) is False


def test_ponto_em_poligono_concavo() -> None:
    # Forma de "U": o vão do meio fica fora.
    u = [(0.0, 0.0), (6.0, 0.0), (6.0, 6.0), (4.0, 6.0), (4.0, 2.0), (2.0, 2.0), (2.0, 6.0), (0.0, 6.0), (0.0, 0.0)]
    assert ponto_em_poligono(1, 5, [u]) is True
    assert ponto_em_poligono(3, 5, [u]) is False


def test_simplificar_remove_ponto_colinear_e_preserva_extremos() -> None:
    linha = [(0.0, 0.0), (1.0, 0.00001), (2.0, 0.0)]
    assert simplificar_linha(linha, 0.001) == [(0.0, 0.0), (2.0, 0.0)]


def test_simplificar_mantem_ponto_que_desvia_mais_que_a_tolerancia() -> None:
    linha = [(0.0, 0.0), (1.0, 0.5), (2.0, 0.0)]
    assert simplificar_linha(linha, 0.1) == [(0.0, 0.0), (1.0, 0.5), (2.0, 0.0)]
