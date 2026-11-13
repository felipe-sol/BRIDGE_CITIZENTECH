/**
 * Perfil (básico nesta fase): apelido, participação, privacidade, equipe e
 * criar nova identificação. Ajustes (texto maior, avisos) chegam na fase 3.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import pacote from '../../../package.json';
import { Botao } from '../../components/Botao';
import { Icone } from '../../components/Icone';
import { Texto } from '../../components/Texto';
import { useIdentificacao } from '../../context/IdentificacaoContext';
import { listarMinhas } from '../../services/ocorrenciasService';
import { cores, espaco, fontes, raio, sombra } from '../../theme/tema';
import { formatarDataHora, iniciais } from '../../utils/formatacao';

interface Totais {
  registradas: number | null;
  confirmadas: number | null;
}

/** Integrantes vêm do package.json (uma fonte só). Enquanto houver marcador, não exibimos nomes inventados. */
function textoEquipe(): string {
  const autores: unknown = (pacote as { authors?: unknown }).authors;
  if (!Array.isArray(autores)) return 'Equipe não informada.';
  const nomes = autores.flatMap((a: unknown) =>
    typeof a === 'object' && a !== null && 'name' in a && typeof a.name === 'string' && !a.name.includes('PREENCHER')
      ? [a.name]
      : [],
  );
  return nomes.length === autores.length && nomes.length > 0 ? nomes.join(', ') : 'Nomes da equipe a preencher no package.json.';
}

function Numero({ valor, rotulo }: { valor: number | null; rotulo: string }) {
  return (
    <View style={styles.numero} accessible accessibilityLabel={`${rotulo}: ${valor ?? 'carregando'}`}>
      <Texto variante="numero">{valor ?? '–'}</Texto>
      <Texto variante="placa">{rotulo}</Texto>
    </View>
  );
}

export default function TelaPerfil() {
  const { estado, limpar } = useIdentificacao();
  const identificacao = estado.tipo === 'presente' ? estado.identificacao : null;
  const [totais, setTotais] = useState<Totais>({ registradas: null, confirmadas: null });

  useFocusEffect(
    useCallback(() => {
      if (identificacao === null) return;
      let ativo = true;
      Promise.all([listarMinhas(identificacao.id, 'registradas', 1), listarMinhas(identificacao.id, 'confirmadas', 1)])
        .then(([r, c]) => {
          if (ativo) setTotais({ registradas: r.total, confirmadas: c.total });
        })
        .catch(() => undefined);
      return () => {
        ativo = false;
      };
    }, [identificacao]),
  );

  if (identificacao === null) return null;

  function novaIdentificacao() {
    Alert.alert(
      'Criar nova identificação?',
      'Este aparelho deixa de usar o apelido atual. Os registros já feitos continuam no Bridge, mas você não os verá mais no Andamento.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Criar nova',
          style: 'destructive',
          onPress: () => {
            limpar().catch(() => undefined);
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.cabecalho}>
          <View style={styles.avatar} accessibilityElementsHidden>
            <Texto style={styles.avatarTexto}>{iniciais(identificacao.apelido)}</Texto>
          </View>
          <Texto variante="titulo">{identificacao.apelido}</Texto>
          <Texto variante="apoio">Apelido usado neste aparelho desde {formatarDataHora(identificacao.criadoEm)}</Texto>
        </View>

        <View style={[styles.cartao, sombra.cartao, styles.numeros]}>
          <Numero valor={totais.registradas} rotulo="Registrei" />
          <Numero valor={totais.confirmadas} rotulo="Confirmei" />
        </View>

        <View style={[styles.cartao, sombra.cartao]}>
          <View style={styles.linha}>
            <Icone nome="information-outline" tamanho={22} cor={cores.placa} />
            <Texto variante="subtitulo">Privacidade</Texto>
          </View>
          <Texto variante="apoio">
            Seu apelido não aparece para outras pessoas: as ocorrências são públicas sem autor. Não há login nem senha; esta
            identificação fica só neste aparelho. Fotos enviadas têm os metadados (EXIF) removidos pelo servidor.
          </Texto>
        </View>

        <View style={[styles.cartao, sombra.cartao]}>
          <View style={styles.linha}>
            <Icone nome="information-outline" tamanho={22} cor={cores.placa} />
            <Texto variante="subtitulo">Sobre o Bridge</Texto>
          </View>
          <Texto variante="apoio">
            Projeto acadêmico (FIAP Global Solution 2026.2 — CitizenTech), versão {pacote.version}. Não há integração oficial
            com a Prefeitura: as atualizações de status são feitas pela equipe responsável do projeto.
          </Texto>
          <Texto variante="apoio">Equipe: {textoEquipe()}</Texto>
        </View>

        <Botao titulo="Criar nova identificação" variante="perigo" onPress={novaIdentificacao} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.concreto },
  conteudo: { padding: espaco.lg, gap: espaco.md, paddingBottom: espaco.xxl },
  cabecalho: { alignItems: 'center', gap: espaco.xs, paddingVertical: espaco.md },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: cores.placa,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: cores.papel,
  },
  avatarTexto: { fontFamily: fontes.black, fontSize: 30, color: cores.papel },
  cartao: { backgroundColor: cores.papel, borderRadius: raio.lg, padding: espaco.lg, gap: espaco.sm },
  numeros: { flexDirection: 'row', justifyContent: 'space-around' },
  numero: { alignItems: 'center', gap: 2 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
});
