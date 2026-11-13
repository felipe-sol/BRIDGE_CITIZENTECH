/**
 * Barra de andamento: Registrada → Em análise → Em andamento → Resolvida.
 * "Rejeitada" sai da sequência e é mostrada como estado próprio.
 */
import type { StatusOcorrencia } from '../models/ocorrencia.ts';

export const ROTULOS_ETAPAS = ['Registrada', 'Em análise', 'Em andamento', 'Resolvida'] as const;

export interface Etapa {
  /** Posição do passo atual (0 a 3); null quando rejeitada. */
  indice: number | null;
  total: 4;
  rejeitada: boolean;
}

const INDICE: Record<StatusOcorrencia, number | null> = {
  ABERTA: 0,
  EM_ANALISE: 1,
  EM_ANDAMENTO: 2,
  RESOLVIDA: 3,
  REJEITADA: null,
};

export function etapaDoStatus(status: StatusOcorrencia): Etapa {
  return { indice: INDICE[status], total: 4, rejeitada: status === 'REJEITADA' };
}
