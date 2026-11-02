"""
Query Optimizer Assistant for QueryCraft AI
Analyzes EXPLAIN query execution plans and generates heuristic and index optimization suggestions.
"""
from typing import Dict, Any, List
from sqlalchemy import text
from app.models.connection import DatabaseConnection
from app.services.connection_service import ConnectionService
from app.security.sql_validator import SQLValidator

class OptimizerService:
    @classmethod
    def analyze_query(cls, db_conn: DatabaseConnection, sql: str) -> Dict[str, Any]:
        """Run EXPLAIN plan and analyze query performance characteristics."""
        validation = SQLValidator.validate_and_sanitize(sql=sql, dialect=db_conn.database_type)
        if not validation.is_valid:
            return {
                "success": False,
                "error": "; ".join(validation.errors),
                "plan": [],
                "suggestions": [],
                "cost_indicator": "Unknown"
            }

        sanitized_sql = validation.sanitized_sql
        engine = ConnectionService.get_engine(db_conn)
        dialect = db_conn.database_type.lower()

        plan_rows: List[Dict[str, Any]] = []
        suggestions: List[Dict[str, str]] = []

        try:
            with engine.connect() as conn:
                if dialect == "sqlite":
                    explain_query = f"EXPLAIN QUERY PLAN {sanitized_sql}"
                    cursor = conn.execute(text(explain_query))
                    for r in cursor.fetchall():
                        plan_rows.append({"detail": str(r[-1])})
                elif dialect in ("postgresql", "mysql"):
                    explain_query = f"EXPLAIN {sanitized_sql}"
                    cursor = conn.execute(text(explain_query))
                    for r in cursor.fetchall():
                        plan_rows.append({"detail": " | ".join(str(x) for x in r)})
                else:
                    plan_rows.append({"detail": "Execution plan not supported for this dialect."})

        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to generate execution plan: {str(e).splitlines()[0]}",
                "plan": [],
                "suggestions": [],
                "cost_indicator": "Unknown"
            }

        # Analyze plan details and AST properties
        plan_text = " ".join([p.get("detail", "") for p in plan_rows]).upper()
        
        has_table_scan = "SCAN TABLE" in plan_text or "ALL" in plan_text or "SEQ SCAN" in plan_text
        has_index_search = "USING INDEX" in plan_text or "SEARCH TABLE" in plan_text or "INDEX" in plan_text
        
        cost_indicator = "Low"
        if has_table_scan and len(validation.tables) > 1:
            cost_indicator = "High"
        elif has_table_scan:
            cost_indicator = "Medium"
        elif has_index_search:
            cost_indicator = "Low"

        # Heuristic recommendations
        if has_table_scan:
            for tbl in validation.tables:
                suggestions.append({
                    "type": "Performance Warning",
                    "title": f"Full Table Scan on `{tbl}`",
                    "description": f"The query performs a full sequential scan across `{tbl}`. If `{tbl}` grows large, filtering by an indexed column or primary key will dramatically speed up response times."
                })

        if "LIKE '%" in sanitized_sql.upper():
            suggestions.append({
                "type": "Index Inefficiency",
                "title": "Leading Wildcard in LIKE",
                "description": "Using `LIKE '%keyword'` prevents standard B-Tree indexes from being utilized. Consider prefix matching (`LIKE 'keyword%'`) or a full-text search index."
            })

        if not validation.has_limit:
            suggestions.append({
                "type": "Safety Suggestion",
                "title": "Missing Explicit LIMIT Clause",
                "description": "Always supply an explicit `LIMIT` to prevent massive memory usage when querying unindexed tables in production."
            })

        if len(validation.tables) > 3:
            suggestions.append({
                "type": "Complexity Notice",
                "title": f"Multiple Table Joins ({len(validation.tables)} tables)",
                "description": f"Query joins {len(validation.tables)} tables ({', '.join(validation.tables)}). Ensure join conditions are mapped strictly across primary and foreign key constraints."
            })

        if not suggestions:
            suggestions.append({
                "type": "Optimization Verified",
                "title": "Query is Well-Formed",
                "description": "Indexes are properly utilized or dataset scope is appropriately constrained."
            })

        return {
            "success": True,
            "dialect": dialect,
            "cost_indicator": cost_indicator,
            "plan": plan_rows,
            "suggestions": suggestions,
            "tables_involved": validation.tables,
            "columns_involved": validation.columns
        }
