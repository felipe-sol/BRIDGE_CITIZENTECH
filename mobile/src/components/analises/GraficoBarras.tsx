/**
 * Barras horizontais de uma série só (por categoria, ranking de regiões). Um tom,
 * ponta arredondada de 4 px, rótulo e valor em texto (a cor nunca carrega o dado sozinha).
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { escalaBarras } from '../../analises/graficos';
import { coresGrafico, cores, espaco, fontes } from '../../theme/tema';
import { Texto } from '../Texto';

export interface ItemBarra {
  chave: string;
  rotulo: string;
  valor: number;
}

export function GraficoBarras({ itens, resumo }: { itens: readonly ItemBarra[]; resumo: string }) {
  const [largura, setLargura] = useState(0);
  const comprimentos = escalaBarras(
    itens.map((i) => i.valor),
    largura,
  );
  const vazio = itens.every((i) => i.valor === 0);

  return (
    <View accessible accessibilityLabel={resumo} onLayout={(e) => setLargura(e.nativeEvent.layout.width)} style={styles.grafico}>
      {vazio ? (
        <Texto variante="apoio">Sem dados no período.</Texto>
      ) : (
        itens.map((item, i) => (
          <View key={item.chave} style={styles.item}>
            <View style={styles.linha}>
              <Texto style={styles.rotulo} numberOfLines={1}>
                {item.rotulo}
              </Texto>
              <Texto style={styles.valor}>{item.valor}</Texto>
            </View>
            <View style={styles.trilho}>
              <View style={[styles.barra, { width: comprimentos[i] ?? 0 }]} />
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grafico: { gap: espaco.sm },
  item: { gap: 4 },
  linha: { flexDirection: 'row', alignItems: 'baseline', gap: espaco.sm },
  rotulo: { flex: 1, fontFamily: fontes.semibold, fontSize: 14, color: cores.asfalto },
  valor: { fontFamily: fontes.extrabold, fontSize: 14, color: cores.asfalto, fontVariant: ['tabular-nums'] },
  trilho: { height: 10 },
  barra: {
    height: 10,
    backgroundColor: coresGrafico.serie1,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
});
