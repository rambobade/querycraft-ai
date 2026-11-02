import os
import base64
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List

# Ensure a deterministic or persistent encryption key if not provided
_DEFAULT_FERNET_KEY = base64.urlsafe_b64encode(b"querycraft-ai-secure-encryption!").decode()

class Settings(BaseSettings):
    APP_NAME: str = "QueryCraft AI"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./querycraft.db")
    
    # Path to preloaded sample database
    SAMPLE_DB_PATH: str = os.getenv(
        "SAMPLE_DB_PATH",
        str(Path(__file__).resolve().parent.parent.parent.parent / "database" / "sample_ecommerce.db")
    )
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-querycraft-ai-jwt-key-change-in-production-32chars")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", _DEFAULT_FERNET_KEY)
    
    # LLM Settings
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "auto") # auto, openai, groq, ollama, gemini, heuristic
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    LLM_API_BASE: str = os.getenv("LLM_API_BASE", "https://api.openai.com/v1")
    LLM_TEMPERATURE: float = 0.0
    
    # Execution & Limits
    QUERY_TIMEOUT_SECONDS: int = 15
    MAX_ROWS_RETURNED: int = 1000
    DEFAULT_LIMIT: int = 100
    READ_ONLY_MODE: bool = True
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "*"]

    model_config = {"case_sensitive": True, "env_file": ".env", "extra": "allow"}

settings = Settings()
