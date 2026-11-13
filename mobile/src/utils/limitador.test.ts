import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { deveExecutar } from './limitador.ts';

describe('limitador de chamadas repetidas', () => {
  it('evita repetir a MESMA consulta dentro de 1 s, mas nunca segura uma consulta diferente', () => {
    assert.equal(deveExecutar(null, 'a', 0), true);
    assert.equal(deveExecutar({ chave: 'a', em: 1000 }, 'a', 1500), false);
    assert.equal(deveExecutar({ chave: 'a', em: 1000 }, 'b', 1500), true);
    assert.equal(deveExecutar({ chave: 'a', em: 1000 }, 'a', 2500), true);
    assert.equal(deveExecutar({ chave: 'a', em: 1000 }, 'a', 1500, 200), true);
  });
});
