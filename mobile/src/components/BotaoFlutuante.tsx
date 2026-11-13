/** Ação principal flutuante (amarelo de sinalização), com vibração leve ao tocar. */
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ALVO_TOQUE, cores, espaco, fontes, sombra } from '../theme/tema';
import { Icone } from './Icone';
import { Texto } from './Texto';

interface PropsBotaoFlutuante {
  rotulo: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function BotaoFlutuante({ rotulo, onPress, style }: PropsBotaoFlutuante) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={() => {
        // Vibração é só um reforço: se o aparelho não suportar, a ação segue.
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onPress();
      }}
      style={({ pressed }) => [styles.botao, sombra.cartao, pressed && styles.pressionado, style]}
    >
      <Icone nome="plus" tamanho={24} />
      <Texto style={styles.rotulo}>{rotulo}</Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    minHeight: ALVO_TOQUE + 8,
    paddingHorizontal: espaco.lg + 2,
    borderRadius: 999,
    backgroundColor: cores.sinal,
    borderWidth: 2,
    borderColor: cores.asfalto,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
  },
  pressionado: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  rotulo: { fontFamily: fontes.black, fontSize: 16, color: cores.asfalto },
});
