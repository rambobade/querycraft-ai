from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decrypt_secret
from app.core.rate_limiter import ai_limiter
from app.models.user import User
from app.models.user_llm_setting import UserLLMSetting
from app.models.connection import DatabaseConnection
from app.schemas.ai import (
    GenerateSQLRequest,
    GenerateSQLResponse,
    ExplainSQLRequest,
    ExplainSQLResponse,
    OptimizeSQLRequest,
    OptimizeSQLResponse
)
from app.ai.sql_generator import SQLGenerator
from app.ai.explainer import SQLExplainer
from app.services.optimizer_service import OptimizerService
from app.api.deps import get_current_user

router = APIRouter(prefix="/ai", tags=["AI Engine"])

@router.post("/generate-sql", response_model=GenerateSQLResponse)
async def generate_sql(
    req: GenerateSQLRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate SQL from natural language using schema context and server-configured LLM."""
    ai_limiter.check(current_user.id)

    conn = db.query(DatabaseConnection).filter(
        DatabaseConnection.id == req.connection_id,
        DatabaseConnection.user_id == current_user.id
    ).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Database connection not found.")

    # Retrieve user's encrypted LLM settings
    user_setting = db.query(UserLLMSetting).filter(UserLLMSetting.user_id == current_user.id).first()
    llm_config = None
    if user_setting:
        api_key = decrypt_secret(user_setting.encrypted_api_key) if user_setting.encrypted_api_key else None
        llm_config = {
            "provider": user_setting.provider,
            "api_key": api_key,
            "model": user_setting.model,
            "api_base": user_setting.api_base,
            "temperature": user_setting.temperature
        }

    res = await SQLGenerator.generate_sql(
        db_conn=conn,
        natural_language_input=req.natural_language_input,
        llm_config=llm_config
    )
    return GenerateSQLResponse(**res)

@router.post("/explain-sql", response_model=ExplainSQLResponse)
def explain_sql(
    req: ExplainSQLRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Explain SQL query with deterministic step-by-step breakdown and operations."""
    conn = db.query(DatabaseConnection).filter(
        DatabaseConnection.id == req.connection_id,
        DatabaseConnection.user_id == current_user.id
    ).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Database connection not found.")

    res = SQLExplainer.explain_query(sql=req.sql, dialect=conn.database_type)
    return ExplainSQLResponse(**res)

@router.post("/optimize-sql", response_model=OptimizeSQLResponse)
def optimize_sql(
    req: OptimizeSQLRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze query execution plan and recommend performance indexes."""
    conn = db.query(DatabaseConnection).filter(
        DatabaseConnection.id == req.connection_id,
        DatabaseConnection.user_id == current_user.id
    ).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Database connection not found.")

    res = OptimizerService.analyze_query(db_conn=conn, sql=req.sql)
    return OptimizeSQLResponse(**res)
