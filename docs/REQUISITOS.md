# Rastreabilidade de requisitos — Bridge

Requisito → implementação → verificação → evidência → situação.

Fontes: **PDF** = "GS CitizenTech - 3ES Ago - FIAP 2026" (página indicada);
**Equipe** = requisito interno da equipe (não exigido pelo professor).

Situações usadas: `Implementado, não verificado` · `Verificado automaticamente` ·
`Verificado manualmente` · `Pendente` · `Bloqueado`.

Evidências em `docs/evidencias/` (prefixo com a data: `2026-11-11_`, `2026-11-12_`,
`2026-11-13_`; índice em `evidencias/README.md`).

_Última atualização: 13/11/2026 (Bridge 2.0, fase 1)._

## A. SOA e Web Services (PDF p. 27)

| ID | Requisito | Implementação | Verificação | Evidência | Situação |
|---|---|---|---|---|---|
| S1 | Estruturação do domínio (3,0) | `backend/app/models.py`, `enums.py`, `schemas.py`, `services/` (prioridade, transições, casos de uso) | pytest unitário + integração com PostgreSQL (entidades gravadas e lidas) | `pytest-backend-com-banco.txt` | **Verificado automaticamente** |
| S2 | Conexão real com banco (3,0) | `app/database.py` (SQLAlchemy + psycopg, PostgreSQL), `DATABASE_URL` no `.env` | PostgreSQL 18.4 local: suíte completa (95 testes em 11/11; 128 em 13/11), fluxo HTTP completo, reinício da API e do banco; 503 com banco fora | `pytest-backend-com-banco.txt`, `pytest-backend-fase1.txt` (13/11), `verificacao-api-com-banco.txt`, `verificacao-api-fase1.txt`, `verificacao-http-sem-banco.txt` | **Verificado automaticamente** |
| S3 | Migrações (2,5) | `alembic/versions/0001`, `0002` (inclui migração de dados), `0003` (endereço, região, origem, confirmações) | Banco vazio: `upgrade head`, `current`, `check` (sem diferenças), `downgrade -1`, `base` → `head`; migração de dados da 0002 com registro sintético; 0003: `upgrade`, `check`, `downgrade -1` e reaplicação; banco de desenvolvimento só atualizado, sem perda | `alembic-banco-vazio.txt`, `alembic-sql-offline.sql`, `alembic-0003.txt` | **Verificado automaticamente** |
| S4 | Testes manuais com Insomnia (1,5) | `docs/insomnia/bridge-insomnia.json` (54 req.: 33 da Rodada 1 + 21 da Rodada 2) + roteiro | Rodada 1: 33 requisições executadas manualmente em 12/11/2026, todas com o resultado esperado. Rodada 2 (rotas do Bridge 2.0): não executada | `evidencias/insomnia/` (35 prints da Rodada 1) | **Verificado manualmente** (Rodada 1); Rodada 2: **Pendente** |
| S5 | API REST | `app/routes/` — 15 operações | HTTP real com a API e o PostgreSQL rodando: 25/25 verificações (11/11); fluxo 1.0 + 2.0 com 52 verificações + persistência (13/11, API de verificação ligada ao banco de testes) | `verificacao-api-com-banco.txt`, `verificacao-api-fase1.txt`, `verificacao-http-sem-banco.txt` | **Verificado automaticamente** |
| S6 | README com descrição, instruções e integrantes | `README.md` | Revisão | — | **Pendente**: nomes/RMs, cidade e link com `[PREENCHER]` |
| S7 | Evidências da aplicação | `docs/evidencias/` | — | 14 arquivos automáticos + 35 prints manuais | **Implementado** (índice em `evidencias/README.md`) |
| S8 | Entrega por link do GitHub | Repositório local iniciado (sem commit) | — | — | **Pendente** (criar repositório e push: ação da equipe) |

## B. Mobile Development & IOT (PDF p. 31)

| ID | Requisito | Implementação | Verificação | Evidência | Situação |
|---|---|---|---|---|---|
| M1 | React Native + Expo no Expo Go, sem WebView | Expo SDK 58, `mobile/` | Bundle iOS gerado; expo-doctor 20/20; 1.0 aberto num iPhone pelo Expo Go (12/11) | `verificacao-mobile-fase1.txt` | **Verificado automaticamente** (build 2.0) e **manualmente** (1.0 no iPhone, 12/11); 2.0 no aparelho: **Pendente** |
| M2 | ≥ 3 telas com navegação | Abas Início, Mapa, Andamento e Perfil; Registrar (modal), Detalhe, Região (folha), Identificação | Bundle gerado; tsc | `verificacao-mobile-fase1.txt` | Implementado e compilado; no aparelho (2.0): Pendente |
| M3 | Lista com carregando, erro e vazio | `src/app/(tabs)/andamento.tsx` (antes: lista do 1.0) | Estados como uniões discriminadas (tsc) | `verificacao-mobile-fase1.txt` | Implementado; lista do 1.0 vista no iPhone (12/11); Andamento no aparelho: Pendente |
| M4 | Formulário validado que cria item | `app/registrar.tsx` (etapas) + `registro/fluxo.ts` + `validation/ocorrencia.ts` | 63 testes puros (validação, redutor das etapas, região da etapa Local); cadastro com foto feito no iPhone com o 1.0 (logs da API, 12/11) | `verificacao-mobile-fase1.txt` | Validação **verificada automaticamente**; registro em etapas no aparelho: Pendente |
| M5 | Identificação lembrada ao reabrir | `context/IdentificacaoContext.tsx`, `Stack.Protected` em `app/_layout.tsx` | — | — | Implementado; no aparelho (2.0): Pendente |
| M6 | TS estrito, sem `any`, `tsc --noEmit` limpo | `tsconfig.json` (strict + extras) | tsc; busca por `any` e `@ts-ignore` = 0 | `verificacao-mobile-fase1.txt` | **Verificado automaticamente** |
| M7 | Tipos nos modelos, rotas e respostas | `src/models/`, `src/geo/tipos.ts`, `validation/rotas.ts`, `validation/respostas.ts`, `validation/regioes.ts` | tsc + testes dos parsers | `verificacao-mobile-fase1.txt` | **Verificado automaticamente** |
| M8 | Recurso nativo com permissão tratada | `services/localizacao.ts` (GPS, pedido em contexto), `services/geocodificacao.ts` (endereço do aparelho), `services/camera.ts`, mapa (`react-native-maps`) | `regiaoInicial` testada (sem permissão → centro de SP) | `verificacao-mobile-fase1.txt` | Implementado e testado nas partes puras; câmera e GPS do 1.0 usados no iPhone (12/11); 2.0 no aparelho: Pendente |
| M9 | Camada `services/` e validação pura | `src/services/`, `src/validation/`, `src/geo/`, `src/registro/`, `src/acompanhamento/` | 63 testes puros com `node --test` | `verificacao-mobile-fase1.txt` | **Verificado automaticamente** |
| M10 | README.md (Ficha e como rodar) | `mobile/README.md` | — | — | **Pendente**: `[PREENCHER]` (cidade, link, integrantes) |
| M11 | DECISOES.md (1–2 páginas) | `mobile/DECISOES.md` (atualizado para o Bridge 2.0, 949 palavras) | Revisão | — | Implementado |
| M12 | `authors` (nome e RM de todos) | `mobile/package.json` | Script do ZIP recusa marcadores | — | **Pendente — bloqueante** (marcadores `PREENCHER`) |
| M13 | ZIP sem `node_modules` | `scripts/gerar_zip_mobile.py` | ZIP de teste do 2.0 (98 arquivos) gerado, extraído fora do OneDrive e sem o backend ao lado, instalado do zero: `npm ci`, tsc limpo, 63/63 testes, lint limpo (13/11, código final) | `zip-mobile-teste.txt` | **Verificado automaticamente** (ZIP de teste); ZIP final: Pendente (após `authors`) |
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
| N3 | Endereço pelo aparelho e região pelo servidor | `geocodificacao.ts` + `montarEndereco`; `criar_ocorrencia` | pytest (Sé, fora de SP, 201 caracteres) + testes puros | API **verificada automaticamente**; geocodificação no iPhone: Pendente |
| N4 | Mapa real com localização real, pontos agrupados, densidade, busca e filtros | `(tabs)/mapa.tsx`, `geo/` | Testes puros (agrupamento ≤ 64, densidade, enquadramento, estado ao vivo) + bundle | Implementado; no iPhone: **Pendente** |
| N5 | Duplicatas: parecidas a até 100 m | `GET /ocorrencias/proximas`; etapa "Parecidos" | pytest (raio, categoria, status, origem) + redutor testado | API **verificada automaticamente**; no iPhone: Pendente |
| N6 | "Eu também vi" (confirmação) sem mudar a prioridade | `services/confirmacoes.py`; detalhe e registro no app | pytest (ciclo, regras 404/409/422, prioridade igual) + `verificar_api.py` | API **verificada automaticamente**; no iPhone: Pendente |
| N7 | Follow-up: Andamento, linha do tempo e selo "Atualizada" | `GET /ocorrencias/minhas`; `(tabs)/andamento.tsx`, `LinhaDoTempo` | pytest (ordem por atualização) + testes puros (`estaAtualizada`, etapas) | API **verificada automaticamente**; no iPhone: Pendente |
| N8 | Densidade por região | `GET /estatisticas/regioes`; camada Densidade e folha da região | pytest (contagens, densidade, dias, origem) | API **verificada automaticamente**; no iPhone: Pendente |
| N9 | UUID da identificação fora das URLs | cabeçalho `X-Identificacao-Id` em "minhas", confirmação e detalhe | `test_uuid_da_identificacao_nao_vai_na_url` | **Verificado automaticamente** |
| N10 | Testes manuais das rotas novas (Insomnia, Rodada 2) | Coleção com 54 requisições (pastas 09 a 12) + roteiro | Coleção conferida contra o OpenAPI (54/54) | **Pendente** (execução e prints pela equipe) |
| N11 | Alertas por região, dados fictícios, Análises (fase 2); Perfil completo e acabamento (fase 3) | — | — | **A fazer** |
