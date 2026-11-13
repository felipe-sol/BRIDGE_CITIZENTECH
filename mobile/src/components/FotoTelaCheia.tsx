/**
 * Foto em tela cheia, com zoom de pinça (iOS, até 4×). Fecha pelo botão ou pelo gesto
 * de voltar do sistema.
 */
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ALVO_TOQUE, cores, espaco, fontes } from '../theme/tema';
import { Icone } from './Icone';
import { Texto } from './Texto';

interface PropsFoto {
  uri: string;
  visivel: boolean;
  onFechar: () => void;
  descricao?: string;
}

export function FotoTelaCheia({ uri, visivel, onFechar, descricao = 'Foto do problema' }: PropsFoto) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visivel} animationType="fade" presentationStyle="fullScreen" onRequestClose={onFechar} statusBarTranslucent>
      <View style={styles.fundo}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.centro}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <Image source={{ uri }} style={styles.foto} resizeMode="contain" accessibilityLabel={descricao} />
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar a foto"
          onPress={onFechar}
          style={[styles.fechar, { top: insets.top + espaco.sm }]}
        >
          <Icone nome="close" tamanho={26} cor={cores.papel} />
          <Texto style={styles.fecharTexto}>Fechar</Texto>
        </Pressable>
        <Texto style={[styles.dica, { bottom: insets.bottom + espaco.lg }]}>Use dois dedos para aproximar</Texto>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1 },
  centro: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  foto: { width: '100%', aspectRatio: 3 / 4, maxHeight: '100%' },
  fechar: {
    position: 'absolute',
    right: espaco.md,
    minHeight: ALVO_TOQUE,
    paddingHorizontal: espaco.md,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.xs,
  },
  fecharTexto: { fontFamily: fontes.extrabold, fontSize: 15, color: cores.papel },
  dica: { position: 'absolute', alignSelf: 'center', fontFamily: fontes.semibold, fontSize: 13, color: '#D7DDE0' },
});
