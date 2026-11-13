"""Regiões oficiais (32 subprefeituras de São Paulo) a partir do GeoJSON versionado."""

from app.services.regioes import (
    CAMINHO_GEOJSON,
    NOMES_EXIBICAO,
    carregar_regioes,
    localizar_regiao,
    regiao_por_codigo,
    regioes_geojson,
)


def test_carrega_32_regioes_com_nomes_e_areas() -> None:
    regs = carregar_regioes()
    assert len(regs) == 32 and len({r.codigo for r in regs}) == 32
    assert all(r.codigo in NOMES_EXIBICAO and r.area_km2 > 0 for r in regs)
    # A soma das áreas oficiais é a área do município (≈ 1.521 km²).
    assert 1_500 < sum(r.area_km2 for r in regs) < 1_545


def test_pontos_conhecidos() -> None:
    se = localizar_regiao(-23.5503, -46.6340)  # Praça da Sé
    ibirapuera = localizar_regiao(-23.5874, -46.6576)  # Parque Ibirapuera
    assert se is not None and se.codigo == "09"
    assert ibirapuera is not None and ibirapuera.codigo == "12"
    assert localizar_regiao(-23.4356, -46.4731) is None  # Aeroporto de Guarulhos (outro município)
    assert localizar_regiao(-22.9068, -43.1729) is None  # Rio de Janeiro


def test_nome_exibicao() -> None:
    se = regiao_por_codigo("09")
    assert se is not None and se.nome == "Sé" and se.nome_oficial == "SE"
    assert regiao_por_codigo("99") is None


def test_geojson_publico_tem_propriedades_para_o_app() -> None:
    colecao = regioes_geojson()
    assert colecao["type"] == "FeatureCollection"
    features = colecao["features"]
    assert isinstance(features, list) and len(features) == 32
    props = features[0]["properties"]
    assert set(props) == {"codigo", "nome", "nome_oficial", "area_km2", "zona"}


def test_arquivo_pequeno() -> None:
    assert CAMINHO_GEOJSON.stat().st_size <= 300_000
