/**
 * Texto com a tipografia do Bridge (Overpass). Use no lugar de <Text> nas telas.
 * Respeita o ajuste "Texto maior" do Perfil: escala o tamanho e a altura da linha.
 */
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useEscalaTexto } from '../context/PreferenciasContext';
import { escalarEstiloTexto } from '../preferencias/preferencias';
import { texto, type VarianteTexto } from '../theme/tema';

interface PropsTexto extends TextProps {
  variante?: VarianteTexto;
}

/** <Text> com o ajuste "Texto maior" aplicado ao estilo final (sem variante de tipografia). */
export function TextoEscalavel({ style, ...props }: TextProps) {
  const escala = useEscalaTexto();
  const escalado = escala === 1 ? null : escalarEstiloTexto(StyleSheet.flatten(style) ?? {}, escala);
  return <Text {...props} style={[style, escalado]} />;
}

export function Texto({ variante = 'corpo', style, ...props }: PropsTexto) {
  return <TextoEscalavel {...props} style={[texto[variante], style]} />;
}
