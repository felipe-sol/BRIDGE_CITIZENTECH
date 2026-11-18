/**
 * Detalhe da ocorrência: foto, local no mapa real, prioridade (regra pública),
 * "eu também vi", linha do tempo com a equipe responsável e compartilhar.
 * Abrir o detalhe marca a ocorrência como vista (some o selo "Atualizada").
 */
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { textoCompartilhamento } from '../../acompanhamento/compartilhar';
import { Aviso } from '../../components/Aviso';
import { Botao } from '../../components/Botao';
import { EstadoErro } from '../../components/Estados';
import { Esqueleto } from '../../components/Esqueleto';
import { FaixaFicticia } from '../../components/FaixaFicticia';
import { FotoTelaCheia } from '../../components/FotoTelaCheia';
import { ICONE_CATEGORIA, Icone } from '../../components/Icone';
import { LinhaDoTempo } from '../../components/LinhaDoTempo';
import { MarcadorGravidade } from '../../components/MarcadorGravidade';
import { SeloStatus } from '../../components/Sinalizacao';
import { Texto } from '../../components/Texto';
import { useIdentificacao } from '../../context/IdentificacaoContext';
import {
  ROTULO_CATEGORIA,
  ROTULO_PRIORIDADE,
  ehCategoria,
  type AnaliseIA,
  type OcorrenciaDetalhe,
} from '../../models/ocorrencia';
import { ErroApi, mensagemDeErro, urlAbsoluta } from '../../services/http';
import {
  aplicarAtualizacaoDetalhe,
  podeAvisarNaoResolvido,
  textoAvisosNaoResolvido,
  type EstadoDetalhe,
} from '../../acompanhamento/detalhe';
import {
  avisarNaoResolvido,
  confirmarOcorrencia,
  desfazerAvisoNaoResolvido,
  desfazerConfirmacao,
  obterOcorrencia,
} from '../../services/ocorrenciasService';
import { marcarVisto } from '../../services/vistos';
import { ALVO_TOQUE, cores, espaco, fontes, raio, sombra } from '../../theme/tema';
import { formatarPercentual } from '../../utils/formatacao';
import { ROTAS, interpretarIdRota, type ParametrosDetalhe } from '../../validation/rotas';

/** Texto da análise de IA. Nunca inventa previsão quando ela não existe. */
function descreverAnalise(analise: AnaliseIA): { titulo: string; texto: string } {
  switch (analise.status) {
    case 'INDISPONIVEL':
      return {
        titulo: 'Análise de IA indisponível',
        texto:
          'Não havia modelo de IA ativo no servidor quando esta ocorrência foi registrada. Ela segue normalmente para a equipe responsável.',
      };
    case 'PENDENTE':
      return { titulo: 'Análise de IA pendente', texto: 'A análise automática ainda não foi feita para esta ocorrência.' };
    case 'FALHOU':
      return {
        titulo: 'Análise de IA indisponível',
        texto: 'O modelo de IA não conseguiu processar esta ocorrência. Os dados registrados não foram afetados.',
      };
    case 'CONCLUIDA': {
      const sugerida = analise.categoriaSugerida;
      const nome = sugerida && ehCategoria(sugerida) ? ROTULO_CATEGORIA[sugerida] : (sugerida ?? 'sem categoria');
      const partes = [`Categoria sugerida: ${nome}.`];
      if (analise.confianca !== null) partes.push(`Confiança informada pelo modelo: ${formatarPercentual(analise.confianca)}.`);
      if (analise.versaoModelo) partes.push(`Modelo ${analise.versaoModelo}.`);
      return { titulo: 'Sugestão da IA', texto: partes.join(' ') };
    }
  }
}

function FotoRemota({ caminho }: { caminho: string }) {
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'erro'>('carregando');
  const [telaCheia, setTelaCheia] = useState(false);
  let uri: string | null = null;
  try {
    uri = urlAbsoluta(caminho);
  } catch {
    uri = null;
  }
  if (uri === null || estado === 'erro') {
    return <Aviso tom="atencao">A foto existe, mas não foi possível carregá-la agora.</Aviso>;
  }
  return (
    <View>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel="Foto do problema enviada pelo cidadão. Toque para abrir em tela cheia."
        disabled={estado !== 'ok'}
        onPress={() => setTelaCheia(true)}
      >
        <Image
          source={{ uri }}
          style={styles.foto}
          resizeMode="cover"
          onLoad={() => setEstado('ok')}
          onError={() => setEstado('erro')}
        />
        {estado === 'ok' ? (
          <View style={styles.ampliar} accessibilityElementsHidden>
            <Icone nome="magnify" tamanho={18} cor={cores.papel} />
            <Texto style={styles.ampliarTexto}>Ampliar</Texto>
          </View>
        ) : null}
      </Pressable>
      {estado === 'carregando' ? <ActivityIndicator style={styles.carregandoFoto} color={cores.placa} /> : null}
      <FotoTelaCheia uri={uri} visivel={telaCheia} onFechar={() => setTelaCheia(false)} />
    </View>
  );
}

export default function TelaDetalheOcorrencia() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const parametros = useLocalSearchParams<ParametrosDetalhe>();
  const id = interpretarIdRota(parametros.id);
  const acabouDeCriar = parametros.criada === '1';
  const { estado: identificacao } = useIdentificacao();
  const identificacaoId = identificacao.tipo === 'presente' ? identificacao.identificacao.id : undefined;

  const [estado, setEstado] = useState<EstadoDetalhe>({ tipo: 'carregando' });
  const [atualizando, setAtualizando] = useState(false);
  const [relatando, setRelatando] = useState(false);
  const [erroRelato, setErroRelato] = useState<string | null>(null);
  const [avisando, setAvisando] = useState(false);
  const [erroAviso, setErroAviso] = useState<string | null>(null);

  /** Busca a ocorrência e devolve o próximo estado da tela (sem efeitos colaterais). */
  const buscar = useCallback(async (): Promise<EstadoDetalhe> => {
    if (id === null) {
      return { tipo: 'erro', titulo: 'Endereço inválido', mensagem: 'O número da ocorrência é inválido.', podeTentar: false };
    }
    try {
      const ocorrencia = await obterOcorrencia(id, identificacaoId);
      await marcarVisto(ocorrencia.id, ocorrencia.atualizadoEm);
      return { tipo: 'pronto', ocorrencia, aviso: null };
    } catch (erro: unknown) {
      const naoExiste = erro instanceof ErroApi && erro.status === 404;
      return {
        tipo: 'erro',
        titulo: naoExiste ? 'Ocorrência não encontrada' : 'Não foi possível carregar a ocorrência',
        mensagem: naoExiste ? `A ocorrência nº ${id} não existe.` : mensagemDeErro(erro),
        podeTentar: !naoExiste,
      };
    }
  }, [id, identificacaoId]);

  useEffect(() => {
    let ativo = true;
    void buscar().then((proximo) => {
      if (ativo) setEstado(proximo); // ignora resposta se a tela já foi fechada
    });
    return () => {
      ativo = false;
    };
  }, [buscar]);

  function tentarNovamente(): void {
    setEstado({ tipo: 'carregando' });
    void buscar().then(setEstado);
  }

  /** Busca de novo sem perder a tela: uma falha vira aviso (aplicarAtualizacaoDetalhe). */
  async function recarregar(): Promise<void> {
    const proximo = await buscar();
    setEstado((anterior) => aplicarAtualizacaoDetalhe(anterior, proximo));
  }

  async function atualizar(): Promise<void> {
    setAtualizando(true);
    await recarregar();
    setAtualizando(false);
  }

  async function alternarRelato(o: OcorrenciaDetalhe) {
    if (relatando || identificacaoId === undefined) return;
    setRelatando(true);
    setErroRelato(null);
    try {
      if (o.minhaRelacao?.confirmei) await desfazerConfirmacao(o.id, identificacaoId);
      else await confirmarOcorrencia(o.id, identificacaoId);
      await recarregar();
    } catch (erro: unknown) {
      setErroRelato(mensagemDeErro(erro));
    } finally {
      setRelatando(false);
    }
  }

  async function alternarAviso(o: OcorrenciaDetalhe) {
    if (avisando || identificacaoId === undefined) return;
    setAvisando(true);
    setErroAviso(null);
    try {
      if (o.minhaRelacao?.aviseiNaoResolvido) await desfazerAvisoNaoResolvido(o.id, identificacaoId);
      else await avisarNaoResolvido(o.id, identificacaoId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      await recarregar();
    } catch (erro: unknown) {
      setErroAviso(mensagemDeErro(erro));
    } finally {
      setAvisando(false);
    }
  }

  if (estado.tipo === 'carregando') {
    return (
      <View style={styles.carregando}>
        <Esqueleto linhas={6} altura={20} />
      </View>
    );
  }
  if (estado.tipo === 'erro') {
    return (
      <EstadoErro
        titulo={estado.titulo}
        mensagem={estado.mensagem}
        acao={estado.podeTentar ? { titulo: 'Tentar novamente', onPress: tentarNovamente } : undefined}
        acaoSecundaria={{ titulo: 'Ver meu andamento', onPress: () => router.replace(ROTAS.andamento) }}
      />
    );
  }

  const o = estado.ocorrencia;
  const analise = descreverAnalise(o.analiseIa);
  const encerrada = o.status === 'RESOLVIDA' || o.status === 'REJEITADA';
  const local = o.endereco ?? (o.subprefeitura ? `Subprefeitura ${o.subprefeitura.nome}` : 'Local sem endereço');
  const regiaoMapa = { latitude: o.latitude, longitude: o.longitude, latitudeDelta: 0.006, longitudeDelta: 0.006 };

  return (
    <ScrollView
      contentContainerStyle={[styles.conteudo, { paddingBottom: insets.bottom + espaco.xl }]}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} />}
    >
      {o.origem === 'SIMULADA' ? <FaixaFicticia singular /> : null}
      {estado.aviso ? (
        <Aviso tom="atencao" titulo="Não foi possível atualizar">
          {`${estado.aviso} Mostrando os últimos dados.`}
        </Aviso>
      ) : null}

      {acabouDeCriar ? (
        <Aviso tom="sucesso" titulo="Registro enviado">
          Você vai acompanhar cada atualização da equipe responsável por aqui e na aba Andamento.
        </Aviso>
      ) : null}

      {o.imagemUrl ? <FotoRemota caminho={o.imagemUrl} /> : null}

      <View style={styles.linha}>
        <Icone nome={ICONE_CATEGORIA[o.categoria]} tamanho={20} cor={cores.placa} />
        <Texto variante="placa" style={styles.flex}>
          {ROTULO_CATEGORIA[o.categoria]} · nº {o.id}
        </Texto>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Compartilhar esta ocorrência"
          hitSlop={8}
          onPress={() => {
            Share.share({ message: textoCompartilhamento(o) }).catch(() => undefined);
          }}
          style={styles.compartilhar}
        >
          <Icone nome="share-variant" tamanho={22} cor={cores.placa} />
        </Pressable>
      </View>
      <Texto variante="titulo">{o.titulo}</Texto>
      <SeloStatus status={o.status} />
      <Texto variante="corpo">{o.descricao}</Texto>

      <View style={[styles.mapaCartao, sombra.cartao]}>
        <View pointerEvents="none" style={styles.mapa}>
          <MapView
            style={StyleSheet.absoluteFill}
            region={regiaoMapa}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
          >
            <Marker coordinate={{ latitude: o.latitude, longitude: o.longitude }} tracksViewChanges={false}>
              <MarcadorGravidade prioridade={o.prioridade} tamanho={24} />
            </Marker>
          </MapView>
        </View>
        <View style={styles.local}>
          <Icone nome="map-marker-outline" tamanho={18} cor={cores.textoSuave} />
          <Texto variante="apoio" style={styles.flex}>
            {local}
            {o.endereco && o.subprefeitura ? ` · Subprefeitura ${o.subprefeitura.nome}` : ''}
          </Texto>
        </View>
      </View>

      <View style={[styles.bloco, sombra.cartao]}>
        <View style={styles.linha}>
          <MarcadorGravidade prioridade={o.prioridade} tamanho={20} />
          <Texto variante="subtitulo">
            Prioridade {ROTULO_PRIORIDADE[o.prioridade].toLowerCase()} ({o.prioridadePontuacao}/10)
          </Texto>
        </View>
        <Texto variante="apoio">{o.prioridadeJustificativa}</Texto>
        <Texto variante="apoio" style={styles.nota}>
          Calculada por regras públicas a partir do que foi informado. Não é avaliação oficial de segurança.
        </Texto>
      </View>

      <View style={[styles.bloco, sombra.cartao]}>
        <View style={styles.linha}>
          <Icone nome="account-multiple" tamanho={22} cor={cores.placa} />
          <Texto variante="subtitulo" style={styles.flex}>
            {o.confirmacoes === 0
              ? 'Ninguém mais relatou ainda'
              : o.confirmacoes === 1
                ? '1 pessoa também relatou'
                : `${o.confirmacoes} pessoas também relataram`}
          </Texto>
        </View>
        {o.minhaRelacao?.registrei ? (
          <Texto variante="apoio">Você registrou esta ocorrência.</Texto>
        ) : o.origem === 'APP' && !encerrada ? (
          <Botao
            titulo={o.minhaRelacao?.confirmei ? 'Desfazer meu relato' : 'Eu também vi'}
            variante={o.minhaRelacao?.confirmei ? 'secundario' : 'primario'}
            carregando={relatando}
            dica={o.minhaRelacao?.confirmei ? 'Remove o seu relato desta ocorrência' : 'Soma o seu relato e você passa a acompanhá-la'}
            onPress={() => {
              alternarRelato(o).catch(() => undefined);
            }}
          />
        ) : null}
        {erroRelato ? <Aviso tom="erro">{erroRelato}</Aviso> : null}
      </View>

      {podeAvisarNaoResolvido(o) ? (
        <View style={[styles.bloco, sombra.cartao]}>
          <View style={styles.linha}>
            <Icone nome="alert-outline" tamanho={22} cor={cores.asfalto} />
            <Texto variante="subtitulo" style={styles.flex}>
              Foi resolvido mesmo?
            </Texto>
          </View>
          {textoAvisosNaoResolvido(o.avisosNaoResolvido) ? (
            <Texto style={styles.contagemAvisos}>{textoAvisosNaoResolvido(o.avisosNaoResolvido)}</Texto>
          ) : null}
          <Botao
            titulo={o.minhaRelacao?.aviseiNaoResolvido ? 'Desfazer meu aviso' : 'Ainda não foi resolvido? Avise'}
            variante="secundario"
            carregando={avisando}
            dica={
              o.minhaRelacao?.aviseiNaoResolvido
                ? 'Remove o seu aviso desta ocorrência'
                : 'Avisa a equipe responsável que o problema continua no local'
            }
            onPress={() => {
              alternarAviso(o).catch(() => undefined);
            }}
          />
          <Texto variante="apoio" style={styles.nota}>
            O aviso não reabre a ocorrência: a equipe responsável vê quantas pessoas discordam.
          </Texto>
          {erroAviso ? <Aviso tom="erro">{erroAviso}</Aviso> : null}
        </View>
      ) : null}

      <Texto variante="placa" style={styles.secao}>
        Andamento
      </Texto>
      <LinhaDoTempo historico={o.historico} status={o.status} />

      <View style={styles.ia}>
        <Texto variante="placa">{analise.titulo}</Texto>
        <Texto variante="apoio">{analise.texto}</Texto>
      </View>
      {acabouDeCriar ? (
        <Pressable accessibilityRole="link" onPress={() => router.replace(ROTAS.andamento)} style={styles.linkAndamento}>
          <Texto style={styles.linkTexto}>Ver tudo no Andamento</Texto>
          <Icone nome="chevron-right" tamanho={20} cor={cores.placa} />
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  carregando: { flex: 1, padding: espaco.lg, backgroundColor: cores.concreto },
  conteudo: { padding: espaco.lg, gap: espaco.md, backgroundColor: cores.concreto },
  foto: { width: '100%', aspectRatio: 4 / 3, borderRadius: raio.lg, backgroundColor: cores.borda },
  carregandoFoto: { position: 'absolute', top: '45%', alignSelf: 'center' },
  ampliar: {
    position: 'absolute',
    right: espaco.sm,
    bottom: espaco.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: espaco.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  ampliarTexto: { fontFamily: fontes.extrabold, fontSize: 13, color: cores.papel },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  compartilhar: { width: ALVO_TOQUE, height: ALVO_TOQUE, alignItems: 'center', justifyContent: 'center' },
  mapaCartao: { borderRadius: raio.lg, overflow: 'hidden', backgroundColor: cores.papel, borderWidth: 1, borderColor: cores.borda },
  mapa: { height: 150 },
  local: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, padding: espaco.md },
  bloco: { backgroundColor: cores.papel, borderRadius: raio.lg, padding: espaco.lg, gap: espaco.sm },
  nota: { fontSize: 13, lineHeight: 18 },
  contagemAvisos: { fontFamily: fontes.extrabold, fontSize: 15, color: cores.alerta },
  secao: { marginTop: espaco.sm },
  ia: { gap: 2, padding: espaco.md, borderRadius: raio.md, borderWidth: 1, borderColor: cores.borda },
  linkAndamento: { flexDirection: 'row', alignItems: 'center', minHeight: ALVO_TOQUE, gap: espaco.xs },
  linkTexto: { fontFamily: fontes.extrabold, fontSize: 16, color: cores.placa },
});
