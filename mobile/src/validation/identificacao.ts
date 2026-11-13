/** Validação pura do apelido (mesmas regras do backend: 2 a 60 caracteres). */

export const APELIDO_MIN = 2;
export const APELIDO_MAX = 60;

export type ResultadoApelido = { ok: true; apelido: string } | { ok: false; erro: string };

export function validarApelido(entrada: string): ResultadoApelido {
  const apelido = entrada.trim().replace(/\s+/g, ' ');
  if (apelido.length === 0) return { ok: false, erro: 'Informe como você quer ser chamado.' };
  if (apelido.length < APELIDO_MIN) {
    return { ok: false, erro: `O apelido precisa ter pelo menos ${APELIDO_MIN} caracteres.` };
  }
  if (apelido.length > APELIDO_MAX) {
    return { ok: false, erro: `O apelido pode ter no máximo ${APELIDO_MAX} caracteres.` };
  }
  return { ok: true, apelido };
}
