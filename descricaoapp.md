# Bridge — descrição do app mobile

> **FIAP · Global Solution 2026.2 · CitizenTech · Mobile Development & IOT**
> App nativo em **React Native + Expo (Expo Go)** com **TypeScript estrito**, sem WebView.
> Código em [`mobile/`](mobile/) · Como rodar: [`mobile/README.md`](mobile/README.md#instalação-e-execução)
> · Decisões de projeto: [`mobile/DECISOES.md`](mobile/DECISOES.md)

## O que é

O app é a porta de entrada do cidadão no Bridge. Com ele, a pessoa **registra problemas
de infraestrutura urbana** (calçada danificada, buraco, iluminação defeituosa, obstáculo
à circulação) com foto e localização, **vê no mapa real de São Paulo** o que já foi
registrado, **soma o próprio relato** ao de quem já viu o mesmo problema e **acompanha**
cada atualização da equipe responsável.

**Para quem:** pedestres que dependem da calçada, em especial pessoas com deficiência ou
mobilidade reduzida, idosos e quem anda com carrinho de bebê, e moradores que acompanham a
zeladoria do bairro.

Projeto acadêmico: **não há integração oficial com prefeitura** ou órgão público.

## O caminho da pessoa no app

1. **Identifica-se** com um apelido (não é login, não pede dado pessoal).
2. **Vê o mapa** com a própria localização e as ocorrências ao redor.
3. **Registra** um problema em etapas: local, categoria, parecidos por perto, foto e detalhes.
4. Se alguém já registrou o mesmo problema a até 100 m, **confirma** ("Eu também vi") em vez
   de duplicar.
5. **Acompanha** o andamento na aba Andamento, com linha do tempo e aviso quando há novidade.
6. Se a ocorrência foi marcada como resolvida mas o problema continua, **avisa** ("Ainda não
   foi resolvido?").

## Telas

Barra de abas: **Início · Mapa · Andamento · Análises · Perfil**. O botão amarelo
"Registrar" fica no Início e no Mapa.

| Tela | O que a pessoa faz |
|---|---|
| **Identificação** | Cria o apelido, que fica salvo no aparelho (só aparece sem identificação) |
| **Início** | Vê o bairro e a subprefeitura onde está, o Alerta Bridge mais relevante (ou "Sem alertas na sua região"), um mapa pequeno e as ocorrências que acompanha |
| **Mapa** | Explora o mapa real (Apple Maps no iPhone) com pontos, densidade, busca, filtros e o cartão de cada ocorrência (detalhes abaixo) |
| **Registrar** | Registra em etapas: local no mapa (pino central e endereço sugerido) → categoria → parecidos a até 100 m → foto e detalhes → revisão e envio |
| **Detalhe** | Vê foto (tela cheia com zoom), local, prioridade e o porquê dela, "Eu também vi", "Ainda não foi resolvido? Avise", linha do tempo da equipe, sugestão de categoria da IA e compartilhar |
| **Andamento** | Acompanha o que registrou ou confirmou, com etapas, selo "Atualizada" e puxar para atualizar |
| **Análises** | Indicadores e gráficos da cidade (detalhes abaixo) |
| **Perfil** | Vê a própria participação, troca o apelido, ajusta Texto maior e avisos no app, lê as páginas informativas e a equipe |
| **Região** | Folha com os números de uma subprefeitura e o nível do Alerta Bridge com o motivo |
| **Sobre** | Páginas: como a prioridade é calculada, como funcionam os alertas, privacidade e dados, sobre o Bridge e equipe |

## Funcionalidades em detalhe

### Mapa

- **Duas camadas:**
  - **Pontos:** cada ocorrência aparece com forma e cor pela gravidade (◆ alta, ● média,
    ■ baixa), nunca só pela cor.
  - **Densidade:** pinta as 32 subprefeituras pelas ocorrências por km².
- **Grupos:** com o zoom afastado, ocorrências próximas viram uma bolinha escura com o número
  de ocorrências (borda vermelha se alguma for de prioridade alta). Tocar no grupo aproxima o
  mapa; perto o bastante, cada ocorrência aparece sozinha. A grade dos grupos é presa ao mapa:
  arrastar não reagrupa nem move as bolhas.
- **Cartão da ocorrência:** tocar num ícone abre um cartão com foto (toque → tela cheia com
  zoom), categoria, status, prioridade, endereço, quantas pessoas também relataram, última
  atualização da equipe, a sugestão de categoria da IA (marcada como "incerta" abaixo de 50%),
  "Eu também vi" e "Ver detalhe". O app encontra o ícone mais próximo
  do dedo (até cerca de 28 pontos da tela), porque no iPhone o toque nem sempre chega ao
  marcador. Tocar num lugar vazio fecha o cartão.
- **Alerta Bridge:** regiões em alerta ganham contorno tracejado.
- **Busca** por região, endereço ou texto e **filtros** por categoria, prioridade e status.
- **Ao vivo:** consulta a cada 15 s com a tela aberta e mostra "atualizado há X s". Pede ao
  servidor a área visível com folga e reaproveita enquanto a tela couber nela; cada área
  recebe até 2.000 ocorrências (as mais graves primeiro) e, acima disso, o app pede para
  aproximar.

### Registro em etapas

- **Local:** mapa com pino central, posição atual pelo GPS e endereço sugerido pelo próprio
  aparelho (editável; se falhar, fica em branco e não trava o envio).
- **Categoria** do problema.
- **Parecidos:** mostra registros da mesma categoria a até 100 m; a pessoa confirma um deles
  ou segue com "é outro".
- **Foto e detalhes:** câmera ou galeria (a foto é opcional), descrição e a situação no local
  (risco imediato, bloqueia a passagem, afeta acessibilidade).
- **Revisão e envio:** antes de enviar, a IA dá a opinião dela pelo que a pessoa escreveu. Se
  discordar da categoria escolhida, o app avisa e mostra o botão "Trocar para …" (o app verifica de
  novo os parecidos com a categoria nova); abaixo de 50% de confiança, o aviso aparece como palpite,
  e abaixo de 30% não aparece. Vale só o que a pessoa escreveu: o título que o app preenche com o
  nome da categoria não entra na análise. O envio usa
  uma chave de idempotência, então repetir o envio não cria
  duplicata; se só a foto falhar, o app reenvia só a foto.

### Prioridade e Alerta Bridge

- **Prioridade** é uma pontuação de 1 a 10 **por regras fixas**: gravidade da categoria +
  risco imediato (+3) + bloqueia a passagem (+2) + afeta acessibilidade (+2). Até 3 é baixa,
  4 e 5 média, 6 ou mais alta. O detalhe mostra a conta. **Não é Machine Learning nem
  avaliação oficial de segurança.**
- **Alerta Bridge** por subprefeitura considera as ocorrências abertas dos últimos 30 dias:
  mais relatos e mais gravidade aumentam o índice (Atenção a partir de 45; Alerta a partir de
  90 com pelo menos 3 de prioridade alta). **Não é alerta oficial**, e o app diz isso junto
  do nível.
- Regras completas em [`docs/REGRAS_DE_NEGOCIO.md`](docs/REGRAS_DE_NEGOCIO.md).

### Confirmação, acompanhamento e aviso

- **"Eu também vi":** soma o relato da pessoa a uma ocorrência aberta de outra pessoa, uma
  vez por pessoa, e pode ser desfeito. Não muda a prioridade.
- **Andamento:** o que a pessoa registrou ou confirmou, com as etapas (aberta → em análise →
  em andamento → resolvida), a linha do tempo da equipe e o selo "Atualizada" quando há
  novidade desde a última visita. O aviso de atualização aparece dentro do app (sem
  notificação push).
- **"Ainda não foi resolvido? Avise":** nas ocorrências resolvidas, a pessoa avisa que o
  problema continua. O aviso fica registrado para a equipe, mas não reabre a ocorrência.

### Análises

- Indicadores: total registrado, % resolvidas, tempo médio até resolver e regiões em alerta.
- Gráficos: por categoria, evolução semanal (registradas × resolvidas, com leitura ao tocar e
  tabela) e as 5 regiões com mais relatos.

### Perfil

- Participação da pessoa: registradas, confirmadas, resolvidas que acompanha e avisos.
- Trocar o apelido e criar uma nova identificação.
- **Texto maior** (aumenta letras e espaçamento, inclusive nas abas e nos títulos) e **avisos de
  atualização no app**, guardados
  no aparelho.
- Páginas informativas e a equipe (nomes vindos do `authors` do `package.json`).

## Modos Ao vivo e Exemplo

- **Ao vivo** mostra só os registros reais. O app sempre abre nele.
- **Exemplo · 4 meses** (Mapa e Análises) mostra cerca de 1.200 ocorrências **fictícias** dos
  últimos 120 dias, geradas por script no backend, para demonstrar o app com volume.
  - Tudo que é fictício aparece com a faixa "DADOS FICTÍCIOS de demonstração", e o
    compartilhamento começa com "[DADO FICTÍCIO]".
  - Real e fictício nunca se misturam: resposta de um modo nunca aparece no outro.
  - Para voltar ao real basta tocar em "Ao vivo".

## Recursos nativos e permissões

| Recurso | Uso | Permissão |
|---|---|---|
| **Localização** (`expo-location`) | Posição no mapa, bairro no Início e local do registro | Pedida só quando a pessoa toca em "Ativar localização", no alvo do mapa ou ao registrar. Sem permissão, o app explica e abre no centro de São Paulo. **Nunca usa coordenadas inventadas** |
| **Endereço** (geocodificação do aparelho) | Sugere o endereço do ponto escolhido | Sem chave nem serviço pago; limite de 8 s |
| **Câmera e galeria** (`expo-image-picker`) | Foto da ocorrência | Pedida só ao tocar em "Tirar foto"; se bloqueada, oferece "Abrir Ajustes". Cancelar não é erro |
| **Mapa** (`react-native-maps`) | Mapa real, pontos, densidade, cartão | Incluído no Expo Go, sem chave de API |
| **Vibração leve** (`expo-haptics`) | Confirma ações como "Eu também vi" | Não precisa |

## Acessibilidade e linguagem

- Gravidade e estados indicados por **forma, ícone e texto**, nunca só por cor.
- Alto contraste, fonte legível (Overpass) e o ajuste **Texto maior**.
- Botões com área de toque padrão de 48 pontos e rótulos para leitores de tela nos botões e
  nos marcadores do mapa.
- Linguagem simples, sem termos técnicos; erros dizem o que aconteceu e como resolver.

## Privacidade e dados

- Sem dados pessoais: a identificação é um apelido + um código (UUID) salvos no aparelho.
- O código da pessoa vai sempre no cabeçalho `X-Identificacao-Id`, **nunca na URL**.
- A foto vai como arquivo; o servidor valida o conteúdo e remove os metadados (EXIF).
- O app não contém senha, token administrativo nem credencial de banco. A única
  configuração é a URL pública da API (`EXPO_PUBLIC_API_URL`).

## Tecnologias

| Item | Versão |
|---|---|
| Expo SDK | 58 (`expo ~58.0.25`) |
| React Native / React | 0.88.1 / 19.3.0 |
| TypeScript | 6.0, modo `strict` + `noUncheckedIndexedAccess` |
| Navegação | Expo Router (abas, pilha, modal e folha) |
| Mapa | `react-native-maps` 1.29.11 |
| Gráficos | `react-native-svg` 15.16.0 |
| Armazenamento no aparelho | `@react-native-async-storage/async-storage` 2.2.0 |
| Recursos nativos | `expo-location`, `expo-image-picker`, `expo-haptics`, `expo-file-system` |

## Organização do código

```
mobile/src/
├── app/             # telas (rotas do Expo Router)
├── components/      # componentes visuais; mapa/ e registro/
├── services/        # comunicação com a API e recursos nativos
├── validation/      # funções puras: formulário, apelido, rotas, URL, respostas da API
├── geo/             # funções puras de mapa: agrupamento, toque, distância, densidade, endereço
├── registro/        # etapas do registro (redutor puro)
├── acompanhamento/  # selo "Atualizada", avisos, etapas, detalhe, compartilhamento
├── analises/        # escalas e textos dos gráficos
├── alertas/         # textos e escolha do Alerta Bridge
├── preferencias/    # Texto maior e avisos no app
├── conteudo/        # páginas informativas e equipe
├── context/         # identificação e preferências (estado global)
├── hooks/           # atualização periódica, cartão do mapa
├── models/          # tipos do domínio
├── config/ theme/ utils/
```

A regra do app fica em **funções puras** (sem tela), testadas com `node --test`.

## Qualidade

- `tsc --noEmit` sem erros, **nenhum `any`** nem `@ts-ignore`.
- **138 testes** de funções puras passando (`npm test`).
- ESLint sem problemas e `expo-doctor` 20/20.
- Evidência: [`docs/evidencias/2026-11-13_verificacao-mobile-fase3.txt`](docs/evidencias/2026-11-13_verificacao-mobile-fase3.txt).

## Limitações

- Identificação não é login: quem usar o mesmo celular usa a mesma identificação.
- Sem modo offline: sem conexão, o app mostra o erro e permite tentar de novo; o que foi
  digitado continua no formulário.
- Testado em iPhone pelo Expo Go, em modo retrato e tema claro; Android não foi testado em
  aparelho físico. No Android, a foto em tela cheia aparece sem zoom de pinça.
- **Sugestão da IA:** um classificador de texto (pasta `ia_ml/`) sugere a categoria pelo título e
  pela descrição, com a confiança. Foi treinado com dados sintéticos, pode errar e não olha a foto; nunca muda a
  categoria escolhida nem a prioridade. Registros feitos antes de o modelo ser ativado aparecem como
  "Análise de IA indisponível" até alguém rodar `backend/scripts/analisar_ia.py`.
