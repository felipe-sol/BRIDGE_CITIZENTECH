# Fonte dos limites das subprefeituras (`subprefeituras_sp.geojson`)

| Item | Valor |
|---|---|
| Fonte | GeoSampa — Prefeitura do Município de São Paulo (SMUL/Geoinfo) |
| Camada | `geoportal:subprefeitura` ("Subprefeituras"), EPSG:4326 |
| Serviço | WFS oficial `http://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs` |
| Metadado | <https://metadados.geosampa.prefeitura.sp.gov.br/geonetwork/srv/api/records/289e684e-b2be-453d-8d2d-68ec629cd3dc> |
| Base legal citada no metadado | Lei nº 13.399/2002 (criação das subprefeituras); Lei nº 16.974/2018 |
| Download | 12/11/2026, arquivo bruto de 2.355.384 bytes, 32 polígonos, 84.130 vértices |
| Licença | O metadado indica **acesso sem restrições** e não nomeia a licença. Uso acadêmico, com atribuição à Prefeitura de São Paulo/GeoSampa. |

## Processamento (`scripts/preparar_regioes.py`)

- **Simplificação:** Douglas–Peucker com tolerância de 0,00015° (cerca de 15 m), com
  coordenadas arredondadas para 5 casas (cerca de 1 m). Resultado: 5.196 vértices e
  115 KB.
- **Conferência:** foram sorteados 5.000 pontos (semente 42) na área da cidade, e a
  região atribuída pelo arquivo bruto foi comparada com a do simplificado. Divergiram
  3 pontos (0,06%), todos junto às divisas.
- **Propriedades mantidas:**
  - `codigo` = `cd_subprefeitura`;
  - `nome_oficial` = `nm_subprefeitura`;
  - `zona` = `nm_regiao_05`;
  - `area_km2` = `qt_area_metro` ÷ 1.000.000, com 3 casas.
- **Grafia exibida:** o nome com acentos e barras (por exemplo "Butantã" e
  "Casa Verde/Limão/Cachoeirinha") vem de `NOMES_EXIBICAO` em `app/services/regioes.py`.
  São só os nomes oficiais com acentuação. Nenhuma palavra foi acrescentada.

O arquivo bruto **não** fica no repositório. Para regenerar, siga as instruções no
cabeçalho do script.
