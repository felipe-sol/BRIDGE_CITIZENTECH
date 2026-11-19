# Bridge — zeladoria colaborativa de calçadas e vias

> **FIAP · Global Solution 2026.2 · CitizenTech · Engenharia de Software (3º ano)**
> Este README é a entrega da disciplina **Arquitetura Orientada a Serviços (SOA) e Web Services**.
> O app mobile tem entrega própria: [`mobile/README.md`](mobile/README.md). Descrição completa
> do app: [`descricaoapp.md`](descricaoapp.md).

O Bridge é uma plataforma para o cidadão **registrar problemas de infraestrutura
urbana** (calçada danificada, buraco, iluminação defeituosa, obstáculo à circulação),
que a API **valida, classifica e prioriza** por regras transparentes e **acompanha**
por um histórico de status.

Projeto acadêmico: **não há integração oficial com prefeitura** ou órgão público.

---

## Ficha da CitizenTech

| Campo | Conteúdo |
|---|---|
| Nome da CitizenTech | Bridge |
| Cidade e bairro | São Paulo (SP) — bairro: Santo Amaro |
| Cidadão beneficiado | Pedestres que dependem da calçada — em especial pessoas com deficiência ou mobilidade reduzida, idosos e quem anda com carrinho de bebê — e moradores que querem acompanhar a zeladoria do bairro |
| Problema, em uma frase | Calçadas quebradas, buracos, postes apagados e obstáculos colocam pedestres em risco, e o cidadão não tem um jeito simples de registrar o problema e acompanhar o que foi feito |
| Como funciona | O cidadão registra pelo app (categoria, descrição, foto, localização GPS e situação no local); a API valida, calcula a prioridade por regras documentadas, grava no PostgreSQL e mantém o histórico de cada mudança de status; um operador atualiza o andamento |
| O que cada parte faz | **SOA:** backend REST, domínio, banco, migrações (este repositório, `backend/`) · **Mobile:** app React Native/Expo (`mobile/`) · **IA & ML:** classificador textual de categoria (`ia_ml/`), integrado ao contrato do backend (`docs/CONTRATO_IA.md`) · as demais disciplinas da GS têm entregas próprias |
| Link do repositório | https://github.com/felipe-sol/BRIDGE_CITIZENTECH |
| Indicador de impacto (proposto, **não medido**) | Tempo entre registro e resolução (calculável pelo `historico_status`); nº de ocorrências registradas × resolvidas; % das ocorrências de prioridade alta resolvidas em até N dias |
| ODS conectados | 11, 9 e 10 (ver abaixo) |

### ODS e contribuição

- **ODS 11 — Cidades e comunidades sustentáveis (meta 11.7):** facilita apontar e
  acompanhar problemas que tornam o espaço público inseguro ou inacessível, com
  destaque para quem é mais afetado (fator "afeta acessibilidade" na prioridade).
- **ODS 9 — Indústria, inovação e infraestrutura (meta 9.1):** organiza a demanda de
  manutenção de infraestrutura urbana com dados estruturados e priorização explícita.
- **ODS 10 — Redução das desigualdades (meta 10.2):** dá peso explícito a barreiras
  para pessoas com deficiência, idosos e pessoas com mobilidade reduzida.

## Integrantes

| Nome completo | RM |
|---|---|
| Leonardo Luiz Jardim Queijo | 559842 |
| Kauã Rodrigues de Souza | 559335 |
| Felipe Santos Marceli | 560456 |
| Enzo Galhardo | 561001 |
| Kauan Diogo | 560727 |

Neste repositório: backend (SOA) e app (Mobile) por Felipe Santos Marceli; modelo de IA
(`ia_ml/`) por Leonardo Luiz Jardim Queijo (PR #1).

---

## Tecnologias

| Camada | Tecnologia (versão testada) |
|---|---|
| Linguagem | Python 3.14.3; também verificado com 3.11 (requer ≥ 3.11) |
| API REST | FastAPI 0.162.4 + Uvicorn 0.54.0 |
| Validação/contrato | Pydantic 2.14 (schemas) · OpenAPI gerado em `/docs` |
| ORM | SQLAlchemy 2.1.8 (consultas parametrizadas, sem SQL concatenado) |
| Migrações | Alembic 1.20.1 |
| Banco | PostgreSQL (driver psycopg 3.3.8) |
| Imagens | Pillow 13.0.0 (validação de conteúdo e remoção de EXIF) |
| IA (`ia_ml/`) | scikit-learn 1.8.0 (TF-IDF + regressão logística), joblib 1.5.3, numpy 2.3.5 |
| Testes | pytest 9.2.0 + TestClient (httpx2) · Insomnia (manuais) |

Dependências fixadas em [`backend/requirements.txt`](backend/requirements.txt) e
[`backend/requirements-dev.txt`](backend/requirements-dev.txt).

## Estrutura

```
bridge/
├── README.md                  # este arquivo (entrega de SOA)
├── descricaoapp.md            # descrição completa do app
├── prompts.md                 # registro do uso de IA no desenvolvimento
├── docker-compose.yml         # PostgreSQL opcional via Docker
├── backend/                   # API REST (entrega de SOA)
│   ├── app/
│   │   ├── main.py            # criação da API, middlewares, handlers de erro
│   │   ├── config.py          # configuração via .env (pydantic-settings)
│   │   ├── database.py        # engine e sessão do SQLAlchemy
│   │   ├── models.py          # entidades do domínio (ORM)
│   │   ├── enums.py           # valores controlados
│   │   ├── schemas.py         # contrato de entrada/saída (Pydantic)
│   │   ├── errors.py          # formato único de erro
│   │   ├── deps.py            # dependências (sessão, token admin, IA)
│   │   ├── routes/            # health, identificacoes, ocorrencias, regioes, estatisticas, ia
│   │   ├── services/          # regras e casos de uso
│   │   │   ├── prioridade.py, transicoes.py           # pontuação e transições de status
│   │   │   ├── ocorrencias.py, identificacoes.py, confirmacoes.py, avisos.py
│   │   │   ├── regioes.py, geo.py, alertas.py, estatisticas.py
│   │   │   ├── armazenamento.py                       # upload seguro de fotos
│   │   │   ├── ficticios.py                           # dados fictícios do modo Exemplo
│   │   │   └── ia/                                    # contrato do modelo de IA + adaptador
│   │   └── dados/             # limites das 32 subprefeituras (GeoSampa) e a fonte
│   ├── alembic/versions/      # 0001 a 0004 (migrações reais)
│   ├── tests/                 # pytest (unitários + integração com PostgreSQL)
│   ├── scripts/               # criar_banco.sql, verificar_api.py, dados_ficticios.py, analisar_ia.py
│   └── .env.example
├── ia_ml/                     # modelo de IA (IA & ML): notebook, dataset sintético, artefato treinado
├── mobile/                    # app React Native + Expo (entrega de Mobile)
└── docs/                      # contratos, regras de negócio, Insomnia e evidências
```

## Organização e boas práticas

- **Uma pasta por parte da solução:** `backend/` (SOA), `mobile/` (Mobile), `ia_ml/` (IA & ML) e
  `docs/` (contratos, regras, testes manuais e evidências). Cada parte tem o próprio README.
- **Camadas no backend:** `routes/` só recebe e responde; `schemas.py` valida a entrada
  (`extra="forbid"`); `services/` concentra as regras; `models.py` e o Alembic cuidam do banco.
  Uma rota nova segue esse caminho e entra com teste.
- **Banco só por migração:** o esquema muda apenas pelo Alembic (nunca `create_all`), e cada
  migração é testada em banco vazio, com ida e volta.
- **Testes antes do código:** cada regra nova começa por um teste que falha. São 174 testes no
  backend (pytest com PostgreSQL real) e 138 no app (funções puras). As evidências trazem a
  saída real dos comandos, com data, em [`docs/evidencias/`](docs/evidencias/README.md).
- **Tipos:** TypeScript estrito no app, sem `any` nem `@ts-ignore`; as respostas da API são
  validadas antes do uso.
- **Segurança e dados:** segredos só no `.env` (fora do Git) e `.env.example` com valores
  demonstrativos; nenhum dado pessoal real; logs sem textos do cidadão nem imagens; fotos sem EXIF.
- **Nomes e idioma:** código, mensagens e documentação em português, com os nomes do domínio
  (`ocorrencia`, `confirmacao`, `prioridade`).
- **Histórico:** commits pequenos no formato `Área: o que mudou`; contribuições de outro
  integrante entram por pull request revisado (o modelo de IA entrou pelo PR #1).

## Domínio

```
Identificacao 1 ──── N Ocorrencia 1 ──── N HistoricoStatus
(pseudônimo)          (problema urbano)     (trilha de mudanças)

Identificacao N ──── N Ocorrencia, por meio de:
  Confirmacao          ("eu também vi": no máximo uma por pessoa e ocorrência)
  AvisoNaoResolvido    ("ainda não foi resolvido": no máximo um por pessoa e ocorrência)
```

- **Identificacao** — `id` (UUID gerado pelo servidor), `apelido`, `criado_em`.
  É um pseudônimo guardado no aparelho, **não é login nem autenticação**.
- **Ocorrencia** — título, descrição, categoria informada, latitude/longitude
  (`NUMERIC(9,6)`), endereço sugerido pelo aparelho, subprefeitura (calculada pelo servidor),
  origem (`APP` real ou `SIMULADA` fictícia), três fatores informados pelo cidadão, status,
  prioridade (pontuação + justificativa), referência da imagem (nome gerado pelo servidor),
  resultado da IA (status, categoria sugerida, confiança, versão do modelo) e datas.
- **HistoricoStatus** — status anterior, novo, observação e data de cada mudança.
- **Confirmacao** e **AvisoNaoResolvido** — ligação entre uma identificação e uma ocorrência,
  com `UNIQUE (ocorrencia_id, identificacao_id)`: repetir não duplica.

Valores controlados (enums + `CHECK` no banco): categoria, status, prioridade e
status da análise de IA. Regras de prioridade e transições de status:
[`docs/REGRAS_DE_NEGOCIO.md`](docs/REGRAS_DE_NEGOCIO.md).

---

## Como rodar (resumo)

Ordem para subir tudo do zero (Windows PowerShell). Cada passo tem detalhes nas seções abaixo.

1. **PostgreSQL ligado** e, só na primeira vez, usuário e bancos criados: ver
   [Banco de dados](#banco-de-dados).
2. **API**, na pasta `backend/`:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
   Copy-Item .env.example .env          # os valores padrão já servem para o banco local
   .\.venv\Scripts\alembic.exe upgrade head
   .\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000
   ```

   Confira em <http://localhost:8000/health> (deve mostrar `"status": "ok"`) e na
   documentação interativa em <http://localhost:8000/docs>. As rotas administrativas só
   funcionam com `ADMIN_TOKEN` definido no `.env`. O `.env.example` já liga o modelo de IA
   (`ia_ml/`): o `/health` deve mostrar `"modelo_ia": {"disponivel": true, ...}`.
3. **Dados fictícios** (opcional, para o modo Exemplo do app), na pasta `backend/`:
   `.\.venv\Scripts\python.exe scripts\dados_ficticios.py gerar`. Ver
   [Dados fictícios](#dados-fictícios-de-demonstração-modo-exemplo).
4. **App**, em outro terminal, na pasta `mobile/`:

   ```powershell
   npm ci
   Copy-Item .env.example .env          # edite: EXPO_PUBLIC_API_URL=http://<IP-do-computador>:8000
   npx expo start -c                    # se o PowerShell bloquear o npx, use npx.cmd
   ```

   Com o celular na mesma Wi-Fi, abra o **Expo Go** (compatível com o SDK 58) e leia o QR
   Code ou digite `exp://<IP-do-computador>:8081`. Ver
   [Acesso pelo celular](#acesso-pelo-celular-app-mobile) e o
   [README do app](mobile/README.md#instalação-e-execução).

## Instalação

Pré-requisitos: Python ≥ 3.11 e um PostgreSQL acessível (ver próxima seção).
Comandos para **Windows PowerShell**; no macOS/Linux troque `.\.venv\Scripts\` por `.venv/bin/`.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.example .env      # depois edite o .env
```

## Banco de dados

Escolha **uma** forma de ter um PostgreSQL local:

- **Instalador oficial** (Windows): <https://www.postgresql.org/download/windows/>.
  Instala como serviço do Windows (liga junto com o PC).
- **Binários portáteis** (Windows, sem instalar e sem admin), forma usada e verificada
  pela equipe com o PostgreSQL 18.4. Baixe o ZIP "binaries" em
  <https://www.enterprisedb.com/download-postgresql-binaries> (arquivo usado:
  `https://get.enterprisedb.com/postgresql/postgresql-18.4-1-windows-x64-binaries.zip`), extraia `pgsql\bin`,
  `pgsql\lib` e `pgsql\share` numa pasta **fora do OneDrive** e, nessa pasta:

  ```powershell
  # uma vez: cria o diretório de dados (pede uma senha para o superusuário postgres)
  .\pgsql\bin\initdb.exe -D .\pgdata -U postgres -W -A scram-sha-256 -E UTF8 --locale=C --locale-provider=builtin --builtin-locale=C.UTF-8
  # sempre que for usar (não liga sozinho com o PC):
  .\pgsql\bin\pg_ctl.exe -D .\pgdata -l .\pgdata.log -w start
  # para desligar:
  .\pgsql\bin\pg_ctl.exe -D .\pgdata -w stop
  ```

  Por padrão ele só aceita conexões do próprio computador (`localhost:5432`).
- **Docker** (opcional): `docker compose up -d` na raiz usa o
  [`docker-compose.yml`](docker-compose.yml) e já cria usuário e bancos.
  _Não verificado neste ambiente (sem Docker)._

Sem Docker, crie usuário e bancos **uma vez**, como superusuário
(com os binários portáteis, use `.\pgsql\bin\psql.exe`):

```powershell
psql -U postgres -h localhost -f scripts/criar_banco.sql
```

Isso cria o usuário `bridge` (senha demonstrativa `bridge_dev`), o banco `bridge`
(API) e o `bridge_test` (testes automatizados, que **apagam** seus dados).
A URL fica em `DATABASE_URL` no `backend/.env` — o `.env` não vai para o Git.

## Migrações (Alembic)

O esquema é criado **somente** pelas migrações; o código não usa `create_all()`.

| Revisão | O que faz |
|---|---|
| `0001` | cria `identificacoes` e `ocorrencias` (PK, FK, `UNIQUE` da chave de idempotência, `CHECK` dos enums e das coordenadas, índices) |
| `0002` | cria `historico_status` e **migra dados**: cada ocorrência já existente ganha um registro inicial com o status atual |
| `0003` | Bridge 2.0: `endereco`, `subprefeitura_codigo` e `origem` (`APP`/`SIMULADA`, com `CHECK`) nas ocorrências; tabela `confirmacoes` (`UNIQUE` por ocorrência e identificação); índices para mapa e estatísticas |
| `0004` | Bridge 2.0, fase 3: tabela `avisos_nao_resolvido` ("ainda não foi resolvido"; `UNIQUE` por ocorrência e identificação) |

Aplicar em um banco vazio e conferir:

```powershell
.\.venv\Scripts\alembic.exe upgrade head      # aplica 0001 a 0004
.\.venv\Scripts\alembic.exe current           # deve mostrar 0004 (head)
.\.venv\Scripts\alembic.exe check             # modelos == banco (sem migração pendente)
.\.venv\Scripts\alembic.exe downgrade -1      # volta para 0003 (teste de reversão)
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe scripts\recalcular_regioes.py   # preenche a região das ocorrências antigas (idempotente)
```

Execução real em banco vazio (PostgreSQL 18.4), com `upgrade`, `check`, `downgrade -1`,
ida e volta completa e a migração de dados da `0002`:
[`docs/evidencias/2026-11-11_alembic-banco-vazio.txt`](docs/evidencias/2026-11-11_alembic-banco-vazio.txt);
migração `0003`: [`docs/evidencias/2026-11-12_alembic-0003.txt`](docs/evidencias/2026-11-12_alembic-0003.txt);
migração `0004`: [`docs/evidencias/2026-11-13_alembic-0004.txt`](docs/evidencias/2026-11-13_alembic-0004.txt).

Ver o SQL sem conectar: `alembic upgrade head --sql`
(saída salva em [`docs/evidencias/2026-11-11_alembic-sql-offline.sql`](docs/evidencias/2026-11-11_alembic-sql-offline.sql)).

Criar uma nova migração depois de alterar `app/models.py`:

```powershell
.\.venv\Scripts\alembic.exe revision --autogenerate -m "descricao da mudanca" --rev-id 0005
# revise o arquivo gerado em alembic/versions/ ANTES de aplicar
.\.venv\Scripts\alembic.exe upgrade head
```

> As migrações foram escritas e revisadas à mão, seguindo os modelos, e verificadas em
> banco vazio com `alembic check` sem diferenças (evidências acima). Os testes de
> integração refazem `downgrade base` → `upgrade head` a cada execução.

## Execução

```powershell
cd backend
.\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000
```

- Documentação interativa: <http://localhost:8000/docs>
- `--host 0.0.0.0` é necessário para o **celular** alcançar a API pela rede Wi-Fi.
  Só use em rede confiável. Para uso só no computador: `--host 127.0.0.1`.

### Acesso pelo celular (app Mobile)

1. Computador e celular na **mesma rede Wi-Fi** (redes com isolamento de clientes,
   comuns em faculdades, bloqueiam isso — use o roteador de casa ou o hotspot do celular).
2. Descubra o IPv4 do computador: `ipconfig` → adaptador Wi-Fi → "Endereço IPv4".
3. No celular, abra no navegador `http://<IP>:8000/health`. Se não abrir, é rede/firewall.
4. **Firewall do Windows:** permita o Python apenas em rede **Privada** quando o aviso
   aparecer, ou crie uma regra só para a porta 8000 (PowerShell como administrador):
   ```powershell
   New-NetFirewallRule -DisplayName "Bridge API (dev) 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Profile Private -Action Allow
   # para remover depois:
   Remove-NetFirewallRule -DisplayName "Bridge API (dev) 8000"
   ```
   Confira se o perfil da rede Wi-Fi é "Privada". **Não desative o firewall.**
   Se houver antivírus com firewall próprio (ex.: McAfee), libere a porta nele do mesmo modo.
5. Configure `mobile/.env` com `EXPO_PUBLIC_API_URL=http://<IP>:8000`.

O túnel do Expo (`--tunnel`) publica só o app, **não** o backend.

## Dados fictícios de demonstração (modo Exemplo)

O app tem um modo **Exemplo** (Mapa e Análises) com cerca de 1.200 ocorrências **fictícias**
dos últimos 120 dias, para testar e demonstrar o painel com volume. Elas ficam no banco com
`origem = SIMULADA`, nunca se misturam com as reais e aparecem sempre com a faixa
"DADOS FICTÍCIOS de demonstração". Regras em
[`docs/REGRAS_DE_NEGOCIO.md`](docs/REGRAS_DE_NEGOCIO.md), seção 8.

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\dados_ficticios.py gerar            # gera (recusa se já existirem)
.\.venv\Scripts\python.exe scripts\dados_ficticios.py gerar --recriar  # apaga os fictícios e gera de novo
.\.venv\Scripts\python.exe scripts\dados_ficticios.py relatorio        # contagens e regiões em alerta
.\.venv\Scripts\python.exe scripts\dados_ficticios.py remover          # volta ao real: apaga SÓ os fictícios
```

No app, o seletor **Ao vivo** volta aos dados reais com um toque, e o app sempre abre no Ao vivo.

Com o modelo de IA ativo, o `gerar` já analisa os fictícios. Para analisar registros feitos antes
de ativar o modelo: `.\.venv\Scripts\python.exe scripts\analisar_ia.py` (só os que estão sem
análise; não muda categoria, prioridade nem a data de atualização).

## Endpoints

Contrato completo, com exemplos e códigos de erro: [`docs/CONTRATO_API.md`](docs/CONTRATO_API.md).

| Método | Rota | Descrição | Sucesso |
|---|---|---|---|
| GET | `/health` | API, banco e status do modelo de IA | 200 (503 se banco fora) |
| POST | `/identificacoes` | Cria a identificação (pseudônimo) | 201 |
| GET | `/identificacoes/atual` | Confere a identificação salva (UUID no cabeçalho `X-Identificacao-Id`) | 200 |
| PATCH | `/identificacoes/atual` | Troca o apelido da própria identificação (cabeçalho) | 200 |
| GET | `/identificacoes/atual/participacao` | O que a pessoa já fez: registradas, confirmadas, resolvidas que acompanha, avisos | 200 |
| GET | `/identificacoes/{id}` | **Obsoleta** (UUID na URL); mantida só pela Rodada 1 do Insomnia | 200 |
| POST | `/ocorrencias` | Registra ocorrência (`Idempotency-Key` opcional) | 201 (200 se a chave já foi usada) |
| GET | `/ocorrencias` | Lista paginada (`pagina`, `tamanho`, `ordenar`, filtros, `bbox` do mapa, busca `q`, `subprefeitura`, `origem`) | 200 |
| GET | `/ocorrencias/minhas` | O que esta identificação registrou ou confirmou (`X-Identificacao-Id`) | 200 |
| GET | `/ocorrencias/proximas` | Ocorrências abertas parecidas a até 100 m (checagem de duplicatas) | 200 |
| GET | `/ocorrencias/mapa` | Pontos de uma área do mapa (`bbox`, `origem`), formato enxuto, até 2000, com `truncado` | 200 |
| GET | `/ocorrencias/{id}` | Detalhe + histórico; com `X-Identificacao-Id`, diz se você registrou/confirmou | 200 |
| PATCH | `/ocorrencias/{id}/status` | **Administrativa** (`X-Admin-Token`) — muda status | 200 |
| POST | `/ocorrencias/{id}/imagem` | Upload multipart da foto (`X-Identificacao-Id`) | 200 |
| GET | `/ocorrencias/{id}/imagem` | Baixa a foto | 200 |
| POST | `/ocorrencias/{id}/confirmacoes` | "Eu também vi" (`X-Identificacao-Id`; idempotente) | 201 (200 se já confirmada) |
| DELETE | `/ocorrencias/{id}/confirmacoes` | Desfaz a confirmação | 200 |
| GET | `/regioes` | Limites oficiais das 32 subprefeituras (GeoJSON, fonte GeoSampa) | 200 |
| GET | `/estatisticas/regioes` | Ocorrências por subprefeitura, densidade por km² e **Alerta Bridge** (30 dias) | 200 |
| GET | `/estatisticas/resumo` | Indicadores da aba Análises: totais, % resolvidas, tempo médio, categorias, semanas, ranking | 200 |
| POST | `/ocorrencias/{id}/nao-resolvido` | "Ainda não foi resolvido? Avise" — só em RESOLVIDA; não reabre (`X-Identificacao-Id`) | 201 (200 se já avisado) |
| DELETE | `/ocorrencias/{id}/nao-resolvido` | Desfaz o aviso | 200 |
| POST | `/ia/sugestao-categoria` | Sugestão da IA durante o registro, antes de enviar (só sugere; não grava nada) | 200 (`disponivel: false` sem modelo) |

Todos os erros seguem `{"erro": {"codigo", "mensagem", "detalhes": [{"campo", "mensagem"}]}}`
com mensagens em português.

## Segurança básica aplicada

- **SQL:** só ORM/consultas parametrizadas; nenhuma entrada concatenada em SQL.
- **Upload:** formato verificado pelo **conteúdo** (Pillow), não pela extensão ou MIME;
  só JPEG/PNG; limite de tamanho (`MAX_UPLOAD_MB`, recusa cedo pelo `Content-Length`
  e de novo na leitura); proteção contra "decompression bomb"; nome gerado no servidor
  (UUID) e validado por regex antes de virar caminho — **sem path traversal**;
  reencode que **remove EXIF** (GPS, aparelho); pasta fora do Git (`backend/var/`).
- **Operação administrativa:** `PATCH /status` exige `X-Admin-Token` (comparação em
  tempo constante). Sem `ADMIN_TOKEN` no `.env`, a rota fica **desabilitada** (403).
  O token **não** existe no app. Proteção simples para ambiente local de demonstração.
- **Dados pessoais:** respostas públicas não expõem o autor; o app orienta usar apelido.
- **Segredos:** só no `.env` (ignorado pelo Git); `.env.example` com valores demonstrativos.
- **CORS:** desligado por padrão (o app nativo não precisa). Se houver cliente web,
  liste as origens em `CORS_ORIGINS`. CORS **não** é autenticação.
- **Logs:** sem corpo de requisição nem conteúdo de imagem.

## Testes

### Automatizados (pytest)

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -v
```

- **Unitários (sem banco):** prioridade, matriz de transições, validação de imagem/EXIF/
  path traversal, schemas e formato de erros.
- **Integração (`tests/test_api.py`):** usam o banco `bridge_test` (o nome **precisa**
  terminar em `_test`); a cada execução fazem `downgrade base` + `upgrade head` com o
  Alembic e cobrem cadastro, validações, coordenadas, listagem vazia/preenchida,
  paginação, detalhe 404, status/histórico, token admin, upload válido/inválido e
  idempotência. Sem PostgreSQL, eles aparecem como **SKIPPED** com o motivo.

- **Bridge 2.0 (`test_geo.py`, `test_regioes.py`, `test_migracoes.py`, `test_api_regioes.py`,
  `test_api_confirmacoes.py`):** geometria, regiões oficiais com pontos conhecidos (Sé, Ibirapuera,
  fora de SP), migração 0003 e `alembic check`, endereço/região, filtros, densidade,
  proximidade, confirmações e a lista "minhas".
- **Fase 2 (`test_alertas.py`, `test_api_resumo.py`, `test_ficticios.py` e acréscimos):**
  regra do alerta nas bordas e calibração, resumo (semanas no horário de São Paulo),
  pontos do mapa com corte, identificação pelo cabeçalho e dados fictícios (gerar e
  remover sem tocar nos reais).
- **Fase 3 (`test_api_avisos.py`, `test_api_identificacao.py` e acréscimos):** migração 0004
  com ida e volta, "ainda não foi resolvido" (regras, idempotência, não reabre), trocar
  apelido, participação e remoção de fictícios à prova de uso indevido.
- **IA (`test_ia_classificador_texto.py`):** o modelo entregue sugere a categoria pelo texto;
  o cadastro pela API grava a sugestão sem mudar a categoria escolhida nem a prioridade;
  modelo ausente ou corrompido não derruba a API; análise em lote dos registros antigos
  (`test_ia_lote.py`, sem mexer na data de atualização) e a rota de sugestão no registro
  (`test_api_ia.py`: com e sem modelo, validações, falha do modelo sem erro 500) e o título
  automático (nome da categoria) fora da análise.

Última execução: **174 passaram, 0 pulados**, em
[`docs/evidencias/2026-11-17_melhorias-ia.txt`](docs/evidencias/2026-11-17_melhorias-ia.txt)
(integração da IA: 163, em `2026-11-17_integracao-ia.txt`; fim da fase 3: 159, em `2026-11-13_pytest-backend-fase3.txt`; versão 1.0: 95, em
`2026-11-11_pytest-backend-com-banco.txt`).

Verificação ponta a ponta contra a API rodando (complementar):
`python scripts/verificar_api.py --base-url http://localhost:8000 --admin-token <token>`.
Resultado com as fases 1 a 3 (79 verificações, conferindo também o conteúdo, e
persistência após reiniciar a API):
[`docs/evidencias/2026-11-13_verificacao-api-fase3.txt`](docs/evidencias/2026-11-13_verificacao-api-fase3.txt);
repetida com o modelo de IA ativo em 17/11 (79 OK, análise `CONCLUIDA`) em
[`docs/evidencias/2026-11-17_integracao-ia.txt`](docs/evidencias/2026-11-17_integracao-ia.txt).

### Manuais (Insomnia) — exigência da disciplina

- Coleção importável: [`docs/insomnia/bridge-insomnia.json`](docs/insomnia/bridge-insomnia.json)
  (75 requisições: Rodada 1 com 33 e Rodada 2, do Bridge 2.0, com 42; ambiente com
  `base_url`, `admin_token` e IDs)
- Ordem, resultados esperados e checklist de prints:
  [`docs/insomnia/ROTEIRO_TESTES_MANUAIS.md`](docs/insomnia/ROTEIRO_TESTES_MANUAIS.md)
- **Rodada 1 executada em 12/11/2026:** as 33 requisições, todas com o resultado esperado.
  Os prints das respostas reais estão em [`docs/evidencias/insomnia/`](docs/evidencias/insomnia/).
  Eles foram feitos antes do Bridge 2.0. Por isso as respostas não mostram os campos novos
  (`endereco`, `subprefeitura`, `confirmacoes`, `origem`), mas o comportamento testado
  não mudou.
- **Rodada 2 executada em 19/11/2026:** as 42 requisições das pastas 09 a 15 (rotas do
  Bridge 2.0 e da IA), todas com o resultado esperado, com os prints em
  [`docs/evidencias/insomnia/`](docs/evidencias/insomnia/). Com as duas rodadas, as 23
  operações da API têm teste manual.

## IA: situação real e limitações

- O classificador textual está implementado em `ia_ml/` e integrado ao contrato do
  backend em `backend/app/services/ia/`.
- A previsão usa somente `titulo` e `descricao` e sugere uma das cinco categorias oficiais.
  A categoria selecionada pelo cidadão é preservada e não é usada como atributo do modelo.
- A tela de detalhe do app apresenta a sugestão e o score retornados pela API quando a
  análise está concluída.
- **Ativação:** `MODELO_IA_CAMINHO` e `MODELO_IA_VERSAO` no `backend/.env` (o `.env.example` já
  aponta para `ia_ml/artifacts/`). Se o arquivo faltar ou estiver corrompido, a API sobe do
  mesmo jeito e as análises ficam `INDISPONIVEL`; se a inferência falhar, a ocorrência é
  salva com a análise `FALHOU`.
- **No registro:** na revisão, antes de enviar, o app pergunta à IA (`POST /ia/sugestao-categoria`).
  Se ela discordar da categoria escolhida, o app avisa e oferece trocar com um toque (e verifica
  de novo os parecidos com a categoria nova). Abaixo de 50% de confiança o aviso aparece como
  palpite; abaixo de 30% não aparece.
- **Só o que a pessoa escreveu vai para a IA:** o título que o app preenche sozinho com o nome da
  categoria não entra na análise (senão a IA só repetiria a escolha da pessoa).
- **No mapa:** o cartão da ocorrência mostra a sugestão; abaixo de 50%, marcada como "incerta".
- **Registros antigos:** os feitos antes de ativar o modelo ficam `INDISPONIVEL` até rodar
  `scripts/analisar_ia.py` (`--refazer` refaz também as concluídas); o `dados_ficticios.py gerar`
  já analisa os fictícios.
- O dataset é sintético/simulado (4.000 registros gerados por templates). As métricas
  perfeitas demonstram o funcionamento do pipeline nesse conjunto controlado; não
  comprovam desempenho em relatos reais. Consulte [`ia_ml/README.md`](ia_ml/README.md).
- **Limites conhecidos:** o modelo conhece cerca de 327 palavras e foi treinado com frases de
  modelo, então textos vagos ou muito informais o confundem; e ele **não usa a foto**. Por isso o
  app trata a resposta como sugestão, sempre com a confiança visível.
- A **prioridade não é IA**: continua sendo uma pontuação por regras fixas, documentada
  e testada. Não é avaliação oficial de segurança.

## Evidências

Índice em [`docs/evidencias/README.md`](docs/evidencias/README.md).

## Situação atual (18/11/2026)

| Item | Situação |
|---|---|
| Domínio, API, regras, upload, erros | Implementado e **verificado automaticamente** com PostgreSQL 18.4 local |
| Migrações 0001 a 0004 | **Verificadas** em banco vazio: `upgrade`, `check`, `downgrade` e migração de dados |
| Bridge 2.0, fase 1 (regiões oficiais, endereço, mapa, proximidade, confirmações, "minhas") | Implementado, **verificado automaticamente** e testado no iPhone (13/11) |
| Bridge 2.0, fase 2 (Alerta Bridge, resumo/Análises, pontos do mapa, dados fictícios, identificação pelo cabeçalho) | Implementado, **verificado automaticamente** e testado no iPhone (13/11) |
| Bridge 2.0, fase 3 (Perfil completo, "ainda não foi resolvido", mapa interativo com foto, acabamento, versão 2.0.0) | Implementado e **verificado automaticamente**; cartão do mapa testado no iPhone (13/11 e 17/11); Perfil e "ainda não foi resolvido" no iPhone **pendentes** |
| Testes automatizados (174, com PostgreSQL) | **Passando** |
| Persistência após reinício | **Verificada** automaticamente e no Insomnia (Rodada 1) |
| Testes manuais no Insomnia | Rodada 1 **feita** (33/33 em 12/11/2026); Rodada 2 **pendente** |
| Integração com o modelo de IA | **Implementada e verificada automaticamente** (17/11): classificador textual de `ia_ml/` carregado pelo backend, sugestão gravada no cadastro, oferecida na revisão do registro e mostrada no cartão do mapa; cadastro com a sugestão testado no iPhone (17/11) |
