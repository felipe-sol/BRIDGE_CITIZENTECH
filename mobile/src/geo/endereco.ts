/**
 * Endereço legível a partir das partes devolvidas pela geocodificação do aparelho.
 * Limite de 200 caracteres (o mesmo da API).
 */
export const ENDERECO_MAX = 200;

interface PartesEndereco {
  rua: string | null;
  numero: string | null;
  bairro: string | null;
}

function limpo(valor: string | null): string | null {
  const texto = valor?.replace(/\s+/g, ' ').trim();
  return texto ? texto : null;
}

/** "Rua dos Pinheiros, 870 — Pinheiros"; omite o que faltar; null se não houver nada. */
export function montarEndereco(partes: PartesEndereco): string | null {
  const rua = limpo(partes.rua);
  const numero = limpo(partes.numero);
  const bairro = limpo(partes.bairro);
  const principal = rua ? (numero ? `${rua}, ${numero}` : rua) : null;
  const texto = [principal, bairro].filter((parte): parte is string => parte !== null).join(' — ');
  if (!texto) return null;
  return texto.length > ENDERECO_MAX ? `${texto.slice(0, ENDERECO_MAX - 1)}…` : texto;
}
