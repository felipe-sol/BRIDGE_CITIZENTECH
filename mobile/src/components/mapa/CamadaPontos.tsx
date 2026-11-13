/** Marcadores no mapa: ocorrência sozinha (forma = gravidade) ou grupo com contagem. */
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { ItemMapa, PontoMapa } from '../../geo/tipos';
import { ROTULO_PRIORIDADE } from '../../models/ocorrencia';
import { cores, fontes } from '../../theme/tema';
import { MarcadorGravidade } from '../MarcadorGravidade';
import { Texto } from '../Texto';

interface PropsCamadaPontos {
  itens: readonly ItemMapa[];
  onPonto: (ponto: PontoMapa) => void;
  onGrupo: (latitude: number, longitude: number) => void;
}

export function CamadaPontos({ itens, onPonto, onGrupo }: PropsCamadaPontos) {
  return (
    <>
      {itens.map((item) =>
        item.tipo === 'ponto' ? (
          <Marker
            key={`p-${item.ponto.id}`}
            coordinate={{ latitude: item.ponto.latitude, longitude: item.ponto.longitude }}
            onPress={() => onPonto(item.ponto)}
            tracksViewChanges={false}
            accessibilityLabel={`${item.ponto.titulo}, gravidade ${ROTULO_PRIORIDADE[item.ponto.prioridade].toLowerCase()}`}
          >
            <View style={styles.alvo}>
              <MarcadorGravidade prioridade={item.ponto.prioridade} tamanho={22} />
            </View>
          </Marker>
        ) : (
          <Marker
            key={`g-${item.chave}-${item.quantidade}`}
            coordinate={{ latitude: item.latitude, longitude: item.longitude }}
            onPress={() => onGrupo(item.latitude, item.longitude)}
            tracksViewChanges={false}
            accessibilityLabel={`${item.quantidade} ocorrências nesta área`}
          >
            <View style={[styles.grupo, item.maiorPrioridade === 'ALTA' && styles.grupoAlta]}>
              <Texto style={styles.grupoTexto}>{item.quantidade}</Texto>
            </View>
          </Marker>
        ),
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // Área de toque maior que o desenho do marcador.
  alvo: { padding: 8 },
  grupo: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 6,
    borderRadius: 18,
    backgroundColor: cores.asfalto,
    borderWidth: 2.5,
    borderColor: cores.papel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grupoAlta: { borderColor: cores.alerta },
  grupoTexto: { fontFamily: fontes.black, fontSize: 14, color: cores.papel },
});
