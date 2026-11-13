/**
 * Assinatura visual do Bridge: faixa de sinalização que codifica a prioridade
 * por PADRÃO (zebrado = alta, tracejado = média, contínuo = baixa), e selos de
 * texto. A informação nunca depende só da cor: o texto sempre acompanha.
 */
import { StyleSheet, View } from 'react-native';
import { TextoEscalavel as Text } from './Texto';

import {
  ROTULO_PRIORIDADE,
  ROTULO_STATUS,
  type Prioridade,
  type StatusOcorrencia,
} from '../models/ocorrencia';
import { cores, espaco, raio, fontes } from '../theme/tema';

const SEGMENTOS = 10;

export function FaixaPrioridade({ prioridade }: { prioridade: Prioridade }) {
  if (prioridade === 'BAIXA') {
    return <View style={[styles.faixa, styles.continua]} importantForAccessibility="no" />;
  }
  return (
    <View style={styles.faixa} importantForAccessibility="no" accessibilityElementsHidden>
      {Array.from({ length: SEGMENTOS }, (_, i) => {
        const par = i % 2 === 0;
        const cor = prioridade === 'ALTA' ? (par ? cores.sinal : cores.asfalto) : par ? cores.sinal : 'transparent';
        return <View key={i} style={[styles.segmento, { backgroundColor: cor }]} />;
      })}
    </View>
  );
}

export function SeloPrioridade({ prioridade }: { prioridade: Prioridade }) {
  const alta = prioridade === 'ALTA';
  return (
    <View style={[styles.selo, alta ? styles.seloAlta : styles.seloNeutro]}>
      <Text style={styles.seloTexto}>Prioridade {ROTULO_PRIORIDADE[prioridade].toLowerCase()}</Text>
    </View>
  );
}

const SIMBOLO_STATUS: Record<StatusOcorrencia, string> = {
  ABERTA: '○',
  EM_ANALISE: '◔',
  EM_ANDAMENTO: '◑',
  RESOLVIDA: '●',
  REJEITADA: '✕',
};

export function SeloStatus({ status }: { status: StatusOcorrencia }) {
  const final = status === 'RESOLVIDA' || status === 'REJEITADA';
  return (
    <View style={[styles.selo, final ? styles.seloFinal : styles.seloStatus]}>
      <Text style={[styles.seloTexto, { color: status === 'RESOLVIDA' ? cores.ok : cores.placa }]}>
        {SIMBOLO_STATUS[status]} {ROTULO_STATUS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: { width: 10, alignSelf: 'stretch', borderRadius: 2, overflow: 'hidden' },
  continua: { backgroundColor: cores.borda },
  segmento: { flex: 1 },
  selo: {
    borderRadius: raio.sm,
    borderWidth: 1.5,
    paddingHorizontal: espaco.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  seloAlta: { backgroundColor: cores.sinal, borderColor: cores.asfalto },
  seloNeutro: { backgroundColor: cores.papel, borderColor: cores.borda },
  seloStatus: { backgroundColor: cores.placaClaro, borderColor: cores.placa },
  seloFinal: { backgroundColor: cores.papel, borderColor: cores.borda },
  seloTexto: { fontSize: 14, fontFamily: fontes.extrabold, color: cores.asfalto },
});
