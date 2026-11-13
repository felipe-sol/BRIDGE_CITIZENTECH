/** Ocorrência aberta parecida a poucos metros: "É o mesmo problema?". */
import { StyleSheet, View } from 'react-native';

import { formatarDistancia } from '../../geo/distancia';
import type { OcorrenciaProxima } from '../../models/ocorrencia';
import { cores, espaco, fontes, raio, sombra } from '../../theme/tema';
import { formatarDataHora } from '../../utils/formatacao';
import { Botao } from '../Botao';
import { Icone } from '../Icone';
import { MarcadorGravidade } from '../MarcadorGravidade';
import { SeloStatus } from '../Sinalizacao';
import { Texto } from '../Texto';

interface PropsCartaoParecido {
  ocorrencia: OcorrenciaProxima;
  onConfirmar: () => void;
  confirmando: boolean;
}

export function CartaoParecido({ ocorrencia, onConfirmar, confirmando }: PropsCartaoParecido) {
  return (
    <View style={[styles.cartao, sombra.cartao]}>
      <View style={styles.topo}>
        <MarcadorGravidade prioridade={ocorrencia.prioridade} tamanho={18} />
        <Texto style={styles.distancia}>a {formatarDistancia(ocorrencia.distanciaM)} daqui</Texto>
      </View>
      <Texto variante="subtitulo">{ocorrencia.titulo}</Texto>
      <Texto variante="apoio" numberOfLines={3}>
        {ocorrencia.descricao}
      </Texto>
      <SeloStatus status={ocorrencia.status} />
      <View style={styles.linha}>
        <Icone nome="clock-outline" tamanho={16} cor={cores.textoSuave} />
        <Texto variante="apoio">Registrada em {formatarDataHora(ocorrencia.criadoEm)}</Texto>
      </View>
      {ocorrencia.confirmacoes > 0 ? (
        <View style={styles.linha}>
          <Icone nome="account-multiple" tamanho={16} cor={cores.placa} />
          <Texto style={styles.relatos}>
            {ocorrencia.confirmacoes === 1 ? '1 pessoa também relatou' : `${ocorrencia.confirmacoes} pessoas também relataram`}
          </Texto>
        </View>
      ) : null}
      <Botao
        titulo="Sim, é o mesmo: confirmar"
        onPress={onConfirmar}
        carregando={confirmando}
        tituloCarregando="Confirmando…"
        dica="Soma o seu relato a esta ocorrência e você passa a acompanhá-la"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: { backgroundColor: cores.papel, borderRadius: raio.lg, padding: espaco.lg, gap: espaco.sm, borderWidth: 1, borderColor: cores.borda },
  topo: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  distancia: { fontFamily: fontes.black, fontSize: 14, color: cores.placa },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.xs },
  relatos: { fontFamily: fontes.extrabold, fontSize: 14, color: cores.placa },
});
