/**
 * Linha do tempo do andamento: cada mudança de status com data e o comentário da
 * equipe responsável. Enquanto não houver um desfecho, mostra o próximo passo esperado.
 */
import { StyleSheet, View } from 'react-native';

import { ROTULO_STATUS, type RegistroHistorico, type StatusOcorrencia } from '../models/ocorrencia';
import { cores, espaco, fontes } from '../theme/tema';
import { formatarDataHora } from '../utils/formatacao';
import { Texto } from './Texto';

const PROXIMO: Partial<Record<StatusOcorrencia, string>> = {
  ABERTA: 'Em análise pela equipe responsável',
  EM_ANALISE: 'Em andamento',
  EM_ANDAMENTO: 'Resolvida',
};

const OBSERVACOES_DO_SISTEMA = new Set(['Ocorrência registrada.', 'Registro inicial criado pela migração 0002.']);

function tituloDoEvento(r: RegistroHistorico): string {
  return r.statusAnterior === null ? 'Registrada' : ROTULO_STATUS[r.statusNovo];
}

export function LinhaDoTempo({ historico, status }: { historico: readonly RegistroHistorico[]; status: StatusOcorrencia }) {
  const proximo = PROXIMO[status];
  return (
    <View style={styles.lista}>
      {historico.map((registro, i) => {
        const ultimo = i === historico.length - 1;
        const comentario = registro.observacao && !OBSERVACOES_DO_SISTEMA.has(registro.observacao) ? registro.observacao : null;
        return (
          <View key={`${registro.alteradoEm}-${i}`} style={styles.evento} accessible>
            <View style={styles.trilho}>
              <View style={[styles.ponto, ultimo && styles.pontoAtual, registro.statusNovo === 'RESOLVIDA' && styles.pontoResolvido]} />
              {!ultimo || proximo ? <View style={styles.linha} /> : null}
            </View>
            <View style={styles.conteudo}>
              <Texto style={styles.titulo}>{tituloDoEvento(registro)}</Texto>
              <Texto variante="apoio">{formatarDataHora(registro.alteradoEm)}</Texto>
              {comentario ? (
                <View style={styles.comentario}>
                  <Texto variante="placa">Equipe responsável</Texto>
                  <Texto variante="corpo">“{comentario}”</Texto>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
      {proximo ? (
        <View style={styles.evento} accessible accessibilityLabel={`Próximo passo esperado: ${proximo}`}>
          <View style={styles.trilho}>
            <View style={[styles.ponto, styles.pontoFuturo]} />
          </View>
          <View style={styles.conteudo}>
            <Texto style={[styles.titulo, styles.tituloFuturo]}>{proximo}</Texto>
            <Texto variante="apoio">Aguardando</Texto>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: 0 },
  evento: { flexDirection: 'row', gap: espaco.md },
  trilho: { width: 18, alignItems: 'center' },
  ponto: { width: 14, height: 14, borderRadius: 7, marginTop: 4, backgroundColor: cores.placa, borderWidth: 2, borderColor: cores.papel },
  pontoAtual: { backgroundColor: cores.sinal, borderColor: cores.asfalto },
  pontoResolvido: { backgroundColor: cores.ok, borderColor: cores.papel },
  pontoFuturo: { backgroundColor: cores.papel, borderColor: cores.borda },
  linha: { flex: 1, width: 3, backgroundColor: cores.borda, marginVertical: 2 },
  conteudo: { flex: 1, paddingBottom: espaco.lg, gap: 2 },
  titulo: { fontFamily: fontes.extrabold, fontSize: 16, color: cores.asfalto },
  tituloFuturo: { color: cores.textoSuave },
  comentario: { marginTop: espaco.xs, padding: espaco.md, borderRadius: 8, backgroundColor: cores.placaClaro, gap: 2 },
});
