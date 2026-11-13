/**
 * Evita disparar a MESMA consulta duas vezes seguidas (ex.: ao abrir uma aba, o efeito de
 * montagem e a atualização ao ganhar foco). Uma consulta diferente (outra chave) nunca espera.
 */
export interface UltimaExecucao {
  chave: string;
  em: number;
}

export function deveExecutar(ultima: UltimaExecucao | null, chave: string, agora: number, minimoMs = 1000): boolean {
  return ultima === null || ultima.chave !== chave || agora - ultima.em >= minimoMs;
}
