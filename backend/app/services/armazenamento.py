"""Armazenamento seguro das fotos enviadas.

Regras (docs/CONTRATO_API.md, seção 3.8):
- O formato é validado pelo CONTEÚDO (Pillow decodifica a imagem); extensão e
  Content-Type enviados pelo cliente são ignorados.
- Aceita apenas JPEG e PNG; protege contra "decompression bomb".
- A imagem é reencodada: metadados EXIF (que podem conter GPS e modelo do
  aparelho) são descartados e a orientação é aplicada antes.
- O nome do arquivo é gerado no servidor (UUID). Nenhum caminho vindo do
  cliente é usado, o que impede path traversal.
"""

import os
import re
import uuid
import warnings
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

FORMATOS_ACEITOS: dict[str, tuple[str, str]] = {
    # formato Pillow -> (extensão, MIME)
    "JPEG": ("jpg", "image/jpeg"),
    # Algumas câmeras gravam JPEG multi-imagem (MPO); salvamos só a 1ª como JPEG.
    "MPO": ("jpg", "image/jpeg"),
    "PNG": ("png", "image/png"),
}
MAX_PIXELS = 40_000_000  # ~40 megapixels
MAX_LADO_SALVO = 2048  # px; reduz armazenamento sem perder legibilidade
NOME_ARQUIVO_VALIDO = re.compile(r"^[0-9a-f]{32}\.(jpg|png)$")


class ImagemInvalida(Exception):
    """O conteúdo enviado não é uma imagem JPEG/PNG válida."""


@dataclass(frozen=True)
class ImagemSalva:
    nome_arquivo: str
    mime: str


def processar_imagem(conteudo: bytes) -> tuple[bytes, str]:
    """Valida o conteúdo e devolve (bytes reencodados sem metadados, formato Pillow)."""
    try:
        with warnings.catch_warnings():
            # Imagens com pixels demais viram erro em vez de aviso.
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(conteudo)) as img:
                formato = img.format
                if formato not in FORMATOS_ACEITOS:
                    raise ImagemInvalida(f"Formato {formato!r} não suportado.")
                if img.width * img.height > MAX_PIXELS:
                    raise ImagemInvalida("Imagem com resolução acima do permitido.")
                img.verify()  # detecta arquivo truncado/corrompido

            # verify() invalida o objeto; é preciso reabrir para decodificar.
            with Image.open(BytesIO(conteudo)) as img:
                img.load()
                imagem = ImageOps.exif_transpose(img)
                imagem.thumbnail((MAX_LADO_SALVO, MAX_LADO_SALVO))
                saida = BytesIO()
                if formato in ("JPEG", "MPO"):
                    if imagem.mode not in ("RGB", "L"):
                        imagem = imagem.convert("RGB")
                    imagem.save(saida, format="JPEG", quality=85, optimize=True)
                else:
                    imagem.save(saida, format="PNG", optimize=True)
                return saida.getvalue(), formato
    except ImagemInvalida:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ImagemInvalida("Conteúdo não é uma imagem JPEG/PNG válida.") from exc
    except (OSError, SyntaxError, ValueError) as exc:  # arquivo truncado/corrompido
        raise ImagemInvalida("Imagem corrompida ou incompleta.") from exc


def salvar_imagem(conteudo: bytes, diretorio: Path) -> ImagemSalva:
    dados, formato = processar_imagem(conteudo)
    extensao, mime = FORMATOS_ACEITOS[formato]
    nome = f"{uuid.uuid4().hex}.{extensao}"

    diretorio.mkdir(parents=True, exist_ok=True)
    destino = diretorio / nome
    temporario = diretorio / f".{nome}.tmp"
    temporario.write_bytes(dados)
    os.replace(temporario, destino)  # gravação atômica
    return ImagemSalva(nome_arquivo=nome, mime=mime)


def caminho_seguro(nome_arquivo: str, diretorio: Path) -> Path:
    """Resolve o caminho de um arquivo salvo, recusando qualquer nome fora do padrão."""
    if not NOME_ARQUIVO_VALIDO.fullmatch(nome_arquivo):
        raise ValueError("Nome de arquivo inválido.")
    base = diretorio.resolve()
    caminho = (base / nome_arquivo).resolve()
    if caminho.parent != base:
        raise ValueError("Caminho fora do diretório de uploads.")
    return caminho


def remover_imagem(nome_arquivo: str, diretorio: Path) -> None:
    try:
        caminho_seguro(nome_arquivo, diretorio).unlink(missing_ok=True)
    except ValueError:
        pass
