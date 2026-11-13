import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validarApelido } from './identificacao.ts';
import { interpretarCodigoRegiao, interpretarIdRota, rotaMapa, rotaRegiao } from './rotas.ts';
import { formatarDecimal, iniciais } from '../utils/formatacao.ts';
import { interpretarUrlApi } from './urlApi.ts';

describe('validarApelido', () => {
  it('normaliza espaços e aceita 2 a 60 caracteres', () => {
    assert.deepEqual(validarApelido('  Maria   do  Bairro '), { ok: true, apelido: 'Maria do Bairro' });
  });

  it('dá mensagens específicas', () => {
    assert.deepEqual(validarApelido('   '), { ok: false, erro: 'Informe como você quer ser chamado.' });
    assert.equal(validarApelido('A').ok, false);
    assert.equal(validarApelido('x'.repeat(61)).ok, false);
  });
});

describe('interpretarIdRota', () => {
  it('aceita só inteiros positivos', () => {
    assert.equal(interpretarIdRota('12'), 12);
    assert.equal(interpretarIdRota(['7', '8']), 7);
    for (const v of [undefined, '', '0', '-1', '1.5', 'abc', '12abc', '9999999999']) {
      assert.equal(interpretarIdRota(v), null, String(v));
    }
  });
});

describe('interpretarUrlApi', () => {
  it('remove barra final e identifica localhost', () => {
    assert.deepEqual(interpretarUrlApi('http://192.168.68.62:8000/'), {
      ok: true,
      baseUrl: 'http://192.168.68.62:8000',
      apontaParaEsteAparelho: false,
    });
    const local = interpretarUrlApi('http://localhost:8000');
    assert.equal(local.ok && local.apontaParaEsteAparelho, true);
  });

  it('recusa ausente ou malformada', () => {
    assert.equal(interpretarUrlApi(undefined).ok, false);
    assert.equal(interpretarUrlApi('  ').ok, false);
    assert.equal(interpretarUrlApi('192.168.0.10:8000').ok, false);
    assert.equal(interpretarUrlApi('ftp://x').ok, false);
  });
});

describe('interpretarCodigoRegiao', () => {
  it('aceita só dois dígitos (código de subprefeitura)', () => {
    assert.equal(interpretarCodigoRegiao('09'), '09');
    assert.equal(interpretarCodigoRegiao(['27']), '27');
    assert.equal(interpretarCodigoRegiao('9'), null);
    assert.equal(interpretarCodigoRegiao('../x'), null);
    assert.equal(interpretarCodigoRegiao(undefined), null);
  });

  it('monta a rota da folha da região', () => {
    assert.deepEqual(rotaRegiao('11'), { pathname: '/regiao/[codigo]', params: { codigo: '11' } });
  });

  it('a rota do Mapa sempre diz o modo, para "Ao vivo" nunca herdar o Exemplo', () => {
    assert.deepEqual(rotaMapa('aovivo', '09'), { pathname: '/mapa', params: { modo: 'aovivo', regiao: '09' } });
    assert.deepEqual(rotaMapa(), { pathname: '/mapa', params: { modo: 'aovivo' } });
    assert.deepEqual(rotaMapa('exemplo'), { pathname: '/mapa', params: { modo: 'exemplo' } });
  });
});

describe('formatarDecimal', () => {
  it('usa vírgula e corta casas inúteis', () => {
    assert.equal(formatarDecimal(0.0764, 2), '0,08');
    assert.equal(formatarDecimal(2, 2), '2');
    assert.equal(formatarDecimal(1.5, 2), '1,5');
  });
});

describe('iniciais', () => {
  it('pega a primeira letra da primeira e da última palavra', () => {
    assert.equal(iniciais('Morador do Bloco B'), 'MB');
    assert.equal(iniciais('ana'), 'A');
    assert.equal(iniciais('  vizinha   da rua 7 '), 'VR');
    assert.equal(iniciais('123'), '?');
  });
});
