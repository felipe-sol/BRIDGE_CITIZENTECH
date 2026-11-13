import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  avisoTruncado,
  caminhoLinha,
  escalaBarras,
  formatarDias,
  indiceMaisProximo,
  marcasEixo,
  resumoCategorias,
  resumoRanking,
  resumoSemanal,
} from './graficos.ts';

describe('escalas dos gráficos', () => {
  it('barras proporcionais ao maior valor, sem NaN com zeros', () => {
    assert.deepEqual(escalaBarras([1, 4], 100), [25, 100]);
    assert.deepEqual(escalaBarras([0, 0], 100), [0, 0]);
    assert.deepEqual(escalaBarras([], 100), []);
    assert.deepEqual(escalaBarras([1, 1000], 100), [2, 100]); // valor > 0 nunca some
  });

  it('linha SVG dentro da área; vazia sem dados; na base com máximo 0', () => {
    assert.equal(caminhoLinha([], 100, 50, 10), '');
    assert.equal(caminhoLinha([0, 10], 100, 50, 10), 'M0,50 L100,0');
    assert.equal(caminhoLinha([5], 100, 50, 10), 'M50,25');
    assert.equal(caminhoLinha([0, 0], 100, 50, 0), 'M0,50 L100,50');
  });

  it('toque no gráfico escolhe a semana mais próxima', () => {
    assert.equal(indiceMaisProximo(0, 300, 4), 0); // pontos em x = 0, 100, 200, 300
    assert.equal(indiceMaisProximo(160, 300, 4), 2);
    assert.equal(indiceMaisProximo(999, 300, 4), 3);
    assert.equal(indiceMaisProximo(-5, 300, 4), 0);
    assert.equal(indiceMaisProximo(120, 300, 1), 0);
    assert.equal(indiceMaisProximo(10, 300, 0), -1);
  });

  it('marcas redondas do eixo cobrindo o máximo', () => {
    assert.deepEqual(marcasEixo(0), [0, 1]);
    assert.deepEqual(marcasEixo(9), [0, 5, 10]);
    assert.deepEqual(marcasEixo(61), [0, 20, 40, 60, 80]);
    const m = marcasEixo(1234);
    assert.ok(m.length >= 3 && m.length <= 5 && m[m.length - 1]! >= 1234);
  });
});

describe('textos dos gráficos (leitores de tela)', () => {
  it('resumem os dados ou dizem que não há dados', () => {
    assert.equal(resumoSemanal([]), 'Sem dados no período.');
    assert.equal(resumoCategorias([{ categoria: 'BURACO', total: 0 }]), 'Sem dados no período.');
    assert.equal(resumoRanking([]), 'Sem dados no período.');
    assert.equal(
      resumoCategorias([
        { categoria: 'CALCADA_DANIFICADA', total: 3 },
        { categoria: 'BURACO', total: 1 },
        { categoria: 'OUTRO', total: 0 },
      ]),
      'Por categoria: Calçada danificada 3, Buraco 1.',
    );
    assert.equal(
      resumoSemanal([
        { inicio: '2026-11-02', registradas: 4, resolvidas: 1 },
        { inicio: '2026-11-09', registradas: 6, resolvidas: 2 },
      ]),
      '2 semanas: 10 registradas e 3 resolvidas. Semana com mais registros: 09/11, com 6.',
    );
    assert.equal(
      resumoRanking([
        { codigo: '27', nome: 'Itaquera', total: 98 },
        { codigo: '09', nome: 'Sé', total: 80 },
      ]),
      'Regiões com mais relatos: 1º Itaquera (98), 2º Sé (80).',
    );
  });

  it('formata dias e o aviso de corte do mapa', () => {
    assert.equal(formatarDias(null), '—');
    assert.equal(formatarDias(1), '1 dia');
    assert.equal(formatarDias(3.5), '3,5 dias');
    assert.equal(avisoTruncado(2500, 2000), 'Mostrando 2000 de 2500 nesta área. Aproxime o mapa.');
    assert.equal(avisoTruncado(10, 10), null);
  });
});
