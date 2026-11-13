import type { Identificacao, Participacao } from '../models/identificacao';
import { parseIdentificacao, parseParticipacao } from '../validation/respostas';
import { requisitarJson } from './http';

/** POST /identificacoes — o servidor gera o UUID. */
export function criarIdentificacao(apelido: string): Promise<Identificacao> {
  return requisitarJson('/identificacoes', parseIdentificacao, { metodo: 'POST', corpo: { apelido } });
}

/**
 * GET /identificacoes/atual — confirma se a identificação salva ainda existe.
 * O UUID vai no cabeçalho, nunca na URL (que aparece em logs de acesso).
 */
export function obterIdentificacao(id: string): Promise<Identificacao> {
  return requisitarJson('/identificacoes/atual', parseIdentificacao, { cabecalhos: { 'X-Identificacao-Id': id } });
}

/** PATCH /identificacoes/atual — troca o apelido da própria identificação (UUID no cabeçalho). */
export function trocarApelido(identificacaoId: string, apelido: string): Promise<Identificacao> {
  return requisitarJson('/identificacoes/atual', parseIdentificacao, {
    metodo: 'PATCH',
    corpo: { apelido },
    cabecalhos: { 'X-Identificacao-Id': identificacaoId },
  });
}

/** GET /identificacoes/atual/participacao — números do Perfil. */
export function obterParticipacao(identificacaoId: string): Promise<Participacao> {
  return requisitarJson('/identificacoes/atual/participacao', parseParticipacao, {
    cabecalhos: { 'X-Identificacao-Id': identificacaoId },
  });
}
