/**
 * Modo dos dados no Mapa e nas Análises. O app SEMPRE abre no Ao vivo (dados reais);
 * o Exemplo (dados fictícios de demonstração) só aparece quando pedido explicitamente.
 */
import type { Origem } from '../models/ocorrencia.ts';

export type ModoDados = 'aovivo' | 'exemplo';

export function interpretarModo(valor: string | string[] | undefined): ModoDados {
  return valor === 'exemplo' ? 'exemplo' : 'aovivo';
}

export function origemDoModo(modo: ModoDados): Origem {
  return modo === 'exemplo' ? 'SIMULADA' : 'APP';
}
