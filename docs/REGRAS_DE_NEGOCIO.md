# Regras de negócio — Bridge

## 1. Prioridade das ocorrências

**O que é:** uma pontuação por regras fixas, determinística e transparente, usada
para ordenar a fila de intervenções. **Não é Machine Learning** e **não é uma
avaliação oficial de segurança**: usa apenas o que o cidadão informou no
cadastro, sem verificação em campo.

Implementação: [`backend/app/services/prioridade.py`](../backend/app/services/prioridade.py)
(testada em `backend/tests/test_prioridade.py`).

### Fatores (apenas campos coletados no cadastro)

| # | Fator | Origem | Escala |
|---|---|---|---|
| 1 | Gravidade base da categoria | `categoria` escolhida pelo cidadão | 1 a 3 (tabela abaixo) |
| 2 | Risco imediato de acidente/queda | `risco_imediato` (sim/não) | sim = 3, não = 0 |
| 3 | Bloqueia a passagem de pedestres | `bloqueia_passagem` (sim/não) | sim = 2, não = 0 |
| 4 | Afeta acessibilidade (cadeira de rodas, carrinho, baixa visão) | `afeta_acessibilidade` (sim/não) | sim = 2, não = 0 |

Gravidade base por categoria (critério definido pela equipe para o MVP):

| Categoria | Pontos | Motivo |
|---|---|---|
| `BURACO` | 3 | Pode causar queda de pedestres e acidentes com bicicletas/veículos |
| `CALCADA_DANIFICADA` | 2 | Dificulta a circulação a pé e pode causar quedas |
| `OBSTACULO_CIRCULACAO` | 2 | Força o pedestre a desviar, às vezes para a rua |
| `ILUMINACAO_DEFEITUOSA` | 2 | Reduz a visibilidade e a sensação de segurança à noite |
| `OUTRO` | 1 | Sem classificação específica |

### Cálculo

```
pontuacao = gravidade_categoria + risco_imediato + bloqueia_passagem + afeta_acessibilidade
```

Faixa possível: 1 a 10.

| Pontuação | Prioridade |
|---|---|
| 1 a 3 | `BAIXA` |
| 4 a 5 | `MEDIA` |
| 6 a 10 | `ALTA` |

A justificativa gravada em `prioridade_justificativa` lista cada fator que somou
pontos, por exemplo:

> Categoria calçada danificada (+2); risco imediato informado (+3); afeta acessibilidade (+2). Total 7/10 → ALTA.

Exemplos:

| Caso | Conta | Resultado |
|---|---|---|
| `OUTRO`, nada marcado | 1 | BAIXA |
| `BURACO`, nada marcado | 3 | BAIXA |
| `CALCADA_DANIFICADA` + acessibilidade | 2 + 2 = 4 | MEDIA |
| `ILUMINACAO_DEFEITUOSA` + risco | 2 + 3 = 5 | MEDIA |
| `BURACO` + risco | 3 + 3 = 6 | ALTA |
| `CALCADA_DANIFICADA` + bloqueia + acessibilidade | 2 + 2 + 2 = 6 | ALTA |

### Limitações assumidas

- Os fatores são autodeclarados pelo cidadão; não há verificação.
- Não usamos fluxo de pedestres, proximidade de escolas/hospitais ou qualquer
  dado urbano, porque **não coletamos** esses dados.
- A prioridade é calculada no cadastro. No MVP os campos que a compõem não são
  editáveis, então ela não muda depois.
- A categoria sugerida pela IA (quando existir) **não** altera a prioridade:
  ela é exibida ao lado da categoria informada para apoiar a triagem humana.

## 2. Status da ocorrência e transições permitidas

```
ABERTA ──► EM_ANALISE ──► EM_ANDAMENTO ──► RESOLVIDA
  │             │
  └──► REJEITADA ◄┘
```

| De | Para (permitido) |
|---|---|
| `ABERTA` | `EM_ANALISE`, `REJEITADA` |
| `EM_ANALISE` | `EM_ANDAMENTO`, `REJEITADA` |
| `EM_ANDAMENTO` | `RESOLVIDA` |
| `RESOLVIDA` | — (final) |
| `REJEITADA` | — (final) |

- Qualquer outra transição (inclusive para o mesmo status) → `409 TRANSICAO_INVALIDA`.
- Toda ocorrência nasce `ABERTA`, e isso já gera o primeiro registro em
  `historico_status` (`status_anterior = null`).
- Cada mudança grava um registro em `historico_status` (status anterior, novo,
  observação, data) na mesma transação da atualização.
- A mudança de status é uma operação **administrativa** protegida por
  `X-Admin-Token` (ver [CONTRATO_API.md](CONTRATO_API.md#37-patch-ocorrenciasidstatus-administrativa)).

Implementação: [`backend/app/services/transicoes.py`](../backend/app/services/transicoes.py).

## 3. Status da análise de IA

| Status | Significado |
|---|---|
| `INDISPONIVEL` | Não havia modelo carregado no servidor quando a ocorrência foi registrada (sem `MODELO_IA_CAMINHO`, ou arquivo ausente/corrompido). Nada é inferido. |
| `PENDENTE` | Há modelo, mas a análise ainda não rodou (ex.: aguardando a foto). |
| `CONCLUIDA` | O modelo rodou; `categoria_sugerida` e, se o modelo fornecer, `confianca` foram gravadas. |
| `FALHOU` | O modelo gerou erro; a ocorrência continua válida e salva. |

Sem modelo, o sistema **não fabrica** categoria nem confiança. Detalhes em
[CONTRATO_IA.md](CONTRATO_IA.md).

- **Sugestão incerta:** confiança abaixo de 50%. O app mostra como palpite ("incerta") e, no
  registro, não oferece trocar a categoria.
- **Sugestão no registro** (`POST /ia/sugestao-categoria`): só sugere; a categoria muda apenas se
  a pessoa aceitar. Ao aceitar, o app verifica de novo os parecidos com a categoria nova (a
  checagem de duplicatas é por categoria).
- **Registros antigos:** `scripts/analisar_ia.py` analisa as ocorrências `INDISPONIVEL` ou
  `FALHOU`, sem refazer as concluídas e sem mudar categoria, prioridade ou `atualizado_em`
  (analisar não é uma atualização da equipe e não acende o selo "Atualizada").

## 4. Confirmação ("eu também vi")

Outra pessoa pode dizer que viu o mesmo problema, em vez de registrar uma duplicata.

| Regra | Comportamento |
|---|---|
| Uma por pessoa | Cada identificação confirma uma ocorrência no máximo uma vez (restrição `UNIQUE` no banco). Repetir devolve a mesma confirmação (`200`). |
| Não vale para a própria | Quem registrou não confirma (`409 PROPRIA_OCORRENCIA`). |
| Só ocorrências abertas | `RESOLVIDA` e `REJEITADA` não recebem confirmações (`409 OCORRENCIA_ENCERRADA`). |
| Só dados reais | Dados fictícios de demonstração não recebem confirmações (`409 OCORRENCIA_SIMULADA`). |
| Pode desfazer | `DELETE` remove a confirmação; repetir não é erro. |
| **Não muda a prioridade** | A prioridade da seção 1 continua igual e testada. A confirmação aparece como "N pessoas relataram" e conta nos números da região (seção 6). |

Implementação: [`backend/app/services/confirmacoes.py`](../backend/app/services/confirmacoes.py).

## 5. Registro parecido por perto (duplicatas)

Ao registrar, depois de escolher local e categoria, o app consulta
`GET /ocorrencias/proximas` e mostra as ocorrências que atendem **todas** as condições:

- mesma categoria;
- real (`origem = APP`) e aberta (`ABERTA`, `EM_ANALISE` ou `EM_ANDAMENTO`);
- a até **100 m** (distância em linha reta, fórmula de haversine).

Se a pessoa disser que é o mesmo problema, o app confirma a ocorrência existente.
Se a consulta falhar (sem rede, por exemplo), o registro segue normalmente com um
aviso. A checagem ajuda, mas não impede registrar.

## 6. Regiões e densidade

- **Regiões**: as 32 subprefeituras de São Paulo, com os limites oficiais da camada
  "Subprefeituras" do GeoSampa (Prefeitura de São Paulo), simplificados para o app.
  A proveniência está em [`backend/app/dados/FONTE_REGIOES.md`](../backend/app/dados/FONTE_REGIOES.md).
  A região de cada ocorrência é calculada pelo servidor a partir das coordenadas. Fora
  do município, ela fica nula.
- **Densidade**: ocorrências no período ÷ área oficial da subprefeitura (km²). No mapa,
  as faixas são fixas:

| Faixa | Ocorrências por km² | Cor no mapa |
|---|---|---|
| 0 | nenhuma | quase transparente |
| 1 | até 0,5 | azul claro |
| 2 | até 2 | amarelo |
| 3 | até 5 | vermelho claro |
| 4 | mais de 5 | vermelho forte |

A cor nunca aparece sozinha: a legenda e a folha da região mostram os números. Os
números são **contagens dos registros feitos no Bridge**, um projeto acadêmico. Não
são estatísticas oficiais da Prefeitura.

## 7. Alerta Bridge por região

O alerta é **calculado automaticamente a partir dos relatos**. Não é alerta oficial da
Prefeitura, da Defesa Civil nem de nenhum órgão, e o app sempre diz isso junto do nível.

- **Quais ocorrências contam**: as abertas (`ABERTA`, `EM_ANALISE`, `EM_ANDAMENTO`) da
  origem consultada (`APP` ou `SIMULADA`), criadas nos **últimos 30 dias**, por subprefeitura.
- **Índice da região** = Σ (pontuação de prioridade da ocorrência + mín(confirmações, 5)).
  Mais relatos (ocorrências e confirmações) e maior gravidade aumentam o índice; o teto de
  5 confirmações por ocorrência evita que um único caso domine a região.
- **Níveis**:

| Nível | Condição |
|---|---|
| `NORMAL` | índice < 45 |
| `ATENCAO` | índice ≥ 45 |
| `ALERTA` | índice ≥ 90 **e** pelo menos 3 abertas de prioridade ALTA |

- **Calibração** (13/11/2026): com os dados de exemplo (semente 2026, 1.200 ocorrências em
  120 dias), o índice da região típica (mediana) é 27. Atenção ≈ 1,7 vez a típica; Alerta
  > 3 vezes a típica, com casos graves. Resultado no Exemplo: **3 regiões em Alerta** (Sé,
  Mooca, Freguesia/Brasilândia) e **7 em Atenção**. O teste `test_calibracao_do_exemplo`
  trava essa distribuição; os testes da regra usam as constantes (`app/services/alertas.py`).
- Com poucos registros reais, todas as regiões ficam `NORMAL` — o esperado.

## 8. Dados fictícios de demonstração (modo Exemplo)

Servem para **testar e demonstrar** o app com volume. Nunca se misturam com os reais.

- Gravados com `origem = SIMULADA`; todas as consultas usam `APP` por padrão.
- Gerados por `backend/scripts/dados_ficticios.py gerar`: função pura e reproduzível
  (semente 2026), cerca de **1.200 ocorrências nos últimos 120 dias**:
  - 40% perto de 6 focos (Sé, Mooca, Itaquera, Capela do Socorro, Campo Limpo,
    Freguesia/Brasilândia) e 60% espalhadas por todas as 32 subprefeituras, sempre dentro
    dos polígonos oficiais;
  - prioridade calculada pela regra da seção 1;
  - histórico plausível, só com transições permitidas: quanto mais antiga, maior a chance
    de estar resolvida (75% acima de 60 dias, 5% abaixo de 7 dias);
  - confirmações de 40 identificações fictícias ("Pessoa fictícia 001"…), com UUIDs fixos;
  - endereço "Endereço fictício · \<região\>", descrição terminada em "(dado fictício)" e
    comentários "Equipe responsável (fictício): …"; sem foto.
- **Voltar ao real**: no app, o seletor "Ao vivo" (o app sempre abre nele); no banco,
  `python scripts/dados_ficticios.py remover`, que apaga **somente** as ocorrências
  `SIMULADA` e as identificações fictícias. `gerar` recusa rodar de novo sem `--recriar`.
- No app, todo dado fictício aparece com a faixa "DADOS FICTÍCIOS de demonstração" (Mapa,
  Análises, folha da região, detalhe) e o compartilhamento começa com "[DADO FICTÍCIO]".

## 9. Indicadores da aba Análises (`GET /estatisticas/resumo`)

- **% resolvidas** = resolvidas ÷ total do período × 100.
- **Tempo médio até resolver** = média, entre as resolvidas do período, de (data da
  transição para `RESOLVIDA` − data do registro), em dias.
- **Evolução semanal**: semanas de segunda a domingo no horário de São Paulo;
  "registradas" pela data do registro e "resolvidas" pela data da resolução.
- **Ranking**: as 5 subprefeituras com mais ocorrências no período.
- Ao vivo usa todos os registros reais; Exemplo usa todos os fictícios.

## 10. "Ainda não foi resolvido? Avise"

A pessoa discorda de uma resolução: o problema continua no local.

- Só em ocorrências **`RESOLVIDA`** e reais (`APP`). Em outro status, a API responde
  `409 OCORRENCIA_NAO_RESOLVIDA`; em dado fictício, `409 OCORRENCIA_SIMULADA`.
- Um aviso por identificação e ocorrência (restrição `UNIQUE`); repetir não duplica e o
  aviso pode ser desfeito.
- Quem registrou também pode avisar — geralmente é quem passa pelo local.
- **Não reabre** a ocorrência: `RESOLVIDA` continua sendo status final, e status e
  prioridade não mudam. O aviso conta e aparece no detalhe ("N pessoas avisaram que ainda
  não foi resolvido") para a equipe responsável decidir o que fazer.
- Tabela `avisos_nao_resolvido` (migração `0004`).

