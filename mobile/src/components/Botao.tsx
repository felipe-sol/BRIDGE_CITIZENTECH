import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ALVO_TOQUE, cores, espaco, raio, fontes } from '../theme/tema';

type Variante = 'primario' | 'secundario' | 'discreto' | 'perigo';

interface Props {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  desabilitado?: boolean;
  /** Mostra indicador e bloqueia toques (evita duplo envio). */
  carregando?: boolean;
  tituloCarregando?: string;
  dica?: string;
}

export function Botao({
  titulo,
  onPress,
  variante = 'primario',
  desabilitado = false,
  carregando = false,
  tituloCarregando,
  dica,
}: Props) {
  const inativo = desabilitado || carregando;
  const estilo = ESTILOS[variante];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={carregando && tituloCarregando ? tituloCarregando : titulo}
      accessibilityHint={dica}
      accessibilityState={{ disabled: inativo, busy: carregando }}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        estilo.caixa,
        pressed && !inativo && styles.pressionado,
        inativo && styles.inativo,
      ]}
    >
      <View style={styles.conteudo}>
        {carregando ? <ActivityIndicator color={estilo.texto.color} /> : null}
        <Text style={[styles.texto, estilo.texto]}>{carregando && tituloCarregando ? tituloCarregando : titulo}</Text>
      </View>
    </Pressable>
  );
}

const ESTILOS = {
  primario: StyleSheet.create({
    caixa: { backgroundColor: cores.sinal, borderColor: cores.asfalto },
    texto: { color: cores.asfalto },
  }),
  secundario: StyleSheet.create({
    caixa: { backgroundColor: cores.papel, borderColor: cores.placa },
    texto: { color: cores.placa },
  }),
  discreto: StyleSheet.create({
    caixa: { backgroundColor: 'transparent', borderColor: 'transparent' },
    texto: { color: cores.placa, textDecorationLine: 'underline' },
  }),
  perigo: StyleSheet.create({
    caixa: { backgroundColor: cores.papel, borderColor: cores.alerta },
    texto: { color: cores.alerta },
  }),
} as const;

const styles = StyleSheet.create({
  base: {
    minHeight: ALVO_TOQUE + 4,
    borderRadius: raio.md,
    borderWidth: 2,
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.md,
    justifyContent: 'center',
  },
  conteudo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espaco.sm },
  texto: { fontSize: 17, fontFamily: fontes.extrabold, textAlign: 'center' },
  pressionado: { opacity: 0.8 },
  inativo: { opacity: 0.5 },
});
