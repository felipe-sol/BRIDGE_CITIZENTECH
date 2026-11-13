/**
 * Escalas e textos dos gráficos da aba Análises (o react-native-svg desenha; aqui só a conta).
 * Cada gráfico tem um resumo em texto para leitores de tela.
 */
import { ROTULO_CATEGORIA, type Categoria } from '../models/ocorrencia.ts';
import { formatarDecimal } from '../utils/formatacao.ts';

const SEM_DADOS = 'Sem dados no período.';
const LARGURA_MINIMA = 2;

/** Comprimento de cada barra, proporcional ao maior valor; um valor > 0 nunca some. */
export function escalaBarras(valores: readonly number[], larguraMax: number): number[] {
  const maior = Math.max(0, ...valores);
  if (maior === 0) return valores.map(() => 0);
  return valores.map((v) => (v <= 0 ? 0 : Math.max(LARGURA_MINIMA, Math.round((v / maior) * larguraMax))));
}

function arredondar(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Caminho SVG ("M x,y L x,y …") de uma série; o y cresce para baixo. */
export function caminhoLinha(valores: readonly number[], largura: number, altura: number, maximo: number): string {
  if (valores.length === 0) return '';
  const passo = valores.length === 1 ? 0 : largura / (valores.length - 1);
  return valores
    .map((v, i) => {
      const x = valores.length === 1 ? largura / 2 : i * passo;
      const y = maximo > 0 ? altura - (v / maximo) * altura : altura;
      return `${i === 0 ? 'M' : 'L'}${arredondar(x)},${arredondar(y)}`;
    })
    .join(' ');
}

/** Índice do ponto mais próximo de um toque em x (pontos espalhados de 0 a `largura`); -1 sem pontos. */
export function indiceMaisProximo(x: number, largura: number, quantidade: number): number {
  if (quantidade <= 0) return -1;
  if (quantidade === 1 || largura <= 0) return 0;
  const passo = largura / (quantidade - 1);
  return Math.min(quantidade - 1, Math.max(0, Math.round(x / passo)));
}

/** y do centro de cada rótulo do eixo, igual ao das linhas da grade (y cresce para baixo). */
export function posicoesMarcas(marcas: readonly number[], alturaPlot: number, margem: number, maximo: number): number[] {
  return marcas.map((m) => arredondar(margem + (maximo > 0 ? alturaPlot - (m / maximo) * alturaPlot : alturaPlot)));
}

/** Marcas "redondas" do eixo (passos de 1, 2 ou 5 vezes uma potência de 10), de 0 até cobrir o máximo. */
export function marcasEixo(maximo: number): number[] {
  if (maximo <= 0) return [0, 1];
  for (let potencia = 1; ; potencia *= 10) {
    for (const base of [1, 2, 5]) {
      const passo = base * potencia;
      const intervalos = Math.ceil(maximo / passo);
      if (intervalos <= 4) return Array.from({ length: intervalos + 1 }, (_, i) => i * passo);
    }
  }
}

export function resumoCategorias(itens: readonly { categoria: Categoria; total: number }[]): string {
  const comDados = itens.filter((i) => i.total > 0);
  if (comDados.length === 0) return SEM_DADOS;
  return `Por categoria: ${comDados.map((i) => `${ROTULO_CATEGORIA[i.categoria]} ${i.total}`).join(', ')}.`;
}

function diaMes(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia ?? ''}/${mes ?? ''}`;
}

export function resumoSemanal(semanas: readonly { inicio: string; registradas: number; resolvidas: number }[]): string {
  const registradas = semanas.reduce((s, x) => s + x.registradas, 0);
  const resolvidas = semanas.reduce((s, x) => s + x.resolvidas, 0);
  const primeira = semanas[0];
  if (primeira === undefined || registradas + resolvidas === 0) return SEM_DADOS;
  const pico = semanas.reduce((a, b) => (b.registradas > a.registradas ? b : a), primeira);
  const quantas = semanas.length === 1 ? '1 semana' : `${semanas.length} semanas`;
  return `${quantas}: ${registradas} registradas e ${resolvidas} resolvidas. Semana com mais registros: ${diaMes(pico.inicio)}, com ${pico.registradas}.`;
}

export function resumoRanking(itens: readonly { codigo: string; nome: string; total: number }[]): string {
  if (itens.length === 0) return SEM_DADOS;
  return `Regiões com mais relatos: ${itens.map((r, i) => `${i + 1}º ${r.nome} (${r.total})`).join(', ')}.`;
}

/** "3,5 dias", "1 dia" ou "—" quando não há resolvidas. */
export function formatarDias(dias: number | null): string {
  if (dias === null) return '—';
  return dias === 1 ? '1 dia' : `${formatarDecimal(dias, 1)} dias`;
}

/** Aviso honesto quando a área tem mais pontos do que o mapa recebeu. */
export function avisoTruncado(total: number, mostrados: number): string | null {
  return total > mostrados ? `Mostrando ${mostrados} de ${total} nesta área. Aproxime o mapa.` : null;
}
