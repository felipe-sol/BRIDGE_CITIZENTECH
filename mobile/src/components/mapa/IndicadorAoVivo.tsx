/** Selo "Ao vivo · Atualizado há X s", recalculado a cada segundo. */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { textoAtualizadoHa } from '../../geo/estadoMapa';
import { cores, espaco, fontes, sombra } from '../../theme/tema';
import { Texto } from '../Texto';

export function IndicadorAoVivo({ atualizadoEm, comErro }: { atualizadoEm: number | null; comErro: boolean }) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const temporizador = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(temporizador);
  }, []);

  return (
    <View style={[styles.selo, sombra.cartao]} accessible accessibilityLiveRegion="polite">
      <View style={[styles.ponto, comErro && styles.pontoErro]} />
      <Texto style={styles.texto}>
        {comErro ? 'Sem conexão · ' : 'Ao vivo · '}
        {textoAtualizadoHa(atualizadoEm, agora)}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: espaco.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: cores.papel,
  },
  ponto: { width: 9, height: 9, borderRadius: 5, backgroundColor: cores.ok },
  pontoErro: { backgroundColor: cores.alerta },
  texto: { fontFamily: fontes.extrabold, fontSize: 12, color: cores.asfalto },
});
