/** Cartão de uma ocorrência acompanhada: gravidade, local, andamento e selo "Atualizada". */
import { Pressable, StyleSheet, View } from 'react-native';

import { ROTULO_CATEGORIA, type Ocorrencia } from '../models/ocorrencia';
import { cores, espaco, fontes, raio, sombra } from '../theme/tema';
import { EtapasStatus } from './EtapasStatus';
import { ICONE_CATEGORIA, Icone } from './Icone';
import { MarcadorGravidade } from './MarcadorGravidade';
import { Texto } from './Texto';

interface PropsCartao {
  ocorrencia: Ocorrencia;
  atualizada: boolean;
  onPress: () => void;
}

function localDe(o: Ocorrencia): string {
  if (o.endereco) return o.endereco;
  if (o.subprefeitura) return `Subprefeitura ${o.subprefeitura.nome}`;
  return 'Local sem endereço';
}

export function CartaoAcompanhamento({ ocorrencia, atualizada, onPress }: PropsCartao) {
  const relatos = ocorrencia.confirmacoes;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Abre o detalhe com a linha do tempo"
      onPress={onPress}
      style={({ pressed }) => [styles.cartao, sombra.cartao, pressed && styles.pressionado]}
    >
      <View style={styles.topo}>
        <MarcadorGravidade prioridade={ocorrencia.prioridade} tamanho={18} />
        <Icone nome={ICONE_CATEGORIA[ocorrencia.categoria]} tamanho={18} cor={cores.textoSuave} />
        <Texto variante="placa" style={styles.categoria} numberOfLines={1}>
          {ROTULO_CATEGORIA[ocorrencia.categoria]}
        </Texto>
        {atualizada ? (
          <View style={styles.selo} accessible accessibilityLabel="Atualizada desde a sua última visita">
            <Texto style={styles.seloTexto}>ATUALIZADA</Texto>
          </View>
        ) : null}
      </View>
      <Texto variante="subtitulo" numberOfLines={2}>
        {ocorrencia.titulo}
      </Texto>
      <Texto variante="apoio" numberOfLines={1}>
        {localDe(ocorrencia)}
      </Texto>
      <EtapasStatus status={ocorrencia.status} />
      {relatos > 0 ? (
        <View style={styles.relatos}>
          <Icone nome="account-multiple" tamanho={18} cor={cores.placa} />
          <Texto style={styles.relatosTexto}>
            {relatos === 1 ? '1 pessoa também relatou' : `${relatos} pessoas também relataram`}
          </Texto>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: cores.papel,
    borderRadius: raio.lg,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: espaco.lg,
    gap: espaco.sm,
  },
  pressionado: { opacity: 0.9 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  categoria: { flex: 1 },
  selo: { backgroundColor: cores.alerta, borderRadius: raio.sm, paddingHorizontal: espaco.sm, paddingVertical: 2 },
  seloTexto: { fontFamily: fontes.black, fontSize: 11, letterSpacing: 0.8, color: cores.papel },
  relatos: { flexDirection: 'row', alignItems: 'center', gap: espaco.xs },
  relatosTexto: { fontFamily: fontes.extrabold, fontSize: 14, color: cores.placa },
});
