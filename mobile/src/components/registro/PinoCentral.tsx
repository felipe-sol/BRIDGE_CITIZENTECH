/**
 * Pino fixo no centro do mapa: a pessoa arrasta o MAPA até o lugar exato
 * (mais fácil e preciso que arrastar um marcador pequeno com o dedo).
 * A ponta do pino fica exatamente no centro.
 */
import { StyleSheet, View } from 'react-native';

import { cores } from '../../theme/tema';

const TAMANHO = 44;

export function PinoCentral() {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.camada]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.pino}>
        <View style={styles.cabeca}>
          <View style={styles.miolo} />
        </View>
        <View style={styles.haste} />
      </View>
      <View style={styles.sombra} />
    </View>
  );
}

const styles = StyleSheet.create({
  camada: { alignItems: 'center', justifyContent: 'center' },
  // Sobe o pino para a ponta da haste coincidir com o centro.
  pino: { alignItems: 'center', transform: [{ translateY: -TAMANHO / 2 - 4 }] },
  cabeca: {
    width: TAMANHO * 0.62,
    height: TAMANHO * 0.62,
    borderRadius: TAMANHO,
    backgroundColor: cores.sinal,
    borderWidth: 3,
    borderColor: cores.asfalto,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miolo: { width: 8, height: 8, borderRadius: 4, backgroundColor: cores.asfalto },
  haste: { width: 3, height: TAMANHO * 0.42, backgroundColor: cores.asfalto, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  sombra: { position: 'absolute', width: 10, height: 4, borderRadius: 5, backgroundColor: 'rgba(31, 42, 48, 0.35)' },
});
