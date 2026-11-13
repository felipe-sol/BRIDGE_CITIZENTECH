# Roteiro de testes manuais no Insomnia — Bridge API

Exigência da disciplina de SOA: **testes manuais com Insomnia** (1,5 ponto).
Os testes automatizados (`pytest`) **não substituem** este roteiro.

> Os "resultados esperados" abaixo vêm do contrato da API e dos testes
> automatizados. Eles só viram evidência depois que **você** executar cada
> requisição e salvar o print real. Não use prints de outra execução.

## 1. Preparação

1. Banco vazio e migrado (ver README, seções "Banco de dados" e "Migrações"):
   ```powershell
   cd backend
   .\.venv\Scripts\alembic.exe upgrade head
   ```
2. Em `backend/.env`, defina `ADMIN_TOKEN` (mínimo 16 caracteres), por exemplo
   gerado com `python -c "import secrets; print(secrets.token_urlsafe(24))"`.
3. Inicie a API: `.\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000`
4. No Insomnia: **Import** → arquivo [`bridge-insomnia.json`](bridge-insomnia.json).
5. Selecione o ambiente **"Local (demonstração)"** e preencha:
   - `base_url`: `http://localhost:8000`
   - `admin_token`: o mesmo valor do `backend/.env`
   - os demais IDs você preenche durante o roteiro (indicado em **negrito** abaixo).
6. Crie a pasta `docs/evidencias/insomnia/` para os prints.

Dica: o arquivo `foto-sintetica.jpg` é uma imagem gerada por código (não é
foto real de nenhum local). `nao-e-imagem.jpg` é um texto com extensão `.jpg`.

## 2. Ordem de execução e resultados esperados

**Execução registrada em 12/11/2026:** as 33 requisições foram executadas manualmente
no Insomnia pela equipe, contra a API local com PostgreSQL 18.4 (banco iniciado vazio).
Todos os resultados bateram com o esperado. Os prints estão em
[`docs/evidencias/insomnia/`](../evidencias/insomnia/). Há 2 prints extras:
- `07-3a-extra-sem-arquivo-422.png`: 1ª tentativa da 07.3 sem escolher o arquivo, que
  retornou 422 "arquivo: Campo obrigatório";
- `08-1b-persistencia-historico.png`: continuação da 08.1, mostrando o histórico.

Para a 07.x, o Insomnia exige liberar a pasta dos arquivos em
*Preferences → General → Security* (senão ele recusa ler o arquivo sem enviar nada).
O reinício da API e do PostgreSQL antes da 08.1 está registrado em
`docs/evidencias/2026-11-12_reinicio-para-insomnia-08-1.txt`.

| # | Requisição | Esperado | Print |
|---|---|---|---|
| 01.1 | GET /health | 200, `status: ok`, `banco: ok`, `modelo_ia.disponivel: false` | ☑ `01-1-health.png` |
| 02.1 | POST /identificacoes (válida) | 201 com `id` UUID → **copie para `identificacao_id`** | ☑ `02-1-identificacao.png` |
| 02.2 | POST /identificacoes (apelido "A") | 422 `VALIDACAO`, campo `apelido` | ☑ `02-2-identificacao-invalida.png` |
| 02.3 | GET /identificacoes/{id} | 200, mesma identificação | ☑ `02-3-identificacao-get.png` |
| 02.4 | GET /identificacoes/{id inexistente} | 404 `NAO_ENCONTRADO` | ☑ `02-4-identificacao-404.png` |
| 02.5 | POST /identificacoes (2ª pessoa) | 201 → **copie para `outra_identificacao_id`** | ☑ `02-5-segunda-identificacao.png` |
| 03.1 | GET /ocorrencias (vazia) | 200, `itens: []`, `total: 0` | ☑ `03-1-lista-vazia.png` |
| 04.1 | POST /ocorrencias (válida) | 201, `ABERTA`, `ALTA`, pontuação 7, IA `INDISPONIVEL` → **anote `ocorrencia_id`** | ☑ `04-1-cadastro.png` |
| 04.2 | POST /ocorrencias (mesma Idempotency-Key) | **200** com o mesmo `id` (sem duplicar) | ☑ `04-2-idempotencia.png` |
| 04.3 | POST /ocorrencias (campos inválidos) | 422, detalhes de 5 campos | ☑ `04-3-campos-invalidos.png` |
| 04.4 | POST /ocorrencias (latitude 91) | 422, campo `latitude` | ☑ `04-4-latitude.png` |
| 04.5 | POST /ocorrencias (longitude -181) | 422, campo `longitude` | ☑ `04-5-longitude.png` |
| 04.6 | POST /ocorrencias (0, 0) | 422, "localização ausente" | ☑ `04-6-zero-zero.png` |
| 04.7 | POST /ocorrencias (identificação inexistente) | 422 `IDENTIFICACAO_INEXISTENTE` | ☑ `04-7-identificacao-inexistente.png` |
| 04.8 | POST /ocorrencias (buraco sem agravantes) | 201, `BAIXA`, pontuação 3 → **anote `segunda_ocorrencia_id`** | ☑ `04-8-cadastro-baixa.png` |
| 05.1 | GET /ocorrencias | 200, `total: 2`, mais recente primeiro | ☑ `05-1-lista.png` |
| 05.2 | GET /ocorrencias?ordenar=prioridade&tamanho=1 | 1 item (pontuação 7), `total_paginas: 2` | ☑ `05-2-paginacao.png` |
| 05.3 | GET /ocorrencias?prioridade=ALTA | só a de prioridade ALTA | ☑ `05-3-filtro.png` |
| 05.4 | GET /ocorrencias?tamanho=500 | 422, campo `tamanho` | ☑ `05-4-tamanho-invalido.png` |
| 05.5 | GET /ocorrencias/{id} | 200, `historico_status` com 1 registro | ☑ `05-5-detalhe.png` |
| 05.6 | GET /ocorrencias/999999 | 404 `NAO_ENCONTRADO` | ☑ `05-6-detalhe-404.png` |
| 06.1 | PATCH status sem token | 401 `NAO_AUTORIZADO` | ☑ `06-1-sem-token.png` |
| 06.2 | PATCH ABERTA → EM_ANALISE | 200 | ☑ `06-2-em-analise.png` |
| 06.3 | PATCH EM_ANALISE → RESOLVIDA | 409 `TRANSICAO_INVALIDA` | ☑ `06-3-transicao-invalida.png` |
| 06.4 | PATCH EM_ANALISE → EM_ANDAMENTO | 200 | ☑ `06-4-em-andamento.png` |
| 06.5 | PATCH EM_ANDAMENTO → RESOLVIDA | 200, histórico com 4 registros | ☑ `06-5-resolvida.png` |
| 07.1 | POST imagem (`foto-sintetica.jpg`) | 200, `imagem_url` preenchida | ☑ `07-1-upload.png` |
| 07.2 | GET imagem | 200, `image/jpeg`, imagem aparece no Insomnia | ☑ `07-2-download.png` |
| 07.3 | POST imagem de novo | 409 `IMAGEM_JA_ENVIADA` | ☑ `07-3-upload-repetido.png` |
| 07.4 | POST `nao-e-imagem.jpg` | 415 `FORMATO_NAO_SUPORTADO` | ☑ `07-4-nao-e-imagem.png` |
| 07.5 | POST imagem com `outra_identificacao_id` | 403 `PROIBIDO` | ☑ `07-5-outra-identificacao.png` |
| 07.6 | POST arquivo de 6 MB | 413 `ARQUIVO_MUITO_GRANDE` | ☑ `07-6-arquivo-grande.png` |
| 08.1 | Reinicie a API e repita GET /ocorrencias/{id} | 200, mesmos dados (persistência no PostgreSQL) | ☑ `08-1-persistencia.png` |

### 07.6 — gerar o arquivo grande (fora do repositório)

```powershell
python -c "open(r'C:\temp\grande.jpg','wb').write(b'\xff\xd8' + b'0' * 6 * 1024 * 1024)"
```
(Crie a pasta `C:\temp` antes, ou troque o caminho.) Não versione esse arquivo.

### 08.1 — persistência

1. No terminal da API, pare com `Ctrl+C`.
2. Inicie de novo com o mesmo comando.
3. Execute 08.1. Para um print mais forte, mostre também o terminal reiniciado.

## 3. O que registrar

- Print de cada linha (requisição + status + corpo da resposta visíveis).
- Salve em `docs/evidencias/insomnia/` com o nome indicado.
- Marque ☑ nesta tabela e atualize `docs/REQUISITOS.md` (S4) para
  "Verificado manualmente" somente depois disso.

## 4. Rodada 2 — Bridge 2.0, fase 1 (pastas 09 a 12)

Testa as rotas novas: endereço e região, mapa e densidade, proximidade (duplicatas),
"eu também vi" e a lista do Andamento. Pode ser feita depois da Rodada 1, **no mesmo
banco** (ela usa a ocorrência 1, resolvida na Rodada 1, e as duas identificações).

**Preparação**
1. A API precisa estar com o código da fase 1 (reiniciada depois da atualização).
2. No Insomnia, importe de novo `bridge-insomnia.json`. A coleção mantém os mesmos IDs
   e ganha as pastas 09 a 12. Se aparecer uma cópia duplicada, apague a antiga.
3. No ambiente "Local (demonstração)", confira `identificacao_id`, `outra_identificacao_id`
   e `admin_token` (os mesmos da Rodada 1). A variável nova `terceira_ocorrencia_id` é
   preenchida na 09.1.

| # | Requisição | Esperado | Print |
|---|---|---|---|
| 09.1 | POST /ocorrencias com endereço (Sé) | 201; `endereco`; `subprefeitura` {"codigo":"09","nome":"Sé"}; `confirmacoes` 0; `origem` "APP" → **copie o `id` para `terceira_ocorrencia_id`** | ☐ `09-1-cadastro-endereco-regiao.png` |
| 09.2 | POST /ocorrencias fora de SP | 201; `subprefeitura` null | ☐ `09-2-fora-de-sp.png` |
| 09.3 | POST /ocorrencias endereço com 201 caracteres | 422; campo `endereco` | ☐ `09-3-endereco-longo.png` |
| 09.4 | GET /regioes | 200; 32 `features`; cabeçalho `Cache-Control` | ☐ `09-4-regioes.png` |
| 09.5 | GET /estatisticas/regioes | 200; 32 itens; "09" com total ≥ 1 | ☐ `09-5-estatisticas.png` |
| 09.6 | GET /ocorrencias?bbox=… | 200; a 09.1 aparece, a 09.2 (Rio) não | ☐ `09-6-bbox.png` |
| 09.7 | GET /ocorrencias?q=praça | 200; inclui a 09.1 | ☐ `09-7-busca.png` |
| 09.8 | GET /ocorrencias?bbox=1,2,3 | 422; campo `bbox` | ☐ `09-8-bbox-invalido.png` |
| 10.1 | GET /ocorrencias/proximas (calçada, 100 m) | 200; a 09.1 com `distancia_m` ≈ 0 | ☐ `10-1-proximas.png` |
| 10.2 | GET /ocorrencias/proximas raio 1000 | 422; campo `raio_m` | ☐ `10-2-raio-invalido.png` |
| 11.1 | POST confirmação (outra pessoa) | 201; `confirmacoes` 1 | ☐ `11-1-confirmacao.png` |
| 11.2 | POST confirmação repetida | 200; continua 1 | ☐ `11-2-confirmacao-repetida.png` |
| 11.3 | POST confirmação pelo autor | 409 `PROPRIA_OCORRENCIA` | ☐ `11-3-propria.png` |
| 11.4 | POST confirmação na ocorrência 1 (resolvida) | 409 `OCORRENCIA_ENCERRADA` | ☐ `11-4-encerrada.png` |
| 11.5 | GET detalhe com `X-Identificacao-Id` da outra pessoa | 200; `minha_relacao` {"registrei": false, "confirmei": true}; prioridade igual à da 09.1 | ☐ `11-5-detalhe-relacao.png` |
| 11.6 | GET /ocorrencias/minhas?relacao=confirmadas (outra) | 200; inclui a 09.1 | ☐ `11-6-minhas-confirmadas.png` |
| 11.7 | DELETE confirmação | 200; `confirmacoes` 0 | ☐ `11-7-desfazer.png` |
| 11.8 | GET detalhe sem cabeçalho | 200; `minha_relacao` null | ☐ `11-8-detalhe-sem-relacao.png` |
| 12.1 | GET /ocorrencias/minhas (registradas) | 200; as desta identificação, a mais recentemente atualizada primeiro | ☐ `12-1-minhas-registradas.png` |
| 12.2 | GET /ocorrencias/minhas sem cabeçalho | 422 | ☐ `12-2-minhas-sem-cabecalho.png` |
| 12.3 | GET /ocorrencias/minhas com UUID inexistente | 422 `IDENTIFICACAO_INEXISTENTE` | ☐ `12-3-minhas-inexistente.png` |

Observação: na 11.4 a ocorrência 1 precisa estar **resolvida** (Rodada 1, bloco 06).
Se o banco foi recriado, rode antes as requisições 06.2, 06.4 e 06.5 da Rodada 1.
