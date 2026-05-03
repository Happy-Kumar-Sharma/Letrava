from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Auth — JWT_SECRET is required; startup fails loudly if absent
    JWT_SECRET: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440   # 24 h — survives normal sessions
    REFRESH_TOKEN_EXPIRE_DAYS: int = 365      # 1 year — effectively permanent
    SECURE_COOKIES: bool = False  # set True in production (HTTPS only)

    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/postgres"
    CORS_ORIGINS: str = "http://localhost:5173"
    PORT: int = 8000

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
