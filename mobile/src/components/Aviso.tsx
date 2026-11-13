import { Children, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { cores, espaco, raio, fontes } from '../theme/tema';

type Tom = 'info' | 'sucesso' | 'erro' | 'atencao';

const TOM = {
  info: { fundo: cores.placaClaro, borda: cores.placa, rotulo: 'Informação' },
  sucesso: { fundo: cores.okClaro, borda: cores.ok, rotulo: 'Concluído' },
  erro: { fundo: cores.alertaClaro, borda: cores.alerta, rotulo: 'Erro' },
  atencao: { fundo: cores.sinalClaro, borda: cores.asfalto, rotulo: 'Atenção' },
} as const;

interface Props {
  tom: Tom;
  titulo?: string;
  children: ReactNode;
}

/** Faixa de aviso. O tipo é escrito em texto (Erro, Atenção…), não indicado só pela cor. */
export function Aviso({ tom, titulo, children }: Props) {
  const t = TOM[tom];
  return (
    <View
      style={[styles.caixa, { backgroundColor: t.fundo, borderLeftColor: t.borda }]}
      accessibilityRole={tom === 'erro' ? 'alert' : 'summary'}
      accessibilityLiveRegion={tom === 'erro' ? 'assertive' : 'polite'}
    >
      <Text style={[styles.rotulo, { color: t.borda === cores.asfalto ? cores.asfalto : t.borda }]}>
        {titulo ?? t.rotulo}
      </Text>
      {/* Texto solto vira <Text> (no React Native, texto fora de <Text> derruba a tela). */}
      {Children.map(children, (filho) =>
        typeof filho === 'string' || typeof filho === 'number' ? <Text style={styles.texto}>{filho}</Text> : filho,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { borderLeftWidth: 6, borderRadius: raio.sm, padding: espaco.md, gap: espaco.xs },
  rotulo: { fontSize: 15, fontFamily: fontes.extrabold },
  texto: { fontSize: 16, lineHeight: 22, fontFamily: fontes.regular, color: cores.asfalto },
});
