from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import encrypt_secret
from app.models.user import User
from app.models.connection import DatabaseConnection
from app.schemas.connection import (
    ConnectionCreate,
    ConnectionUpdate,
    ConnectionResponse,
    ConnectionTestRequest,
    ConnectionTestResponse
)
from app.services.connection_service import ConnectionService
from app.core.rate_limiter import test_conn_limiter
from app.api.deps import get_current_user

router = APIRouter(prefix="/connections", tags=["Database Connections"])

@router.get("", response_model=List[ConnectionResponse])
def list_connections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all database connections owned by the authenticated user."""
    return db.query(DatabaseConnection).filter(
        DatabaseConnection.user_id == current_user.id
    ).order_by(DatabaseConnection.created_at.desc()).all()

@router.post("", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED)
def create_connection(
    conn_in: ConnectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new database connection."""
    try:
        raw_conn_string = ConnectionService.build_connection_string(conn_in.model_dump())
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Pre-test connection before saving
    test_res = ConnectionService.test_connection_url(raw_conn_string)
    if not test_res["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to connect to database: {test_res['message']}"
        )

    encrypted = encrypt_secret(raw_conn_string)
    new_conn = DatabaseConnection(
        user_id=current_user.id,
        name=conn_in.name,
        database_type=conn_in.database_type,
        host=conn_in.host,
        port=conn_in.port,
        database_name=conn_in.database_name,
        username=conn_in.username,
        encrypted_credentials=encrypted,
        is_sample=conn_in.is_sample
    )
    db.add(new_conn)
    db.commit()
    db.refresh(new_conn)
    return new_conn

@router.get("/{conn_id}", response_model=ConnectionResponse)
def get_connection(
    conn_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific connection by ID."""
    conn = db.query(DatabaseConnection).filter(
        DatabaseConnection.id == conn_id,
        DatabaseConnection.user_id == current_user.id
    ).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")
    return conn

@router.put("/{conn_id}", response_model=ConnectionResponse)
def update_connection(
    conn_id: str,
    conn_update: ConnectionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update connection details."""
    conn = db.query(DatabaseConnection).filter(
        DatabaseConnection.id == conn_id,
        DatabaseConnection.user_id == current_user.id
    ).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")

    if conn_update.name:
        conn.name = conn_update.name

    if conn_update.connection_string or conn_update.password or conn_update.host:
        raw_conn = conn_update.connection_string or ConnectionService.build_connection_string({
            "database_type": conn.database_type,
            "host": conn_update.host or conn.host,
            "port": conn_update.port or conn.port,
            "database_name": conn_update.database_name or conn.database_name,
            "username": conn_update.username or conn.username,
            "password": conn_update.password or "",
        })
        test_res = ConnectionService.test_connection_url(raw_conn)
        if not test_res["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Connection test failed: {test_res['message']}"
            )
        conn.encrypted_credentials = encrypt_secret(raw_conn)
        if conn_update.host: conn.host = conn_update.host
        if conn_update.port: conn.port = conn_update.port
        if conn_update.database_name: conn.database_name = conn_update.database_name
        if conn_update.username: conn.username = conn_update.username

    db.commit()
    db.refresh(conn)
    return conn

@router.delete("/{conn_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_connection(
    conn_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a database connection."""
    conn = db.query(DatabaseConnection).filter(
        DatabaseConnection.id == conn_id,
        DatabaseConnection.user_id == current_user.id
    ).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")

    db.delete(conn)
    db.commit()
    return None

@router.post("/{conn_id}/test", response_model=ConnectionTestResponse)
def test_saved_connection(
    conn_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Test health of an existing saved connection."""
    conn = db.query(DatabaseConnection).filter(
        DatabaseConnection.id == conn_id,
        DatabaseConnection.user_id == current_user.id
    ).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")

    res = ConnectionService.test_connection(conn)
    return ConnectionTestResponse(success=res["success"], message=res["message"])

@router.post("/test-raw", response_model=ConnectionTestResponse)
def test_raw_connection(
    test_req: ConnectionTestRequest,
    current_user: User = Depends(get_current_user)
):
    """Test connection parameters without saving. Requires authenticated user and rate-limited."""
    test_conn_limiter.check(current_user.id)
    try:
        url = ConnectionService.build_connection_string(test_req.model_dump())
        res = ConnectionService.test_connection_url(url)
        return ConnectionTestResponse(success=res["success"], message=res["message"])
    except Exception as e:
        return ConnectionTestResponse(success=False, message=str(e))
