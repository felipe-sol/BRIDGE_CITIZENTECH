import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { OcorrenciaProxima } from '../models/ocorrencia.ts';
import { FLUXO_INICIAL, reduzirFluxo, type EstadoFluxo, type EventoFluxo } from './fluxo.ts';

const PONTO = { latitude: -23.5503, longitude: -46.634 };

function parecida(id: number): OcorrenciaProxima {
  return {
    id,
    titulo: 'Calçada quebrada',
    descricao: 'Placas soltas na calçada.',
    categoria: 'CALCADA_DANIFICADA',
    latitude: -23.5501,
    longitude: -46.634,
    endereco: null,
    subprefeitura: { codigo: '09', nome: 'Sé' },
    confirmacoes: 1,
    origem: 'APP',
    riscoImediato: false,
    bloqueiaPassagem: false,
    afetaAcessibilidade: false,
    status: 'ABERTA',
    prioridade: 'MEDIA',
    prioridadePontuacao: 4,
    prioridadeJustificativa: 'Total 4/10 → MEDIA.',
    imagemUrl: null,
    analiseIa: { status: 'INDISPONIVEL', categoriaSugerida: null, confianca: null, versaoModelo: null, analisadaEm: null },
    criadoEm: '2026-11-12T10:00:00Z',
    atualizadoEm: '2026-11-12T10:00:00Z',
    distanciaM: 22,
  };
}

function aplicar(...eventos: EventoFluxo[]): EstadoFluxo {
  return eventos.reduce(reduzirFluxo, FLUXO_INICIAL);
}

const ATE_CATEGORIA: EventoFluxo[] = [
  { tipo: 'confirmar_local', ponto: PONTO },
  { tipo: 'escolher_categoria', categoria: 'CALCADA_DANIFICADA' },
];

describe('fluxo do registro em etapas', () => {
  it('começa no local e, ao escolher a categoria, fica verificando parecidos', () => {
    assert.equal(FLUXO_INICIAL.etapa, 'local');
    const e = aplicar(...ATE_CATEGORIA);
    assert.equal(e.etapa, 'parecidos');
    assert.equal(e.verificando, true);
    assert.deepEqual(e.ponto, PONTO);
    assert.equal(e.categoria, 'CALCADA_DANIFICADA');
  });

  it('sem parecidos vai direto para os detalhes', () => {
    const e = aplicar(...ATE_CATEGORIA, { tipo: 'parecidos_carregados', itens: [] });
    assert.equal(e.etapa, 'detalhes');
    assert.equal(e.verificando, false);
  });

  it('com parecidos para na etapa de parecidos; "é outro" segue para os detalhes', () => {
    const comParecidos = aplicar(...ATE_CATEGORIA, { tipo: 'parecidos_carregados', itens: [parecida(7)] });
    assert.equal(comParecidos.etapa, 'parecidos');
    assert.deepEqual(
      comParecidos.parecidos.map((p) => p.id),
      [7],
    );
    assert.equal(reduzirFluxo(comParecidos, { tipo: 'e_outro' }).etapa, 'detalhes');
  });

  it('falha na consulta de parecidos segue para os detalhes com aviso', () => {
    const e = aplicar(...ATE_CATEGORIA, { tipo: 'parecidos_falharam', mensagem: 'Sem conexão' });
    assert.equal(e.etapa, 'detalhes');
    assert.equal(e.avisoParecidos, 'Não foi possível verificar registros parecidos. Você pode continuar.');
  });

  it('voltar dos detalhes leva à categoria; da categoria, ao local', () => {
    const detalhes = aplicar(...ATE_CATEGORIA, { tipo: 'parecidos_carregados', itens: [] });
    const categoria = reduzirFluxo(detalhes, { tipo: 'voltar' });
    assert.equal(categoria.etapa, 'categoria');
    assert.equal(reduzirFluxo(categoria, { tipo: 'voltar' }).etapa, 'local');
  });

  it('avançar dos detalhes leva à revisão, e voltar retorna aos detalhes', () => {
    const revisao = aplicar(...ATE_CATEGORIA, { tipo: 'parecidos_carregados', itens: [] }, { tipo: 'avancar' });
    assert.equal(revisao.etapa, 'revisao');
    assert.equal(reduzirFluxo(revisao, { tipo: 'voltar' }).etapa, 'detalhes');
  });

  it('ignora (0, 0) e coordenadas inválidas ao confirmar o local', () => {
    assert.equal(aplicar({ tipo: 'confirmar_local', ponto: { latitude: 0, longitude: 0 } }).etapa, 'local');
    assert.equal(aplicar({ tipo: 'confirmar_local', ponto: { latitude: 95, longitude: -46 } }).etapa, 'local');
    assert.equal(aplicar({ tipo: 'confirmar_local', ponto: { latitude: Number.NaN, longitude: -46 } }).etapa, 'local');
  });

  it('ignora resposta atrasada de parecidos depois de voltar', () => {
    const voltou = aplicar(...ATE_CATEGORIA, { tipo: 'voltar' });
    assert.equal(voltou.etapa, 'categoria');
    assert.equal(reduzirFluxo(voltou, { tipo: 'parecidos_carregados', itens: [parecida(7)] }), voltou);
  });
});

describe('trocar a categoria pela sugestão da IA, na revisão', () => {
  const ATE_REVISAO: EventoFluxo[] = [...ATE_CATEGORIA, { tipo: 'parecidos_carregados', itens: [] }, { tipo: 'avancar' }];

  it('volta a verificar parecidos com a categoria nova (a regra de duplicatas é por categoria)', () => {
    const antes = aplicar(...ATE_REVISAO);
    assert.equal(antes.etapa, 'revisao');
    const e = reduzirFluxo(antes, { tipo: 'trocar_categoria', categoria: 'BURACO' });
    assert.equal(e.etapa, 'parecidos');
    assert.equal(e.categoria, 'BURACO');
    assert.equal(e.verificando, true);
    assert.deepEqual(e.parecidos, []);
    assert.deepEqual(e.ponto, PONTO);
  });

  it('fora da revisão, ou com a mesma categoria, não faz nada', () => {
    const naCategoria = aplicar({ tipo: 'confirmar_local', ponto: PONTO });
    assert.equal(reduzirFluxo(naCategoria, { tipo: 'trocar_categoria', categoria: 'BURACO' }), naCategoria);
    const naRevisao = aplicar(...ATE_REVISAO);
    assert.equal(reduzirFluxo(naRevisao, { tipo: 'trocar_categoria', categoria: 'CALCADA_DANIFICADA' }), naRevisao);
  });
});
