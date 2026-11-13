# Registro de prompts de IA

Regra da GS (PDF, "Combinados da equipe"): a IA pode ser usada como copiloto para
aprender e revisar; os prompts devem ser registrados e a equipe deve saber explicar
cada linha do código.

## Sessão 1 — 11/11/2026 · Claude Code (Anthropic)

**Responsável:** **[PREENCHER: integrante que conduziu a sessão]**
**Escopo:** backend (SOA) e app mobile do Bridge.

### Prompt (resumo fiel — colar o texto completo abaixo)

> **[COLAR AQUI o texto completo do prompt original usado na sessão.]**

Resumo do pedido feito ao assistente:

1. Agir como agente de desenvolvimento: criar arquivos, executar comandos, investigar
   erros e validar o funcionamento; não entregar só um plano.
2. Projeto Bridge: registrar problemas de infraestrutura urbana, classificar e priorizar.
3. Backend: Python, FastAPI, SQLAlchemy, Alembic, PostgreSQL; domínio, API REST,
   migrações reais (sem `create_all`), testes manuais com Insomnia.
4. Mobile: React Native + Expo (Expo Go), TypeScript estrito sem `any`, 4 telas
   (identificação, lista, cadastro, detalhe), câmera e localização com permissões
   tratadas, camada `services/`, validação pura, README e DECISOES.md.
5. Segurança básica de upload, proteção da operação administrativa, sem segredos no app.
6. Prioridade por regra determinística documentada (não apresentar como ML).
7. Preparar a integração com o modelo de IA do colega sem fabricar previsões.
8. Rastreabilidade honesta de requisitos (implementado / verificado / pendente),
   checklists de entrega separados, ZIP do mobile e roteiro do vídeo.
9. Não inventar nomes, RMs, URLs, métricas ou evidências; não fazer push nem publicar.

### Decisões tomadas pela equipe durante a sessão

- Verificação com PostgreSQL adiada no início (não havia banco instalado na máquina).
- Depois, a equipe escolheu PostgreSQL local (em vez de Supabase), usando os binários
  portáteis oficiais 18.4 sem instalação; migrações, testes de integração e persistência
  foram verificados nele (ver `docs/evidencias/`).
- Integrantes e RMs a preencher pela equipe.

### O que a equipe deve revisar e saber explicar

- Regra de prioridade (`backend/app/services/prioridade.py`, `docs/REGRAS_DE_NEGOCIO.md`).
- Transições de status e histórico (`services/transicoes.py`, `services/ocorrencias.py`).
- Migrações (`backend/alembic/versions/`).
- Validação de upload (`services/armazenamento.py`).
- Fluxo de envio com idempotência e reenvio da foto (`mobile/src/app/ocorrencias/nova.tsx`).
- Validação das respostas da API no app (`mobile/src/validation/respostas.ts`).
