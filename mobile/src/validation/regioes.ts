/**
 * Converte o GeoJSON de GET /regioes nas regiões tipadas do app, ou lança
 * ErroFormato se o formato não bater com o contrato.
 */
import type { Coordenada, RegiaoSP } from '../geo/tipos.ts';
import { ErroFormato, lista, numero, objeto, texto, textoOuNulo } from './guardas.ts';

function anel(valor: unknown): Coordenada[] {
  if (!Array.isArray(valor) || valor.length < 4) throw new ErroFormato('Anel de polígono inválido.');
  return valor.map((par: unknown) => {
    if (!Array.isArray(par) || par.length < 2) throw new ErroFormato('Coordenada inválida.');
    const [longitude, latitude] = par as unknown[];
    if (typeof longitude !== 'number' || typeof latitude !== 'number' || !Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      throw new ErroFormato('Coordenada inválida.');
    }
    return { latitude, longitude };
  });
}

function parseRegiao(valor: unknown): RegiaoSP {
  const feature = objeto(valor, 'Região');
  const props = objeto(feature['properties'], 'Propriedades da região');
  const geometria = objeto(feature['geometry'], 'Geometria da região');
  if (geometria['type'] !== 'Polygon' || !Array.isArray(geometria['coordinates'])) {
    throw new ErroFormato('A geometria da região deve ser um polígono.');
  }
  const aneis = (geometria['coordinates'] as unknown[]).map(anel);
  const contorno = aneis[0];
  if (contorno === undefined) throw new ErroFormato('Região sem contorno.');

  const lats = contorno.map((c) => c.latitude);
  const lons = contorno.map((c) => c.longitude);
  const caixa = { minLon: Math.min(...lons), minLat: Math.min(...lats), maxLon: Math.max(...lons), maxLat: Math.max(...lats) };
  return {
    codigo: texto(props, 'codigo'),
    nome: texto(props, 'nome'),
    nomeOficial: texto(props, 'nome_oficial'),
    areaKm2: numero(props, 'area_km2'),
    zona: textoOuNulo(props, 'zona'),
    aneis,
    caixa,
    centro: { latitude: (caixa.minLat + caixa.maxLat) / 2, longitude: (caixa.minLon + caixa.maxLon) / 2 },
  };
}

export function parseRegioes(valor: unknown): RegiaoSP[] {
  return lista(objeto(valor, 'Coleção de regiões'), 'features', parseRegiao);
}
