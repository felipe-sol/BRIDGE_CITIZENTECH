import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ESCALA_TEXTO_MAIOR, PREFERENCIAS_PADRAO, escalarEstiloTexto, parsePreferencias } from './preferencias.ts';

describe('preferências guardadas no aparelho', () => {
  it('aproveita campos válidos e usa o padrão no resto, sem lançar erro', () => {
    assert.deepEqual(PREFERENCIAS_PADRAO, { textoMaior: false, avisosNoApp: true });
    assert.deepEqual(parsePreferencias(null), PREFERENCIAS_PADRAO);
    assert.deepEqual(parsePreferencias('{texto quebrado'), PREFERENCIAS_PADRAO);
    assert.deepEqual(parsePreferencias({ textoMaior: true, lixo: 1 }), { textoMaior: true, avisosNoApp: true });
    assert.deepEqual(parsePreferencias({ textoMaior: 'sim', avisosNoApp: false }), { textoMaior: false, avisosNoApp: false });
  });
});

describe('Texto maior', () => {
  it('escala o tamanho e a altura da linha juntos (o texto não fica cortado)', () => {
    assert.equal(ESCALA_TEXTO_MAIOR, 1.2);
    assert.deepEqual(escalarEstiloTexto({ fontSize: 15, lineHeight: 21 }, 1.2), { fontSize: 18, lineHeight: 25 });
    assert.deepEqual(escalarEstiloTexto({ fontSize: 13 }, 1.2), { fontSize: 16 });
    assert.deepEqual(escalarEstiloTexto({}, 1.2), {});
    assert.deepEqual(escalarEstiloTexto({ fontSize: 15, lineHeight: 21 }, 1), { fontSize: 15, lineHeight: 21 });
  });
});
