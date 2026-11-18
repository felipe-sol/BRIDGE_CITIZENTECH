/**
 * Mapa real da cidade (Apple Maps no iPhone) com a localização real da pessoa.
 * Camadas: Pontos (ocorrências por gravidade, agrupadas com zoom afastado) e
 * Densidade (32 subprefeituras pintadas por ocorrências/km²; contorno tracejado = Alerta Bridge).
 * Modos: "Ao vivo" (dados reais, consulta a cada 15 s com a tela visível) e "Exemplo"
 * (dados fictícios de 4 meses, estáticos, sempre com a faixa DADOS FICTÍCIOS). Uma falha de
 * rede não apaga o que está na tela, e resposta de outro modo nunca é exibida.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { type MapPressEvent, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { avisoTruncado } from '../../analises/graficos';
import { BotaoFlutuante } from '../../components/BotaoFlutuante';
import { FaixaFicticia } from '../../components/FaixaFicticia';
import { Icone } from '../../components/Icone';
import { BarraBusca } from '../../components/mapa/BarraBusca';
import { CamadaDensidade } from '../../components/mapa/CamadaDensidade';
import { CartaoOcorrenciaMapa } from '../../components/mapa/CartaoOcorrenciaMapa';
import { CamadaPontos } from '../../components/mapa/CamadaPontos';
import { FiltrosMapa } from '../../components/mapa/FiltrosMapa';
import { IndicadorAoVivo } from '../../components/mapa/IndicadorAoVivo';
import { LegendaDensidade } from '../../components/mapa/LegendaDensidade';
import { MarcadorGravidade } from '../../components/MarcadorGravidade';
import { SeletorModo } from '../../components/SeletorModo';
import { Texto } from '../../components/Texto';
import { agruparPontos } from '../../geo/agrupamento';
import { ampliarCaixa, caixaContem, caixaDaRegiao, regiaoDaCaixa, regiaoInicial } from '../../geo/distancia';
import { aplicarResultadoMapa, avisoFalhaMapa, type EstadoDadosMapa, type ResultadoAtualizacao } from '../../geo/estadoMapa';
import { interpretarModo, origemDoModo, type ModoDados } from '../../geo/modo';
import type { Caixa, OcorrenciaMapa, PontoMapa, PontosMapa, RegiaoMapa, RegiaoSP } from '../../geo/tipos';
import { decidirToqueMapa, itemNoToque, type TamanhoMapa } from '../../geo/toqueMapa';
import { useAtualizacaoPeriodica } from '../../hooks/useAtualizacaoPeriodica';
import { deveExecutar, type UltimaExecucao } from '../../utils/limitador';
import { useIdentificacao } from '../../context/IdentificacaoContext';
import { useCartaoOcorrencia } from '../../hooks/useCartaoOcorrencia';
import type { EstatisticaRegiao, Ocorrencia } from '../../models/ocorrencia';
import { estatisticasPorRegiao } from '../../services/estatisticasService';
import { localizarEndereco } from '../../services/geocodificacao';
import { mensagemDeErro } from '../../services/http';
import { obterLocalizacaoAtual, obterLocalizacaoSePermitida, type ResultadoLocalizacao } from '../../services/localizacao';
import { buscarOcorrencias, listarPontosMapa, type FiltrosMapa as Filtros } from '../../services/ocorrenciasService';
import { carregarRegioes } from '../../services/regioesService';
import { ALVO_TOQUE, cores, espaco, fontes, raio, sombra } from '../../theme/tema';
import { ROTAS, interpretarCodigoRegiao, rotaDetalhe, rotaRegiao } from '../../validation/rotas';

const INTERVALO_AO_VIVO_MS = 15_000;
const ESPERA_APOS_MOVER_MS = 400;
/** Folga pedida além de cada borda da tela (50% da largura/altura): arrastar pouco não pede nada. */
const FOLGA_AREA = 0.5;

type Camada = 'pontos' | 'densidade';

const VAZIO = { dados: null, atualizadoEm: null, erro: null, chave: null };

/** Chave do pedido: modo + filtros. Respostas de outra chave são descartadas. */
function chaveDoPedido(modo: ModoDados, filtros: Filtros): string {
  return [modo, filtros.categoria ?? '', filtros.prioridade ?? '', filtros.status ?? ''].join('|');
}

/** Dados de um estado só valem para o modo em que foram pedidos. */
function doModo<T>(estado: EstadoDadosMapa<T>, modo: ModoDados): EstadoDadosMapa<T> {
  return estado.chave === null || estado.chave.startsWith(`${modo}|`) ? estado : VAZIO;
}

function SeletorCamada({ camada, onMudar }: { camada: Camada; onMudar: (c: Camada) => void }) {
  return (
    <View style={[styles.seletor, sombra.cartao]} accessibilityRole="tablist">
      {(['pontos', 'densidade'] as const).map((c) => (
        <Pressable
          key={c}
          accessibilityRole="tab"
          accessibilityState={{ selected: camada === c }}
          onPress={() => onMudar(c)}
          style={[styles.opcao, camada === c && styles.opcaoMarcada]}
        >
          <Texto style={[styles.opcaoTexto, camada === c && styles.opcaoTextoMarcada]}>
            {c === 'pontos' ? 'Pontos' : 'Densidade'}
          </Texto>
        </Pressable>
      ))}
    </View>
  );
}

function mensagemSemLocalizacao(r: ResultadoLocalizacao): string {
  if (r.tipo === 'sem_permissao') {
    return r.podePerguntarDeNovo
      ? 'Sem permissão de localização. O mapa continua funcionando: arraste até o lugar que quiser.'
      : 'A localização está bloqueada para o Expo Go. Libere nos Ajustes do iPhone para ver onde você está.';
  }
  if (r.tipo === 'servico_desligado') return 'O GPS do aparelho está desligado.';
  return r.tipo === 'erro' ? r.mensagem : '';
}

export default function TelaMapa() {
  const { regiao: regiaoParam, modo: modoParam } = useLocalSearchParams<{ regiao?: string; modo?: string }>();
  const modo = interpretarModo(modoParam);
  const origem = origemDoModo(modo);
  const mapaRef = useRef<MapView>(null);

  const [localizacao, setLocalizacao] = useState<ResultadoLocalizacao | null>(null);
  const [regiaoVisivel, setRegiaoVisivel] = useState<RegiaoMapa>(() => regiaoInicial(null));
  const [regioes, setRegioes] = useState<RegiaoSP[]>([]);
  const [camada, setCamada] = useState<Camada>('pontos');
  const [filtros, setFiltros] = useState<Filtros>({});
  const [pontos, setPontos] = useState<EstadoDadosMapa<PontosMapa>>(VAZIO);
  const [estatisticas, setEstatisticas] = useState<EstadoDadosMapa<EstatisticaRegiao[]>>(VAZIO);
  const [selecionada, setSelecionada] = useState<{ item: OcorrenciaMapa; modo: ModoDados } | null>(null);
  // Tamanho do mapa em pontos da tela: converte a distância do dedo ao ícone (toque perto do ícone).
  const [tamanhoMapa, setTamanhoMapa] = useState<TamanhoMapa>({ largura: 0, altura: 0 });
  const [aviso, setAviso] = useState<string | null>(null);
  const [busca, setBusca] = useState<{ texto: string; itens: Ocorrencia[]; modo: ModoDados } | null>(null);
  const { estado: identificacao } = useIdentificacao();
  const identificacaoId = identificacao.tipo === 'presente' ? identificacao.identificacao.id : undefined;
  // Cartão da ocorrência tocada: o detalhe (foto, andamento, relação) chega depois do toque.
  const cartao = useCartaoOcorrencia(identificacaoId);

  // A chave atual fica num ref para a resposta (que chega depois) ser comparada com ela.
  const chave = chaveDoPedido(modo, filtros);
  const chaveAtual = useRef(chave);
  // O que já foi pedido: a área dos pontos (com folga) e quando vieram as estatísticas.
  const areaPedida = useRef<{ chave: string; caixa: Caixa } | null>(null);
  const ultimaEstatistica = useRef<UltimaExecucao | null>(null);
  useEffect(() => {
    chaveAtual.current = chave;
  }, [chave]);

  const irPara = useCallback((destino: RegiaoMapa) => {
    mapaRef.current?.animateToRegion(destino, 600);
  }, []);

  /**
   * Busca o que falta para a tela. Os pontos vêm da área visível com FOLGA_AREA de cada lado
   * e são reaproveitados enquanto a tela couber nessa área (arrastar pouco não pede nada).
   * As estatísticas não dependem da área: mudam com o modo e no ciclo do Ao vivo.
   * `forcar` = ciclo de 15 s (pede tudo de novo).
   */
  const atualizar = useCallback(
    async (forcar: boolean) => {
      const chavePedido = chaveDoPedido(modo, filtros);
      const visivel = caixaDaRegiao(regiaoVisivel);
      const inicio = Date.now();
      const anterior = areaPedida.current;
      const pedirPontos =
        forcar || anterior === null || anterior.chave !== chavePedido || !caixaContem(anterior.caixa, visivel);
      const pedirEstatisticas = forcar || deveExecutar(ultimaEstatistica.current, modo, inicio, INTERVALO_AO_VIVO_MS);
      if (!pedirPontos && !pedirEstatisticas) return;
      const area = ampliarCaixa(visivel, FOLGA_AREA);
      if (pedirPontos) areaPedida.current = { chave: chavePedido, caixa: area };
      if (pedirEstatisticas) ultimaEstatistica.current = { chave: modo, em: inicio };

      const [rPontos, rEstatisticas] = await Promise.allSettled([
        pedirPontos ? listarPontosMapa(area, filtros, origem) : Promise.resolve(null),
        pedirEstatisticas ? estatisticasPorRegiao(origem) : Promise.resolve(null),
      ]);
      const agora = Date.now();
      const atual = chaveAtual.current; // a chave pode ter mudado enquanto esperávamos
      if (pedirPontos) {
        // Numa falha, esquece a área para o próximo movimento tentar de novo.
        if (rPontos.status === 'rejected') areaPedida.current = null;
        const resultado: ResultadoAtualizacao<PontosMapa> =
          rPontos.status === 'fulfilled' && rPontos.value !== null
            ? { ok: true, dados: rPontos.value, agora, chave: chavePedido }
            : { ok: false, erro: mensagemDeErro(rPontos.status === 'rejected' ? rPontos.reason : null), chave: chavePedido };
        setPontos((anteriores) => aplicarResultadoMapa(anteriores, resultado, atual));
      }
      if (pedirEstatisticas) {
        if (rEstatisticas.status === 'rejected') ultimaEstatistica.current = null;
        const resultado: ResultadoAtualizacao<EstatisticaRegiao[]> =
          rEstatisticas.status === 'fulfilled' && rEstatisticas.value !== null
            ? { ok: true, dados: rEstatisticas.value, agora, chave: chavePedido }
            : {
                ok: false,
                erro: mensagemDeErro(rEstatisticas.status === 'rejected' ? rEstatisticas.reason : null),
                chave: chavePedido,
              };
        setEstatisticas((anteriores) => aplicarResultadoMapa(anteriores, resultado, atual));
      }
    },
    [regiaoVisivel, filtros, modo, origem, setPontos, setEstatisticas],
  );

  // Ao vivo: a cada 15 s com a tela visível (pausa fora da aba e em segundo plano).
  // O Exemplo é estático: carrega ao entrar no modo e ao mover o mapa, sem consulta periódica.
  const atualizarAoVivo = useCallback(
    () => (modo === 'aovivo' ? atualizar(true) : Promise.resolve()),
    [modo, atualizar],
  );
  useAtualizacaoPeriodica(atualizarAoVivo, INTERVALO_AO_VIVO_MS);

  // Depois de mover o mapa ou trocar filtros, busca a nova área sem esperar os 15 s.
  useEffect(() => {
    const temporizador = setTimeout(() => {
      atualizar(false).catch(() => undefined);
    }, ESPERA_APOS_MOVER_MS);
    return () => clearTimeout(temporizador);
  }, [atualizar]);

  // Localização (sem abrir o pedido do sistema) e limites oficiais das regiões.
  useEffect(() => {
    let ativo = true;
    obterLocalizacaoSePermitida()
      .then((r) => {
        if (!ativo) return;
        setLocalizacao(r);
        if (r.tipo === 'ok' && interpretarCodigoRegiao(regiaoParam) === null) irPara(regiaoInicial(r));
      })
      .catch(() => undefined);
    carregarRegioes()
      .then((rs) => {
        if (ativo) setRegioes(rs);
      })
      .catch(() => {
        if (ativo) setAviso('Não foi possível carregar os limites das regiões. A camada de densidade fica indisponível.');
      });
    return () => {
      ativo = false;
    };
  }, [irPara, regiaoParam]);

  // Vindo da folha da região ("Ver no mapa"): enquadra a subprefeitura.
  useEffect(() => {
    const codigo = interpretarCodigoRegiao(regiaoParam);
    const alvo = codigo === null ? undefined : regioes.find((r) => r.codigo === codigo);
    if (alvo) irPara(regiaoDaCaixa(alvo.caixa));
  }, [regiaoParam, regioes, irPara]);

  // Só o que foi pedido no modo atual aparece (nunca real e fictício misturados).
  const pontosDoModo = doModo(pontos, modo);
  const estatisticasDoModo = doModo(estatisticas, modo);
  const selecaoAtual = selecionada?.modo === modo ? selecionada.item : null;
  const buscaAtual = busca?.modo === modo ? busca : null;

  const itens = useMemo(
    () => agruparPontos(pontosDoModo.dados?.itens ?? [], regiaoVisivel),
    [pontosDoModo.dados, regiaoVisivel],
  );

  // A faixa de erro segue a camada visível (pontos ou densidade).
  const falha = avisoFalhaMapa(camada === 'pontos' ? pontosDoModo : estatisticasDoModo);
  const corte =
    camada === 'pontos' && pontosDoModo.dados
      ? avisoTruncado(pontosDoModo.dados.total, pontosDoModo.dados.itens.length)
      : null;

  function selecionar(item: OcorrenciaMapa) {
    setSelecionada({ item, modo });
    cartao.carregar(item.id);
  }

  function fecharCartao() {
    cartao.esquecer();
    setSelecionada(null);
  }

  function tocarPonto(ponto: PontoMapa) {
    const item = pontosDoModo.dados?.itens.find((o) => o.id === ponto.id);
    if (item) selecionar(item);
  }

  function tocarGrupo(latitude: number, longitude: number) {
    irPara({
      latitude,
      longitude,
      latitudeDelta: regiaoVisivel.latitudeDelta / 3,
      longitudeDelta: regiaoVisivel.longitudeDelta / 3,
    });
  }

  /**
   * No iPhone o toque nem sempre chega ao ícone: muitas vezes chega só ao mapa ("press").
   * Então o próprio app procura o ícone mais próximo do dedo (geo/toqueMapa.ts). O eco
   * "marker-press" (o toque que o ícone já tratou, subindo até o mapa) é ignorado.
   * Toque num lugar vazio fecha o cartão.
   */
  function tocarMapa(e: MapPressEvent) {
    const { action, coordinate } = e.nativeEvent;
    const perto = camada === 'pontos' ? itemNoToque(itens, coordinate, regiaoVisivel, tamanhoMapa) : null;
    const decisao = decidirToqueMapa(action, perto);
    if (decisao.tipo === 'fechar') fecharCartao();
    else if (decisao.tipo === 'item') {
      if (decisao.item.tipo === 'ponto') tocarPonto(decisao.item.ponto);
      else tocarGrupo(decisao.item.latitude, decisao.item.longitude);
    }
  }

  function mudarCamada(nova: Camada) {
    if (nova !== camada) fecharCartao(); // o cartão de um ponto não fica sobre a densidade
    setCamada(nova);
  }

  function mudarFiltros(novos: Filtros) {
    fecharCartao(); // o ponto aberto pode não passar no filtro novo
    setFiltros(novos);
  }

  function mudarModo(novo: ModoDados) {
    areaPedida.current = null;
    ultimaEstatistica.current = null;
    cartao.esquecer();
    setSelecionada(null);
    setBusca(null);
    setAviso(null);
    setPontos(VAZIO);
    setEstatisticas(VAZIO);
    router.setParams({ modo: novo });
  }

  async function irParaMinhaLocalizacao() {
    const r = await obterLocalizacaoAtual();
    setLocalizacao(r);
    if (r.tipo === 'ok') {
      setAviso(null);
      irPara(regiaoInicial(r));
    } else {
      setAviso(mensagemSemLocalizacao(r));
    }
  }

  async function buscarEndereco(texto: string) {
    const ponto = await localizarEndereco(texto);
    if (ponto) {
      setAviso(null);
      irPara({ ...ponto, latitudeDelta: 0.01, longitudeDelta: 0.01 });
    } else {
      setAviso(`Não encontramos “${texto}” em São Paulo. Tente com o número ou o bairro.`);
    }
  }

  async function buscarTexto(texto: string) {
    try {
      const pagina = await buscarOcorrencias(texto, origem);
      setBusca({ texto, itens: pagina.itens, modo });
      setAviso(null);
    } catch (erro: unknown) {
      setAviso(mensagemDeErro(erro));
    }
  }

  function abrirOcorrencia(o: Ocorrencia) {
    setBusca(null);
    selecionar(o);
    irPara({ latitude: o.latitude, longitude: o.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
  }

  return (
    <View style={styles.tela}>
      <MapView
        ref={mapaRef}
        style={StyleSheet.absoluteFill}
        initialRegion={regiaoInicial(null)}
        onRegionChangeComplete={(r: Region) => setRegiaoVisivel(r)}
        onLayout={(e) => setTamanhoMapa({ largura: e.nativeEvent.layout.width, altura: e.nativeEvent.layout.height })}
        onPress={tocarMapa}
        showsUserLocation={localizacao?.tipo === 'ok'}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        showsPointsOfInterests={false}
      >
        {camada === 'densidade' ? (
          <CamadaDensidade
            regioes={regioes}
            estatisticas={estatisticasDoModo.dados}
            onRegiao={(codigo) => router.push(rotaRegiao(codigo, modo))}
          />
        ) : (
          <CamadaPontos
            itens={itens}
            onPonto={tocarPonto}
            onGrupo={tocarGrupo}
          />
        )}
      </MapView>

      <SafeAreaView edges={['top']} style={styles.topo} pointerEvents="box-none">
        <BarraBusca
          regioes={regioes}
          onRegiao={(r) => irPara(regiaoDaCaixa(r.caixa))}
          onEndereco={(t) => {
            buscarEndereco(t).catch(() => undefined);
          }}
          onOcorrencias={(t) => {
            buscarTexto(t).catch(() => undefined);
          }}
        />
        {/* Com o cartão de uma ocorrência aberto, o topo fica só com a busca: nada se sobrepõe ao cartão. */}
        {selecaoAtual === null && camada === 'pontos' ? <FiltrosMapa filtros={filtros} onMudar={mudarFiltros} /> : null}
        {selecaoAtual === null ? (
          <View style={styles.linhaControles} pointerEvents="box-none">
            <SeletorModo modo={modo} onMudar={mudarModo} />
            <SeletorCamada camada={camada} onMudar={mudarCamada} />
          </View>
        ) : null}
        {modo === 'exemplo' ? (
          <FaixaFicticia />
        ) : selecaoAtual === null ? (
          <IndicadorAoVivo
            atualizadoEm={camada === 'pontos' ? pontosDoModo.atualizadoEm : estatisticasDoModo.atualizadoEm}
            comErro={(camada === 'pontos' ? pontosDoModo.erro : estatisticasDoModo.erro) !== null}
          />
        ) : null}
        {falha ? (
          <View style={[styles.faixa, styles.faixaErro]}>
            <Icone nome="wifi-off" tamanho={18} cor={cores.alerta} />
            <Texto style={styles.faixaTexto}>{falha}</Texto>
          </View>
        ) : null}
        {corte && selecaoAtual === null ? (
          <View style={styles.faixa}>
            <Icone nome="information-outline" tamanho={18} cor={cores.placa} />
            <Texto style={styles.faixaTexto}>{corte}</Texto>
          </View>
        ) : null}
        {aviso ? (
          <Pressable accessibilityRole="button" accessibilityHint="Toque para fechar" onPress={() => setAviso(null)} style={styles.faixa}>
            <Icone nome="information-outline" tamanho={18} cor={cores.placa} />
            <Texto style={styles.faixaTexto}>{aviso}</Texto>
          </Pressable>
        ) : null}
        {buscaAtual ? (
          <View style={[styles.resultados, sombra.cartao]}>
            <View style={styles.resultadosTopo}>
              <Texto variante="placa" style={styles.flex}>
                {buscaAtual.itens.length === 0
                  ? `Nada com “${buscaAtual.texto}”`
                  : `Com “${buscaAtual.texto}” · ${buscaAtual.itens.length}`}
              </Texto>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar resultados" hitSlop={8} onPress={() => setBusca(null)}>
                <Icone nome="close" tamanho={20} />
              </Pressable>
            </View>
            <ScrollView style={styles.resultadosLista} keyboardShouldPersistTaps="handled">
              {buscaAtual.itens.map((o) => (
                <Pressable key={o.id} accessibilityRole="button" onPress={() => abrirOcorrencia(o)} style={styles.resultado}>
                  <MarcadorGravidade prioridade={o.prioridade} tamanho={14} />
                  <Texto style={styles.flex} numberOfLines={1}>
                    {o.titulo}
                  </Texto>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </SafeAreaView>

      {selecaoAtual === null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ir para a minha localização"
          onPress={() => {
            irParaMinhaLocalizacao().catch(() => undefined);
          }}
          style={[styles.botaoLocal, sombra.cartao]}
        >
          <Icone nome="crosshairs-gps" tamanho={24} cor={cores.placa} />
        </Pressable>
      ) : null}

      {camada === 'densidade' && !selecaoAtual ? (
        <View style={styles.legenda} pointerEvents="box-none">
          <LegendaDensidade />
        </View>
      ) : null}

      {selecaoAtual ? (
        <CartaoOcorrenciaMapa
          // Um cartão por ocorrência: trocar de ponto zera a foto aberta e o relógio do "há X".
          key={selecaoAtual.id}
          basico={selecaoAtual}
          detalhe={cartao.estado}
          ficticio={modo === 'exemplo'}
          relatando={cartao.relatando}
          erroRelato={cartao.erroRelato}
          onFechar={fecharCartao}
          onVerDetalhe={() => router.push(rotaDetalhe(selecaoAtual.id))}
          onTentarDeNovo={() => cartao.carregar(selecaoAtual.id)}
          onAlternarRelato={(o) => {
            cartao.alternarRelato(o).catch(() => undefined);
          }}
        />
      ) : (
        <BotaoFlutuante rotulo="Registrar" onPress={() => router.push(ROTAS.registrar)} style={styles.fab} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.concreto },
  flex: { flex: 1 },
  topo: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: espaco.md, paddingTop: espaco.sm, gap: espaco.sm },
  linhaControles: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: espaco.sm },
  seletor: { flexDirection: 'row', backgroundColor: cores.asfalto, borderRadius: 999, padding: 3 },
  opcao: { minHeight: 36, paddingHorizontal: espaco.md, borderRadius: 999, justifyContent: 'center' },
  opcaoMarcada: { backgroundColor: cores.sinal },
  opcaoTexto: { fontFamily: fontes.extrabold, fontSize: 13, color: cores.papel },
  opcaoTextoMarcada: { color: cores.asfalto },
  faixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    padding: espaco.md,
    borderRadius: raio.md,
    backgroundColor: cores.placaClaro,
    borderWidth: 1,
    borderColor: cores.placa,
  },
  faixaErro: { backgroundColor: cores.alertaClaro, borderColor: cores.alerta },
  faixaTexto: { flex: 1, fontFamily: fontes.semibold, fontSize: 14, lineHeight: 19, color: cores.asfalto },
  resultados: { backgroundColor: cores.papel, borderRadius: raio.md, padding: espaco.md, maxHeight: 260 },
  resultadosTopo: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, marginBottom: espaco.xs },
  resultadosLista: { flexGrow: 0 },
  resultado: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, minHeight: ALVO_TOQUE },
  botaoLocal: {
    position: 'absolute',
    right: espaco.lg,
    bottom: 96,
    width: ALVO_TOQUE + 4,
    height: ALVO_TOQUE + 4,
    borderRadius: raio.lg,
    backgroundColor: cores.papel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legenda: { position: 'absolute', left: espaco.md, bottom: espaco.lg },
  fab: { position: 'absolute', right: espaco.lg, bottom: espaco.lg },
});
