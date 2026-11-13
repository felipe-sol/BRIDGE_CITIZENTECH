/** Número de destaque da aba Análises (um indicador não precisa de gráfico). */
import { StyleSheet, View } from 'react-native';

import { cores, espaco, fontes, raio } from '../../theme/tema';
import { Texto } from '../Texto';

export function Indicador({ valor, rotulo, nota }: { valor: string; rotulo: string; nota?: string }) {
  return (
    <View style={styles.caixa} accessible accessibilityLabel={`${rotulo}: ${valor}${nota ? `. ${nota}` : ''}`}>
      <Texto style={styles.valor} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Texto>
      <Texto variante="placa">{rotulo}</Texto>
      {nota ? <Texto style={styles.nota}>{nota}</Texto> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: cores.papel,
    borderRadius: raio.md,
    padding: espaco.md,
    gap: 2,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  valor: { fontFamily: fontes.black, fontSize: 30, lineHeight: 36, color: cores.asfalto },
  nota: { fontFamily: fontes.semibold, fontSize: 12, lineHeight: 16, color: cores.textoSuave },
});
