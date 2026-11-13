/**
 * Folha (sheet) com os números de uma subprefeitura. Dados reais registrados no
 * Bridge — não são números oficiais da Prefeitura.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Esqueleto } from '../../components/Esqueleto';
import { Icone } from '../../components/Icone';
import { Texto } from '../../components/Texto';
import { classeDensidade, ROTULOS_DENSIDADE } from '../../geo/densidade';
import type { RegiaoSP } from '../../geo/tipos';
import type { EstatisticaRegiao } from '../../models/ocorrencia';
import { estatisticasPorRegiao } from '../../services/estatisticasService';
import { mensagemDeErro } from '../../services/http';
import { carregarRegioes } from '../../services/regioesService';
import { ALVO_TOQUE, cores, espaco, fontes, raio } from '../../theme/tema';
import { formatarDecimal } from '../../utils/formatacao';
import { interpretarCodigoRegiao } from '../../validation/rotas';

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'ok'; regiao: RegiaoSP; numeros: EstatisticaRegiao | null };

function Numero({ valor, rotulo, destaque = false }: { valor: number; rotulo: string; destaque?: boolean }) {
  return (
    <View style={[styles.numero, destaque && styles.numeroDestaque]} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <Texto variante="numero" style={destaque ? styles.valorDestaque : undefined}>
        {valor}
      </Texto>
      <Texto variante="placa">{rotulo}</Texto>
    </View>
  );
}

export default function FolhaRegiao() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const codigoValido = interpretarCodigoRegiao(codigo);
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });

  useEffect(() => {
    let ativo = true;
    Promise.all([carregarRegioes(), estatisticasPorRegiao()])
      .then(([regioes, numeros]) => {
        if (!ativo) return;
        const regiao = regioes.find((r) => r.codigo === codigoValido);
        if (!regiao) {
          setEstado({ tipo: 'erro', mensagem: 'Região não encontrada.' });
          return;
        }
        setEstado({ tipo: 'ok', regiao, numeros: numeros.find((n) => n.codigo === regiao.codigo) ?? null });
      })
      .catch((erro: unknown) => {
        if (ativo) setEstado({ tipo: 'erro', mensagem: mensagemDeErro(erro) });
      });
    return () => {
      ativo = false;
    };
  }, [codigoValido]);

  if (estado.tipo === 'carregando') {
    return (
      <View style={styles.folha}>
        <Esqueleto linhas={5} altura={20} />
      </View>
    );
  }
  if (estado.tipo === 'erro') {
    return (
      <View style={styles.folha}>
        <Texto variante="subtitulo">Não foi possível abrir a região</Texto>
        <Texto variante="apoio">{estado.mensagem}</Texto>
      </View>
    );
  }

  const { regiao, numeros } = estado;
  const densidade = numeros?.densidadeKm2 ?? 0;
  return (
    <ScrollView style={styles.fundo} contentContainerStyle={styles.folha}>
      <Texto variante="placa">Subprefeitura{regiao.zona ? ` · Zona ${regiao.zona}` : ''}</Texto>
      <Texto variante="titulo">{regiao.nome}</Texto>
      <Texto variante="apoio">
        {formatarDecimal(regiao.areaKm2, 1)} km² · limites oficiais do GeoSampa (Prefeitura de São Paulo)
      </Texto>

      <View style={styles.grade}>
        <Numero valor={numeros?.total ?? 0} rotulo="Registradas" />
        <Numero valor={numeros?.abertas ?? 0} rotulo="Abertas" />
        <Numero valor={numeros?.altaAbertas ?? 0} rotulo="Alta gravidade" destaque={(numeros?.altaAbertas ?? 0) > 0} />
        <Numero valor={numeros?.resolvidas ?? 0} rotulo="Resolvidas" />
      </View>

      <View style={styles.linha}>
        <Icone nome="account-multiple" tamanho={20} cor={cores.placa} />
        <Texto style={styles.linhaTexto}>
          {numeros?.confirmacoes ?? 0} confirmação(ões) de outras pessoas nas ocorrências abertas
        </Texto>
      </View>
      <View style={styles.linha}>
        <Icone nome="layers-outline" tamanho={20} cor={cores.placa} />
        <Texto style={styles.linhaTexto}>
          Densidade: {formatarDecimal(densidade, 2)} por km² ({ROTULOS_DENSIDADE[classeDensidade(densidade)].toLowerCase()})
        </Texto>
      </View>

      <Texto variante="apoio" style={styles.nota}>
        Contagem dos registros reais feitos no Bridge, um projeto acadêmico. Não são números oficiais da Prefeitura.
      </Texto>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.navigate({ pathname: '/mapa', params: { regiao: regiao.codigo } })}
        style={styles.botao}
      >
        <Icone nome="map-outline" tamanho={20} cor={cores.papel} />
        <Texto style={styles.botaoTexto}>Ver no mapa</Texto>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fundo: { backgroundColor: cores.papel },
  folha: { padding: espaco.xl, gap: espaco.md, backgroundColor: cores.papel },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm, marginTop: espaco.sm },
  numero: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: cores.concreto,
    borderRadius: raio.md,
    padding: espaco.md,
    gap: 2,
  },
  numeroDestaque: { backgroundColor: cores.alertaClaro, borderWidth: 1, borderColor: cores.alerta },
  valorDestaque: { color: cores.alerta },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  linhaTexto: { flex: 1, fontFamily: fontes.semibold, fontSize: 15, lineHeight: 21, color: cores.asfalto },
  nota: { fontSize: 13, lineHeight: 18 },
  botao: {
    minHeight: ALVO_TOQUE,
    borderRadius: raio.md,
    backgroundColor: cores.placa,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.sm,
  },
  botaoTexto: { fontFamily: fontes.black, fontSize: 16, color: cores.papel },
});
