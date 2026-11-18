# Decisões de projeto — app mobile Bridge

## 1. Arquitetura em camadas

As telas (`src/app/`) cuidam só do estado de tela. Rede, armazenamento e recursos nativos
ficam em `src/services/`. Regras e cálculos são **funções puras**, sem React e sem rede
(`validation/`, `geo/`, `registro/`, `acompanhamento/`, `ia/`, `alertas/`, `analises/`,
`conteudo/`, `preferencias/`). Por isso são testadas com `node --test` (138 testes), sem Jest.
O `snake_case` da API vira `camelCase` num lugar só: os parsers das respostas.

## 2. Navegação: Expo Router

**Abas** (Início, Mapa, Andamento, Análises, Perfil), **pilha** para o detalhe e as páginas do
Perfil, **modal** em tela cheia para o registro e **folha nativa** do iOS para o resumo de uma
região. `Stack.Protected` decide o acesso: sem identificação, só a tela de identificação. Os
caminhos ficam em `ROTAS`, e os parâmetros (`id`, `codigo`, `modo`) são validados antes do uso.

## 3. Identificação e privacidade

`POST /identificacoes` gera um UUID; o app guarda `{id, apelido}` no AsyncStorage e valida o
JSON salvo com o mesmo parser da rede. A interface diz que **não é login**. Como o UUID é uma
credencial fraca, ele vai sempre no **cabeçalho** `X-Identificacao-Id`, nunca na URL (que
aparece em logs). Trocar o apelido só grava no aparelho depois do OK da API.

## 4. Rede, erros e TypeScript

`services/http.ts` aplica tempo limite (15 s; 60 s no upload; 8 s na sugestão da IA) e converte
falhas em erros tipados; as telas mostram mensagens sem jargão e uma falha de rede nunca apaga o
que já está na tela. O TypeScript roda com `strict` e `noUncheckedIndexedAccess`, sem `any` nem
`@ts-ignore`. Respostas entram como `unknown` e passam por parsers; estados de tela são uniões
discriminadas, o que obriga a tratar carregando, erro, vazio e ok.

## 5. Mapa

- **Sem chave nem custo:** `react-native-maps`, que já vem no Expo Go (Apple Maps no iPhone).
- **Regiões oficiais:** as 32 subprefeituras (GeoSampa) chegam simplificadas por `/regioes`; o
  app calcula a região para exibir e o servidor calcula de novo para gravar.
- **Desempenho:** com zoom afastado, os pontos viram grupos numa grade **presa ao mapa** (arrastar
  não reagrupa); o app pede a área visível com folga e só pede de novo quando a tela sai dela.
- **Toque:** no iPhone o toque nem sempre chega ao marcador, então o app acha o ícone mais
  próximo do dedo (até 28 pt) e ignora o eco do toque no marcador.
- **"Ao vivo":** consulta a cada 15 s com a tela visível; resposta de outro modo é descartada.

## 6. Registro em etapas e duplicatas

Local → categoria → parecidos → detalhes → revisão, num **redutor puro** testado (inclusive
respostas atrasadas). O pino fica fixo no centro e a pessoa arrasta o mapa (mais preciso que
arrastar um marcador). O endereço vem da geocodificação do próprio aparelho e é editável. A
etapa **Parecidos** mostra abertas da mesma categoria a até 100 m, para a pessoa **confirmar** em
vez de duplicar. O envio usa `Idempotency-Key`, trava contra toque duplo e, se só a foto falhar,
reenvia **só a foto**.

## 7. Recursos nativos e permissões

Início e Mapa **não pedem** localização ao abrir: o pedido acontece quando a pessoa age ("Ativar
localização", alvo do mapa ou começar um registro). Sem permissão, o mapa abre no centro de São
Paulo e continua utilizável; nunca usamos coordenadas fictícias. A câmera pede permissão ao tocar
em "Tirar foto"; se bloqueada, oferece "Abrir Ajustes", e a galeria fica como alternativa.

## 8. Acompanhamento

O selo **Atualizada** compara o `atualizado_em` da API com a última visita (dado só do aparelho).
Não há push: no Expo Go exigiria um serviço externo; os avisos ficam dentro do app. Numa
ocorrência resolvida, **"Ainda não foi resolvido? Avise"** soma um aviso sem reabrir nada.

## 9. IA (modelo de outro integrante)

O modelo (texto, scikit-learn) roda **no servidor**; o app só exibe o resultado e nunca fabrica
previsão.
- **Revisão do registro:** antes de enviar, o app pergunta à IA. Se ela discordar da categoria,
  avisa e oferece **"Trocar para …"**; aceitar volta à etapa Parecidos, porque a checagem de
  duplicatas é por categoria.
- **Confiança visível:** abaixo de 50% a sugestão aparece como palpite ("incerta"); abaixo de 30%
  não aparece (com 5 categorias, o acaso dá 20%).
- **Só o que a pessoa escreveu:** o título que o app preenche com o nome da categoria não vai para
  a IA. Antes, a IA lia a escolha da pessoa e só a repetia; o teste no iPhone revelou isso.
- **Limites:** o modelo foi treinado com dados sintéticos e não usa a foto. A sugestão nunca muda
  a categoria sozinha nem a prioridade, que é por regras.

## 10. Interface e acessibilidade

A identidade vem da sinalização de São Paulo: **placa azul de rua**, amarelo de sinalização na
ação principal e a fonte Overpass (OFL). A gravidade aparece por **forma e cor** (◆ alta, ● média,
■ baixa), nunca só cor; botões têm 48 pt; há rótulos para leitores de tela; os skeletons respeitam
"reduzir movimento". **Texto maior** (20% a mais) escala também a altura da linha, as abas e os
títulos, para nada ficar cortado.

## 11. Segurança

O app não contém segredos: `EXPO_PUBLIC_API_URL` é pública, a rota administrativa não é usada e
a busca no bundle não acha token nem credencial de banco.

## 12. Alerta Bridge, modo Exemplo e gráficos

O app não calcula o alerta: mostra o que a API devolve, sempre com "calculado automaticamente a
partir dos relatos", e a região em Alerta tem contorno **tracejado**, não só vermelho. Os dados
fictícios só aparecem no modo **Exemplo** (parâmetro de rota; o app sempre abre no Ao vivo), com
faixa em toda tela, e real e fictício nunca se misturam. Os gráficos usam `react-native-svg`, com
cálculo puro e testado, cores validadas para daltonismo, resumo em texto e tabela.
