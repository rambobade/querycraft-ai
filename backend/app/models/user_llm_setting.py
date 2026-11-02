import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class UserLLMSetting(Base):
    __tablename__ = "user_llm_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    provider = Column(String(50), default="auto", nullable=False)
    encrypted_api_key = Column(String(500), nullable=True)
    model = Column(String(100), default="gpt-4o-mini", nullable=False)
    api_base = Column(String(255), default="https://api.openai.com/v1", nullable=False)
    temperature = Column(Float, default=0.0, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="llm_setting")
