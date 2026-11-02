import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class QueryHistory(Base):
    __tablename__ = "query_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    connection_id = Column(String(36), ForeignKey("database_connections.id", ondelete="CASCADE"), nullable=False, index=True)
    
    natural_language_input = Column(Text, nullable=True)
    generated_sql = Column(Text, nullable=False)
    executed_sql = Column(Text, nullable=False)
    execution_status = Column(String(50), default="success", nullable=False)  # success, error, blocked
    execution_duration_ms = Column(Float, default=0.0, nullable=False)
    row_count = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="query_history")
    connection = relationship("DatabaseConnection", back_populates="query_history")
