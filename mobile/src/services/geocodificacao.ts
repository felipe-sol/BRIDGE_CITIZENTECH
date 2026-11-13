/**
 * Geocodificação do PRÓPRIO aparelho (expo-location: Apple no iPhone, Google
 * Play Services no Android): sem chave de API e sem serviço pago.
 *
 * Nunca trava o fluxo: em falha ou demora, devolve "indisponível" e o endereço
 * fica em branco para a pessoa digitar. No Android, exige a permissão de
 * localização já concedida (docs do SDK 58).
 */
import * as Location from 'expo-location';

import { montarEndereco } from '../geo/endereco';
import type { Coordenada } from '../geo/tipos';
import { comLimite } from '../utils/tempoLimite';

const TEMPO_LIMITE_MS = 8_000;

/** Retângulo que contém o município de São Paulo (descarta resultados de outras cidades). */
const CAIXA_SP = { minLon: -46.83, minLat: -24.01, maxLon: -46.36, maxLat: -23.36 } as const;

export type ResultadoEndereco = { tipo: 'ok'; endereco: string; bairro: string | null } | { tipo: 'indisponivel' };

export async function enderecoDe(ponto: Coordenada): Promise<ResultadoEndereco> {
  try {
    const [resultado] = await comLimite(
      Location.reverseGeocodeAsync({ latitude: ponto.latitude, longitude: ponto.longitude }),
      TEMPO_LIMITE_MS,
    );
    if (!resultado) return { tipo: 'indisponivel' };
    const bairro = resultado.district ?? resultado.subregion ?? null;
    const endereco = montarEndereco({ rua: resultado.street ?? resultado.name, numero: resultado.streetNumber, bairro });
    return endereco ? { tipo: 'ok', endereco, bairro } : { tipo: 'indisponivel' };
  } catch {
    return { tipo: 'indisponivel' };
  }
}

/** Coordenada de um endereço digitado, só se cair dentro de São Paulo. */
export async function localizarEndereco(texto: string): Promise<Coordenada | null> {
  const consulta = texto.trim();
  if (consulta.length < 3) return null;
  try {
    const resultados = await comLimite(Location.geocodeAsync(`${consulta}, São Paulo - SP`), TEMPO_LIMITE_MS);
    const dentro = resultados.find(
      (r) =>
        r.longitude >= CAIXA_SP.minLon &&
        r.longitude <= CAIXA_SP.maxLon &&
        r.latitude >= CAIXA_SP.minLat &&
        r.latitude <= CAIXA_SP.maxLat,
    );
    return dentro ? { latitude: dentro.latitude, longitude: dentro.longitude } : null;
  } catch {
    return null;
  }
}
