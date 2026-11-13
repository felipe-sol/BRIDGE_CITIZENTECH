/**
 * Andamento (follow-up): o que a pessoa registrou e o que confirmou, com o selo
 * "Atualizada" quando a equipe responsável mudou o status desde a última visita.
 * Lista com estados de carregando, erro e vazio (requisito do PDF de Mobile).
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { estaAtualizada } from '../../acompanhamento/novidades';
import { Botao } from '../../components/Botao';
import { CartaoAcompanhamento } from '../../components/CartaoAcompanhamento';
import { EstadoErro, EstadoVazio } from '../../components/Estados';
import { Esqueleto } from '../../components/Esqueleto';
import { Texto } from '../../components/Texto';
import { useIdentificacao } from '../../context/IdentificacaoContext';
import type { Ocorrencia } from '../../models/ocorrencia';
import { mensagemDeErro } from '../../services/http';
import { listarMinhas } from '../../services/ocorrenciasService';
import { lerVistos } from '../../services/vistos';
import { ALVO_TOQUE, cores, espaco, fontes, raio } from '../../theme/tema';
import { ROTAS, rotaDetalhe } from '../../validation/rotas';

type Relacao = 'registradas' | 'confirmadas';

type EstadoLista =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | {
      tipo: 'ok';
      itens: Ocorrencia[];
      pagina: number;
      totalPaginas: number;
      total: number;
      vistos: Readonly<Record<string, string>>;
      carregandoMais: boolean;
    };

const ROTULO: Record<Relacao, string> = { registradas: 'Registrei', confirmadas: 'Confirmei' };

export default function TelaAndamento() {
  const { estado } = useIdentificacao();
  const identificacaoId = estado.tipo === 'presente' ? estado.identificacao.id : null;
  const [relacao, setRelacao] = useState<Relacao>('registradas');
  const [lista, setLista] = useState<EstadoLista>({ tipo: 'carregando' });
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(
    async (qual: Relacao) => {
      if (identificacaoId === null) return;
      try {
        const [pagina, vistos] = await Promise.all([listarMinhas(identificacaoId, qual, 1), lerVistos()]);
        setLista({
          tipo: 'ok',
          itens: pagina.itens,
          pagina: 1,
          totalPaginas: pagina.totalPaginas,
          total: pagina.total,
          vistos,
          carregandoMais: false,
        });
      } catch (erro: unknown) {
        setLista({ tipo: 'erro', mensagem: mensagemDeErro(erro) });
      }
    },
    [identificacaoId],
  );

  // Ao voltar para a aba (ex.: depois de abrir um detalhe), o selo "Atualizada" se ajusta.
  useFocusEffect(
    useCallback(() => {
      carregar(relacao).catch(() => undefined);
    }, [carregar, relacao]),
  );

  function trocar(nova: Relacao) {
    if (nova === relacao) return;
    setRelacao(nova);
    setLista({ tipo: 'carregando' });
  }

  async function atualizar() {
    setAtualizando(true);
    await carregar(relacao);
    setAtualizando(false);
  }

  async function carregarMais() {
    if (lista.tipo !== 'ok' || lista.carregandoMais || lista.pagina >= lista.totalPaginas || identificacaoId === null) return;
    setLista({ ...lista, carregandoMais: true });
    try {
      const proxima = await listarMinhas(identificacaoId, relacao, lista.pagina + 1);
      setLista((atual) =>
        atual.tipo === 'ok'
          ? { ...atual, itens: [...atual.itens, ...proxima.itens], pagina: proxima.pagina, carregandoMais: false }
          : atual,
      );
    } catch {
      setLista((atual) => (atual.tipo === 'ok' ? { ...atual, carregandoMais: false } : atual));
    }
  }

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <View style={styles.topo}>
        <Texto variante="titulo">Andamento</Texto>
        <Texto variante="apoio">O que você registrou ou confirmou, com cada atualização da equipe responsável.</Texto>
        <View style={styles.seletor} accessibilityRole="tablist">
          {(['registradas', 'confirmadas'] as const).map((r) => (
            <Pressable
              key={r}
              accessibilityRole="tab"
              accessibilityState={{ selected: relacao === r }}
              onPress={() => trocar(r)}
              style={[styles.opcao, relacao === r && styles.opcaoMarcada]}
            >
              <Texto style={[styles.opcaoTexto, relacao === r && styles.opcaoTextoMarcada]}>
                {ROTULO[r]}
                {relacao === r && lista.tipo === 'ok' ? ` · ${lista.total}` : ''}
              </Texto>
            </Pressable>
          ))}
        </View>
      </View>

      {lista.tipo === 'carregando' ? (
        <View style={styles.esqueleto}>
          <Esqueleto linhas={6} altura={20} />
        </View>
      ) : null}

      {lista.tipo === 'erro' ? (
        <EstadoErro
          titulo="Não foi possível carregar o seu andamento"
          mensagem={lista.mensagem}
          acao={{ titulo: 'Tentar novamente', onPress: () => carregar(relacao) }}
        />
      ) : null}

      {lista.tipo === 'ok' ? (
        <FlatList
          data={lista.itens}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={lista.itens.length === 0 ? styles.listaVazia : styles.lista}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} />}
          renderItem={({ item }) => (
            <CartaoAcompanhamento
              ocorrencia={item}
              atualizada={estaAtualizada(item.atualizadoEm, lista.vistos[String(item.id)])}
              onPress={() => router.push(rotaDetalhe(item.id))}
            />
          )}
          ListEmptyComponent={
            relacao === 'registradas' ? (
              <EstadoVazio
                titulo="Você ainda não registrou nenhum problema"
                mensagem="Viu uma calçada quebrada, um buraco ou um poste apagado? Registre em poucos passos."
                acao={{ titulo: 'Registrar problema', onPress: () => router.push(ROTAS.registrar) }}
              />
            ) : (
              <EstadoVazio
                titulo="Você ainda não confirmou nenhuma ocorrência"
                mensagem="No mapa, abra uma ocorrência perto de você e toque em “Eu também vi” para acompanhá-la."
                acao={{ titulo: 'Abrir o mapa', onPress: () => router.navigate(ROTAS.mapa) }}
              />
            )
          }
          ListFooterComponent={
            lista.pagina < lista.totalPaginas ? (
              <Botao titulo="Carregar mais" variante="secundario" carregando={lista.carregandoMais} onPress={carregarMais} />
            ) : undefined
          }
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.concreto },
  topo: { paddingHorizontal: espaco.lg, paddingTop: espaco.md, paddingBottom: espaco.sm, gap: espaco.xs },
  seletor: { flexDirection: 'row', marginTop: espaco.sm, backgroundColor: cores.papel, borderRadius: raio.md, padding: 4, borderWidth: 1, borderColor: cores.borda },
  opcao: { flex: 1, minHeight: ALVO_TOQUE - 4, borderRadius: raio.sm, alignItems: 'center', justifyContent: 'center' },
  opcaoMarcada: { backgroundColor: cores.asfalto },
  opcaoTexto: { fontFamily: fontes.extrabold, fontSize: 15, color: cores.asfalto },
  opcaoTextoMarcada: { color: cores.papel },
  esqueleto: { margin: espaco.lg, padding: espaco.lg, borderRadius: raio.lg, backgroundColor: cores.papel },
  lista: { padding: espaco.lg, gap: espaco.md },
  listaVazia: { flexGrow: 1, padding: espaco.lg },
});
