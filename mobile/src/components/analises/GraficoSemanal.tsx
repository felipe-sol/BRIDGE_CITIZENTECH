/**
 * Evolução semanal: registradas (linha contínua) e resolvidas (linha TRACEJADA), num eixo
 * só. Legenda sempre visível, leitura ao tocar (semana mais próxima) e tabela opcional.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { caminhoLinha, indiceMaisProximo, marcasEixo, resumoSemanal } from '../../analises/graficos';
import { ALVO_TOQUE, coresGrafico, cores, espaco, fontes } from '../../theme/tema';
import { Texto } from '../Texto';

export interface SemanaGrafico {
  inicio: string;
  registradas: number;
  resolvidas: number;
}

const ALTURA = 150;
const EIXO_Y = 34;
const MARGEM = 6; // folga para os marcadores não serem cortados na borda
const TRACEJADO = '6 4';

function diaMes(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia ?? ''}/${mes ?? ''}`;
}

function Legenda() {
  return (
    <View style={styles.legenda}>
      <View style={styles.itemLegenda}>
        <View style={[styles.amostra, { backgroundColor: coresGrafico.serie1 }]} />
        <Texto style={styles.textoLegenda}>Registradas</Texto>
      </View>
      <View style={styles.itemLegenda}>
        <View style={[styles.amostraTracejada, { borderColor: coresGrafico.serie2 }]} />
        <Texto style={styles.textoLegenda}>Resolvidas (tracejada)</Texto>
      </View>
    </View>
  );
}

export function GraficoSemanal({ semanas }: { semanas: readonly SemanaGrafico[] }) {
  const [largura, setLargura] = useState(0);
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [verTabela, setVerTabela] = useState(false);

  const resumo = resumoSemanal(semanas);
  const vazio = semanas.every((s) => s.registradas + s.resolvidas === 0);
  if (vazio) {
    return <Texto variante="apoio">Sem dados no período.</Texto>;
  }

  const marcas = marcasEixo(Math.max(...semanas.map((s) => Math.max(s.registradas, s.resolvidas))));
  const maximo = marcas[marcas.length - 1] ?? 1;
  const larguraPlot = Math.max(0, largura - EIXO_Y - MARGEM * 2);
  const alturaPlot = ALTURA - MARGEM * 2;
  const registradas = caminhoLinha(semanas.map((s) => s.registradas), larguraPlot, alturaPlot, maximo);
  const resolvidas = caminhoLinha(semanas.map((s) => s.resolvidas), larguraPlot, alturaPlot, maximo);

  const indice = selecionada !== null && selecionada < semanas.length ? selecionada : semanas.length - 1;
  const semana = semanas[indice];
  const xDe = (i: number) => (semanas.length === 1 ? larguraPlot / 2 : (i * larguraPlot) / (semanas.length - 1));
  const yDe = (v: number) => alturaPlot - (v / maximo) * alturaPlot;

  return (
    <View style={styles.bloco}>
      <Legenda />
      {semana ? (
        <Texto style={styles.leitura} accessibilityLiveRegion="polite">
          {selecionada === null ? 'Última semana' : `Semana de ${diaMes(semana.inicio)}`}: {semana.registradas} registradas ·{' '}
          {semana.resolvidas} resolvidas
        </Texto>
      ) : null}

      <View style={styles.grafico} accessible accessibilityLabel={resumo} onLayout={(e) => setLargura(e.nativeEvent.layout.width)}>
        <View style={styles.eixoY}>
          {[...marcas].reverse().map((m) => (
            <Texto key={m} style={styles.marca}>
              {m}
            </Texto>
          ))}
        </View>
        <Pressable
          style={styles.plot}
          accessibilityHint="Toque numa semana para ver os números"
          onPress={(e) => setSelecionada(indiceMaisProximo(e.nativeEvent.locationX - MARGEM, larguraPlot, semanas.length))}
        >
          <Svg width={larguraPlot + MARGEM * 2} height={ALTURA}>
            {marcas.map((m) => (
              <Line
                key={m}
                x1={MARGEM}
                x2={larguraPlot + MARGEM}
                y1={MARGEM + yDe(m)}
                y2={MARGEM + yDe(m)}
                stroke={coresGrafico.grade}
                strokeWidth={1}
              />
            ))}
            <Line
              x1={MARGEM + xDe(indice)}
              x2={MARGEM + xDe(indice)}
              y1={MARGEM}
              y2={MARGEM + alturaPlot}
              stroke={cores.textoSuave}
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <Path d={registradas} transform={`translate(${MARGEM},${MARGEM})`} stroke={coresGrafico.serie1} strokeWidth={2} fill="none" />
            <Path
              d={resolvidas}
              transform={`translate(${MARGEM},${MARGEM})`}
              stroke={coresGrafico.serie2}
              strokeWidth={2}
              strokeDasharray={TRACEJADO}
              fill="none"
            />
            {semana ? (
              <>
                <Circle cx={MARGEM + xDe(indice)} cy={MARGEM + yDe(semana.registradas)} r={4} fill={coresGrafico.serie1} stroke={cores.papel} strokeWidth={2} />
                <Circle cx={MARGEM + xDe(indice)} cy={MARGEM + yDe(semana.resolvidas)} r={4} fill={coresGrafico.serie2} stroke={cores.papel} strokeWidth={2} />
              </>
            ) : null}
          </Svg>
        </Pressable>
      </View>
      <View style={styles.eixoX}>
        <Texto style={styles.marca}>{diaMes(semanas[0]?.inicio ?? '')}</Texto>
        <Texto style={styles.marca}>{diaMes(semanas[semanas.length - 1]?.inicio ?? '')}</Texto>
      </View>

      <Pressable accessibilityRole="button" onPress={() => setVerTabela((v) => !v)} style={styles.botaoTabela}>
        <Texto style={styles.textoBotao}>{verTabela ? 'Esconder a tabela' : 'Ver como tabela'}</Texto>
      </Pressable>
      {verTabela ? (
        <View style={styles.tabela}>
          <View style={styles.linhaTabela}>
            <Texto style={[styles.celula, styles.cabecalho]}>Semana de</Texto>
            <Texto style={[styles.celulaNumero, styles.cabecalho]}>Registradas</Texto>
            <Texto style={[styles.celulaNumero, styles.cabecalho]}>Resolvidas</Texto>
          </View>
          {semanas.map((s) => (
            <View key={s.inicio} style={styles.linhaTabela}>
              <Texto style={styles.celula}>{diaMes(s.inicio)}</Texto>
              <Texto style={styles.celulaNumero}>{s.registradas}</Texto>
              <Texto style={styles.celulaNumero}>{s.resolvidas}</Texto>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: espaco.sm },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.md },
  itemLegenda: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amostra: { width: 20, height: 2 },
  amostraTracejada: { width: 20, height: 0, borderTopWidth: 2, borderStyle: 'dashed' },
  textoLegenda: { fontFamily: fontes.semibold, fontSize: 13, color: cores.asfalto },
  leitura: { fontFamily: fontes.extrabold, fontSize: 14, color: cores.asfalto },
  grafico: { flexDirection: 'row', height: ALTURA },
  eixoY: { width: EIXO_Y, justifyContent: 'space-between', paddingVertical: MARGEM - 7, alignItems: 'flex-end', paddingRight: 4 },
  plot: { flex: 1 },
  marca: { fontFamily: fontes.regular, fontSize: 11, lineHeight: 14, color: cores.textoSuave, fontVariant: ['tabular-nums'] },
  eixoX: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: EIXO_Y + MARGEM },
  botaoTabela: { minHeight: ALVO_TOQUE, justifyContent: 'center', alignSelf: 'flex-start' },
  textoBotao: { fontFamily: fontes.extrabold, fontSize: 14, color: cores.placa, textDecorationLine: 'underline' },
  tabela: { borderTopWidth: 1, borderColor: cores.borda },
  linhaTabela: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderColor: cores.borda },
  cabecalho: { fontFamily: fontes.extrabold },
  celula: { flex: 1, fontFamily: fontes.regular, fontSize: 13, color: cores.asfalto },
  celulaNumero: { flex: 1, textAlign: 'right', fontFamily: fontes.regular, fontSize: 13, color: cores.asfalto, fontVariant: ['tabular-nums'] },
});
