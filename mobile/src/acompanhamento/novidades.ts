/**
 * Selo "Atualizada": a ocorrência mudou depois da última vez que a pessoa a abriu.
 * A data da última visita fica só no aparelho (src/services/vistos.ts).
 */
export function estaAtualizada(atualizadoEm: string, vistoEm: string | undefined): boolean {
  if (vistoEm === undefined) return false; // sem referência, não incomoda com selo
  const atualizado = Date.parse(atualizadoEm);
  const visto = Date.parse(vistoEm);
  if (Number.isNaN(atualizado) || Number.isNaN(visto)) return false;
  return atualizado > visto;
}
