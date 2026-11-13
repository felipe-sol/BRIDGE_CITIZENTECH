/**
 * Cliente HTTP do app: base URL centralizada, tempo limite, erros tipados e
 * validação do JSON recebido (unknown → modelo) antes de chegar às telas.
 */
import { configApi } from '../config/ambiente';
import type { DetalheErroApi } from '../models/api';
import { ErroFormato } from '../validation/guardas';
import { parseErroApi } from '../validation/respostas';

const TEMPO_LIMITE_PADRAO_MS = 15_000;

/** A API respondeu com erro (4xx/5xx) no formato padronizado. */
export class ErroApi extends Error {
  override name = 'ErroApi';
  readonly status: number;
  readonly codigo: string;
  readonly detalhes: DetalheErroApi[];

  constructor(status: number, codigo: string, mensagem: string, detalhes: DetalheErroApi[]) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

/** Não houve resposta: servidor fora do ar, rede diferente, firewall ou tempo esgotado. */
export class ErroRede extends Error {
  override name = 'ErroRede';
}

/** A API respondeu, mas fora do formato do contrato. */
export class ErroRespostaInvalida extends Error {
  override name = 'ErroRespostaInvalida';
}

/** EXPO_PUBLIC_API_URL ausente ou malformada. */
export class ErroConfiguracao extends Error {
  override name = 'ErroConfiguracao';
}

export function baseUrlApi(): string {
  if (!configApi.ok) throw new ErroConfiguracao(configApi.motivo);
  return configApi.baseUrl;
}

/** Monta a URL absoluta de um caminho devolvido pela API (ex.: imagem_url). */
export function urlAbsoluta(caminho: string): string {
  return `${baseUrlApi()}${caminho.startsWith('/') ? caminho : `/${caminho}`}`;
}

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroApi || erro instanceof ErroRede || erro instanceof ErroConfiguracao) return erro.message;
  if (erro instanceof ErroRespostaInvalida) return `A API respondeu em formato inesperado. ${erro.message}`;
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

function mensagemSemConexao(motivo: 'tempo' | 'rede'): string {
  const base = configApi.ok ? configApi.baseUrl : 'a API';
  const causa =
    motivo === 'tempo' ? `A API (${base}) demorou demais para responder.` : `Não foi possível conectar à API (${base}).`;
  const dica =
    configApi.ok && configApi.apontaParaEsteAparelho
      ? ' "localhost" no celular aponta para o próprio celular: use o IP do computador na rede Wi-Fi.'
      : ' Confira se o servidor está rodando e se o celular está na mesma rede Wi-Fi do computador.';
  return causa + dica;
}

/** Interpreta status + texto de uma resposta e valida o corpo com `interpretar`. */
export function interpretarResposta<T>(status: number, corpoTexto: string, interpretar: (dados: unknown) => T): T {
  let dados: unknown = null;
  if (corpoTexto.length > 0) {
    try {
      dados = JSON.parse(corpoTexto);
    } catch {
      throw new ErroRespostaInvalida(`Resposta HTTP ${status} não é JSON.`);
    }
  }

  if (status < 200 || status >= 300) {
    const erro = parseErroApi(dados);
    if (erro) throw new ErroApi(status, erro.codigo, erro.mensagem, erro.detalhes);
    throw new ErroApi(status, 'ERRO_HTTP', `A API respondeu com erro HTTP ${status}.`, []);
  }

  try {
    return interpretar(dados);
  } catch (erro: unknown) {
    if (erro instanceof ErroFormato) throw new ErroRespostaInvalida(erro.message);
    throw erro;
  }
}

/** Executa `operacao` com AbortController e tempo limite, convertendo falhas de rede em ErroRede. */
export async function comTempoLimite<T>(operacao: (sinal: AbortSignal) => Promise<T>, tempoMs: number): Promise<T> {
  const controle = new AbortController();
  let estourou = false;
  const temporizador = setTimeout(() => {
    estourou = true;
    controle.abort();
  }, tempoMs);
  try {
    return await operacao(controle.signal);
  } catch (erro: unknown) {
    if (erro instanceof ErroApi || erro instanceof ErroRespostaInvalida) throw erro;
    throw new ErroRede(mensagemSemConexao(estourou ? 'tempo' : 'rede'));
  } finally {
    clearTimeout(temporizador);
  }
}

interface OpcoesRequisicao {
  metodo?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  corpo?: unknown;
  cabecalhos?: Record<string, string>;
  tempoLimiteMs?: number;
}

/** Requisição JSON à API. */
export async function requisitarJson<T>(
  caminho: string,
  interpretar: (dados: unknown) => T,
  opcoes: OpcoesRequisicao = {},
): Promise<T> {
  const url = `${baseUrlApi()}${caminho}`;
  const cabecalhos: Record<string, string> = { Accept: 'application/json', ...opcoes.cabecalhos };
  if (opcoes.corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';

  return comTempoLimite(async (sinal) => {
    const resposta = await fetch(url, {
      method: opcoes.metodo ?? 'GET',
      headers: cabecalhos,
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
      signal: sinal,
    });
    const texto = await resposta.text();
    return interpretarResposta(resposta.status, texto, interpretar);
  }, opcoes.tempoLimiteMs ?? TEMPO_LIMITE_PADRAO_MS);
}
