"""
Database Schema Service for QueryCraft AI
Introspects connected databases and formats schema context for the UI and AI LLM prompt.
"""
from typing import Dict, Any, List, Optional
from sqlalchemy import inspect, text
from app.models.connection import DatabaseConnection
from app.services.connection_service import ConnectionService

class SchemaService:
    @classmethod
    def introspect_schema(cls, db_conn: DatabaseConnection) -> Dict[str, Any]:
        """Deeply inspect database schema using SQLAlchemy inspector within a single connection."""
        engine = ConnectionService.get_engine(db_conn)
        tables_data: List[Dict[str, Any]] = []

        with engine.connect() as conn:
            inspector = inspect(conn)
            table_names = inspector.get_table_names()

            for table_name in sorted(table_names):
                # Columns
                columns: List[Dict[str, Any]] = []
                try:
                    raw_cols = inspector.get_columns(table_name)
                    for col in raw_cols:
                        columns.append({
                            "name": col["name"],
                            "type": str(col["type"]),
                            "nullable": col.get("nullable", True),
                            "default": str(col.get("default", "")) if col.get("default") is not None else None,
                            "primary_key": bool(col.get("primary_key", False)),
                        })
                except Exception:
                    pass

                # Primary Keys
                pk_constraint = inspector.get_pk_constraint(table_name)
                primary_keys = pk_constraint.get("constrained_columns", []) if pk_constraint else []

                # Ensure primary_key flag on columns
                for col in columns:
                    if col["name"] in primary_keys:
                        col["primary_key"] = True

                # Foreign Keys
                foreign_keys: List[Dict[str, Any]] = []
                try:
                    raw_fks = inspector.get_foreign_keys(table_name)
                    for fk in raw_fks:
                        foreign_keys.append({
                            "constrained_columns": fk.get("constrained_columns", []),
                            "referred_table": fk.get("referred_table", ""),
                            "referred_columns": fk.get("referred_columns", []),
                        })
                except Exception:
                    pass

                # Indexes
                indexes: List[Dict[str, Any]] = []
                try:
                    raw_indexes = inspector.get_indexes(table_name)
                    for idx in raw_indexes:
                        indexes.append({
                            "name": idx.get("name", ""),
                            "column_names": idx.get("column_names", []),
                            "unique": idx.get("unique", False),
                        })
                except Exception:
                    pass

                # Row count estimate (safe read on same open connection)
                row_count = 0
                try:
                    count_res = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar()
                    row_count = int(count_res) if count_res else 0
                except Exception:
                    pass

                tables_data.append({
                    "name": table_name,
                    "columns": columns,
                    "primary_keys": primary_keys,
                    "foreign_keys": foreign_keys,
                    "indexes": indexes,
                    "row_count": row_count,
                })

        return {
            "database_name": db_conn.name,
            "database_type": db_conn.database_type,
            "table_count": len(tables_data),
            "tables": tables_data,
        }

    @classmethod
    def get_schema_summary_for_llm(cls, db_conn: DatabaseConnection) -> str:
        """Construct a clean, token-efficient schema definition for the AI prompt."""
        schema = cls.introspect_schema(db_conn)
        lines: List[str] = [f"Database Type: {schema['database_type'].upper()}", "Tables & Schema:"]

        for tbl in schema["tables"]:
            col_parts = []
            for col in tbl["columns"]:
                pk_marker = " [PK]" if col["primary_key"] else ""
                col_parts.append(f"{col['name']} ({col['type']}){pk_marker}")
            
            lines.append(f"- Table `{tbl['name']}` ({tbl['row_count']} rows):")
            lines.append(f"  Columns: {', '.join(col_parts)}")

            if tbl["foreign_keys"]:
                fk_strs = []
                for fk in tbl["foreign_keys"]:
                    c_cols = ", ".join(fk["constrained_columns"])
                    r_cols = ", ".join(fk["referred_columns"])
                    fk_strs.append(f"({c_cols}) -> {fk['referred_table']}({r_cols})")
                lines.append(f"  Foreign Keys: {'; '.join(fk_strs)}")

        return "\n".join(lines)
