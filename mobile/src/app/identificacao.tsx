/** Tela 1 — Identificação: cria, mostra, troca ou limpa o apelido salvo no aparelho. */
import { useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aviso } from '../components/Aviso';
import { Botao } from '../components/Botao';
import { CampoTexto } from '../components/CampoTexto';
import { useIdentificacao } from '../context/IdentificacaoContext';
import { mensagemDeErro } from '../services/http';
import { criarIdentificacao } from '../services/identificacoesService';
import { ErroArmazenamentoLocal } from '../services/identificacaoLocal';
import { cores, espaco, raio, texto, fontes } from '../theme/tema';
import { formatarDataHora } from '../utils/formatacao';
import { APELIDO_MAX, validarApelido } from '../validation/identificacao';
import { ROTAS } from '../validation/rotas';

function mensagem(erro: unknown): string {
  return erro instanceof ErroArmazenamentoLocal ? erro.message : mensagemDeErro(erro);
}

export default function TelaIdentificacao() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const alturaCabecalho = useHeaderHeight();
  const { estado, definir, limpar } = useIdentificacao();
  const atual = estado.tipo === 'presente' ? estado.identificacao : null;

  const [editando, setEditando] = useState(false);
  const [apelido, setApelido] = useState('');
  const [erroCampo, setErroCampo] = useState<string | undefined>();
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);

  const mostrarFormulario = atual === null || editando;

  async function salvar(): Promise<void> {
    if (enviandoRef.current) return; // bloqueia duplo toque antes do re-render
    const validacao = validarApelido(apelido);
    if (!validacao.ok) {
      setErroCampo(validacao.erro);
      return;
    }
    setErroCampo(undefined);
    setErroEnvio(null);
    enviandoRef.current = true;
    setEnviando(true);
    try {
      const nova = await criarIdentificacao(validacao.apelido);
      await definir(nova);
      setEditando(false);
      setApelido('');
      router.replace(ROTAS.inicio);
    } catch (erro: unknown) {
      setErroEnvio(mensagem(erro)); // o texto digitado é mantido
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  function confirmarLimpeza(): void {
    Alert.alert(
      'Limpar identificação?',
      'Seu apelido será apagado deste aparelho. As ocorrências já registradas continuam no sistema.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: () => {
            limpar().catch((erro: unknown) => setErroEnvio(mensagem(erro)));
          },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView style={styles.tela} behavior="padding" keyboardVerticalOffset={alturaCabecalho}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.conteudo, { paddingBottom: insets.bottom + espaco.xl }]}
      >
        <Text style={texto.placa}>Bridge · zeladoria colaborativa</Text>
        <Text style={texto.titulo}>Registre problemas da sua rua e acompanhe o andamento.</Text>

        {atual && !editando ? (
          <View style={styles.ficha}>
            <Text style={texto.placa}>Você está identificado como</Text>
            <Text style={styles.apelido}>{atual.apelido}</Text>
            <Text style={texto.apoio}>Identificação criada em {formatarDataHora(atual.criadoEm)}</Text>
            {estado.tipo === 'presente' && estado.verificacao === 'nao_encontrada' ? (
              <Aviso tom="atencao">
                Esta identificação não existe mais no servidor (o banco de demonstração pode ter sido reiniciado). Crie
                uma nova para registrar ocorrências.
              </Aviso>
            ) : null}
            <View style={styles.acoes}>
              <Botao titulo="Abrir o Bridge" onPress={() => router.replace(ROTAS.inicio)} />
              <Botao titulo="Trocar identificação" variante="secundario" onPress={() => setEditando(true)} />
              <Botao titulo="Limpar identificação deste aparelho" variante="perigo" onPress={confirmarLimpeza} />
            </View>
          </View>
        ) : null}

        {mostrarFormulario ? (
          <View style={styles.ficha}>
            <CampoTexto
              rotulo="Como podemos te chamar?"
              ajuda="Use um apelido. Não informe nome completo, CPF, telefone ou endereço."
              valor={apelido}
              onChange={(valor) => {
                setApelido(valor);
                if (erroCampo) setErroCampo(undefined);
              }}
              erro={erroCampo}
              placeholder="Ex.: Vizinha da Rua 7"
              maxCaracteres={APELIDO_MAX}
            />
            <Aviso tom="info" titulo="Isto não é login">
              O Bridge guarda o apelido neste aparelho para identificar os seus registros. Não há senha e qualquer pessoa
              com este celular usará a mesma identificação.
            </Aviso>
            {erroEnvio ? <Aviso tom="erro">{erroEnvio}</Aviso> : null}
            <View style={styles.acoes}>
              <Botao
                titulo={atual ? 'Salvar nova identificação' : 'Começar'}
                tituloCarregando="Salvando…"
                carregando={enviando}
                onPress={() => void salvar()}
              />
              {atual ? (
                <Botao
                  titulo="Cancelar"
                  variante="discreto"
                  desabilitado={enviando}
                  onPress={() => {
                    setEditando(false);
                    setErroCampo(undefined);
                    setErroEnvio(null);
                  }}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        {!mostrarFormulario && erroEnvio ? <Aviso tom="erro">{erroEnvio}</Aviso> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.concreto },
  conteudo: { padding: espaco.lg, gap: espaco.lg },
  ficha: {
    backgroundColor: cores.papel,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: espaco.lg,
    gap: espaco.md,
  },
  apelido: { fontSize: 28, lineHeight: 34, fontFamily: fontes.extrabold, color: cores.asfalto },
  acoes: { gap: espaco.sm },
});
