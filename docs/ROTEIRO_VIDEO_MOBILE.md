# Roteiro do vídeo demo — Mobile (até 2 minutos)

> Este é **só o roteiro**. O vídeo ainda **não foi gravado**. A gravação deve mostrar
> o app funcionando de verdade, no celular, pelo Expo Go, ligado à API real.

## Antes de gravar (checklist)

- [ ] PostgreSQL rodando e migrado (`alembic upgrade head`); API com `--host 0.0.0.0`.
- [ ] `http://<IP>:8000/health` abre no navegador do celular.
- [ ] `mobile/.env` com o IP certo; `npx expo start -c`; app aberto no Expo Go.
- [ ] Identificação do aparelho **limpa** (Identificação → "Limpar identificação"), para mostrar o primeiro acesso.
- [ ] Banco com **zero ocorrências** se quiser mostrar o estado vazio (opcional).
- [ ] Na primeira gravação, deixe a permissão de câmera e localização "não perguntada"
      (desinstalar/reinstalar o Expo Go, ou revogar nas Configurações), para mostrar o pedido.
- [ ] Gravação de tela do celular ligada; notificações silenciadas.
- [ ] Esteja num local onde possa fotografar algo real (ou use um objeto como "obstáculo").
      Não filme pessoas nem placas de carro.

## Roteiro (tempos aproximados)

| Tempo | Tela | O que mostrar / falar |
|---|---|---|
| 0:00–0:10 | — | "Bridge: o cidadão registra problemas da calçada e acompanha o conserto. App React Native com Expo, TypeScript estrito." |
| 0:10–0:25 | Identificação | Digitar um apelido curto inválido ("A") → mensagem de erro. Digitar um apelido válido → "Começar". Dizer: "isto não é login, é um apelido guardado no aparelho". |
| 0:25–0:35 | Lista (vazia) | Estado vazio com a ação "Registrar o primeiro problema". |
| 0:35–1:10 | Nova ocorrência | Tocar "Enviar" vazio → erros por campo. Escolher categoria, preencher título/descrição. **"Usar minha localização"** → pedido de permissão → coordenadas preenchidas. **"Tirar foto"** → permissão → foto. Marcar 1–2 situações. "Enviar ocorrência" (mostrar o "Enviando…"). |
| 1:10–1:30 | Detalhe | Aviso "Ocorrência registrada", foto, status **Aberta**, faixa e texto da **prioridade** com a justificativa, **"Análise indisponível"** (dizer que o modelo do colega ainda não foi integrado e que nada é inventado), histórico. |
| 1:30–1:40 | Lista | Voltar: a ocorrência aparece no topo, com categoria, status e prioridade. |
| 1:40–1:55 | Reabrir o app | Fechar o app (tirar do multitarefa) e abrir de novo: vai direto para a lista com "Olá, <apelido>" → **identificação lembrada**. |
| 1:55–2:00 | — | "Código, decisões e README no ZIP." |

### Cenas opcionais (se sobrar tempo ou para um segundo take)

- **Permissão negada:** negar a câmera → mensagem explicando e alternativa da galeria.
- **API indisponível:** parar a API e puxar a lista para atualizar → mensagem de erro com "Tentar novamente".
- **IA integrada:** só se o modelo do colega estiver de fato integrado e verificado.

## Depois de gravar

- [ ] Duração ≤ 2:00.
- [ ] Conferir se nenhum dado pessoal real aparece.
- [ ] Marcar o vídeo como feito em `docs/ENTREGA.md`.
