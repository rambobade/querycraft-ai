import uuid
import pytest
from app.core.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.connection import DatabaseConnection
from app.models.user_llm_setting import UserLLMSetting
from app.schemas.user import UserRegister
from app.schemas.llm_setting import LLMSettingUpdate
from app.schemas.ai import GenerateSQLRequest
from app.api.routes import auth, connections, ai, settings_llm
from app.ai.sql_generator import SQLGenerator

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture(scope="module")
def test_user(db_session):
    email = f"ai.tester.{uuid.uuid4().hex[:8]}@querycraft.ai"
    reg_in = UserRegister(email=email, password="SafePassword999!", full_name="AI Tester")
    auth.register(reg_in, db=db_session)
    user = db_session.query(User).filter(User.email == email).first()
    return user

def test_user_llm_settings_encrypted_and_write_only(db_session, test_user):
    """Verify LLM settings are encrypted server-side and the key is write-only."""
    # 1. Initial settings have has_key = False
    init_res = settings_llm.get_user_llm_settings(current_user=test_user, db=db_session)
    assert init_res.has_key is False

    # 2. Update settings with an API key
    update_in = LLMSettingUpdate(
        provider="openai",
        api_key="sk-proj-testkey1234567890abcdef",
        model="gpt-4o",
        api_base="https://api.openai.com/v1",
        temperature=0.2
    )
    saved_res = settings_llm.update_user_llm_settings(update_in=update_in, current_user=test_user, db=db_session)
    assert saved_res.has_key is True
    assert saved_res.provider == "openai"
    assert saved_res.model == "gpt-4o"
    assert not hasattr(saved_res, "api_key")  # Never expose raw key in response

    # 3. Check DB record is encrypted
    db_record = db_session.query(UserLLMSetting).filter(UserLLMSetting.user_id == test_user.id).first()
    assert db_record.encrypted_api_key != "sk-proj-testkey1234567890abcdef"
    assert len(db_record.encrypted_api_key) > 30

def test_non_sample_db_without_llm_returns_honest_message(db_session, test_user):
    """Heuristic engine must refuse to hallucinate queries for non-sample databases."""
    custom_conn = DatabaseConnection(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        name="Custom Analytics DB",
        database_type="sqlite",
        database_name="custom_analytics.db",
        is_sample=False
    )
    
    res = SQLGenerator.generate_sql_sync(
        db_conn=custom_conn,
        natural_language_input="Show top 10 users"
    )
    assert res["is_valid"] is False
    assert res["sql"] == ""
    assert "AI provider must be configured" in res["explanation"]
    assert "Settings" in res["notice"]

def test_llm_failure_honest_fallback_notice(db_session, test_user):
    """When configured LLM fails, return honest source notice on sample DB."""
    import anyio
    user_conns = connections.list_connections(current_user=test_user, db=db_session)
    sample_conn = [c for c in user_conns if c.is_sample][0]

    # Provide an invalid endpoint that will fail
    bad_llm_config = {
        "provider": "openai",
        "api_key": "bad-key",
        "model": "gpt-4o-mini",
        "api_base": "http://127.0.0.1:9999/v1",  # Unreachable endpoint
        "temperature": 0.0
    }

    res = anyio.run(
        SQLGenerator.generate_sql,
        sample_conn,
        "Show all products",
        bad_llm_config
    )
    assert res["source"] == "heuristic"
    assert res["notice"] == "The AI provider failed, so the built-in matcher was used."
    assert "SELECT" in res["sql"].upper()

def test_ssrf_prevention_no_override_fields():
    """Verify GenerateSQLRequest has no override fields."""
    fields = GenerateSQLRequest.model_fields.keys()
    assert "api_base_override" not in fields
    assert "provider_override" not in fields
    assert "api_key_override" not in fields
    assert "model_override" not in fields
