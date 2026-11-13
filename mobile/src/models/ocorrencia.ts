/**
 * Modelos de domínio do app. Espelham o contrato da API (docs/CONTRATO_API.md),
 * já convertidos de snake_case (API) para camelCase (app) pelos parsers em
 * src/validation/respostas.ts.
 */

export const CATEGORIAS = [
  'CALCADA_DANIFICADA',
  'BURACO',
  'ILUMINACAO_DEFEITUOSA',
  'OBSTACULO_CIRCULACAO',
  'OUTRO',
] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const STATUS_OCORRENCIA = ['ABERTA', 'EM_ANALISE', 'EM_ANDAMENTO', 'RESOLVIDA', 'REJEITADA'] as const;
export type StatusOcorrencia = (typeof STATUS_OCORRENCIA)[number];

export const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA'] as const;
export type Prioridade = (typeof PRIORIDADES)[number];

export const STATUS_ANALISE_IA = ['PENDENTE', 'CONCLUIDA', 'INDISPONIVEL', 'FALHOU'] as const;

/** APP = registrada por uma pessoa; SIMULADA = dado fictício de demonstração. */
export const ORIGENS = ['APP', 'SIMULADA'] as const;
export type Origem = (typeof ORIGENS)[number];
export type StatusAnaliseIA = (typeof STATUS_ANALISE_IA)[number];

export const ROTULO_CATEGORIA: Record<Categoria, string> = {
  CALCADA_DANIFICADA: 'Calçada danificada',
  BURACO: 'Buraco',
  ILUMINACAO_DEFEITUOSA: 'Iluminação defeituosa',
  OBSTACULO_CIRCULACAO: 'Obstáculo à circulação',
  OUTRO: 'Outro problema',
};

export const ROTULO_STATUS: Record<StatusOcorrencia, string> = {
  ABERTA: 'Aberta',
  EM_ANALISE: 'Em análise',
  EM_ANDAMENTO: 'Em andamento',
  RESOLVIDA: 'Resolvida',
  REJEITADA: 'Rejeitada',
};

export const ROTULO_PRIORIDADE: Record<Prioridade, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
};

export interface AnaliseIA {
  status: StatusAnaliseIA;
  categoriaSugerida: string | null;
  /** Só existe se o modelo fornecer esse valor (0 a 1). */
  confianca: number | null;
  versaoModelo: string | null;
  analisadaEm: string | null;
}

/** Subprefeitura oficial (GeoSampa) calculada pela API a partir das coordenadas. */
export interface Subprefeitura {
  codigo: string;
  nome: string;
}

export interface Ocorrencia {
  id: number;
  titulo: string;
  descricao: string;
  categoria: Categoria;
  latitude: number;
  longitude: number;
  /** Endereço legível sugerido pelo aparelho no cadastro (pode faltar). */
  endereco: string | null;
  /** null fora do município de São Paulo. */
  subprefeitura: Subprefeitura | null;
  /** Quantas outras pessoas disseram "eu também vi". */
  confirmacoes: number;
  origem: Origem;
  riscoImediato: boolean;
  bloqueiaPassagem: boolean;
  afetaAcessibilidade: boolean;
  status: StatusOcorrencia;
  prioridade: Prioridade;
  prioridadePontuacao: number;
  prioridadeJustificativa: string;
  /** Caminho relativo à base da API (ex.: "/ocorrencias/12/imagem") ou null. */
  imagemUrl: string | null;
  analiseIa: AnaliseIA;
  criadoEm: string;
  atualizadoEm: string;
}

export interface RegistroHistorico {
  statusAnterior: StatusOcorrencia | null;
  statusNovo: StatusOcorrencia;
  observacao: string | null;
  alteradoEm: string;
}

/** Relação de QUEM PERGUNTA com a ocorrência (a API nunca expõe o autor). */
export interface RelacaoOcorrencia {
  registrei: boolean;
  confirmei: boolean;
}

export interface OcorrenciaDetalhe extends Ocorrencia {
  historico: RegistroHistorico[];
  /** null quando a consulta foi feita sem identificação. */
  minhaRelacao: RelacaoOcorrencia | null;
}

/** Ocorrência aberta perto de um ponto (checagem de duplicatas). */
export type OcorrenciaProxima = Ocorrencia & { distanciaM: number };

export interface ResultadoConfirmacao {
  ocorrenciaId: number;
  confirmacoes: number;
  confirmado: boolean;
}

/** Números de uma subprefeitura (GET /estatisticas/regioes). */
export interface EstatisticaRegiao {
  codigo: string;
  nome: string;
  total: number;
  abertas: number;
  altaAbertas: number;
  resolvidas: number;
  confirmacoes: number;
  densidadeKm2: number;
  /** Alerta Bridge dos últimos 30 dias: calculado automaticamente a partir dos relatos (não é oficial). */
  alerta: AlertaRegiao;
}

export const NIVEIS_ALERTA = ['NORMAL', 'ATENCAO', 'ALERTA'] as const;
export type NivelAlerta = (typeof NIVEIS_ALERTA)[number];

export interface AlertaRegiao {
  nivel: NivelAlerta;
  indice: number;
  abertas30d: number;
  abertasAlta30d: number;
}

/** GET /estatisticas/resumo (aba Análises). */
export interface ResumoEstatisticas {
  origem: Origem;
  dias: number | null;
  total: number;
  abertas: number;
  resolvidas: number;
  rejeitadas: number;
  /** null quando ainda não há ocorrências. */
  percentualResolvidas: number | null;
  /** null quando nenhuma foi resolvida. */
  tempoMedioResolucaoDias: number | null;
  alertasAtivos: number;
  regioesEmAtencao: number;
  porCategoria: { categoria: Categoria; total: number }[];
  /** `inicio` = segunda-feira (AAAA-MM-DD, horário de São Paulo). */
  semanal: { inicio: string; registradas: number; resolvidas: number }[];
  rankingRegioes: { codigo: string; nome: string; total: number }[];
}

export interface PaginaOcorrencias {
  itens: Ocorrencia[];
  pagina: number;
  tamanho: number;
  total: number;
  totalPaginas: number;
}

/** Dados já validados, prontos para POST /ocorrencias. */
export interface NovaOcorrencia {
  identificacaoId: string;
  titulo: string;
  descricao: string;
  categoria: Categoria;
  latitude: number;
  longitude: number;
  riscoImediato: boolean;
  bloqueiaPassagem: boolean;
  afetaAcessibilidade: boolean;
  /** Endereço legível (até 200 caracteres) ou null. */
  endereco: string | null;
}

export function ehCategoria(valor: string): valor is Categoria {
  return (CATEGORIAS as readonly string[]).includes(valor);
}
