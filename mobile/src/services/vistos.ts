/**
 * Quando a pessoa abriu cada ocorrência pela última vez (só no aparelho), para o
 * selo "Atualizada". Falhas de armazenamento nunca quebram a tela: viram "nada visto".
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE = 'bridge:vistos:v1';

export async function lerVistos(): Promise<Readonly<Record<string, string>>> {
  try {
    const salvo = await AsyncStorage.getItem(CHAVE);
    if (salvo === null) return {};
    const dados: unknown = JSON.parse(salvo);
    if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) return {};
    return Object.fromEntries(
      Object.entries(dados).filter((par): par is [string, string] => typeof par[1] === 'string'),
    );
  } catch {
    return {};
  }
}

/** Guarda o `atualizadoEm` que a pessoa acabou de ver. */
export async function marcarVisto(id: number, atualizadoEm: string): Promise<void> {
  try {
    const atuais = await lerVistos();
    await AsyncStorage.setItem(CHAVE, JSON.stringify({ ...atuais, [String(id)]: atualizadoEm }));
  } catch {
    // Sem armazenamento, o selo só fica menos preciso.
  }
}
