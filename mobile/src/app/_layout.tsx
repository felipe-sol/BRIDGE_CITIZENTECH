/**
 * Layout raiz: carrega as fontes, lê a identificação salva e decide o que mostrar.
 *
 * - Sem identificação: só a tela de identificação fica acessível.
 * - Com identificação: abas + telas por cima (registrar, detalhe, região, páginas do Perfil).
 * As preferências do Perfil (Texto maior, avisos) valem para o app inteiro.
 * Stack.Protected faz o redirecionamento sozinho quando a identificação muda.
 */
// Só os 4 pesos usados (o índice do pacote puxaria os 18 arquivos para o bundle).
import { Overpass_400Regular } from '@expo-google-fonts/overpass/400Regular';
import { Overpass_600SemiBold } from '@expo-google-fonts/overpass/600SemiBold';
import { Overpass_800ExtraBold } from '@expo-google-fonts/overpass/800ExtraBold';
import { Overpass_900Black } from '@expo-google-fonts/overpass/900Black';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Carregando, EstadoErro } from '../components/Estados';
import { IdentificacaoProvider, useIdentificacao } from '../context/IdentificacaoContext';
import { PreferenciasProvider, useEscalaTexto } from '../context/PreferenciasContext';
import { escalarEstiloTexto } from '../preferencias/preferencias';
import { cores, fontes } from '../theme/tema';

function Navegacao() {
  const { estado, recarregar, limpar } = useIdentificacao();
  // "Texto maior" também nos títulos do cabeçalho (desenhados pela navegação, fora dos nossos componentes).
  const escala = useEscalaTexto();
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
        headerTitleStyle: { fontFamily: fontes.extrabold, ...escalarEstiloTexto({ fontSize: 19 }, escala) },
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
        <Stack.Screen name="sobre/[pagina]" options={{ title: 'Sobre o Bridge' }} />
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
      <PreferenciasProvider>
        <IdentificacaoProvider>
          <StatusBar style="dark" />
          {/* Se a fonte falhar, o app segue com a fonte do sistema em vez de travar. */}
          {fontesProntas || erroFontes ? <Navegacao /> : null}
        </IdentificacaoProvider>
      </PreferenciasProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.concreto },
});
