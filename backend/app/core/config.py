from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    app_env: str = "dev"                 # dev | prod
    # simple CSV; you can upgrade to List[AnyHttpUrl] later if you want strict validation
    cors_origins: str = ""               # e.g., "http://localhost:8081,https://myapp.com"

    class Config:
        env_file = ".env"

settings = Settings()
