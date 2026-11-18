# BRIDGE — IA & Machine Learning

## O que foi implementado

Este módulo treina um classificador multiclasse de texto para sugerir a categoria de ocorrências urbanas do BRIDGE. Ele utiliza somente `titulo` e `descricao` e retorna uma classe oficial do backend em `categoria_sugerida`.

**Atenção sobre a origem dos dados:** o conjunto de treino incluído é sintético/simulado, criado por templates no notebook. Não é uma base real de ocorrências, nem representa relatos de cidadãos. As métricas servem para demonstrar o pipeline acadêmico e não validam desempenho operacional.

## Arquivos

- `notebooks/BRIDGE_IA_ML.ipynb`: notebook reproduzível com análise, preparação, baseline, treinamento, validação cruzada, avaliação, matriz de confusão, análise de erros, inferência e exportação.
- `dataset/bridge_ocorrencias_sinteticas.csv`: base gerada automaticamente pelo notebook.
- `artifacts/bridge_text_classifier.joblib`: pipeline treinado (TF-IDF + Regressão Logística).
- `artifacts/metricas.json`: métricas do conjunto de teste.
- `artifacts/relatorio_classificacao.txt`: métricas por classe.
- `artifacts/metadados_modelo.json`: classes, versão, origem dos dados, hiperparâmetros e versões de bibliotecas.
- `../backend/app/services/ia/classificador_texto.py`: adaptador do modelo para o contrato de IA do backend.

## Como reproduzir

Na raiz do repositório:

```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# Linux/macOS: source .venv/bin/activate
pip install -r ia_ml/requirements.txt
jupyter notebook ia_ml/notebooks/BRIDGE_IA_ML.ipynb
```

No Jupyter, execute **Kernel/Ambiente de execução → Restart Kernel and Run All**. O notebook gera o CSV e recria os artefatos em `ia_ml/dataset/` e `ia_ml/artifacts/`. No Google Colab, basta abrir o `.ipynb` e executar todas as células; não é necessário fazer upload de CSV.

## Ativar a inferência no backend

O backend usa o caminho configurado em `MODELO_IA_CAMINHO`. O caminho relativo é resolvido a partir da pasta `backend/`.

No arquivo `backend/.env`, configure:

```dotenv
MODELO_IA_CAMINHO=../ia_ml/artifacts/bridge_text_classifier.joblib
MODELO_IA_VERSAO=bridge-text-classifier-1.0.0
```

Instale as dependências do backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Com o modelo carregado, o backend classifica título + descrição no cadastro da ocorrência e grava o resultado nos campos IA existentes. Sem caminho configurado, o cadastro segue funcionando e o estado da análise fica `INDISPONIVEL`. Se a inferência falhar, a ocorrência é mantida e a análise fica `FALHOU`.

A categoria escolhida pelo cidadão não é usada como atributo do modelo, nem é sobrescrita automaticamente. O resultado da IA é uma sugestão separada. A prioridade continua sendo calculada pelas regras determinísticas existentes.

## Decisões metodológicas

- Problema: classificação multiclasse de texto.
- Features: concatenação de `titulo` e `descricao`.
- Alvo: categoria oficial do domínio BRIDGE.
- Algoritmo: TF-IDF + Regressão Logística.
- Seleção: GridSearchCV com StratifiedKFold (3 divisões) e F1 macro.
- Teste: 20% estratificado, separado antes da busca.
- Métrica principal: F1 macro; também são reportadas acurácia, precisão macro e recall macro.
- Baseline: DummyClassifier com classe mais frequente.
- Limitação: dados sintéticos com padrões de linguagem gerados por templates. Dados reais revisados são necessários antes de qualquer uso operacional.

## Resultado desta execução validada

A execução registrada em `notebooks/BRIDGE_IA_ML.ipynb` apresentou:

| Métrica no conjunto de teste | Resultado |
|---|---:|
| Acurácia | 1,0000 (100%) |
| Precisão macro | 1,0000 (100%) |
| Recall macro | 1,0000 (100%) |
| F1-score macro | 1,0000 (100%) |
| F1 macro do baseline | 0,0667 (6,67%) |
| F1 macro médio da validação cruzada | 1,0000 (100%) |

**Interpretação indispensável:** o resultado perfeito está associado ao caráter controlado dos textos gerados por templates com vocabulário específico por classe. O conjunto de teste contém variações dos mesmos padrões sintéticos vistos no treino. Portanto, esses números mostram que o algoritmo aprendeu a estrutura construída para a demonstração, mas não medem a capacidade de classificar relatos espontâneos reais. O notebook registra essa limitação junto à avaliação.
