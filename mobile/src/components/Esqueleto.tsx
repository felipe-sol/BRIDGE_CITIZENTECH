/**
 * Placeholder de carregamento: blocos cinza que pulsam. Respeita a opção
 * "reduzir movimento" do sistema (fica parado). Leitores de tela ouvem "Carregando".
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';

import { cores, espaco, raio } from '../theme/tema';

const LARGURAS = ['100%', '82%', '64%'] as const;

interface PropsEsqueleto {
  linhas?: number;
  altura?: number;
}

export function Esqueleto({ linhas = 3, altura = 16 }: PropsEsqueleto) {
  // useState com inicializador: um único Animated.Value por componente, sem ler ref no render.
  const [opacidade] = useState(() => new Animated.Value(0.55));

  useEffect(() => {
    let animacao: Animated.CompositeAnimation | null = null;
    let ativo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduzir) => {
        if (!ativo || reduzir) return;
        animacao = Animated.loop(
          Animated.sequence([
            Animated.timing(opacidade, { toValue: 1, duration: 650, useNativeDriver: true }),
            Animated.timing(opacidade, { toValue: 0.55, duration: 650, useNativeDriver: true }),
          ]),
        );
        animacao.start();
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
      animacao?.stop();
    };
  }, [opacidade]);

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Carregando" style={styles.lista}>
      {Array.from({ length: linhas }, (_, i) => (
        <Animated.View
          key={i}
          style={[styles.bloco, { height: altura, width: LARGURAS[i % LARGURAS.length], opacity: opacidade }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: espaco.sm },
  bloco: { backgroundColor: cores.borda, borderRadius: raio.sm },
});
