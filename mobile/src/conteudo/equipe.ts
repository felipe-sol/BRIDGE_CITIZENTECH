/**
 * Integrantes vêm do `authors` do package.json (uma fonte só). Enquanto algum nome tiver o
 * marcador PREENCHER (ou o formato for inesperado), nenhum nome é exibido: nada inventado.
 */
export type Equipe = { nomes: string[] } | { pendente: true };

export function textoEquipe(authors: unknown): Equipe {
  if (!Array.isArray(authors) || authors.length === 0) return { pendente: true };
  const nomes: string[] = [];
  for (const autor of authors) {
    if (typeof autor !== 'object' || autor === null || !('name' in autor)) return { pendente: true };
    const nome = autor.name;
    if (typeof nome !== 'string' || nome.trim() === '' || nome.includes('PREENCHER')) return { pendente: true };
    nomes.push(nome.trim());
  }
  return { nomes };
}
