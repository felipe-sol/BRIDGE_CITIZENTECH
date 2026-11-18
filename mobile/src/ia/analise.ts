/**
 * Textos da análise de IA (detalhe da ocorrência e cartão do mapa).
 * Nunca inventa previsão: só fala de sugestão quando a análise foi concluída.
 */
import { ROTULO_CATEGORIA, ehCategoria, type AnaliseIA, type Categoria, type SugestaoIA } from '../models/ocorrencia.ts';
import { formatarPercentual } from '../utils/formatacao.ts';

/** Abaixo disso a sugestão é tratada como palpite ("incerta"). */
export const LIMIAR_INCERTA = 0.5;

export function sugestaoIncerta(confianca: number | null): boolean {
  return confianca !== null && confianca < LIMIAR_INCERTA;
}

function nomeCategoria(sugerida: string | null): string {
  if (sugerida === null) return 'sem categoria';
  return ehCategoria(sugerida) ? ROTULO_CATEGORIA[sugerida] : sugerida;
}

export function descreverAnaliseIA(analise: AnaliseIA): { titulo: string; texto: string } {
  switch (analise.status) {
    case 'INDISPONIVEL':
      return {
        titulo: 'Análise de IA indisponível',
        texto:
          'Não havia modelo de IA ativo no servidor quando esta ocorrência foi registrada. Ela segue normalmente para a equipe responsável.',
      };
    case 'PENDENTE':
      return { titulo: 'Análise de IA pendente', texto: 'A análise automática ainda não foi feita para esta ocorrência.' };
    case 'FALHOU':
      return {
        titulo: 'Análise de IA indisponível',
        texto: 'O modelo de IA não conseguiu processar esta ocorrência. Os dados registrados não foram afetados.',
      };
    case 'CONCLUIDA': {
      const incerta = sugestaoIncerta(analise.confianca);
      const partes = [`Categoria sugerida: ${nomeCategoria(analise.categoriaSugerida)}.`];
      if (analise.confianca !== null) partes.push(`Confiança informada pelo modelo: ${formatarPercentual(analise.confianca)}.`);
      if (incerta) partes.push('Confiança baixa: é só um palpite.');
      if (analise.versaoModelo) partes.push(`Modelo ${analise.versaoModelo}.`);
      return { titulo: incerta ? 'Sugestão da IA (incerta)' : 'Sugestão da IA', texto: partes.join(' ') };
    }
  }
}

/** Uma linha para o cartão do mapa, ou null quando não há sugestão. */
export function resumoSugestaoIA(analise: AnaliseIA): string | null {
  if (analise.status !== 'CONCLUIDA' || analise.categoriaSugerida === null) return null;
  const rotulo = sugestaoIncerta(analise.confianca) ? 'Sugestão da IA (incerta)' : 'Sugestão da IA';
  const confianca = analise.confianca !== null ? ` (${formatarPercentual(analise.confianca)})` : '';
  return `${rotulo}: ${nomeCategoria(analise.categoriaSugerida)}${confianca}`;
}

/** O que mostrar na revisão do registro, comparando a categoria escolhida com a sugestão da IA. */
export type DecisaoSugestao =
  | { tipo: 'nada' }
  | { tipo: 'concorda' | 'sugere' | 'incerta'; categoria: Categoria; confianca: number | null };

export function decidirSugestaoRegistro(escolhida: Categoria, sugestao: SugestaoIA): DecisaoSugestao {
  const sugerida = sugestao.categoriaSugerida;
  if (!sugestao.disponivel || sugerida === null || !ehCategoria(sugerida)) return { tipo: 'nada' };
  const base = { categoria: sugerida, confianca: sugestao.confianca };
  if (sugerida === escolhida) return { tipo: 'concorda', ...base };
  return { tipo: sugestaoIncerta(sugestao.confianca) ? 'incerta' : 'sugere', ...base };
}

export function textoSugestaoRegistro(decisao: DecisaoSugestao): { titulo: string; texto: string } | null {
  if (decisao.tipo === 'nada') return null;
  const nome = ROTULO_CATEGORIA[decisao.categoria];
  const pct = decisao.confianca !== null ? ` (${formatarPercentual(decisao.confianca)})` : '';
  switch (decisao.tipo) {
    case 'concorda':
      return { titulo: 'A IA concorda', texto: `Pelo que você escreveu, a IA também acha que é ${nome}${pct}.` };
    case 'sugere':
      return {
        titulo: 'A IA sugere outra categoria',
        texto: `Pelo que você escreveu, a IA acha que é ${nome}${pct}. Você pode trocar ou manter a sua escolha.`,
      };
    case 'incerta':
      return {
        titulo: 'Palpite da IA',
        texto: `A IA acha que pode ser ${nome}, mas com pouca confiança${pct}. Mantenha a sua escolha se tiver certeza.`,
      };
  }
}
