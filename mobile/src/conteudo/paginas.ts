/**
 * Páginas informativas do Perfil, em linguagem simples. Resumem docs/REGRAS_DE_NEGOCIO.md
 * (prioridade: seção 1; alerta: seção 7) e as decisões de privacidade do app.
 */

export const PAGINAS_SOBRE = ['prioridade', 'alertas', 'privacidade', 'equipe'] as const;
export type PaginaSobre = (typeof PAGINAS_SOBRE)[number];

export interface ConteudoPagina {
  titulo: string;
  secoes: { titulo?: string; texto: string }[];
}

export const TITULO_PAGINA: Readonly<Record<PaginaSobre, string>> = {
  prioridade: 'Como a prioridade é calculada',
  alertas: 'Como funcionam os alertas',
  privacidade: 'Privacidade e dados',
  equipe: 'Sobre o Bridge e equipe',
};

export const PAGINAS: Readonly<Record<Exclude<PaginaSobre, 'equipe'>, ConteudoPagina>> = {
  prioridade: {
    titulo: TITULO_PAGINA.prioridade,
    secoes: [
      {
        titulo: 'Uma regra pública',
        texto:
          'Cada ocorrência recebe uma pontuação de 1 a 10, calculada pela API com regras fixas a partir do que foi informado: a categoria (buraco vale 3; calçada, obstáculo e iluminação valem 2; outro vale 1) e as situações marcadas (risco imediato +3, bloqueia a passagem +2, afeta pessoas com deficiência ou mobilidade reduzida +2).',
      },
      {
        titulo: 'Faixas',
        texto:
          'De 1 a 3 pontos a prioridade é baixa, de 4 a 5 é média e de 6 a 10 é alta. No app, a gravidade aparece por forma e cor: ◆ alta, ● média e ■ baixa. O detalhe de cada ocorrência mostra a conta.',
      },
      {
        titulo: 'O que ela não é',
        texto:
          'A prioridade é uma regra do projeto Bridge para organizar a fila: não é avaliação oficial de segurança e não é feita por inteligência artificial. Ela também não muda quando outras pessoas dizem "eu também vi".',
      },
    ],
  },
  alertas: {
    titulo: TITULO_PAGINA.alertas,
    secoes: [
      {
        titulo: 'O que conta',
        texto:
          'Em cada uma das 32 subprefeituras, o alerta olha as ocorrências reais ainda abertas registradas nos últimos 30 dias.',
      },
      {
        titulo: 'Como o nível sobe',
        texto:
          'Cada ocorrência soma a sua pontuação de prioridade mais as confirmações de outras pessoas (até 5 por ocorrência). A região fica em Atenção a partir de 45 pontos e em Alerta a partir de 90 pontos, desde que tenha pelo menos 3 ocorrências abertas de prioridade alta. Quanto mais relatos e maior a gravidade, maior o nível.',
      },
      {
        titulo: 'O que ele não é',
        texto:
          'Alerta Bridge: calculado automaticamente a partir dos relatos. Não é alerta oficial da Prefeitura, da Defesa Civil nem de nenhum órgão: não é alerta oficial. No mapa, a região em Alerta tem contorno tracejado.',
      },
    ],
  },
  privacidade: {
    titulo: TITULO_PAGINA.privacidade,
    secoes: [
      {
        titulo: 'Sem login',
        texto:
          'Você usa um apelido, não uma conta. O app guarda no aparelho um código (UUID) criado pelo servidor e o envia no cabeçalho das requisições, nunca no endereço (URL), que costuma ficar em registros de acesso.',
      },
      {
        titulo: 'O que é público',
        texto:
          'As ocorrências são públicas sem autor: ninguém vê quem registrou, confirmou ou avisou. O seu apelido aparece só para você.',
      },
      {
        titulo: 'Localização e fotos',
        texto:
          'A localização só é usada quando você registra um problema ou toca em "Ativar localização". As fotos enviadas têm os metadados (EXIF), como o lugar onde foram tiradas, removidos pelo servidor. O app não usa notificações push.',
      },
    ],
  },
};

export function interpretarPagina(valor: string | string[] | undefined): PaginaSobre | null {
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  return (PAGINAS_SOBRE as readonly string[]).includes(bruto ?? '') ? (bruto as PaginaSobre) : null;
}
