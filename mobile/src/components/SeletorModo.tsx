/**
 * Ao vivo (dados reais) × Exemplo (dados fictícios de 4 meses). Um toque em "Ao vivo"
 * volta ao real; o app sempre abre no Ao vivo.
 */
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ModoDados } from '../geo/modo';
import { ALVO_TOQUE, cores, espaco, fontes, sombra } from '../theme/tema';
import { Texto } from './Texto';

const ROTULOS: Record<ModoDados, string> = { aovivo: 'Ao vivo', exemplo: 'Exemplo · 4 meses' };

export function SeletorModo({ modo, onMudar }: { modo: ModoDados; onMudar: (m: ModoDados) => void }) {
  return (
    <View style={[styles.seletor, sombra.cartao]} accessibilityRole="tablist">
      {(['aovivo', 'exemplo'] as const).map((m) => (
        <Pressable
          key={m}
          accessibilityRole="tab"
          accessibilityState={{ selected: modo === m }}
          accessibilityHint={m === 'exemplo' ? 'Mostra dados fictícios de demonstração' : 'Mostra os registros reais'}
          onPress={() => {
            if (m === modo) return;
            Haptics.selectionAsync().catch(() => undefined);
            onMudar(m);
          }}
          style={[styles.opcao, modo === m && (m === 'exemplo' ? styles.marcadaExemplo : styles.marcada)]}
        >
          <Texto style={[styles.texto, modo === m && styles.textoMarcado, modo === m && m === 'exemplo' && styles.textoExemplo]}>
            {ROTULOS[m]}
          </Texto>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  seletor: { flexDirection: 'row', backgroundColor: cores.papel, borderRadius: 999, padding: 3, alignSelf: 'flex-start' },
  opcao: { minHeight: ALVO_TOQUE - 8, paddingHorizontal: espaco.md, borderRadius: 999, justifyContent: 'center' },
  marcada: { backgroundColor: cores.placa },
  marcadaExemplo: { backgroundColor: cores.sinal },
  texto: { fontFamily: fontes.extrabold, fontSize: 13, color: cores.asfalto },
  textoMarcado: { color: cores.papel },
  textoExemplo: { color: cores.asfalto },
});
