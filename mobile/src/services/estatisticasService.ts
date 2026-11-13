import type { EstatisticaRegiao } from '../models/ocorrencia';
import { parseEstatisticasRegioes } from '../validation/respostas';
import { requisitarJson } from './http';

/** Ocorrências reais por subprefeitura (densidade do mapa e folha da região). */
export function estatisticasPorRegiao(): Promise<EstatisticaRegiao[]> {
  return requisitarJson('/estatisticas/regioes?origem=APP', parseEstatisticasRegioes);
}
