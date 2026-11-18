/** Relógio para textos como "há 5 min": o horário de referência anda a cada `intervaloMs`. */
import { useEffect, useState } from 'react';

export function useAgora(intervaloMs: number): number {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => clearInterval(relogio);
  }, [intervaloMs]);
  return agora;
}
