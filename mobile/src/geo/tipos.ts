/** Tipos geográficos do app (puros, sem dependência de bibliotecas nativas). */
import type { Categoria, Prioridade, StatusOcorrencia } from '../models/ocorrencia.ts';

export interface Coordenada {
  latitude: number;
  longitude: number;
}

/** Retângulo em graus (ordem do GeoJSON na API: min_lon, min_lat, max_lon, max_lat). */
export interface Caixa {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

/** Mesma forma da `Region` do react-native-maps: centro + tamanho visível em graus. */
export interface RegiaoMapa {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/** Subprefeitura de São Paulo (limites oficiais do GeoSampa, simplificados). */
export interface RegiaoSP {
  codigo: string;
  nome: string;
  nomeOficial: string;
  areaKm2: number;
  zona: string | null;
  /** Primeiro anel = contorno; demais = buracos. */
  aneis: Coordenada[][];
  caixa: Caixa;
  centro: Coordenada;
}

/** O mínimo que o mapa precisa de uma ocorrência para desenhar o marcador. */
export interface PontoMapa {
  id: number;
  latitude: number;
  longitude: number;
  categoria: Categoria;
  prioridade: Prioridade;
  status: StatusOcorrencia;
  titulo: string;
  confirmacoes: number;
}

/** Item de GET /ocorrencias/mapa: o ponto e o endereço para o cartão. */
export type OcorrenciaMapa = PontoMapa & { endereco: string | null };

export interface PontosMapa {
  itens: OcorrenciaMapa[];
  /** Quantas existem na área com os filtros; maior que itens.length quando truncado. */
  total: number;
  truncado: boolean;
}

export type ItemMapa =
  | { tipo: 'ponto'; ponto: PontoMapa }
  | {
      tipo: 'grupo';
      chave: string;
      latitude: number;
      longitude: number;
      quantidade: number;
      maiorPrioridade: Prioridade;
    };
