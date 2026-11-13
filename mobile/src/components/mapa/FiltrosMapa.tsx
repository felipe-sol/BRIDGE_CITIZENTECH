/** Filtros do mapa em fichas roláveis: categoria, gravidade e status (um de cada). */
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  CATEGORIAS,
  PRIORIDADES,
  ROTULO_CATEGORIA,
  ROTULO_PRIORIDADE,
  ROTULO_STATUS,
  type StatusOcorrencia,
} from '../../models/ocorrencia';
import type { FiltrosMapa as Filtros } from '../../services/ocorrenciasService';
import { cores, espaco, fontes } from '../../theme/tema';
import { MarcadorGravidade } from '../MarcadorGravidade';
import { Texto } from '../Texto';

const STATUS_FILTRO: readonly StatusOcorrencia[] = ['ABERTA', 'EM_ANALISE', 'EM_ANDAMENTO', 'RESOLVIDA'];

function Ficha({ rotulo, marcada, onPress, children }: { rotulo: string; marcada: boolean; onPress: () => void; children?: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: marcada }}
      accessibilityLabel={rotulo}
      onPress={onPress}
      style={[styles.ficha, marcada && styles.fichaMarcada]}
    >
      {children}
      <Texto style={[styles.fichaTexto, marcada && styles.fichaTextoMarcada]}>{rotulo}</Texto>
    </Pressable>
  );
}

interface PropsFiltros {
  filtros: Filtros;
  onMudar: (filtros: Filtros) => void;
}

export function FiltrosMapa({ filtros, onMudar }: PropsFiltros) {
  const algum = Boolean(filtros.categoria ?? filtros.prioridade ?? filtros.status);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.linha}>
      {algum ? <Ficha rotulo="Limpar filtros" marcada={false} onPress={() => onMudar({})} /> : null}
      {PRIORIDADES.slice()
        .reverse()
        .map((p) => (
          <Ficha
            key={p}
            rotulo={ROTULO_PRIORIDADE[p]}
            marcada={filtros.prioridade === p}
            onPress={() => onMudar({ ...filtros, prioridade: filtros.prioridade === p ? undefined : p })}
          >
            <MarcadorGravidade prioridade={p} tamanho={12} />
          </Ficha>
        ))}
      <View style={styles.divisor} />
      {CATEGORIAS.map((c) => (
        <Ficha
          key={c}
          rotulo={ROTULO_CATEGORIA[c]}
          marcada={filtros.categoria === c}
          onPress={() => onMudar({ ...filtros, categoria: filtros.categoria === c ? undefined : c })}
        />
      ))}
      <View style={styles.divisor} />
      {STATUS_FILTRO.map((s) => (
        <Ficha
          key={s}
          rotulo={ROTULO_STATUS[s]}
          marcada={filtros.status === s}
          onPress={() => onMudar({ ...filtros, status: filtros.status === s ? undefined : s })}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  linha: { gap: espaco.sm, paddingVertical: espaco.xs, alignItems: 'center' },
  ficha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: espaco.md,
    borderRadius: 999,
    backgroundColor: cores.papel,
    borderWidth: 1.5,
    borderColor: cores.borda,
  },
  fichaMarcada: { backgroundColor: cores.asfalto, borderColor: cores.asfalto },
  fichaTexto: { fontFamily: fontes.extrabold, fontSize: 13, color: cores.asfalto },
  fichaTextoMarcada: { color: cores.papel },
  divisor: { width: 1, height: 24, backgroundColor: cores.borda },
});
