# Rastreabilidade de requisitos — Bridge

Requisito → implementação → verificação → evidência → situação.

Fontes: **PDF** = "GS CitizenTech - 3ES Ago - FIAP 2026" (página indicada);
**Equipe** = requisito interno da equipe (não exigido pelo professor).

Situações usadas: `Implementado, não verificado` · `Verificado automaticamente` ·
`Verificado manualmente` · `Pendente` · `Bloqueado`.

Evidências em `docs/evidencias/` (prefixo com a data: `2026-11-11_`, `2026-11-12_`,
`2026-11-13_`; índice em `evidencias/README.md`).

_Última atualização: 13/11/2026 (Bridge 2.0, fase 2)._

## A. SOA e Web Services (PDF p. 27)

| ID | Requisito | Implementação | Verificação | Evidência | Situação |
|---|---|---|---|---|---|
| S1 | Estruturação do domínio (3,0) | `backend/app/models.py`, `enums.py`, `schemas.py`, `services/` (prioridade, transições, casos de uso) | pytest unitário + integração com PostgreSQL (entidades gravadas e lidas) | `pytest-backend-com-banco.txt` | **Verificado automaticamente** |
| S2 | Conexão real com banco (3,0) | `app/database.py` (SQLAlchemy + psycopg, PostgreSQL), `DATABASE_URL` no `.env` | PostgreSQL 18.4 local: suíte completa (95 testes em 11/11; 128 ao fim da fase 1; 151 ao fim da fase 2), fluxo HTTP completo, reinício da API e do banco; 503 com banco fora | `pytest-backend-com-banco.txt`, `pytest-backend-fase2.txt`, `verificacao-api-com-banco.txt`, `verificacao-api-fase2.txt`, `verificacao-http-sem-banco.txt` | **Verificado automaticamente** |
| S3 | Migrações (2,5) | `alembic/versions/0001`, `0002` (inclui migração de dados), `0003` (endereço, região, origem, confirmações) | Banco vazio: `upgrade head`, `current`, `check` (sem diferenças), `downgrade -1`, `base` → `head`; migração de dados da 0002 com registro sintético; 0003: `upgrade`, `check`, `downgrade -1` e reaplicação; banco de desenvolvimento só atualizado, sem perda | `alembic-banco-vazio.txt`, `alembic-sql-offline.sql`, `alembic-0003.txt` | **Verificado automaticamente** |
| S4 | Testes manuais com Insomnia (1,5) | `docs/insomnia/bridge-insomnia.json` (64 req.: 33 da Rodada 1 + 31 da Rodada 2) + roteiro | Rodada 1: 33 requisições executadas manualmente em 12/11/2026, todas com o resultado esperado. Rodada 2 (rotas do Bridge 2.0, pastas 09 a 13): não executada | `evidencias/insomnia/` (35 prints da Rodada 1) | **Verificado manualmente** (Rodada 1); Rodada 2: **Pendente** |
| S5 | API REST | `app/routes/` — 18 operações | HTTP real com a API e o PostgreSQL rodando: 25/25 verificações (11/11); fluxo 1.0 + fases 1 e 2 com 67 verificações + persistência (13/11, API de verificação ligada ao banco de testes) | `verificacao-api-com-banco.txt`, `verificacao-api-fase2.txt`, `verificacao-http-sem-banco.txt` | **Verificado automaticamente** |
| S6 | README com descrição, instruções e integrantes | `README.md` | Revisão | — | **Pendente**: nomes/RMs, cidade e link com `[PREENCHER]` |
| S7 | Evidências da aplicação | `docs/evidencias/` | — | 19 arquivos automáticos + 1 resumo de teste manual (iPhone) + 35 prints manuais | **Implementado** (índice em `evidencias/README.md`) |
| S8 | Entrega por link do GitHub | Repositório local iniciado (sem commit) | — | — | **Pendente** (criar repositório e push: ação da equipe) |

## B. Mobile Development & IOT (PDF p. 31)

| ID | Requisito | Implementação | Verificação | Evidência | Situação |
|---|---|---|---|---|---|
| M1 | React Native + Expo no Expo Go, sem WebView | Expo SDK 58, `mobile/` | Bundle iOS gerado; expo-doctor 20/20; 1.0 aberto num iPhone pelo Expo Go (12/11) | `verificacao-mobile-fase1.txt`, `teste-iphone-fase1-logs.txt` | **Verificado automaticamente** (build) e **manualmente** no iPhone: 1.0 em 12/11, 2.0 em 13/11 |
| M2 | ≥ 3 telas com navegação | Abas Início, Mapa, Andamento e Perfil; Registrar (modal), Detalhe, Região (folha), Identificação | Bundle gerado; tsc | `verificacao-mobile-fase1.txt`, `teste-iphone-fase1-logs.txt` | **Verificado manualmente** (iPhone, 13/11: abas, detalhe e registro até a etapa Parecidos) |
| M3 | Lista com carregando, erro e vazio | `src/app/(tabs)/andamento.tsx` (antes: lista do 1.0) | Estados como uniões discriminadas (tsc) | `verificacao-mobile-fase1.txt`, `teste-iphone-fase1-logs.txt` | **Verificado manualmente** (Andamento no iPhone, 13/11); estados de erro/vazio só por tipos |
| M4 | Formulário validado que cria item | `app/registrar.tsx` (etapas) + `registro/fluxo.ts` + `validation/ocorrencia.ts` | 83 testes puros (validação, redutor das etapas, região da etapa Local); cadastro com foto feito no iPhone com o 1.0 (logs da API, 12/11) | `verificacao-mobile-fase1.txt` | Validação **verificada automaticamente**; cadastro no aparelho verificado com o 1.0 (12/11); envio pelo registro em etapas do 2.0: não exercitado no teste de 13/11 |
| M5 | Identificação lembrada ao reabrir | `context/IdentificacaoContext.tsx`, `Stack.Protected` em `app/_layout.tsx` | Identificação salva reaproveitada ao abrir (logs) | `teste-iphone-fase1-logs.txt` | **Verificado manualmente** (iPhone, 13/11) |
| M6 | TS estrito, sem `any`, `tsc --noEmit` limpo | `tsconfig.json` (strict + extras) | tsc; busca por `any` e `@ts-ignore` = 0 | `verificacao-mobile-fase1.txt` | **Verificado automaticamente** |
| M7 | Tipos nos modelos, rotas e respostas | `src/models/`, `src/geo/tipos.ts`, `validation/rotas.ts`, `validation/respostas.ts`, `validation/regioes.ts` | tsc + testes dos parsers | `verificacao-mobile-fase1.txt` | **Verificado automaticamente** |
| M8 | Recurso nativo com permissão tratada | `services/localizacao.ts` (GPS, pedido em contexto), `services/geocodificacao.ts` (endereço do aparelho), `services/camera.ts`, mapa (`react-native-maps`) | `regiaoInicial` testada (sem permissão → centro de SP) | `verificacao-mobile-fase1.txt` | Partes puras testadas; câmera e GPS usados no iPhone (1.0, 12/11); mapa real com localização no iPhone (2.0, 13/11) |
| M9 | Camada `services/` e validação pura | `src/services/`, `src/validation/`, `src/geo/`, `src/registro/`, `src/acompanhamento/` | 83 testes puros com `node --test` | `verificacao-mobile-fase1.txt` | **Verificado automaticamente** |
| M10 | README.md (Ficha e como rodar) | `mobile/README.md` | — | — | **Pendente**: `[PREENCHER]` (cidade, link, integrantes) |
| M11 | DECISOES.md (1–2 páginas) | `mobile/DECISOES.md` (atualizado para a fase 2 do Bridge 2.0, 1.075 palavras ≈ 2 páginas) | Revisão | — | Implementado |
| M12 | `authors` (nome e RM de todos) | `mobile/package.json` | Script do ZIP recusa marcadores | — | **Pendente — bloqueante** (marcadores `PREENCHER`) |
| M13 | ZIP sem `node_modules` | `scripts/gerar_zip_mobile.py` | ZIP de teste da fase 2 (110 arquivos) gerado, extraído fora do OneDrive e sem o backend ao lado, instalado do zero: `npm ci`, tsc limpo, 82/82 testes, lint limpo (13/11) | `zip-mobile-teste-fase2.txt` | **Verificado automaticamente** (ZIP de teste); ZIP final: Pendente (após `authors`) |
| M14 | Vídeo demo ≤ 2 min | `docs/ROTEIRO_VIDEO_MOBILE.md` | — | — | **Pendente** (só o roteiro existe; vídeo não gravado) |

## C. Regras gerais da GS

| ID | Requisito | Implementação | Situação |
|---|---|---|---|
| G1 | ODS conectados e contribuição (PDF p. 14) | README raiz e mobile (ODS 11, 9, 10 com metas) | Implementado |
| G2 | Ficha da CitizenTech no início do README (PDF p. 20) | README raiz e mobile | Implementado com `[PREENCHER]` (cidade, link) |
| G3 | Prompts de IA em `prompts.md` (PDF p. 21) | `prompts.md` | **Pendente**: colar o texto completo do prompt |
| G4 | Sem dados pessoais reais; dados simulados com origem (PDF p. 21) | Imagens de teste geradas por código; dados de teste marcados; app orienta usar apelido | Implementado |

## D. Requisitos internos da equipe

| ID | Requisito | Implementação | Verificação | Situação |
|---|---|---|---|---|
| E1 | Validação de campos e coordenadas | `schemas.py`; `mobile/src/validation/ocorrencia.ts` | pytest (schemas, erros) + HTTP real + `npm test` | **Verificado automaticamente** |
| E2 | Erros consistentes e HTTP adequados | `app/errors.py` | pytest `test_erros.py` + `test_api.py` + HTTP real (401/403/404/409/413/415/422/503) | **Verificado automaticamente** |
| E3 | Paginação e ordenação previsível | `services/ocorrencias.py` (desempate por id) | `test_api.py` (paginação, ordenação, filtros) com PostgreSQL | **Verificado automaticamente** |
| E4 | Histórico de status | `HistoricoStatus`, migração 0002 | `test_api.py` + `verificar_api.py` (ABERTA → EM_ANALISE → EM_ANDAMENTO → RESOLVIDA) | **Verificado automaticamente** |
| E5 | Persistência após reinício | PostgreSQL + uploads em disco | `verificar_api.py --persistencia` após reiniciar API **e** PostgreSQL; foto baixada de novo | **Verificado automaticamente** e **manualmente** (Insomnia 08.1, 12/11/2026) |
| E6 | Upload: conteúdo validado, nome do servidor, sem path traversal, sem EXIF | `services/armazenamento.py` | pytest unitário e de integração; upload/download real sem EXIF; 415 para texto com `.jpg` | **Verificado automaticamente** |
| E7 | Falha parcial de upload sem duplicar | `Idempotency-Key` (API) + reenvio só da foto (app) | `test_api.py` e `verificar_api.py` (mesma chave → 200, sem duplicar) | API **verificada automaticamente**; reenvio pelo app no aparelho: Pendente |
| E8 | Admin protegido, sem segredo no app | `deps.exigir_admin`; app não usa a rota | 401 via HTTP real; busca no bundle: 0 ocorrências de token/URL do banco | **Verificado automaticamente** |
| E9 | Prioridade determinística e documentada | `services/prioridade.py`, `docs/REGRAS_DE_NEGOCIO.md` | pytest (todas as combinações) | **Verificado automaticamente** |
| E10 | IA isolada; sem modelo → indisponível | `services/ia/` | `/health` mostra `disponivel: false` (HTTP real) | **Verificado automaticamente** (sem modelo) |
| E11 | Integração real com o modelo do colega | `docs/CONTRATO_IA.md` | — | **Bloqueado** (modelo não entregue) |
| E12 | Acesso do celular físico à API | README (rede, IP, firewall só em rede privada) | iPhone na mesma Wi-Fi usando a API (logs com o IP do aparelho, 12/11) | **Verificado manualmente** (1.0, 12/11/2026) |

## E. Bridge 2.0 — fase 1 (requisitos internos, design de 12/11/2026)

Design: `docs/superpowers/specs/2026-11-12-bridge-2-design.md` · Plano:
`docs/superpowers/plans/2026-11-12-bridge-2-fase-1.md`.

| ID | Requisito | Implementação | Verificação | Situação |
|---|---|---|---|---|
| N1 | Regiões oficiais (32 subprefeituras) | `backend/app/services/regioes.py`, GeoJSON do GeoSampa simplificado (`app/dados/`, proveniência em `FONTE_REGIOES.md`) | `test_regioes.py` (pontos conhecidos, fora de SP), divergência de 0,06% na simplificação | **Verificado automaticamente** |
| N2 | Migração 0003 (endereço, região, origem, confirmações) | `alembic/versions/0003_...py` | Banco vazio: `upgrade`, `check`, `downgrade`; `test_migracoes.py` | **Verificado automaticamente** |
| N3 | Endereço pelo aparelho e região pelo servidor | `geocodificacao.ts` + `montarEndereco`; `criar_ocorrencia` | pytest (Sé, fora de SP, 201 caracteres) + testes puros | API **verificada automaticamente**; geocodificação no iPhone: sem registro (acontece no aparelho, não passa pela API) |
| N4 | Mapa real com localização real, pontos agrupados, densidade, busca e filtros | `(tabs)/mapa.tsx`, `geo/` | Testes puros (agrupamento ≤ 64, densidade, enquadramento, estado ao vivo) + bundle + iPhone (`teste-iphone-fase1-logs.txt`) | **Verificado automaticamente** e **manualmente** (iPhone, 13/11) |
| N5 | Duplicatas: parecidas a até 100 m | `GET /ocorrencias/proximas`; etapa "Parecidos" | pytest (raio, categoria, status, origem) + redutor testado | API **verificada automaticamente**; etapa Parecidos alcançada no iPhone (13/11) |
| N6 | "Eu também vi" (confirmação) sem mudar a prioridade | `services/confirmacoes.py`; detalhe e registro no app | pytest (ciclo, regras 404/409/422, prioridade igual) + `verificar_api.py` | API **verificada automaticamente**; no iPhone: não exercitado (13/11) |
| N7 | Follow-up: Andamento, linha do tempo e selo "Atualizada" | `GET /ocorrencias/minhas`; `(tabs)/andamento.tsx`, `LinhaDoTempo` | pytest (ordem por atualização) + testes puros (`estaAtualizada`, etapas) + iPhone | **Verificado automaticamente** e **manualmente** (Andamento no iPhone, 13/11) |
| N8 | Densidade por região | `GET /estatisticas/regioes`; camada Densidade e folha da região | pytest (contagens, densidade, dias, origem) + iPhone | **Verificado automaticamente** e **manualmente** (camada Densidade no iPhone, 13/11) |
| N9 | UUID da identificação fora das URLs | cabeçalho `X-Identificacao-Id` em "minhas", confirmação, detalhe e, desde a fase 2, na conferência ao abrir (`GET /identificacoes/atual`); a rota antiga com UUID no caminho ficou só por compatibilidade, marcada como obsoleta | `test_uuid_da_identificacao_nao_vai_na_url`, testes de `/identificacoes/atual` e da rota obsoleta; nenhuma rota do app com UUID no caminho | **Verificado automaticamente** (o achado do teste no iPhone foi corrigido) |
| N10 | Testes manuais das rotas novas (Insomnia, Rodada 2) | Coleção com 64 requisições (pastas 09 a 13) + roteiro | Coleção conferida contra o OpenAPI: 64/64 requisições apontam para operações existentes; as 18 operações estão cobertas | **Pendente** (execução e prints pela equipe) |
| N11 | Alerta Bridge por região (mais relatos e mais gravidade → nível maior), calibrado e nunca apresentado como oficial | `services/alertas.py`; `alerta` em `/estatisticas/regioes`; contorno tracejado no Mapa, folha da região e faixa no Início | `test_alertas.py` (bordas), integração (janela de 30 dias, origem, confirmações limitadas), `test_calibracao_do_exemplo` (3 em Alerta, 7 em Atenção) + testes puros do app (`alertaParaInicio`, motivo) | API **verificada automaticamente**; no iPhone: Pendente |
| N12 | Dados fictícios de 4 meses, separados dos reais, com gerar/remover e volta ao real | `services/ficticios.py`, `scripts/dados_ficticios.py` | `test_ficticios.py` (determinismo, polígonos, histórico válido, remover não toca o real) + geração no banco de desenvolvimento com os números reais idênticos antes e depois | **Verificado automaticamente** (`dados-ficticios-gerados.txt`) |
| N13 | Aba Análises com indicadores e gráficos (Ao vivo e Exemplo) | `GET /estatisticas/resumo`; `(tabs)/analises.tsx`, `components/analises/`, `analises/graficos.ts` | `test_api_resumo.py` (vazio, % e tempo médio, semanas no horário de SP) + testes puros (escalas, resumos em texto, toque) + bundle; paleta das séries validada | API **verificada automaticamente**; no iPhone: Pendente |
| N14 | Modo Exemplo no Mapa e nas Análises, sempre rotulado; o app abre no Ao vivo | `geo/modo.ts`, `SeletorModo`, `FaixaFicticia`; detalhe e compartilhamento rotulados | Testes puros (`interpretarModo`, descarte de resposta de outro modo, compartilhar `[DADO FICTÍCIO]`) + bundle | Implementado; no iPhone: Pendente |
| N15 | Pontos do mapa num formato enxuto, com aviso de corte | `GET /ocorrencias/mapa` (até 2000) | pytest (área, origem, corte com limite reduzido, bbox obrigatório) + `avisoTruncado` | **Verificado automaticamente** |
| N16 | Perfil completo, "Ainda não foi resolvido" e acabamento (fase 3) | — | — | **A fazer** |
