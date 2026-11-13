/**
 * Cabeçalho no formato das placas de rua de São Paulo: fundo azul, filete branco,
 * nome em caixa alta. Mostra onde a pessoa está (bairro e subprefeitura).
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ALVO_TOQUE, cores, espaco, fontes, raio } from '../theme/tema';
import { Icone } from './Icone';
import { Texto } from './Texto';

interface PropsCabecalhoPlaca {
  titulo: string;
  subtitulo: string;
  acao?: { titulo: string; onPress: () => void };
}

export function CabecalhoPlaca({ titulo, subtitulo, acao }: PropsCabecalhoPlaca) {
  return (
    <View style={styles.moldura} accessibilityRole="header">
      <View style={styles.placa}>
        <View style={styles.linha}>
          <Icone nome="map-marker-outline" cor={cores.papel} tamanho={22} />
          <Texto style={styles.titulo} numberOfLines={1} adjustsFontSizeToFit>
            {titulo.toLocaleUpperCase('pt-BR')}
          </Texto>
        </View>
        <Texto style={styles.subtitulo}>{subtitulo}</Texto>
        {acao ? (
          <Pressable accessibilityRole="button" onPress={acao.onPress} style={styles.acao}>
            <Icone nome="crosshairs-gps" cor={cores.placa} tamanho={20} />
            <Texto style={styles.acaoTexto}>{acao.titulo}</Texto>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  moldura: { backgroundColor: cores.placa, borderRadius: raio.md + 4, padding: 3 },
  placa: {
    borderRadius: raio.md + 1,
    borderWidth: 2,
    borderColor: cores.papel,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.md,
    gap: espaco.xs,
  },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  titulo: { flex: 1, fontFamily: fontes.black, fontSize: 26, lineHeight: 32, letterSpacing: 0.6, color: cores.papel },
  subtitulo: { fontFamily: fontes.semibold, fontSize: 15, lineHeight: 20, color: cores.placaClaro },
  acao: {
    marginTop: espaco.sm,
    minHeight: ALVO_TOQUE,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    borderRadius: 999,
    backgroundColor: cores.papel,
  },
  acaoTexto: { fontFamily: fontes.extrabold, fontSize: 15, color: cores.placa },
});
