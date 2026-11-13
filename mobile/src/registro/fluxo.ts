/**
 * Etapas do registro (redutor puro, testável sem o app):
 *
 *   local → categoria → parecidos? → detalhes → revisão
 *
 * Depois da categoria, o app verifica ocorrências abertas parecidas a até 100 m.
 * Sem parecidos (ou se a verificação falhar) segue direto para os detalhes;
 * com parecidos, a pessoa escolhe entre confirmar uma delas ou dizer que é outro.
 */
import type { Categoria, OcorrenciaProxima } from '../models/ocorrencia.ts';
import type { Coordenada } from '../geo/tipos.ts';

export type Etapa = 'local' | 'categoria' | 'parecidos' | 'detalhes' | 'revisao';

export interface EstadoFluxo {
  etapa: Etapa;
  ponto: Coordenada | null;
  categoria: Categoria | null;
  parecidos: OcorrenciaProxima[];
  /** true enquanto a consulta de parecidos não respondeu. */
  verificando: boolean;
  avisoParecidos: string | null;
}

export type EventoFluxo =
  | { tipo: 'confirmar_local'; ponto: Coordenada }
  | { tipo: 'escolher_categoria'; categoria: Categoria }
  | { tipo: 'parecidos_carregados'; itens: OcorrenciaProxima[] }
  | { tipo: 'parecidos_falharam'; mensagem: string }
  | { tipo: 'e_outro' }
  | { tipo: 'avancar' }
  | { tipo: 'voltar' };

export const FLUXO_INICIAL: EstadoFluxo = {
  etapa: 'local',
  ponto: null,
  categoria: null,
  parecidos: [],
  verificando: false,
  avisoParecidos: null,
};

export const AVISO_PARECIDOS_FALHOU = 'Não foi possível verificar registros parecidos. Você pode continuar.';

/** Coordenada real: finita, no intervalo válido e diferente de (0, 0) — que indica GPS ausente. */
function pontoValido(p: Coordenada): boolean {
  const { latitude, longitude } = p;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
  return !(latitude === 0 && longitude === 0);
}

const ANTERIOR: Record<Etapa, Etapa> = {
  local: 'local',
  categoria: 'local',
  parecidos: 'categoria',
  detalhes: 'categoria',
  revisao: 'detalhes',
};

export function reduzirFluxo(estado: EstadoFluxo, evento: EventoFluxo): EstadoFluxo {
  switch (evento.tipo) {
    case 'confirmar_local':
      if (estado.etapa !== 'local' || !pontoValido(evento.ponto)) return estado;
      return { ...estado, etapa: 'categoria', ponto: evento.ponto };

    case 'escolher_categoria':
      if (estado.etapa !== 'categoria') return estado;
      return {
        ...estado,
        etapa: 'parecidos',
        categoria: evento.categoria,
        parecidos: [],
        verificando: true,
        avisoParecidos: null,
      };

    case 'parecidos_carregados':
      // Resposta atrasada (a pessoa já voltou ou seguiu): ignora.
      if (estado.etapa !== 'parecidos' || !estado.verificando) return estado;
      return {
        ...estado,
        etapa: evento.itens.length === 0 ? 'detalhes' : 'parecidos',
        parecidos: evento.itens,
        verificando: false,
      };

    case 'parecidos_falharam':
      if (estado.etapa !== 'parecidos' || !estado.verificando) return estado;
      return { ...estado, etapa: 'detalhes', verificando: false, avisoParecidos: AVISO_PARECIDOS_FALHOU };

    case 'e_outro':
      return estado.etapa === 'parecidos' && !estado.verificando ? { ...estado, etapa: 'detalhes' } : estado;

    case 'avancar':
      return estado.etapa === 'detalhes' ? { ...estado, etapa: 'revisao' } : estado;

    case 'voltar':
      return { ...estado, etapa: ANTERIOR[estado.etapa], verificando: false };
  }
}
