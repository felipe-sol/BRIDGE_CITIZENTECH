/**
 * Gravidade por FORMA e cor (nunca só cor): ◆ alta, ● média, ■ baixa.
 * Mesmo código visual do mapa, das listas e do detalhe.
 */
import { StyleSheet, View } from 'react-native';

import { ROTULO_PRIORIDADE, type Prioridade } from '../models/ocorrencia';
import { cores } from '../theme/tema';

interface PropsMarcador {
  prioridade: Prioridade;
  tamanho?: number;
}

export function MarcadorGravidade({ prioridade, tamanho = 16 }: PropsMarcador) {
  const rotulo = `Gravidade ${ROTULO_PRIORIDADE[prioridade].toLowerCase()}`;
  if (prioridade === 'ALTA') {
    // Losango: quadrado girado 45°, um pouco menor para ocupar a mesma caixa.
    const lado = Math.round(tamanho * 0.74);
    return (
      <View style={[styles.caixa, { width: tamanho, height: tamanho }]} accessible accessibilityLabel={rotulo}>
        <View style={[styles.alta, { width: lado, height: lado }]} />
      </View>
    );
  }
  return (
    <View
      accessible
      accessibilityLabel={rotulo}
      style={[
        prioridade === 'MEDIA' ? styles.media : styles.baixa,
        { width: tamanho, height: tamanho, borderRadius: prioridade === 'MEDIA' ? tamanho / 2 : 2 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  caixa: { alignItems: 'center', justifyContent: 'center' },
  alta: { backgroundColor: cores.alerta, borderWidth: 1.5, borderColor: cores.papel, transform: [{ rotate: '45deg' }] },
  media: { backgroundColor: cores.sinal, borderWidth: 1.5, borderColor: cores.asfalto },
  baixa: { backgroundColor: cores.placa, borderWidth: 1.5, borderColor: cores.papel },
});
