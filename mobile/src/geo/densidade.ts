/**
 * Faixas fixas de densidade (ocorrências por km² no período), documentadas em
 * docs/REGRAS_DE_NEGOCIO.md: 0 nenhuma · 1 até 0,5 · 2 até 2 · 3 até 5 · 4 acima de 5.
 */
export type ClasseDensidade = 0 | 1 | 2 | 3 | 4;

export const LIMITES_DENSIDADE = [0, 0.5, 2, 5] as const;

export function classeDensidade(porKm2: number): ClasseDensidade {
  if (!(porKm2 > LIMITES_DENSIDADE[0])) return 0;
  if (porKm2 <= LIMITES_DENSIDADE[1]) return 1;
  if (porKm2 <= LIMITES_DENSIDADE[2]) return 2;
  if (porKm2 <= LIMITES_DENSIDADE[3]) return 3;
  return 4;
}

/** Preenchimento de cada faixa no mapa (tons da sinalização, com transparência para ver as ruas). */
export const CORES_DENSIDADE: Readonly<Record<ClasseDensidade, string>> = {
  0: 'rgba(11, 79, 138, 0.06)',
  1: 'rgba(11, 79, 138, 0.24)',
  2: 'rgba(242, 183, 5, 0.42)',
  3: 'rgba(179, 38, 30, 0.42)',
  4: 'rgba(179, 38, 30, 0.72)',
};

/** Sem estatística (ainda carregando ou sem conexão): só o contorno, nunca a cor de "Nenhuma". */
export const COR_SEM_DADOS = 'rgba(0, 0, 0, 0)';

export function corDaRegiao(porKm2: number | undefined): string {
  return porKm2 === undefined ? COR_SEM_DADOS : CORES_DENSIDADE[classeDensidade(porKm2)];
}

export const ROTULOS_DENSIDADE: Readonly<Record<ClasseDensidade, string>> = {
  0: 'Nenhuma',
  1: 'Até 0,5 por km²',
  2: 'Até 2 por km²',
  3: 'Até 5 por km²',
  4: 'Mais de 5 por km²',
};
