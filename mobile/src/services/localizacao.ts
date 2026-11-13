/**
 * Recurso nativo: localização atual (expo-location, somente em primeiro plano).
 * Nunca devolve coordenadas inventadas: em qualquer falha, a tela pede que o
 * usuário tente de novo ou digite as coordenadas.
 */
import * as Location from 'expo-location';

import { TempoEsgotado, comLimite } from '../utils/tempoLimite';

const TEMPO_LIMITE_MS = 20_000;

export type ResultadoLocalizacao =
  | { tipo: 'ok'; latitude: number; longitude: number; precisaoMetros: number | null }
  | { tipo: 'sem_permissao'; podePerguntarDeNovo: boolean }
  | { tipo: 'servico_desligado' }
  | { tipo: 'erro'; mensagem: string };

/**
 * Posição atual SÓ se a pessoa já deu a permissão: não abre o pedido do sistema.
 * Usada ao abrir telas (Início, Mapa); o pedido acontece quando a pessoa toca em
 * "Ativar localização" ou começa um registro.
 */
export async function obterLocalizacaoSePermitida(): Promise<ResultadoLocalizacao> {
  try {
    const permissao = await Location.getForegroundPermissionsAsync();
    if (!permissao.granted) return { tipo: 'sem_permissao', podePerguntarDeNovo: permissao.canAskAgain };
  } catch {
    return { tipo: 'erro', mensagem: 'Não foi possível verificar a permissão de localização.' };
  }
  return obterLocalizacaoAtual();
}

export async function obterLocalizacaoAtual(): Promise<ResultadoLocalizacao> {
  try {
    let permissao = await Location.getForegroundPermissionsAsync();
    if (!permissao.granted) {
      if (!permissao.canAskAgain) return { tipo: 'sem_permissao', podePerguntarDeNovo: false };
      permissao = await Location.requestForegroundPermissionsAsync();
      if (!permissao.granted) return { tipo: 'sem_permissao', podePerguntarDeNovo: permissao.canAskAgain };
    }

    if (!(await Location.hasServicesEnabledAsync())) return { tipo: 'servico_desligado' };

    const posicao = await comLimite(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      TEMPO_LIMITE_MS,
    );
    return {
      tipo: 'ok',
      latitude: posicao.coords.latitude,
      longitude: posicao.coords.longitude,
      precisaoMetros: posicao.coords.accuracy,
    };
  } catch (erro: unknown) {
    if (erro instanceof TempoEsgotado) {
      return {
        tipo: 'erro',
        mensagem: 'O GPS não respondeu a tempo. Tente de novo em local aberto ou digite as coordenadas.',
      };
    }
    return { tipo: 'erro', mensagem: 'Não foi possível obter a localização. Tente de novo ou digite as coordenadas.' };
  }
}
