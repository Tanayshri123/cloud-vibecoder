from pydantic_settings import BaseSettings
from typing import List, Optional
import os
from pathlib import Path

# Get the backend directory path (2 levels up from this file: config.py -> core/ -> app/ -> backend/)
BACKEND_DIR = Path(__file__).parent.parent.parent
ENV_FILE = BACKEND_DIR / ".env"

class Settings(BaseSettings):
    app_env: str = "dev"                 # dev | prod
    # simple CSV; you can upgrade to List[AnyHttpUrl] later if you want strict validation
    cors_origins: str = ""               # e.g., "http://localhost:8081,https://myapp.com"
    
    # LLM Configuration
    openai_api_key: Optional[str] = None
    openai_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"       # Default to cost-effective model
    
    # GitHub OAuth Configuration
    github_client_id: Optional[str] = None
    github_client_secret: Optional[str] = None
    
    # VM Infrastructure Configuration (Phase 1)
    e2b_api_key: Optional[str] = None
    vm_timeout_seconds: int = 600  # 10 minutes default

    class Config:
        env_file = str(ENV_FILE)
        env_file_encoding = 'utf-8'

settings = Settings()
