/**
 * Agrupamento de marcadores para o mapa não travar com muitos pontos.
 *
 * Com zoom afastado, junta os pontos numa grade e mostra um grupo com contagem por célula
 * (no máximo 64 itens desenhados). A grade é PRESA AO MAPA, não à tela: as células têm
 * tamanho fixo por nível de zoom (potência de 2, em graus), então arrastar o mapa não
 * reagrupa nem move as bolhas. Pontos fora da área visível (mais uma margem de 10%) não
 * entram — senão inflariam os grupos da borda com o que nem está na tela.
 */
import type { Prioridade } from '../models/ocorrencia.ts';
import type { ItemMapa, PontoMapa, RegiaoMapa } from './tipos.ts';

const CELULAS_POR_LADO = 8;
/** Abaixo disso (≈ 2 km de altura visível) cada ocorrência aparece sozinha. */
const DELTA_SEM_AGRUPAR = 0.02;
/** Fração da área visível incluída além de cada borda (marcadores entram suavemente ao arrastar). */
const MARGEM = 0.1;

const PESO: Record<Prioridade, number> = { BAIXA: 1, MEDIA: 2, ALTA: 3 };

/**
 * Lado da célula: a menor potência de 2 (em graus) que faz a área coberta caber em
 * CELULAS_POR_LADO − 1 células; desalinhada da grade, ela cruza no máximo CELULAS_POR_LADO.
 */
function tamanhoCelula(deltaCoberto: number): number {
  return 2 ** Math.ceil(Math.log2(deltaCoberto / (CELULAS_POR_LADO - 1)));
}

function naArea(ponto: PontoMapa, regiao: RegiaoMapa): boolean {
  const meiaLat = (regiao.latitudeDelta / 2) * (1 + 2 * MARGEM);
  const meiaLon = (regiao.longitudeDelta / 2) * (1 + 2 * MARGEM);
  return Math.abs(ponto.latitude - regiao.latitude) <= meiaLat && Math.abs(ponto.longitude - regiao.longitude) <= meiaLon;
}

export function agruparPontos(pontos: readonly PontoMapa[], regiao: RegiaoMapa): ItemMapa[] {
  const visiveis = pontos.filter((ponto) => naArea(ponto, regiao));
  if (regiao.latitudeDelta < DELTA_SEM_AGRUPAR) return visiveis.map((ponto) => ({ tipo: 'ponto', ponto }));

  const tamanhoLat = tamanhoCelula(regiao.latitudeDelta * (1 + 2 * MARGEM));
  const tamanhoLon = tamanhoCelula(regiao.longitudeDelta * (1 + 2 * MARGEM));

  const celulas = new Map<string, PontoMapa[]>();
  for (const ponto of visiveis) {
    const chave = `${Math.floor(ponto.latitude / tamanhoLat)}:${Math.floor(ponto.longitude / tamanhoLon)}`;
    const grupo = celulas.get(chave);
    if (grupo) grupo.push(ponto);
    else celulas.set(chave, [ponto]);
  }

  return [...celulas.entries()].map(([chave, grupo]): ItemMapa => {
    const [primeiro] = grupo;
    if (grupo.length === 1 && primeiro !== undefined) return { tipo: 'ponto', ponto: primeiro };
    const maior = grupo.reduce<Prioridade>((atual, p) => (PESO[p.prioridade] > PESO[atual] ? p.prioridade : atual), 'BAIXA');
    return {
      tipo: 'grupo',
      chave,
      latitude: grupo.reduce((soma, p) => soma + p.latitude, 0) / grupo.length,
      longitude: grupo.reduce((soma, p) => soma + p.longitude, 0) / grupo.length,
      quantidade: grupo.length,
      maiorPrioridade: maior,
    };
  });
}
