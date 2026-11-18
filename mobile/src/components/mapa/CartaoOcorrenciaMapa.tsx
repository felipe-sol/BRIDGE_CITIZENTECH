/**
 * Cartão que abre ao tocar numa ocorrência no mapa. Mostra na hora o que o mapa já tem e,
 * quando o detalhe chega, a foto (toque → tela cheia), prioridade, relatos, a última
 * atualização da equipe e as ações "Eu também vi" e "Ver detalhe e andamento".
 */
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { podeConfirmarNoMapa, tempoDesde, ultimaAtualizacaoEquipe } from '../../geo/cartaoMapa';
import { useAgora } from '../../hooks/useAgora';
import { resumoSugestaoIA } from '../../ia/analise';
import type { OcorrenciaMapa } from '../../geo/tipos';
import { ROTULO_CATEGORIA, ROTULO_PRIORIDADE, type OcorrenciaDetalhe } from '../../models/ocorrencia';
import { urlAbsoluta } from '../../services/http';
import { ALVO_TOQUE, cores, espaco, fontes, raio, sombra } from '../../theme/tema';
import { Aviso } from '../Aviso';
import { Botao } from '../Botao';
import { Esqueleto } from '../Esqueleto';
import { FaixaFicticia } from '../FaixaFicticia';
import { FotoTelaCheia } from '../FotoTelaCheia';
import { ICONE_CATEGORIA, Icone } from '../Icone';
import { MarcadorGravidade } from '../MarcadorGravidade';
import { SeloStatus } from '../Sinalizacao';
import { Texto } from '../Texto';

export type EstadoCartao = { tipo: 'carregando' } | { tipo: 'erro' } | { tipo: 'ok'; ocorrencia: OcorrenciaDetalhe };

interface PropsCartao {
  basico: OcorrenciaMapa;
  detalhe: EstadoCartao;
  ficticio: boolean;
  relatando: boolean;
  erroRelato: string | null;
  onFechar: () => void;
  onVerDetalhe: () => void;
  onTentarDeNovo: () => void;
  onAlternarRelato: (o: OcorrenciaDetalhe) => void;
}

function uriDaFoto(caminho: string | null): string | null {
  if (caminho === null) return null;
  try {
    return urlAbsoluta(caminho);
  } catch {
    return null;
  }
}

export function CartaoOcorrenciaMapa(props: PropsCartao) {
  const { basico, detalhe, ficticio, relatando, erroRelato } = props;
  const [fotoAberta, setFotoAberta] = useState(false);
  const o = detalhe.tipo === 'ok' ? detalhe.ocorrencia : null;
  const foto = uriDaFoto(o?.imagemUrl ?? null);
  const ultima = o ? ultimaAtualizacaoEquipe(o.historico) : null;
  // Referência do "há X": anda a cada 30 s com o cartão aberto (não precisa de precisão de segundos).
  const agora = useAgora(30_000);
  const relatos = o?.confirmacoes ?? basico.confirmacoes;
  const sugestaoIA = o ? resumoSugestaoIA(o.analiseIa) : null;

  return (
    <View style={[styles.cartao, sombra.cartao]}>
      <ScrollView style={styles.rolagem} contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
        <View style={styles.topo}>
          <MarcadorGravidade prioridade={basico.prioridade} tamanho={20} />
          <Texto variante="subtitulo" style={styles.flex} numberOfLines={2}>
            {basico.titulo}
          </Texto>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10} onPress={props.onFechar}>
            <Icone nome="close" tamanho={22} />
          </Pressable>
        </View>
        {ficticio ? <FaixaFicticia singular /> : null}

        <View style={styles.linha}>
          {detalhe.tipo === 'carregando' ? (
            <View style={styles.miniatura}>
              <Esqueleto linhas={1} altura={88} />
            </View>
          ) : foto ? (
            <Pressable
              accessibilityRole="imagebutton"
              accessibilityLabel="Abrir a foto em tela cheia"
              onPress={() => setFotoAberta(true)}
              style={styles.miniatura}
            >
              <Image source={{ uri: foto }} style={styles.imagem} resizeMode="cover" />
              <View style={styles.lupa}>
                <Icone nome="magnify" tamanho={16} cor={cores.papel} />
              </View>
            </Pressable>
          ) : (
            <View style={[styles.miniatura, styles.semFoto]} accessible accessibilityLabel="Sem foto">
              <Icone nome="camera-outline" tamanho={22} cor={cores.textoSuave} />
              <Texto style={styles.semFotoTexto}>Sem foto</Texto>
            </View>
          )}
          <View style={[styles.flex, styles.info]}>
            <View style={styles.linhaPequena}>
              <Icone nome={ICONE_CATEGORIA[basico.categoria]} tamanho={18} cor={cores.placa} />
              <Texto style={styles.categoria}>{ROTULO_CATEGORIA[basico.categoria]}</Texto>
            </View>
            <SeloStatus status={o?.status ?? basico.status} />
            <Texto style={styles.prioridade}>
              Prioridade {ROTULO_PRIORIDADE[basico.prioridade].toLowerCase()}
              {o ? ` (${o.prioridadePontuacao}/10)` : ''}
            </Texto>
          </View>
        </View>

        {basico.endereco || o?.subprefeitura ? (
          <View style={styles.linhaPequena}>
            <Icone nome="map-marker-outline" tamanho={18} cor={cores.textoSuave} />
            <Texto variante="apoio" style={styles.flex}>
              {[basico.endereco, o?.subprefeitura ? `Subprefeitura ${o.subprefeitura.nome}` : null].filter(Boolean).join(' · ')}
            </Texto>
          </View>
        ) : null}
        <Texto variante="apoio">
          {o ? `Registrada ${tempoDesde(o.criadoEm, agora)}` : 'Carregando…'}
          {relatos > 0 ? ` · ${relatos === 1 ? '1 pessoa também relatou' : `${relatos} pessoas também relataram`}` : ''}
        </Texto>
        {sugestaoIA ? (
          <View style={styles.linhaPequena}>
            <Icone nome="robot-outline" tamanho={18} cor={cores.textoSuave} />
            <Texto variante="apoio" style={styles.flex}>
              {sugestaoIA}
            </Texto>
          </View>
        ) : null}
        {ultima ? (
          <View style={styles.atualizacao}>
            <Texto variante="placa">Equipe responsável · {tempoDesde(ultima.quando, agora)}</Texto>
            <Texto style={styles.atualizacaoTexto}>{ultima.texto}</Texto>
          </View>
        ) : null}

        {detalhe.tipo === 'erro' ? (
          <Aviso tom="atencao" titulo="Não foi possível carregar a foto e o andamento.">
            <Botao titulo="Tentar de novo" variante="discreto" onPress={props.onTentarDeNovo} />
          </Aviso>
        ) : null}
        {o && podeConfirmarNoMapa(o) ? (
          <Botao
            titulo={o.minhaRelacao?.confirmei ? 'Desfazer meu relato' : 'Eu também vi'}
            variante={o.minhaRelacao?.confirmei ? 'secundario' : 'primario'}
            carregando={relatando}
            onPress={() => props.onAlternarRelato(o)}
          />
        ) : null}
        {erroRelato ? <Aviso tom="erro">{erroRelato}</Aviso> : null}
        <Pressable accessibilityRole="button" onPress={props.onVerDetalhe} style={styles.verDetalhe}>
          <Texto style={styles.verDetalheTexto}>Ver detalhe e andamento</Texto>
          <Icone nome="chevron-right" tamanho={20} cor={cores.papel} />
        </Pressable>
      </ScrollView>
      {foto ? <FotoTelaCheia uri={foto} visivel={fotoAberta} onFechar={() => setFotoAberta(false)} descricao={basico.titulo} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    position: 'absolute',
    left: espaco.md,
    right: espaco.md,
    bottom: espaco.md,
    maxHeight: '62%',
    backgroundColor: cores.papel,
    borderRadius: raio.lg,
  },
  rolagem: { flexGrow: 0 },
  conteudo: { padding: espaco.lg, gap: espaco.sm },
  flex: { flex: 1 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  linha: { flexDirection: 'row', gap: espaco.md },
  linhaPequena: { flexDirection: 'row', alignItems: 'center', gap: espaco.xs },
  info: { gap: espaco.xs, justifyContent: 'center' },
  miniatura: { width: 88, height: 88, borderRadius: raio.md, overflow: 'hidden', backgroundColor: cores.concreto },
  imagem: { width: '100%', height: '100%' },
  lupa: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  semFoto: { alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1, borderColor: cores.borda },
  semFotoTexto: { fontFamily: fontes.semibold, fontSize: 12, color: cores.textoSuave },
  categoria: { fontFamily: fontes.extrabold, fontSize: 14, color: cores.placa },
  prioridade: { fontFamily: fontes.semibold, fontSize: 14, color: cores.asfalto },
  atualizacao: { borderLeftWidth: 3, borderLeftColor: cores.placa, paddingLeft: espaco.sm, gap: 2 },
  atualizacaoTexto: { fontFamily: fontes.semibold, fontSize: 14, lineHeight: 19, color: cores.asfalto },
  verDetalhe: {
    minHeight: ALVO_TOQUE,
    borderRadius: raio.md,
    backgroundColor: cores.placa,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.xs,
  },
  verDetalheTexto: { fontFamily: fontes.black, fontSize: 16, color: cores.papel },
});
