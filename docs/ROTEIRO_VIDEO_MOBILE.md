# Roteiro do vídeo demo — Mobile (até 2 minutos) — Bridge 2.0

> Este é **só o roteiro**. O vídeo ainda **não foi gravado**. A gravação deve mostrar o
> app funcionando de verdade, no celular, pelo Expo Go, ligado à API real.

## Antes de gravar (checklist)

- [ ] PostgreSQL ligado e banco na última migração (`alembic upgrade head`, 0004); API com
      `--host 0.0.0.0`; `http://<IP>:8000/health` abre no navegador do celular.
- [ ] Dados fictícios recém-gerados, para os alertas do Exemplo estarem atualizados (pasta
      `backend/`): `python scripts/dados_ficticios.py gerar --recriar`.
- [ ] `mobile/.env` com o IP certo; `npx expo start -c`; app aberto no Expo Go.
- [ ] Identificação do aparelho **limpa** (Perfil → "Criar nova identificação"), para mostrar o
      primeiro acesso.
- [ ] Permissões de localização e câmera **não perguntadas** (Ajustes do iPhone → Expo Go →
      redefinir, ou reinstalar o Expo Go), para mostrar os pedidos.
- [ ] Uma ocorrência **aberta de outra pessoa** a poucos metros, da mesma categoria que você vai
      registrar (crie pelo Insomnia, com outra identificação), para mostrar "Eu também vi".
- [ ] Insomnia aberto com o `PATCH /ocorrencias/{id}/status` e o token administrativo, para a
      "equipe responsável" atualizar o status durante a gravação.
- [ ] Grave num **lugar público** (não em casa): o mapa mostra a sua localização real. Não
      filme pessoas nem placas de carro. Notificações silenciadas; gravação de tela ligada.

## Roteiro (tempos aproximados)

| Tempo | Tela | O que mostrar / falar |
|---|---|---|
| 0:00–0:08 | — | "Bridge: o cidadão registra problemas de calçadas e vias e acompanha o conserto. React Native com Expo e TypeScript estrito; API REST com FastAPI e PostgreSQL." |
| 0:08–0:18 | Identificação | Apelido "A" → mensagem de erro. Apelido válido → entrar. "Não é login: é um apelido guardado no aparelho." |
| 0:18–0:30 | Início | Tocar "Ativar localização" → **pedido de permissão** → a placa mostra o bairro e a subprefeitura reais. Faixa "Sem alertas na sua região". "Acompanhando" vazio (estado vazio). |
| 0:30–0:55 | Registrar | Mapa real com o pino no centro; endereço sugerido pelo aparelho. Categoria. **Parecidos a até 100 m** → mostrar a ocorrência da outra pessoa e tocar "É outro" (ou "Eu também vi"). **Tirar foto** → pedido de permissão. Apagar o título sugerido e tentar revisar → **erro de validação**. Preencher, revisar e enviar. |
| 0:55–1:08 | Detalhe | Tocar na foto → **tela cheia com zoom**. Prioridade e justificativa ("regra pública, não é avaliação oficial"). "Análise de IA indisponível": o modelo do colega ainda não foi integrado e nada é inventado. |
| 1:08–1:20 | Andamento | Lista com a ocorrência. No Insomnia, a equipe muda o status para Em análise com um comentário → puxar para atualizar → selo **Atualizada** e a linha do tempo com o comentário. |
| 1:20–1:42 | Mapa | "Ao vivo · atualizado há X s"; tocar num ponto → **cartão com foto e andamento**. Trocar para **Exemplo · 4 meses** → faixa "DADOS FICTÍCIOS". **Densidade**: regiões em Alerta com contorno tracejado; tocar numa → folha com o nível e o motivo ("Alerta Bridge, não é oficial"). Voltar ao **Ao vivo**. |
| 1:42–1:52 | Análises | No Exemplo: indicadores e o gráfico semanal (tocar numa semana). |
| 1:52–1:58 | Perfil | Ligar **Texto maior** e mostrar o efeito. Fechar o app e abrir de novo → vai direto ao Início com o apelido (**identificação lembrada**). |
| 1:58–2:00 | — | "Código, decisões e README no ZIP." |

Se passar de 2:00, encurte primeiro as Análises e depois o Mapa no modo Exemplo.

## Requisitos do PDF que o vídeo mostra

| Requisito (Mobile) | Onde aparece |
|---|---|
| App nativo React Native + Expo (Expo Go), sem WebView | O vídeo inteiro, no iPhone |
| ≥ 3 telas com navegação | Identificação, abas (Início, Mapa, Andamento, Análises, Perfil), Registrar, Detalhe |
| Lista com carregando, erro e vazio | "Acompanhando" vazio no Início; Andamento carregando e com dados |
| Formulário validado que cria item | Registrar: erro com o título apagado; envio com prioridade calculada |
| Identificação lembrada ao reabrir | Fim do vídeo: o app reabre direto no Início |
| Recurso nativo com permissão tratada | Pedidos de localização e de câmera; mapa real |
