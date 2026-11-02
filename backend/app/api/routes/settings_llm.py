import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import encrypt_secret, decrypt_secret
from app.core.rate_limiter import ai_limiter
from app.models.user import User
from app.models.user_llm_setting import UserLLMSetting
from app.schemas.llm_setting import LLMSettingUpdate, LLMSettingResponse, LLMTestResponse
from app.ai.provider import LLMProviderFactory
from app.api.deps import get_current_user

logger = logging.getLogger("querycraft")
router = APIRouter(prefix="/settings/llm", tags=["User LLM Settings"])

@router.get("", response_model=LLMSettingResponse)
def get_user_llm_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve user's encrypted LLM configuration. API keys are write-only."""
    setting = db.query(UserLLMSetting).filter(UserLLMSetting.user_id == current_user.id).first()
    if not setting:
        return LLMSettingResponse(
            provider="auto",
            has_key=False,
            model="gpt-4o-mini",
            api_base="https://api.openai.com/v1",
            temperature=0.0,
            updated_at=None
        )

    has_key = bool(setting.encrypted_api_key)
    return LLMSettingResponse(
        provider=setting.provider,
        has_key=has_key,
        model=setting.model,
        api_base=setting.api_base,
        temperature=setting.temperature,
        updated_at=setting.updated_at
    )

@router.put("", response_model=LLMSettingResponse)
def update_user_llm_settings(
    update_in: LLMSettingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save or update user's LLM configuration with server-side Fernet encryption."""
    setting = db.query(UserLLMSetting).filter(UserLLMSetting.user_id == current_user.id).first()
    if not setting:
        setting = UserLLMSetting(user_id=current_user.id)
        db.add(setting)

    setting.provider = update_in.provider
    setting.model = update_in.model
    setting.api_base = update_in.api_base.rstrip("/")
    setting.temperature = update_in.temperature

    # Only update key if explicitly passed
    if update_in.api_key is not None:
        clean_key = update_in.api_key.strip()
        if clean_key:
            setting.encrypted_api_key = encrypt_secret(clean_key)
        else:
            setting.encrypted_api_key = None

    db.commit()
    db.refresh(setting)

    return LLMSettingResponse(
        provider=setting.provider,
        has_key=bool(setting.encrypted_api_key),
        model=setting.model,
        api_base=setting.api_base,
        temperature=setting.temperature,
        updated_at=setting.updated_at
    )

@router.post("/test", response_model=LLMTestResponse)
async def test_user_llm_connection(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify saved LLM provider credentials by attempting a light test query."""
    ai_limiter.check(current_user.id)
    setting = db.query(UserLLMSetting).filter(UserLLMSetting.user_id == current_user.id).first()
    
    if not setting or not setting.encrypted_api_key:
        return LLMTestResponse(
            success=False,
            message="No API key is configured. Please enter and save an API key first."
        )

    try:
        decrypted_key = decrypt_secret(setting.encrypted_api_key)
        provider = LLMProviderFactory.get_provider(
            provider_name=setting.provider,
            api_key=decrypted_key,
            model=setting.model,
            api_base=setting.api_base
        )
        if not provider:
            return LLMTestResponse(
                success=False,
                message=f"Provider '{setting.provider}' is not configured for remote generation."
            )

        res = await provider.generate_completion(
            system_prompt="Return a JSON object with status ok: {\"status\": \"ok\"}",
            user_prompt="Ping",
            temperature=0.0
        )
        if res:
            return LLMTestResponse(
                success=True,
                message=f"Successfully connected to {setting.provider.title()} ({setting.model})."
            )
        return LLMTestResponse(success=False, message="Provider returned empty response.")
    except Exception as e:
        logger.warning(f"LLM test connection failed: {e}")
        return LLMTestResponse(
            success=False,
            message=f"Connection test failed: {str(e).splitlines()[0]}"
        )
