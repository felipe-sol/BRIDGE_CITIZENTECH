/**
 * Ícones do app (Material Community Icons, incluídos no Expo Go). A lista é
 * fechada: só nomes conferidos contra o mapa de glifos do pacote.
 */
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { Categoria } from '../models/ocorrencia';
import { cores } from '../theme/tema';

export const NOMES_ICONE = [
  'walk',
  'road-variant',
  'lightbulb-off-outline',
  'traffic-cone',
  'dots-horizontal-circle-outline',
  'home-variant',
  'home-variant-outline',
  'map',
  'map-outline',
  'progress-check',
  'account-circle',
  'account-circle-outline',
  'plus',
  'crosshairs-gps',
  'magnify',
  'filter-variant',
  'layers-outline',
  'share-variant',
  'check-circle-outline',
  'account-multiple-plus-outline',
  'account-multiple',
  'close',
  'chevron-right',
  'camera-outline',
  'image-outline',
  'map-marker-outline',
  'map-marker-radius-outline',
  'alert-outline',
  'information-outline',
  'refresh',
  'arrow-left',
  'clock-outline',
  'undo-variant',
  'wifi-off',
] as const;

export type NomeIcone = (typeof NOMES_ICONE)[number];

export const ICONE_CATEGORIA: Record<Categoria, NomeIcone> = {
  CALCADA_DANIFICADA: 'walk',
  BURACO: 'road-variant',
  ILUMINACAO_DEFEITUOSA: 'lightbulb-off-outline',
  OBSTACULO_CIRCULACAO: 'traffic-cone',
  OUTRO: 'dots-horizontal-circle-outline',
};

interface PropsIcone {
  nome: NomeIcone;
  tamanho?: number;
  cor?: string;
  /** Só informe quando o ícone carrega significado sozinho (sem texto ao lado). */
  rotulo?: string;
}

export function Icone({ nome, tamanho = 24, cor = cores.asfalto, rotulo }: PropsIcone) {
  return (
    <MaterialCommunityIcons
      name={nome}
      size={tamanho}
      color={cor}
      accessible={rotulo !== undefined}
      accessibilityLabel={rotulo}
      importantForAccessibility={rotulo === undefined ? 'no-hide-descendants' : 'yes'}
    />
  );
}
