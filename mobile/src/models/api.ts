/** Formato de erro padronizado da API: {"erro": {codigo, mensagem, detalhes}}. */
export interface DetalheErroApi {
  campo: string;
  mensagem: string;
}

export interface CorpoErroApi {
  codigo: string;
  mensagem: string;
  detalhes: DetalheErroApi[];
}
