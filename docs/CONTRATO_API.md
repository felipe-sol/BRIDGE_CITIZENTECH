# Contrato da API REST — Bridge

Este é o contrato seguido pelo backend (`backend/`), pelo app (`mobile/src/services/`)
e pela coleção do Insomnia (`docs/insomnia/`). Qualquer mudança aqui precisa ser
refletida nos três.

- Base URL local: `http://localhost:8000` (no celular: `http://<IP-do-computador>:8000`)
- Formato: JSON UTF-8 (exceto upload de imagem, que é `multipart/form-data`)
- Datas: ISO 8601 em UTC, ex.: `2026-11-11T18:30:00.123456Z`
- Nomes de campos: português, `snake_case`
- Documentação interativa gerada pelo FastAPI: `GET /docs` (Swagger) e `GET /openapi.json`

## 1. Valores controlados (enums)

| Enum | Valores |
|---|---|
| `CategoriaOcorrencia` | `CALCADA_DANIFICADA`, `BURACO`, `ILUMINACAO_DEFEITUOSA`, `OBSTACULO_CIRCULACAO`, `OUTRO` |
| `StatusOcorrencia` | `ABERTA`, `EM_ANALISE`, `EM_ANDAMENTO`, `RESOLVIDA`, `REJEITADA` |
| `Prioridade` | `BAIXA`, `MEDIA`, `ALTA` |
| `StatusAnaliseIA` | `PENDENTE`, `CONCLUIDA`, `INDISPONIVEL`, `FALHOU` |
| `OrigemOcorrencia` | `APP` (registro real, padrão em todas as consultas) e `SIMULADA` (dado fictício de demonstração do modo Exemplo) |
| `NivelAlerta` | `NORMAL`, `ATENCAO`, `ALERTA` (Alerta Bridge: calculado automaticamente a partir dos relatos; não é oficial) |

Transições de status e cálculo de prioridade: ver [REGRAS_DE_NEGOCIO.md](REGRAS_DE_NEGOCIO.md).

## 2. Formato de erro (todas as rotas)

```json
{
  "erro": {
    "codigo": "VALIDACAO",
    "mensagem": "Os dados enviados são inválidos.",
    "detalhes": [
      { "campo": "latitude", "mensagem": "Deve ser menor ou igual a 90." }
    ]
  }
}
```

`detalhes` é sempre uma lista (vazia quando não se aplica).

| HTTP | `codigo` | Quando |
|---|---|---|
| 401 | `NAO_AUTORIZADO` | Token administrativo ausente ou incorreto |
| 403 | `ADMIN_DESABILITADO` | Servidor sem `ADMIN_TOKEN` configurado |
| 403 | `PROIBIDO` | Upload feito por identificação diferente da autora |
| 404 | `NAO_ENCONTRADO` | Recurso inexistente |
| 409 | `TRANSICAO_INVALIDA` | Mudança de status não permitida |
| 409 | `IMAGEM_JA_ENVIADA` | A ocorrência já possui imagem |
| 409 | `PROPRIA_OCORRENCIA` | A identificação tentou confirmar a ocorrência que ela mesma registrou |
| 409 | `OCORRENCIA_ENCERRADA` | Confirmação em ocorrência `RESOLVIDA` ou `REJEITADA` |
| 409 | `OCORRENCIA_SIMULADA` | Confirmação em dado fictício (`origem = SIMULADA`) |
| 413 | `ARQUIVO_MUITO_GRANDE` | Upload acima do limite (`MAX_UPLOAD_MB`, padrão 5 MB) |
| 415 | `FORMATO_NAO_SUPORTADO` | Conteúdo do arquivo não é JPEG nem PNG válido |
| 422 | `VALIDACAO` | Campos, parâmetros ou cabeçalhos inválidos/ausentes (ex.: `Idempotency-Key` que não é UUID) |
| 422 | `IDENTIFICACAO_INEXISTENTE` | `identificacao_id` do corpo ou o cabeçalho `X-Identificacao-Id` não existe |
| 500 | `ERRO_INTERNO` | Erro inesperado (sem detalhes internos na resposta) |
| 503 | `BANCO_INDISPONIVEL` | Falha de conexão com o PostgreSQL |

## 3. Endpoints

### 3.1 `GET /health`

`200`:
```json
{
  "status": "ok",
  "banco": "ok",
  "modelo_ia": { "disponivel": true, "versao": "bridge-text-classifier-1.0.0" },
  "versao_api": "2.0.0"
}
```
Sem modelo de IA configurado (ou se o arquivo não puder ser carregado): `"modelo_ia": { "disponivel": false, "versao": null }`.
Se o banco não responder: `503` com `"status": "degradado"` e `"banco": "indisponivel"`.

### 3.2 `POST /identificacoes`

Cria a identificação do cidadão usada pelo app. **Não é login nem autenticação**:
é um pseudônimo com um UUID gerado pelo servidor, guardado no aparelho.

Corpo:
```json
{ "apelido": "Maria do Bairro" }
```
- `apelido`: obrigatório, 2 a 60 caracteres após remover espaços nas pontas.

`201`:
```json
{ "id": "3f0c2b1e-...", "apelido": "Maria do Bairro", "criado_em": "2026-11-11T18:30:00Z" }
```

### 3.3 `GET /identificacoes/atual` e `GET /identificacoes/{id}` (obsoleta)

`GET /identificacoes/atual` é o que o app usa ao reabrir para confirmar que a
identificação salva ainda existe. O UUID vai no cabeçalho **`X-Identificacao-Id`**,
nunca na URL (URLs ficam em logs de acesso).
`200` (mesmo formato acima) · `404` (`NAO_ENCONTRADO`) se não existir · `422`
(`VALIDACAO`) sem o cabeçalho ou com UUID inválido.

`GET /identificacoes/{id}` continua respondendo igual, só para compatibilidade com os
testes manuais da Rodada 1. Ela está marcada como **obsoleta** (`deprecated`) no OpenAPI e
o app não a usa mais.

### 3.4 `POST /ocorrencias`

Cabeçalho opcional: `Idempotency-Key: <UUID>` — o app gera um por envio do formulário.
Se a mesma chave já foi usada, a API **não cria outra ocorrência**: responde `200`
com a ocorrência existente. Isso evita duplicatas quando a resposta se perde na rede
ou o usuário reenvia.

Corpo:
```json
{
  "identificacao_id": "3f0c2b1e-...",
  "titulo": "Calçada quebrada em frente à escola",
  "descricao": "Placas soltas e buraco de ~40 cm na calçada.",
  "categoria": "CALCADA_DANIFICADA",
  "latitude": -23.564224,
  "longitude": -46.652857,
  "risco_imediato": true,
  "bloqueia_passagem": false,
  "afeta_acessibilidade": true,
  "endereco": "Rua dos Pinheiros, 870 — Pinheiros"
}
```

| Campo | Regra |
|---|---|
| `identificacao_id` | UUID existente |
| `endereco` | opcional, até 200 caracteres (texto vazio vira `null`); sugerido pela geocodificação do aparelho |
| `titulo` | 5 a 120 caracteres |
| `descricao` | 10 a 2000 caracteres |
| `categoria` | `CategoriaOcorrencia` |
| `latitude` | -90 a 90 |
| `longitude` | -180 a 180 |
| (`latitude`, `longitude`) | não pode ser exatamente (0, 0) — indica localização ausente |
| `risco_imediato`, `bloqueia_passagem`, `afeta_acessibilidade` | booleanos, padrão `false` |

Campos extras são rejeitados (`422`).

`201` (nova) ou `200` (chave de idempotência repetida): objeto **Ocorrência**:
```json
{
  "id": 12,
  "titulo": "Calçada quebrada em frente à escola",
  "descricao": "Placas soltas e buraco de ~40 cm na calçada.",
  "categoria": "CALCADA_DANIFICADA",
  "latitude": -23.564224,
  "longitude": -46.652857,
  "endereco": "Rua dos Pinheiros, 870 — Pinheiros",
  "subprefeitura": { "codigo": "11", "nome": "Pinheiros" },
  "confirmacoes": 0,
  "origem": "APP",
  "risco_imediato": true,
  "bloqueia_passagem": false,
  "afeta_acessibilidade": true,
  "status": "ABERTA",
  "prioridade": "ALTA",
  "prioridade_pontuacao": 7,
  "prioridade_justificativa": "Categoria calçada danificada (+2); risco imediato informado (+3); afeta acessibilidade (+2). Total 7/10 → ALTA.",
  "imagem_url": null,
  "analise_ia": {
    "status": "INDISPONIVEL",
    "categoria_sugerida": null,
    "confianca": null,
    "versao_modelo": null,
    "analisada_em": null
  },
  "criado_em": "2026-11-11T18:31:00Z",
  "atualizado_em": "2026-11-11T18:31:00Z"
}
```

Observações:
- O autor (`identificacao_id`/apelido) **não aparece** nas respostas públicas.
- `imagem_url` é um caminho relativo (ex.: `/ocorrencias/12/imagem`); o cliente
  concatena com a base URL.
- `analise_ia.confianca` só é preenchida se o modelo fornecer esse valor.
- `subprefeitura` é calculada **pelo servidor** a partir das coordenadas (limites
  oficiais do GeoSampa); é `null` fora do município de São Paulo.
- `confirmacoes` conta quantas outras pessoas disseram "eu também vi" (seção 3.12).
  **Não** altera a prioridade.

### 3.5 `GET /ocorrencias`

Parâmetros de consulta (todos opcionais):

| Parâmetro | Padrão | Regra |
|---|---|---|
| `pagina` | 1 | inteiro ≥ 1 |
| `tamanho` | 20 | inteiro 1–100 |
| `ordenar` | `recentes` | `recentes` (criado_em ↓, id ↓) ou `prioridade` (pontuação ↓, criado_em ↓, id ↓) |
| `status` | — | `StatusOcorrencia` |
| `categoria` | — | `CategoriaOcorrencia` |
| `prioridade` | — | `Prioridade` |
| `origem` | `APP` | `OrigemOcorrencia`: dados reais e fictícios nunca se misturam |
| `bbox` | — | área do mapa: `min_lon,min_lat,max_lon,max_lat` (mínimos menores que os máximos) |
| `q` | — | 2 a 60 caracteres; busca no título, na descrição e no endereço, sem diferenciar maiúsculas (`%` e `_` valem como texto) |
| `subprefeitura` | — | código de 2 dígitos (ex.: `09`) |

> Não há filtro por autor nesta rota: o UUID da identificação não deve circular em
> URLs (que aparecem em logs de acesso). A lista de "minhas" usa o cabeçalho (3.10).

`200`:
```json
{
  "itens": [ { "...": "Ocorrência" } ],
  "pagina": 1,
  "tamanho": 20,
  "total": 1,
  "total_paginas": 1
}
```
Lista vazia: `itens: []`, `total: 0`, `total_paginas: 0`.

### 3.6 `GET /ocorrencias/{id}`

`200`: Ocorrência + histórico de status (mais antigo primeiro):
```json
{
  "...": "campos da Ocorrência",
  "historico_status": [
    { "status_anterior": null, "status_novo": "ABERTA", "observacao": "Ocorrência registrada.", "alterado_em": "..." }
  ]
}
```
`404` se não existir · `422` se `id` não for inteiro.

Cabeçalho **opcional** `X-Identificacao-Id`: com ele, a resposta inclui
`"minha_relacao": { "registrei": false, "confirmei": true }` (a relação de quem
pergunta). Sem ele, `minha_relacao` é `null`. O autor nunca é exposto.

### 3.7 `PATCH /ocorrencias/{id}/status` (administrativa)

Cabeçalho obrigatório: `X-Admin-Token: <valor de ADMIN_TOKEN do .env>`.
O app **não** usa esta rota e **não** contém o token. Ela existe para o operador
(demonstração via Insomnia, em ambiente local).

Corpo:
```json
{ "status": "EM_ANALISE", "observacao": "Equipe de zeladoria notificada." }
```
- `observacao`: opcional, até 500 caracteres.

`200`: Ocorrência atualizada (com `historico_status`).
`401` token ausente/incorreto · `403` admin desabilitado · `404` · `409` transição inválida · `422`.

### 3.8 `POST /ocorrencias/{id}/imagem`

`multipart/form-data` com o campo `arquivo` (a foto).
Cabeçalho obrigatório: `X-Identificacao-Id: <UUID da identificação autora>`.

> Verificação de consistência, **não** autenticação: impede que outro cliente
> anexe foto à ocorrência de terceiros por engano, já que o ID da autora não é
> exposto nas respostas públicas.

Regras do servidor:
- Tamanho máximo: `MAX_UPLOAD_MB` (padrão 5 MB) → `413`.
- Formato verificado pelo **conteúdo** (decodificação com Pillow), não pela
  extensão nem pelo `Content-Type` do cliente. Aceitos: JPEG e PNG → senão `415`.
- O servidor gera o nome do arquivo (UUID), grava em `UPLOAD_DIR` (fora do Git)
  e reencoda a imagem, descartando metadados EXIF (que podem conter GPS e dados do aparelho).
- Só uma imagem por ocorrência → `409 IMAGEM_JA_ENVIADA`.

`200`: Ocorrência atualizada (`imagem_url` preenchida; `analise_ia` atualizada se houver modelo).

### 3.9 `GET /ocorrencias/{id}/imagem`

`200` com `image/jpeg` ou `image/png` · `404` se a ocorrência ou a imagem não existir.

### 3.10 `GET /ocorrencias/minhas` (aba Andamento)

Cabeçalho obrigatório: `X-Identificacao-Id: <UUID>` (no cabeçalho, e não na URL).
Parâmetros: `relacao` = `registradas` (padrão) ou `confirmadas`; `pagina` ≥ 1;
`tamanho` 1–100 (padrão 20). Ordem: `atualizado_em` ↓, `id` ↓ (o que mudou por último
vem primeiro).

`200`: mesmo formato da 3.5 · `422 IDENTIFICACAO_INEXISTENTE` · `422 VALIDACAO`.

### 3.11 `GET /ocorrencias/proximas` (checagem de duplicatas)

Parâmetros: `latitude` e `longitude` (obrigatórios), `raio_m` 10–500 (padrão 100),
`categoria` (opcional). Devolve só ocorrências **reais e abertas** (`ABERTA`,
`EM_ANALISE`, `EM_ANDAMENTO`), da mais perto para a mais longe, no máximo 10:

```json
{ "itens": [ { "...": "campos da Ocorrência", "distancia_m": 30 } ] }
```

### 3.12 `POST` e `DELETE /ocorrencias/{id}/confirmacoes` ("eu também vi")

Cabeçalho obrigatório: `X-Identificacao-Id: <UUID>`.

- `POST`: `201` quando a confirmação é nova; `200` quando já existia (idempotente).
- `DELETE`: `200` (idempotente; desfazer duas vezes não é erro).

```json
{ "ocorrencia_id": 12, "confirmacoes": 3, "confirmado": true }
```

Erros: `404` ocorrência inexistente · `422 IDENTIFICACAO_INEXISTENTE` ·
`409 PROPRIA_OCORRENCIA` · `409 OCORRENCIA_ENCERRADA` · `409 OCORRENCIA_SIMULADA`.
A confirmação **não** muda prioridade nem status; ela conta para os números da região.

### 3.13 `GET /regioes`

GeoJSON (`FeatureCollection`) com os limites simplificados das **32 subprefeituras**
de São Paulo (fonte: GeoSampa; ver `backend/app/dados/FONTE_REGIOES.md`). Cada
`properties` tem `codigo`, `nome` (grafia correta, ex.: "Butantã"), `nome_oficial`
(como na camada, ex.: "BUTANTA"), `area_km2` e `zona`.
Cabeçalho `Cache-Control: public, max-age=86400`: o app guarda em cache.

### 3.14 `GET /estatisticas/regioes`

Parâmetros: `origem` (`APP` padrão ou `SIMULADA`) e `dias` (1–365, opcional = tudo).
Sempre devolve as 32 regiões (com zero onde não há ocorrências):

```json
{
  "origem": "APP",
  "dias": null,
  "itens": [
    { "codigo": "09", "nome": "Sé", "total": 2, "abertas": 1, "alta_abertas": 1,
      "resolvidas": 1, "confirmacoes": 1, "densidade_km2": 0.076,
      "alerta": { "nivel": "NORMAL", "indice": 9, "abertas_30d": 1, "abertas_alta_30d": 1 } }
  ]
}
```

- `confirmacoes`: soma das confirmações das ocorrências **abertas** da região.
- `densidade_km2`: total ÷ área oficial da subprefeitura (3 casas).
- `alerta`: Alerta Bridge da região, sempre sobre as abertas dos **últimos 30 dias**
  daquela origem (independe de `dias`). Regra em [REGRAS_DE_NEGOCIO.md](REGRAS_DE_NEGOCIO.md), seção 7.

### 3.15 `GET /estatisticas/resumo` (aba Análises)

Exemplo abaixo: resposta real com os dados FICTÍCIOS gerados em 13/11/2026 (`origem=SIMULADA`, listas cortadas no 1º item).

Parâmetros: `origem` (`APP` padrão ou `SIMULADA`) e `dias` (1–365, opcional = tudo daquela
origem). `422` para `dias` fora da faixa ou origem desconhecida.

```json
{
  "origem": "SIMULADA", "dias": null,
  "total": 1200, "abertas": 425, "resolvidas": 686, "rejeitadas": 89,
  "percentual_resolvidas": 57.2, "tempo_medio_resolucao_dias": 16.1,
  "alertas_ativos": 3, "regioes_em_atencao": 7,
  "por_categoria": [ { "categoria": "CALCADA_DANIFICADA", "total": 378 } ],
  "semanal": [ { "inicio": "2026-07-13", "registradas": 37, "resolvidas": 0 } ],
  "ranking_regioes": [ { "codigo": "27", "nome": "Itaquera", "total": 98 } ]
}
```

- `percentual_resolvidas`: resolvidas ÷ total × 100 (1 casa); `null` sem ocorrências.
- `tempo_medio_resolucao_dias`: média de (data da transição para `RESOLVIDA` − data do
  registro), 1 casa; `null` sem resolvidas.
- `alertas_ativos` / `regioes_em_atencao`: quantas regiões estão em `ALERTA` / `ATENCAO`.
- `por_categoria`: as 5 categorias, na ordem do enum, com zeros.
- `semanal`: semanas de segunda a domingo **no horário de São Paulo**, da semana de
  (agora − `dias`) — ou da primeira ocorrência — até a semana atual, com zeros;
  `registradas` por data de registro, `resolvidas` pelas transições para `RESOLVIDA`
  ocorridas na semana. Lista vazia quando não há ocorrências no período.
- `ranking_regioes`: até 5 regiões com mais ocorrências (empate: nome); sem zeros.

### 3.16 `GET /ocorrencias/mapa` (pontos do mapa)

Parâmetros: `bbox` **obrigatório** (`min_lon,min_lat,max_lon,max_lat`), `origem`
(`APP` padrão ou `SIMULADA`), `categoria`, `prioridade`, `status`. `422` sem `bbox` ou com
`bbox` inválido. Exemplo **ilustrativo** de uma área com corte:

```json
{
  "itens": [ { "id": 7, "latitude": -23.5503, "longitude": -46.634, "categoria": "BURACO",
               "prioridade": "ALTA", "status": "ABERTA", "titulo": "Buraco na rua",
               "endereco": null, "confirmacoes": 2 } ],
  "total": 2500,
  "truncado": true
}
```

Formato enxuto (só o que o marcador e o cartão do mapa precisam), as mais graves primeiro,
**até 2000 itens**. `total` é quantas existem na área; `truncado: true` avisa que há mais do
que as devolvidas, e o app pede para aproximar o mapa.

### 3.17 `PATCH /identificacoes/atual` (trocar apelido)

Cabeçalho **`X-Identificacao-Id`** (a própria identificação) e corpo `{"apelido": "Nova Vizinha"}`
(2 a 60 caracteres, espaços das pontas removidos; campos extras são recusados).
`200` com a identificação atualizada · `404` (`NAO_ENCONTRADO`) · `422` (`VALIDACAO`) sem o
cabeçalho, com UUID inválido ou com apelido fora da regra. O apelido nunca aparece em
respostas públicas.

### 3.18 `GET /identificacoes/atual/participacao` (Perfil)

Cabeçalho **`X-Identificacao-Id`**. Só conta registros reais (`APP`).

```json
{ "registradas": 2, "confirmadas": 1, "resolvidas_acompanhadas": 2, "avisos_nao_resolvido": 1 }
```

`resolvidas_acompanhadas` = ocorrências registradas **ou** confirmadas pela pessoa que estão
`RESOLVIDA`. Identificação nova: tudo zero. `404` se a identificação não existir.

### 3.19 `POST` e `DELETE /ocorrencias/{id}/nao-resolvido` ("Ainda não foi resolvido? Avise")

Cabeçalho **`X-Identificacao-Id`** obrigatório. Resposta:
`{"ocorrencia_id": 1, "avisos_nao_resolvido": 1, "avisado": true}`.

- `POST`: `201` quando cria o aviso; `200` quando ele já existia (não duplica).
- `DELETE`: `200` (idempotente), com `avisado: false`.
- Erros: `404` (`NAO_ENCONTRADO`); `422` (`IDENTIFICACAO_INEXISTENTE`, campo
  `X-Identificacao-Id`, ou `VALIDACAO` sem o cabeçalho); `409` (`OCORRENCIA_SIMULADA`);
  `409` (`OCORRENCIA_NAO_RESOLVIDA`) quando a ocorrência não está `RESOLVIDA`.
- O aviso **não reabre** a ocorrência nem muda status ou prioridade. Quem registrou também
  pode avisar.
- `GET /ocorrencias/{id}` passa a trazer `avisos_nao_resolvido` (contagem) e, com o
  cabeçalho, `minha_relacao.avisei_nao_resolvido`.

### 3.20 `POST /ia/sugestao-categoria` (sugestão da IA no registro)

O app pergunta antes de enviar, na revisão. **Não grava nada.** Corpo com as mesmas regras do
cadastro (sem `identificacao_id` e `endereco`):

```json
{ "titulo": "Poste apagado na esquina", "descricao": "A lâmpada está queimada e a rua fica escura à noite.",
  "categoria": "OUTRO", "latitude": -23.5503, "longitude": -46.634,
  "risco_imediato": false, "bloqueia_passagem": false, "afeta_acessibilidade": false }
```

`200`:

```json
{ "disponivel": true, "categoria_sugerida": "ILUMINACAO_DEFEITUOSA", "confianca": 0.71, "versao_modelo": "bridge-text-classifier-1.0.0" }
```

_Valor de `confianca` ilustrativo._ Sem modelo (ou se o modelo falhar): `200` com
`{"disponivel": false, "categoria_sugerida": null, "confianca": null, "versao_modelo": null}`.
Campos inválidos: `422` (`VALIDACAO`), como no cadastro. A categoria escolhida pela pessoa só
muda se ela aceitar a sugestão no app.

## 4. Fluxo de cadastro com foto (decisão)

Escolhemos **cadastro seguido de upload** (2 requisições), e não um único multipart:

1. App gera `Idempotency-Key` e envia `POST /ocorrencias` (JSON).
2. Com o `id` recebido, envia `POST /ocorrencias/{id}/imagem`.
3. Se o passo 2 falhar, o app **mantém o `id`** e oferece "Tentar enviar a foto
   novamente" — sem recriar a ocorrência. Se o passo 1 for repetido com a mesma
   chave, a API devolve a mesma ocorrência (`200`).

Motivos: validação JSON simples e testável no Insomnia; falha de upload não
perde a ocorrência; retentativa sem duplicação.
