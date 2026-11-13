/** Converte a ocorrência da API no mínimo que o mapa precisa para desenhar o marcador. */
import type { Ocorrencia } from '../models/ocorrencia.ts';
import type { PontoMapa } from './tipos.ts';

export function paraPontoMapa(o: Ocorrencia): PontoMapa {
  return {
    id: o.id,
    latitude: o.latitude,
    longitude: o.longitude,
    categoria: o.categoria,
    prioridade: o.prioridade,
    status: o.status,
    titulo: o.titulo,
    confirmacoes: o.confirmacoes,
  };
}
