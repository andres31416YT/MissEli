from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # La variable se llama API_KEY_OPEN_AI en el deploy, pero es la API key de Google Gemini.
    API_KEY_OPEN_AI: str = ""

    APP_NAME: str = "Miss Eli - Asistente Pedagógica"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    CORS_ORIGINS: str = "*"


settings = Settings()
