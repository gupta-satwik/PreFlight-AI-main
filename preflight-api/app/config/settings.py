from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    gemini_api_key: str = Field(..., alias="GEMINI_API_KEY")
    mongodb_uri: str = Field(..., alias="MONGODB_URI")
    mongodb_db_name: str = Field("preflight_db", alias="MONGODB_DB_NAME")
    npm_registry_url: str = Field("https://registry.npmjs.org", alias="NPM_REGISTRY_URL")
    analysis_timeout_ms: int = Field(45000, alias="ANALYSIS_TIMEOUT_MS")
    log_level: str = Field("INFO", alias="LOG_LEVEL")
    host: str = Field("0.0.0.0", alias="HOST")
    port: int = Field(8000, alias="PORT")

    model_config = {"env_file": ".env", "populate_by_name": True}


settings = Settings()
