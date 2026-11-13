import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ROTULO_CATEGORIA, ROTULO_PRIORIDADE, ROTULO_STATUS, type Ocorrencia } from '../models/ocorrencia';
import { cores, espaco, raio, texto, fontes } from '../theme/tema';
import { formatarDataHora } from '../utils/formatacao';
import { FaixaPrioridade, SeloPrioridade, SeloStatus } from './Sinalizacao';

interface Props {
  ocorrencia: Ocorrencia;
  onPress: () => void;
}

/** "Ficha" de ocorrência na lista: faixa de sinalização + categoria, título, status e prioridade. */
export function CartaoOcorrencia({ ocorrencia, onPress }: Props) {
  const rotuloAcessivel =
    `Ocorrência ${ocorrencia.id}: ${ocorrencia.titulo}. ${ROTULO_CATEGORIA[ocorrencia.categoria]}. ` +
    `Status ${ROTULO_STATUS[ocorrencia.status]}. Prioridade ${ROTULO_PRIORIDADE[ocorrencia.prioridade]}.`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel}
      accessibilityHint="Abre o detalhe da ocorrência"
      style={({ pressed }) => [styles.cartao, pressed && styles.pressionado]}
    >
      <FaixaPrioridade prioridade={ocorrencia.prioridade} />
      <View style={styles.corpo}>
        <Text style={texto.placa}>
          Nº {ocorrencia.id} · {ROTULO_CATEGORIA[ocorrencia.categoria]}
        </Text>
        <Text style={styles.titulo} numberOfLines={2}>
          {ocorrencia.titulo}
        </Text>
        <View style={styles.selos}>
          <SeloStatus status={ocorrencia.status} />
          <SeloPrioridade prioridade={ocorrencia.prioridade} />
          {ocorrencia.imagemUrl ? <Text style={styles.foto}>com foto</Text> : null}
        </View>
        <Text style={styles.data}>Registrada em {formatarDataHora(ocorrencia.criadoEm)}</Text>
      </View>
      <Text style={styles.seta} importantForAccessibility="no">
        ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    flexDirection: 'row',
    gap: espaco.md,
    backgroundColor: cores.papel,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: espaco.md,
    paddingLeft: espaco.sm,
  },
  pressionado: { backgroundColor: cores.concreto },
  corpo: { flex: 1, gap: espaco.xs },
  titulo: { ...texto.subtitulo, fontSize: 18 },
  selos: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm, alignItems: 'center', marginTop: 2 },
  foto: { fontSize: 14, color: cores.textoSuave, fontFamily: fontes.semibold },
  data: { ...texto.apoio, fontSize: 14 },
  seta: { fontSize: 32, color: cores.textoSuave, alignSelf: 'center' },
});
