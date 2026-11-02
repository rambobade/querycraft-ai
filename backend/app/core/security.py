import base64
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict
import jwt
import bcrypt
from cryptography.fernet import Fernet
from app.core.config import settings

def _get_fernet() -> Fernet:
    """Return Fernet cipher initialized with app encryption key."""
    key = settings.ENCRYPTION_KEY
    # Ensure key is valid 32-byte base64
    try:
        raw = base64.urlsafe_b64decode(key.encode())
        if len(raw) != 32:
            # Pad or truncate to 32 bytes
            raw = (raw + b"0" * 32)[:32]
            key = base64.urlsafe_b64encode(raw).decode()
    except Exception:
        key = base64.urlsafe_b64encode(b"querycraft-ai-secure-encryption!").decode()
    return Fernet(key.encode())

def encrypt_secret(secret: str) -> str:
    """Encrypt a secret string (e.g. database password or URL)."""
    if not secret:
        return ""
    fernet = _get_fernet()
    return fernet.encrypt(secret.encode()).decode()

def decrypt_secret(encrypted_secret: str) -> str:
    """Decrypt an encrypted secret string."""
    if not encrypted_secret:
        return ""
    fernet = _get_fernet()
    return fernet.decrypt(encrypted_secret.encode()).decode()

def get_password_hash(password: str) -> str:
    """Hash password securely using bcrypt."""
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    payload: Dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "type": "access",
        "iat": datetime.now(timezone.utc)
    }
    encoded = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded

def create_refresh_token(subject: str) -> str:
    """Create JWT refresh token."""
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload: Dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "type": "refresh",
        "iat": datetime.now(timezone.utc)
    }
    encoded = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except Exception:
        return None
