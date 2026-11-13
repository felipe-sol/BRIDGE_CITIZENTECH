from io import BytesIO
from pathlib import Path

import pytest
from PIL import Image

from app.services.armazenamento import ImagemInvalida, caminho_seguro, processar_imagem, salvar_imagem
from tests import imagens


def test_jpeg_valido_e_reencodado_sem_exif(tmp_path: Path) -> None:
    original = imagens.jpeg_com_exif()
    assert Image.open(BytesIO(original)).getexif().get(0x010F) == "FabricanteFicticio"

    salva = salvar_imagem(original, tmp_path)

    assert salva.mime == "image/jpeg"
    assert salva.nome_arquivo.endswith(".jpg") and len(salva.nome_arquivo) == 36
    with Image.open(tmp_path / salva.nome_arquivo) as gravada:
        assert gravada.format == "JPEG"
        assert len(gravada.getexif()) == 0  # metadados descartados


def test_png_valido(tmp_path: Path) -> None:
    salva = salvar_imagem(imagens.png(), tmp_path)
    assert salva.mime == "image/png"
    with Image.open(tmp_path / salva.nome_arquivo) as gravada:
        assert gravada.format == "PNG"


@pytest.mark.parametrize(
    "conteudo",
    [
        b"isto nao e uma imagem",
        b"%PDF-1.7 fingindo ser foto",
        imagens.jpeg_com_exif()[:200],  # JPEG truncado
    ],
)
def test_conteudo_invalido_e_recusado(conteudo: bytes) -> None:
    with pytest.raises(ImagemInvalida):
        processar_imagem(conteudo)


def test_formato_valido_porem_nao_aceito() -> None:
    with pytest.raises(ImagemInvalida, match="GIF"):
        processar_imagem(imagens.gif())


def test_resolucao_excessiva_e_recusada() -> None:
    with pytest.raises(ImagemInvalida):
        processar_imagem(imagens.png_gigante_em_pixels())


@pytest.mark.parametrize(
    "nome",
    [
        "../segredo.jpg",
        "..\\..\\windows\\win.ini",
        "/etc/passwd",
        "C:\\arquivo.jpg",
        "abc.jpg",
        "0123456789abcdef0123456789abcdef.exe",
        "0123456789abcdef0123456789abcdef.jpg/../x",
    ],
)
def test_caminho_seguro_recusa_nomes_fora_do_padrao(nome: str, tmp_path: Path) -> None:
    with pytest.raises(ValueError):
        caminho_seguro(nome, tmp_path)


def test_caminho_seguro_aceita_nome_gerado(tmp_path: Path) -> None:
    nome = "0123456789abcdef0123456789abcdef.png"
    assert caminho_seguro(nome, tmp_path) == (tmp_path / nome).resolve()
