import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { etapaDoStatus } from './etapas.ts';
import { juntarAcompanhadas } from './lista.ts';

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
