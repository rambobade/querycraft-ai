from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.connection import DatabaseConnection
from app.services.schema_service import SchemaService
from app.api.deps import get_current_user

router = APIRouter(prefix="/schema", tags=["Database Schema"])

@router.get("/{conn_id}")
def get_database_schema(
    conn_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Inspect and return complete database schema (tables, columns, types, keys, indexes)."""
    conn = db.query(DatabaseConnection).filter(
        DatabaseConnection.id == conn_id,
        DatabaseConnection.user_id == current_user.id
    ).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")

    try:
        schema = SchemaService.introspect_schema(conn)
        return schema
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Schema introspection failed: {str(e)}"
        )
