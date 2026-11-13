/** Barra de abas do cidadão: Início, Mapa, Andamento e Perfil (Análises entra na fase 2). */
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Icone, type NomeIcone } from '../../components/Icone';
import { cores, fontes } from '../../theme/tema';

function iconeDaAba(ativo: NomeIcone, inativo: NomeIcone) {
  function IconeAba({ color, focused }: { color: ColorValue; focused: boolean }) {
    // As cores de aba definidas abaixo são sempre texto; o fallback só cobre cores de plataforma.
    const cor = typeof color === 'string' ? color : focused ? cores.placa : cores.textoSuave;
    return <Icone nome={focused ? ativo : inativo} cor={cor} tamanho={26} />;
  }
  return IconeAba;
}

export default function LayoutAbas() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.placa,
        tabBarInactiveTintColor: cores.textoSuave,
        tabBarLabelStyle: { fontFamily: fontes.extrabold, fontSize: 11, letterSpacing: 0.3 },
        tabBarStyle: { backgroundColor: cores.papel, borderTopColor: cores.borda },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: iconeDaAba('home-variant', 'home-variant-outline') }} />
      <Tabs.Screen name="mapa" options={{ title: 'Mapa', tabBarIcon: iconeDaAba('map', 'map-outline') }} />
      <Tabs.Screen
        name="andamento"
        options={{ title: 'Andamento', tabBarIcon: iconeDaAba('progress-check', 'progress-check') }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: iconeDaAba('account-circle', 'account-circle-outline') }}
      />
    </Tabs>
  );
}
