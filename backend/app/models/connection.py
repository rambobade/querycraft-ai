import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class DatabaseConnection(Base):
    __tablename__ = "database_connections"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    database_type = Column(String(50), nullable=False)  # 'sqlite', 'postgresql', 'mysql'
    encrypted_credentials = Column(Text, nullable=False)
    
    # Safe metadata for UI display (no passwords or secret keys)
    host = Column(String(255), nullable=True)
    port = Column(String(10), nullable=True)
    database_name = Column(String(100), nullable=True)
    username = Column(String(100), nullable=True)
    is_sample = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="connections")
    query_history = relationship("QueryHistory", back_populates="connection", cascade="all, delete-orphan")
    saved_queries = relationship("SavedQuery", back_populates="connection", cascade="all, delete-orphan")
