from app.schemas.user import UserRegister, UserLogin, TokenResponse, RefreshTokenRequest, UserResponse
from app.schemas.connection import ConnectionCreate, ConnectionUpdate, ConnectionResponse, ConnectionTestRequest, ConnectionTestResponse
from app.schemas.query import QueryValidateRequest, QueryValidateResponse, QueryExecuteRequest, QueryExecuteResponse, QueryHistoryResponse
from app.schemas.ai import GenerateSQLRequest, GenerateSQLResponse, ExplainSQLRequest, ExplainSQLResponse, OptimizeSQLRequest, OptimizeSQLResponse
from app.schemas.saved_query import SavedQueryCreate, SavedQueryResponse

__all__ = [
    "UserRegister", "UserLogin", "TokenResponse", "RefreshTokenRequest", "UserResponse",
    "ConnectionCreate", "ConnectionUpdate", "ConnectionResponse", "ConnectionTestRequest", "ConnectionTestResponse",
    "QueryValidateRequest", "QueryValidateResponse", "QueryExecuteRequest", "QueryExecuteResponse", "QueryHistoryResponse",
    "GenerateSQLRequest", "GenerateSQLResponse", "ExplainSQLRequest", "ExplainSQLResponse", "OptimizeSQLRequest", "OptimizeSQLResponse",
    "SavedQueryCreate", "SavedQueryResponse"
]
