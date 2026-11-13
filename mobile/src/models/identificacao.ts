/**
 * Identificação do cidadão: um apelido + UUID gerado pelo servidor e guardado
 * no aparelho. NÃO é login nem autenticação.
 */
export interface Identificacao {
  id: string;
  apelido: string;
  criadoEm: string;
}

/** O que a pessoa já fez no Bridge (só registros reais). */
export interface Participacao {
  registradas: number;
  confirmadas: number;
  /** Registradas ou confirmadas pela pessoa que estão resolvidas. */
  resolvidasAcompanhadas: number;
  avisosNaoResolvido: number;
}
