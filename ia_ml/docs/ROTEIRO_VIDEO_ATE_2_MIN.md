# Roteiro sugerido — vídeo de demonstração (até 2 minutos)

**Duração alvo:** 1min40s a 1min55s. Grave a tela com o notebook e, se possível, a tela de detalhe de uma ocorrência no app.

| Tempo | O que mostrar | Fala sugerida |
|---|---|---|
| 0:00–0:15 | Capa do notebook e descrição do BRIDGE | “Nosso componente de IA para o BRIDGE apoia a triagem de ocorrências urbanas, sugerindo uma categoria a partir do texto informado.” |
| 0:15–0:30 | Lista das cinco classes e campos do dataset | “O modelo utiliza somente título e descrição e prevê uma das cinco categorias já existentes no backend. Não usamos a categoria escolhida pelo cidadão como entrada, para evitar vazamento do rótulo.” |
| 0:30–0:45 | Células de geração e exploração dos dados | “Como o repositório não tinha uma base textual real rotulada, geramos uma base sintética de quatro mil exemplos, oitocentos por categoria. Essa origem está documentada e não estamos apresentando os dados como relatos reais.” |
| 0:45–1:05 | Pipeline, GridSearchCV e métricas | “A preparação usa TF-IDF e o algoritmo é Regressão Logística. Comparamos com um baseline e selecionamos hiperparâmetros usando validação cruzada estratificada e F1 macro.” |
| 1:05–1:20 | Métricas e matriz de confusão | “Nesta base simulada, o F1 macro e a acurácia chegaram a cem por cento. Esse resultado é limitado aos padrões sintéticos gerados; ele não representa desempenho comprovado em dados reais.” |
| 1:20–1:35 | Célula de previsão e artefato joblib | “Aqui está um exemplo: um relato sobre luminária apagada retorna a categoria iluminação defeituosa. O pipeline é exportado para ser reutilizado sem refazer o treinamento.” |
| 1:35–1:50 | Tela de detalhe do app ou código do adaptador | “O adaptador integra o modelo ao contrato de IA do backend. A sugestão aparece separada da categoria informada; a prioridade continua sendo calculada pelas regras de negócio. Para produção, será necessária validação com relatos reais.” |

## Checklist antes de enviar no Teams

- [ ] Gravar o vídeo com até 2 minutos.
- [ ] Mostrar pelo menos a previsão, a métrica e a integração no BRIDGE.
- [ ] Mencionar explicitamente que os dados são sintéticos.
- [ ] Fazer upload do vídeo em um local acessível e copiar o link.
- [ ] Anexar o notebook `.ipynb` e inserir o link do vídeo na tarefa do Teams.
