/**
 * As 32 subprefeituras pintadas pela densidade de ocorrências (por km²). Regiões em
 * Alerta Bridge ganham contorno vermelho TRACEJADO (forma, não só cor).
 */
import { Polygon } from 'react-native-maps';

import { corDaRegiao } from '../../geo/densidade';
import type { RegiaoSP } from '../../geo/tipos';
import type { EstatisticaRegiao } from '../../models/ocorrencia';
import { cores } from '../../theme/tema';

const TRACEJADO = [8, 6];

interface PropsCamadaDensidade {
  regioes: readonly RegiaoSP[];
  /** `null` enquanto as estatísticas não chegaram (ou sem conexão): regiões só com contorno. */
  estatisticas: readonly EstatisticaRegiao[] | null;
  onRegiao: (codigo: string) => void;
}

export function CamadaDensidade({ regioes, estatisticas, onRegiao }: PropsCamadaDensidade) {
  const porCodigo = new Map((estatisticas ?? []).map((e) => [e.codigo, e]));
  return (
    <>
      {regioes.map((regiao) => {
        const [contorno, ...buracos] = regiao.aneis;
        if (contorno === undefined) return null;
        const numeros = porCodigo.get(regiao.codigo);
        const emAlerta = numeros?.alerta.nivel === 'ALERTA';
        return (
          <Polygon
            key={regiao.codigo}
            coordinates={contorno}
            holes={buracos}
            fillColor={corDaRegiao(numeros?.densidadeKm2)}
            strokeColor={emAlerta ? cores.alerta : estatisticas === null ? cores.textoSuave : cores.papel}
            strokeWidth={emAlerta ? 3 : 1.5}
            lineDashPattern={emAlerta ? TRACEJADO : undefined}
            zIndex={emAlerta ? 1 : 0}
            tappable
            onPress={() => onRegiao(regiao.codigo)}
          />
        );
      })}
    </>
  );
}
