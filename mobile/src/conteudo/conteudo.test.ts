import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { textoEquipe } from './equipe.ts';
import { PAGINAS, interpretarPagina } from './paginas.ts';

describe('páginas informativas do Perfil', () => {
  it('cada página tem título e ao menos 2 seções com texto', () => {
    for (const pagina of Object.values(PAGINAS)) {
      assert.ok(pagina.titulo.length > 0);
      assert.ok(pagina.secoes.length >= 2);
      assert.ok(pagina.secoes.every((s) => s.texto.trim().length > 20));
    }
  });

  it('alertas cita os limites e diz que não é oficial; prioridade diz que não é avaliação oficial', () => {
    const alertas = PAGINAS.alertas.secoes.map((s) => s.texto).join(' ');
    assert.ok(alertas.includes('45') && alertas.includes('90'));
    assert.ok(alertas.includes('Alerta Bridge: calculado automaticamente a partir dos relatos'));
    assert.ok(alertas.includes('não é alerta oficial'));
    assert.ok(PAGINAS.prioridade.secoes.some((s) => s.texto.includes('não é avaliação oficial')));
    assert.ok(PAGINAS.privacidade.secoes.some((s) => s.texto.includes('cabeçalho')));
  });

  it('aceita só as quatro páginas', () => {
    assert.equal(interpretarPagina('alertas'), 'alertas');
    assert.equal(interpretarPagina(['equipe']), 'equipe');
    assert.equal(interpretarPagina('x'), null);
    assert.equal(interpretarPagina(undefined), null);
  });
});

describe('equipe vinda do package.json', () => {
  it('com marcador PREENCHER não mostra nome nenhum', () => {
    assert.deepEqual(textoEquipe([{ name: 'PREENCHER: nome', rm: 'PREENCHER' }, { name: 'Ana Souza', rm: '1' }]), {
      pendente: true,
    });
  });

  it('com todos os nomes preenchidos devolve os nomes', () => {
    assert.deepEqual(textoEquipe([{ name: 'Ana Souza', rm: '1' }, { name: 'Bruno Lima', rm: '2' }]), {
      nomes: ['Ana Souza', 'Bruno Lima'],
    });
  });

  it('formato inesperado conta como pendente', () => {
    assert.deepEqual(textoEquipe(undefined), { pendente: true });
    assert.deepEqual(textoEquipe([]), { pendente: true });
    assert.deepEqual(textoEquipe([{ nome: 'Sem campo name' }]), { pendente: true });
  });
});
