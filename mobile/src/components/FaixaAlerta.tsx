/**
 * Faixa do Início com o Alerta Bridge mais relevante para a pessoa (dados reais).
 * Listras de sinalização + nível por extenso (nunca só a cor) + o aviso de que é um
 * alerta calculado automaticamente a partir dos relatos, não oficial.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { AVISO_ALERTA_BRIDGE, ROTULO_NIVEL, textoMotivoAlerta, type AlertaInicio } from '../alertas/alertas';
import { formatarDistancia } from '../geo/distancia';
import { cores, espaco, fontes, raio, sombra } from '../theme/tema';
import { Icone } from './Icone';
import { Texto } from './Texto';

function Listras() {
  return (
    <Svg width="100%" height={10} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <Pattern id="listras" patternUnits="userSpaceOnUse" width={16} height={16} patternTransform="rotate(45)">
          <Rect width={16} height={16} fill={cores.asfalto} />
          <Rect width={8} height={16} fill={cores.sinal} />
        </Pattern>
      </Defs>
      <Rect width="100%" height={10} fill="url(#listras)" />
    </Svg>
  );
}

export function FaixaAlerta({ alerta, onAbrir }: { alerta: AlertaInicio | null; onAbrir: (codigo: string) => void }) {
  if (alerta === null) {
    return (
      <View style={[styles.semAlerta, sombra.cartao]} accessible accessibilityLabel={`Sem alertas na sua região. ${AVISO_ALERTA_BRIDGE}.`}>
        <Icone nome="check-circle-outline" tamanho={22} cor={cores.ok} />
        <View style={styles.flex}>
          <Texto style={styles.titulo}>Sem alertas na sua região</Texto>
          <Texto style={styles.nota}>{AVISO_ALERTA_BRIDGE}.</Texto>
        </View>
      </View>
    );
  }

  const { regiao, alerta: a, distanciaM } = alerta;
  const longe = distanciaM !== null && distanciaM > 0 ? ` · ${formatarDistancia(distanciaM)}` : '';
  const titulo = `Alerta Bridge em ${regiao.nome}${longe}`;
  const ehAlerta = a.nivel === 'ALERTA';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. Nível: ${ROTULO_NIVEL[a.nivel]}. ${textoMotivoAlerta(a)} ${AVISO_ALERTA_BRIDGE}.`}
      accessibilityHint="Abre os números da região"
      onPress={() => onAbrir(regiao.codigo)}
      style={[styles.caixa, sombra.cartao, { borderColor: ehAlerta ? cores.alerta : cores.asfalto }]}
    >
      <Listras />
      <View style={styles.corpo}>
        <View style={styles.linha}>
          <Icone nome={ehAlerta ? 'alert-octagon-outline' : 'alert-outline'} tamanho={24} cor={ehAlerta ? cores.alerta : cores.asfalto} />
          <View style={styles.flex}>
            <Texto style={styles.titulo}>{titulo}</Texto>
            <Texto style={[styles.nivel, { color: ehAlerta ? cores.alerta : cores.asfalto }]}>Nível: {ROTULO_NIVEL[a.nivel]}</Texto>
          </View>
          <Icone nome="chevron-right" tamanho={22} cor={cores.textoSuave} />
        </View>
        <Texto style={styles.motivo}>{textoMotivoAlerta(a)}</Texto>
        <Texto style={styles.nota}>{AVISO_ALERTA_BRIDGE}. Não é alerta oficial.</Texto>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  caixa: { backgroundColor: cores.papel, borderRadius: raio.lg, borderWidth: 2, overflow: 'hidden' },
  corpo: { padding: espaco.md, gap: espaco.xs },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  titulo: { fontFamily: fontes.black, fontSize: 16, lineHeight: 21, color: cores.asfalto },
  nivel: { fontFamily: fontes.extrabold, fontSize: 13 },
  motivo: { fontFamily: fontes.semibold, fontSize: 14, lineHeight: 19, color: cores.asfalto },
  nota: { fontFamily: fontes.regular, fontSize: 12, lineHeight: 16, color: cores.textoSuave },
  semAlerta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    backgroundColor: cores.papel,
    borderRadius: raio.lg,
    padding: espaco.md,
  },
});
