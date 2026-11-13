import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ErroFormato } from './guardas.ts';
import {
  parseConfirmacao,
  parseErroApi,
  parseEstatisticasRegioes,
  parseIdentificacao,
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
        { codigo: '09', nome: 'Sé', total: 2, abertas: 1, alta_abertas: 1, resolvidas: 1, confirmacoes: 1, densidade_km2: 0.076 },
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
