/**
 * Mapa real da cidade (Apple Maps no iPhone) com a localização real da pessoa.
 * Camadas: Pontos (ocorrências por gravidade, agrupadas com zoom afastado) e
 * Densidade (32 subprefeituras pintadas por ocorrências/km²). "Ao vivo" = consulta
 * a cada 15 s com a tela visível; uma falha de rede não apaga o que já está na tela.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotaoFlutuante } from '../../components/BotaoFlutuante';
import { Icone } from '../../components/Icone';
import { BarraBusca } from '../../components/mapa/BarraBusca';
import { CamadaDensidade } from '../../components/mapa/CamadaDensidade';
import { CamadaPontos } from '../../components/mapa/CamadaPontos';
import { FiltrosMapa } from '../../components/mapa/FiltrosMapa';
import { IndicadorAoVivo } from '../../components/mapa/IndicadorAoVivo';
import { LegendaDensidade } from '../../components/mapa/LegendaDensidade';
import { MarcadorGravidade } from '../../components/MarcadorGravidade';
import { SeloStatus } from '../../components/Sinalizacao';
import { Texto } from '../../components/Texto';
import { agruparPontos } from '../../geo/agrupamento';
import { caixaDaRegiao, regiaoDaCaixa, regiaoInicial } from '../../geo/distancia';
import { aplicarResultadoMapa, avisoFalhaMapa, type EstadoDadosMapa } from '../../geo/estadoMapa';
import { paraPontoMapa } from '../../geo/pontos';
import type { RegiaoMapa, RegiaoSP } from '../../geo/tipos';
import { useAtualizacaoPeriodica } from '../../hooks/useAtualizacaoPeriodica';
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

type Camada = 'pontos' | 'densidade';

const VAZIO = { dados: null, atualizadoEm: null, erro: null };

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
  const { regiao: regiaoParam } = useLocalSearchParams<{ regiao?: string }>();
  const mapaRef = useRef<MapView>(null);

  const [localizacao, setLocalizacao] = useState<ResultadoLocalizacao | null>(null);
  const [regiaoVisivel, setRegiaoVisivel] = useState<RegiaoMapa>(() => regiaoInicial(null));
  const [regioes, setRegioes] = useState<RegiaoSP[]>([]);
  const [camada, setCamada] = useState<Camada>('pontos');
  const [filtros, setFiltros] = useState<Filtros>({});
  const [pontos, setPontos] = useState<EstadoDadosMapa<Ocorrencia[]>>(VAZIO);
  const [estatisticas, setEstatisticas] = useState<EstadoDadosMapa<EstatisticaRegiao[]>>(VAZIO);
  const [selecionada, setSelecionada] = useState<Ocorrencia | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [busca, setBusca] = useState<{ texto: string; itens: Ocorrencia[] } | null>(null);

  const irPara = useCallback((destino: RegiaoMapa) => {
    mapaRef.current?.animateToRegion(destino, 600);
  }, []);

  const atualizar = useCallback(async () => {
    const [rPontos, rEstatisticas] = await Promise.allSettled([
      listarPontosMapa(caixaDaRegiao(regiaoVisivel), filtros),
      estatisticasPorRegiao(),
    ]);
    const agora = Date.now();
    setPontos((anterior) =>
      aplicarResultadoMapa(
        anterior,
        rPontos.status === 'fulfilled'
          ? { ok: true, dados: rPontos.value.itens, agora }
          : { ok: false, erro: mensagemDeErro(rPontos.reason) },
      ),
    );
    setEstatisticas((anterior) =>
      aplicarResultadoMapa(
        anterior,
        rEstatisticas.status === 'fulfilled'
          ? { ok: true, dados: rEstatisticas.value, agora }
          : { ok: false, erro: mensagemDeErro(rEstatisticas.reason) },
      ),
    );
  }, [regiaoVisivel, filtros]);

  // Ao vivo: a cada 15 s com a tela visível (pausa fora da aba e em segundo plano).
  useAtualizacaoPeriodica(atualizar, INTERVALO_AO_VIVO_MS);

  // Depois de mover o mapa ou trocar filtros, busca a nova área sem esperar os 15 s.
  useEffect(() => {
    const temporizador = setTimeout(() => {
      atualizar().catch(() => undefined);
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

  const itens = useMemo(
    () => agruparPontos((pontos.dados ?? []).map(paraPontoMapa), regiaoVisivel),
    [pontos.dados, regiaoVisivel],
  );

  // A faixa de erro segue a camada visível (pontos ou densidade).
  const falha = avisoFalhaMapa(camada === 'pontos' ? pontos : estatisticas);

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
      const pagina = await buscarOcorrencias(texto);
      setBusca({ texto, itens: pagina.itens });
      setAviso(null);
    } catch (erro: unknown) {
      setAviso(mensagemDeErro(erro));
    }
  }

  function abrirOcorrencia(o: Ocorrencia) {
    setBusca(null);
    setSelecionada(o);
    irPara({ latitude: o.latitude, longitude: o.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
  }

  return (
    <View style={styles.tela}>
      <MapView
        ref={mapaRef}
        style={StyleSheet.absoluteFill}
        initialRegion={regiaoInicial(null)}
        onRegionChangeComplete={(r: Region) => setRegiaoVisivel(r)}
        onPress={() => setSelecionada(null)}
        showsUserLocation={localizacao?.tipo === 'ok'}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        showsPointsOfInterests={false}
      >
        {camada === 'densidade' ? (
          <CamadaDensidade
            regioes={regioes}
            estatisticas={estatisticas.dados}
            onRegiao={(codigo) => router.push(rotaRegiao(codigo))}
          />
        ) : (
          <CamadaPontos
            itens={itens}
            onPonto={(ponto) => setSelecionada(pontos.dados?.find((o) => o.id === ponto.id) ?? null)}
            onGrupo={(latitude, longitude) =>
              irPara({
                latitude,
                longitude,
                latitudeDelta: regiaoVisivel.latitudeDelta / 3,
                longitudeDelta: regiaoVisivel.longitudeDelta / 3,
              })
            }
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
        {camada === 'pontos' ? <FiltrosMapa filtros={filtros} onMudar={setFiltros} /> : null}
        <View style={styles.linhaControles} pointerEvents="box-none">
          <IndicadorAoVivo
            atualizadoEm={camada === 'pontos' ? pontos.atualizadoEm : estatisticas.atualizadoEm}
            comErro={(camada === 'pontos' ? pontos.erro : estatisticas.erro) !== null}
          />
          <SeletorCamada camada={camada} onMudar={setCamada} />
        </View>
        {falha ? (
          <View style={[styles.faixa, styles.faixaErro]}>
            <Icone nome="wifi-off" tamanho={18} cor={cores.alerta} />
            <Texto style={styles.faixaTexto}>{falha}</Texto>
          </View>
        ) : null}
        {aviso ? (
          <Pressable accessibilityRole="button" accessibilityHint="Toque para fechar" onPress={() => setAviso(null)} style={styles.faixa}>
            <Icone nome="information-outline" tamanho={18} cor={cores.placa} />
            <Texto style={styles.faixaTexto}>{aviso}</Texto>
          </Pressable>
        ) : null}
        {busca ? (
          <View style={[styles.resultados, sombra.cartao]}>
            <View style={styles.resultadosTopo}>
              <Texto variante="placa" style={styles.flex}>
                {busca.itens.length === 0 ? `Nada com “${busca.texto}”` : `Com “${busca.texto}” · ${busca.itens.length}`}
              </Texto>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar resultados" hitSlop={8} onPress={() => setBusca(null)}>
                <Icone nome="close" tamanho={20} />
              </Pressable>
            </View>
            <ScrollView style={styles.resultadosLista} keyboardShouldPersistTaps="handled">
              {busca.itens.map((o) => (
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

      {camada === 'densidade' && !selecionada ? (
        <View style={styles.legenda} pointerEvents="box-none">
          <LegendaDensidade />
        </View>
      ) : null}

      {selecionada ? (
        <View style={[styles.cartao, sombra.cartao]}>
          <View style={styles.cartaoTopo}>
            <MarcadorGravidade prioridade={selecionada.prioridade} tamanho={20} />
            <Texto variante="subtitulo" style={styles.flex} numberOfLines={2}>
              {selecionada.titulo}
            </Texto>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10} onPress={() => setSelecionada(null)}>
              <Icone nome="close" tamanho={22} />
            </Pressable>
          </View>
          <SeloStatus status={selecionada.status} />
          {selecionada.endereco ? <Texto variante="apoio">{selecionada.endereco}</Texto> : null}
          {selecionada.confirmacoes > 0 ? (
            <Texto style={styles.relatos}>
              {selecionada.confirmacoes === 1
                ? '1 pessoa também relatou'
                : `${selecionada.confirmacoes} pessoas também relataram`}
            </Texto>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(rotaDetalhe(selecionada.id))}
            style={styles.verDetalhe}
          >
            <Texto style={styles.verDetalheTexto}>Ver detalhe e andamento</Texto>
            <Icone nome="chevron-right" tamanho={20} cor={cores.papel} />
          </Pressable>
        </View>
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
  linhaControles: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco.sm },
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
  cartao: {
    position: 'absolute',
    left: espaco.md,
    right: espaco.md,
    bottom: espaco.md,
    backgroundColor: cores.papel,
    borderRadius: raio.lg,
    padding: espaco.lg,
    gap: espaco.sm,
  },
  cartaoTopo: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  relatos: { fontFamily: fontes.extrabold, fontSize: 14, color: cores.placa },
  verDetalhe: {
    marginTop: espaco.xs,
    minHeight: ALVO_TOQUE,
    borderRadius: raio.md,
    backgroundColor: cores.placa,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.xs,
  },
  verDetalheTexto: { fontFamily: fontes.black, fontSize: 16, color: cores.papel },
  fab: { position: 'absolute', right: espaco.lg, bottom: espaco.lg },
});
