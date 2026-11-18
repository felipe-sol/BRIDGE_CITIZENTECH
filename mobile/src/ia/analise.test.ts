import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AnaliseIA, SugestaoIA } from '../models/ocorrencia.ts';
import {
  LIMIAR_INCERTA,
  LIMIAR_MINIMO_REGISTRO,
  ofereceTrocar,
  decidirSugestaoRegistro,
  descreverAnaliseIA,
  resumoSugestaoIA,
  sugestaoIncerta,
  textoSugestaoRegistro,
} from './analise.ts';

function concluida(categoriaSugerida: string, confianca: number | null): AnaliseIA {
  return {
    status: 'CONCLUIDA',
    categoriaSugerida,
    confianca,
    versaoModelo: 'bridge-text-classifier-1.0.0',
    analisadaEm: '2026-11-17T22:00:00Z',
  };
}

const INDISPONIVEL: AnaliseIA = { status: 'INDISPONIVEL', categoriaSugerida: null, confianca: null, versaoModelo: null, analisadaEm: null };

describe('sugestão da IA: quando é "incerta"', () => {
  it('abaixo de 50% é incerta; 50% em diante, não', () => {
    assert.equal(LIMIAR_INCERTA, 0.5);
    assert.equal(sugestaoIncerta(0.49), true);
    assert.equal(sugestaoIncerta(0.5), false);
    assert.equal(sugestaoIncerta(0.92), false);
  });

  it('sem confiança informada pelo modelo, não chama de incerta (não inventa)', () => {
    assert.equal(sugestaoIncerta(null), false);
  });
});

describe('texto da análise no detalhe', () => {
  it('sugestão confiante: categoria pelo nome e a confiança', () => {
    const { titulo, texto } = descreverAnaliseIA(concluida('ILUMINACAO_DEFEITUOSA', 0.92));
    assert.equal(titulo, 'Sugestão da IA');
    assert.match(texto, /^Categoria sugerida: Iluminação defeituosa\./);
    assert.match(texto, /Confiança informada pelo modelo: 92%\./);
    assert.doesNotMatch(texto, /palpite/);
  });

  it('sugestão incerta: avisa no título e no texto', () => {
    const { titulo, texto } = descreverAnaliseIA(concluida('BURACO', 0.4));
    assert.equal(titulo, 'Sugestão da IA (incerta)');
    assert.match(texto, /Confiança informada pelo modelo: 40%\./);
    assert.match(texto, /Confiança baixa: é só um palpite\./);
  });

  it('sem confiança: não mostra porcentagem', () => {
    const { texto } = descreverAnaliseIA(concluida('BURACO', null));
    assert.doesNotMatch(texto, /Confiança/);
  });

  it('categoria que o app não conhece aparece como veio, sem quebrar', () => {
    assert.match(descreverAnaliseIA(concluida('ALAGAMENTO', 0.8)).texto, /Categoria sugerida: ALAGAMENTO\./);
  });

  it('indisponível: diz que não havia modelo quando a ocorrência foi registrada', () => {
    assert.deepEqual(descreverAnaliseIA(INDISPONIVEL), {
      titulo: 'Análise de IA indisponível',
      texto:
        'Não havia modelo de IA ativo no servidor quando esta ocorrência foi registrada. Ela segue normalmente para a equipe responsável.',
    });
  });
});

describe('linha curta da sugestão no cartão do mapa', () => {
  it('confiante e incerta', () => {
    assert.equal(resumoSugestaoIA(concluida('ILUMINACAO_DEFEITUOSA', 0.92)), 'Sugestão da IA: Iluminação defeituosa (92%)');
    assert.equal(resumoSugestaoIA(concluida('BURACO', 0.4)), 'Sugestão da IA (incerta): Buraco (40%)');
    assert.equal(resumoSugestaoIA(concluida('BURACO', null)), 'Sugestão da IA: Buraco');
  });

  it('sem análise concluída, o cartão não mostra linha nenhuma', () => {
    assert.equal(resumoSugestaoIA(INDISPONIVEL), null);
    assert.equal(resumoSugestaoIA({ ...INDISPONIVEL, status: 'FALHOU' }), null);
  });
});

describe('sugestão da IA na revisão do registro', () => {
  function sugestao(categoriaSugerida: string | null, confianca: number | null, disponivel = true): SugestaoIA {
    return { disponivel, categoriaSugerida, confianca, versaoModelo: 'bridge-text-classifier-1.0.0' };
  }

  it('sem modelo, sem categoria ou com categoria desconhecida: não mostra nada', () => {
    assert.deepEqual(decidirSugestaoRegistro('BURACO', sugestao(null, null, false)), { tipo: 'nada' });
    assert.deepEqual(decidirSugestaoRegistro('BURACO', sugestao(null, 0.9)), { tipo: 'nada' });
    assert.deepEqual(decidirSugestaoRegistro('BURACO', sugestao('ALAGAMENTO', 0.9)), { tipo: 'nada' });
  });

  it('a IA concorda com a categoria escolhida', () => {
    assert.deepEqual(decidirSugestaoRegistro('BURACO', sugestao('BURACO', 0.78)), {
      tipo: 'concorda',
      categoria: 'BURACO',
      confianca: 0.78,
    });
  });

  it('a IA sugere outra categoria com confiança: oferece trocar', () => {
    assert.deepEqual(decidirSugestaoRegistro('CALCADA_DANIFICADA', sugestao('BURACO', 0.78)), {
      tipo: 'sugere',
      categoria: 'BURACO',
      confianca: 0.78,
    });
  });

  it('a IA sugere outra categoria com pouca confiança: é um palpite (a pessoa ainda pode trocar)', () => {
    assert.deepEqual(decidirSugestaoRegistro('CALCADA_DANIFICADA', sugestao('BURACO', 0.4)), {
      tipo: 'incerta',
      categoria: 'BURACO',
      confianca: 0.4,
    });
  });

  it('abaixo de 30% a IA está chutando: não mostra nada (com 5 categorias, o acaso dá 20%)', () => {
    assert.equal(LIMIAR_MINIMO_REGISTRO, 0.3);
    assert.deepEqual(decidirSugestaoRegistro('CALCADA_DANIFICADA', sugestao('BURACO', 0.25)), { tipo: 'nada' });
    assert.deepEqual(decidirSugestaoRegistro('BURACO', sugestao('BURACO', 0.25)), { tipo: 'nada' });
    assert.equal(decidirSugestaoRegistro('CALCADA_DANIFICADA', sugestao('BURACO', 0.3)).tipo, 'incerta');
  });

  it('o botão de trocar aparece quando a IA discorda, com ou sem certeza', () => {
    assert.equal(ofereceTrocar({ tipo: 'sugere', categoria: 'BURACO', confianca: 0.78 }), true);
    assert.equal(ofereceTrocar({ tipo: 'incerta', categoria: 'BURACO', confianca: 0.44 }), true);
    assert.equal(ofereceTrocar({ tipo: 'concorda', categoria: 'BURACO', confianca: 0.78 }), false);
    assert.equal(ofereceTrocar({ tipo: 'nada' }), false);
  });

  it('textos de cada caso', () => {
    assert.equal(textoSugestaoRegistro({ tipo: 'nada' }), null);
    assert.deepEqual(textoSugestaoRegistro({ tipo: 'concorda', categoria: 'BURACO', confianca: 0.78 }), {
      titulo: 'A IA concorda',
      texto: 'Pelo que você escreveu, a IA também acha que é Buraco (78%).',
    });
    assert.deepEqual(textoSugestaoRegistro({ tipo: 'sugere', categoria: 'BURACO', confianca: 0.78 }), {
      titulo: 'A IA sugere outra categoria',
      texto: 'Pelo que você escreveu, a IA acha que é Buraco (78%). Você pode trocar ou manter a sua escolha.',
    });
    assert.deepEqual(textoSugestaoRegistro({ tipo: 'incerta', categoria: 'BURACO', confianca: 0.4 }), {
      titulo: 'Palpite da IA',
      texto: 'A IA acha que pode ser Buraco, mas com pouca confiança (40%). Troque só se fizer sentido para você.',
    });
  });
});
