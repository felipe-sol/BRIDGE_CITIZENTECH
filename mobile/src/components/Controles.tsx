/** Controles do formulário: seleção de categoria e interruptores sim/não. */
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { TextoEscalavel as Text } from './Texto';

import { CATEGORIAS, ROTULO_CATEGORIA, type Categoria } from '../models/ocorrencia';
import { ALVO_TOQUE, cores, espaco, raio, fontes } from '../theme/tema';

interface PropsCategoria {
  valor: Categoria | null;
  onChange: (categoria: Categoria) => void;
  erro?: string | undefined;
}

export function SeletorCategoria({ valor, onChange, erro }: PropsCategoria) {
  return (
    <View style={styles.grupo} accessibilityRole="radiogroup" accessibilityLabel="Tipo de problema">
      <Text style={styles.rotulo}>Tipo de problema</Text>
      <View style={styles.opcoes}>
        {CATEGORIAS.map((categoria) => {
          const marcada = valor === categoria;
          return (
            <Pressable
              key={categoria}
              onPress={() => onChange(categoria)}
              accessibilityRole="radio"
              accessibilityState={{ checked: marcada }}
              accessibilityLabel={ROTULO_CATEGORIA[categoria]}
              style={[styles.opcao, marcada && styles.opcaoMarcada, erro && !valor ? styles.opcaoErro : null]}
            >
              {/* Marcação visível em forma (✓), além da cor. */}
              <Text style={[styles.opcaoTexto, marcada && styles.opcaoTextoMarcada]}>
                {marcada ? '✓ ' : ''}
                {ROTULO_CATEGORIA[categoria]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {erro ? <Text style={styles.erro}>⚠︎ {erro}</Text> : null}
    </View>
  );
}

interface PropsInterruptor {
  rotulo: string;
  valor: boolean;
  onChange: (valor: boolean) => void;
}

/** Linha inteira tocável: o texto diz "Sim"/"Não" além da posição do interruptor. */
export function LinhaInterruptor({ rotulo, valor, onChange }: PropsInterruptor) {
  return (
    <Pressable
      onPress={() => onChange(!valor)}
      accessibilityRole="switch"
      accessibilityState={{ checked: valor }}
      accessibilityLabel={rotulo}
      style={styles.linha}
    >
      <Text style={styles.linhaTexto}>{rotulo}</Text>
      <View style={styles.linhaValor}>
        <Text style={[styles.simNao, valor && styles.sim]}>{valor ? 'Sim' : 'Não'}</Text>
        <Switch
          value={valor}
          onValueChange={onChange}
          trackColor={{ false: cores.borda, true: cores.placa }}
          thumbColor={cores.papel}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: espaco.sm },
  rotulo: { fontSize: 17, fontFamily: fontes.extrabold, color: cores.asfalto },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  opcao: {
    minHeight: ALVO_TOQUE,
    justifyContent: 'center',
    paddingHorizontal: espaco.md,
    borderRadius: raio.md,
    borderWidth: 2,
    borderColor: cores.borda,
    backgroundColor: cores.papel,
  },
  opcaoMarcada: { borderColor: cores.asfalto, backgroundColor: cores.sinal },
  opcaoErro: { borderColor: cores.alerta },
  opcaoTexto: { fontSize: 16, fontFamily: fontes.semibold, color: cores.asfalto },
  opcaoTextoMarcada: { fontFamily: fontes.extrabold },
  erro: { fontSize: 15, fontFamily: fontes.extrabold, color: cores.alerta },
  linha: {
    minHeight: ALVO_TOQUE + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingVertical: espaco.sm,
    borderBottomWidth: 1,
    borderBottomColor: cores.borda,
  },
  linhaTexto: { flex: 1, fontSize: 16, lineHeight: 22, fontFamily: fontes.regular, color: cores.asfalto },
  linhaValor: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  simNao: { fontSize: 15, fontFamily: fontes.extrabold, color: cores.textoSuave, minWidth: 30, textAlign: 'right' },
  sim: { color: cores.placa },
});
