/** Barra de 4 passos do andamento; "Rejeitada" aparece como estado próprio. */
import { StyleSheet, View } from 'react-native';

import { ROTULOS_ETAPAS, etapaDoStatus } from '../acompanhamento/etapas';
import { ROTULO_STATUS, type StatusOcorrencia } from '../models/ocorrencia';
import { cores, espaco, fontes } from '../theme/tema';
import { Texto } from './Texto';

export function EtapasStatus({ status }: { status: StatusOcorrencia }) {
  const etapa = etapaDoStatus(status);
  const rotulo = etapa.rejeitada
    ? 'Rejeitada pela equipe responsável'
    : `Etapa ${(etapa.indice ?? 0) + 1} de ${etapa.total}: ${ROTULO_STATUS[status]}`;

  return (
    <View accessible accessibilityLabel={rotulo} style={styles.caixa}>
      <View style={styles.barra}>
        {ROTULOS_ETAPAS.map((nome, i) => {
          const feita = !etapa.rejeitada && etapa.indice !== null && i <= etapa.indice;
          const atual = !etapa.rejeitada && i === etapa.indice;
          return (
            <View
              key={nome}
              style={[
                styles.segmento,
                feita && (status === 'RESOLVIDA' ? styles.resolvido : styles.feito),
                atual && status !== 'RESOLVIDA' && styles.atual,
                etapa.rejeitada && styles.rejeitado,
              ]}
            />
          );
        })}
      </View>
      <Texto style={[styles.rotulo, etapa.rejeitada && styles.rotuloRejeitado]}>
        {etapa.rejeitada ? '✕ Rejeitada' : rotulo}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { gap: 4 },
  barra: { flexDirection: 'row', gap: 4 },
  segmento: { flex: 1, height: 6, borderRadius: 3, backgroundColor: cores.borda },
  feito: { backgroundColor: cores.placa },
  atual: { backgroundColor: cores.sinal, borderWidth: 1, borderColor: cores.asfalto },
  resolvido: { backgroundColor: cores.ok },
  rejeitado: { backgroundColor: cores.alertaClaro, borderWidth: 1, borderColor: cores.alerta },
  rotulo: { fontFamily: fontes.semibold, fontSize: 13, lineHeight: 17, color: cores.textoSuave, marginTop: espaco.xs / 2 },
  rotuloRejeitado: { color: cores.alerta },
});
