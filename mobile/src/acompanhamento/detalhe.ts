/**
 * Regras puras da tela de detalhe: o aviso "ainda não foi resolvido" e a atualização que
 * nunca apaga a ocorrência já carregada.
 */
import type { OcorrenciaDetalhe } from '../models/ocorrencia.ts';

export type EstadoDetalhe =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; titulo: string; mensagem: string; podeTentar: boolean }
  | { tipo: 'pronto'; ocorrencia: OcorrenciaDetalhe; aviso: string | null };

/** Só em ocorrência RESOLVIDA e real (o aviso não reabre: a equipe vê quantos discordam). */
export function podeAvisarNaoResolvido(o: OcorrenciaDetalhe): boolean {
  return o.status === 'RESOLVIDA' && o.origem === 'APP';
}

export function textoAvisosNaoResolvido(n: number): string | null {
  if (n <= 0) return null;
  return n === 1 ? '1 pessoa avisou que ainda não foi resolvido' : `${n} pessoas avisaram que ainda não foi resolvido`;
}

/**
 * Aplica o resultado de uma nova busca. Com a ocorrência já na tela, uma falha (puxar para
 * atualizar, recarregar depois de uma ação) só vira aviso; a tela de erro é para a 1ª carga.
 */
export function aplicarAtualizacaoDetalhe(anterior: EstadoDetalhe, proximo: EstadoDetalhe): EstadoDetalhe {
  if (proximo.tipo === 'erro' && anterior.tipo === 'pronto') return { ...anterior, aviso: proximo.mensagem };
  return proximo;
}
