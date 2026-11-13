import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FORMULARIO_VAZIO,
  interpretarCoordenada,
  validarFoto,
  validarOcorrencia,
  type FormularioOcorrencia,
} from './ocorrencia.ts';

const VALIDO: FormularioOcorrencia = {
  ...FORMULARIO_VAZIO,
  titulo: '  Poste apagado na esquina  ',
  descricao: 'O poste está apagado há uma semana.',
  categoria: 'ILUMINACAO_DEFEITUOSA',
  latitudeTexto: '-23,5614141',
  longitudeTexto: '-46.6558819',
  riscoImediato: true,
};

describe('interpretarCoordenada', () => {
  it('aceita ponto ou vírgula decimal e sinal', () => {
    assert.equal(interpretarCoordenada('-23,5614'), -23.5614);
    assert.equal(interpretarCoordenada(' -46.65 '), -46.65);
    assert.equal(interpretarCoordenada('+10'), 10);
    assert.equal(interpretarCoordenada('−23.5'), -23.5);
  });

  it('recusa textos que não são número', () => {
    for (const entrada of ['', 'abc', '12,3,4', '1e5', '--1', '12.', '1234.5', 'NaN']) {
      assert.equal(interpretarCoordenada(entrada), null, entrada);
    }
  });
});

describe('validarOcorrencia', () => {
  it('aceita formulário válido, apara textos e arredonda para 6 casas', () => {
    const r = validarOcorrencia(VALIDO, 'id-1');
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(r.dados, {
      identificacaoId: 'id-1',
      titulo: 'Poste apagado na esquina',
      descricao: 'O poste está apagado há uma semana.',
      categoria: 'ILUMINACAO_DEFEITUOSA',
      latitude: -23.561414,
      longitude: -46.655882,
      riscoImediato: true,
      bloqueiaPassagem: false,
      afetaAcessibilidade: false,
      endereco: null,
    });
  });

  it('formulário vazio gera mensagem específica para cada campo', () => {
    const r = validarOcorrencia(FORMULARIO_VAZIO, 'id-1');
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.deepEqual(Object.keys(r.erros).sort(), ['categoria', 'descricao', 'latitude', 'longitude', 'titulo']);
    assert.match(r.erros.titulo ?? '', /Informe o título/);
    assert.match(r.erros.latitude ?? '', /Usar minha localização/);
  });

  it('valida tamanhos de texto', () => {
    const r = validarOcorrencia({ ...VALIDO, titulo: 'abc', descricao: 'x'.repeat(2001) }, 'id-1');
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.erros.titulo, 'Título precisa ter pelo menos 5 caracteres (tem 3).');
    assert.equal(r.erros.descricao, 'Descrição pode ter no máximo 2000 caracteres (tem 2001).');
  });

  it('valida faixa das coordenadas', () => {
    const r = validarOcorrencia({ ...VALIDO, latitudeTexto: '91', longitudeTexto: '-181' }, 'id-1');
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.erros.latitude, 'A latitude deve estar entre -90 e 90.');
    assert.equal(r.erros.longitude, 'A longitude deve estar entre -180 e 180.');
  });

  it('recusa (0, 0) como localização ausente', () => {
    const r = validarOcorrencia({ ...VALIDO, latitudeTexto: '0', longitudeTexto: '0,0' }, 'id-1');
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.match(r.erros.latitude ?? '', /localização ausente/);
  });

  it('recusa coordenada em formato inválido', () => {
    const r = validarOcorrencia({ ...VALIDO, longitudeTexto: '46°39\'W' }, 'id-1');
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.match(r.erros.longitude ?? '', /Longitude inválida/);
  });
});

describe('validarFoto', () => {
  it('aceita JPEG/PNG até 5 MB e tamanho desconhecido', () => {
    assert.equal(validarFoto(1024, 'image/jpeg'), null);
    assert.equal(validarFoto(null, null), null);
    assert.equal(validarFoto(5 * 1024 * 1024, 'image/png'), null);
  });

  it('recusa formato e tamanho excedente', () => {
    assert.match(validarFoto(10, 'image/heic') ?? '', /JPEG ou PNG/);
    assert.match(validarFoto(6 * 1024 * 1024, 'image/jpeg') ?? '', /6,0 MB/);
  });
});

describe('endereço no formulário', () => {
  it('apara o endereço e transforma vazio em null', () => {
    const comEndereco = validarOcorrencia({ ...VALIDO, endereco: '  Praça da Sé — Sé  ' }, 'id-1');
    assert.ok(comEndereco.ok);
    assert.equal(comEndereco.dados.endereco, 'Praça da Sé — Sé');
    const vazio = validarOcorrencia({ ...VALIDO, endereco: '   ' }, 'id-1');
    assert.ok(vazio.ok);
    assert.equal(vazio.dados.endereco, null);
  });

  it('recusa endereço com mais de 200 caracteres', () => {
    const r = validarOcorrencia({ ...VALIDO, endereco: 'x'.repeat(201) }, 'id-1');
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.erros.endereco, 'O endereço pode ter no máximo 200 caracteres (tem 201).');
  });
});
