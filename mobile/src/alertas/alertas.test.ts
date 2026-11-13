import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import amostra from '../geo/amostra-regioes.json' with { type: 'json' };
import type { AlertaRegiao, EstatisticaRegiao, NivelAlerta } from '../models/ocorrencia.ts';
import { parseRegioes } from '../validation/regioes.ts';
import { AVISO_ALERTA_BRIDGE, ROTULO_NIVEL, alertaParaInicio, textoMotivoAlerta } from './alertas.ts';

const REGIOES = parseRegioes(amostra); // 09 Sé, 11 Pinheiros, 12 Vila Mariana

function alerta(nivel: NivelAlerta, indice = 0, abertas30d = 0, abertasAlta30d = 0): AlertaRegiao {
  return { nivel, indice, abertas30d, abertasAlta30d };
}

function estatisticas(niveis: Record<string, AlertaRegiao>): EstatisticaRegiao[] {
  return REGIOES.map((r) => ({
    codigo: r.codigo,
    nome: r.nome,
    total: 0,
    abertas: 0,
    altaAbertas: 0,
    resolvidas: 0,
    confirmacoes: 0,
    densidadeKm2: 0,
    alerta: niveis[r.codigo] ?? alerta('NORMAL'),
  }));
}

const EM_PINHEIROS = { latitude: -23.5673, longitude: -46.6919 };

describe('Alerta Bridge', () => {
  it('nunca se apresenta como oficial', () => {
    assert.equal(AVISO_ALERTA_BRIDGE, 'Alerta Bridge: calculado automaticamente a partir dos relatos');
    assert.deepEqual(ROTULO_NIVEL, { NORMAL: 'Normal', ATENCAO: 'Atenção', ALERTA: 'Alerta' });
  });

  it('explica o motivo com os números da região', () => {
    assert.equal(
      textoMotivoAlerta(alerta('ALERTA', 95, 12, 4)),
      '12 abertas nos últimos 30 dias, 4 de prioridade alta (índice 95).',
    );
    assert.equal(textoMotivoAlerta(alerta('NORMAL', 5, 1, 0)), '1 aberta nos últimos 30 dias, nenhuma de prioridade alta (índice 5).');
  });

  it('a região da própria pessoa em atenção vem primeiro, com distância 0', () => {
    const r = alertaParaInicio(REGIOES, estatisticas({ '11': alerta('ATENCAO', 50, 7, 1), '09': alerta('ALERTA', 99, 12, 4) }), EM_PINHEIROS);
    assert.equal(r?.regiao.codigo, '11');
    assert.equal(r?.distanciaM, 0);
  });

  it('senão, a região em ALERTA mais próxima, com a distância até ela', () => {
    const r = alertaParaInicio(REGIOES, estatisticas({ '09': alerta('ALERTA', 99, 12, 4) }), EM_PINHEIROS);
    assert.equal(r?.regiao.codigo, '09');
    assert.ok(r !== null && r.distanciaM !== null && r.distanciaM > 1000);
  });

  it('sem localização, a região em ALERTA de maior índice; sem alerta, nada', () => {
    const r = alertaParaInicio(
      REGIOES,
      estatisticas({ '09': alerta('ALERTA', 99, 12, 4), '12': alerta('ALERTA', 120, 15, 5) }),
      null,
    );
    assert.equal(r?.regiao.codigo, '12');
    assert.equal(r?.distanciaM, null);
    assert.equal(alertaParaInicio(REGIOES, estatisticas({ '12': alerta('ATENCAO', 60, 8, 1) }), null), null);
    assert.equal(alertaParaInicio(REGIOES, estatisticas({}), EM_PINHEIROS), null);
  });
});
