/**
 * Identificação do cidadão: um apelido + UUID gerado pelo servidor e guardado
 * no aparelho. NÃO é login nem autenticação.
 */
export interface Identificacao {
  id: string;
  apelido: string;
  criadoEm: string;
}
