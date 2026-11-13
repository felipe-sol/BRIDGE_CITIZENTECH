/**
 * Identidade visual do Bridge: vocabulário da sinalização urbana.
 * Asfalto (texto), concreto (fundo), amarelo de sinalização (ação principal)
 * e azul de placa (informação). Contrastes calculados para leitura confortável
 * (texto principal ≥ 7:1; botão amarelo com texto asfalto ≈ 8:1).
 */
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const cores = {
  asfalto: '#1F2A30',
  textoSuave: '#4A5961',
  concreto: '#EEF1F2',
  papel: '#FFFFFF',
  borda: '#B9C4C9',
  sinal: '#F2B705',
  sinalClaro: '#FFF4CC',
  placa: '#0B4F8A',
  placaClaro: '#E3EEF8',
  alerta: '#B3261E',
  alertaClaro: '#FBE9E7',
  ok: '#1E6B3A',
  okClaro: '#E4F2E8',
} as const;

export const espaco = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const raio = { sm: 6, md: 10, lg: 16 } as const;

export const fonteMono = Platform.select({ ios: 'Menlo', default: 'monospace' });

/**
 * Overpass (OFL), derivada das letras de placas de rodovia. Cada peso é uma
 * família própria: use fontFamily e NÃO fontWeight (no Android, fontWeight com
 * fonte customizada cai na fonte do sistema). Carregadas em src/app/_layout.tsx.
 */
export const fontes = {
  regular: 'Overpass_400Regular',
  semibold: 'Overpass_600SemiBold',
  extrabold: 'Overpass_800ExtraBold',
  black: 'Overpass_900Black',
} as const;

export const sombra = {
  cartao: Platform.select<ViewStyle>({
    ios: { shadowColor: cores.asfalto, shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    default: { elevation: 3 },
  }),
} as const;

export const texto = {
  titulo: { fontSize: 26, lineHeight: 32, fontFamily: fontes.black, color: cores.asfalto },
  subtitulo: { fontSize: 19, lineHeight: 25, fontFamily: fontes.extrabold, color: cores.asfalto },
  corpo: { fontSize: 17, lineHeight: 24, fontFamily: fontes.regular, color: cores.asfalto },
  apoio: { fontSize: 15, lineHeight: 21, fontFamily: fontes.regular, color: cores.textoSuave },
  // Rótulo em caixa alta com espaçamento, como em placas de sinalização.
  placa: { fontSize: 13, lineHeight: 17, fontFamily: fontes.extrabold, letterSpacing: 1.2, textTransform: 'uppercase', color: cores.textoSuave },
  dado: { fontSize: 15, lineHeight: 21, fontFamily: fonteMono, color: cores.asfalto },
  // Números de destaque (contagens, indicadores).
  numero: { fontSize: 28, lineHeight: 32, fontFamily: fontes.black, color: cores.asfalto },
} as const satisfies Record<string, TextStyle>;

export type VarianteTexto = keyof typeof texto;

/** Área mínima de toque recomendada para botões e controles. */
export const ALVO_TOQUE = 48;
