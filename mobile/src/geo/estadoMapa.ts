/**
 * Dados do mapa "ao vivo": uma falha de rede NÃO apaga o que já está na tela;
 * só registra o erro, que aparece numa faixa até a próxima atualização dar certo.
 */
export interface EstadoDadosMapa<T> {
  dados: T | null;
  /** Momento (ms) da última atualização bem-sucedida. */
  atualizadoEm: number | null;
  erro: string | null;
  /** Modo + filtros do pedido que gerou estes dados (ex.: "exemplo|BURACO||"). */
  chave: string | null;
}

export type ResultadoAtualizacao<T> =
  | { ok: true; dados: T; agora: number; chave: string }
  | { ok: false; erro: string; chave: string };

/**
 * Aplica a resposta de uma atualização. A resposta de um pedido antigo (outro modo ou
 * outros filtros) é descartada: dados reais e fictícios nunca se misturam na tela.
 */
export function aplicarResultadoMapa<T>(
  anterior: EstadoDadosMapa<T>,
  resultado: ResultadoAtualizacao<T>,
  chaveAtual: string,
): EstadoDadosMapa<T> {
  if (resultado.chave !== chaveAtual) return anterior;
  if (resultado.ok) return { dados: resultado.dados, atualizadoEm: resultado.agora, erro: null, chave: resultado.chave };
  return { ...anterior, erro: resultado.erro };
}

/**
 * Texto da faixa de erro. Com dados antigos, avisa que são os últimos; sem nenhum dado,
 * deixa claro que o mapa vazio é falha de carga, não "nada registrado".
 */
export function avisoFalhaMapa(estado: EstadoDadosMapa<unknown>): string | null {
  if (estado.erro === null) return null;
  return estado.dados === null
    ? 'Não foi possível carregar os dados do mapa. Tentando de novo automaticamente.'
    : 'Sem conexão com o servidor. Mostrando os últimos dados.';
}

/** "Atualizado há 15 s" / "há 3 min" — o mapa diz a verdade sobre o quão recente é o dado. */
export function textoAtualizadoHa(atualizadoEm: number | null, agora: number): string {
  if (atualizadoEm === null) return 'Atualizando…';
  const segundos = Math.max(0, Math.round((agora - atualizadoEm) / 1000));
  if (segundos < 5) return 'Atualizado agora';
  if (segundos < 60) return `Atualizado há ${segundos} s`;
  return `Atualizado há ${Math.round(segundos / 60)} min`;
}
