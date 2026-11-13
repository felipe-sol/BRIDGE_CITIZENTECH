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

/** Quantas das ocorrências acompanhadas mudaram depois da última vez que a pessoa as abriu. */
export function contarAtualizadas(
  itens: readonly { id: number; atualizadoEm: string }[],
  vistos: Readonly<Record<string, string>>,
): number {
  return itens.filter((o) => estaAtualizada(o.atualizadoEm, vistos[String(o.id)])).length;
}

/** Aviso dentro do app (Início e Andamento); não há notificação push. */
export function textoAvisoAtualizadas(n: number): string | null {
  if (n <= 0) return null;
  return n === 1
    ? '1 ocorrência que você acompanha foi atualizada'
    : `${n} ocorrências que você acompanha foram atualizadas`;
}
