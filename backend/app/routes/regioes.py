from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.services.regioes import regioes_geojson

router = APIRouter(tags=["regioes"])


@router.get(
    "/regioes",
    summary="Limites das 32 subprefeituras de São Paulo (GeoJSON simplificado, fonte GeoSampa)",
    response_class=JSONResponse,
    responses={200: {"description": "FeatureCollection com codigo, nome, nome_oficial, area_km2 e zona"}},
)
def listar_regioes() -> JSONResponse:
    # Dado oficial que muda raramente: o app pode guardar em cache por um dia.
    return JSONResponse(content=regioes_geojson(), headers={"Cache-Control": "public, max-age=86400"})
