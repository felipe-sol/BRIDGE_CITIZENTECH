/**
 * Persistência local da identificação (AsyncStorage). O dado salvo é validado
 * ao ser lido, porque o armazenamento é uma fronteira externa como a rede.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Identificacao } from '../models/identificacao';
import { ErroFormato } from '../validation/guardas';
import { parseIdentificacao } from '../validation/respostas';

const CHAVE = 'bridge:identificacao:v1';

export class ErroArmazenamentoLocal extends Error {
  override name = 'ErroArmazenamentoLocal';
}

export async function lerIdentificacaoSalva(): Promise<Identificacao | null> {
  let bruto: string | null;
  try {
    bruto = await AsyncStorage.getItem(CHAVE);
  } catch {
    throw new ErroArmazenamentoLocal('Não foi possível ler os dados salvos neste aparelho.');
  }
  if (bruto === null) return null;

  try {
    const dados: unknown = JSON.parse(bruto);
    // Mesmo formato da API (snake_case), para reaproveitar o parser de fronteira.
    return parseIdentificacao(dados);
  } catch (erro: unknown) {
    if (erro instanceof SyntaxError || erro instanceof ErroFormato) {
      throw new ErroArmazenamentoLocal('A identificação salva neste aparelho está corrompida.');
    }
    throw erro;
  }
}

export async function salvarIdentificacao(identificacao: Identificacao): Promise<void> {
  const dados = { id: identificacao.id, apelido: identificacao.apelido, criado_em: identificacao.criadoEm };
  try {
    await AsyncStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch {
    throw new ErroArmazenamentoLocal('Não foi possível salvar a identificação neste aparelho.');
  }
}

export async function limparIdentificacao(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHAVE);
  } catch {
    throw new ErroArmazenamentoLocal('Não foi possível apagar a identificação deste aparelho.');
  }
}
