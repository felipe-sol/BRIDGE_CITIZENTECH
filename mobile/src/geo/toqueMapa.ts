/**
 * Toque no mapa → qual ícone foi tocado.
 *
 * No iPhone (Apple Maps), o toque nem sempre chega ao ícone (marcador): muitas vezes chega
 * só ao mapa, como "press", com a coordenada do dedo. Por isso o próprio app procura o ícone
 * mais próximo do dedo, em pontos da tela. Quando o ícone recebe o toque, o evento dele
 * ("marker-press") também sobe até o mapa — esse eco é ignorado para não tratar o toque duas vezes.
 */
import type { Coordenada, ItemMapa, RegiaoMapa } from './tipos.ts';

/** Até quantos pontos da tela do centro do ícone o toque conta como toque nele. */
export const RAIO_TOQUE_PX = 28;

export interface TamanhoMapa {
  largura: number;
  altura: number;
}

function coordenadaDoItem(item: ItemMapa): Coordenada {
  return item.tipo === 'ponto' ? item.ponto : item;
}

/** O ícone mais próximo do dedo, se estiver a até `raioPx` pontos da tela; senão, null. */
export function itemNoToque(
  itens: readonly ItemMapa[],
  toque: Coordenada,
  regiao: RegiaoMapa,
  tamanho: TamanhoMapa,
  raioPx: number = RAIO_TOQUE_PX,
): ItemMapa | null {
  if (tamanho.largura <= 0 || tamanho.altura <= 0 || regiao.latitudeDelta <= 0 || regiao.longitudeDelta <= 0) {
    return null;
  }
  const pxPorGrauLon = tamanho.largura / regiao.longitudeDelta;
  const pxPorGrauLat = tamanho.altura / regiao.latitudeDelta;
  const limite = raioPx * raioPx;

  let melhor: ItemMapa | null = null;
  let menor = Number.POSITIVE_INFINITY;
  for (const item of itens) {
    const c = coordenadaDoItem(item);
    const dx = (c.longitude - toque.longitude) * pxPorGrauLon;
    const dy = (c.latitude - toque.latitude) * pxPorGrauLat;
    const d2 = dx * dx + dy * dy;
    if (d2 <= limite && d2 < menor) {
      melhor = item;
      menor = d2;
    }
  }
  return melhor;
}

export type DecisaoToqueMapa = { tipo: 'ignorar' } | { tipo: 'item'; item: ItemMapa } | { tipo: 'fechar' };

/** "marker-press" = eco do toque que o ícone já tratou; perto de um ícone = abre; lugar vazio = fecha o cartão. */
export function decidirToqueMapa(acao: string | undefined, item: ItemMapa | null): DecisaoToqueMapa {
  if (acao === 'marker-press') return { tipo: 'ignorar' };
  return item ? { tipo: 'item', item } : { tipo: 'fechar' };
}
