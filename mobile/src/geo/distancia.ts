/** Distâncias, área visível do mapa e enquadramento inicial. */
import type { ResultadoLocalizacao } from '../services/localizacao.ts';
import type { Caixa, Coordenada, RegiaoMapa } from './tipos.ts';

const RAIO_TERRA_M = 6_371_008.8;

/** Marco zero de São Paulo (Praça da Sé), usado quando não há localização. */
export const CENTRO_SP: Coordenada = { latitude: -23.5505, longitude: -46.6333 };

const DELTA_CIDADE = 0.25;
const DELTA_PERTO = 0.02;

/** Distância em metros (haversine). */
export function distanciaMetros(a: Coordenada, b: Coordenada): number {
  const rad = (graus: number) => (graus * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA_M * Math.asin(Math.sqrt(h));
}

/** "40 m" ou "1,2 km". */
export function formatarDistancia(metros: number): string {
  if (metros < 999.5) return `${Math.round(metros)} m`;
  return `${(metros / 1000).toFixed(1).replace('.', ',')} km`;
}

/** 6 casas decimais ≈ 0,1 m: evita "-46.800000000000004" na URL da API. */
function seisCasas(valor: number): number {
  return Math.round(valor * 1_000_000) / 1_000_000;
}

export function caixaDaRegiao(regiao: RegiaoMapa): Caixa {
  return {
    minLon: seisCasas(regiao.longitude - regiao.longitudeDelta / 2),
    minLat: seisCasas(regiao.latitude - regiao.latitudeDelta / 2),
    maxLon: seisCasas(regiao.longitude + regiao.longitudeDelta / 2),
    maxLat: seisCasas(regiao.latitude + regiao.latitudeDelta / 2),
  };
}

/** Perto da pessoa quando há localização; senão, a cidade inteira a partir do centro. */
export function regiaoInicial(localizacao: ResultadoLocalizacao | null): RegiaoMapa {
  if (localizacao?.tipo === 'ok') {
    return {
      latitude: localizacao.latitude,
      longitude: localizacao.longitude,
      latitudeDelta: DELTA_PERTO,
      longitudeDelta: DELTA_PERTO,
    };
  }
  return { ...CENTRO_SP, latitudeDelta: DELTA_CIDADE, longitudeDelta: DELTA_CIDADE };
}

const DELTA_PONTO = 0.004;

/** Etapa Local do registro: ao voltar a ela, o mapa reabre no ponto já escolhido, bem de perto. */
export function regiaoDaEtapaLocal(ponto: Coordenada | null): RegiaoMapa {
  if (ponto === null) return regiaoInicial(null);
  return { ...ponto, latitudeDelta: DELTA_PONTO, longitudeDelta: DELTA_PONTO };
}

const FOLGA_ENQUADRAMENTO = 1.15;

/** Região do mapa que mostra a caixa inteira, com 15% de folga nas bordas. */
export function regiaoDaCaixa(caixa: Caixa): RegiaoMapa {
  return {
    latitude: seisCasas((caixa.minLat + caixa.maxLat) / 2),
    longitude: seisCasas((caixa.minLon + caixa.maxLon) / 2),
    latitudeDelta: seisCasas((caixa.maxLat - caixa.minLat) * FOLGA_ENQUADRAMENTO),
    longitudeDelta: seisCasas((caixa.maxLon - caixa.minLon) * FOLGA_ENQUADRAMENTO),
  };
}
