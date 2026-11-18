/** Sugestão da IA durante o registro (POST /ia/sugestao-categoria). Não grava nada no servidor. */
import type { NovaOcorrencia, SugestaoIA } from '../models/ocorrencia';
import { parseSugestaoIA } from '../validation/respostas';
import { requisitarJson } from './http';

/** A sugestão é um extra: se demorar, o registro segue sem ela. */
const TEMPO_LIMITE_SUGESTAO_MS = 8_000;

export function sugerirCategoria(dados: Omit<NovaOcorrencia, 'identificacaoId' | 'endereco'>): Promise<SugestaoIA> {
  return requisitarJson('/ia/sugestao-categoria', parseSugestaoIA, {
    metodo: 'POST',
    corpo: {
      titulo: dados.titulo,
      descricao: dados.descricao,
      categoria: dados.categoria,
      latitude: dados.latitude,
      longitude: dados.longitude,
      risco_imediato: dados.riscoImediato,
      bloqueia_passagem: dados.bloqueiaPassagem,
      afeta_acessibilidade: dados.afetaAcessibilidade,
    },
    tempoLimiteMs: TEMPO_LIMITE_SUGESTAO_MS,
  });
}
