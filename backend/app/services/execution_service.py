"""
Query Execution Service for QueryCraft AI
Executes validated SQL against target databases with read-only transaction isolation,
real execution timeouts per dialect, and metrics formatting.
"""
import time
from typing import Dict, Any, List, Optional
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import text
from app.core.config import settings
from app.models.connection import DatabaseConnection
from app.services.connection_service import ConnectionService
from app.security.sql_validator import SQLValidator, ValidationResult

def serialize_cell(val: Any) -> Any:
    """Serialize database types to JSON-safe primitives."""
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, bytes):
        return val.decode("utf-8", errors="replace")
    return val

class ExecutionService:
    @classmethod
    def execute_query(
        cls,
        db_conn: DatabaseConnection,
        sql: str
    ) -> Dict[str, Any]:
        """
        Validate and safely execute SQL query against connected target database.
        Validation cannot be skipped.
        Enforces read-only isolation and timeouts at both AST and database engine layers.
        """
        dialect = db_conn.database_type.lower()
        
        # 1. Deterministic AST validation
        validation: ValidationResult = SQLValidator.validate_and_sanitize(
            sql=sql,
            dialect=dialect,
            max_rows=settings.MAX_ROWS_RETURNED,
            default_limit=settings.DEFAULT_LIMIT
        )
        if not validation.is_valid:
            return {
                "success": False,
                "error": "; ".join(validation.errors),
                "columns": [],
                "rows": [],
                "row_count": 0,
                "duration_ms": 0.0,
                "sanitized_sql": sql,
                "warnings": validation.warnings,
            }
        
        sql_to_run = validation.sanitized_sql
        engine = ConnectionService.get_engine(db_conn)
        start_time = time.perf_counter()

        try:
            with engine.connect() as conn:
                # 2. Database-level read-only session isolation & statement timeouts
                timeout_ms = int(settings.QUERY_TIMEOUT_SECONDS * 1000)
                if dialect == "sqlite":
                    conn.execute(text("PRAGMA query_only = ON;"))
                elif dialect == "postgresql":
                    conn.execute(text("SET TRANSACTION READ ONLY;"))
                    conn.execute(text(f"SET statement_timeout = {timeout_ms};"))
                elif dialect == "mysql":
                    conn.execute(text("SET SESSION TRANSACTION READ ONLY;"))
                    conn.execute(text(f"SET SESSION max_execution_time = {timeout_ms};"))

                # 3. Execute the validated query
                cursor_result = conn.execute(text(sql_to_run))
                duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

                if not cursor_result.returns_rows:
                    return {
                        "success": True,
                        "columns": ["status"],
                        "rows": [{"status": "Query executed successfully with no rows returned."}],
                        "row_count": 0,
                        "duration_ms": duration_ms,
                        "sanitized_sql": sql_to_run,
                        "warnings": validation.warnings,
                    }

                columns = list(cursor_result.keys())
                raw_rows = cursor_result.fetchmany(settings.MAX_ROWS_RETURNED)
                
                rows: List[Dict[str, Any]] = []
                for r in raw_rows:
                    row_dict = {}
                    for idx, col in enumerate(columns):
                        row_dict[col] = serialize_cell(r[idx])
                    rows.append(row_dict)

                return {
                    "success": True,
                    "columns": columns,
                    "rows": rows,
                    "row_count": len(rows),
                    "duration_ms": duration_ms,
                    "sanitized_sql": sql_to_run,
                    "warnings": validation.warnings,
                }

        except Exception as e:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            raw_err = str(e)
            
            # Map database timeout and read-only messages cleanly
            if "interrupted" in raw_err.lower() or "statement_timeout" in raw_err.lower() or "max_execution_time" in raw_err.lower():
                err_msg = f"Query timed out after exceeding the {settings.QUERY_TIMEOUT_SECONDS}-second limit."
            elif "readonly" in raw_err.lower() or "read-only" in raw_err.lower() or "query_only" in raw_err.lower():
                err_msg = "Database violation: Attempted write operation blocked by read-only transaction isolation."
            else:
                err_msg = raw_err.split("\n")[0]
                if "syntax error" in err_msg.lower():
                    err_msg = f"SQL Execution Error: {err_msg}"

            return {
                "success": False,
                "error": err_msg,
                "columns": [],
                "rows": [],
                "row_count": 0,
                "duration_ms": duration_ms,
                "sanitized_sql": sql_to_run,
                "warnings": validation.warnings,
            }
