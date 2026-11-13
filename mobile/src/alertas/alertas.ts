/**
 * Alerta Bridge: calculado automaticamente a partir dos relatos (nunca é alerta oficial).
 * Funções puras usadas no Início, na folha da região e no Mapa.
 */
import { distanciaMetros } from '../geo/distancia.ts';
import { localizarRegiao } from '../geo/regioes.ts';
import type { Coordenada, RegiaoSP } from '../geo/tipos.ts';
import type { AlertaRegiao, EstatisticaRegiao, NivelAlerta } from '../models/ocorrencia.ts';

export const AVISO_ALERTA_BRIDGE = 'Alerta Bridge: calculado automaticamente a partir dos relatos';

export const ROTULO_NIVEL: Readonly<Record<NivelAlerta, string>> = {
  NORMAL: 'Normal',
  ATENCAO: 'Atenção',
  ALERTA: 'Alerta',
};

/** "12 abertas nos últimos 30 dias, 4 de prioridade alta (índice 95)." */
export function textoMotivoAlerta(a: AlertaRegiao): string {
  const abertas = a.abertas30d === 1 ? '1 aberta' : `${a.abertas30d} abertas`;
  const altas = a.abertasAlta30d === 0 ? 'nenhuma' : String(a.abertasAlta30d);
  return `${abertas} nos últimos 30 dias, ${altas} de prioridade alta (índice ${a.indice}).`;
}

export interface AlertaInicio {
  regiao: RegiaoSP;
  alerta: AlertaRegiao;
  /** 0 = a região onde a pessoa está; null = sem localização. */
  distanciaM: number | null;
}

/**
 * O alerta que o Início mostra:
 * 1. a região da pessoa, se estiver em Atenção ou Alerta;
 * 2. senão, a região em ALERTA mais próxima (até o centro dela);
 * 3. sem localização, a região em ALERTA de maior índice;
 * 4. sem nenhuma região em ALERTA, null.
 */
export function alertaParaInicio(
  regioes: readonly RegiaoSP[],
  estatisticas: readonly EstatisticaRegiao[],
  ponto: Coordenada | null,
): AlertaInicio | null {
  const alertas = new Map(estatisticas.map((e) => [e.codigo, e.alerta]));
  if (ponto !== null) {
    const propria = localizarRegiao(ponto, regioes);
    const alertaProprio = propria ? alertas.get(propria.codigo) : undefined;
    if (propria && alertaProprio && alertaProprio.nivel !== 'NORMAL') {
      return { regiao: propria, alerta: alertaProprio, distanciaM: 0 };
    }
  }
  const emAlerta = regioes.flatMap((regiao) => {
    const alerta = alertas.get(regiao.codigo);
    return alerta?.nivel === 'ALERTA' ? [{ regiao, alerta }] : [];
  });
  if (emAlerta.length === 0) return null;
  if (ponto === null) {
    const maior = emAlerta.reduce((a, b) => (b.alerta.indice > a.alerta.indice ? b : a));
    return { ...maior, distanciaM: null };
  }
  const comDistancia = emAlerta.map((item) => ({ ...item, distanciaM: distanciaMetros(ponto, item.regiao.centro) }));
  return comDistancia.reduce((a, b) => (b.distanciaM < a.distanciaM ? b : a));
}
