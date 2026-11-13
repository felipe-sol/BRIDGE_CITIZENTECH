/**
 * Ajustes do Perfil (Texto maior, Avisos de atualização no app) para o app inteiro.
 * Começa com o padrão e troca pelo que está salvo assim que a leitura termina.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ESCALA_TEXTO_MAIOR, PREFERENCIAS_PADRAO, type Preferencias } from '../preferencias/preferencias';
import { lerPreferencias, salvarPreferencias } from '../services/preferenciasLocal';

interface ValorPreferencias {
  preferencias: Preferencias;
  alterar: (parcial: Partial<Preferencias>) => void;
}

const Contexto = createContext<ValorPreferencias>({ preferencias: { ...PREFERENCIAS_PADRAO }, alterar: () => undefined });

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [preferencias, setPreferencias] = useState<Preferencias>({ ...PREFERENCIAS_PADRAO });

  useEffect(() => {
    let ativo = true;
    lerPreferencias()
      .then((p) => {
        if (ativo) setPreferencias(p);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);

  const alterar = useCallback((parcial: Partial<Preferencias>) => {
    setPreferencias((atual) => {
      const novas = { ...atual, ...parcial };
      salvarPreferencias(novas).catch(() => undefined);
      return novas;
    });
  }, []);

  const valor = useMemo(() => ({ preferencias, alterar }), [preferencias, alterar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usePreferencias(): ValorPreferencias {
  return useContext(Contexto);
}

/** 1 com o texto normal; ESCALA_TEXTO_MAIOR com "Texto maior" ligado. */
export function useEscalaTexto(): number {
  return useContext(Contexto).preferencias.textoMaior ? ESCALA_TEXTO_MAIOR : 1;
}
