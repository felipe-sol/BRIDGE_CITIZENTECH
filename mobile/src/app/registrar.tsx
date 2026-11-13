/**
 * Registrar problema, em etapas (redutor puro em src/registro/fluxo.ts):
 *
 *   1. Local     — mapa real com pino fixo no centro; endereço sugerido pelo aparelho.
 *   2. Categoria — "O que você viu?".
 *   3. Parecidos — ocorrências abertas da mesma categoria a até 100 m: a pessoa pode
 *                  CONFIRMAR uma delas ("eu também vi") em vez de criar duplicata.
 *   4. Detalhes  — foto (opcional), título, descrição e situação no local.
 *   5. Revisão   — envio com Idempotency-Key, trava contra toque duplo e reenvio só da foto.
 */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aviso } from '../components/Aviso';
import { Botao } from '../components/Botao';
import { CampoTexto } from '../components/CampoTexto';
import { LinhaInterruptor } from '../components/Controles';
import { Esqueleto } from '../components/Esqueleto';
import { ICONE_CATEGORIA, Icone } from '../components/Icone';
import { CartaoParecido } from '../components/registro/CartaoParecido';
import { GradeCategorias } from '../components/registro/GradeCategorias';
import { PinoCentral } from '../components/registro/PinoCentral';
import { Texto } from '../components/Texto';
import { useIdentificacao } from '../context/IdentificacaoContext';
import { CENTRO_SP, regiaoDaEtapaLocal, regiaoInicial } from '../geo/distancia';
import { localizarRegiao } from '../geo/regioes';
import type { Coordenada, RegiaoSP } from '../geo/tipos';
import { CATEGORIAS, ROTULO_CATEGORIA, type Categoria, type Ocorrencia, type OcorrenciaProxima } from '../models/ocorrencia';
import { FLUXO_INICIAL, reduzirFluxo, type Etapa } from '../registro/fluxo';
import { escolherDaGaleria, tirarFoto, type FotoSelecionada, type ResultadoFoto } from '../services/camera';
import { enderecoDe } from '../services/geocodificacao';
import { ErroApi, mensagemDeErro } from '../services/http';
import { novaChaveEnvio } from '../services/idempotencia';
import { obterLocalizacaoAtual, type ResultadoLocalizacao } from '../services/localizacao';
import { confirmarOcorrencia, criarOcorrencia, enviarFoto, listarProximas } from '../services/ocorrenciasService';
import { carregarRegioes } from '../services/regioesService';
import { marcarVisto } from '../services/vistos';
import { ALVO_TOQUE, cores, espaco, fontes, raio, sombra } from '../theme/tema';
import {
  FORMULARIO_VAZIO,
  LIMITES,
  formatarCoordenada,
  validarFoto,
  validarOcorrencia,
  type CampoValidado,
  type ErrosFormulario,
  type FormularioOcorrencia,
} from '../validation/ocorrencia';
import { rotaDetalhe } from '../validation/rotas';

const ESPERA_GEOCODIFICACAO_MS = 600;
const MAX_PARECIDOS = 3;

const TITULO_ETAPA: Record<Etapa, string> = {
  local: 'Onde está o problema?',
  categoria: 'O que você viu?',
  parecidos: 'Já registraram algo parecido?',
  detalhes: 'Conte o que está acontecendo',
  revisao: 'Revise e envie',
};
const NUMERO_ETAPA: Record<Etapa, number> = { local: 1, categoria: 2, parecidos: 2, detalhes: 3, revisao: 4 };
const TOTAL_ETAPAS = 4;

type EstadoEnvio =
  | { tipo: 'editando' }
  | { tipo: 'enviando'; etapa: 'dados' | 'foto' }
  | { tipo: 'erro_cadastro'; mensagem: string; identificacaoInvalida: boolean }
  | { tipo: 'foto_falhou'; ocorrencia: Ocorrencia; mensagem: string };

type EstadoFoto = { tipo: 'ocioso' } | { tipo: 'ocupado' } | { tipo: 'info'; mensagem: string } | { tipo: 'falha'; mensagem: string; abrirAjustes: boolean };

type EstadoConfirmacao =
  | { tipo: 'ocioso' }
  | { tipo: 'enviando'; id: number }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'feita'; ocorrencia: OcorrenciaProxima; total: number };

const CAMPOS: readonly CampoValidado[] = ['titulo', 'descricao', 'categoria', 'latitude', 'longitude', 'endereco'];

/** Erros de validação do servidor (422) viram erros por campo do formulário. */
function errosDoServidor(erro: ErroApi): ErrosFormulario {
  const erros: ErrosFormulario = {};
  for (const detalhe of erro.detalhes) {
    const campo = CAMPOS.find((c) => c === detalhe.campo);
    if (campo) erros[campo] = detalhe.mensagem;
  }
  return erros;
}

function mensagemPermissaoCamera(podePerguntarDeNovo: boolean): string {
  return podePerguntarDeNovo
    ? 'Sem permissão para usar a câmera. Toque de novo e escolha “Permitir”, ou use uma foto da galeria.'
    : 'A câmera está bloqueada para este app. Libere nos Ajustes do aparelho ou use uma foto da galeria.';
}

function avisoLocalizacao(r: ResultadoLocalizacao | null): string | null {
  if (r === null || r.tipo === 'ok') return null;
  if (r.tipo === 'sem_permissao') {
    return r.podePerguntarDeNovo
      ? 'Sem permissão de localização. Arraste o mapa até o local do problema, ou toque no alvo para tentar de novo.'
      : 'A localização está bloqueada para este app. Arraste o mapa até o local do problema (ou libere nos Ajustes).';
  }
  if (r.tipo === 'servico_desligado') return 'O GPS está desligado. Arraste o mapa até o local do problema.';
  return `${r.mensagem.replace(' ou digite as coordenadas', '')} Você também pode arrastar o mapa até o local.`;
}

export default function TelaRegistrar() {
  const insets = useSafeAreaInsets();
  const { estado: identificacao, limpar } = useIdentificacao();
  const [fluxo, despachar] = useReducer(reduzirFluxo, FLUXO_INICIAL);
  const mapaRef = useRef<MapView>(null);

  // Etapa Local
  const [localizacao, setLocalizacao] = useState<ResultadoLocalizacao | null>(null);
  const [centro, setCentro] = useState<Coordenada>(CENTRO_SP);
  const [interagiu, setInteragiu] = useState(false);
  const [regioes, setRegioes] = useState<RegiaoSP[]>([]);
  const [buscandoEndereco, setBuscandoEndereco] = useState(false);
  const [enderecoEditado, setEnderecoEditado] = useState(false);
  const temporizadorGeo = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Formulário e envio
  const [form, setForm] = useState<FormularioOcorrencia>(FORMULARIO_VAZIO);
  const [erros, setErros] = useState<ErrosFormulario>({});
  const [foto, setFoto] = useState<FotoSelecionada | null>(null);
  const [estadoFoto, setEstadoFoto] = useState<EstadoFoto>({ tipo: 'ocioso' });
  const [envio, setEnvio] = useState<EstadoEnvio>({ tipo: 'editando' });
  const [confirmacao, setConfirmacao] = useState<EstadoConfirmacao>({ tipo: 'ocioso' });

  // Mesma chave para todas as tentativas deste registro (evita duplicatas).
  const [chaveEnvio] = useState(novaChaveEnvio);
  // Trava síncrona contra duplo toque (o estado do React só atualiza no próximo render).
  const travaEnvio = useRef(false);

  // Ao abrir: pede a localização (aqui o pedido faz sentido: é para marcar o problema).
  useEffect(() => {
    let ativo = true;
    obterLocalizacaoAtual()
      .then((r) => {
        if (!ativo) return;
        setLocalizacao(r);
        if (r.tipo === 'ok') mapaRef.current?.animateToRegion(regiaoInicial(r), 500);
      })
      .catch(() => undefined);
    carregarRegioes()
      .then((rs) => {
        if (ativo) setRegioes(rs);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
      if (temporizadorGeo.current) clearTimeout(temporizadorGeo.current);
    };
  }, []);

  if (identificacao.tipo !== 'presente') return null;
  const identificacaoId = identificacao.identificacao.id;

  const enviando = envio.tipo === 'enviando';
  const ocorrenciaCriada = envio.tipo === 'foto_falhou';
  const podeVoltar = !enviando && !ocorrenciaCriada && confirmacao.tipo !== 'feita' && confirmacao.tipo !== 'enviando';
  const regiaoDoCentro = regioes.length > 0 ? localizarRegiao(centro, regioes) : null;

  function alterar<K extends keyof FormularioOcorrencia>(campo: K, valor: FormularioOcorrencia[K]): void {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    const campoErro: CampoValidado | undefined =
      campo === 'titulo' || campo === 'descricao' || campo === 'categoria' || campo === 'endereco' ? campo : undefined;
    if (campoErro === undefined) return;
    setErros((atuais) => {
      if (!(campoErro in atuais)) return atuais;
      const copia = { ...atuais };
      delete copia[campoErro];
      return copia;
    });
  }

  // ------------------------------------------------------------ Local

  function aoMoverMapa(regiao: Region) {
    const novoCentro = { latitude: regiao.latitude, longitude: regiao.longitude };
    setCentro(novoCentro);
    // Sem GPS e sem toque da pessoa, o centro é só o marco zero: não sugerimos endereço.
    if (enderecoEditado || (!interagiu && localizacao?.tipo !== 'ok')) return;
    if (temporizadorGeo.current) clearTimeout(temporizadorGeo.current);
    temporizadorGeo.current = setTimeout(() => {
      setBuscandoEndereco(true);
      enderecoDe(novoCentro)
        .then((r) => {
          if (r.tipo === 'ok') setForm((atual) => ({ ...atual, endereco: r.endereco }));
        })
        .catch(() => undefined)
        .finally(() => setBuscandoEndereco(false));
    }, ESPERA_GEOCODIFICACAO_MS);
  }

  async function irParaMinhaLocalizacao() {
    const r = await obterLocalizacaoAtual();
    setLocalizacao(r);
    if (r.tipo === 'ok') {
      setEnderecoEditado(false);
      mapaRef.current?.animateToRegion(regiaoInicial(r), 500);
    }
  }

  function confirmarLocal() {
    despachar({ tipo: 'confirmar_local', ponto: centro });
    setForm((atual) => ({
      ...atual,
      latitudeTexto: formatarCoordenada(centro.latitude),
      longitudeTexto: formatarCoordenada(centro.longitude),
    }));
  }

  // ------------------------------------------------------------ Categoria e parecidos

  function escolherCategoria(categoria: Categoria) {
    const ponto = fluxo.ponto;
    if (ponto === null) return;
    const titulosAutomaticos: readonly string[] = CATEGORIAS.map((c) => ROTULO_CATEGORIA[c]);
    setForm((atual) => ({
      ...atual,
      categoria,
      // Sugere o título pela categoria, sem apagar o que a pessoa já escreveu.
      titulo: atual.titulo.trim() === '' || titulosAutomaticos.includes(atual.titulo) ? ROTULO_CATEGORIA[categoria] : atual.titulo,
    }));
    setConfirmacao({ tipo: 'ocioso' });
    despachar({ tipo: 'escolher_categoria', categoria });
    listarProximas(ponto, categoria)
      .then((itens) => despachar({ tipo: 'parecidos_carregados', itens: itens.slice(0, MAX_PARECIDOS) }))
      .catch((erro: unknown) => despachar({ tipo: 'parecidos_falharam', mensagem: mensagemDeErro(erro) }));
  }

  async function confirmarParecido(o: OcorrenciaProxima) {
    if (confirmacao.tipo === 'enviando') return;
    setConfirmacao({ tipo: 'enviando', id: o.id });
    try {
      const r = await confirmarOcorrencia(o.id, identificacaoId);
      await marcarVisto(o.id, o.atualizadoEm);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setConfirmacao({ tipo: 'feita', ocorrencia: o, total: r.confirmacoes });
    } catch (erro: unknown) {
      const mensagem =
        erro instanceof ErroApi && erro.codigo === 'PROPRIA_OCORRENCIA'
          ? 'Esta ocorrência foi registrada por você. Ela já aparece no seu Andamento.'
          : mensagemDeErro(erro);
      setConfirmacao({ tipo: 'erro', mensagem });
    }
  }

  // ------------------------------------------------------------ Detalhes

  async function obterFoto(origem: () => Promise<ResultadoFoto>, deCamera: boolean) {
    setEstadoFoto({ tipo: 'ocupado' });
    const r = await origem();
    switch (r.tipo) {
      case 'foto': {
        const problema = validarFoto(r.foto.tamanhoBytes, r.foto.tipoMime);
        if (problema) {
          setEstadoFoto({ tipo: 'falha', mensagem: problema, abrirAjustes: false });
          return;
        }
        setFoto(r.foto);
        setEstadoFoto({ tipo: 'info', mensagem: deCamera ? 'Foto tirada.' : 'Foto escolhida.' });
        break;
      }
      case 'cancelado':
        setEstadoFoto({ tipo: 'info', mensagem: 'Nenhuma foto adicionada. A foto é opcional.' });
        break;
      case 'sem_permissao':
        setEstadoFoto({ tipo: 'falha', mensagem: mensagemPermissaoCamera(r.podePerguntarDeNovo), abrirAjustes: !r.podePerguntarDeNovo });
        break;
      case 'erro':
        setEstadoFoto({ tipo: 'falha', mensagem: r.mensagem, abrirAjustes: false });
        break;
    }
  }

  function irParaRevisao() {
    const validacao = validarOcorrencia(form, identificacaoId);
    if (!validacao.ok) {
      setErros(validacao.erros);
      return;
    }
    setErros({});
    despachar({ tipo: 'avancar' });
  }

  // ------------------------------------------------------------ Envio (lógica do 1.0 preservada)

  async function concluir(ocorrencia: Ocorrencia) {
    await marcarVisto(ocorrencia.id, ocorrencia.atualizadoEm);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    router.replace(rotaDetalhe(ocorrencia.id, true));
  }

  async function enviarSomenteFoto(ocorrencia: Ocorrencia, fotoEnviada: FotoSelecionada) {
    setEnvio({ tipo: 'enviando', etapa: 'foto' });
    try {
      const comFoto = await enviarFoto(ocorrencia.id, identificacaoId, fotoEnviada.uri);
      await concluir(comFoto);
    } catch (erro: unknown) {
      // 409: a foto já tinha chegado (a resposta anterior se perdeu). Nada a reenviar.
      if (erro instanceof ErroApi && erro.codigo === 'IMAGEM_JA_ENVIADA') {
        await concluir(ocorrencia);
        return;
      }
      setEnvio({ tipo: 'foto_falhou', ocorrencia, mensagem: mensagemDeErro(erro) });
    }
  }

  async function enviar() {
    if (travaEnvio.current) return;
    const validacao = validarOcorrencia(form, identificacaoId);
    if (!validacao.ok) {
      setErros(validacao.erros);
      despachar({ tipo: 'voltar' });
      return;
    }
    travaEnvio.current = true;
    setEnvio({ tipo: 'enviando', etapa: 'dados' });
    try {
      let criada: Ocorrencia;
      try {
        criada = await criarOcorrencia(validacao.dados, chaveEnvio);
      } catch (erro: unknown) {
        if (erro instanceof ErroApi && erro.codigo === 'VALIDACAO') setErros(errosDoServidor(erro));
        const identificacaoInvalida = erro instanceof ErroApi && erro.codigo === 'IDENTIFICACAO_INEXISTENTE';
        setEnvio({ tipo: 'erro_cadastro', mensagem: mensagemDeErro(erro), identificacaoInvalida });
        return;
      }
      if (foto) await enviarSomenteFoto(criada, foto);
      else await concluir(criada);
    } finally {
      travaEnvio.current = false;
    }
  }

  async function tentarFotoNovamente(ocorrencia: Ocorrencia) {
    if (travaEnvio.current || foto === null) return;
    travaEnvio.current = true;
    try {
      await enviarSomenteFoto(ocorrencia, foto);
    } finally {
      travaEnvio.current = false;
    }
  }

  // ------------------------------------------------------------ Navegação

  function fechar() {
    const temDados = fluxo.etapa !== 'local' || form.titulo.trim() !== '' || foto !== null;
    if (!temDados || confirmacao.tipo === 'feita') {
      router.back();
      return;
    }
    Alert.alert('Descartar este registro?', 'O que você preencheu será perdido.', [
      { text: 'Continuar registrando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  // ------------------------------------------------------------ Telas de cada etapa

  function etapaLocal() {
    const aviso = avisoLocalizacao(localizacao);
    return (
      <View style={styles.flex}>
        <View style={styles.flex}>
          <MapView
            ref={mapaRef}
            style={StyleSheet.absoluteFill}
            // Ao voltar da etapa 2, reabre no ponto já escolhido (não no marco zero).
            initialRegion={regiaoDaEtapaLocal(fluxo.ponto)}
            onRegionChangeComplete={aoMoverMapa}
            onPanDrag={() => setInteragiu(true)}
            showsUserLocation={localizacao?.tipo === 'ok'}
            showsMyLocationButton={false}
            toolbarEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          />
          <PinoCentral />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ir para a minha localização"
            onPress={() => {
              irParaMinhaLocalizacao().catch(() => undefined);
            }}
            style={[styles.botaoAlvo, sombra.cartao]}
          >
            <Icone nome="crosshairs-gps" tamanho={24} cor={cores.placa} />
          </Pressable>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.painel, sombra.cartao, { paddingBottom: insets.bottom + espaco.md }]}>
            <Texto variante="apoio">Arraste o mapa até o ponto exato. O pino amarelo marca o local.</Texto>
            {aviso ? <Aviso tom="atencao" titulo="Localização">{aviso}</Aviso> : null}
            <CampoTexto
              rotulo="Endereço (opcional)"
              valor={form.endereco}
              onChange={(v) => {
                setEnderecoEditado(true);
                alterar('endereco', v);
              }}
              erro={erros.endereco}
              ajuda={buscandoEndereco ? 'Buscando o endereço do ponto…' : 'Sugerido pelo aparelho. Você pode corrigir.'}
              placeholder="Rua, número — bairro"
              maxCaracteres={LIMITES.enderecoMax}
            />
            {regioes.length > 0 ? (
              <View style={styles.linha}>
                <Icone nome="map-marker-radius-outline" tamanho={18} cor={cores.placa} />
                <Texto style={styles.regiao}>
                  {regiaoDoCentro ? `Subprefeitura ${regiaoDoCentro.nome}` : 'Fora do município de São Paulo'}
                </Texto>
              </View>
            ) : null}
            <Botao titulo="Confirmar local" onPress={confirmarLocal} />
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  function etapaCategoria() {
    return (
      <ScrollView contentContainerStyle={[styles.conteudo, { paddingBottom: insets.bottom + espaco.xl }]}>
        <Texto variante="apoio">Escolha o tipo de problema. Isso ajuda a achar registros parecidos por perto.</Texto>
        <GradeCategorias selecionada={form.categoria} onEscolher={escolherCategoria} />
      </ScrollView>
    );
  }

  function etapaParecidos() {
    if (confirmacao.tipo === 'feita') {
      const { ocorrencia, total } = confirmacao;
      return (
        <ScrollView contentContainerStyle={[styles.conteudo, styles.centro, { paddingBottom: insets.bottom + espaco.xl }]}>
          <Icone nome="check-circle-outline" tamanho={72} cor={cores.ok} />
          <Texto variante="titulo" style={styles.textoCentro}>
            Obrigado! Você passa a acompanhar esta ocorrência
          </Texto>
          <Texto variante="apoio" style={styles.textoCentro}>
            {total === 1 ? 'Seu relato foi somado.' : `Agora são ${total} pessoas relatando este problema.`} Cada atualização
            da equipe responsável aparece no seu Andamento.
          </Texto>
          <Botao titulo="Ver a ocorrência" onPress={() => router.replace(rotaDetalhe(ocorrencia.id))} />
          <Botao titulo="Fechar" variante="secundario" onPress={() => router.back()} />
        </ScrollView>
      );
    }
    if (fluxo.verificando) {
      return (
        <View style={styles.conteudo}>
          <Texto variante="apoio">Procurando registros parecidos a até 100 m…</Texto>
          <Esqueleto linhas={5} altura={18} />
        </View>
      );
    }
    return (
      <ScrollView contentContainerStyle={[styles.conteudo, { paddingBottom: insets.bottom + espaco.xl }]}>
        <Texto variante="corpo">
          Já registraram {fluxo.parecidos.length === 1 ? 'um problema parecido' : 'problemas parecidos'} aqui perto. Se for
          o mesmo, confirme: o seu relato soma ao que já existe e ajuda a priorizar.
        </Texto>
        {confirmacao.tipo === 'erro' ? (
          <Aviso tom="erro" titulo="Não foi possível confirmar">
            {confirmacao.mensagem}
          </Aviso>
        ) : null}
        {fluxo.parecidos.map((o) => (
          <CartaoParecido
            key={o.id}
            ocorrencia={o}
            confirmando={confirmacao.tipo === 'enviando' && confirmacao.id === o.id}
            onConfirmar={() => {
              confirmarParecido(o).catch(() => undefined);
            }}
          />
        ))}
        <Botao titulo="Não, é outro problema" variante="secundario" onPress={() => despachar({ tipo: 'e_outro' })} />
      </ScrollView>
    );
  }

  function etapaDetalhes() {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.conteudo, { paddingBottom: insets.bottom + espaco.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          {fluxo.avisoParecidos ? <Aviso tom="atencao" titulo="Aviso">{fluxo.avisoParecidos}</Aviso> : null}

          <Texto variante="placa">Foto (opcional)</Texto>
          {foto ? (
            <View style={styles.fotoCaixa}>
              <Image source={{ uri: foto.uri }} style={styles.foto} accessibilityLabel="Foto escolhida para o registro" />
              <Botao titulo="Remover foto" variante="discreto" onPress={() => setFoto(null)} />
            </View>
          ) : null}
          <View style={styles.linhaBotoes}>
            <View style={styles.flex}>
              <Botao
                titulo="Tirar foto"
                variante="secundario"
                carregando={estadoFoto.tipo === 'ocupado'}
                onPress={() => {
                  obterFoto(tirarFoto, true).catch(() => undefined);
                }}
              />
            </View>
            <View style={styles.flex}>
              <Botao
                titulo="Da galeria"
                variante="secundario"
                desabilitado={estadoFoto.tipo === 'ocupado'}
                onPress={() => {
                  obterFoto(escolherDaGaleria, false).catch(() => undefined);
                }}
              />
            </View>
          </View>
          {estadoFoto.tipo === 'info' ? <Texto variante="apoio">{estadoFoto.mensagem}</Texto> : null}
          {estadoFoto.tipo === 'falha' ? (
            <Aviso tom="erro" titulo="Foto">
              {estadoFoto.mensagem}
              {estadoFoto.abrirAjustes ? (
                <Botao
                  titulo="Abrir Ajustes"
                  variante="discreto"
                  onPress={() => {
                    Linking.openSettings().catch(() => undefined);
                  }}
                />
              ) : null}
            </Aviso>
          ) : null}

          <CampoTexto
            rotulo="Título"
            valor={form.titulo}
            onChange={(v) => alterar('titulo', v)}
            erro={erros.titulo}
            maxCaracteres={LIMITES.tituloMax}
          />
          <CampoTexto
            rotulo="Descrição"
            valor={form.descricao}
            onChange={(v) => alterar('descricao', v)}
            erro={erros.descricao}
            ajuda="O que você viu, há quanto tempo e quem é afetado. Não inclua nomes ou dados pessoais."
            multilinha
            maxCaracteres={LIMITES.descricaoMax}
          />
          <Texto variante="placa">Situação no local</Texto>
          <LinhaInterruptor rotulo="Há risco imediato para quem passa" valor={form.riscoImediato} onChange={(v) => alterar('riscoImediato', v)} />
          <LinhaInterruptor rotulo="Bloqueia a passagem" valor={form.bloqueiaPassagem} onChange={(v) => alterar('bloqueiaPassagem', v)} />
          <LinhaInterruptor
            rotulo="Afeta pessoas com deficiência ou mobilidade reduzida"
            valor={form.afetaAcessibilidade}
            onChange={(v) => alterar('afetaAcessibilidade', v)}
          />
          {Object.keys(erros).length > 0 ? (
            <Aviso tom="erro" titulo="Revise o formulário">
              {erros.latitude ?? erros.longitude ?? 'Há campos a corrigir acima.'}
            </Aviso>
          ) : null}
          <Botao titulo="Revisar registro" onPress={irParaRevisao} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  function etapaRevisao() {
    const categoria = form.categoria;
    const situacoes = [
      form.riscoImediato ? 'Risco imediato' : null,
      form.bloqueiaPassagem ? 'Bloqueia a passagem' : null,
      form.afetaAcessibilidade ? 'Afeta acessibilidade' : null,
    ].filter((s): s is string => s !== null);
    return (
      <ScrollView contentContainerStyle={[styles.conteudo, { paddingBottom: insets.bottom + espaco.xl }]}>
        <View style={[styles.resumo, sombra.cartao]}>
          {categoria ? (
            <View style={styles.linha}>
              <Icone nome={ICONE_CATEGORIA[categoria]} tamanho={22} cor={cores.placa} />
              <Texto variante="placa">{ROTULO_CATEGORIA[categoria]}</Texto>
            </View>
          ) : null}
          <Texto variante="subtitulo">{form.titulo.trim()}</Texto>
          <Texto variante="corpo">{form.descricao.trim()}</Texto>
          <View style={styles.linha}>
            <Icone nome="map-marker-outline" tamanho={18} cor={cores.textoSuave} />
            <Texto variante="apoio" style={styles.flex}>
              {form.endereco.trim() || `${form.latitudeTexto}, ${form.longitudeTexto}`}
              {regiaoDoCentro ? ` · Subprefeitura ${regiaoDoCentro.nome}` : ''}
            </Texto>
          </View>
          {situacoes.length > 0 ? <Texto variante="apoio">{situacoes.join(' · ')}</Texto> : null}
          {foto ? <Image source={{ uri: foto.uri }} style={styles.foto} accessibilityLabel="Foto do registro" /> : null}
        </View>
        <Texto variante="apoio">
          Ao enviar, a API calcula a prioridade (baixa, média ou alta) com regras públicas. Ela não é uma avaliação oficial
          de segurança.
        </Texto>

        {envio.tipo === 'erro_cadastro' ? (
          <Aviso tom="erro" titulo="A ocorrência não foi registrada">
            {`${envio.mensagem} Seus dados continuam aqui.`}
            {envio.identificacaoInvalida ? (
              <Botao
                titulo="Criar nova identificação"
                variante="discreto"
                onPress={() => {
                  limpar().catch(() => undefined);
                }}
              />
            ) : null}
          </Aviso>
        ) : null}

        {envio.tipo === 'foto_falhou' ? (
          <Aviso tom="atencao" titulo="A ocorrência foi registrada, mas a foto não chegou">
            {envio.mensagem}
            <Botao
              titulo="Tentar enviar a foto de novo"
              onPress={() => {
                tentarFotoNovamente(envio.ocorrencia).catch(() => undefined);
              }}
            />
            <Botao titulo="Ver a ocorrência sem foto" variante="discreto" onPress={() => router.replace(rotaDetalhe(envio.ocorrencia.id, true))} />
          </Aviso>
        ) : null}

        {envio.tipo !== 'foto_falhou' ? (
          <Botao
            titulo="Enviar registro"
            onPress={() => {
              enviar().catch(() => undefined);
            }}
            carregando={enviando}
            tituloCarregando={envio.tipo === 'enviando' && envio.etapa === 'foto' ? 'Enviando a foto…' : 'Enviando…'}
          />
        ) : null}
      </ScrollView>
    );
  }

  const conteudo: Record<Etapa, () => React.JSX.Element> = {
    local: etapaLocal,
    categoria: etapaCategoria,
    parecidos: etapaParecidos,
    detalhes: etapaDetalhes,
    revisao: etapaRevisao,
  };

  const numero = NUMERO_ETAPA[fluxo.etapa];
  const naInicial = fluxo.etapa === 'local';

  return (
    <View style={styles.tela}>
      <View style={[styles.barra, { paddingTop: insets.top + espaco.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={naInicial ? 'Fechar registro' : 'Voltar uma etapa'}
          disabled={!naInicial && !podeVoltar}
          onPress={naInicial ? fechar : () => despachar({ tipo: 'voltar' })}
          style={[styles.botaoBarra, !naInicial && !podeVoltar && styles.inativo]}
        >
          <Icone nome={naInicial ? 'close' : 'arrow-left'} tamanho={26} />
        </Pressable>
        <View style={styles.flex}>
          <Texto variante="placa">
            Etapa {numero} de {TOTAL_ETAPAS}
          </Texto>
          <Texto variante="subtitulo" accessibilityRole="header">
            {TITULO_ETAPA[fluxo.etapa]}
          </Texto>
        </View>
        {!naInicial ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar registro" onPress={fechar} style={styles.botaoBarra}>
            <Icone nome="close" tamanho={24} cor={cores.textoSuave} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.progresso} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: TOTAL_ETAPAS }, (_, i) => (
          <View key={i} style={[styles.passo, i < numero && styles.passoFeito]} />
        ))}
      </View>
      {conteudo[fluxo.etapa]()}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.concreto },
  flex: { flex: 1 },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    paddingBottom: espaco.sm,
    backgroundColor: cores.papel,
  },
  botaoBarra: { width: ALVO_TOQUE, height: ALVO_TOQUE, alignItems: 'center', justifyContent: 'center' },
  inativo: { opacity: 0.3 },
  progresso: { flexDirection: 'row', gap: 4, paddingHorizontal: espaco.md, paddingBottom: espaco.sm, backgroundColor: cores.papel },
  passo: { flex: 1, height: 5, borderRadius: 3, backgroundColor: cores.borda },
  passoFeito: { backgroundColor: cores.sinal },
  conteudo: { padding: espaco.lg, gap: espaco.md },
  centro: { alignItems: 'stretch' },
  textoCentro: { textAlign: 'center' },
  painel: {
    backgroundColor: cores.papel,
    borderTopLeftRadius: raio.lg,
    borderTopRightRadius: raio.lg,
    padding: espaco.lg,
    gap: espaco.md,
  },
  botaoAlvo: {
    position: 'absolute',
    right: espaco.lg,
    bottom: espaco.lg,
    width: ALVO_TOQUE + 4,
    height: ALVO_TOQUE + 4,
    borderRadius: raio.lg,
    backgroundColor: cores.papel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  regiao: { fontFamily: fontes.extrabold, fontSize: 15, color: cores.placa },
  linhaBotoes: { flexDirection: 'row', gap: espaco.sm },
  fotoCaixa: { gap: espaco.xs },
  foto: { width: '100%', aspectRatio: 4 / 3, borderRadius: raio.md, backgroundColor: cores.borda },
  resumo: { backgroundColor: cores.papel, borderRadius: raio.lg, padding: espaco.lg, gap: espaco.sm },
});
