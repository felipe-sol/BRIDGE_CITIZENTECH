# Contrato de integração com o modelo de IA

O modelo de Machine Learning é desenvolvido por **outro integrante da equipe**
(disciplina de IA & ML). Este documento descreve **o que o backend precisa receber**
para integrá-lo e **como** a integração está preparada.

> Situação atual: **nenhum modelo foi recebido**. O backend funciona sem ele e
> marca a análise como `INDISPONIVEL`. Nenhuma categoria ou confiança é fabricada.
> A integração real **não está concluída**.

## 1. O que precisamos receber do responsável pelo modelo

| Item | Detalhe esperado | Recebido? |
|---|---|---|
| Artefato treinado | Arquivo do modelo (ex.: `.joblib`, `.pkl`, `.keras`, `.onnx`, `.pt`) | ☐ |
| Código de carregamento e inferência | Função que carrega o artefato e outra que recebe a entrada e devolve a saída | ☐ |
| Pré-processamento | Exatamente o mesmo usado no treino (redimensionamento, normalização, encoding, ordem das features) | ☐ |
| Dependências e versões | Lista com versões fixas (ex.: `scikit-learn==x.y.z`), incluindo versão do Python usada no treino | ☐ |
| Tipo de entrada | **Imagem** ou **dados tabulares**? | ☐ |
| Classes / significado das saídas | Lista de classes e o que cada uma significa | ☐ |
| Mapeamento de classes | Como cada classe corresponde (ou não) a `CategoriaOcorrencia` | ☐ |
| Exemplo válido | Uma entrada real + a saída esperada, para validarmos a integração | ☐ |
| Versão do modelo | Identificador (ex.: `bridge-cls-2026.11.1`) | ☐ |
| Métricas reais | Métricas calculadas pelo responsável (ex.: acurácia, F1 por classe) e o conjunto em que foram medidas | ☐ |
| Origem do dataset | De onde vieram os dados (público/simulado), conforme regra "Dados com cuidado" da GS | ☐ |

Antes de integrar, confirmaremos pelo material recebido:

1. O modelo recebe **imagem** ou **dados tabulares**?
2. Quais campos ou transformações são obrigatórios?
3. Qual é o formato **real** da saída (classe? probabilidades? score?)?

### Se o modelo for de imagem
- Rodar o mesmo pré-processamento do treino sobre a foto enviada em
  `POST /ocorrencias/{id}/imagem`.
- Gravar `categoria_sugerida` e `confianca` **somente** se o modelo fornecer
  probabilidade/score.

### Se o modelo for tabular
- Usar exatamente as features esperadas, a partir dos campos que coletamos
  (`categoria`, `risco_imediato`, `bloqueia_passagem`, `afeta_acessibilidade`,
  `latitude`, `longitude`, textos).
- **Não** afirmar que existe classificação de imagens.
- **Não** inventar valores para features que não coletamos. Se o modelo exigir
  uma feature que não temos, a integração fica bloqueada até alinharmos.

## 2. Como a integração está preparada no backend

Código: [`backend/app/services/ia/`](../backend/app/services/ia/)

```python
class ClassificadorOcorrencia(Protocol):
    disponivel: bool          # False => análise "INDISPONIVEL"
    versao: str | None        # versão do modelo, gravada na ocorrência
    requer_imagem: bool       # True => roda após o upload da foto

    def classificar(self, entrada: EntradaClassificacao) -> ResultadoClassificacao: ...
```

- `EntradaClassificacao`: campos da ocorrência + caminho da imagem salva (quando houver).
- `ResultadoClassificacao`: `categoria_sugerida: str`, `confianca: float | None`.
- **Implementação atual:** `ClassificadorIndisponivel` (`disponivel = False`).
  É o comportamento padrão quando `MODELO_IA_CAMINHO` está vazio.
- O classificador é criado **uma vez por processo**, na inicialização da API
  (`lifespan` do FastAPI), e reutilizado em todas as requisições.
- Nunca há treinamento em requisição e **não** existe rota para enviar modelos:
  o artefato é colocado no servidor pelo responsável, nunca por usuários.
- Falha de inferência → `analise_ia.status = FALHOU`; a ocorrência **não** é perdida
  e o erro é registrado no log sem conteúdo da imagem.

## 3. Passos quando o modelo chegar

1. Inspecionar arquivos, dependências e versões recebidos.
2. Instalar dependências em `backend/requirements.txt` (versões fixas).
3. Criar `backend/app/services/ia/<nome>.py` implementando `ClassificadorOcorrencia`
   com o pré-processamento do treino.
4. Configurar `MODELO_IA_CAMINHO` e `MODELO_IA_VERSAO` no `.env`.
5. Validar com o **exemplo real** fornecido (entrada → saída esperada).
6. Conferir o resultado gravado no banco (`ocorrencias.ia_*`) e exibido no app.
7. Testar falha (arquivo de modelo ausente/corrompido) sem perder a ocorrência.
8. Atualizar este documento e os READMEs com o que foi realmente verificado e as
   métricas fornecidas pelo responsável.
