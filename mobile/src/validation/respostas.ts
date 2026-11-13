/**
 * Validação na fronteira com a API: converte `unknown` (JSON recebido) nos
 * modelos tipados do app, ou lança ErroFormato se o formato não bater com o
 * contrato (docs/CONTRATO_API.md).
 */
import type { CorpoErroApi, DetalheErroApi } from '../models/api.ts';
import type { OcorrenciaMapa, PontosMapa } from '../geo/tipos.ts';
import type { Identificacao } from '../models/identificacao.ts';
import {
  CATEGORIAS,
  NIVEIS_ALERTA,
  ORIGENS,
  PRIORIDADES,
  STATUS_ANALISE_IA,
  STATUS_OCORRENCIA,
  type AlertaRegiao,
  type AnaliseIA,
  type EstatisticaRegiao,
  type Ocorrencia,
  type OcorrenciaDetalhe,
  type OcorrenciaProxima,
  type PaginaOcorrencias,
  type RegistroHistorico,
  type RelacaoOcorrencia,
  type ResultadoConfirmacao,
  type ResumoEstatisticas,
  type Subprefeitura,
} from '../models/ocorrencia.ts';
import {
  booleano,
  ehObjeto,
  inteiro,
  lista,
  numero,
  numeroOuNulo,
  objeto,
  texto,
  textoOuNulo,
  umDe,
  umDeOuNulo,
} from './guardas.ts';

export function parseIdentificacao(valor: unknown): Identificacao {
  const o = objeto(valor, 'Identificação');
  return { id: texto(o, 'id'), apelido: texto(o, 'apelido'), criadoEm: texto(o, 'criado_em') };
}

function parseAnaliseIa(valor: unknown): AnaliseIA {
  const o = objeto(valor, 'Análise de IA');
  return {
    status: umDe(o, 'status', STATUS_ANALISE_IA),
    categoriaSugerida: textoOuNulo(o, 'categoria_sugerida'),
    confianca: numeroOuNulo(o, 'confianca'),
    versaoModelo: textoOuNulo(o, 'versao_modelo'),
    analisadaEm: textoOuNulo(o, 'analisada_em'),
  };
}

function parseSubprefeitura(valor: unknown): Subprefeitura | null {
  if (valor === null) return null;
  const o = objeto(valor, 'Subprefeitura');
  return { codigo: texto(o, 'codigo'), nome: texto(o, 'nome') };
}

export function parseOcorrencia(valor: unknown): Ocorrencia {
  const o = objeto(valor, 'Ocorrência');
  return {
    id: inteiro(o, 'id'),
    titulo: texto(o, 'titulo'),
    descricao: texto(o, 'descricao'),
    categoria: umDe(o, 'categoria', CATEGORIAS),
    latitude: numero(o, 'latitude'),
    longitude: numero(o, 'longitude'),
    endereco: textoOuNulo(o, 'endereco'),
    subprefeitura: parseSubprefeitura(o['subprefeitura']),
    confirmacoes: inteiro(o, 'confirmacoes'),
    origem: umDe(o, 'origem', ORIGENS),
    riscoImediato: booleano(o, 'risco_imediato'),
    bloqueiaPassagem: booleano(o, 'bloqueia_passagem'),
    afetaAcessibilidade: booleano(o, 'afeta_acessibilidade'),
    status: umDe(o, 'status', STATUS_OCORRENCIA),
    prioridade: umDe(o, 'prioridade', PRIORIDADES),
    prioridadePontuacao: inteiro(o, 'prioridade_pontuacao'),
    prioridadeJustificativa: texto(o, 'prioridade_justificativa'),
    imagemUrl: textoOuNulo(o, 'imagem_url'),
    analiseIa: parseAnaliseIa(o['analise_ia']),
    criadoEm: texto(o, 'criado_em'),
    atualizadoEm: texto(o, 'atualizado_em'),
  };
}

function parseRegistroHistorico(valor: unknown): RegistroHistorico {
  const o = objeto(valor, 'Histórico de status');
  return {
    statusAnterior: umDeOuNulo(o, 'status_anterior', STATUS_OCORRENCIA),
    statusNovo: umDe(o, 'status_novo', STATUS_OCORRENCIA),
    observacao: textoOuNulo(o, 'observacao'),
    alteradoEm: texto(o, 'alterado_em'),
  };
}

function parseRelacao(valor: unknown): RelacaoOcorrencia | null {
  if (valor === null || valor === undefined) return null;
  const o = objeto(valor, 'Relação com a ocorrência');
  return { registrei: booleano(o, 'registrei'), confirmei: booleano(o, 'confirmei') };
}

export function parseOcorrenciaDetalhe(valor: unknown): OcorrenciaDetalhe {
  const base = parseOcorrencia(valor);
  const o = objeto(valor, 'Ocorrência');
  return {
    ...base,
    historico: lista(o, 'historico_status', parseRegistroHistorico),
    minhaRelacao: parseRelacao(o['minha_relacao']),
  };
}

function parseOcorrenciaProxima(valor: unknown): OcorrenciaProxima {
  const o = objeto(valor, 'Ocorrência próxima');
  return { ...parseOcorrencia(valor), distanciaM: inteiro(o, 'distancia_m') };
}

/** GET /ocorrencias/proximas → itens com a distância em metros. */
export function parseProximas(valor: unknown): OcorrenciaProxima[] {
  return lista(objeto(valor, 'Ocorrências próximas'), 'itens', parseOcorrenciaProxima);
}

/** POST/DELETE /ocorrencias/{id}/confirmacoes */
export function parseConfirmacao(valor: unknown): ResultadoConfirmacao {
  const o = objeto(valor, 'Confirmação');
  return { ocorrenciaId: inteiro(o, 'ocorrencia_id'), confirmacoes: inteiro(o, 'confirmacoes'), confirmado: booleano(o, 'confirmado') };
}

function parseEstatisticaRegiao(valor: unknown): EstatisticaRegiao {
  const o = objeto(valor, 'Estatística da região');
  return {
    codigo: texto(o, 'codigo'),
    nome: texto(o, 'nome'),
    total: inteiro(o, 'total'),
    abertas: inteiro(o, 'abertas'),
    altaAbertas: inteiro(o, 'alta_abertas'),
    resolvidas: inteiro(o, 'resolvidas'),
    confirmacoes: inteiro(o, 'confirmacoes'),
    densidadeKm2: numero(o, 'densidade_km2'),
    alerta: parseAlerta(o.alerta),
  };
}

function parseAlerta(valor: unknown): AlertaRegiao {
  const o = objeto(valor, 'Alerta da região');
  return {
    nivel: umDe(o, 'nivel', NIVEIS_ALERTA),
    indice: inteiro(o, 'indice'),
    abertas30d: inteiro(o, 'abertas_30d'),
    abertasAlta30d: inteiro(o, 'abertas_alta_30d'),
  };
}

/** GET /estatisticas/resumo → indicadores e séries da aba Análises. */
export function parseResumo(valor: unknown): ResumoEstatisticas {
  const o = objeto(valor, 'Resumo');
  const dias = o.dias === null ? null : inteiro(o, 'dias');
  return {
    origem: umDe(o, 'origem', ORIGENS),
    dias,
    total: inteiro(o, 'total'),
    abertas: inteiro(o, 'abertas'),
    resolvidas: inteiro(o, 'resolvidas'),
    rejeitadas: inteiro(o, 'rejeitadas'),
    percentualResolvidas: numeroOuNulo(o, 'percentual_resolvidas'),
    tempoMedioResolucaoDias: numeroOuNulo(o, 'tempo_medio_resolucao_dias'),
    alertasAtivos: inteiro(o, 'alertas_ativos'),
    regioesEmAtencao: inteiro(o, 'regioes_em_atencao'),
    porCategoria: lista(o, 'por_categoria', (v) => {
      const c = objeto(v, 'Categoria do resumo');
      return { categoria: umDe(c, 'categoria', CATEGORIAS), total: inteiro(c, 'total') };
    }),
    semanal: lista(o, 'semanal', (v) => {
      const s = objeto(v, 'Semana do resumo');
      return { inicio: texto(s, 'inicio'), registradas: inteiro(s, 'registradas'), resolvidas: inteiro(s, 'resolvidas') };
    }),
    rankingRegioes: lista(o, 'ranking_regioes', (v) => {
      const r = objeto(v, 'Região do ranking');
      return { codigo: texto(r, 'codigo'), nome: texto(r, 'nome'), total: inteiro(r, 'total') };
    }),
  };
}

function parseOcorrenciaMapa(valor: unknown): OcorrenciaMapa {
  const o = objeto(valor, 'Ponto do mapa');
  return {
    id: inteiro(o, 'id'),
    latitude: numero(o, 'latitude'),
    longitude: numero(o, 'longitude'),
    categoria: umDe(o, 'categoria', CATEGORIAS),
    prioridade: umDe(o, 'prioridade', PRIORIDADES),
    status: umDe(o, 'status', STATUS_OCORRENCIA),
    titulo: texto(o, 'titulo'),
    endereco: textoOuNulo(o, 'endereco'),
    confirmacoes: inteiro(o, 'confirmacoes'),
  };
}

/** GET /ocorrencias/mapa → pontos da área visível, com o total e o aviso de corte. */
export function parsePontosMapa(valor: unknown): PontosMapa {
  const o = objeto(valor, 'Pontos do mapa');
  return { itens: lista(o, 'itens', parseOcorrenciaMapa), total: inteiro(o, 'total'), truncado: booleano(o, 'truncado') };
}

/** GET /estatisticas/regioes → uma linha por subprefeitura. */
export function parseEstatisticasRegioes(valor: unknown): EstatisticaRegiao[] {
  return lista(objeto(valor, 'Estatísticas por região'), 'itens', parseEstatisticaRegiao);
}

export function parsePaginaOcorrencias(valor: unknown): PaginaOcorrencias {
  const o = objeto(valor, 'Página de ocorrências');
  return {
    itens: lista(o, 'itens', parseOcorrencia),
    pagina: inteiro(o, 'pagina'),
    tamanho: inteiro(o, 'tamanho'),
    total: inteiro(o, 'total'),
    totalPaginas: inteiro(o, 'total_paginas'),
  };
}

/** Lê o corpo de erro padronizado. Devolve null se o formato não for o esperado. */
export function parseErroApi(valor: unknown): CorpoErroApi | null {
  if (!ehObjeto(valor) || !ehObjeto(valor['erro'])) return null;
  const erro = valor['erro'];
  const { codigo, mensagem, detalhes } = erro;
  if (typeof codigo !== 'string' || typeof mensagem !== 'string') return null;
  const lidos: DetalheErroApi[] = Array.isArray(detalhes)
    ? detalhes.flatMap((d: unknown) =>
        ehObjeto(d) && typeof d['campo'] === 'string' && typeof d['mensagem'] === 'string'
          ? [{ campo: d['campo'], mensagem: d['mensagem'] }]
          : [],
      )
    : [];
  return { codigo, mensagem, detalhes: lidos };
}
