/**
 * Busca do mapa: sugere regiões (subprefeituras) enquanto digita e oferece buscar
 * o endereço (geocodificação do aparelho) ou as ocorrências com aquele texto.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { buscarRegioes } from '../../geo/regioes';
import type { RegiaoSP } from '../../geo/tipos';
import { ALVO_TOQUE, cores, espaco, fontes, raio, sombra } from '../../theme/tema';
import { Icone } from '../Icone';
import { Texto } from '../Texto';

interface PropsBarraBusca {
  regioes: readonly RegiaoSP[];
  onRegiao: (regiao: RegiaoSP) => void;
  onEndereco: (texto: string) => void;
  onOcorrencias: (texto: string) => void;
}

function Sugestao({ icone, texto, onPress }: { icone: 'map-marker-outline' | 'map-marker-radius-outline' | 'magnify'; texto: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.sugestao, pressed && styles.pressionada]}>
      <Icone nome={icone} tamanho={20} cor={cores.placa} />
      <Texto style={styles.sugestaoTexto} numberOfLines={1}>
        {texto}
      </Texto>
    </Pressable>
  );
}

export function BarraBusca({ regioes, onRegiao, onEndereco, onOcorrencias }: PropsBarraBusca) {
  const [texto, setTexto] = useState('');
  const [aberta, setAberta] = useState(false);
  const busca = texto.trim();
  const sugestoes = buscarRegioes(busca, regioes);

  function escolher(acao: () => void) {
    setAberta(false);
    acao();
  }

  return (
    <View>
      <View style={[styles.campo, sombra.cartao]}>
        <Icone nome="magnify" tamanho={22} cor={cores.textoSuave} />
        <TextInput
          value={texto}
          onChangeText={(valor) => {
            setTexto(valor);
            setAberta(true);
          }}
          onFocus={() => setAberta(true)}
          onSubmitEditing={() => {
            if (busca.length >= 3) escolher(() => onEndereco(busca));
          }}
          placeholder="Buscar rua, bairro ou ocorrência"
          placeholderTextColor={cores.textoSuave}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Buscar no mapa"
          style={styles.entrada}
          maxLength={60}
        />
        {texto ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Limpar busca"
            hitSlop={8}
            onPress={() => {
              setTexto('');
              setAberta(false);
            }}
          >
            <Icone nome="close" tamanho={20} cor={cores.textoSuave} />
          </Pressable>
        ) : null}
      </View>

      {aberta && busca.length >= 2 ? (
        <View style={[styles.painel, sombra.cartao]}>
          {sugestoes.map((regiao) => (
            <Sugestao
              key={regiao.codigo}
              icone="map-marker-radius-outline"
              texto={`Região ${regiao.nome}`}
              onPress={() => escolher(() => onRegiao(regiao))}
            />
          ))}
          {busca.length >= 3 ? (
            <Sugestao icone="map-marker-outline" texto={`Endereço “${busca}”`} onPress={() => escolher(() => onEndereco(busca))} />
          ) : null}
          <Sugestao icone="magnify" texto={`Ocorrências com “${busca}”`} onPress={() => escolher(() => onOcorrencias(busca))} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    minHeight: ALVO_TOQUE + 4,
    paddingHorizontal: espaco.md,
    borderRadius: raio.lg,
    backgroundColor: cores.papel,
  },
  entrada: { flex: 1, fontFamily: fontes.regular, fontSize: 16, color: cores.asfalto, paddingVertical: espaco.sm },
  painel: { marginTop: espaco.xs, borderRadius: raio.md, backgroundColor: cores.papel, paddingVertical: espaco.xs },
  sugestao: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, minHeight: ALVO_TOQUE, paddingHorizontal: espaco.md },
  pressionada: { backgroundColor: cores.concreto },
  sugestaoTexto: { flex: 1, fontFamily: fontes.semibold, fontSize: 15, color: cores.asfalto },
});
