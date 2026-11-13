import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ErroFormato } from './guardas.ts';
import {
  parseConfirmacao,
  parseErroApi,
  parseEstatisticasRegioes,
  parseIdentificacao,
  parsePontosMapa,
  parseResumo,
  parseOcorrencia,
  parseOcorrenciaDetalhe,
  parsePaginaOcorrencias,
  parseProximas,
} from './respostas.ts';

// Exemplo no formato do contrato (docs/CONTRATO_API.md). Dados fictícios.
const OCORRENCIA_API = {
  id: 12,
  titulo: 'Calçada quebrada',
  descricao: 'Placas soltas na calçada.',
  categoria: 'CALCADA_DANIFICADA',
  latitude: -23.564224,
  longitude: -46.652857,
  endereco: null,
  subprefeitura: { codigo: '09', nome: 'Sé' },
  confirmacoes: 2,
  origem: 'APP',
  risco_imediato: true,
  bloqueia_passagem: false,
  afeta_acessibilidade: true,
  status: 'ABERTA',
  prioridade: 'ALTA',
  prioridade_pontuacao: 7,
  prioridade_justificativa: 'Total 7/10 → ALTA.',
  imagem_url: null,
  analise_ia: { status: 'INDISPONIVEL', categoria_sugerida: null, confianca: null, versao_modelo: null, analisada_em: null },
  criado_em: '2026-11-11T18:31:00Z',
  atualizado_em: '2026-11-11T18:31:00Z',
};

describe('parsers de resposta da API', () => {
  it('converte página e detalhe para camelCase', () => {
    const pagina = parsePaginaOcorrencias({ itens: [OCORRENCIA_API], pagina: 1, tamanho: 20, total: 1, total_paginas: 1 });
    assert.equal(pagina.itens[0]?.prioridadePontuacao, 7);
    assert.equal(pagina.itens[0]?.analiseIa.status, 'INDISPONIVEL');

    const detalhe = parseOcorrenciaDetalhe({
      ...OCORRENCIA_API,
      historico_status: [{ status_anterior: null, status_novo: 'ABERTA', observacao: null, alterado_em: 'x' }],
    });
    assert.deepEqual(detalhe.historico, [{ statusAnterior: null, statusNovo: 'ABERTA', observacao: null, alteradoEm: 'x' }]);
    assert.equal(detalhe.minhaRelacao, null);
  });

  it('lê os campos do Bridge 2.0 (endereço, região, confirmações, origem, relação)', () => {
    const o = parseOcorrencia({ ...OCORRENCIA_API, endereco: 'Praça da Sé — Sé' });
    assert.deepEqual(
      { endereco: o.endereco, subprefeitura: o.subprefeitura, confirmacoes: o.confirmacoes, origem: o.origem },
      { endereco: 'Praça da Sé — Sé', subprefeitura: { codigo: '09', nome: 'Sé' }, confirmacoes: 2, origem: 'APP' },
    );
    assert.equal(parseOcorrencia({ ...OCORRENCIA_API, subprefeitura: null }).subprefeitura, null);
    const detalhe = parseOcorrenciaDetalhe({
      ...OCORRENCIA_API,
      historico_status: [],
      minha_relacao: { registrei: false, confirmei: true },
    });
    assert.deepEqual(detalhe.minhaRelacao, { registrei: false, confirmei: true });
  });

  it('lê proximidade, confirmação e estatísticas por região', () => {
    const [proxima] = parseProximas({ itens: [{ ...OCORRENCIA_API, distancia_m: 40 }] });
    assert.equal(proxima?.distanciaM, 40);
    assert.equal(proxima?.id, 12);
    assert.deepEqual(parseConfirmacao({ ocorrencia_id: 12, confirmacoes: 1, confirmado: true }), {
      ocorrenciaId: 12,
      confirmacoes: 1,
      confirmado: true,
    });
    const [se] = parseEstatisticasRegioes({
      origem: 'APP',
      dias: null,
      itens: [
        {
          codigo: '09',
          nome: 'Sé',
          total: 2,
          abertas: 1,
          alta_abertas: 1,
          resolvidas: 1,
          confirmacoes: 1,
          densidade_km2: 0.076,
          alerta: { nivel: 'ATENCAO', indice: 52, abertas_30d: 6, abertas_alta_30d: 2 },
        },
      ],
    });
    assert.deepEqual(se, {
      codigo: '09',
      nome: 'Sé',
      total: 2,
      abertas: 1,
      altaAbertas: 1,
      resolvidas: 1,
      confirmacoes: 1,
      densidadeKm2: 0.076,
      alerta: { nivel: 'ATENCAO', indice: 52, abertas30d: 6, abertasAlta30d: 2 },
    });
  });

  it('recusa campos ausentes, tipos errados e valores fora do enum', () => {
    const casos: unknown[] = [
      null,
      [],
      { ...OCORRENCIA_API, id: '12' },
      { ...OCORRENCIA_API, categoria: 'ALAGAMENTO' },
      { ...OCORRENCIA_API, latitude: null },
      { ...OCORRENCIA_API, analise_ia: undefined },
      { ...OCORRENCIA_API, risco_imediato: 'true' },
      { ...OCORRENCIA_API, origem: 'X' },
      { ...OCORRENCIA_API, confirmacoes: '2' },
      { ...OCORRENCIA_API, subprefeitura: { codigo: 9, nome: 'Sé' } },
    ];
    for (const caso of casos) {
      assert.throws(() => parsePaginaOcorrencias({ itens: [caso], pagina: 1, tamanho: 20, total: 1, total_paginas: 1 }), ErroFormato);
    }
    assert.throws(() => parseIdentificacao({ id: 1, apelido: 'A', criado_em: 'x' }), ErroFormato);
  });

  it('lê erro padronizado e ignora formatos desconhecidos', () => {
    assert.deepEqual(
      parseErroApi({ erro: { codigo: 'VALIDACAO', mensagem: 'Inválido', detalhes: [{ campo: 'latitude', mensagem: 'm' }, 5] } }),
      { codigo: 'VALIDACAO', mensagem: 'Inválido', detalhes: [{ campo: 'latitude', mensagem: 'm' }] },
    );
    assert.equal(parseErroApi({ detail: 'Not Found' }), null);
    assert.equal(parseErroApi('texto'), null);
  });
});

// Respostas da fase 2 no formato do contrato (valores de exemplo).
const RESUMO_API = {
  origem: 'SIMULADA',
  dias: null,
  total: 1200,
  abertas: 425,
  resolvidas: 686,
  rejeitadas: 89,
  percentual_resolvidas: 57.2,
  tempo_medio_resolucao_dias: 16.1,
  alertas_ativos: 3,
  regioes_em_atencao: 7,
  por_categoria: [
    { categoria: 'CALCADA_DANIFICADA', total: 360 },
    { categoria: 'BURACO', total: 300 },
  ],
  semanal: [{ inicio: '2026-07-13', registradas: 61, resolvidas: 12 }],
  ranking_regioes: [{ codigo: '27', nome: 'Itaquera', total: 98 }],
};

const PONTOS_API = {
  itens: [
    {
      id: 7,
      latitude: -23.5503,
      longitude: -46.634,
      categoria: 'BURACO',
      prioridade: 'ALTA',
      status: 'ABERTA',
      titulo: 'Buraco na rua',
      endereco: null,
      confirmacoes: 2,
    },
  ],
  total: 2500,
  truncado: true,
};

describe('respostas da fase 2', () => {
  it('lê o resumo das análises', () => {
    const r = parseResumo(RESUMO_API);
    assert.equal(r.origem, 'SIMULADA');
    assert.equal(r.percentualResolvidas, 57.2);
    assert.equal(r.tempoMedioResolucaoDias, 16.1);
    assert.equal(r.alertasAtivos, 3);
    assert.equal(r.regioesEmAtencao, 7);
    assert.deepEqual(r.porCategoria[0], { categoria: 'CALCADA_DANIFICADA', total: 360 });
    assert.deepEqual(r.semanal, [{ inicio: '2026-07-13', registradas: 61, resolvidas: 12 }]);
    assert.deepEqual(r.rankingRegioes, [{ codigo: '27', nome: 'Itaquera', total: 98 }]);
  });

  it('aceita resumo vazio (nada registrado ainda)', () => {
    const r = parseResumo({
      ...RESUMO_API,
      total: 0,
      percentual_resolvidas: null,
      tempo_medio_resolucao_dias: null,
      semanal: [],
      ranking_regioes: [],
    });
    assert.equal(r.percentualResolvidas, null);
    assert.equal(r.tempoMedioResolucaoDias, null);
  });

  it('lê os pontos do mapa e o aviso de corte', () => {
    const p = parsePontosMapa(PONTOS_API);
    assert.equal(p.total, 2500);
    assert.equal(p.truncado, true);
    assert.deepEqual(p.itens[0], {
      id: 7,
      latitude: -23.5503,
      longitude: -46.634,
      categoria: 'BURACO',
      prioridade: 'ALTA',
      status: 'ABERTA',
      titulo: 'Buraco na rua',
      endereco: null,
      confirmacoes: 2,
    });
  });

  it('recusa nível de alerta desconhecido, percentual como texto e ponto sem título', () => {
    const regiao = {
      codigo: '09',
      nome: 'Sé',
      total: 1,
      abertas: 1,
      alta_abertas: 0,
      resolvidas: 0,
      confirmacoes: 0,
      densidade_km2: 0.1,
      alerta: { nivel: 'OFICIAL', indice: 1, abertas_30d: 1, abertas_alta_30d: 0 },
    };
    assert.throws(() => parseEstatisticasRegioes({ itens: [regiao] }), ErroFormato);
    assert.throws(() => parseResumo({ ...RESUMO_API, percentual_resolvidas: '50' }), ErroFormato);
    const { titulo: _semTitulo, ...semTitulo } = PONTOS_API.itens[0]!;
    assert.throws(() => parsePontosMapa({ ...PONTOS_API, itens: [semTitulo] }), ErroFormato);
  });
});
