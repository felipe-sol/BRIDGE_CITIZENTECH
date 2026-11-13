import { interpretarUrlApi, type ConfigApi } from '../validation/urlApi';

/**
 * URL da API, definida em mobile/.env (EXPO_PUBLIC_API_URL).
 *
 * Atenção: variáveis EXPO_PUBLIC_* são embutidas no app e ficam PÚBLICAS.
 * Nunca coloque aqui senhas, tokens administrativos ou credenciais de banco.
 * O acesso precisa ser `process.env.EXPO_PUBLIC_API_URL` literal para o Expo substituir.
 */
export const configApi: ConfigApi = interpretarUrlApi(process.env.EXPO_PUBLIC_API_URL);
