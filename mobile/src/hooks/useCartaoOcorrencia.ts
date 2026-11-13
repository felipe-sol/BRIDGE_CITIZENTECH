/**
 * Estado do cartão que abre ao tocar numa ocorrência no mapa: carrega o detalhe (foto,
 * andamento, relação da pessoa) e faz "Eu também vi". A resposta de um toque antigo é
 * descartada pelo id da ocorrência.
 */
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';

import type { EstadoCartao } from '../components/mapa/CartaoOcorrenciaMapa';
import type { OcorrenciaDetalhe } from '../models/ocorrencia';
import { mensagemDeErro } from '../services/http';
import { confirmarOcorrencia, desfazerConfirmacao, obterOcorrencia } from '../services/ocorrenciasService';

export function useCartaoOcorrencia(identificacaoId: string | undefined) {
  const [estado, setEstado] = useState<EstadoCartao>({ tipo: 'carregando' });
  const [relatando, setRelatando] = useState(false);
  const [erroRelato, setErroRelato] = useState<string | null>(null);
  const idAtual = useRef<number | null>(null);

  const carregar = useCallback(
    (id: number) => {
      idAtual.current = id;
      setEstado({ tipo: 'carregando' });
      setErroRelato(null);
      obterOcorrencia(id, identificacaoId)
        .then((ocorrencia) => {
          if (idAtual.current === id) setEstado({ tipo: 'ok', ocorrencia });
        })
        .catch(() => {
          if (idAtual.current === id) setEstado({ tipo: 'erro' });
        });
    },
    [identificacaoId],
  );

  const esquecer = useCallback(() => {
    idAtual.current = null;
  }, []);

  const alternarRelato = useCallback(
    async (o: OcorrenciaDetalhe) => {
      if (identificacaoId === undefined) return;
      setRelatando(true);
      setErroRelato(null);
      try {
        if (o.minhaRelacao?.confirmei) await desfazerConfirmacao(o.id, identificacaoId);
        else await confirmarOcorrencia(o.id, identificacaoId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        const atualizada = await obterOcorrencia(o.id, identificacaoId);
        if (idAtual.current === o.id) setEstado({ tipo: 'ok', ocorrencia: atualizada });
      } catch (erro: unknown) {
        setErroRelato(mensagemDeErro(erro));
      } finally {
        setRelatando(false);
      }
    },
    [identificacaoId],
  );

  return { estado, relatando, erroRelato, carregar, esquecer, alternarRelato };
}
