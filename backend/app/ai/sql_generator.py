"""
SQL Generation Engine for QueryCraft AI
Coordinates schema introspection, LLM prompt engineering, AST security validation, and response packaging.
"""
from typing import Dict, Any, Optional
from app.models.connection import DatabaseConnection
from app.services.schema_service import SchemaService
from app.security.sql_validator import SQLValidator
from app.ai.prompt_builder import SYSTEM_PROMPT, build_generation_prompt
from app.ai.provider import LLMProviderFactory
from app.ai.heuristic_engine import HeuristicSQLEngine

class SQLGenerator:
    @classmethod
    def generate_sql_sync(
        cls,
        db_conn: DatabaseConnection,
        natural_language_input: str,
        provider_override: Optional[str] = None,
        api_key_override: Optional[str] = None,
        model_override: Optional[str] = None,
        api_base_override: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Synchronous version for offline/heuristic generation and deterministic validation."""
        dialect = db_conn.database_type.lower()
        schema_summary = SchemaService.get_schema_summary_for_llm(db_conn)
        
        response_payload = HeuristicSQLEngine.generate_sql(
            question=natural_language_input,
            schema_summary=schema_summary,
            dialect=dialect
        )
        source = "heuristic"

        raw_sql = response_payload.get("sql", "").strip()
        explanation = response_payload.get("explanation", "")
        tables_used = response_payload.get("tables_used", [])
        warnings = list(response_payload.get("warnings", []))
        confidence = response_payload.get("confidence", "high")

        # Deterministic AST Security Validation
        validation = SQLValidator.validate_and_sanitize(
            sql=raw_sql,
            dialect=dialect
        )

        for w in validation.warnings:
            if w not in warnings:
                warnings.append(w)

        if not validation.is_valid:
            return {
                "sql": raw_sql,
                "sanitized_sql": raw_sql,
                "explanation": explanation or "Query failed security validation checks.",
                "tables_used": tables_used or validation.tables,
                "query_type": validation.query_type,
                "warnings": warnings,
                "confidence": "low",
                "source": source,
                "is_valid": False,
                "validation_errors": validation.errors
            }

        return {
            "sql": validation.sanitized_sql,
            "sanitized_sql": validation.sanitized_sql,
            "explanation": explanation,
            "tables_used": validation.tables if validation.tables else tables_used,
            "query_type": validation.query_type,
            "warnings": warnings,
            "confidence": confidence,
            "source": source,
            "is_valid": True,
            "validation_errors": []
        }

    @classmethod
    async def generate_sql(
        cls,
        db_conn: DatabaseConnection,
        natural_language_input: str,
        provider_override: Optional[str] = None,
        api_key_override: Optional[str] = None,
        model_override: Optional[str] = None,
        api_base_override: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate, validate, and package SQL query from natural language."""
        dialect = db_conn.database_type.lower()
        schema_summary = SchemaService.get_schema_summary_for_llm(db_conn)
        
        provider = LLMProviderFactory.get_provider(
            provider_name=provider_override,
            api_key=api_key_override,
            model=model_override,
            api_base=api_base_override
        )

        response_payload: Optional[Dict[str, Any]] = None
        source = "heuristic"

        if provider:
            try:
                user_prompt = build_generation_prompt(
                    natural_language_input=natural_language_input,
                    schema_summary=schema_summary,
                    dialect=dialect
                )
                response_payload = await provider.generate_completion(
                    system_prompt=SYSTEM_PROMPT,
                    user_prompt=user_prompt
                )
                source = "llm"
            except Exception as e:
                # Log or handle provider error, then fall back to heuristic
                response_payload = None

        if not response_payload or "sql" not in response_payload:
            response_payload = HeuristicSQLEngine.generate_sql(
                question=natural_language_input,
                schema_summary=schema_summary,
                dialect=dialect
            )
            source = "heuristic"

        raw_sql = response_payload.get("sql", "").strip()
        explanation = response_payload.get("explanation", "")
        tables_used = response_payload.get("tables_used", [])
        query_type = response_payload.get("query_type", "SELECT")
        warnings = list(response_payload.get("warnings", []))
        confidence = response_payload.get("confidence", "high")

        # Deterministic AST Security Validation
        validation = SQLValidator.validate_and_sanitize(
            sql=raw_sql,
            dialect=dialect
        )

        # Merge warnings
        for w in validation.warnings:
            if w not in warnings:
                warnings.append(w)

        if not validation.is_valid:
            return {
                "sql": raw_sql,
                "sanitized_sql": raw_sql,
                "explanation": explanation or "Query failed security validation checks.",
                "tables_used": tables_used or validation.tables,
                "query_type": validation.query_type,
                "warnings": warnings,
                "confidence": "low",
                "source": source,
                "is_valid": False,
                "validation_errors": validation.errors
            }

        return {
            "sql": validation.sanitized_sql,
            "sanitized_sql": validation.sanitized_sql,
            "explanation": explanation,
            "tables_used": validation.tables if validation.tables else tables_used,
            "query_type": validation.query_type,
            "warnings": warnings,
            "confidence": confidence,
            "source": source,
            "is_valid": True,
            "validation_errors": []
        }
