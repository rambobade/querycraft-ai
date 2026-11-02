from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ConnectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    database_type: str = Field(..., pattern="^(sqlite|postgresql|mysql)$")
    
    # Form input fields or direct connection string
    connection_string: Optional[str] = None
    host: Optional[str] = None
    port: Optional[str] = None
    database_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    is_sample: bool = False

class ConnectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    connection_string: Optional[str] = None
    host: Optional[str] = None
    port: Optional[str] = None
    database_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None

class ConnectionResponse(BaseModel):
    id: str
    name: str
    database_type: str
    host: Optional[str] = None
    port: Optional[str] = None
    database_name: Optional[str] = None
    username: Optional[str] = None
    is_sample: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class ConnectionTestRequest(BaseModel):
    database_type: str
    connection_string: Optional[str] = None
    host: Optional[str] = None
    port: Optional[str] = None
    database_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None

class ConnectionTestResponse(BaseModel):
    success: bool
    message: str
