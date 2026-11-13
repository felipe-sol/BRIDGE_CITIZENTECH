import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Prioridade } from '../models/ocorrencia.ts';
import { parseRegioes } from '../validation/regioes.ts';
import { agruparPontos } from './agrupamento.ts';
import amostra from './amostra-regioes.json' with { type: 'json' };
import { CORES_DENSIDADE, COR_SEM_DADOS, classeDensidade, corDaRegiao } from './densidade.ts';
import { aplicarResultadoMapa, avisoFalhaMapa, textoAtualizadoHa } from './estadoMapa.ts';
import { montarEndereco } from './endereco.ts';
import { interpretarModo, origemDoModo } from './modo.ts';
import {
  CENTRO_SP,
  caixaDaRegiao,
  distanciaMetros,
  formatarDistancia,
  regiaoDaCaixa,
  regiaoDaEtapaLocal,
  regiaoInicial,
} from './distancia.ts';
import { paraPontoMapa } from './pontos.ts';
import { buscarRegioes, localizarRegiao, normalizarBusca } from './regioes.ts';
import type { PontoMapa } from './tipos.ts';

// Amostra real (GeoSampa, simplificada): Sé (09), Pinheiros (11) e Vila Mariana (12).
const regs = parseRegioes(amostra);

/** Pontos pseudoaleatórios determinísticos em volta de um centro (gerador linear congruente). */
function gerarPontos(quantidade: number, centro: { latitude: number; longitude: number }, raioGraus: number): PontoMapa[] {
  let semente = 42;
  const aleatorio = () => {
    semente = (semente * 1_103_515_245 + 12_345) % 2_147_483_648;
    return semente / 2_147_483_648;
  };
  return Array.from({ length: quantidade }, (_, i) => ({
    id: i + 1,
    latitude: centro.latitude + (aleatorio() * 2 - 1) * raioGraus,
    longitude: centro.longitude + (aleatorio() * 2 - 1) * raioGraus,
    categoria: 'BURACO',
    prioridade: 'MEDIA',
    status: 'ABERTA',
    titulo: `Ponto ${i + 1}`,
    confirmacoes: 0,
  }));
}

describe('regiões', () => {
  it('localiza pontos reais e devolve null fora de SP', () => {
    assert.equal(localizarRegiao({ latitude: -23.5503, longitude: -46.634 }, regs)?.codigo, '09'); // Praça da Sé
    assert.equal(localizarRegiao({ latitude: -23.5874, longitude: -46.6576 }, regs)?.codigo, '12'); // Ibirapuera
    assert.equal(localizarRegiao({ latitude: -22.9068, longitude: -43.1729 }, regs), null); // Rio de Janeiro
  });

  it('lê nome de exibição, área e caixa', () => {
    const se = regs.find((r) => r.codigo === '09');
    assert.ok(se);
    assert.equal(se.nome, 'Sé');
    assert.equal(se.nomeOficial, 'SE');
    assert.ok(se.areaKm2 > 20 && se.areaKm2 < 30);
    assert.ok(se.caixa.minLon < se.centro.longitude && se.centro.longitude < se.caixa.maxLon);
  });

  it('rejeita resposta fora do formato', () => {
    assert.throws(() => parseRegioes({ type: 'FeatureCollection', features: [{ properties: {} }] }));
    assert.throws(() => parseRegioes(null));
  });

  it('busca sem acento, com mínimo de 2 letras', () => {
    assert.equal(normalizarBusca('  São   Miguel '), 'sao miguel');
    assert.deepEqual(
      buscarRegioes('pinh', regs).map((r) => r.codigo),
      ['11'],
    );
    assert.deepEqual(
      buscarRegioes('SÉ', regs).map((r) => r.codigo),
      ['09'],
    );
    assert.deepEqual(buscarRegioes('v', regs), []);
  });
});

describe('agrupamento de pontos', () => {
  it('limita a 64 itens com zoom afastado e preserva a contagem', () => {
    const mil = gerarPontos(1000, CENTRO_SP, 0.2);
    const itens = agruparPontos(mil, { ...CENTRO_SP, latitudeDelta: 0.4, longitudeDelta: 0.4 });
    assert.ok(itens.length <= 64, `${itens.length} itens`);
    assert.equal(
      itens.reduce((soma, item) => soma + (item.tipo === 'grupo' ? item.quantidade : 1), 0),
      1000,
    );
  });

  it('com zoom próximo não agrupa', () => {
    const poucos = gerarPontos(30, CENTRO_SP, 0.004);
    const itens = agruparPontos(poucos, { ...CENTRO_SP, latitudeDelta: 0.01, longitudeDelta: 0.01 });
    assert.equal(itens.length, 30);
    assert.ok(itens.every((item) => item.tipo === 'ponto'));
  });

  it('o grupo herda a maior prioridade', () => {
    const base = gerarPontos(3, CENTRO_SP, 0.0001);
    const prioridades: Prioridade[] = ['MEDIA', 'ALTA', 'BAIXA'];
    const pontos = base.map((p, i) => ({ ...p, prioridade: prioridades[i] ?? 'MEDIA' }));
    const itens = agruparPontos(pontos, { ...CENTRO_SP, latitudeDelta: 0.4, longitudeDelta: 0.4 });
    assert.equal(itens.length, 1);
    const unico = itens[0];
    assert.ok(unico && unico.tipo === 'grupo');
    assert.equal(unico.quantidade, 3);
    assert.equal(unico.maiorPrioridade, 'ALTA');
  });
});

describe('distâncias e região inicial', () => {
  it('mede e formata distâncias', () => {
    const d = distanciaMetros({ latitude: -23.55, longitude: -46.63 }, { latitude: -23.551, longitude: -46.63 });
    assert.ok(Math.abs(d - 111.2) < 1, String(d));
    assert.equal(formatarDistancia(40), '40 m');
    assert.equal(formatarDistancia(999.4), '999 m');
    assert.equal(formatarDistancia(1234), '1,2 km');
  });

  it('sem permissão de localização, abre no centro de São Paulo', () => {
    const centro = { ...CENTRO_SP, latitudeDelta: 0.25, longitudeDelta: 0.25 };
    assert.deepEqual(regiaoInicial({ tipo: 'sem_permissao', podePerguntarDeNovo: true }), centro);
    assert.deepEqual(regiaoInicial({ tipo: 'servico_desligado' }), centro);
    assert.deepEqual(regiaoInicial(null), centro);
  });

  it('com localização, abre perto da pessoa', () => {
    const r = regiaoInicial({ tipo: 'ok', latitude: -23.6, longitude: -46.7, precisaoMetros: 10 });
    assert.deepEqual(r, { latitude: -23.6, longitude: -46.7, latitudeDelta: 0.02, longitudeDelta: 0.02 });
  });

  it('ao voltar à etapa Local, reabre no ponto já escolhido (não no centro da cidade)', () => {
    assert.deepEqual(regiaoDaEtapaLocal(null), regiaoInicial(null));
    assert.deepEqual(regiaoDaEtapaLocal({ latitude: -23.561, longitude: -46.691 }), {
      latitude: -23.561,
      longitude: -46.691,
      latitudeDelta: 0.004,
      longitudeDelta: 0.004,
    });
  });

  it('converte a área visível em caixa', () => {
    assert.deepEqual(caixaDaRegiao({ latitude: -23.5, longitude: -46.6, latitudeDelta: 0.2, longitudeDelta: 0.4 }), {
      minLon: -46.8,
      minLat: -23.6,
      maxLon: -46.4,
      maxLat: -23.4,
    });
  });
});

describe('densidade', () => {
  it('classifica ocorrências por km² em 5 faixas fixas', () => {
    assert.deepEqual([0, 0.3, 0.5, 1, 2, 3, 5, 9].map(classeDensidade), [0, 1, 1, 2, 2, 3, 3, 4]);
  });

  it('região sem estatística carregada não é pintada como "Nenhuma"', () => {
    assert.equal(corDaRegiao(undefined), COR_SEM_DADOS);
    assert.notEqual(COR_SEM_DADOS, CORES_DENSIDADE[0]);
    assert.equal(corDaRegiao(0), CORES_DENSIDADE[0]);
    assert.equal(corDaRegiao(3), CORES_DENSIDADE[3]);
  });
});

describe('endereço legível', () => {
  it('monta "Rua, número — Bairro" e omite o que falta', () => {
    assert.equal(
      montarEndereco({ rua: 'Rua dos Pinheiros', numero: '870', bairro: 'Pinheiros' }),
      'Rua dos Pinheiros, 870 — Pinheiros',
    );
    assert.equal(montarEndereco({ rua: 'Rua X', numero: null, bairro: null }), 'Rua X');
    assert.equal(montarEndereco({ rua: null, numero: '10', bairro: 'Sé' }), 'Sé');
    assert.equal(montarEndereco({ rua: '  ', numero: null, bairro: null }), null);
    assert.equal(montarEndereco({ rua: null, numero: null, bairro: null }), null);
  });

  it('nunca passa de 200 caracteres', () => {
    const longo = montarEndereco({ rua: 'R'.repeat(300), numero: '1', bairro: 'B' }) ?? '';
    assert.equal(longo.length, 200);
    assert.ok(longo.endsWith('…'));
  });
});

describe('ponto do mapa a partir da ocorrência', () => {
  it('copia só o que o marcador precisa', () => {
    const ponto = paraPontoMapa({
      id: 7,
      titulo: 'Buraco',
      descricao: 'Buraco fundo na via.',
      categoria: 'BURACO',
      latitude: -23.5,
      longitude: -46.6,
      endereco: null,
      subprefeitura: null,
      confirmacoes: 3,
      origem: 'APP',
      riscoImediato: false,
      bloqueiaPassagem: false,
      afetaAcessibilidade: false,
      status: 'EM_ANALISE',
      prioridade: 'BAIXA',
      prioridadePontuacao: 3,
      prioridadeJustificativa: 'Total 3/10 → BAIXA.',
      imagemUrl: null,
      analiseIa: { status: 'INDISPONIVEL', categoriaSugerida: null, confianca: null, versaoModelo: null, analisadaEm: null },
      criadoEm: '2026-11-12T10:00:00Z',
      atualizadoEm: '2026-11-12T10:00:00Z',
    });
    assert.deepEqual(ponto, {
      id: 7,
      latitude: -23.5,
      longitude: -46.6,
      categoria: 'BURACO',
      prioridade: 'BAIXA',
      status: 'EM_ANALISE',
      titulo: 'Buraco',
      confirmacoes: 3,
    });
  });
});

describe('estado do mapa ao vivo', () => {
  it('erro de atualização preserva os dados anteriores', () => {
    const chave = 'aovivo|';
    const a = aplicarResultadoMapa<number[]>(
      { dados: null, atualizadoEm: null, erro: null, chave: null },
      { ok: true, dados: [1], agora: 1000, chave },
      chave,
    );
    const b = aplicarResultadoMapa(a, { ok: false, erro: 'Sem conexão', chave }, chave);
    assert.deepEqual(b, { dados: [1], atualizadoEm: 1000, erro: 'Sem conexão', chave });
    const c = aplicarResultadoMapa(b, { ok: true, dados: [2], agora: 2000, chave }, chave);
    assert.deepEqual(c, { dados: [2], atualizadoEm: 2000, erro: null, chave });
  });

  it('resposta atrasada de outro modo ou filtro é descartada (não mistura real e fictício)', () => {
    const atual = { dados: [1], atualizadoEm: 1000, erro: null, chave: 'aovivo|' };
    assert.equal(aplicarResultadoMapa(atual, { ok: true, dados: [9, 9], agora: 2000, chave: 'exemplo|' }, 'aovivo|'), atual);
    assert.equal(aplicarResultadoMapa(atual, { ok: false, erro: 'x', chave: 'exemplo|' }, 'aovivo|'), atual);
  });

  it('falha sem nenhum dado não deixa o mapa vazio parecer "nada registrado"', () => {
    assert.equal(avisoFalhaMapa({ dados: [1], atualizadoEm: 1000, erro: null, chave: null }), null);
    assert.equal(
      avisoFalhaMapa({ dados: [1], atualizadoEm: 1000, erro: 'Sem conexão', chave: null }),
      'Sem conexão com o servidor. Mostrando os últimos dados.',
    );
    assert.equal(
      avisoFalhaMapa({ dados: null, atualizadoEm: null, erro: 'Sem conexão', chave: null }),
      'Não foi possível carregar os dados do mapa. Tentando de novo automaticamente.',
    );
  });

  it('diz há quanto tempo foi a última atualização', () => {
    assert.equal(textoAtualizadoHa(null, 10_000), 'Atualizando…');
    assert.equal(textoAtualizadoHa(10_000, 12_000), 'Atualizado agora');
    assert.equal(textoAtualizadoHa(10_000, 25_000), 'Atualizado há 15 s');
    assert.equal(textoAtualizadoHa(10_000, 190_000), 'Atualizado há 3 min');
  });
});

describe('enquadrar uma região', () => {
  it('centraliza na caixa com uma folga de 15%', () => {
    assert.deepEqual(regiaoDaCaixa({ minLon: -46.7, minLat: -23.6, maxLon: -46.5, maxLat: -23.5 }), {
      latitude: -23.55,
      longitude: -46.6,
      latitudeDelta: 0.115,
      longitudeDelta: 0.23,
    });
  });
});

describe('modo dos dados (Ao vivo ou Exemplo)', () => {
  it('abre sempre no Ao vivo, salvo pedido explícito do Exemplo', () => {
    assert.equal(interpretarModo('exemplo'), 'exemplo');
    assert.equal(interpretarModo('aovivo'), 'aovivo');
    assert.equal(interpretarModo(undefined), 'aovivo');
    assert.equal(interpretarModo(['exemplo']), 'aovivo');
    assert.equal(interpretarModo('EXEMPLO'), 'aovivo');
  });

  it('Exemplo consulta só os fictícios; Ao vivo só os reais', () => {
    assert.equal(origemDoModo('exemplo'), 'SIMULADA');
    assert.equal(origemDoModo('aovivo'), 'APP');
  });
});
