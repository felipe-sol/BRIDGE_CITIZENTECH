# Decisões de projeto — app mobile Bridge

## 1. Arquitetura em camadas

As telas (`src/app/`) cuidam só do estado de tela. Rede, armazenamento e recursos
nativos ficam em `src/services/`. Regras e cálculos são **funções puras**, sem React e
sem rede:
- `validation/`: formulários e parsers das respostas;
- `geo/`: regiões, agrupamento e densidade;
- `registro/`: as etapas do registro;
- `acompanhamento/`: selo "Atualizada", avisos e compartilhamento;
- `alertas/`, `analises/`, `conteudo/` e `preferencias/`.

Por serem puras, elas são testadas com `node --test` (106 testes), sem Jest. Os tipos
usam `camelCase`, e a conversão do `snake_case` da API acontece num lugar só.

## 2. Navegação: Expo Router

Uma única solução: **abas** (Início, Mapa, Andamento, Análises, Perfil), **pilha** para o
detalhe e as páginas do Perfil, **modal** em tela cheia para o registro e **folha nativa**
do iOS (`formSheet`) para o resumo de uma região.

`Stack.Protected` decide o que fica acessível: sem identificação, só a tela de
identificação; com ela, o resto. Não usamos *typed routes* (dependem de arquivos
gerados fora do ZIP). Os caminhos ficam em `ROTAS`, e os parâmetros (`id`, `codigo`)
são validados antes do uso.

## 3. Identificação e privacidade

`POST /identificacoes` gera um UUID e o app guarda `{id, apelido}` no AsyncStorage,
validando o JSON salvo com o mesmo parser da rede. A interface diz que **não é login**.

O UUID funciona como uma credencial fraca, por isso vai sempre no **cabeçalho**
`X-Identificacao-Id` (conferência ao abrir, lista "minhas", confirmação, foto), nunca na
URL, que aparece em logs de acesso. As respostas públicas não trazem o autor.

## 4. Services, erros e TypeScript

`services/http.ts` aplica tempo limite (15 s; 60 s no upload) e converte falhas em erros
tipados; as telas mostram mensagens sem jargão.

O TypeScript roda com `strict`, `noUncheckedIndexedAccess` e `noImplicitReturns`, sem
`any` nem `@ts-ignore`. Respostas entram como `unknown` e passam por parsers. Estados
de tela são uniões discriminadas, o que obriga a tratar carregando, erro, vazio e ok.

## 5. Mapa real e regiões

**Mapa.** Usamos `react-native-maps`, que já vem no Expo Go e no iPhone usa o Apple
Maps, sem chave de API nem serviço pago.

**Regiões.** Os limites **oficiais** das 32 subprefeituras (GeoSampa) chegam simplificados
por `GET /regioes` e ficam em cache. O app calcula a região de um ponto para exibir; o
servidor calcula de novo para gravar.

**Desempenho.** Com o zoom afastado, os pontos viram grupos numa grade presa ao mapa (no
máximo 64 itens); o app pede a área visível com folga e só pede de novo quando a tela sai dela.

**Densidade.** A camada usa polígonos (heatmap só existe no Google Maps), com faixas
fixas de ocorrências por km² e legenda em texto.

**"Ao vivo".** Uma consulta a cada 15 s com a tela visível, pausada em segundo plano; o
mapa mostra "atualizado há X s", e uma falha de rede **não apaga** o que está na tela
(`aplicarResultadoMapa`, testada).

## 6. Registro em etapas e duplicatas

O fluxo tem as etapas local → categoria → parecidos → detalhes → revisão, num **redutor
puro** testado (incluindo respostas atrasadas e falha de rede).

- **Local.** O pino fica fixo no centro e a pessoa arrasta o mapa. Isso é mais preciso
  que arrastar um marcador pequeno.
- **Endereço.** Vem da geocodificação do aparelho (espera de 600 ms entre consultas);
  é editável e, se falhar, fica em branco.
- **Parecidos.** O app procura abertas da mesma categoria a até 100 m; a pessoa pode
  **confirmar** uma e terminar sem foto nem formulário.
- **Envio** (mantido do 1.0): uma `Idempotency-Key` por registro, trava síncrona contra
  toque duplo e, se só a foto falhar, reenvio **só da foto**, sem recriar a ocorrência.

## 7. Recursos nativos e permissões

Início e Mapa **não pedem** localização ao abrir. Só leem a posição se a permissão já
existe, e o pedido acontece quando a pessoa age ("Ativar localização", alvo do mapa ou
começar um registro). Sem permissão, o mapa abre no centro de São Paulo e continua
utilizável. Nunca preenchemos coordenadas fictícias.

A câmera pede permissão ao tocar em "Tirar foto". Se estiver bloqueada, oferece "Abrir
Ajustes", e a galeria fica como alternativa.

## 8. Acompanhamento (follow-up)

O selo **Atualizada** compara o `atualizado_em` da API com a última vez que a pessoa abriu
a ocorrência (dado só do aparelho); com "Avisos de atualização no app" ligado, o Início e o
Andamento contam as novidades. Não há push: no Expo Go exigiria um serviço externo.

Numa ocorrência resolvida, **"Ainda não foi resolvido? Avise"** soma um aviso sem reabrir
nada: a equipe responsável vê quantas pessoas discordam. No mapa, tocar num ponto abre um
cartão que carrega o detalhe (foto em tela cheia, andamento, "Eu também vi"); a resposta de
um toque antigo é descartada.

## 9. Integração com IA

O app só **exibe** `analise_ia`. Para `INDISPONIVEL`, `PENDENTE` e `FALHOU`, ele diz o
que aconteceu. Nenhuma previsão é fabricada.

## 10. Interface e acessibilidade

A identidade vem da sinalização de São Paulo: **placa azul de rua** no Início, amarelo de
sinalização na ação principal (contraste ≈ 8:1) e a fonte Overpass (OFL).

**Acessibilidade:** a gravidade aparece por **forma e cor** (◆ alta, ● média, ■ baixa),
nunca só cor; áreas de toque têm 48 pt ou mais; há rótulos para leitores de tela; os
skeletons respeitam "reduzir movimento"; a vibração leve só reforça uma ação.

## 11. Segurança

O app não contém segredos: `EXPO_PUBLIC_API_URL` é pública, a rota administrativa não é
usada e a busca no bundle não acha token nem credencial de banco.

## 12. Alerta Bridge, modo Exemplo e gráficos

**Alerta.** O app não calcula o nível: mostra o que a API devolve (abertas dos últimos 30
dias, gravidade e confirmações), sempre com "Alerta Bridge: calculado automaticamente a
partir dos relatos". No mapa, a região em Alerta tem contorno **tracejado**, não só vermelho.

**Exemplo.** Os fictícios ficam no banco como `SIMULADA` e só são pedidos no modo Exemplo.
O modo é um parâmetro de rota e o app sempre abre no Ao vivo. Cada resposta carrega a chave
do pedido e é descartada se o modo mudou: real e fictício nunca se misturam. Toda tela com
dado fictício mostra a faixa, e o compartilhamento começa com "[DADO FICTÍCIO]".

**Gráficos.** `react-native-svg`, sem biblioteca de gráficos; a conta é pura e testada, as
cores passaram num validador para daltonismo, "resolvidas" é tracejada e há resumo em texto
e tabela.

## 13. Perfil e preferências

"Texto maior" (20% a mais, somado ao tamanho do iPhone) e "Avisos no app" ficam só no
aparelho; uma preferência corrompida volta ao padrão. A escala vale para o tamanho **e** a
altura da linha, para nada ficar cortado. Trocar o apelido só grava no aparelho depois do OK
da API, pelo cabeçalho. As páginas informativas são texto puro testado, e a equipe vem de
`authors`: com marcador, nenhum nome aparece.
