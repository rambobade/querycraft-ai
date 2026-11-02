from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.saved_query import SavedQuery
from app.models.connection import DatabaseConnection
from app.schemas.saved_query import SavedQueryCreate, SavedQueryResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/saved-queries", tags=["Saved Queries"])

@router.get("", response_model=List[SavedQueryResponse])
def list_saved_queries(
    connection_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List bookmarked queries saved by the user."""
    q = db.query(SavedQuery).filter(SavedQuery.user_id == current_user.id)
    if connection_id:
        q = q.filter(SavedQuery.connection_id == connection_id)
    return q.order_by(SavedQuery.created_at.desc()).all()

@router.post("", response_model=SavedQueryResponse, status_code=status.HTTP_201_CREATED)
def create_saved_query(
    query_in: SavedQueryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save/bookmark a query for future use."""
    conn = db.query(DatabaseConnection).filter(
        DatabaseConnection.id == query_in.connection_id,
        DatabaseConnection.user_id == current_user.id
    ).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")

    saved = SavedQuery(
        user_id=current_user.id,
        connection_id=query_in.connection_id,
        title=query_in.title,
        description=query_in.description,
        natural_language_input=query_in.natural_language_input,
        sql_query=query_in.sql_query,
        tags=query_in.tags
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return saved

@router.delete("/{query_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_query(
    query_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a saved query."""
    saved = db.query(SavedQuery).filter(
        SavedQuery.id == query_id,
        SavedQuery.user_id == current_user.id
    ).first()
    if not saved:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved query not found.")

    db.delete(saved)
    db.commit()
    return None
