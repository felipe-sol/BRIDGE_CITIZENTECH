# Evidências — Bridge

Todas as evidências aqui são **saídas reais** de comandos executados, com data.
Nenhuma foi editada para parecer melhor do que é.

| Arquivo | Tipo | O que comprova | O que NÃO comprova |
|---|---|---|---|
| `2026-11-11_pytest-backend.txt` | Automática (antes do banco) | 74 testes unitários/sem banco passando; 21 de integração **pulados** (sem PostgreSQL naquele momento) | Banco, migrações aplicadas, persistência |
| `2026-11-11_verificacao-http-sem-banco.txt` | Automática (HTTP real, curl) | API em execução: validação 422, formato de erro, 404, 401 sem token, 413 por tamanho, 503 com banco fora | Fluxo com banco |
| `2026-11-11_alembic-sql-offline.sql` | Automática | DDL exato gerado pelas migrações 0001 e 0002 | Aplicação em banco vazio |
| `2026-11-11_alembic-banco-vazio.txt` | Automática (PostgreSQL 18.4 local) | `upgrade head` em banco vazio, `current`, `check` sem diferenças, constraints/índices criados, `downgrade -1`, ida e volta `base` → `head` e migração de dados da `0002` (passo 7b; a 1ª tentativa do passo 7 falhou por codificação do comando de teste e está registrada) | Banco de outra máquina |
| `2026-11-11_pytest-backend-com-banco.txt` | Automática (PostgreSQL 18.4 local) | 95 testes passando, **0 pulados**, incluindo os 21 de integração | Testes manuais |
| `2026-11-11_verificacao-api-com-banco.txt` | Automática (API em execução + PostgreSQL) | Fluxo completo 25/25 (cadastro, idempotência, validações, listagem, upload, status/histórico, 401/403/404/409/415/422); persistência após reiniciar **API e PostgreSQL** (ocorrência, histórico e foto) | Testes manuais no Insomnia (exigência da disciplina) |
| `2026-11-11_verificacao-mobile.txt` | Automática | `tsc --noEmit` limpo, ESLint sem problemas, 18 testes puros, expo-doctor 20/20, 0 `any` | Funcionamento no celular |
| `insomnia/` (35 prints) | **Manual** (12/11/2026) | Testes manuais exigidos pela disciplina de SOA: as 33 requisições do [roteiro](../insomnia/ROTEIRO_TESTES_MANUAIS.md), executadas no Insomnia, cada uma com o print da resposta real (+2 prints extras explicados no roteiro) | App mobile |
| `2026-11-12_reinicio-para-insomnia-08-1.txt` | Automática (apoio ao teste manual) | API e PostgreSQL foram desligados e religados antes do teste 08.1 (persistência) | — |
| `2026-11-12_alembic-0003.txt` | Automática (Bridge 2.0) | Migração 0003 em banco vazio (`bridge_test`): `upgrade`, `check` sem diferenças, colunas/constraints/índices criados, `downgrade -1` e reaplicação; banco de desenvolvimento só atualizado (sem perda) e regiões preenchidas pelo script | Banco de outra máquina |
| `2026-11-12_pytest-backend-fase1.txt` | Automática (Bridge 2.0) | 127 testes, 0 pulados: regiões oficiais, geometria, migração, endereço/região, filtros, densidade, proximidade, confirmações | Testes manuais |
| `2026-11-13_pytest-backend-fase1.txt` | Automática (Bridge 2.0, estado final da fase 1) | 128 testes, 0 pulados (inclui a lista "minhas" pelo cabeçalho e o teste de que o UUID não vai na URL) | Testes manuais |
| `2026-11-13_verificacao-api-fase1.txt` | Automática (API em execução, banco de testes) | Fluxo 1.0 + Bridge 2.0 com conferência do conteúdo (52 verificações) e persistência após reiniciar a API | Testes manuais no Insomnia (Rodada 2) |
| `2026-11-13_zip-mobile-teste.txt` | Automática (Bridge 2.0) | ZIP de **teste** (com marcadores em `authors`) só com a lista fechada de arquivos; extraído numa pasta limpa fora do OneDrive, sem o backend ao lado, com o código final: `npm ci`, `tsc` limpo, 63/63 testes, ESLint limpo | ZIP final de entrega (depende de `authors`); funcionamento no iPhone |
| `2026-11-13_verificacao-mobile-fase1.txt` | Automática (Bridge 2.0) | `tsc` limpo, ESLint sem problemas, 60 testes puros (+ adendo da revisão final: 63/63 e bundle iOS de novo), expo-doctor 20/20, bundle iOS, 0 `any`/`@ts-ignore`, nenhum segredo no bundle | Funcionamento no iPhone |

## Pendentes (manuais)

1. Mobile no celular físico: prints/vídeo do fluxo real do Bridge 2.0.
2. Insomnia, Rodada 2 (pastas 09 a 12 da coleção): executar e salvar os prints em `insomnia/`.
3. A verificação da `2026-11-13_verificacao-api-fase1.txt` usou o banco de testes de
   propósito, para não colocar dados de teste no banco que o app usa.

> Nos arquivos de evidência, os caminhos da máquina de desenvolvimento foram trocados
> por marcadores (`<projeto>` = pasta do repositório, `<ferramentas>` = pasta das
> ferramentas locais, como o PostgreSQL portátil, `<temporario>` = pasta temporária),
> para não publicar o nome de usuário do computador. Nenhum resultado foi alterado.
