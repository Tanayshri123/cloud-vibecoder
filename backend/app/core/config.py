from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    app_env: str = "dev"                 # dev | prod
    # simple CSV; you can upgrade to List[AnyHttpUrl] later if you want strict validation
    cors_origins: str = ""               # e.g., "http://localhost:8081,https://myapp.com"
    
    # LLM Configuration
    openai_api_key: Optional[str] = None
    openai_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"       # Default to cost-effective model
    
    # GitHub Configuration (for future use)
    github_token: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
