from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    OPENAI_API_KEY: str
    APP_NAME: str = "Miss Eli - Asistente Pedagógica"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    CORS_ORIGINS: str = "*"


settings = Settings()
