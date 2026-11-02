from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "read_only_mode": settings.READ_ONLY_MODE,
        "max_rows": settings.MAX_ROWS_RETURNED,
        "default_llm_provider": settings.LLM_PROVIDER
    }
