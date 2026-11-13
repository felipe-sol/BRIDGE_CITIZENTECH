/** Validação pura da URL da API configurada em EXPO_PUBLIC_API_URL. */

export type ConfigApi =
  | { ok: true; baseUrl: string; apontaParaEsteAparelho: boolean }
  | { ok: false; motivo: string };

const URL_VALIDA = /^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?(\/[^\s?#]*)?$/;

export function interpretarUrlApi(valor: string | undefined): ConfigApi {
  const bruto = (valor ?? '').trim();
  if (bruto === '') {
    return {
      ok: false,
      motivo:
        'A URL da API não foi configurada. Crie o arquivo mobile/.env com EXPO_PUBLIC_API_URL=http://<IP-do-computador>:8000 e reinicie o Expo.',
    };
  }
  if (!URL_VALIDA.test(bruto)) {
    return {
      ok: false,
      motivo: `EXPO_PUBLIC_API_URL inválida ("${bruto}"). Use o formato http://192.168.0.10:8000.`,
    };
  }
  const baseUrl = bruto.replace(/\/+$/, '');
  // "localhost" no celular é o próprio celular, não o computador com a API.
  const apontaParaEsteAparelho = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(baseUrl);
  return { ok: true, baseUrl, apontaParaEsteAparelho };
}
