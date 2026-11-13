/**
 * Páginas informativas do Perfil: prioridade, alertas, privacidade e "Sobre o Bridge e equipe".
 * O conteúdo fica em src/conteudo (puro e testado); a equipe vem de `authors` no package.json.
 */
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import pacote from '../../../package.json';
import { EstadoErro } from '../../components/Estados';
import { Texto } from '../../components/Texto';
import { textoEquipe } from '../../conteudo/equipe';
import { PAGINAS, TITULO_PAGINA, interpretarPagina, type ConteudoPagina } from '../../conteudo/paginas';
import { cores, espaco, raio, sombra } from '../../theme/tema';

function conteudoEquipe(): ConteudoPagina {
  const equipe = textoEquipe((pacote as { authors?: unknown }).authors);
  return {
    titulo: TITULO_PAGINA.equipe,
    secoes: [
      {
        titulo: 'O projeto',
        texto:
          'O Bridge é um projeto acadêmico (FIAP Global Solution 2026.2 — CitizenTech) para registrar e acompanhar problemas de calçadas e vias em São Paulo. Não há integração oficial com a Prefeitura: as atualizações de status são feitas pela equipe responsável do projeto.',
      },
      { titulo: 'Versão', texto: `App ${pacote.version}, React Native com Expo e TypeScript; API REST com FastAPI e PostgreSQL.` },
      {
        titulo: 'Equipe',
        texto: 'nomes' in equipe ? equipe.nomes.join(', ') : 'Os nomes da equipe ainda serão preenchidos no package.json do app.',
      },
    ],
  };
}

export default function TelaSobre() {
  const insets = useSafeAreaInsets();
  const { pagina } = useLocalSearchParams<{ pagina: string }>();
  const qual = interpretarPagina(pagina);
  if (qual === null) {
    return <EstadoErro titulo="Página não encontrada" mensagem="Volte ao Perfil e escolha uma das páginas." />;
  }
  const conteudo = qual === 'equipe' ? conteudoEquipe() : PAGINAS[qual];

  return (
    <ScrollView contentContainerStyle={[styles.conteudo, { paddingBottom: insets.bottom + espaco.xl }]}>
      <Stack.Screen options={{ title: conteudo.titulo }} />
      {conteudo.secoes.map((secao) => (
        <View key={secao.titulo ?? secao.texto.slice(0, 20)} style={[styles.cartao, sombra.cartao]}>
          {secao.titulo ? (
            <Texto variante="subtitulo" accessibilityRole="header">
              {secao.titulo}
            </Texto>
          ) : null}
          <Texto variante="corpo">{secao.texto}</Texto>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: espaco.lg, gap: espaco.md, backgroundColor: cores.concreto },
  cartao: { backgroundColor: cores.papel, borderRadius: raio.lg, padding: espaco.lg, gap: espaco.sm },
});
