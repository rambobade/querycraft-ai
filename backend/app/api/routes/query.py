from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.connection import DatabaseConnection
from app.models.query_history import QueryHistory
from app.schemas.query import (
    QueryValidateRequest,
    QueryValidateResponse,
    QueryExecuteRequest,
    QueryExecuteResponse,
    QueryHistoryResponse
)
from app.security.sql_validator import SQLValidator
from app.services.execution_service import ExecutionService
from app.api.deps import get_current_user

router = APIRouter(prefix="/query", tags=["Query Operations"])

@router.post("/validate", response_model=QueryValidateResponse)
def validate_sql(
    req: QueryValidateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deterministically parse and validate SQL AST without executing."""
    conn = db.query(DatabaseConnection).filter(
        DatabaseConnection.id == req.connection_id,
        DatabaseConnection.user_id == current_user.id
    ).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")

    res = SQLValidator.validate_and_sanitize(sql=req.sql, dialect=conn.database_type)
    return QueryValidateResponse(**res.model_dump())

@router.post("/execute", response_model=QueryExecuteResponse)
def execute_sql(
    req: QueryExecuteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute validated SQL query against target database and log to history."""
    conn = db.query(DatabaseConnection).filter(
        DatabaseConnection.id == req.connection_id,
        DatabaseConnection.user_id == current_user.id
    ).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")

    res = ExecutionService.execute_query(
        db_conn=conn,
        sql=req.sql,
        skip_validation=req.skip_validation
    )

    # Record to QueryHistory
    history_entry = QueryHistory(
        user_id=current_user.id,
        connection_id=conn.id,
        natural_language_input=req.natural_language_input,
        generated_sql=req.sql,
        executed_sql=res.get("sanitized_sql", req.sql),
        execution_status="success" if res.get("success") else "error",
        execution_duration_ms=res.get("duration_ms", 0.0),
        row_count=res.get("row_count", 0),
        error_message=res.get("error")
    )
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)

    res["history_id"] = history_entry.id
    return QueryExecuteResponse(**res)

@router.get("/history", response_model=List[QueryHistoryResponse])
def get_query_history(
    connection_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve query execution history for current user."""
    q = db.query(QueryHistory).filter(QueryHistory.user_id == current_user.id)
    if connection_id:
        q = q.filter(QueryHistory.connection_id == connection_id)
    
    return q.order_by(QueryHistory.created_at.desc()).limit(limit).all()

@router.delete("/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history_entry(
    history_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a query history entry."""
    entry = db.query(QueryHistory).filter(
        QueryHistory.id == history_id,
        QueryHistory.user_id == current_user.id
    ).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History entry not found.")
    
    db.delete(entry)
    db.commit()
    return None

@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
def clear_all_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear all execution history for the current user."""
    db.query(QueryHistory).filter(QueryHistory.user_id == current_user.id).delete()
    db.commit()
    return None
