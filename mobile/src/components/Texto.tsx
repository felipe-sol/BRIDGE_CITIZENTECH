/** Texto com a tipografia do Bridge (Overpass). Use no lugar de <Text> nas telas novas. */
import { Text, type TextProps } from 'react-native';

import { texto, type VarianteTexto } from '../theme/tema';

interface PropsTexto extends TextProps {
  variante?: VarianteTexto;
}

export function Texto({ variante = 'corpo', style, ...props }: PropsTexto) {
  return <Text {...props} style={[texto[variante], style]} />;
}
