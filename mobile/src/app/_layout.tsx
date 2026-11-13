/**
 * Layout raiz: carrega as fontes, lê a identificação salva e decide o que mostrar.
 *
 * - Sem identificação: só a tela de identificação fica acessível.
 * - Com identificação: abas + telas por cima (registrar, detalhe, região).
 * Stack.Protected faz o redirecionamento sozinho quando a identificação muda.
 */
import {
  Overpass_400Regular,
  Overpass_600SemiBold,
  Overpass_800ExtraBold,
  Overpass_900Black,
  useFonts,
} from '@expo-google-fonts/overpass';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Carregando, EstadoErro } from '../components/Estados';
import { IdentificacaoProvider, useIdentificacao } from '../context/IdentificacaoContext';
import { cores, fontes } from '../theme/tema';

function Navegacao() {
  const { estado, recarregar, limpar } = useIdentificacao();
  const [erroLimpeza, setErroLimpeza] = useState<string | null>(null);

  if (estado.tipo === 'carregando') {
    return (
      <SafeAreaView style={styles.tela}>
        <Carregando mensagem="Abrindo o Bridge…" />
      </SafeAreaView>
    );
  }
  if (estado.tipo === 'erro') {
    return (
      <SafeAreaView style={styles.tela}>
        <EstadoErro
          titulo="Não foi possível ler sua identificação"
          mensagem={erroLimpeza ?? `${estado.mensagem} Você pode tentar de novo ou criar uma nova identificação.`}
          acao={{ titulo: 'Tentar novamente', onPress: recarregar }}
          acaoSecundaria={{
            titulo: 'Criar nova identificação',
            onPress: () => {
              limpar().catch(() => setErroLimpeza('Também não foi possível apagar os dados salvos. Reinicie o app.'));
            },
          }}
        />
      </SafeAreaView>
    );
  }

  const temIdentificacao = estado.tipo === 'presente';
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: cores.papel },
        headerTintColor: cores.asfalto,
        headerTitleStyle: { fontFamily: fontes.extrabold, fontSize: 19 },
        headerShadowVisible: true,
        contentStyle: { backgroundColor: cores.concreto },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Protected guard={temIdentificacao}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="registrar" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="ocorrencias/[id]" options={{ title: 'Ocorrência' }} />
        <Stack.Screen
          name="regiao/[codigo]"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.45, 0.9],
            sheetGrabberVisible: true,
            headerShown: false,
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!temIdentificacao}>
        <Stack.Screen name="identificacao" options={{ title: 'Identificação' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function LayoutRaiz() {
  const [fontesProntas, erroFontes] = useFonts({
    Overpass_400Regular,
    Overpass_600SemiBold,
    Overpass_800ExtraBold,
    Overpass_900Black,
  });

  return (
    <SafeAreaProvider>
      <IdentificacaoProvider>
        <StatusBar style="dark" />
        {/* Se a fonte falhar, o app segue com a fonte do sistema em vez de travar. */}
        {fontesProntas || erroFontes ? <Navegacao /> : null}
      </IdentificacaoProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.concreto },
});
