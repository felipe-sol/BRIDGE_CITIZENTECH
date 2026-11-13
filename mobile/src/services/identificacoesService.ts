import type { Identificacao } from '../models/identificacao';
import { parseIdentificacao } from '../validation/respostas';
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
