from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
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
    """Generate SQL from natural language using schema context and LLM."""
    conn = db.query(DatabaseConnection).filter(
        DatabaseConnection.id == req.connection_id,
        DatabaseConnection.user_id == current_user.id
    ).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Database connection not found.")

    res = await SQLGenerator.generate_sql(
        db_conn=conn,
        natural_language_input=req.natural_language_input,
        provider_override=req.provider_override,
        api_key_override=req.api_key_override,
        model_override=req.model_override,
        api_base_override=req.api_base_override
    )
    return GenerateSQLResponse(**res)

@router.post("/explain-sql", response_model=ExplainSQLResponse)
def explain_sql(
    req: ExplainSQLRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Explain SQL query with step-by-step breakdown and operations."""
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
    """Analyze query execution plan and generate optimization recommendations."""
    conn = db.query(DatabaseConnection).filter(
        DatabaseConnection.id == req.connection_id,
        DatabaseConnection.user_id == current_user.id
    ).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Database connection not found.")

    res = OptimizerService.analyze_query(db_conn=conn, sql=req.sql)
    return OptimizeSQLResponse(**res)
