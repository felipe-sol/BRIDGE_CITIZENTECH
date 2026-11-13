/** As 32 subprefeituras pintadas pela densidade de ocorrências (por km²). */
import { Polygon } from 'react-native-maps';

import { corDaRegiao } from '../../geo/densidade';
import type { RegiaoSP } from '../../geo/tipos';
import type { EstatisticaRegiao } from '../../models/ocorrencia';
import { cores } from '../../theme/tema';

interface PropsCamadaDensidade {
  regioes: readonly RegiaoSP[];
  /** `null` enquanto as estatísticas não chegaram (ou sem conexão): regiões só com contorno. */
  estatisticas: readonly EstatisticaRegiao[] | null;
  onRegiao: (codigo: string) => void;
}

export function CamadaDensidade({ regioes, estatisticas, onRegiao }: PropsCamadaDensidade) {
  const densidade = new Map((estatisticas ?? []).map((e) => [e.codigo, e.densidadeKm2]));
  return (
    <>
      {regioes.map((regiao) => {
        const [contorno, ...buracos] = regiao.aneis;
        if (contorno === undefined) return null;
        return (
          <Polygon
            key={regiao.codigo}
            coordinates={contorno}
            holes={buracos}
            fillColor={corDaRegiao(densidade.get(regiao.codigo))}
            strokeColor={estatisticas === null ? cores.textoSuave : cores.papel}
            strokeWidth={1.5}
            tappable
            onPress={() => onRegiao(regiao.codigo)}
          />
        );
      })}
    </>
  );
}
