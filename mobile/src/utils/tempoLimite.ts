/** Limite de tempo para operações nativas que podem não responder (GPS, geocodificação). */
export class TempoEsgotado extends Error {}

export function comLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolver, rejeitar) => {
    const temporizador = setTimeout(() => rejeitar(new TempoEsgotado()), ms);
    promessa.then(
      (valor) => {
        clearTimeout(temporizador);
        resolver(valor);
      },
      (erro: unknown) => {
        clearTimeout(temporizador);
        rejeitar(erro);
      },
    );
  });
}
