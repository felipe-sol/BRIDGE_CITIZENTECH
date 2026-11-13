import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { OcorrenciaDetalhe } from '../models/ocorrencia.ts';
import { aplicarAtualizacaoDetalhe, podeAvisarNaoResolvido, textoAvisosNaoResolvido } from './detalhe.ts';
import { etapaDoStatus } from './etapas.ts';
import { anexarSemRepetir, juntarAcompanhadas } from './lista.ts';

describe('etapaDoStatus (barra de 4 passos)', () => {
  it('posiciona cada status no seu passo', () => {
    assert.deepEqual(etapaDoStatus('ABERTA'), { indice: 0, total: 4, rejeitada: false });
    assert.deepEqual(etapaDoStatus('EM_ANALISE'), { indice: 1, total: 4, rejeitada: false });
    assert.deepEqual(etapaDoStatus('EM_ANDAMENTO'), { indice: 2, total: 4, rejeitada: false });
    assert.deepEqual(etapaDoStatus('RESOLVIDA'), { indice: 3, total: 4, rejeitada: false });
  });

  it('rejeitada é um estado próprio, fora da sequência', () => {
    assert.deepEqual(etapaDoStatus('REJEITADA'), { indice: null, total: 4, rejeitada: true });
  });
});

describe('juntarAcompanhadas (Início)', () => {
  const item = (id: number, atualizadoEm: string) => ({ id, atualizadoEm });

  it('junta registradas e confirmadas sem repetir e ordena pela atualização mais recente', () => {
    const registradas = [item(1, '2026-11-12T10:00:00Z'), item(2, '2026-11-12T08:00:00Z')];
    const confirmadas = [item(3, '2026-11-12T11:00:00Z'), item(1, '2026-11-12T10:00:00Z')];
    assert.deepEqual(
      juntarAcompanhadas(registradas, confirmadas, 3).map((o) => o.id),
      [3, 1, 2],
    );
  });

  it('respeita o limite', () => {
    const muitas = Array.from({ length: 6 }, (_, i) => item(i + 1, `2026-11-1${i}T10:00:00Z`));
    assert.deepEqual(
      juntarAcompanhadas(muitas, [], 3).map((o) => o.id),
      [6, 5, 4],
    );
  });
});

const DETALHE: OcorrenciaDetalhe = {
  id: 9,
  titulo: 'Poste apagado',
  descricao: 'Poste sem luz há dias.',
  categoria: 'ILUMINACAO_DEFEITUOSA',
  latitude: -23.55,
  longitude: -46.63,
  endereco: null,
  subprefeitura: null,
  confirmacoes: 0,
  origem: 'APP',
  riscoImediato: false,
  bloqueiaPassagem: false,
  afetaAcessibilidade: false,
  status: 'RESOLVIDA',
  prioridade: 'MEDIA',
  prioridadePontuacao: 4,
  prioridadeJustificativa: 'Teste',
  imagemUrl: null,
  analiseIa: { status: 'INDISPONIVEL', categoriaSugerida: null, confianca: null, versaoModelo: null, analisadaEm: null },
  criadoEm: '2026-11-10T10:00:00Z',
  atualizadoEm: '2026-11-12T10:00:00Z',
  historico: [],
  avisosNaoResolvido: 0,
  minhaRelacao: null,
};

describe('"Ainda não foi resolvido? Avise" no detalhe', () => {
  it('só em ocorrência resolvida e real', () => {
    assert.equal(podeAvisarNaoResolvido(DETALHE), true);
    assert.equal(podeAvisarNaoResolvido({ ...DETALHE, status: 'ABERTA' }), false);
    assert.equal(podeAvisarNaoResolvido({ ...DETALHE, origem: 'SIMULADA' }), false);
  });

  it('conta as pessoas que avisaram', () => {
    assert.equal(textoAvisosNaoResolvido(0), null);
    assert.equal(textoAvisosNaoResolvido(1), '1 pessoa avisou que ainda não foi resolvido');
    assert.equal(textoAvisosNaoResolvido(3), '3 pessoas avisaram que ainda não foi resolvido');
  });

  it('falha ao atualizar mantém a ocorrência na tela, com aviso; só a 1ª carga vira erro', () => {
    const erro = { tipo: 'erro', titulo: 'Sem conexão', mensagem: 'Sem conexão com o servidor.', podeTentar: true } as const;
    const pronto = { tipo: 'pronto', ocorrencia: DETALHE, aviso: null } as const;
    assert.deepEqual(aplicarAtualizacaoDetalhe(pronto, erro), { ...pronto, aviso: 'Sem conexão com o servidor.' });
    assert.deepEqual(aplicarAtualizacaoDetalhe({ tipo: 'carregando' }, erro), erro);
    const novo = { tipo: 'pronto', ocorrencia: { ...DETALHE, avisosNaoResolvido: 2 }, aviso: null } as const;
    assert.deepEqual(aplicarAtualizacaoDetalhe({ ...pronto, aviso: 'antigo' }, novo), novo);
  });
});

describe('Carregar mais no Andamento', () => {
  it('anexa a próxima página sem repetir ocorrência que mudou de página', () => {
    assert.deepEqual(
      anexarSemRepetir([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }]).map((o) => o.id),
      [1, 2, 3],
    );
    assert.deepEqual(anexarSemRepetir([], [{ id: 7 }]).map((o) => o.id), [7]);
  });
});
