/**
 * Rotas do app (Expo Router, pasta src/app) e validação dos parâmetros.
 * Parâmetros de rota chegam como texto (ou lista de textos), então são
 * validados antes do uso.
 *
 * Estrutura: abas em src/app/(tabs) (Início, Mapa, Andamento, Perfil);
 * telas por cima das abas: registrar (modal), ocorrencias/[id] e regiao/[codigo] (folha).
 */

export const ROTAS = {
  inicio: '/',
  mapa: '/mapa',
  andamento: '/andamento',
  perfil: '/perfil',
  registrar: '/registrar',
  identificacao: '/identificacao',
} as const;

/** Parâmetros aceitos pela rota /ocorrencias/[id]. */
export type ParametrosDetalhe = {
  id: string;
  /** "1" quando a tela é aberta logo após o cadastro. */
  criada?: string;
};

export function rotaDetalhe(id: number, criada = false) {
  return {
    pathname: '/ocorrencias/[id]',
    params: criada ? { id: String(id), criada: '1' } : { id: String(id) },
  } as const;
}

/** Folha com o resumo de uma subprefeitura (código GeoSampa de dois dígitos). */
export function rotaRegiao(codigo: string) {
  return { pathname: '/regiao/[codigo]', params: { codigo } } as const;
}

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/** Converte o parâmetro [id] em inteiro positivo; null se inválido. */
export function interpretarIdRota(valor: string | string[] | undefined): number | null {
  const bruto = primeiro(valor);
  if (bruto === undefined || !/^\d{1,9}$/.test(bruto)) return null;
  const id = Number(bruto);
  return id > 0 ? id : null;
}

/** Aceita só o código de subprefeitura com dois dígitos; null se inválido. */
export function interpretarCodigoRegiao(valor: string | string[] | undefined): string | null {
  const bruto = primeiro(valor);
  return bruto !== undefined && /^\d{2}$/.test(bruto) ? bruto : null;
}
