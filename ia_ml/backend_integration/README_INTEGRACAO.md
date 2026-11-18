# Integração do classificador textual BRIDGE

## Contrato

O adaptador `backend/app/services/ia/classificador_texto.py` implementa `ClassificadorOcorrencia` com:

- `disponivel = True` após carregamento válido do pipeline;
- `versao` igual à variável `MODELO_IA_VERSAO` ou à versão padrão;
- `requer_imagem = False`;
- `classificar(entrada)` usando apenas `entrada.titulo` e `entrada.descricao`.

O adaptador valida se o artefato contém exatamente as cinco classes da enum `CategoriaOcorrencia` e se expõe `predict_proba`. A confiança gravada é o maior score retornado pelo estimador; não foi feita calibração probabilística e esse valor não deve ser interpretado como garantia de acerto.

## Ativação

Defina no `backend/.env`:

```dotenv
MODELO_IA_CAMINHO=../ia_ml/artifacts/bridge_text_classifier.joblib
MODELO_IA_VERSAO=bridge-text-classifier-1.0.0
```

O caminho relativo é resolvido a partir de `backend/`. Instale `backend/requirements.txt` antes de subir a API.

## Fluxo real no código

1. `backend/app/main.py` chama `criar_classificador(settings)` no lifespan da API.
2. `backend/app/services/ia/__init__.py` carrega `ClassificadorTextoSklearn` se o caminho estiver configurado; do contrário, mantém `ClassificadorIndisponivel`.
3. `backend/app/services/ocorrencias.py` chama o classificador ao criar a ocorrência, pois `requer_imagem=False`.
4. A sugestão e a confiança são gravadas nos campos IA da ocorrência e retornadas pelos schemas/endpoints existentes.
5. O app pode exibir a sugestão e a confiança já disponibilizadas na resposta.

A categoria originalmente informada não é alterada. A prioridade segue exclusivamente as regras do serviço `prioridade.py`.

## Teste rápido sem banco

Na raiz do repositório, após instalar as dependências do backend:

```bash
cd backend
python - <<'PY'
from app.config import Settings
from app.services.ia import criar_classificador, EntradaClassificacao
from app.enums import CategoriaOcorrencia
from pathlib import Path

settings = Settings(
    modelo_ia_caminho='../ia_ml/artifacts/bridge_text_classifier.joblib',
    modelo_ia_versao='bridge-text-classifier-1.0.0',
)
modelo = criar_classificador(settings)
entrada = EntradaClassificacao(
    titulo='Luminária pública apagada',
    descricao='O poste não acende durante a noite e a rua fica escura.',
    categoria_informada=CategoriaOcorrencia.OUTRO,
    latitude=-23.55, longitude=-46.63,
    risco_imediato=False, bloqueia_passagem=False,
    afeta_acessibilidade=False, caminho_imagem=None,
)
resultado = modelo.classificar(entrada)
print(resultado)
assert resultado.categoria_sugerida == CategoriaOcorrencia.ILUMINACAO_DEFEITUOSA.value
PY
```
