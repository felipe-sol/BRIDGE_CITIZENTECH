/**
 * Aba Análises: indicadores e gráficos da cidade.
 * Ao vivo = todos os registros reais (atualiza a cada 15 s com a tela visível).
 * Exemplo = dados fictícios de 4 meses (estáticos), sempre com a faixa DADOS FICTÍCIOS.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AVISO_ALERTA_BRIDGE } from '../../alertas/alertas';
import { formatarDias, resumoCategorias, resumoRanking } from '../../analises/graficos';
import { Aviso } from '../../components/Aviso';
import { Botao } from '../../components/Botao';
import { EstadoErro } from '../../components/Estados';
import { Esqueleto } from '../../components/Esqueleto';
import { FaixaFicticia } from '../../components/FaixaFicticia';
import { GraficoBarras } from '../../components/analises/GraficoBarras';
import { GraficoSemanal } from '../../components/analises/GraficoSemanal';
import { Indicador } from '../../components/analises/Indicador';
import { IndicadorAoVivo } from '../../components/mapa/IndicadorAoVivo';
import { SeletorModo } from '../../components/SeletorModo';
import { Texto } from '../../components/Texto';
import { aplicarResultadoMapa, avisoFalhaMapa, type EstadoDadosMapa } from '../../geo/estadoMapa';
import { interpretarModo, origemDoModo, type ModoDados } from '../../geo/modo';
import { useAtualizacaoPeriodica } from '../../hooks/useAtualizacaoPeriodica';
import { ROTULO_CATEGORIA, type ResumoEstatisticas } from '../../models/ocorrencia';
import { mensagemDeErro } from '../../services/http';
import { resumoEstatisticas } from '../../services/estatisticasService';
import { cores, espaco, raio } from '../../theme/tema';
import { formatarDecimal } from '../../utils/formatacao';

const INTERVALO_AO_VIVO_MS = 15_000;
const VAZIO: EstadoDadosMapa<ResumoEstatisticas> = { dados: null, atualizadoEm: null, erro: null, chave: null };

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={styles.secao}>
      <Texto variante="subtitulo" accessibilityRole="header">
        {titulo}
      </Texto>
      {children}
    </View>
  );
}

export default function TelaAnalises() {
  const { modo: modoParam } = useLocalSearchParams<{ modo?: string }>();
  const modo = interpretarModo(modoParam);
  const [estado, setEstado] = useState<EstadoDadosMapa<ResumoEstatisticas>>(VAZIO);
  const [atualizando, setAtualizando] = useState(false);

  // Resposta de outro modo nunca é exibida (real e fictício não se misturam).
  const modoAtual = useRef(modo);
  useEffect(() => {
    modoAtual.current = modo;
  }, [modo]);

  const carregar = useCallback(async () => {
    const pedido: ModoDados = modo;
    let resultado: Parameters<typeof aplicarResultadoMapa<ResumoEstatisticas>>[1];
    try {
      resultado = { ok: true, dados: await resumoEstatisticas(origemDoModo(pedido)), agora: Date.now(), chave: pedido };
    } catch (erro: unknown) {
      resultado = { ok: false, erro: mensagemDeErro(erro), chave: pedido };
    }
    const atual = modoAtual.current;
    setEstado((anterior) => aplicarResultadoMapa(anterior, resultado, atual));
  }, [modo, setEstado]);

  // Entra no modo: carrega uma vez. No Ao vivo, também a cada 15 s com a tela visível.
  useEffect(() => {
    carregar().catch(() => undefined);
  }, [carregar]);
  const aoVivo = useCallback(() => (modo === 'aovivo' ? carregar() : Promise.resolve()), [modo, carregar]);
  useAtualizacaoPeriodica(aoVivo, INTERVALO_AO_VIVO_MS);

  function mudarModo(novo: ModoDados) {
    setEstado(VAZIO);
    router.setParams({ modo: novo });
  }

  async function puxarParaAtualizar() {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }

  const doModo = estado.chave === null || estado.chave === modo ? estado : VAZIO;
  const r = doModo.dados;

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={puxarParaAtualizar} />}
      >
        <Texto variante="titulo">Análises</Texto>
        <Texto variante="apoio">Como está a cidade: quanto foi registrado, resolvido e onde há mais relatos.</Texto>
        <SeletorModo modo={modo} onMudar={mudarModo} />
        {modo === 'exemplo' ? (
          <FaixaFicticia />
        ) : (
          <IndicadorAoVivo atualizadoEm={doModo.atualizadoEm} comErro={doModo.erro !== null} />
        )}

        {r === null && doModo.erro !== null ? (
          <EstadoErro
            titulo="Não foi possível carregar as análises"
            mensagem={doModo.erro}
            acao={{ titulo: 'Tentar novamente', onPress: () => void carregar() }}
          />
        ) : r === null ? (
          <View style={styles.carregando}>
            <Esqueleto linhas={6} altura={22} />
          </View>
        ) : (
          <>
            {avisoFalhaMapa(doModo) && doModo.erro !== null ? (
              <Aviso tom="atencao" titulo="Sem conexão">
                Sem conexão com o servidor. Mostrando os últimos dados.
              </Aviso>
            ) : null}
            {modo === 'aovivo' && r.total === 0 ? (
              <Aviso tom="info" titulo="Ainda não há ocorrências reais">
                Quando as pessoas registrarem problemas, os números aparecem aqui. Para ver como o painel fica com volume,
                abra o Exemplo com dados fictícios.
                <Botao titulo="Ver o Exemplo" variante="secundario" onPress={() => mudarModo('exemplo')} />
              </Aviso>
            ) : null}

            <View style={styles.grade}>
              <Indicador valor={String(r.total)} rotulo="Registradas" nota={`${r.abertas} abertas`} />
              <Indicador
                valor={r.percentualResolvidas === null ? '—' : `${formatarDecimal(r.percentualResolvidas, 1)}%`}
                rotulo="Resolvidas"
                nota={`${r.resolvidas} de ${r.total}`}
              />
              <Indicador valor={formatarDias(r.tempoMedioResolucaoDias)} rotulo="Tempo médio até resolver" />
              <Indicador valor={String(r.alertasAtivos)} rotulo="Regiões em alerta" nota={`${r.regioesEmAtencao} em atenção`} />
            </View>
            <Texto variante="apoio" style={styles.nota}>
              {AVISO_ALERTA_BRIDGE}. Não é alerta oficial.
            </Texto>

            <Secao titulo="Por categoria">
              <GraficoBarras
                resumo={resumoCategorias(r.porCategoria)}
                itens={[...r.porCategoria]
                  .sort((a, b) => b.total - a.total)
                  .map((c) => ({ chave: c.categoria, rotulo: ROTULO_CATEGORIA[c.categoria], valor: c.total }))}
              />
            </Secao>

            <Secao titulo="Evolução por semana">
              <GraficoSemanal semanas={r.semanal} />
            </Secao>

            <Secao titulo="Regiões com mais relatos">
              <GraficoBarras
                resumo={resumoRanking(r.rankingRegioes)}
                itens={r.rankingRegioes.map((x) => ({ chave: x.codigo, rotulo: x.nome, valor: x.total }))}
              />
            </Secao>

            <Texto variante="apoio" style={styles.nota}>
              {modo === 'exemplo'
                ? 'Dados fictícios gerados para demonstrar o app. Não são registros reais.'
                : 'Registros reais feitos no Bridge, um projeto acadêmico. Não são números oficiais da Prefeitura.'}
            </Texto>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.concreto },
  conteudo: { padding: espaco.lg, gap: espaco.md, paddingBottom: espaco.xxl },
  carregando: { paddingVertical: espaco.lg },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  secao: { backgroundColor: cores.papel, borderRadius: raio.lg, padding: espaco.lg, gap: espaco.md },
  nota: { fontSize: 13, lineHeight: 18 },
});
