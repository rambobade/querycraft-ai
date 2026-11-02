from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class SavedQueryCreate(BaseModel):
    connection_id: str
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    natural_language_input: Optional[str] = None
    sql_query: str = Field(..., min_length=1)
    tags: Optional[str] = None

class SavedQueryResponse(BaseModel):
    id: str
    connection_id: str
    title: str
    description: Optional[str] = None
    natural_language_input: Optional[str] = None
    sql_query: str
    tags: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
