from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class GenerateSQLRequest(BaseModel):
    connection_id: str
    natural_language_input: str
    provider_override: Optional[str] = None
    api_key_override: Optional[str] = None
    model_override: Optional[str] = None
    api_base_override: Optional[str] = None

class GenerateSQLResponse(BaseModel):
    sql: str
    sanitized_sql: str
    explanation: str
    tables_used: List[str] = Field(default_factory=list)
    query_type: str = "SELECT"
    warnings: List[str] = Field(default_factory=list)
    confidence: str = "high"
    source: str = "heuristic"
    is_valid: bool = True
    validation_errors: List[str] = Field(default_factory=list)

class ExplainSQLRequest(BaseModel):
    connection_id: str
    sql: str

class ExplainSQLResponse(BaseModel):
    summary: str
    steps: List[str] = Field(default_factory=list)
    operations: List[str] = Field(default_factory=list)
    performance_notes: str
    security_status: str

class OptimizeSQLRequest(BaseModel):
    connection_id: str
    sql: str

class OptimizeSQLResponse(BaseModel):
    success: bool
    dialect: str
    cost_indicator: str
    plan: List[Dict[str, Any]] = Field(default_factory=list)
    suggestions: List[Dict[str, str]] = Field(default_factory=list)
    tables_involved: List[str] = Field(default_factory=list)
    columns_involved: List[str] = Field(default_factory=list)
    error: Optional[str] = None
