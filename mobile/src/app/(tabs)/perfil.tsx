/**
 * Perfil: apelido (com troca), o que a pessoa já fez, ajustes guardados no aparelho (Texto
 * maior e avisos de atualização no app), páginas informativas e criar nova identificação.
 */
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import pacote from '../../../package.json';
import { Aviso } from '../../components/Aviso';
import { Botao } from '../../components/Botao';
import { CampoTexto } from '../../components/CampoTexto';
import { LinhaInterruptor } from '../../components/Controles';
import { Icone } from '../../components/Icone';
import { Texto } from '../../components/Texto';
import { PAGINAS_SOBRE, TITULO_PAGINA } from '../../conteudo/paginas';
import { useIdentificacao } from '../../context/IdentificacaoContext';
import { usePreferencias } from '../../context/PreferenciasContext';
import type { Participacao } from '../../models/identificacao';
import { mensagemDeErro } from '../../services/http';
import { obterParticipacao, trocarApelido } from '../../services/identificacoesService';
import { ALVO_TOQUE, cores, espaco, fontes, raio, sombra } from '../../theme/tema';
import { formatarDataHora, iniciais } from '../../utils/formatacao';
import { validarApelido } from '../../validation/identificacao';
import { rotaSobre } from '../../validation/rotas';

const APELIDO_MAX = 60;

interface Edicao {
  texto: string;
  erro: string | null;
  salvando: boolean;
}

function Numero({ valor, rotulo }: { valor: number | null; rotulo: string }) {
  return (
    <View style={styles.numero} accessible accessibilityLabel={`${rotulo}: ${valor ?? 'carregando'}`}>
      <Texto variante="numero">{valor ?? '–'}</Texto>
      <Texto variante="placa" style={styles.rotuloNumero}>
        {rotulo}
      </Texto>
    </View>
  );
}

export default function TelaPerfil() {
  const { estado, limpar, definir } = useIdentificacao();
  const identificacao = estado.tipo === 'presente' ? estado.identificacao : null;
  const { preferencias, alterar } = usePreferencias();
  const [participacao, setParticipacao] = useState<Participacao | null>(null);
  const [edicao, setEdicao] = useState<Edicao | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (identificacao === null) return;
      let ativo = true;
      obterParticipacao(identificacao.id)
        .then((p) => {
          if (ativo) setParticipacao(p);
        })
        .catch(() => undefined);
      return () => {
        ativo = false;
      };
    }, [identificacao]),
  );

  if (identificacao === null) return null;
  const atual = identificacao;

  /** Só grava no aparelho depois do OK do servidor; um erro deixa tudo como estava. */
  async function salvarApelido(texto: string) {
    const validacao = validarApelido(texto);
    if (!validacao.ok) {
      setEdicao({ texto, erro: validacao.erro, salvando: false });
      return;
    }
    setEdicao({ texto, erro: null, salvando: true });
    try {
      const atualizada = await trocarApelido(atual.id, validacao.apelido);
      await definir(atualizada);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setEdicao(null);
    } catch (erro: unknown) {
      setEdicao({ texto, erro: mensagemDeErro(erro), salvando: false });
    }
  }

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
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <View style={styles.cabecalho}>
          <View style={styles.avatar} accessibilityElementsHidden>
            <Texto style={styles.avatarTexto}>{iniciais(atual.apelido)}</Texto>
          </View>
          <Texto variante="titulo">{atual.apelido}</Texto>
          <Texto variante="apoio">Apelido usado neste aparelho desde {formatarDataHora(atual.criadoEm)}</Texto>
        </View>

        {edicao ? (
          <View style={[styles.cartao, sombra.cartao]}>
            <CampoTexto
              rotulo="Novo apelido"
              valor={edicao.texto}
              onChange={(texto) => setEdicao({ texto, erro: null, salvando: false })}
              erro={edicao.erro ?? undefined}
              ajuda="De 2 a 60 caracteres. Ele aparece só para você."
              maxCaracteres={APELIDO_MAX}
            />
            <Botao
              titulo="Salvar apelido"
              carregando={edicao.salvando}
              onPress={() => {
                salvarApelido(edicao.texto).catch(() => undefined);
              }}
            />
            <Botao titulo="Cancelar" variante="discreto" onPress={() => setEdicao(null)} />
          </View>
        ) : (
          <Botao
            titulo="Trocar apelido"
            variante="secundario"
            onPress={() => setEdicao({ texto: atual.apelido, erro: null, salvando: false })}
          />
        )}

        <View style={[styles.cartao, sombra.cartao]}>
          <Texto variante="subtitulo">O que você já fez</Texto>
          <View style={styles.numeros}>
            <Numero valor={participacao?.registradas ?? null} rotulo="Registrei" />
            <Numero valor={participacao?.confirmadas ?? null} rotulo="Confirmei" />
            <Numero valor={participacao?.resolvidasAcompanhadas ?? null} rotulo="Resolvidas que acompanho" />
            <Numero valor={participacao?.avisosNaoResolvido ?? null} rotulo="Avisei: ainda não resolvido" />
          </View>
        </View>

        <View style={[styles.cartao, sombra.cartao]}>
          <Texto variante="subtitulo">Ajustes deste aparelho</Texto>
          <LinhaInterruptor rotulo="Texto maior" valor={preferencias.textoMaior} onChange={(v) => alterar({ textoMaior: v })} />
          <LinhaInterruptor
            rotulo="Avisos de atualização no app"
            valor={preferencias.avisosNoApp}
            onChange={(v) => alterar({ avisosNoApp: v })}
          />
          <Texto variante="apoio" style={styles.nota}>
            Os avisos aparecem dentro do app (Início e Andamento) quando algo que você acompanha muda. Não há notificação push.
          </Texto>
        </View>

        <View style={[styles.cartao, sombra.cartao]}>
          <Texto variante="subtitulo">Saiba mais</Texto>
          {PAGINAS_SOBRE.map((pagina) => (
            <Pressable key={pagina} accessibilityRole="link" onPress={() => router.push(rotaSobre(pagina))} style={styles.link}>
              <Texto style={styles.linkTexto}>{TITULO_PAGINA[pagina]}</Texto>
              <Icone nome="chevron-right" tamanho={20} cor={cores.placa} />
            </Pressable>
          ))}
        </View>

        {estado.tipo === 'presente' && estado.verificacao === 'nao_encontrada' ? (
          <Aviso tom="atencao" titulo="Identificação não encontrada no servidor">
            Crie uma nova identificação para continuar registrando.
          </Aviso>
        ) : null}
        <Botao titulo="Criar nova identificação" variante="perigo" onPress={novaIdentificacao} />
        <Texto variante="apoio" style={styles.versao}>
          Bridge {pacote.version} · projeto acadêmico
        </Texto>
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
  numeros: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  numero: { flexGrow: 1, flexBasis: '45%', alignItems: 'center', gap: 2, paddingVertical: espaco.sm },
  rotuloNumero: { textAlign: 'center' },
  nota: { fontSize: 13, lineHeight: 18 },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: ALVO_TOQUE },
  linkTexto: { flex: 1, fontFamily: fontes.extrabold, fontSize: 16, color: cores.placa },
  versao: { textAlign: 'center' },
});
