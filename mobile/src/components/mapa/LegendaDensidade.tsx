/** Legenda das faixas de densidade (cor + texto; a cor nunca vem sozinha). */
import { StyleSheet, View } from 'react-native';

import { CORES_DENSIDADE, ROTULOS_DENSIDADE, type ClasseDensidade } from '../../geo/densidade';
import { cores, espaco, raio, sombra } from '../../theme/tema';
import { Texto } from '../Texto';

const CLASSES: readonly ClasseDensidade[] = [1, 2, 3, 4];

export function LegendaDensidade() {
  return (
    <View style={[styles.caixa, sombra.cartao]} accessible accessibilityLabel="Legenda: ocorrências por quilômetro quadrado, de poucas a muitas">
      <Texto variante="placa">Ocorrências por km²</Texto>
      {CLASSES.map((c) => (
        <View key={c} style={styles.linha}>
          <View style={[styles.amostra, { backgroundColor: CORES_DENSIDADE[c] }]} />
          <Texto style={styles.texto}>{ROTULOS_DENSIDADE[c]}</Texto>
        </View>
      ))}
      <View style={styles.linha} accessible accessibilityLabel="Contorno tracejado vermelho: região em Alerta Bridge">
        <View style={styles.tracejado} />
        <Texto style={styles.texto}>Alerta Bridge</Texto>
      </View>
      <Texto variante="apoio" style={styles.nota}>
        Toque numa região para ver os números.
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { backgroundColor: cores.papel, borderRadius: raio.md, padding: espaco.md, gap: 6 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  amostra: { width: 22, height: 14, borderRadius: 3, borderWidth: 1, borderColor: cores.borda },
  tracejado: { width: 22, height: 14, borderRadius: 3, borderWidth: 2, borderColor: cores.alerta, borderStyle: 'dashed' },
  texto: { fontSize: 13 },
  nota: { fontSize: 12, lineHeight: 16 },
});
