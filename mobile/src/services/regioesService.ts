/**
 * Limites das 32 subprefeituras (GET /regioes). Dado oficial que quase não muda:
 * fica em memória e no aparelho; a rede só é usada na primeira vez.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RegiaoSP } from '../geo/tipos';
import { parseRegioes } from '../validation/regioes';
import { requisitarJson } from './http';

const CHAVE = 'bridge:regioes:v1';

let emMemoria: RegiaoSP[] | null = null;

async function lerDoAparelho(): Promise<RegiaoSP[] | null> {
  try {
    const salvo = await AsyncStorage.getItem(CHAVE);
    return salvo === null ? null : parseRegioes(JSON.parse(salvo));
  } catch {
    return null; // cópia corrompida ou ilegível: baixa de novo
  }
}

export async function carregarRegioes(): Promise<RegiaoSP[]> {
  if (emMemoria) return emMemoria;
  const salvas = await lerDoAparelho();
  if (salvas) {
    emMemoria = salvas;
    return salvas;
  }
  const { regioes, bruto } = await requisitarJson('/regioes', (dados) => ({ regioes: parseRegioes(dados), bruto: dados }));
  emMemoria = regioes;
  // Guardar é só otimização: se falhar, o app segue com o que baixou.
  AsyncStorage.setItem(CHAVE, JSON.stringify(bruto)).catch(() => undefined);
  return regioes;
}
