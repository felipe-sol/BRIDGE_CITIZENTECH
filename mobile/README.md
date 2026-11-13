# Bridge — app mobile

> **FIAP · Global Solution 2026.2 · CitizenTech · Mobile Development & IOT**
> App nativo em **React Native + Expo (Expo Go)** com **TypeScript estrito**. Sem WebView.

O app é a porta de entrada do cidadão no Bridge. A pessoa se identifica com um apelido,
vê no **mapa real de São Paulo**, com a **localização real** dela, o que já foi
registrado, e registra problemas da rua em etapas: local no mapa, categoria, foto e
detalhes. Se alguém já registrou o mesmo problema a poucos metros, ela **confirma**
("eu também vi") em vez de duplicar, e depois **acompanha** cada atualização da equipe
responsável numa linha do tempo.

## Ficha da CitizenTech

| Campo | Conteúdo |
|---|---|
| Nome | Bridge |
| Cidade e bairro | São Paulo (SP) — bairro: **[PREENCHER pela equipe: bairro real observado]** |
| Público / cidadão beneficiado | Pedestres que dependem da calçada — em especial pessoas com deficiência ou mobilidade reduzida, idosos e quem anda com carrinho de bebê — e moradores que acompanham a zeladoria do bairro |
| Problema, em uma frase | Calçadas quebradas, buracos, postes apagados e obstáculos colocam pedestres em risco, e o cidadão não tem um jeito simples de registrar e acompanhar o problema |
| Solução | App para registrar a ocorrência com foto e localização no mapa, somar o próprio relato ao de outras pessoas e acompanhar o andamento; a API calcula a prioridade por regras transparentes e mantém o histórico de status |
| Benefício esperado | Registro mais completo (foto, coordenadas e endereço), menos duplicatas e acompanhamento visível do andamento; priorização explícita do que afeta a acessibilidade. _Benefício esperado, não medido._ |
| O que cada parte faz | **Mobile:** este app · **SOA:** API REST + PostgreSQL (`../backend`) · **IA & ML:** modelo do colega, ainda não entregue |
| Link do repositório | **[PREENCHER: URL do GitHub]** |
| Indicador de impacto (proposto) | Tempo entre registro e resolução; ocorrências registradas × resolvidas; confirmações por ocorrência |
| ODS | 11 (meta 11.7), 9 (meta 9.1) e 10 (meta 10.2) |

## Integrantes

Também registrados no array `authors` do [`package.json`](package.json).

| Nome completo | RM |
|---|---|
| Leonardo Luiz Jardim Queijo | 559842 |
| Kauã Rodrigues de Souza | 559335 |
| Felipe Santos Marceli | 560456 |
| Enzo Galhardo | 561001 |
| Kauan Diogo | 560727 |

## Telas

Barra de abas: **Início · Mapa · Andamento · Análises · Perfil**. O botão amarelo
"Registrar problema" fica no Início e no Mapa. Mapa e Análises têm dois modos: **Ao vivo**
(dados reais; o app sempre abre nele) e **Exemplo · 4 meses** (dados fictícios de
demonstração, sempre com a faixa "DADOS FICTÍCIOS").

| Tela | Rota (Expo Router) | O que faz |
|---|---|---|
| Identificação | `/identificacao` | Cria o apelido salvo no aparelho (só aparece sem identificação) |
| Início | `/` (aba) | Placa com o bairro e a subprefeitura de onde a pessoa está, faixa do **Alerta Bridge** mais relevante (ou "Sem alertas na sua região"), mapa real pequeno e as ocorrências que ela acompanha |
| Mapa | `/mapa` (aba) | Mapa real (Apple Maps no iPhone) com a localização da pessoa. **Pontos** mostra a gravidade por forma e cor, com agrupamento no zoom afastado. **Densidade** pinta as 32 subprefeituras pelas ocorrências por km². Regiões em **Alerta Bridge** ganham contorno tracejado. Tocar num ponto abre um **cartão completo** (foto que abre em tela cheia com zoom, prioridade, relatos, última atualização da equipe, "Eu também vi" e "Ver detalhe"). Tem busca por região, endereço ou texto, filtros, atualização automática a cada 15 s (Ao vivo) e o modo **Exemplo** |
| Andamento | `/andamento` (aba) | O que a pessoa registrou ou confirmou, com etapas e o selo "Atualizada"; tem estados de carregando, erro e vazio e puxar para atualizar |
| Análises | `/analises` (aba) | Indicadores (registradas, % resolvidas, tempo médio até resolver, regiões em alerta) e gráficos: por categoria, evolução semanal (registradas × resolvidas, com leitura ao tocar e tabela) e regiões com mais relatos; Ao vivo ou Exemplo |
| Perfil | `/perfil` (aba) | Apelido (com troca), o que a pessoa já fez (registradas, confirmadas, resolvidas que acompanha, avisos), ajustes **Texto maior** e **Avisos de atualização no app**, links para as páginas informativas, versão e criar nova identificação |
| Sobre | `/sobre/[pagina]` | Páginas: como a prioridade é calculada, como funcionam os alertas, privacidade e dados, sobre o Bridge e equipe (nomes vindos de `authors`) |
| Registrar | `/registrar` | Etapas: local no mapa (pino central e endereço sugerido) → categoria → parecidos a até 100 m (confirmar ou "é outro") → foto e detalhes → revisão e envio |
| Detalhe | `/ocorrencias/[id]` | Foto (toque → tela cheia com zoom), local no mapa, prioridade e justificativa, "Eu também vi", **"Ainda não foi resolvido? Avise"** nas resolvidas, linha do tempo com a equipe responsável, compartilhar e análise de IA |
| Região | `/regiao/[codigo]` | Folha com os números de uma subprefeitura (total, abertas, alta gravidade, resolvidas, densidade) e o nível do Alerta Bridge com o motivo |

## Tecnologias

| Item | Versão |
|---|---|
| Expo SDK | 58 (`expo ~58.0.25`) — **o Expo Go do celular precisa suportar o SDK 58** |
| React Native / React | 0.88.1 / 19.3.0 |
| TypeScript | 6.0 (modo `strict` + `noUncheckedIndexedAccess`) |
| Navegação | Expo Router (abas, pilha, modal e folha nativa) |
| Mapa | `react-native-maps` 1.29.11, incluído no Expo Go: Apple Maps no iPhone, Google Maps no Android, sem chave de API |
| Persistência local | `@react-native-async-storage/async-storage` 2.2.0 |
| Recursos nativos | `expo-location` (GPS e geocodificação do próprio aparelho), `expo-image-picker` (câmera), `expo-haptics` (vibração leve) |
| Visual | `@expo-google-fonts/overpass` (fonte Overpass, licença OFL), `@expo/vector-icons` e `react-native-svg` 15.16.0 (gráficos e listras da faixa de alerta) |
| Upload | `expo-file-system` (`File`) + `FormData` + `expo/fetch` |

Testado com Node.js 24.19 e npm 11.

## Instalação e execução

```bash
cd mobile
npm ci                       # instala exatamente o package-lock.json
cp .env.example .env         # Windows: Copy-Item .env.example .env
# edite .env: EXPO_PUBLIC_API_URL=http://<IP-do-computador>:8000
npx expo start -c            # -c limpa o cache (necessário ao mudar o .env)
```

Abra o **Expo Go** no celular e leia o QR Code (Android: pelo Expo Go; iOS: pela câmera)
ou digite o endereço `exp://<IP>:8081` em "Enter URL manually". No iPhone, se o Expo Go
estiver logado numa conta Expo, faça login na mesma conta no computador
(`npx expo login`; no PowerShell use `npx.cmd`) ou saia da conta no Expo Go.

> **Projeto dentro do OneDrive (Windows):** o OneDrive pode transformar arquivos do
> `node_modules` em arquivos "da nuvem", e o Metro passa a falhar com
> `Failed to get the SHA-1`. A solução é apagar `node_modules` e rodar `npm install` de
> novo. O ideal é manter o projeto fora de pastas sincronizadas.

## Configuração e acesso ao backend

- A URL da API fica **só** em `EXPO_PUBLIC_API_URL` (`.env`), lida em
  [`src/config/ambiente.ts`](src/config/ambiente.ts) e validada por
  [`src/validation/urlApi.ts`](src/validation/urlApi.ts).
- **`localhost` no celular é o próprio celular.** Use o IP do computador na rede Wi-Fi
  (Windows: `ipconfig` → "Endereço IPv4"). O app avisa se a URL for `localhost`.
- Inicie a API com `--host 0.0.0.0` e libere as portas 8000 (API) e 8081 (Expo) no
  firewall **apenas em rede privada**. O passo a passo está no
  [README do backend](../README.md#acesso-pelo-celular-app-mobile). Teste antes no
  navegador do celular: `http://<IP>:8000/health`.
- O túnel do Expo publica só o app, **não** a API.
- Variáveis `EXPO_PUBLIC_*` são **públicas** (ficam no app). O app não contém senha,
  token administrativo nem credencial de banco.

## Recursos nativos e permissões

- **Localização** (`expo-location`, só em primeiro plano):
  - Início e Mapa **não pedem** a permissão ao abrir: só leem a posição se ela já foi
    dada. O pedido aparece quando a pessoa toca em "Ativar localização" ou no alvo do
    mapa, ou quando começa um registro.
  - Sem permissão ou com o GPS desligado, o app explica o motivo, abre no centro de São
    Paulo e deixa a pessoa arrastar o mapa.
  - **Nunca preenche coordenadas fictícias.**
- **Endereço**: vem da geocodificação **do próprio aparelho** (Apple no iPhone), sem chave
  nem serviço pago. É sugerido e editável. Se falhar ou demorar (8 s), fica em branco e
  não trava o envio.
- **Câmera** (`expo-image-picker`):
  - A permissão só é pedida ao tocar em "Tirar foto". Se estiver bloqueada, o app oferece
    "Abrir Ajustes".
  - Cancelar a câmera não é erro: a foto é opcional.
  - Alternativa: escolher uma foto da galeria.
- A foto é enviada como **arquivo** (multipart). O servidor valida o conteúdo e remove
  o EXIF.

## Verificação

```bash
npx tsc --noEmit     # tipos (deve terminar sem erros)
npm test             # funções puras (node --test, sem dependências extras)
npm run lint         # ESLint (eslint-config-expo)
npx expo-doctor      # compatibilidade das dependências com o SDK
```

Resultados em `../docs/evidencias/2026-11-13_verificacao-mobile-fase3.txt`:
- `tsc` sem erros e ESLint sem problemas;
- **106/106 testes**;
- expo-doctor 20/20;
- bundle iOS gerado;
- nenhum `any` ou `@ts-ignore`;
- nenhum segredo no bundle.

Os testes cobrem: regiões e ponto em polígono, agrupamento do mapa (no máximo 64 itens),
distâncias, densidade, enquadramento, endereço, etapas do registro, selo "Atualizada",
compartilhamento (inclusive o rótulo de dado fictício), validação do formulário, parsers
das respostas da API, regra de exibição do alerta no Início, modo Ao vivo/Exemplo (resposta
de outro modo é descartada) e as escalas e textos dos gráficos.

## Estrutura

```
src/
├── app/             # telas (rotas do Expo Router): (tabs)/, registrar, ocorrencias/[id], regiao/[codigo], identificacao
├── components/      # componentes visuais (Texto, Icone, MarcadorGravidade, LinhaDoTempo…) e mapa/, registro/
├── geo/             # funções puras de mapa: regiões, agrupamento, distância, densidade, endereço
├── registro/        # redutor puro das etapas do registro
├── acompanhamento/  # selo "Atualizada", avisos no app, etapas, detalhe ("ainda não resolvido"), compartilhamento
├── conteudo/        # páginas informativas do Perfil e equipe (de `authors`)
├── preferencias/    # Texto maior e avisos no app (guardados no aparelho)
├── alertas/         # Alerta Bridge: texto do motivo e qual alerta o Início mostra
├── analises/        # escalas, marcas de eixo e resumos em texto dos gráficos
├── hooks/           # atualização periódica do "ao vivo"
├── context/         # IdentificacaoContext (estado global da identificação)
├── services/        # http, ocorrências, regiões, estatísticas, geocodificação, câmera, localização, vistos
├── validation/      # funções puras: formulário, apelido, rotas, URL, parsers das respostas e das regiões
├── models/          # tipos do domínio
├── config/          # leitura da URL da API
├── theme/           # cores, fontes, espaçamentos, sombras
└── utils/           # formatação e tempo limite
```

## Limitações reais

- **Identificação não é login:** apelido + UUID guardados no aparelho, sem senha. Quem
  usar o mesmo celular usa a mesma identificação.
- **Modo Exemplo** mostra dados **fictícios** (gerados por script no backend), sempre
  rotulados. Para voltar ao real basta tocar em "Ao vivo"; no servidor,
  `scripts/dados_ficticios.py remover` apaga só os fictícios.
- **Alerta Bridge** é calculado automaticamente a partir dos relatos. Não é alerta oficial.
- **"Ao vivo"** é uma consulta a cada 15 s com a tela aberta. Não é instantâneo, e o
  mapa mostra "atualizado há X s".
- **No mapa**, cada área visível recebe até 2000 ocorrências, as mais graves primeiro;
  acima disso o app avisa e pede para aproximar.
- **Status** quem muda é a equipe responsável do projeto (rota administrativa). Não há
  integração oficial com a Prefeitura nem notificação push. O aviso de atualização
  aparece dentro do app.
- **IA:** o modelo do colega ainda não foi entregue. O detalhe mostra "Análise
  indisponível" e nada é inventado.
- **Testes no aparelho:**
  - a versão 1.0 foi testada pela equipe num iPhone pelo Expo Go em 12/11/2026, e as fases 1
    e 2 do Bridge 2.0 em 13/11/2026;
  - **a fase 3 (Perfil completo, "ainda não foi resolvido", cartão do mapa com foto) ainda
    precisa do teste manual no iPhone**;
  - o zoom de pinça da foto em tela cheia usa o recurso do iOS; no Android a foto aparece
    inteira, sem zoom;
  - Android não foi testado em aparelho físico.
- Sem modo offline: sem conexão, o app mostra o erro e permite tentar de novo. Os dados
  digitados continuam no formulário.
- Testado apenas em modo retrato e tema claro.

## Relação com o backend

O app consome a API REST do repositório Bridge (pasta `backend/`, entrega de SOA).
O contrato está em `docs/CONTRATO_API.md` do repositório. Rotas usadas:
- `/ocorrencias` (busca por texto) e `/ocorrencias/mapa` (pontos da área visível);
- `/ocorrencias/minhas`;
- `/ocorrencias/proximas`;
- `/ocorrencias/{id}`;
- `/ocorrencias/{id}/confirmacoes` e `/ocorrencias/{id}/nao-resolvido`;
- `/ocorrencias/{id}/imagem`;
- `/regioes`;
- `/estatisticas/regioes` e `/estatisticas/resumo`;
- `/identificacoes`, `/identificacoes/atual` (consultar e trocar apelido) e
  `/identificacoes/atual/participacao`.

O UUID da identificação vai sempre no cabeçalho `X-Identificacao-Id`, nunca na URL.
As decisões de projeto estão em [`DECISOES.md`](DECISOES.md).
