/**
 * Faixa fixa que rotula dados fictícios de demonstração. Aparece em todo lugar onde um
 * dado SIMULADO é exibido (modo Exemplo do Mapa e das Análises, folha da região e detalhe).
 */
import { StyleSheet, View } from 'react-native';

import { cores, espaco, fontes, raio } from '../theme/tema';
import { Icone } from './Icone';
import { Texto } from './Texto';

export function FaixaFicticia({ singular = false }: { singular?: boolean }) {
  const texto = singular ? 'DADO FICTÍCIO de demonstração' : 'DADOS FICTÍCIOS de demonstração';
  return (
    <View style={styles.faixa} accessible accessibilityRole="alert" accessibilityLabel={texto}>
      <Icone nome="flask-outline" tamanho={18} cor={cores.asfalto} />
      <Texto style={styles.texto}>{texto}</Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    borderRadius: raio.md,
    backgroundColor: cores.sinal, // amarelo de sinalização + texto asfalto (contraste ≈ 8:1)
    borderWidth: 2,
    borderColor: cores.asfalto,
    borderStyle: 'dashed',
  },
  texto: { flex: 1, fontFamily: fontes.black, fontSize: 13, letterSpacing: 0.4, color: cores.asfalto },
});
