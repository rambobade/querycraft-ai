"""
Query Execution Service for QueryCraft AI
Executes validated SQL against target databases with timeout enforcement, metrics, and safe formatting.
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
        sql: str,
        skip_validation: bool = False
    ) -> Dict[str, Any]:
        """Validate and safely execute SQL query against connected target database."""
        dialect = db_conn.database_type.lower()
        
        # 1. AST deterministic validation
        validation: Optional[ValidationResult] = None
        sql_to_run = sql
        
        if not skip_validation:
            validation = SQLValidator.validate_and_sanitize(
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
                # Wrap in timeout and execute
                cursor_result = conn.execute(
                    text(sql_to_run).execution_options(
                        timeout=settings.QUERY_TIMEOUT_SECONDS
                    )
                )

                duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

                if not cursor_result.returns_rows:
                    return {
                        "success": True,
                        "columns": ["status"],
                        "rows": [{"status": "Query executed successfully with no rows returned."}],
                        "row_count": 0,
                        "duration_ms": duration_ms,
                        "sanitized_sql": sql_to_run,
                        "warnings": validation.warnings if validation else [],
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
                    "warnings": validation.warnings if validation else [],
                }

        except Exception as e:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            # Clean error message without system path leaks
            err_msg = str(e).split("\n")[0]
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
                "warnings": validation.warnings if validation else [],
            }
