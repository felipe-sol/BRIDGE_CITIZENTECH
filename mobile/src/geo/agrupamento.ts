/**
 * Agrupamento de marcadores para o mapa não travar com muitos pontos:
 * com zoom afastado, divide a área visível numa grade 8×8 e junta os pontos de
 * cada célula num grupo com contagem (no máximo 64 itens desenhados).
 */
import type { Prioridade } from '../models/ocorrencia.ts';
import type { ItemMapa, PontoMapa, RegiaoMapa } from './tipos.ts';

const CELULAS_POR_LADO = 8;
/** Abaixo disso (≈ 2 km de altura visível) cada ocorrência aparece sozinha. */
const DELTA_SEM_AGRUPAR = 0.02;

const PESO: Record<Prioridade, number> = { BAIXA: 1, MEDIA: 2, ALTA: 3 };

function celula(valor: number, inicio: number, tamanho: number): number {
  const indice = Math.floor((valor - inicio) / tamanho);
  return Math.min(CELULAS_POR_LADO - 1, Math.max(0, indice));
}

export function agruparPontos(pontos: readonly PontoMapa[], regiao: RegiaoMapa): ItemMapa[] {
  if (regiao.latitudeDelta < DELTA_SEM_AGRUPAR) return pontos.map((ponto) => ({ tipo: 'ponto', ponto }));

  const tamanhoLat = regiao.latitudeDelta / CELULAS_POR_LADO;
  const tamanhoLon = regiao.longitudeDelta / CELULAS_POR_LADO;
  const inicioLat = regiao.latitude - regiao.latitudeDelta / 2;
  const inicioLon = regiao.longitude - regiao.longitudeDelta / 2;

  const celulas = new Map<string, PontoMapa[]>();
  for (const ponto of pontos) {
    const chave = `${celula(ponto.latitude, inicioLat, tamanhoLat)}-${celula(ponto.longitude, inicioLon, tamanhoLon)}`;
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
