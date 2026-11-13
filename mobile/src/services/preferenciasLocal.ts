/** Preferências do Perfil no AsyncStorage. Falha de armazenamento nunca quebra o app: vira o padrão. */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PREFERENCIAS_PADRAO, parsePreferencias, type Preferencias } from '../preferencias/preferencias';

const CHAVE = 'bridge:preferencias:v1';

export async function lerPreferencias(): Promise<Preferencias> {
  try {
    const salvo = await AsyncStorage.getItem(CHAVE);
    return salvo === null ? { ...PREFERENCIAS_PADRAO } : parsePreferencias(JSON.parse(salvo));
  } catch {
    return { ...PREFERENCIAS_PADRAO };
  }
}

export async function salvarPreferencias(preferencias: Preferencias): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAVE, JSON.stringify(preferencias));
  } catch {
    // Sem armazenamento, o ajuste vale só até fechar o app.
  }
}
