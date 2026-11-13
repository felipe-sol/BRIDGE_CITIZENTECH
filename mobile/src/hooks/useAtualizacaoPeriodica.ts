/**
 * "Ao vivo": executa ao focar a tela e a cada intervalo; pausa quando a tela
 * perde o foco ou o app vai para segundo plano (economiza bateria e dados).
 * Não é instantâneo: a tela informa "atualizado há X s".
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

export function useAtualizacaoPeriodica(executar: () => Promise<void>, intervaloMs: number): void {
  const executarRef = useRef(executar);
  useEffect(() => {
    executarRef.current = executar;
  }, [executar]);

  useFocusEffect(
    useCallback(() => {
      const rodar = () => {
        if (AppState.currentState !== 'active') return;
        // Quem chama trata os próprios erros; aqui só evitamos rejeição solta.
        executarRef.current().catch(() => undefined);
      };
      rodar();
      const temporizador = setInterval(rodar, intervaloMs);
      const assinatura = AppState.addEventListener('change', (estado) => {
        if (estado === 'active') rodar();
      });
      return () => {
        clearInterval(temporizador);
        assinatura.remove();
      };
    }, [intervaloMs]),
  );
}
