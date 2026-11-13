/**
 * Ajustes do Perfil guardados só no aparelho: "Texto maior" e "Avisos de atualização no app".
 * Leitura tolerante: o que vier corrompido ou de versão antiga vira o padrão (nunca quebra o app).
 */

export interface Preferencias {
  textoMaior: boolean;
  avisosNoApp: boolean;
}

export const PREFERENCIAS_PADRAO: Readonly<Preferencias> = { textoMaior: false, avisosNoApp: true };

/** O "Texto maior" do app soma-se ao tamanho de texto do sistema (iOS) e escala 20%. */
export const ESCALA_TEXTO_MAIOR = 1.2;

export function parsePreferencias(valor: unknown): Preferencias {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return { ...PREFERENCIAS_PADRAO };
  const o = valor as Record<string, unknown>;
  return {
    textoMaior: typeof o.textoMaior === 'boolean' ? o.textoMaior : PREFERENCIAS_PADRAO.textoMaior,
    avisosNoApp: typeof o.avisosNoApp === 'boolean' ? o.avisosNoApp : PREFERENCIAS_PADRAO.avisosNoApp,
  };
}

/** Escala o tamanho da fonte e, quando existe, a altura da linha (senão o texto maior fica cortado). */
export function escalarEstiloTexto(
  estilo: { fontSize?: number; lineHeight?: number },
  escala: number,
): { fontSize?: number; lineHeight?: number } {
  const resultado: { fontSize?: number; lineHeight?: number } = {};
  if (estilo.fontSize !== undefined) resultado.fontSize = Math.round(estilo.fontSize * escala);
  if (estilo.lineHeight !== undefined) resultado.lineHeight = Math.round(estilo.lineHeight * escala);
  return resultado;
}
