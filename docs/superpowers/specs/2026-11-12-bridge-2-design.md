# Bridge 2.0 — design (app do cidadão + API)

_Escrito em 12/11/2026, a partir da conversa com a equipe e dos esboços aprovados
(direção "A · Painel da minha região" e as abas Mapa, Andamento, Análises e Perfil)._

## 1. Intenção

O Bridge 1.0 funciona: registra, prioriza por regra e mostra o status de cada ocorrência.
A equipe quer que o app pareça e funcione como um produto de verdade para o
**cidadão**. A tela é sempre a do usuário, não a da prefeitura. Isso significa:

- **ver a cidade real**: um mapa de verdade de São Paulo, com a localização real da pessoa;
- **saber o que já foi relatado** perto dela e **somar o próprio relato** ao de outras
  pessoas, em vez de criar duplicatas;
- **acompanhar** se o problema foi resolvido (o follow-up), vendo cada atualização da
  equipe responsável;
- **entender a situação da cidade**: onde há mais problemas, quais regiões estão em
  alerta e como isso evoluiu. Para isso o app tem um conjunto de **dados fictícios de
  4 meses**, sempre rotulado, que mostra como o painel fica com volume.

O motivo: o app vai para avaliação (Mobile e SOA) e para um vídeo de até 2 minutos. Ele
precisa impressionar sem mentir. Tudo o que é simulado aparece como simulado.

## 2. Objetivos, não-objetivos e antiobjetivos

**Objetivos**
1. Mapa real (Apple Maps no iPhone pelo Expo Go), centrado na **localização real** da
   pessoa, com as ocorrências nas coordenadas reais.
2. Endereço preenchido automaticamente a partir da localização (geocodificação reversa
   do próprio aparelho), e a região oficial (subprefeitura) calculada pelo servidor.
3. Registro sem duplicatas: ao registrar, o app mostra ocorrências abertas parecidas a
   poucos metros dali. A pessoa pode **confirmar** uma delas ("eu também vi") em vez de
   criar outra.
4. Alertas por região: **quanto mais relatos e maior a gravidade**, maior o nível
   (Normal → Atenção → Alerta). A regra é determinística e documentada.
5. Follow-up: aba Andamento com o que a pessoa registrou e confirmou, linha do tempo com
   os comentários da equipe responsável e o selo **Atualizada**.
6. Mapa e Análises com dois modos: **Ao vivo** (dados reais do banco, atualizados a cada
   15 s) e **Exemplo** (dados fictícios de 4 meses, com faixa permanente
   "DADOS FICTÍCIOS").
7. Camada de **densidade por região**: as 32 subprefeituras com os limites oficiais,
   pintadas pela quantidade de ocorrências por km².
8. Interface muito mais polida, seguindo os esboços aprovados.

**Não-objetivos (ficam fora desta versão)**
- Notificação push. O aviso de atualização acontece dentro do app.
- Tela de operador ou prefeitura dentro do app. A mudança de status continua pela rota
  administrativa protegida por token (Insomnia), e na demo alguém da equipe faz esse papel.
- Integração oficial com a Prefeitura ou com qualquer órgão.
- Densidade por população (não há dado populacional no projeto). A densidade é de
  ocorrências por km².
- Modo escuro, modo offline completo, contas com senha e versão web.
- Mapa de calor contínuo (heatmap), que no react-native-maps só existe com Google Maps.
  A densidade é feita com os polígonos das regiões.

**Antiobjetivos (seria um fracasso mesmo funcionando)**
- Dado fictício que possa ser confundido com dado real, em qualquer tela.
- Chamar o alerta do Bridge de oficial ("Defesa Civil", "Prefeitura").
- Token administrativo ou segredo dentro do app.
- Quebrar o que já foi verificado: idempotência, validação de upload, transições,
  migrações 0001/0002 e testes atuais.
- Feature que só funciona com dev build (fora do Expo Go).

## 3. Restrições

- **Expo Go, SDK 58.** Só bibliotecas da lista do SDK (`expo/bundledNativeModules.json`).
  Já conferido: `react-native-maps` 1.29.11, `react-native-svg` 15.16.0,
  `expo-haptics`, `expo-font`, `expo-image` e `@expo/vector-icons`. O Expo Router tem o
  layout `Tabs`. A fonte é Overpass (`@expo-google-fonts/overpass`, OFL), inspirada nas
  placas de rodovia e alinhada à identidade de sinalização urbana.
- **TypeScript estrito**, sem `any`, `@ts-ignore` ou relaxamento do tsconfig;
  `tsc --noEmit`, ESLint e `npm test` limpos.
- **Backend**: toda mudança de esquema vai em migração Alembic nova (`0003`), testada em
  banco vazio (`upgrade`, `check`, `downgrade`), sem `create_all`.
- **Sem serviços pagos e sem chaves de API.** Mapas e geocodificação usam o próprio
  aparelho (Apple no iPhone).
- **Os requisitos do PDF continuam atendidos**: ≥ 3 telas com navegação, lista com
  estados de carregando, erro e vazio, formulário validado, identificação lembrada,
  recurso nativo com permissão tratada, `services/` e validação pura, README e
  DECISOES.md com no máximo 2 páginas.
- **Prazos**: meta interna em 15/11/2026; entrega oficial em 19/11/2026 às 23h55.

## 4. O que foi decidido com a equipe

- Direção visual **A**: o app abre num painel da região da pessoa, com mapa e dados em
  abas próprias. A identidade atual (azul de placa de rua, amarelo de sinalização,
  asfalto e concreto) é mantida, bem mais polida.
- Barra de abas: **Início · Mapa · Andamento · Análises · Perfil**. O botão amarelo
  "Registrar problema" flutua no Início e no Mapa.
- O mapa e a localização da pessoa são **reais** (o esboço era só esboço).
- O follow-up é acompanhar **se a equipe responsável resolveu**, pela tela do cidadão.
- Os alertas sobem com o **número de relatos e a gravidade**.
- Mapa e Análises têm **Ao vivo** e **Exemplo com dados fictícios de 4 meses**, com
  densidade por região de São Paulo.

## 5. Experiência, aba por aba

### Início
- **Cabeçalho tipo placa de rua** com o bairro atual, vindo da geocodificação reversa
  da posição real, e a subprefeitura. Sem permissão de localização, o cabeçalho mostra
  "São Paulo" e um botão para ativar.
- **Faixa de alerta**, com listras de sinalização, para a região em alerta mais próxima
  da pessoa (dados ao vivo). Se não houver alerta, aparece "Sem alertas na sua região".
- **Mapa pequeno, real**, centrado na pessoa. Tocar nele abre a aba Mapa.
- **"Acompanhando"**: até 3 cartões das ocorrências dela, com o selo Atualizada.
- Se ainda não houver dados reais, um cartão convida a ver o mapa no modo Exemplo.

### Mapa
- Mapa real em tela cheia, com o ponto azul da pessoa e um botão para centralizar nela.
  A visão inicial é a posição dela ou, sem permissão, o centro de São Paulo.
- **Busca**:
  1. Por **endereço**, com geocodificação do aparelho, limitada a São Paulo.
  2. Por **nome de região** (subprefeitura), que enquadra o polígono.
  3. Por **texto das ocorrências** (`q` na API).
- **Filtros**: categoria, gravidade e status.
- **Ao vivo / Exemplo**. No Ao vivo, o mapa atualiza a cada 15 s enquanto a tela está
  visível e mostra "Atualizado há X s". No Exemplo, a faixa "DADOS FICTÍCIOS de
  demonstração" fica fixa.
- **Pontos / Densidade**:
  - Nos **Pontos**, cada ocorrência tem forma e cor pela gravidade (◆ alta, ● média,
    ■ baixa) e ícone pela categoria. Com zoom afastado, os pontos viram **agrupamentos
    com contagem**, por uma função pura e testada.
  - Na **Densidade**, as 32 subprefeituras são pintadas por faixa de ocorrências/km²,
    com legenda. As regiões em **Alerta** ganham contorno tracejado.
- Tocar numa região abre uma **folha** (sheet nativa do iOS) com o resumo: total,
  abertas, alta gravidade, resolvidas, nível de alerta e por quê.
- Tocar num ponto abre um cartão com o resumo e o link para o detalhe.

### Registrar (fluxo em etapas, com o botão amarelo)
1. **Local**: mapa real com **pino fixo no centro**, começando na posição real da pessoa.
   Ela arrasta o mapa até o lugar exato. O endereço é atualizado pela geocodificação
   reversa e a subprefeitura aparece quando conhecida. Posição ausente e coordenadas
   (0, 0) continuam bloqueadas.
2. **O que você viu?**: categoria em blocos grandes com ícone.
3. **Parecidos por perto**: com local e categoria definidos, o app consulta
   `/ocorrencias/proximas`.
   - Se houver uma ocorrência aberta da mesma categoria a até 100 m, o app mostra:
     "Já registraram algo parecido a 40 m. É o mesmo problema?"
   - **Confirmar**: soma o relato da pessoa a essa ocorrência e termina ali, sem foto
     nem formulário. A ocorrência passa a aparecer no Andamento dela.
   - **É outro**: segue o fluxo normalmente.
4. **Foto e detalhes**:
   - foto pela câmera ou galeria, opcional, com a validação atual;
   - título (sugerido pela categoria e editável);
   - descrição;
   - as três situações (risco, bloqueio, acessibilidade).
5. **Revisar e enviar**: mantém o fluxo atual de idempotência e reenvio só da foto. Ao
   final, mostra a prioridade calculada pelo servidor e a justificativa.

A subprefeitura mostrada no app (no Início e no Registrar) é calculada **no próprio
aparelho**. O app baixa o GeoJSON de `/regioes` uma vez, guarda em cache e usa uma função
pura de ponto-em-polígono, testada com os mesmos pontos do backend. No banco, quem grava
a região é o servidor.

### Andamento
- Dois filtros: **Registrei** e **Confirmei**.
- Cada cartão mostra:
  - o status com forma e cor;
  - a etapa atual numa barra de 4 passos;
  - quantas pessoas relataram;
  - o selo **Atualizada** quando `atualizado_em` é mais recente que a última vez que a
    pessoa abriu aquela ocorrência (guardado no aparelho).
- Mantém os estados de **carregando, erro e vazio** exigidos pelo PDF.
- **Detalhe da ocorrência**:
  - foto, título, endereço, região e mapa real pequeno com o pino;
  - **linha do tempo** com data e comentário da equipe responsável;
  - prioridade e justificativa;
  - número de confirmações e o botão **"Eu também vi"** (quando não é dela e está aberta);
  - **Compartilhar**, pelo menu nativo, com um texto-resumo;
  - em ocorrências resolvidas, **"Ainda não foi resolvido? Avise"** (fase 3, ver §7).

### Análises
- Modo **Ao vivo**, com todos os dados reais desde o início (ainda são poucos), e modo
  **Exemplo · 4 meses**, com a faixa de dados fictícios.
- Indicadores: total, % resolvidas, tempo médio até resolver e alertas ativos.
- Gráficos com `react-native-svg`, sem biblioteca de gráficos:
  - por categoria;
  - evolução semanal, com registradas e resolvidas;
  - ranking das regiões com mais relatos.
- Cada gráfico tem um resumo em texto para leitores de tela.

### Perfil
- Apelido, iniciais e o que a pessoa já fez: registros, confirmações e quantos foram
  resolvidos.
- Ajustes guardados no aparelho:
  - **Texto maior**, que aplica uma escala em todo o app;
  - **Avisos de atualização no app**;
  - **Trocar apelido**.
- Páginas: "Como a prioridade é calculada", "Como funcionam os alertas",
  "Privacidade e dados" e "Sobre o Bridge e equipe". A lista de integrantes vem de
  `authors` no package.json, uma fonte só.

### Acabamento visual (vale para todas as abas)
- Fonte Overpass e ícones `@expo/vector-icons`.
- Toques com vibração leve (`expo-haptics`) nas ações principais.
- Skeletons no carregamento e puxar para atualizar.
- Folhas nativas do iOS (`presentation: 'formSheet'`) para resumos e confirmações.
- Áreas de toque de 48 pt ou mais, contraste mantido e gravidade nunca indicada só
  por cor.

## 6. Regras de negócio novas

**Confirmação ("eu também vi")**
- Cada identificação confirma uma ocorrência no máximo uma vez. Repetir devolve o
  mesmo resultado, sem duplicar.
- Não é possível confirmar a própria ocorrência nem uma já encerrada (Resolvida ou
  Rejeitada).
- A pessoa pode desfazer a confirmação.
- A confirmação **não muda a prioridade** da ocorrência. A regra 1.0 continua igual e
  testada. A confirmação conta para o **alerta da região** e aparece como "N pessoas
  relataram".

**Alerta da região**
- Calculado por subprefeitura, considerando as ocorrências **abertas** (não encerradas)
  criadas nos últimos 30 dias.
- Índice = Σ (pontuação de prioridade da ocorrência + mín(confirmações, 5)).
- **Atenção** quando índice ≥ L1. **Alerta** quando índice ≥ L2 **e** há pelo menos 3
  ocorrências abertas de prioridade alta.
- L1 e L2 são calibrados com os dados de exemplo, registrados em `REGRAS_DE_NEGOCIO.md`
  e cobertos por testes com casos fixos.
- O texto no app é sempre "Alerta Bridge: calculado automaticamente a partir dos
  relatos", nunca alerta oficial.

**Densidade**
- Ocorrências no período ÷ área oficial da subprefeitura em km², com a área vinda da
  própria camada oficial.
- As faixas da legenda são fixas e documentadas.

**Tempo real**
- Consulta periódica a cada 15 s com a tela visível, e o app diz "atualizado há X s".
- Não há WebSocket. A documentação descreve isso como "atualização automática", sem
  prometer instantaneidade.

**Dados fictícios**
- Marcados no banco (`origem = SIMULADA`), separados dos reais em todas as consultas.
  O padrão é `origem = APP`.
- Gerados por script com semente fixa e reproduzível: cerca de 1.200 ocorrências nos
  últimos 120 dias, distribuídas dentro dos polígonos reais com alguns focos.
  - Histórico de status plausível: as mais antigas têm mais chance de estar resolvidas.
  - Confirmações vindas de identificações fictícias.
  - Endereço "Endereço fictício · \<região\>" e descrição terminando em "(dado fictício)".
- Um comando gera e outro remove **apenas** os simulados.

## 7. API e dados (SOA)

**Migração 0003**, com teste de ida e volta em banco vazio:
- em `ocorrencias`: `endereco` (texto até 200, opcional), `subprefeitura_codigo`
  (opcional, nulo fora de SP) e `origem` (`APP` | `SIMULADA`, padrão `APP`, com CHECK),
  além dos índices para mapa e estatísticas;
- as ocorrências que já existem ficam com `subprefeitura_codigo` nulo depois da
  migração. Um script idempotente (`recalcular_regioes`) preenche esse campo e fica
  documentado no README. A migração não importa código da aplicação;
- tabela `confirmacoes` (ocorrência, identificação, data; única por par);
- na fase 3: tabela ou tipo para **"ainda não resolvido"**, nos mesmos moldes da
  confirmação, permitido só em ocorrências Resolvidas. Não reabre a ocorrência: conta e
  aparece no detalhe, porque Resolvida continua sendo status final.

**Regiões**
- Fonte: **GeoSampa, Prefeitura de São Paulo (SMUL/Geoinfo), camada "Subprefeituras"**,
  baixada pelo WFS oficial
  `http://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs` (camada
  `geoportal:subprefeitura`, EPSG:4326).
  - São 32 polígonos, com código, nome e área em km². Download verificado em
    12/11/2026: 2,3 MB e cerca de 84 mil vértices.
  - O metadado indica acesso sem restrição e não nomeia a licença, então citamos fonte
    e data e usamos para fins acadêmicos.
- Um script simplifica os polígonos (Douglas–Peucker) para um GeoJSON pequeno,
  versionado com nota de proveniência. O original não vai para o repositório.
- Os nomes oficiais vêm sem acento ("BUTANTA") e o app mostra a grafia correta
  ("Butantã") por uma tabela de 32 nomes. O nome original continua no dado.

**Rotas novas ou alteradas**
- `POST /ocorrencias`: aceita `endereco`. O servidor calcula `subprefeitura_codigo`.
- `GET /ocorrencias`: novos filtros `origem`, `bbox` (área visível do mapa), `q` (texto),
  `subprefeitura`. As respostas ganham `endereco`, `subprefeitura`, `confirmacoes` e
  `origem`.
- `GET /ocorrencias/proximas?latitude&longitude&raio_m&categoria`: só abertas e reais,
  ordenadas por distância, com `distancia_m`.
- `POST` e `DELETE /ocorrencias/{id}/confirmacoes`, com o cabeçalho
  `X-Identificacao-Id`.
- `GET /identificacoes/{id}/ocorrencias?relacao=registradas|confirmadas`, para a aba
  Andamento.
- `PATCH /identificacoes/{id}`: troca de apelido, só pela própria identificação.
- `GET /regioes`: o GeoJSON simplificado, com cache.
- `GET /estatisticas/regioes?origem&dias` e `GET /estatisticas/resumo?origem&dias`.

Os erros seguem o formato atual. A coleção do Insomnia e o roteiro ganham as requisições
novas, e a equipe precisará fazer uma **segunda rodada de testes manuais**, só dessas.
Os prints de 12/11 continuam valendo para o que não mudou, e isso fica dito na
documentação.

## 8. Qualidade e verificação

- **Backend**: testes unitários para:
  - ponto-em-região, com pontos conhecidos (Praça da Sé → Sé; Parque Ibirapuera →
    Vila Mariana) e um ponto fora de SP → nulo;
  - simplificação que mantém esses pontos;
  - regra de alerta, densidade, agregações e distância.
  Há também testes de integração das rotas novas, da migração 0003 em banco vazio
  (com `check`) e do `verificar_api.py` ampliado. Os 95 testes atuais continuam passando.
- **Mobile**: testes puros para agrupamento de pontos, região, normalização de busca,
  selo Atualizada, formatação e leitura das respostas novas. Também `tsc`, ESLint,
  `expo-doctor`, bundle e o teste manual no iPhone feito pela equipe.
- **Documentação**: REQUISITOS, ENTREGA, READMEs, DECISOES (até 2 páginas),
  CONTRATO_API, REGRAS_DE_NEGOCIO (alerta, densidade e fictícios), roteiro do vídeo e
  evidências.

## 9. Fases (cada uma termina com tudo funcionando e verificado)

| Fase | Entrega | Meta |
|---|---|---|
| 1 | Migração 0003 (endereço, região, origem, confirmações); `/regioes`, filtros, proximidade, confirmações, lista por identificação; app com abas, visual novo, Início, Mapa real (pontos e densidade ao vivo, busca, filtros), Registrar em etapas, Andamento e detalhe com linha do tempo | 13/11 |
| 2 | Regra de alerta, estatísticas, gerador de dados fictícios, modo Exemplo no Mapa, aba Análises | 14/11 |
| 3 | Perfil completo, "Ainda não foi resolvido", acabamento, Insomnia (2ª rodada), docs, roteiro do vídeo | 15/11 |

Entre 16 e 19/11 ficam a folga, o vídeo, o preenchimento dos integrantes e a entrega.
Se o tempo apertar, a fase 3 é a que encolhe primeiro.

## 10. Riscos

- **Desempenho do mapa com muitos pontos no modo Exemplo.** Mitigação: agrupamento,
  consulta por área visível com limite de itens e marcadores com
  `tracksViewChanges={false}`.
- **Geocodificação do aparelho** pode falhar ou demorar. Nesse caso o endereço fica
  vazio e editável, sem travar o envio.
- **Android**: o aparelho de teste da equipe é um iPhone. No Android, o Expo Go usa
  Google Maps. O código não depende de nada exclusivo do iOS, exceto a folha nativa, que
  tem alternativa com Modal, mas o Android **não será testado num aparelho real** e a
  documentação diz isso.
- **Folha nativa (formSheet)**: se não funcionar no Expo Router do SDK 58, usamos um
  Modal com apresentação de folha.
- **Escopo grande para o prazo.** Mitigação: as fases e cortar primeiro a fase 3.
- **Segunda rodada de testes manuais** é trabalho da equipe, e já está no cronograma.

## 11. Decisões tomadas por mim (podem ser vetadas)

- A confirmação não altera a prioridade, só o alerta e a contagem.
- Regiões = 32 subprefeituras oficiais, e densidade = ocorrências/km².
- O Início usa só dados reais. O modo Exemplo fica no Mapa e nas Análises.
- Tempo real por consulta a cada 15 s, sem WebSocket.
- Raio de duplicata de 100 m, com a mesma categoria e só ocorrências abertas.
- "Ainda não foi resolvido" registra o aviso sem reabrir a ocorrência.
- O pino fica fixo no centro e a pessoa move o mapa (mais robusto que arrastar o pino).
- No Registrar, o local vem primeiro e a foto depois da checagem de parecidos, para
  quem só vai confirmar não precisar fotografar.
- A região é calculada no aparelho para exibir e no servidor para gravar, ambos a
  partir do mesmo GeoJSON.
- As ocorrências antigas recebem a região por um script, não pela migração.
- Este documento fica em `docs/superpowers/specs/` no repositório.

## 12. O que fica a critério de quem constrói

- Os valores L1 e L2 do alerta e as faixas de densidade, desde que sejam calibrados nos
  dados de exemplo, documentados e testados.
- A tolerância da simplificação dos polígonos, mantendo os pontos de teste nas regiões
  certas e o arquivo com até cerca de 300 KB.
- A organização interna de componentes e serviços, seguindo o padrão atual
  (`services/`, `validation/`, `models/`).
- O texto de cada tela, em português claro, seguindo o tom atual.
