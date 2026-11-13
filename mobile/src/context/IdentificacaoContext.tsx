/**
 * Estado global da identificação do cidadão, lido do AsyncStorage ao abrir o app.
 *
 * Estados: carregando → (ausente | presente | erro).
 * Quando presente, confirma em segundo plano se a identificação ainda existe no
 * servidor (ex.: banco de demonstração recriado). Sem rede, mantém a local.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Identificacao } from '../models/identificacao';
import { ErroApi } from '../services/http';
import { obterIdentificacao } from '../services/identificacoesService';
import {
  ErroArmazenamentoLocal,
  lerIdentificacaoSalva,
  limparIdentificacao,
  salvarIdentificacao,
} from '../services/identificacaoLocal';

export type VerificacaoServidor = 'verificando' | 'confirmada' | 'nao_encontrada' | 'nao_verificada';

export type EstadoIdentificacao =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'ausente' }
  | { tipo: 'presente'; identificacao: Identificacao; verificacao: VerificacaoServidor };

interface ValorContexto {
  estado: EstadoIdentificacao;
  definir: (identificacao: Identificacao) => Promise<void>;
  limpar: () => Promise<void>;
  recarregar: () => void;
}

const Contexto = createContext<ValorContexto | null>(null);

export function IdentificacaoProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoIdentificacao>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;

    async function carregar(): Promise<void> {
      setEstado({ tipo: 'carregando' });
      let salva: Identificacao | null;
      try {
        salva = await lerIdentificacaoSalva();
      } catch (erro: unknown) {
        if (!ativo) return;
        const mensagem = erro instanceof ErroArmazenamentoLocal ? erro.message : 'Falha ao ler dados do aparelho.';
        setEstado({ tipo: 'erro', mensagem });
        return;
      }
      if (!ativo) return;
      if (salva === null) {
        setEstado({ tipo: 'ausente' });
        return;
      }
      const identificacao = salva;
      setEstado({ tipo: 'presente', identificacao, verificacao: 'verificando' });

      try {
        await obterIdentificacao(identificacao.id);
        if (ativo) setEstado({ tipo: 'presente', identificacao, verificacao: 'confirmada' });
      } catch (erro: unknown) {
        if (!ativo) return;
        const naoExiste = erro instanceof ErroApi && erro.status === 404;
        setEstado({ tipo: 'presente', identificacao, verificacao: naoExiste ? 'nao_encontrada' : 'nao_verificada' });
      }
    }

    void carregar();
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  const definir = useCallback(async (identificacao: Identificacao) => {
    await salvarIdentificacao(identificacao);
    setEstado({ tipo: 'presente', identificacao, verificacao: 'confirmada' });
  }, []);

  const limpar = useCallback(async () => {
    await limparIdentificacao();
    setEstado({ tipo: 'ausente' });
  }, []);

  const recarregar = useCallback(() => setTentativa((n) => n + 1), []);

  const valor = useMemo(() => ({ estado, definir, limpar, recarregar }), [estado, definir, limpar, recarregar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useIdentificacao(): ValorContexto {
  const valor = useContext(Contexto);
  if (valor === null) throw new Error('useIdentificacao precisa estar dentro de <IdentificacaoProvider>.');
  return valor;
}
