/**
 * Texto para o menu nativo de compartilhar. Sem coordenadas exatas e sem link
 * (o Bridge não tem página pública); deixa claro que é um projeto acadêmico.
 */
import { ROTULO_CATEGORIA, ROTULO_STATUS, type OcorrenciaDetalhe } from '../models/ocorrencia.ts';

const MAX_TEXTO = 500;
const MAX_TITULO = 140;
const MAX_LOCAL = 140;

function cortar(texto: string, limite: number): string {
  return texto.length > limite ? `${texto.slice(0, limite - 1)}…` : texto;
}

export function textoCompartilhamento(o: OcorrenciaDetalhe): string {
  const local = o.endereco ?? (o.subprefeitura ? `Subprefeitura ${o.subprefeitura.nome}` : 'São Paulo');
  const relatos =
    o.confirmacoes === 0 ? null : o.confirmacoes === 1 ? '1 outra pessoa também relatou.' : `${o.confirmacoes} outras pessoas também relataram.`;
  const linhas = [
    cortar(o.titulo, MAX_TITULO),
    `${ROTULO_CATEGORIA[o.categoria]} · ${ROTULO_STATUS[o.status]}`,
    `Local: ${cortar(local, MAX_LOCAL)}`,
    relatos,
    'Registrado no Bridge (projeto acadêmico).',
  ].filter((linha): linha is string => linha !== null);
  return cortar(linhas.join('\n'), MAX_TEXTO);
}
