/** Formata data ISO 8601 no horário local do aparelho: "11/11/2026 15:31". */
export function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return 'data desconhecida';
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${dois(data.getDate())}/${dois(data.getMonth() + 1)}/${data.getFullYear()} ${dois(data.getHours())}:${dois(data.getMinutes())}`;
}

export function formatarPercentual(fracao: number): string {
  return `${Math.round(fracao * 100)}%`;
}

/** Número com vírgula decimal e no máximo `casas` casas, sem zeros à direita: 0.0764 → "0,08". */
export function formatarDecimal(valor: number, casas: number): string {
  return String(Number(valor.toFixed(casas))).replace('.', ',');
}

/** Iniciais do apelido para o avatar: primeira letra da primeira e da última palavra ("Morador do Bloco B" → "MB"). */
export function iniciais(apelido: string): string {
  const palavras = apelido.trim().split(/\s+/).filter((p) => /^\p{L}/u.test(p));
  const primeira = palavras[0];
  const ultima = palavras[palavras.length - 1];
  if (primeira === undefined || ultima === undefined) return '?';
  const letras = palavras.length === 1 ? primeira.charAt(0) : primeira.charAt(0) + ultima.charAt(0);
  return letras.toLocaleUpperCase('pt-BR');
}
