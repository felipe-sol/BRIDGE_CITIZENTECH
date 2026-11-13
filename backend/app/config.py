"""Configuração do backend, lida de variáveis de ambiente / arquivo .env."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://bridge:bridge_dev@localhost:5432/bridge"

    # Diretório persistente para fotos, fora do código versionado (ver .gitignore).
    upload_dir: Path = BACKEND_DIR / "var" / "uploads"
    max_upload_mb: int = Field(default=5, ge=1, le=20)

    # Vazio => rotas administrativas desabilitadas (403 ADMIN_DESABILITADO).
    admin_token: str = ""

    # Origens web permitidas, separadas por vírgula. Vazio => CORS desligado.
    # O app nativo (Expo Go) não depende de CORS. CORS não é autenticação.
    cors_origins: str = ""

    # Integração com o modelo de IA do colega (ver docs/CONTRATO_IA.md).
    modelo_ia_caminho: str = ""
    modelo_ia_versao: str = ""

    log_level: str = "INFO"

    @field_validator("upload_dir")
    @classmethod
    def _upload_dir_absoluto(cls, valor: Path) -> Path:
        # Caminhos relativos são resolvidos a partir da pasta backend/.
        return valor if valor.is_absolute() else (BACKEND_DIR / valor).resolve()

    @field_validator("admin_token")
    @classmethod
    def _admin_token_forte(cls, valor: str) -> str:
        valor = valor.strip()
        if valor and len(valor) < 16:
            raise ValueError("ADMIN_TOKEN deve ter pelo menos 16 caracteres (ou ficar vazio).")
        return valor

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def cors_origins_lista(self) -> list[str]:
        return [origem.strip() for origem in self.cors_origins.split(",") if origem.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
