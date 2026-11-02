import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limiter import auth_limiter, get_client_ip
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    encrypt_secret
)
from app.models.user import User
from app.models.connection import DatabaseConnection
from app.schemas.user import UserRegister, UserLogin, TokenResponse, RefreshTokenRequest, UserResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

def _set_auth_cookie(response: Optional[Response], access_token: str):
    if response:
        response.set_cookie(
            key="querycraft_access_token",
            value=access_token,
            httponly=True,
            samesite="lax",
            secure=(settings.APP_ENV == "production"),
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            path="/"
        )

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserRegister,
    request: Request = None,
    response: Response = None,
    db: Session = Depends(get_db)
):
    """Register a new user account with rate limiting and secure session cookie."""
    if request:
        auth_limiter.check(get_client_ip(request))

    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name or user_in.email.split("@")[0].title()
    )
    db.add(user)
    db.flush()

    # Pre-seed a default "Sample E-Commerce Store (SQLite)" connection
    sample_conn = DatabaseConnection(
        user_id=user.id,
        name="Sample E-Commerce Store (SQLite)",
        database_type="sqlite",
        database_name="sample_ecommerce.db",
        encrypted_credentials=encrypt_secret("sqlite:///sample_ecommerce.db"),
        is_sample=True
    )
    db.add(sample_conn)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    _set_auth_cookie(response, access_token)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/login", response_model=TokenResponse)
def login(
    user_in: UserLogin,
    request: Request = None,
    response: Response = None,
    db: Session = Depends(get_db)
):
    """Authenticate and obtain JWT tokens via response cookie and body."""
    if request:
        auth_limiter.check(get_client_ip(request))

    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    _set_auth_cookie(response, access_token)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/logout")
def logout(response: Response):
    """Log out user by invalidating the httpOnly session cookie."""
    response.delete_cookie(key="querycraft_access_token", path="/")
    return {"message": "Successfully logged out."}

@router.post("/demo", response_model=TokenResponse)
def demo_login(
    request: Request = None,
    response: Response = None,
    db: Session = Depends(get_db)
):
    """Create and authenticate a temporary throwaway demo account when DEMO_MODE=true."""
    if not settings.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="1-Click Demo Login is disabled on this server. Please create an account or sign in."
        )
    if request:
        auth_limiter.check(get_client_ip(request))

    demo_email = f"demo_{secrets.token_hex(4)}@querycraft.local"
    demo_password = secrets.token_urlsafe(16)

    user = User(
        email=demo_email,
        password_hash=get_password_hash(demo_password),
        full_name="Demo User"
    )
    db.add(user)
    db.flush()

    sample_conn = DatabaseConnection(
        user_id=user.id,
        name="Sample E-Commerce Store (SQLite)",
        database_type="sqlite",
        database_name="sample_ecommerce.db",
        encrypted_credentials=encrypt_secret("sqlite:///sample_ecommerce.db"),
        is_sample=True
    )
    db.add(sample_conn)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    _set_auth_cookie(response, access_token)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    req: RefreshTokenRequest,
    response: Response = None,
    db: Session = Depends(get_db)
):
    """Refresh expired access token using valid refresh token."""
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token."
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )

    access_token = create_access_token(user.id)
    new_refresh = create_refresh_token(user.id)
    _set_auth_cookie(response, access_token)

    return TokenResponse(access_token=access_token, refresh_token=new_refresh)

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Return profile of authenticated user."""
    return current_user
