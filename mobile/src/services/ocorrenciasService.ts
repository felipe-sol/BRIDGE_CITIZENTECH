import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';

import type { Caixa, Coordenada } from '../geo/tipos';
import type {
  Categoria,
  NovaOcorrencia,
  Ocorrencia,
  OcorrenciaDetalhe,
  OcorrenciaProxima,
  PaginaOcorrencias,
  Prioridade,
  ResultadoConfirmacao,
  StatusOcorrencia,
} from '../models/ocorrencia';
import {
  parseConfirmacao,
  parseOcorrencia,
  parseOcorrenciaDetalhe,
  parsePaginaOcorrencias,
  parseProximas,
} from '../validation/respostas';
import { baseUrlApi, comTempoLimite, interpretarResposta, requisitarJson } from './http';

export const TAMANHO_PAGINA = 20;
const TEMPO_LIMITE_UPLOAD_MS = 60_000;

/** GET /ocorrencias — mais recentes primeiro (ordem estável definida pela API). */
export function listarOcorrencias(pagina: number): Promise<PaginaOcorrencias> {
  const consulta = new URLSearchParams({ pagina: String(pagina), tamanho: String(TAMANHO_PAGINA), ordenar: 'recentes' });
  return requisitarJson(`/ocorrencias?${consulta.toString()}`, parsePaginaOcorrencias);
}

/**
 * GET /ocorrencias/{id}. Com a identificação, a API diz se esta pessoa registrou
 * ou confirmou a ocorrência (minhaRelacao), sem nunca expor quem é o autor.
 */
export function obterOcorrencia(id: number, identificacaoId?: string): Promise<OcorrenciaDetalhe> {
  const cabecalhos: Record<string, string> = identificacaoId ? { 'X-Identificacao-Id': identificacaoId } : {};
  return requisitarJson(`/ocorrencias/${id}`, parseOcorrenciaDetalhe, { cabecalhos });
}

export interface FiltrosMapa {
  categoria?: Categoria;
  prioridade?: Prioridade;
  status?: StatusOcorrencia;
}

/** Ocorrências reais dentro da área visível do mapa (as mais graves primeiro, até 100). */
export function listarPontosMapa(caixa: Caixa, filtros: FiltrosMapa = {}): Promise<PaginaOcorrencias> {
  const consulta = new URLSearchParams({
    bbox: [caixa.minLon, caixa.minLat, caixa.maxLon, caixa.maxLat].join(','),
    tamanho: '100',
    ordenar: 'prioridade',
  });
  if (filtros.categoria) consulta.set('categoria', filtros.categoria);
  if (filtros.prioridade) consulta.set('prioridade', filtros.prioridade);
  if (filtros.status) consulta.set('status', filtros.status);
  return requisitarJson(`/ocorrencias?${consulta.toString()}`, parsePaginaOcorrencias);
}

/** Busca por texto no título, na descrição e no endereço (2 a 60 caracteres). */
export function buscarOcorrencias(q: string): Promise<PaginaOcorrencias> {
  const consulta = new URLSearchParams({ q: q.trim().slice(0, 60), tamanho: '20', ordenar: 'recentes' });
  return requisitarJson(`/ocorrencias?${consulta.toString()}`, parsePaginaOcorrencias);
}

/** Ocorrências reais e abertas da mesma categoria perto do ponto (evita duplicatas). */
export function listarProximas(ponto: Coordenada, categoria: Categoria, raioM = 100): Promise<OcorrenciaProxima[]> {
  const consulta = new URLSearchParams({
    latitude: String(ponto.latitude),
    longitude: String(ponto.longitude),
    raio_m: String(raioM),
    categoria,
  });
  return requisitarJson(`/ocorrencias/proximas?${consulta.toString()}`, parseProximas);
}

/** "Eu também vi": soma o relato desta pessoa à ocorrência (idempotente). */
export function confirmarOcorrencia(id: number, identificacaoId: string): Promise<ResultadoConfirmacao> {
  return requisitarJson(`/ocorrencias/${id}/confirmacoes`, parseConfirmacao, {
    metodo: 'POST',
    cabecalhos: { 'X-Identificacao-Id': identificacaoId },
  });
}

export function desfazerConfirmacao(id: number, identificacaoId: string): Promise<ResultadoConfirmacao> {
  return requisitarJson(`/ocorrencias/${id}/confirmacoes`, parseConfirmacao, {
    metodo: 'DELETE',
    cabecalhos: { 'X-Identificacao-Id': identificacaoId },
  });
}

/**
 * O que a pessoa registrou ou confirmou, da atualização mais recente para a mais antiga.
 * O UUID vai no cabeçalho, nunca na URL (URLs aparecem em logs de acesso).
 */
export function listarMinhas(
  identificacaoId: string,
  relacao: 'registradas' | 'confirmadas',
  pagina: number,
): Promise<PaginaOcorrencias> {
  const consulta = new URLSearchParams({ relacao, pagina: String(pagina), tamanho: String(TAMANHO_PAGINA) });
  return requisitarJson(`/ocorrencias/minhas?${consulta.toString()}`, parsePaginaOcorrencias, {
    cabecalhos: { 'X-Identificacao-Id': identificacaoId },
  });
}

/**
 * POST /ocorrencias. A `chaveEnvio` (Idempotency-Key) é a mesma em todas as
 * tentativas de um mesmo formulário: se a resposta se perder e o usuário
 * reenviar, a API devolve a ocorrência já criada em vez de duplicar.
 */
export function criarOcorrencia(dados: NovaOcorrencia, chaveEnvio: string): Promise<Ocorrencia> {
  return requisitarJson('/ocorrencias', parseOcorrencia, {
    metodo: 'POST',
    cabecalhos: { 'Idempotency-Key': chaveEnvio },
    corpo: {
      identificacao_id: dados.identificacaoId,
      titulo: dados.titulo,
      descricao: dados.descricao,
      categoria: dados.categoria,
      latitude: dados.latitude,
      longitude: dados.longitude,
      risco_imediato: dados.riscoImediato,
      bloqueia_passagem: dados.bloqueiaPassagem,
      afeta_acessibilidade: dados.afetaAcessibilidade,
      endereco: dados.endereco,
    },
  });
}

/**
 * POST /ocorrencias/{id}/imagem (multipart, campo "arquivo").
 * Envia o ARQUIVO da foto (não apenas a URI local do celular).
 */
export function enviarFoto(ocorrenciaId: number, identificacaoId: string, uriFoto: string): Promise<Ocorrencia> {
  const url = `${baseUrlApi()}/ocorrencias/${ocorrenciaId}/imagem`;
  return comTempoLimite(async (sinal) => {
    const arquivo = new File(uriFoto);
    const formulario = new FormData();
    formulario.append('arquivo', arquivo);
    const resposta = await expoFetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'X-Identificacao-Id': identificacaoId },
      body: formulario,
      signal: sinal,
    });
    const texto = await resposta.text();
    return interpretarResposta(resposta.status, texto, parseOcorrencia);
  }, TEMPO_LIMITE_UPLOAD_MS);
}
