/** "O que você viu?": blocos grandes com ícone, fáceis de tocar e de ler. */
import { Pressable, StyleSheet, View } from 'react-native';

import { CATEGORIAS, ROTULO_CATEGORIA, type Categoria } from '../../models/ocorrencia';
import { cores, espaco, fontes, raio } from '../../theme/tema';
import { ICONE_CATEGORIA, Icone } from '../Icone';
import { Texto } from '../Texto';

interface PropsGrade {
  selecionada: Categoria | null;
  onEscolher: (categoria: Categoria) => void;
}

export function GradeCategorias({ selecionada, onEscolher }: PropsGrade) {
  return (
    <View style={styles.grade} accessibilityRole="radiogroup">
      {CATEGORIAS.map((categoria) => {
        const marcada = selecionada === categoria;
        return (
          <Pressable
            key={categoria}
            accessibilityRole="radio"
            accessibilityState={{ checked: marcada }}
            onPress={() => onEscolher(categoria)}
            style={({ pressed }) => [styles.bloco, marcada && styles.blocoMarcado, pressed && styles.pressionado]}
          >
            <Icone nome={ICONE_CATEGORIA[categoria]} tamanho={34} cor={marcada ? cores.asfalto : cores.placa} />
            <Texto style={styles.rotulo}>{ROTULO_CATEGORIA[categoria]}</Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.md },
  bloco: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 112,
    borderRadius: raio.lg,
    borderWidth: 2,
    borderColor: cores.borda,
    backgroundColor: cores.papel,
    padding: espaco.md,
    gap: espaco.sm,
    justifyContent: 'center',
  },
  blocoMarcado: { backgroundColor: cores.sinalClaro, borderColor: cores.asfalto },
  pressionado: { opacity: 0.85 },
  rotulo: { fontFamily: fontes.extrabold, fontSize: 16, lineHeight: 21, color: cores.asfalto },
});
