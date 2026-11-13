import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ItemMapa, PontoMapa, RegiaoMapa } from './tipos.ts';
import { RAIO_TOQUE_PX, decidirToqueMapa, itemNoToque } from './toqueMapa.ts';

// Tela de 400 × 800 pontos mostrando 0,01° × 0,02°: 1 ponto da tela = 0,000025° nos dois eixos.
const REGIAO: RegiaoMapa = { latitude: -23.55, longitude: -46.63, latitudeDelta: 0.02, longitudeDelta: 0.01 };
const TELA = { largura: 400, altura: 800 };
const GRAU_POR_PX = 0.000025;

function ponto(id: number, dxPx: number, dyPx: number): ItemMapa {
  const p: PontoMapa = {
    id,
    latitude: REGIAO.latitude - dyPx * GRAU_POR_PX, // para baixo na tela = latitude menor
    longitude: REGIAO.longitude + dxPx * GRAU_POR_PX,
    categoria: 'BURACO',
    prioridade: 'ALTA',
    status: 'ABERTA',
    titulo: `Ocorrência ${id}`,
    confirmacoes: 0,
  };
  return { tipo: 'ponto', ponto: p };
}

function toque(dxPx: number, dyPx: number) {
  return { latitude: REGIAO.latitude - dyPx * GRAU_POR_PX, longitude: REGIAO.longitude + dxPx * GRAU_POR_PX };
}

function idDe(item: ItemMapa | null): number | string | null {
  if (item === null) return null;
  return item.tipo === 'ponto' ? item.ponto.id : item.chave;
}

describe('toque no mapa perto de um ícone (o iPhone nem sempre entrega o toque ao ícone)', () => {
  it('um toque a poucos pontos do ícone acha a ocorrência', () => {
    assert.equal(idDe(itemNoToque([ponto(7, 0, 0)], toque(12, -9), REGIAO, TELA)), 7);
  });

  it('um toque longe de qualquer ícone não acha nada', () => {
    assert.equal(idDe(itemNoToque([ponto(7, 0, 0)], toque(RAIO_TOQUE_PX + 15, 0), REGIAO, TELA)), null);
  });

  it('com dois ícones perto do dedo, fica o mais próximo', () => {
    const itens = [ponto(1, 0, 0), ponto(2, 20, 0)];
    assert.equal(idDe(itemNoToque(itens, toque(14, 0), REGIAO, TELA)), 2);
    assert.equal(idDe(itemNoToque(itens, toque(6, 0), REGIAO, TELA)), 1);
  });

  it('mede a distância em pontos da tela em cada eixo (a tela é mais alta que larga)', () => {
    // 20 pontos para baixo: dentro do raio. Se a escala da largura fosse usada na altura, daria 40.
    assert.equal(idDe(itemNoToque([ponto(3, 0, 0)], toque(0, 20), REGIAO, TELA)), 3);
  });

  it('acha também um grupo (o toque nele aproxima o mapa)', () => {
    const grupo: ItemMapa = {
      tipo: 'grupo',
      chave: '10:20',
      latitude: REGIAO.latitude,
      longitude: REGIAO.longitude,
      quantidade: 5,
      maiorPrioridade: 'MEDIA',
    };
    assert.equal(idDe(itemNoToque([grupo], toque(5, 5), REGIAO, TELA)), '10:20');
  });

  it('sem o tamanho do mapa (antes do primeiro layout) não arrisca nada', () => {
    assert.equal(itemNoToque([ponto(7, 0, 0)], toque(0, 0), REGIAO, { largura: 0, altura: 0 }), null);
  });
});

describe('o que fazer com um toque no mapa', () => {
  it('ignora o eco do toque no ícone (o "marker-press" sobe até o mapa)', () => {
    assert.deepEqual(decidirToqueMapa('marker-press', ponto(7, 0, 0)), { tipo: 'ignorar' });
    assert.deepEqual(decidirToqueMapa('marker-press', null), { tipo: 'ignorar' });
  });

  it('um toque perto de um ícone abre esse ícone', () => {
    const item = ponto(7, 0, 0);
    assert.deepEqual(decidirToqueMapa('press', item), { tipo: 'item', item });
  });

  it('um toque num lugar vazio fecha o cartão', () => {
    assert.deepEqual(decidirToqueMapa('press', null), { tipo: 'fechar' });
    assert.deepEqual(decidirToqueMapa(undefined, null), { tipo: 'fechar' });
  });
});
