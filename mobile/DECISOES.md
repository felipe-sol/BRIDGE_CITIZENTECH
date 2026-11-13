# Decisões de projeto — app mobile Bridge

## 1. Arquitetura em camadas

As telas (`src/app/`) cuidam só do estado de tela. Rede, armazenamento e recursos
nativos ficam em `src/services/`. Regras e cálculos são **funções puras**, sem React e
sem rede:
- `validation/`: formulários e parsers das respostas;
- `geo/`: regiões, agrupamento e densidade;
- `registro/`: as etapas do registro;
- `acompanhamento/`: selo "Atualizada" e compartilhamento.

Por serem puras, elas são testadas com `node --test` (63 testes), sem Jest. Os tipos
usam `camelCase`, e a conversão do `snake_case` da API acontece num lugar só.

## 2. Navegação: Expo Router

Uma única solução de navegação:
- **abas** (Início, Mapa, Andamento, Perfil);
- **pilha** para o detalhe;
- **modal** em tela cheia para o registro;
- **folha nativa** do iOS (`formSheet`) para o resumo de uma região.

`Stack.Protected` decide o que fica acessível: sem identificação, só a tela de
identificação; com ela, o resto. Não usamos *typed routes* (dependem de arquivos
gerados fora do ZIP). Os caminhos ficam em `ROTAS`, e os parâmetros (`id`, `codigo`)
são validados antes do uso.

## 3. Identificação e privacidade

`POST /identificacoes` gera um UUID e o app guarda `{id, apelido}` no AsyncStorage,
validando o JSON salvo com o mesmo parser da rede. A interface diz que **não é login**.

O UUID funciona como uma credencial fraca, por isso vai sempre no **cabeçalho**
`X-Identificacao-Id` (lista "minhas", confirmação, foto), nunca na URL, que aparece em
logs de acesso. As respostas públicas não trazem o autor.

## 4. Services, erros e TypeScript

`services/http.ts` aplica tempo limite (15 s; 60 s no upload) e converte falhas em erros
tipados (`ErroApi`, `ErroRede`, `ErroRespostaInvalida`, `ErroConfiguracao`). As telas
mostram mensagens sem jargão.

O TypeScript roda com `strict`, `noUncheckedIndexedAccess` e `noImplicitReturns`, sem
`any` nem `@ts-ignore`. Respostas entram como `unknown` e passam por parsers. Estados
de tela são uniões discriminadas, o que obriga a tratar carregando, erro, vazio e ok.

## 5. Mapa real e regiões

**Mapa.** Usamos `react-native-maps`, que já vem no Expo Go e no iPhone usa o Apple
Maps, sem chave de API nem serviço pago.

**Regiões.** Os limites são os **oficiais** das 32 subprefeituras (GeoSampa,
Prefeitura de São Paulo). Chegam simplificados por `GET /regioes` e ficam em cache no
aparelho. O app calcula localmente a região de um ponto (ponto-em-polígono), por
exemplo para mostrar "Subprefeitura Pinheiros" no Início. O servidor calcula de novo
para gravar.

**Desempenho.** Com o zoom afastado, os pontos são agrupados numa grade 8×8 da área
visível. O mapa desenha no máximo 64 itens, e os marcadores usam
`tracksViewChanges={false}`.

**Densidade.** A camada usa polígonos (heatmap só existe no Google Maps), com faixas
fixas de ocorrências por km² e legenda em texto.

**"Ao vivo".** É honesto: uma consulta a cada 15 s com a tela visível. Ela pausa em
segundo plano e fora da aba, e o mapa mostra "atualizado há X s". Uma falha de rede
**não apaga** o que está na tela; só aparece uma faixa de erro (`aplicarResultadoMapa`,
testada).

## 6. Registro em etapas e duplicatas

O fluxo tem as etapas local → categoria → parecidos → detalhes → revisão, num **redutor
puro** testado (incluindo respostas atrasadas e falha de rede).

- **Local.** O pino fica fixo no centro e a pessoa arrasta o mapa. Isso é mais preciso
  que arrastar um marcador pequeno.
- **Endereço.** Vem da geocodificação do aparelho, com espera de 600 ms entre
  consultas, como pede a documentação do SDK. Ele é editável e, se falhar, fica em
  branco.
- **Parecidos.** Com local e categoria, o app procura ocorrências abertas da mesma
  categoria a até 100 m. A pessoa pode **confirmar** uma delas e terminar sem foto nem
  formulário. Se a consulta falhar, segue com aviso.
- **Envio** (mantido do 1.0):
  - uma `Idempotency-Key` por registro;
  - trava síncrona contra toque duplo (`useRef`);
  - se só a foto falhar, o app reenvia **só a foto**, sem recriar a ocorrência.

## 7. Recursos nativos e permissões

Início e Mapa **não pedem** localização ao abrir. Só leem a posição se a permissão já
existe, e o pedido acontece quando a pessoa age ("Ativar localização", alvo do mapa ou
começar um registro). Sem permissão, o mapa abre no centro de São Paulo e continua
utilizável. Nunca preenchemos coordenadas fictícias.

A câmera pede permissão ao tocar em "Tirar foto". Se estiver bloqueada, oferece "Abrir
Ajustes", e a galeria fica como alternativa.

## 8. Acompanhamento (follow-up)

A aba Andamento lista o que a pessoa registrou e o que confirmou. O selo **Atualizada**
compara o `atualizado_em` da API com a última vez que a pessoa abriu aquela ocorrência,
dado guardado só no aparelho. O detalhe mostra a linha do tempo com os comentários da
"equipe responsável", sem sugerir integração oficial com a Prefeitura.

Não usamos notificação push: no Expo Go ela exigiria um serviço externo.

## 9. Integração com IA

O app só **exibe** `analise_ia`. Para `INDISPONIVEL`, `PENDENTE` e `FALHOU`, ele diz o
que aconteceu. Nenhuma previsão é fabricada.

## 10. Interface e acessibilidade

A identidade vem da sinalização de São Paulo:
- o cabeçalho do Início imita a **placa azul de rua**;
- a ação principal usa o amarelo de sinalização (contraste ≈ 8:1);
- a fonte é Overpass (OFL), derivada das letras de placas.

**Acessibilidade:**
- a gravidade aparece por **forma e cor** (◆ alta, ● média, ■ baixa), nunca só cor;
- áreas de toque têm 48 pt ou mais;
- há rótulos para leitores de tela;
- os skeletons de carregamento respeitam "reduzir movimento";
- a vibração leve só reforça uma ação.

## 11. Segurança

O app não contém segredos. `EXPO_PUBLIC_API_URL` é pública por definição, a rota
administrativa não é usada e a busca no bundle não encontra token nem credencial de
banco.
