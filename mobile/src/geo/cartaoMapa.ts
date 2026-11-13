/** Regras puras do cartão que abre ao tocar numa ocorrência no mapa. */
import { ROTULO_STATUS, type OcorrenciaDetalhe, type RegistroHistorico } from '../models/ocorrencia.ts';

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/** "agora há pouco", "há 5 min", "há 3 h", "há 2 dias", "há 4 semanas" ('' para data inválida). */
export function tempoDesde(iso: string, agora: number): string {
  const momento = Date.parse(iso);
  if (Number.isNaN(momento)) return '';
  const passado = Math.max(0, agora - momento);
  if (passado < MINUTO) return 'agora há pouco';
  if (passado < HORA) return `há ${Math.floor(passado / MINUTO)} min`;
  if (passado < DIA) return `há ${Math.floor(passado / HORA)} h`;
  const dias = Math.floor(passado / DIA);
  if (dias < 14) return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
  return `há ${Math.floor(dias / 7)} semanas`;
}

/** A atualização mais recente da equipe responsável (ignora o registro inicial); null se não houve. */
export function ultimaAtualizacaoEquipe(historico: readonly RegistroHistorico[]): { quando: string; texto: string } | null {
  const mudancas = historico.filter((h) => h.statusAnterior !== null);
  if (mudancas.length === 0) return null;
  const ultima = mudancas.reduce((a, b) => (Date.parse(b.alteradoEm) >= Date.parse(a.alteradoEm) ? b : a));
  return { quando: ultima.alteradoEm, texto: ultima.observacao ?? `Status: ${ROTULO_STATUS[ultima.statusNovo]}` };
}

/** "Eu também vi" direto do mapa: só em ocorrência aberta, real e registrada por outra pessoa. */
export function podeConfirmarNoMapa(d: OcorrenciaDetalhe): boolean {
  const aberta = d.status === 'ABERTA' || d.status === 'EM_ANALISE' || d.status === 'EM_ANDAMENTO';
  return aberta && d.origem === 'APP' && d.minhaRelacao?.registrei !== true;
}
