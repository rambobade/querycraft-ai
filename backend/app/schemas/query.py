from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class QueryValidateRequest(BaseModel):
    connection_id: str
    sql: str

class QueryValidateResponse(BaseModel):
    is_valid: bool
    sanitized_sql: str
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    query_type: str = "SELECT"
    tables: List[str] = Field(default_factory=list)
    columns: List[str] = Field(default_factory=list)
    has_limit: bool = False
    applied_limit: Optional[int] = None

class QueryExecuteRequest(BaseModel):
    connection_id: str
    sql: str
    natural_language_input: Optional[str] = None
    skip_validation: bool = False

class QueryExecuteResponse(BaseModel):
    success: bool
    columns: List[str] = Field(default_factory=list)
    rows: List[Dict[str, Any]] = Field(default_factory=list)
    row_count: int = 0
    duration_ms: float = 0.0
    sanitized_sql: str = ""
    warnings: List[str] = Field(default_factory=list)
    error: Optional[str] = None
    history_id: Optional[str] = None

class QueryHistoryResponse(BaseModel):
    id: str
    connection_id: str
    natural_language_input: Optional[str] = None
    generated_sql: str
    executed_sql: str
    execution_status: str
    execution_duration_ms: float
    row_count: int
    error_message: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
