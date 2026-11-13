/**
 * Funções de narrowing para dados `unknown` vindos de fora do app (respostas
 * HTTP, AsyncStorage). Tipos estáticos não validam o que chega pela rede, então
 * conferimos em tempo de execução os campos que o app usa.
 */

export class ErroFormato extends Error {
  override name = 'ErroFormato';
}

export type Objeto = Record<string, unknown>;

export function ehObjeto(valor: unknown): valor is Objeto {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

export function objeto(valor: unknown, contexto: string): Objeto {
  if (!ehObjeto(valor)) throw new ErroFormato(`${contexto}: esperado um objeto.`);
  return valor;
}

export function texto(o: Objeto, campo: string): string {
  const v = o[campo];
  if (typeof v !== 'string') throw new ErroFormato(`Campo "${campo}" ausente ou não é texto.`);
  return v;
}

export function textoOuNulo(o: Objeto, campo: string): string | null {
  const v = o[campo];
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') throw new ErroFormato(`Campo "${campo}" não é texto.`);
  return v;
}

export function numero(o: Objeto, campo: string): number {
  const v = o[campo];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new ErroFormato(`Campo "${campo}" ausente ou não é número.`);
  }
  return v;
}

export function inteiro(o: Objeto, campo: string): number {
  const v = numero(o, campo);
  if (!Number.isInteger(v)) throw new ErroFormato(`Campo "${campo}" não é inteiro.`);
  return v;
}

export function numeroOuNulo(o: Objeto, campo: string): number | null {
  const v = o[campo];
  if (v === null || v === undefined) return null;
  return numero(o, campo);
}

export function booleano(o: Objeto, campo: string): boolean {
  const v = o[campo];
  if (typeof v !== 'boolean') throw new ErroFormato(`Campo "${campo}" ausente ou não é booleano.`);
  return v;
}

export function umDe<T extends string>(o: Objeto, campo: string, valores: readonly T[]): T {
  const v = texto(o, campo);
  const encontrado = valores.find((permitido) => permitido === v);
  if (encontrado === undefined) throw new ErroFormato(`Campo "${campo}" com valor inesperado: ${v}.`);
  return encontrado;
}

export function umDeOuNulo<T extends string>(o: Objeto, campo: string, valores: readonly T[]): T | null {
  const v = o[campo];
  if (v === null || v === undefined) return null;
  return umDe(o, campo, valores);
}

export function lista<T>(o: Objeto, campo: string, item: (valor: unknown) => T): T[] {
  const v = o[campo];
  if (!Array.isArray(v)) throw new ErroFormato(`Campo "${campo}" ausente ou não é lista.`);
  return v.map((elemento: unknown) => item(elemento));
}
