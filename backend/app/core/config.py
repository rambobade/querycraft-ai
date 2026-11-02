import os
import json
import base64
import secrets
from pathlib import Path
from typing import List
from cryptography.fernet import Fernet
from pydantic_settings import BaseSettings

KNOWN_DEFAULT_SECRETS = {
    "super-secret-querycraft-production-jwt-key-32chars",
    "super-secret-querycraft-ai-jwt-key-change-in-production-32chars",
    "change-me",
    "secret",
    "default-jwt-secret",
}

KNOWN_DEFAULT_KEYS = {
    "cXVlcnljcmFmdC1haS1zZWN1cmUtZW5jcnlwdGlvbiE=",
    base64.urlsafe_b64encode(b"querycraft-ai-secure-encryption!").decode(),
}

def _resolve_security_keys(app_env: str) -> tuple[str, str]:
    """
    Resolve JWT_SECRET and ENCRYPTION_KEY strictly:
    - In production: reject empty, missing, or default keys with a loud failure.
    - In development: auto-generate strong random keys and persist to untracked .dev_keys.json.
    """
    env_jwt = os.getenv("JWT_SECRET", "").strip()
    env_enc = os.getenv("ENCRYPTION_KEY", "").strip()

    is_prod = app_env.lower() == "production"

    if is_prod:
        if not env_jwt or env_jwt in KNOWN_DEFAULT_SECRETS:
            raise RuntimeError(
                "CRITICAL: QueryCraft cannot start in production mode with a missing, empty, or default JWT_SECRET. "
                "Set a unique 32+ character JWT_SECRET in your environment."
            )
        if not env_enc or env_enc in KNOWN_DEFAULT_KEYS:
            raise RuntimeError(
                "CRITICAL: QueryCraft cannot start in production mode with a missing, empty, or default ENCRYPTION_KEY. "
                "Set a unique 32-byte urlsafe base64-encoded ENCRYPTION_KEY in your environment."
            )
        return env_jwt, env_enc

    # Development / Testing mode:
    # If explicitly supplied, check validity
    if env_jwt and env_jwt not in KNOWN_DEFAULT_SECRETS and env_enc and env_enc not in KNOWN_DEFAULT_KEYS:
        return env_jwt, env_enc

    # Read or generate persistent local development keys in untracked file
    dev_keys_path = Path(__file__).resolve().parent.parent.parent / ".dev_keys.json"
    if dev_keys_path.exists():
        try:
            with open(dev_keys_path, "r", encoding="utf-8") as f:
                saved = json.load(f)
                jwt_val = saved.get("jwt_secret")
                enc_val = saved.get("encryption_key")
                if jwt_val and enc_val:
                    return env_jwt or jwt_val, env_enc or enc_val
        except Exception:
            pass

    # Generate new random dev keys
    new_jwt = env_jwt or secrets.token_urlsafe(32)
    new_enc = env_enc or Fernet.generate_key().decode()
    try:
        with open(dev_keys_path, "w", encoding="utf-8") as f:
            json.dump({"jwt_secret": new_jwt, "encryption_key": new_enc}, f, indent=2)
    except Exception:
        pass

    return new_jwt, new_enc


_APP_ENV = os.getenv("APP_ENV", "development").lower()
_RESOLVED_JWT, _RESOLVED_ENC = _resolve_security_keys(_APP_ENV)


class Settings(BaseSettings):
    APP_NAME: str = "QueryCraft AI"
    APP_ENV: str = _APP_ENV
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./querycraft.db")
    
    # Path to preloaded sample database
    SAMPLE_DB_PATH: str = os.getenv(
        "SAMPLE_DB_PATH",
        str(Path(__file__).resolve().parent.parent.parent.parent / "database" / "sample_ecommerce.db")
    )
    
    # Security
    JWT_SECRET: str = _RESOLVED_JWT
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENCRYPTION_KEY: str = _RESOLVED_ENC
    
    # Mode Flags
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "false").lower() == "true"
    ALLOW_PRIVATE_DB_HOSTS: bool = os.getenv("ALLOW_PRIVATE_DB_HOSTS", "false").lower() == "true"
    SQLITE_DATA_DIR: str = os.getenv(
        "SQLITE_DATA_DIR",
        str(Path(__file__).resolve().parent.parent.parent.parent / "database" / "uploads")
    )
    
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
    
    # CORS: Explicit allowed origins without wildcard when credentials are enabled
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = {"case_sensitive": True, "env_file": ".env", "extra": "allow"}

settings = Settings()
