import type { EstatisticaRegiao, Origem, ResumoEstatisticas } from '../models/ocorrencia';
import { parseEstatisticasRegioes, parseResumo } from '../validation/respostas';
import { requisitarJson } from './http';

/** Números por subprefeitura (densidade, folha da região e Alerta Bridge). APP = reais; SIMULADA = Exemplo. */
export function estatisticasPorRegiao(origem: Origem = 'APP'): Promise<EstatisticaRegiao[]> {
  return requisitarJson(`/estatisticas/regioes?origem=${origem}`, parseEstatisticasRegioes);
}

/** Indicadores da aba Análises: tudo daquela origem (sem recorte de dias). */
export function resumoEstatisticas(origem: Origem): Promise<ResumoEstatisticas> {
  return requisitarJson(`/estatisticas/resumo?origem=${origem}`, parseResumo);
}
