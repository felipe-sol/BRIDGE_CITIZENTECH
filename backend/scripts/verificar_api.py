"""Verificação automática ponta a ponta contra uma API Bridge EM EXECUÇÃO.

Complementa (não substitui) os testes manuais no Insomnia. Cria dados de teste
marcados com "[TESTE AUTOMATIZADO]".

Uso (na pasta backend/, com a API rodando e o venv ativo):
    python scripts/verificar_api.py --base-url http://localhost:8000 --admin-token <ADMIN_TOKEN>
    # depois de reiniciar a API:
    python scripts/verificar_api.py --base-url http://localhost:8000 --persistencia <id>
"""

import argparse
import sys
import uuid
from pathlib import Path
from typing import Any

import httpx2 as httpx

RAIZ = Path(__file__).resolve().parents[2]
FOTO = RAIZ / "docs" / "insomnia" / "arquivos-teste" / "foto-sintetica.jpg"
NAO_IMAGEM = RAIZ / "docs" / "insomnia" / "arquivos-teste" / "nao-e-imagem.jpg"

falhas = 0


def conferir(descricao: str, resposta: httpx.Response, esperado: int, codigo_erro: str | None = None) -> Any:
    global falhas
    corpo: Any = resposta.json() if resposta.headers.get("content-type", "").startswith("application/json") else None
    ok = resposta.status_code == esperado
    if ok and codigo_erro is not None:
        ok = isinstance(corpo, dict) and corpo.get("erro", {}).get("codigo") == codigo_erro
    marca = "OK  " if ok else "FALHA"
    extra = f" ({codigo_erro})" if codigo_erro else ""
    print(f"[{marca}] {resposta.request.method:5} {resposta.request.url.path:38} -> {resposta.status_code}"
          f" (esperado {esperado}{extra}) — {descricao}")
    if not ok:
        falhas += 1
        print(f"        corpo: {resposta.text[:300]}")
    return corpo


def ocorrencia(ident: str, **extra: Any) -> dict[str, Any]:
    dados: dict[str, Any] = {
        "identificacao_id": ident,
        "titulo": "[TESTE AUTOMATIZADO] Calçada quebrada",
        "descricao": "Registro criado pelo script de verificação (dado de teste).",
        "categoria": "CALCADA_DANIFICADA",
        "latitude": -23.564224,
        "longitude": -46.652857,
        "risco_imediato": True,
        "bloqueia_passagem": False,
        "afeta_acessibilidade": True,
    }
    dados.update(extra)
    return dados


def fluxo_completo(c: httpx.Client, admin_token: str | None) -> None:
    corpo = conferir("API e banco respondendo", c.get("/health"), 200)
    if corpo and corpo.get("banco") != "ok":
        print("Banco indisponível; abortando.")
        sys.exit(1)

    ident = conferir("cria identificação", c.post("/identificacoes", json={"apelido": "Script de verificação"}), 201)["id"]
    outra = conferir("cria 2ª identificação", c.post("/identificacoes", json={"apelido": "Outra pessoa"}), 201)["id"]
    conferir("apelido curto", c.post("/identificacoes", json={"apelido": "A"}), 422, "VALIDACAO")

    chave = {"Idempotency-Key": str(uuid.uuid4())}
    criada = conferir("cadastro válido", c.post("/ocorrencias", json=ocorrencia(ident), headers=chave), 201)
    oid = criada["id"]
    print(f"        prioridade={criada['prioridade']} pontuação={criada['prioridade_pontuacao']} "
          f"ia={criada['analise_ia']['status']}")
    repetida = conferir("mesma Idempotency-Key não duplica", c.post("/ocorrencias", json=ocorrencia(ident), headers=chave), 200)
    if repetida and repetida["id"] != oid:
        print("        ERRO: idempotência devolveu outro id")
    conferir("latitude 91", c.post("/ocorrencias", json=ocorrencia(ident, latitude=91)), 422, "VALIDACAO")
    conferir("coordenadas (0,0)", c.post("/ocorrencias", json=ocorrencia(ident, latitude=0, longitude=0)), 422, "VALIDACAO")
    conferir("identificação inexistente", c.post("/ocorrencias", json=ocorrencia(str(uuid.uuid4()))), 422,
             "IDENTIFICACAO_INEXISTENTE")
    segunda = conferir("2ª ocorrência", c.post("/ocorrencias", json=ocorrencia(ident, categoria="BURACO",
                                                                                 risco_imediato=False,
                                                                                 afeta_acessibilidade=False)), 201)["id"]

    lista = conferir("listagem", c.get("/ocorrencias", params={"tamanho": 100}), 200)
    if lista and oid not in [o["id"] for o in lista["itens"]]:
        print("        ERRO: ocorrência criada não aparece na listagem")
    conferir("ordenação por prioridade", c.get("/ocorrencias", params={"ordenar": "prioridade"}), 200)
    conferir("tamanho inválido", c.get("/ocorrencias", params={"tamanho": 500}), 422, "VALIDACAO")
    conferir("detalhe", c.get(f"/ocorrencias/{oid}"), 200)
    conferir("detalhe inexistente", c.get("/ocorrencias/999999"), 404, "NAO_ENCONTRADO")

    autor = {"X-Identificacao-Id": ident}
    with FOTO.open("rb") as f:
        conferir("upload válido", c.post(f"/ocorrencias/{oid}/imagem", files={"arquivo": ("f.jpg", f, "image/jpeg")},
                                         headers=autor), 200)
    conferir("download da imagem", c.get(f"/ocorrencias/{oid}/imagem"), 200)
    with FOTO.open("rb") as f:
        conferir("upload repetido", c.post(f"/ocorrencias/{oid}/imagem", files={"arquivo": ("f.jpg", f, "image/jpeg")},
                                           headers=autor), 409, "IMAGEM_JA_ENVIADA")
    with NAO_IMAGEM.open("rb") as f:
        conferir("texto com extensão .jpg", c.post(f"/ocorrencias/{segunda}/imagem",
                                                   files={"arquivo": ("x.jpg", f, "image/jpeg")}, headers=autor),
                 415, "FORMATO_NAO_SUPORTADO")
    with FOTO.open("rb") as f:
        conferir("upload por outra identificação", c.post(f"/ocorrencias/{segunda}/imagem",
                                                          files={"arquivo": ("f.jpg", f, "image/jpeg")},
                                                          headers={"X-Identificacao-Id": outra}), 403, "PROIBIDO")

    conferir("status sem token", c.patch(f"/ocorrencias/{oid}/status", json={"status": "EM_ANALISE"}), 401 if admin_token else 403)
    if admin_token:
        adm = {"X-Admin-Token": admin_token}
        conferir("ABERTA → EM_ANALISE", c.patch(f"/ocorrencias/{oid}/status", json={"status": "EM_ANALISE"}, headers=adm), 200)
        conferir("EM_ANALISE → RESOLVIDA (inválida)", c.patch(f"/ocorrencias/{oid}/status", json={"status": "RESOLVIDA"},
                                                              headers=adm), 409, "TRANSICAO_INVALIDA")
        conferir("EM_ANALISE → EM_ANDAMENTO", c.patch(f"/ocorrencias/{oid}/status", json={"status": "EM_ANDAMENTO"},
                                                     headers=adm), 200)
        final = conferir("EM_ANDAMENTO → RESOLVIDA", c.patch(f"/ocorrencias/{oid}/status",
                                                             json={"status": "RESOLVIDA", "observacao": "teste"},
                                                             headers=adm), 200)
        if final:
            print(f"        histórico: {[h['status_novo'] for h in final['historico_status']]}")
    else:
        print("        (sem --admin-token: transições de status não verificadas)")

    fluxo_bridge2(c, ident, outra, oid if admin_token else None)

    print(f"\nOcorrência de referência para o teste de persistência: {oid}")
    print(f"Depois de reiniciar a API: python scripts/verificar_api.py --base-url {c.base_url} --persistencia {oid}")


def checar(condicao: bool, descricao: str) -> None:
    """Confere o CONTEÚDO de uma resposta (além do status HTTP)."""
    global falhas
    print(f"        [{'OK  ' if condicao else 'FALHA'}] {descricao}")
    if not condicao:
        falhas += 1


def fluxo_bridge2(c: httpx.Client, ident: str, outra: str, resolvida: int | None) -> None:
    """Rotas do Bridge 2.0 (fase 1): endereço, região, mapa, proximidade, confirmações e 'minhas'."""
    print("\n--- Bridge 2.0 (fase 1) ---")
    se = ocorrencia(ident, latitude=-23.5503, longitude=-46.634, endereco="Praça da Sé — Sé",
                    titulo="[TESTE AUTOMATIZADO] Calçada na Praça da Sé")
    criada = conferir("cadastro com endereço (Sé)", c.post("/ocorrencias", json=se), 201)
    if not criada:
        return
    sid = criada["id"]
    checar(criada["subprefeitura"] == {"codigo": "09", "nome": "Sé"} and criada["endereco"] == "Praça da Sé — Sé"
           and criada["confirmacoes"] == 0 and criada["origem"] == "APP", "região Sé, endereço, 0 confirmações, origem APP")
    rio = conferir("cadastro fora de SP", c.post("/ocorrencias", json=ocorrencia(ident, latitude=-22.9068,
                                                                                 longitude=-43.1729)), 201)
    if rio:
        checar(rio["subprefeitura"] is None, "fora de SP: subprefeitura nula")
    conferir("endereço com 201 caracteres", c.post("/ocorrencias", json=ocorrencia(ident, endereco="x" * 201)), 422,
             "VALIDACAO")

    regioes = conferir("limites das regiões", c.get("/regioes"), 200)
    if regioes:
        checar(len(regioes["features"]) == 32, "32 subprefeituras")
    numeros = conferir("estatísticas por região", c.get("/estatisticas/regioes"), 200)
    if numeros:
        se_numeros = next((i for i in numeros["itens"] if i["codigo"] == "09"), None)
        checar(len(numeros["itens"]) == 32 and se_numeros is not None and se_numeros["total"] >= 1, "32 itens; Sé com ≥ 1")
    caixa = conferir("ocorrências na área do mapa", c.get("/ocorrencias", params={"bbox": "-46.70,-23.60,-46.60,-23.50",
                                                                                  "tamanho": 100}), 200)
    if caixa and rio:
        ids = [o["id"] for o in caixa["itens"]]
        checar(sid in ids and rio["id"] not in ids, "a da Sé está na caixa; a do Rio não")
    busca = conferir("busca por texto", c.get("/ocorrencias", params={"q": "praça da sé", "tamanho": 100}), 200)
    if busca:
        checar(sid in [o["id"] for o in busca["itens"]], "busca acha a ocorrência pelo título/endereço")
    perto = conferir("próximas (100 m, calçada)", c.get("/ocorrencias/proximas", params={
        "latitude": -23.5503, "longitude": -46.634, "categoria": "CALCADA_DANIFICADA"}), 200)
    if perto:
        checar(sid in [o["id"] for o in perto["itens"]], "a ocorrência da Sé aparece como parecida")

    dela = {"X-Identificacao-Id": outra}
    r = conferir("'eu também vi' (outra pessoa)", c.post(f"/ocorrencias/{sid}/confirmacoes", headers=dela), 201)
    if r:
        checar(r["confirmacoes"] == 1, "1 confirmação")
    conferir("confirmação repetida (idempotente)", c.post(f"/ocorrencias/{sid}/confirmacoes", headers=dela), 200)
    conferir("autor não confirma a própria", c.post(f"/ocorrencias/{sid}/confirmacoes",
                                                    headers={"X-Identificacao-Id": ident}), 409, "PROPRIA_OCORRENCIA")
    if resolvida is not None:
        conferir("ocorrência resolvida não recebe confirmação", c.post(f"/ocorrencias/{resolvida}/confirmacoes",
                                                                         headers=dela), 409, "OCORRENCIA_ENCERRADA")
    detalhe = conferir("detalhe com a relação de quem pergunta", c.get(f"/ocorrencias/{sid}", headers=dela), 200)
    if detalhe:
        checar(detalhe["minha_relacao"] == {"registrei": False, "confirmei": True}
               and detalhe["prioridade_pontuacao"] == criada["prioridade_pontuacao"],
               "relação confirmei=true; prioridade não mudou")
    minhas = conferir("minhas confirmadas (cabeçalho, não URL)", c.get("/ocorrencias/minhas",
                                                                       params={"relacao": "confirmadas"}, headers=dela), 200)
    if minhas:
        checar(sid in [o["id"] for o in minhas["itens"]], "a confirmada aparece no Andamento da outra pessoa")
    desfeita = conferir("desfazer confirmação", c.delete(f"/ocorrencias/{sid}/confirmacoes", headers=dela), 200)
    if desfeita:
        checar(desfeita["confirmacoes"] == 0, "0 confirmações depois de desfazer")
    conferir("minhas com identificação inexistente", c.get("/ocorrencias/minhas",
                                                           headers={"X-Identificacao-Id": str(uuid.uuid4())}),
             422, "IDENTIFICACAO_INEXISTENTE")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--admin-token", default=None)
    parser.add_argument("--persistencia", type=int, default=None, help="ID a conferir após reiniciar a API")
    args = parser.parse_args()

    try:
        with httpx.Client(base_url=args.base_url, timeout=15) as c:
            if args.persistencia is not None:
                corpo = conferir("ocorrência continua no banco após reinício", c.get(f"/ocorrencias/{args.persistencia}"), 200)
                if corpo:
                    print(f"        status={corpo['status']} imagem_url={corpo['imagem_url']} "
                          f"registros de histórico={len(corpo['historico_status'])}")
            else:
                fluxo_completo(c, args.admin_token)
    except httpx.TransportError as exc:
        print(f"Não foi possível conectar a {args.base_url}: {type(exc).__name__}. A API está rodando?")
        sys.exit(2)

    print(f"\nResultado: {'SUCESSO' if falhas == 0 else f'{falhas} FALHA(S)'}")
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
