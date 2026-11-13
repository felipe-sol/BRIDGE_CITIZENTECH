import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { OcorrenciaDetalhe } from '../models/ocorrencia.ts';
import { textoCompartilhamento } from './compartilhar.ts';
import { contarAtualizadas, estaAtualizada, textoAvisoAtualizadas } from './novidades.ts';

describe('estaAtualizada (selo "Atualizada")', () => {
  it('só marca quando houve atualização depois da última visita', () => {
    assert.equal(estaAtualizada('2026-11-12T10:00:00Z', '2026-11-12T09:00:00Z'), true);
    assert.equal(estaAtualizada('2026-11-12T10:00:00Z', '2026-11-12T10:00:00Z'), false);
    assert.equal(estaAtualizada('2026-11-12T09:00:00Z', '2026-11-12T10:00:00Z'), false);
  });

  it('sem visita registrada ou com data inválida, não marca', () => {
    assert.equal(estaAtualizada('2026-11-12T10:00:00Z', undefined), false);
    assert.equal(estaAtualizada('invalida', '2026-11-12T10:00:00Z'), false);
    assert.equal(estaAtualizada('2026-11-12T10:00:00Z', 'invalida'), false);
  });
});

describe('avisos de atualização no app', () => {
  const itens = [
    { id: 1, atualizadoEm: '2026-11-12T10:00:00Z' },
    { id: 2, atualizadoEm: '2026-11-12T12:00:00Z' },
    { id: 3, atualizadoEm: '2026-11-12T08:00:00Z' },
  ];

  it('conta as acompanhadas que mudaram depois da última visita', () => {
    assert.equal(contarAtualizadas(itens, {}), 0);
    assert.equal(contarAtualizadas(itens, { '1': '2026-11-12T10:00:00Z', '2': '2026-11-12T12:00:00Z' }), 0);
    assert.equal(contarAtualizadas(itens, { '1': '2026-11-12T09:00:00Z', '2': '2026-11-12T11:00:00Z', '3': '2026-11-12T08:00:00Z' }), 2);
  });

  it('texto do aviso', () => {
    assert.equal(textoAvisoAtualizadas(0), null);
    assert.equal(textoAvisoAtualizadas(1), '1 ocorrência que você acompanha foi atualizada');
    assert.equal(textoAvisoAtualizadas(5), '5 ocorrências que você acompanha foram atualizadas');
  });
});

describe('textoCompartilhamento', () => {
  const base: OcorrenciaDetalhe = {
    id: 3,
    titulo: 'Calçada quebrada em frente à escola',
    descricao: 'Placas soltas.',
    categoria: 'CALCADA_DANIFICADA',
    latitude: -23.550312,
    longitude: -46.633987,
    endereco: 'Praça da Sé — Sé',
    subprefeitura: { codigo: '09', nome: 'Sé' },
    confirmacoes: 4,
    origem: 'APP',
    riscoImediato: true,
    bloqueiaPassagem: false,
    afetaAcessibilidade: true,
    status: 'EM_ANDAMENTO',
    prioridade: 'ALTA',
    prioridadePontuacao: 7,
    prioridadeJustificativa: 'Total 7/10 → ALTA.',
    imagemUrl: null,
    analiseIa: { status: 'INDISPONIVEL', categoriaSugerida: null, confianca: null, versaoModelo: null, analisadaEm: null },
    criadoEm: '2026-11-12T10:00:00Z',
    atualizadoEm: '2026-11-12T12:00:00Z',
    historico: [],
    avisosNaoResolvido: 0,
    minhaRelacao: null,
  };

  it('resume a ocorrência sem coordenadas e sem link', () => {
    const texto = textoCompartilhamento(base);
    assert.ok(texto.includes('Calçada quebrada em frente à escola'));
    assert.ok(texto.includes('Em andamento'));
    assert.ok(texto.includes('Praça da Sé — Sé'));
    assert.ok(texto.includes('Registrado no Bridge (projeto acadêmico)'));
    assert.ok(!texto.includes('-23.5') && !texto.includes('-46.6'));
    assert.ok(!/https?:/.test(texto));
  });

  it('sem endereço usa a região; nunca passa de 500 caracteres', () => {
    const semEndereco = textoCompartilhamento({ ...base, endereco: null });
    assert.ok(semEndereco.includes('Subprefeitura Sé'));
    const enorme = textoCompartilhamento({ ...base, titulo: 'T'.repeat(400), endereco: 'E'.repeat(200) });
    assert.ok(enorme.length <= 500, String(enorme.length));
  });

  it('ocorrência fictícia sai rotulada no compartilhamento', () => {
    const texto = textoCompartilhamento({ ...base, origem: 'SIMULADA' });
    assert.equal(texto.split('\n')[0], '[DADO FICTÍCIO]');
    assert.ok(!textoCompartilhamento(base).includes('FICTÍCIO'));
  });
});
