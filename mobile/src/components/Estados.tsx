/** Estados de tela: carregando, erro e vazio — sempre com texto e ação. */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { cores, espaco, texto, fontes } from '../theme/tema';
import { Botao } from './Botao';

export function Carregando({ mensagem }: { mensagem: string }) {
  return (
    <View style={styles.centro} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={cores.placa} />
      <Text style={styles.mensagem}>{mensagem}</Text>
    </View>
  );
}

interface PropsErro {
  titulo: string;
  mensagem: string;
  acao?: { titulo: string; onPress: () => void };
  acaoSecundaria?: { titulo: string; onPress: () => void };
}

export function EstadoErro({ titulo, mensagem, acao, acaoSecundaria }: PropsErro) {
  return (
    <View style={styles.centro} accessibilityRole="alert">
      <Text style={styles.marcador} accessibilityElementsHidden importantForAccessibility="no">
        !
      </Text>
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.mensagem}>{mensagem}</Text>
      <View style={styles.acoes}>
        {acao ? <Botao titulo={acao.titulo} onPress={acao.onPress} /> : null}
        {acaoSecundaria ? (
          <Botao titulo={acaoSecundaria.titulo} onPress={acaoSecundaria.onPress} variante="secundario" />
        ) : null}
      </View>
    </View>
  );
}

interface PropsVazio {
  titulo: string;
  mensagem: string;
  acao: { titulo: string; onPress: () => void };
}

export function EstadoVazio({ titulo, mensagem, acao }: PropsVazio) {
  return (
    <View style={styles.centro}>
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.mensagem}>{mensagem}</Text>
      <View style={styles.acoes}>
        <Botao titulo={acao.titulo} onPress={acao.onPress} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.xl, gap: espaco.md },
  marcador: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: cores.alerta,
    color: cores.alerta,
    fontSize: 26,
    fontFamily: fontes.black,
    textAlign: 'center',
    lineHeight: 42,
  },
  titulo: { ...texto.subtitulo, textAlign: 'center' },
  mensagem: { ...texto.corpo, color: cores.textoSuave, textAlign: 'center' },
  acoes: { alignSelf: 'stretch', gap: espaco.sm, marginTop: espaco.sm },
});
