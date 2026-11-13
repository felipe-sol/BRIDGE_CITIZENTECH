"""Imagens geradas em memória para os testes (nenhuma foto real é usada)."""

from io import BytesIO

from PIL import Image


def jpeg_com_exif(largura: int = 64, altura: int = 48) -> bytes:
    img = Image.new("RGB", (largura, altura), (200, 120, 40))
    exif = Image.Exif()
    exif[0x010F] = "FabricanteFicticio"  # Make
    exif[0x0110] = "ModeloFicticio"  # Model
    saida = BytesIO()
    img.save(saida, format="JPEG", exif=exif.tobytes())
    return saida.getvalue()


def png(largura: int = 32, altura: int = 32) -> bytes:
    saida = BytesIO()
    Image.new("RGBA", (largura, altura), (0, 128, 255, 255)).save(saida, format="PNG")
    return saida.getvalue()


def gif() -> bytes:
    saida = BytesIO()
    Image.new("P", (8, 8)).save(saida, format="GIF")
    return saida.getvalue()


def png_gigante_em_pixels() -> bytes:
    # 7000 x 7000 = 49 MP (acima do limite de 40 MP), mas o arquivo é pequeno.
    saida = BytesIO()
    Image.new("1", (7000, 7000)).save(saida, format="PNG")
    return saida.getvalue()
