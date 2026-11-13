/** Junta o que a pessoa registrou e confirmou, sem repetir, da atualização mais recente para a mais antiga. */
export function juntarAcompanhadas<T extends { id: number; atualizadoEm: string }>(
  registradas: readonly T[],
  confirmadas: readonly T[],
  limite: number,
): T[] {
  const porId = new Map<number, T>();
  for (const item of [...registradas, ...confirmadas]) if (!porId.has(item.id)) porId.set(item.id, item);
  return [...porId.values()]
    .sort((a, b) => Date.parse(b.atualizadoEm) - Date.parse(a.atualizadoEm) || b.id - a.id)
    .slice(0, limite);
}
