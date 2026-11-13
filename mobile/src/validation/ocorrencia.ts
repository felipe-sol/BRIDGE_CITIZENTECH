/**
 * Validação pura do formulário de nova ocorrência. As regras espelham as do
 * backend (docs/CONTRATO_API.md, seção 3.4); o servidor valida de novo.
 */
import type { Categoria, NovaOcorrencia } from '../models/ocorrencia.ts';

export const LIMITES = {
  tituloMin: 5,
  tituloMax: 120,
  descricaoMin: 10,
  descricaoMax: 2000,
  enderecoMax: 200,
  fotoMaxBytes: 5 * 1024 * 1024,
} as const;

export interface FormularioOcorrencia {
  titulo: string;
  descricao: string;
  categoria: Categoria | null;
  latitudeTexto: string;
  longitudeTexto: string;
  riscoImediato: boolean;
  bloqueiaPassagem: boolean;
  afetaAcessibilidade: boolean;
  /** Sugerido pela geocodificação do aparelho e editável; opcional. */
  endereco: string;
}

export type CampoValidado = 'titulo' | 'descricao' | 'categoria' | 'latitude' | 'longitude' | 'endereco';
export type ErrosFormulario = Partial<Record<CampoValidado, string>>;

export type ResultadoValidacao = { ok: true; dados: NovaOcorrencia } | { ok: false; erros: ErrosFormulario };

export const FORMULARIO_VAZIO: FormularioOcorrencia = {
  titulo: '',
  descricao: '',
  categoria: null,
  latitudeTexto: '',
  longitudeTexto: '',
  riscoImediato: false,
  bloqueiaPassagem: false,
  afetaAcessibilidade: false,
  endereco: '',
};

const FORMATO_COORDENADA = /^[+-]?\d{1,3}([.,]\d{1,10})?$/;

/** Aceita "−23.5614" ou "-23,5614" (vírgula decimal). Devolve null se inválido. */
export function interpretarCoordenada(entrada: string): number | null {
  const limpo = entrada.trim().replace('−', '-');
  if (!FORMATO_COORDENADA.test(limpo)) return null;
  const valor = Number(limpo.replace(',', '.'));
  return Number.isFinite(valor) ? valor : null;
}

/** Formata para exibir/editar no campo, com 6 casas (~0,1 m). */
export function formatarCoordenada(valor: number): string {
  return valor.toFixed(6);
}

function validarTexto(valor: string, min: number, max: number, nome: string): string | null {
  const limpo = valor.trim();
  if (limpo.length === 0) return `Informe ${nome}.`;
  if (limpo.length < min) return `${capitalizar(nome)} precisa ter pelo menos ${min} caracteres (tem ${limpo.length}).`;
  if (limpo.length > max) return `${capitalizar(nome)} pode ter no máximo ${max} caracteres (tem ${limpo.length}).`;
  return null;
}

function capitalizar(textoBase: string): string {
  const semArtigo = textoBase.replace(/^(o|a) /, '');
  return semArtigo.charAt(0).toUpperCase() + semArtigo.slice(1);
}

export function validarOcorrencia(form: FormularioOcorrencia, identificacaoId: string): ResultadoValidacao {
  const erros: ErrosFormulario = {};

  const erroTitulo = validarTexto(form.titulo, LIMITES.tituloMin, LIMITES.tituloMax, 'o título');
  if (erroTitulo) erros.titulo = erroTitulo;

  const erroDescricao = validarTexto(form.descricao, LIMITES.descricaoMin, LIMITES.descricaoMax, 'a descrição');
  if (erroDescricao) erros.descricao = erroDescricao;

  if (form.categoria === null) erros.categoria = 'Escolha o tipo de problema.';

  const endereco = form.endereco.replace(/\s+/g, ' ').trim();
  if (endereco.length > LIMITES.enderecoMax) {
    erros.endereco = `O endereço pode ter no máximo ${LIMITES.enderecoMax} caracteres (tem ${endereco.length}).`;
  }

  const latitude = interpretarCoordenada(form.latitudeTexto);
  const longitude = interpretarCoordenada(form.longitudeTexto);

  if (form.latitudeTexto.trim() === '') {
    erros.latitude = 'Informe a latitude ou toque em "Usar minha localização".';
  } else if (latitude === null) {
    erros.latitude = 'Latitude inválida. Use números, ex.: -23,561414.';
  } else if (latitude < -90 || latitude > 90) {
    erros.latitude = 'A latitude deve estar entre -90 e 90.';
  }

  if (form.longitudeTexto.trim() === '') {
    erros.longitude = 'Informe a longitude ou toque em "Usar minha localização".';
  } else if (longitude === null) {
    erros.longitude = 'Longitude inválida. Use números, ex.: -46,655881.';
  } else if (longitude < -180 || longitude > 180) {
    erros.longitude = 'A longitude deve estar entre -180 e 180.';
  }

  if (latitude === 0 && longitude === 0 && !erros.latitude && !erros.longitude) {
    erros.latitude = 'As coordenadas (0, 0) indicam localização ausente. Informe a posição real.';
  }

  if (Object.keys(erros).length > 0 || form.categoria === null || latitude === null || longitude === null) {
    return { ok: false, erros };
  }

  return {
    ok: true,
    dados: {
      identificacaoId,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      categoria: form.categoria,
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
      riscoImediato: form.riscoImediato,
      bloqueiaPassagem: form.bloqueiaPassagem,
      afetaAcessibilidade: form.afetaAcessibilidade,
      endereco: endereco === '' ? null : endereco,
    },
  };
}

const TIPOS_FOTO_ACEITOS = ['image/jpeg', 'image/jpg', 'image/png'];

/** Checagem prévia da foto no app. O servidor valida o conteúdo de qualquer forma. */
export function validarFoto(tamanhoBytes: number | null, tipoMime: string | null): string | null {
  if (tipoMime !== null && !TIPOS_FOTO_ACEITOS.includes(tipoMime.toLowerCase())) {
    return 'Formato de imagem não suportado. Use uma foto JPEG ou PNG.';
  }
  if (tamanhoBytes !== null && tamanhoBytes > LIMITES.fotoMaxBytes) {
    const mb = (tamanhoBytes / (1024 * 1024)).toFixed(1).replace('.', ',');
    return `A foto tem ${mb} MB; o limite é 5 MB. Tire outra foto ou escolha uma imagem menor.`;
  }
  return null;
}
