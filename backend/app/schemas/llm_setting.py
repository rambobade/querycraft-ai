from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class LLMSettingUpdate(BaseModel):
    provider: str = Field("auto", pattern="^(auto|openai|gemini|groq|ollama|heuristic)$")
    api_key: Optional[str] = None
    model: str = "gpt-4o-mini"
    api_base: str = "https://api.openai.com/v1"
    temperature: float = Field(0.0, ge=0.0, le=2.0)

class LLMSettingResponse(BaseModel):
    provider: str
    has_key: bool
    model: str
    api_base: str
    temperature: float
    updated_at: Optional[datetime] = None

class LLMTestResponse(BaseModel):
    success: bool
    message: str
