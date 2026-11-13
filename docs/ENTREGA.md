# Checklist de entrega — Bridge

Prazo oficial: **19/11/2026 às 23h55** (Teams / Portal do Aluno; um integrante envia
cada disciplina). Meta interna da equipe: 15/11/2026.

Legenda: ☑ feito e verificado · ☐ pendente · ⚠ bloqueante (sem isso a entrega fica incompleta)

---

## 1. SOA e Web Services — entrega: **link do GitHub**

Enunciado (PDF p. 27): repositório com código completo, README com instruções de
execução, descrição da solução e nomes dos integrantes, evidências da aplicação.
Avaliação: domínio 3,0 · banco 3,0 · migrações 2,5 · testes manuais 1,5.

| | Item | Onde | Situação |
|---|---|---|---|
| ☑ | Código completo do backend (1.0 + Bridge 2.0 fases 1 a 3) | `backend/app/` | 159 testes passando com PostgreSQL 18.4 local (`evidencias/2026-11-13_pytest-backend-fase3.txt`) |
| ☑ | Dependências fixadas | `backend/requirements*.txt` | — |
| ☑ | `.env.example` com valores demonstrativos | `backend/.env.example` | — |
| ☑ | Migrações Alembic reais (0001 a 0004) | `backend/alembic/versions/` | Escritas; SQL offline gerado (0001–0002); 0003 e 0004 verificadas em banco vazio |
| ☑ | **Migrações aplicadas em banco vazio** | `evidencias/2026-11-11_alembic-banco-vazio.txt`, `evidencias/2026-11-12_alembic-0003.txt` | `upgrade`, `check`, `downgrade` e migração de dados verificados; 0003 com ida e volta |
| ☑ | **Testes com banco real** | `evidencias/2026-11-11_pytest-backend-com-banco.txt`, `evidencias/2026-11-13_pytest-backend-fase3.txt` | 95 passaram em 11/11; 159 ao fim da fase 3 (13/11); 0 pulados |
| ☑ | **Persistência após reinício** | `evidencias/2026-11-11_verificacao-api-com-banco.txt` + `evidencias/insomnia/08-1-*.png` | API e PostgreSQL reiniciados; dados, histórico e foto preservados (automático e no Insomnia) |
| ☑ | Coleção do Insomnia importável | `docs/insomnia/bridge-insomnia.json` | 73 requisições, conferidas contra o OpenAPI (as 22 operações cobertas) |
| ☑ | Roteiro dos testes manuais | `docs/insomnia/ROTEIRO_TESTES_MANUAIS.md` | — |
| ☑ | **Testes manuais executados + prints reais (Rodada 1)** | `docs/evidencias/insomnia/` | 33/33 em 12/11/2026 (35 prints) |
| ☐ | **Rodada 2 do Insomnia (40 requisições do Bridge 2.0, pastas 09 a 14) + prints** | `ROTEIRO_TESTES_MANUAIS.md`, seção 4 | ☐ Pendente (manual, equipe); gerar os fictícios antes da pasta 13 |
| ☑ | **Nomes dos integrantes no README** | `README.md`, `mobile/README.md` | 5 integrantes com RM (13/11); no README raiz falta a parte de cada um no projeto (exceto backend/mobile) |
| ☐ | Cidade/bairro e link do repositório na Ficha | `README.md` | ☐ Marcadores `[PREENCHER]` |
| ☐ | Atualizar `docs/REQUISITOS.md` após os testes **manuais** (Insomnia e celular) | — | Atualizado em 13/11 com a Rodada 1 e os testes no iPhone (1.0 e 2.0); falta a Rodada 2 do Insomnia |
| ⚠ | **Criar repositório no GitHub, commit e push** | — | ☐ (não feito por mim: requer sua autorização/conta) |
| ☐ | Conferir que `.env`, `.venv`, `node_modules` e `backend/var/` **não** foram enviados | `git status` | ☐ |
| ☐ | Enviar o link no Teams (um integrante) | — | ☐ |

O enunciado de SOA **não** pede ZIP nem vídeo.

---

## 2. Mobile Development & IOT — entrega: **ZIP + vídeo de até 2 min**

Enunciado (PDF p. 31): ZIP da pasta do app (sem `node_modules`), README.md (Ficha da
CitizenTech e como rodar), DECISOES.md (1 a 2 páginas), `authors` no package.json
(nome e RM de todos), vídeo demo de até 2 minutos.
**Portas de entrada:** `tsc` sem erro e sem `any`, app nativo, identificação completa.

| | Item | Onde | Situação |
|---|---|---|---|
| ☑ | App React Native + Expo, sem WebView | `mobile/` | — |
| ☑ | Telas com navegação (Expo Router): abas Início, Mapa, Andamento e Perfil; Registrar, Detalhe, Região e Identificação | `mobile/src/app/` | Bundle iOS gerado (13/11) |
| ☑ | Lista com carregando, erro e vazio | `(tabs)/andamento.tsx` | Implementado; ver em aparelho |
| ☑ | Formulário validado que cria item (registro em etapas) | `registrar.tsx` + `registro/fluxo.ts` + `validation/` | 106 testes puros passando |
| ☑ | Identificação lembrada ao reabrir | `context/IdentificacaoContext.tsx` | Implementado; ver em aparelho |
| ☑ | TypeScript estrito, sem `any`, `tsc --noEmit` limpo | `tsconfig.json` | Verificado automaticamente |
| ☑ | Recurso nativo com permissão tratada (localização, endereço do aparelho, câmera, mapa) | `services/localizacao.ts`, `geocodificacao.ts`, `camera.ts` | Implementado; ver em aparelho |
| ☑ | Camada `services/` e funções puras | `src/services/`, `src/validation/`, `src/geo/`, `src/registro/`, `src/acompanhamento/` | — |
| ☑ | README.md com Ficha e como rodar | `mobile/README.md` | Integrantes preenchidos; faltam bairro e link (`[PREENCHER]`) |
| ☑ | DECISOES.md (1–2 páginas) | `mobile/DECISOES.md` | Atualizado para o Bridge 2.0 |
| ☑ | **`authors` com nome e RM de TODOS** | `mobile/package.json` | 5 integrantes, 0 marcadores (13/11); o Perfil do app lista os nomes; tsc, 118 testes e expo-doctor 20/20 depois da mudança |
| ☑ | Teste no celular físico pelo Expo Go — versão 1.0 | iPhone, 12/11/2026 | Feito pela equipe (logs da API: identificação, lista, cadastro com foto, detalhe) |
| ⚠ | **Teste no iPhone da fase 3: Perfil completo, "Ainda não foi resolvido", cartão do mapa com foto em tela cheia** | — | ☐ Pendente (manual) |
| ☑ | Teste no iPhone da fase 2: aba Análises, modo Exemplo (Mapa e Análises), alertas | iPhone, 13/11/2026; `evidencias/2026-11-13_teste-iphone-fase2-logs.txt` | Feito pela equipe; logs: 59 requisições do código novo, todas 200, nenhum UUID na URL |
| ☑ | Teste no celular físico — Bridge 2.0 | iPhone, 13/11/2026; `evidencias/2026-11-13_teste-iphone-fase1-logs.txt` | Aprovado pelo usuário. Logs: mapa (pontos e densidade ao vivo), Andamento, detalhe com foto, registro até Parecidos |
| ☐ | No iPhone, ainda não exercitados no 2.0: enviar um registro novo pelas etapas e "Eu também vi" | — | ☐ Recomendado antes do vídeo |
| ☐ | Testes manuais no aparelho: permissão negada, cancelar câmera, API fora do ar, duplo toque | — | ☐ Pendente |
| ☑ | ZIP de **teste** gerado e instalado do zero numa pasta limpa | `evidencias/2026-11-13_zip-mobile-teste-fase3.txt` | `npm ci`, tsc, 106/106 testes e lint OK (13/11, código da fase 3, versão 2.0.0) |
| ☐ | Gerar `Bridge-Mobile.zip` **final** **depois** de preencher `authors` | ver abaixo | ☐ |
| ☐ | Inspecionar o ZIP (sem `node_modules`, `.expo`, `.env`) | ver abaixo | ☐ |
| ⚠ | **Gravar o vídeo (≤ 2 min) do app real** | `docs/ROTEIRO_VIDEO_MOBILE.md` | ☐ Só o roteiro existe |
| ☐ | Enviar ZIP + vídeo no Teams (um integrante) | — | ☐ |

O link do GitHub **não substitui** o ZIP.

### Gerar e inspecionar o ZIP

Na pasta `bridge/` (PowerShell), depois de preencher `authors`:

```powershell
.\backend\.venv\Scripts\python.exe scripts\gerar_zip_mobile.py
```

O script cria `..\Bridge-Mobile.zip` (fora do repositório), só com os arquivos
necessários, e lista o conteúdo para conferência. Ele recusa gerar o ZIP enquanto
`authors` tiver `PREENCHER` (use `--permitir-marcadores` apenas para testar).

---

### Dados fictícios para a demonstração e o vídeo

Na pasta `backend/` (com o PostgreSQL ligado):

```powershell
.\.venv\Scripts\python.exe scripts\dados_ficticios.py gerar --recriar   # antes de gravar o vídeo (alertas da janela de 30 dias)
.\.venv\Scripts\python.exe scripts\dados_ficticios.py relatorio        # quantos existem e quais regiões em alerta
.\.venv\Scripts\python.exe scripts\dados_ficticios.py remover          # volta só aos dados reais
```

No app, o seletor **Ao vivo** volta aos dados reais com um toque; o app sempre abre no Ao vivo.

---

## 3. Itens gerais da GS

| | Item | Situação |
|---|---|---|
| ☑ | ODS identificados e contribuição explicada (PDF p. 14) | README |
| ☐ | `prompts.md` com os prompts de IA usados (PDF p. 21) | Responsável preenchido; **colar o prompt completo** |
| ☑ | Sem dados pessoais reais; imagens de teste sintéticas | — |
| ☐ | Integração do modelo de IA do colega (`docs/CONTRATO_IA.md`) | Aguardando material |
