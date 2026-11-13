/** Em qual subprefeitura um ponto está, e busca de regiões por nome. */
import type { Coordenada, RegiaoSP } from './tipos.ts';

/** Ray casting: conta quantas arestas um raio horizontal cruza. */
function dentroDoAnel(ponto: Coordenada, anel: readonly Coordenada[]): boolean {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const a = anel[i];
    const b = anel[j];
    if (a === undefined || b === undefined) continue;
    if (a.latitude > ponto.latitude !== b.latitude > ponto.latitude) {
      const cruzamento =
        a.longitude + ((ponto.latitude - a.latitude) * (b.longitude - a.longitude)) / (b.latitude - a.latitude);
      if (ponto.longitude < cruzamento) dentro = !dentro;
    }
  }
  return dentro;
}

function dentroDaRegiao(ponto: Coordenada, regiao: RegiaoSP): boolean {
  const { caixa, aneis } = regiao;
  if (ponto.longitude < caixa.minLon || ponto.longitude > caixa.maxLon) return false;
  if (ponto.latitude < caixa.minLat || ponto.latitude > caixa.maxLat) return false;
  const [contorno, ...buracos] = aneis;
  if (contorno === undefined || !dentroDoAnel(ponto, contorno)) return false;
  return !buracos.some((buraco) => dentroDoAnel(ponto, buraco));
}

/** Subprefeitura que contém o ponto; null fora do município de São Paulo. */
export function localizarRegiao(ponto: Coordenada, regioes: readonly RegiaoSP[]): RegiaoSP | null {
  return regioes.find((regiao) => dentroDaRegiao(ponto, regiao)) ?? null;
}

/** Minúsculas, sem acentos e com espaços simples: "  São   Miguel " → "sao miguel". */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const MAX_RESULTADOS = 5;

/** Regiões cujo nome contém o texto (primeiro as que começam com ele). */
export function buscarRegioes(texto: string, regioes: readonly RegiaoSP[]): RegiaoSP[] {
  const busca = normalizarBusca(texto);
  if (busca.length < 2) return [];
  return regioes
    .map((regiao) => ({ regiao, nome: normalizarBusca(regiao.nome), oficial: normalizarBusca(regiao.nomeOficial) }))
    .filter(({ nome, oficial }) => nome.includes(busca) || oficial.includes(busca))
    .sort((a, b) => Number(b.nome.startsWith(busca)) - Number(a.nome.startsWith(busca)) || a.nome.localeCompare(b.nome))
    .slice(0, MAX_RESULTADOS)
    .map(({ regiao }) => regiao);
}
