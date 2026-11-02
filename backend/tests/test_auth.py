import uuid
import pytest
from app.core.database import SessionLocal, Base, engine
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, RefreshTokenRequest
from app.api.routes import auth
from fastapi import HTTPException

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_register_and_login_flow(db_session):
    email = f"architect.{uuid.uuid4().hex[:8]}@querycraft.ai"
    password = "SuperSecurePassword123!"

    # 1. Register
    reg_in = UserRegister(email=email, password=password, full_name="Direct Architect")
    token_res = auth.register(reg_in, db=db_session)
    assert token_res.access_token is not None
    assert token_res.refresh_token is not None
    assert token_res.token_type == "bearer"

    # 2. Duplicate registration raises 400
    with pytest.raises(HTTPException) as exc_info:
        auth.register(reg_in, db=db_session)
    assert exc_info.value.status_code == 400

    # 3. Successful login
    login_in = UserLogin(email=email, password=password)
    login_res = auth.login(login_in, db=db_session)
    assert login_res.access_token is not None

    # 4. Invalid password raises 401
    bad_login = UserLogin(email=email, password="WrongPassword999")
    with pytest.raises(HTTPException) as exc_info2:
        auth.login(bad_login, db=db_session)
    assert exc_info2.value.status_code == 401

    # 5. Refresh token
    refresh_in = RefreshTokenRequest(refresh_token=token_res.refresh_token)
    refreshed = auth.refresh_token(refresh_in, db=db_session)
    assert refreshed.access_token is not None


def test_password_length_requirement(db_session):
    import pydantic
    with pytest.raises(pydantic.ValidationError):
        UserRegister(
            email=f"short.{uuid.uuid4().hex[:6]}@querycraft.ai",
            password="short",
            full_name="Short"
        )


def test_logout_and_demo(db_session):
    from fastapi import Response
    from app.core.config import settings

    res = Response()
    logout_out = auth.logout(response=res)
    assert "logged out" in logout_out["message"]

    # Test demo login with DEMO_MODE enabled
    orig_demo = settings.DEMO_MODE
    try:
        settings.DEMO_MODE = True
        demo_res = auth.demo_login(response=res, db=db_session)
        assert demo_res.access_token is not None
        assert demo_res.refresh_token is not None
    finally:
        settings.DEMO_MODE = orig_demo

