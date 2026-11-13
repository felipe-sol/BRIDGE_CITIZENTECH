import { randomUUID } from 'expo-crypto';

/** Gera a chave enviada em Idempotency-Key (uma por formulário de cadastro). */
export function novaChaveEnvio(): string {
  return randomUUID();
}
