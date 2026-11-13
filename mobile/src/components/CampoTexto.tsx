import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { cores, espaco, raio, texto, fontes } from '../theme/tema';

interface Props {
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  erro?: string | undefined;
  ajuda?: string;
  placeholder?: string;
  multilinha?: boolean;
  maxCaracteres?: number;
  teclado?: KeyboardTypeOptions;
  monoespacado?: boolean;
  editavel?: boolean;
}

export function CampoTexto({
  rotulo,
  valor,
  onChange,
  erro,
  ajuda,
  placeholder,
  multilinha = false,
  maxCaracteres,
  teclado,
  monoespacado = false,
  editavel = true,
}: Props) {
  const descricaoAcessivel = [erro ? `Erro: ${erro}` : null, ajuda].filter(Boolean).join('. ');
  return (
    <View style={styles.campo}>
      <Text style={styles.rotulo} nativeID={`rotulo-${rotulo}`}>
        {rotulo}
      </Text>
      {ajuda ? <Text style={styles.ajuda}>{ajuda}</Text> : null}
      <TextInput
        accessibilityLabel={rotulo}
        accessibilityHint={descricaoAcessivel || undefined}
        accessibilityLabelledBy={`rotulo-${rotulo}`}
        value={valor}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={cores.textoSuave}
        multiline={multilinha}
        maxLength={maxCaracteres}
        keyboardType={teclado}
        editable={editavel}
        textAlignVertical={multilinha ? 'top' : 'center'}
        style={[
          styles.entrada,
          multilinha && styles.multilinha,
          monoespacado && texto.dado,
          erro ? styles.entradaComErro : null,
          !editavel && styles.inativo,
        ]}
      />
      <View style={styles.rodape}>
        {/* O erro é dito em texto, além da borda vermelha: não depende só de cor. */}
        {erro ? <Text style={styles.erro}>⚠︎ {erro}</Text> : <View />}
        {maxCaracteres && multilinha ? (
          <Text style={styles.contador}>
            {valor.length}/{maxCaracteres}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  campo: { gap: espaco.xs },
  rotulo: { fontSize: 17, fontFamily: fontes.extrabold, color: cores.asfalto },
  ajuda: texto.apoio,
  entrada: {
    minHeight: 52,
    borderWidth: 2,
    borderColor: cores.borda,
    borderRadius: raio.md,
    backgroundColor: cores.papel,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    fontSize: 17,
    fontFamily: fontes.regular,
    color: cores.asfalto,
  },
  multilinha: { minHeight: 120 },
  entradaComErro: { borderColor: cores.alerta, borderWidth: 3 },
  inativo: { backgroundColor: cores.concreto },
  rodape: { flexDirection: 'row', justifyContent: 'space-between', gap: espaco.sm },
  erro: { flex: 1, fontSize: 15, lineHeight: 21, fontFamily: fontes.extrabold, color: cores.alerta },
  contador: { fontSize: 13, fontFamily: fontes.regular, color: cores.textoSuave },
});
