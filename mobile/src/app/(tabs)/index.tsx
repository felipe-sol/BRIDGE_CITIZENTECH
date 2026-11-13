/**
 * Início ("painel da minha região"): onde a pessoa está, mapa real pequeno e o
 * que ela acompanha. Só dados reais; o modo Exemplo fica no Mapa e nas Análises.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { juntarAcompanhadas } from '../../acompanhamento/lista';
import { estaAtualizada } from '../../acompanhamento/novidades';
import { Aviso } from '../../components/Aviso';
import { Botao } from '../../components/Botao';
import { BotaoFlutuante } from '../../components/BotaoFlutuante';
import { CabecalhoPlaca } from '../../components/CabecalhoPlaca';
import { CartaoAcompanhamento } from '../../components/CartaoAcompanhamento';
import { Esqueleto } from '../../components/Esqueleto';
import { Icone } from '../../components/Icone';
import { MarcadorGravidade } from '../../components/MarcadorGravidade';
import { Texto } from '../../components/Texto';
import { useIdentificacao } from '../../context/IdentificacaoContext';
import { regiaoInicial } from '../../geo/distancia';
import { localizarRegiao } from '../../geo/regioes';
import type { RegiaoSP } from '../../geo/tipos';
import type { Ocorrencia } from '../../models/ocorrencia';
import { enderecoDe } from '../../services/geocodificacao';
import { mensagemDeErro } from '../../services/http';
import {
  obterLocalizacaoAtual,
  obterLocalizacaoSePermitida,
  type ResultadoLocalizacao,
} from '../../services/localizacao';
import { listarMinhas } from '../../services/ocorrenciasService';
import { carregarRegioes } from '../../services/regioesService';
import { lerVistos } from '../../services/vistos';
import { cores, espaco, fontes, raio, sombra } from '../../theme/tema';
import { ROTAS, rotaDetalhe } from '../../validation/rotas';

const LIMITE_ACOMPANHANDO = 3;

type EstadoLista =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'ok'; itens: Ocorrencia[]; vistos: Readonly<Record<string, string>> };

interface Lugar {
  bairro: string | null;
  regiao: RegiaoSP | null;
}

function textosDoCabecalho(localizacao: ResultadoLocalizacao | null, lugar: Lugar) {
  if (localizacao?.tipo === 'ok') {
    return {
      titulo: lugar.bairro ?? lugar.regiao?.nome ?? 'São Paulo',
      subtitulo: lugar.regiao ? `Você está aqui · Subprefeitura ${lugar.regiao.nome}` : 'Você está fora de São Paulo',
    };
  }
  if (localizacao === null) return { titulo: 'São Paulo', subtitulo: 'Procurando sua localização…' };
  if (localizacao.tipo === 'servico_desligado') {
    return { titulo: 'São Paulo', subtitulo: 'O GPS está desligado. Ligue para ver sua região.' };
  }
  return { titulo: 'São Paulo', subtitulo: 'Ative a localização para ver sua região' };
}

export default function TelaInicio() {
  const { estado } = useIdentificacao();
  const identificacaoId = estado.tipo === 'presente' ? estado.identificacao.id : null;

  const [localizacao, setLocalizacao] = useState<ResultadoLocalizacao | null>(null);
  const [lugar, setLugar] = useState<Lugar>({ bairro: null, regiao: null });
  const [lista, setLista] = useState<EstadoLista>({ tipo: 'carregando' });
  const [atualizando, setAtualizando] = useState(false);

  const descobrirLugar = useCallback(async (resultado: ResultadoLocalizacao) => {
    setLocalizacao(resultado);
    if (resultado.tipo !== 'ok') return;
    const ponto = { latitude: resultado.latitude, longitude: resultado.longitude };
    const [endereco, regioes] = await Promise.all([enderecoDe(ponto), carregarRegioes().catch(() => [])]);
    setLugar({
      bairro: endereco.tipo === 'ok' ? endereco.bairro : null,
      regiao: localizarRegiao(ponto, regioes),
    });
  }, []);

  const carregarLista = useCallback(async () => {
    if (identificacaoId === null) return;
    try {
      const [registradas, confirmadas, vistos] = await Promise.all([
        listarMinhas(identificacaoId, 'registradas', 1),
        listarMinhas(identificacaoId, 'confirmadas', 1),
        lerVistos(),
      ]);
      setLista({
        tipo: 'ok',
        itens: juntarAcompanhadas(registradas.itens, confirmadas.itens, LIMITE_ACOMPANHANDO),
        vistos,
      });
    } catch (erro: unknown) {
      setLista({ tipo: 'erro', mensagem: mensagemDeErro(erro) });
    }
  }, [identificacaoId]);

  // Localização: só lê se a permissão já existe (o pedido fica no botão).
  useEffect(() => {
    let ativo = true;
    obterLocalizacaoSePermitida()
      .then((r) => (ativo ? descobrirLugar(r) : undefined))
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [descobrirLugar]);

  // Ao voltar para a aba (ex.: depois de abrir um detalhe), recarrega o que mudou.
  useFocusEffect(
    useCallback(() => {
      carregarLista().catch(() => undefined);
    }, [carregarLista]),
  );

  async function atualizarTudo() {
    setAtualizando(true);
    await Promise.all([carregarLista(), obterLocalizacaoSePermitida().then(descobrirLugar)]).catch(() => undefined);
    setAtualizando(false);
  }

  const cabecalho = textosDoCabecalho(localizacao, lugar);
  const semPermissao = localizacao?.tipo === 'sem_permissao' && localizacao.podePerguntarDeNovo;
  const regiaoMapa = regiaoInicial(localizacao);

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarTudo} />}
      >
        <CabecalhoPlaca
          titulo={cabecalho.titulo}
          subtitulo={cabecalho.subtitulo}
          acao={
            semPermissao
              ? {
                  titulo: 'Ativar localização',
                  onPress: () => {
                    obterLocalizacaoAtual().then(descobrirLugar).catch(() => undefined);
                  },
                }
              : undefined
          }
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir o mapa da cidade"
          onPress={() => router.navigate(ROTAS.mapa)}
          style={[styles.mapaCartao, sombra.cartao]}
        >
          <View pointerEvents="none" style={styles.mapa}>
            <MapView
              style={StyleSheet.absoluteFill}
              region={regiaoMapa}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              toolbarEnabled={false}
              showsUserLocation={localizacao?.tipo === 'ok'}
            >
              {lista.tipo === 'ok'
                ? lista.itens.map((o) => (
                    <Marker
                      key={o.id}
                      coordinate={{ latitude: o.latitude, longitude: o.longitude }}
                      tracksViewChanges={false}
                    >
                      <MarcadorGravidade prioridade={o.prioridade} tamanho={18} />
                    </Marker>
                  ))
                : null}
            </MapView>
          </View>
          <View style={styles.mapaRotulo}>
            <Icone nome="map-outline" tamanho={18} cor={cores.placa} />
            <Texto style={styles.mapaRotuloTexto}>Mapa da cidade · ao vivo</Texto>
            <Icone nome="chevron-right" tamanho={20} cor={cores.placa} />
          </View>
        </Pressable>

        <Texto variante="placa" style={styles.secao}>
          Acompanhando
        </Texto>

        {lista.tipo === 'carregando' ? (
          <View style={styles.esqueleto}>
            <Esqueleto linhas={4} altura={18} />
          </View>
        ) : null}

        {lista.tipo === 'erro' ? (
          <Aviso tom="erro" titulo="Não foi possível carregar o que você acompanha">
            <Texto variante="apoio">{lista.mensagem}</Texto>
            <Botao titulo="Tentar novamente" variante="discreto" onPress={() => carregarLista()} />
          </Aviso>
        ) : null}

        {lista.tipo === 'ok' && lista.itens.length === 0 ? (
          <View style={styles.vazio}>
            <Texto variante="subtitulo">Você ainda não acompanha nenhuma ocorrência</Texto>
            <Texto variante="apoio">
              Registre um problema da sua rua ou confirme um que outra pessoa já registrou. Ele aparece aqui com cada
              atualização da equipe responsável.
            </Texto>
          </View>
        ) : null}

        {lista.tipo === 'ok'
          ? lista.itens.map((o) => (
              <CartaoAcompanhamento
                key={o.id}
                ocorrencia={o}
                atualizada={estaAtualizada(o.atualizadoEm, lista.vistos[String(o.id)])}
                onPress={() => router.push(rotaDetalhe(o.id))}
              />
            ))
          : null}

        {lista.tipo === 'ok' && lista.itens.length > 0 ? (
          <Pressable accessibilityRole="link" onPress={() => router.navigate(ROTAS.andamento)} style={styles.verTudo}>
            <Texto style={styles.verTudoTexto}>Ver tudo no Andamento</Texto>
            <Icone nome="chevron-right" tamanho={20} cor={cores.placa} />
          </Pressable>
        ) : null}
      </ScrollView>

      <BotaoFlutuante rotulo="Registrar problema" onPress={() => router.push(ROTAS.registrar)} style={styles.fab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.concreto },
  conteudo: { padding: espaco.lg, gap: espaco.md, paddingBottom: 110 },
  mapaCartao: { borderRadius: raio.lg, overflow: 'hidden', backgroundColor: cores.papel, borderWidth: 1, borderColor: cores.borda },
  mapa: { height: 160 },
  mapaRotulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    minHeight: 48,
  },
  mapaRotuloTexto: { flex: 1, fontFamily: fontes.extrabold, fontSize: 15, color: cores.placa },
  secao: { marginTop: espaco.sm },
  esqueleto: { backgroundColor: cores.papel, borderRadius: raio.lg, padding: espaco.lg },
  vazio: { backgroundColor: cores.papel, borderRadius: raio.lg, padding: espaco.lg, gap: espaco.sm },
  verTudo: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 48, gap: espaco.xs },
  verTudoTexto: { fontFamily: fontes.extrabold, fontSize: 16, color: cores.placa },
  fab: { position: 'absolute', right: espaco.lg, bottom: espaco.lg },
});
