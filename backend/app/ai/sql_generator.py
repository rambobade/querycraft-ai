"""
SQL Generation Engine for QueryCraft AI
Coordinates schema introspection, LLM prompt engineering, AST security validation,
honest fallback reporting, and non-sample database constraints.
"""
import logging
from typing import Dict, Any, Optional
from app.models.connection import DatabaseConnection
from app.services.schema_service import SchemaService
from app.security.sql_validator import SQLValidator
from app.ai.prompt_builder import SYSTEM_PROMPT, build_generation_prompt
from app.ai.provider import LLMProviderFactory
from app.ai.heuristic_engine import HeuristicSQLEngine

logger = logging.getLogger("querycraft")

class SQLGenerator:
    @classmethod
    def generate_sql_sync(
        cls,
        db_conn: DatabaseConnection,
        natural_language_input: str,
        llm_config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Synchronous version for offline/heuristic generation on the sample dataset."""
        # Non-sample databases require an LLM provider; heuristic engine only knows the sample schema
        if not db_conn.is_sample:
            msg = "An AI provider must be configured in Settings to generate queries for custom database schemas."
            return {
                "sql": "",
                "sanitized_sql": "",
                "explanation": msg,
                "tables_used": [],
                "query_type": "SELECT",
                "warnings": [],
                "confidence": "low",
                "source": "heuristic",
                "notice": msg,
                "is_valid": False,
                "validation_errors": [msg]
            }

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
                "notice": None,
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
            "notice": None,
            "is_valid": True,
            "validation_errors": []
        }

    @classmethod
    async def generate_sql(
        cls,
        db_conn: DatabaseConnection,
        natural_language_input: str,
        llm_config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Generate, validate, and package SQL query from natural language with honest source reporting."""
        cfg = llm_config or {}
        provider_name = cfg.get("provider")
        api_key = cfg.get("api_key")
        model = cfg.get("model")
        api_base = cfg.get("api_base")
        temperature = cfg.get("temperature", 0.0)

        provider = LLMProviderFactory.get_provider(
            provider_name=provider_name,
            api_key=api_key,
            model=model,
            api_base=api_base
        )

        # Enforce schema constraint upfront if no working provider exists
        if not db_conn.is_sample and not provider:
            msg = "An AI provider must be configured in Settings to generate queries for custom database schemas."
            return {
                "sql": "",
                "sanitized_sql": "",
                "explanation": msg,
                "tables_used": [],
                "query_type": "SELECT",
                "warnings": [],
                "confidence": "low",
                "source": "heuristic",
                "notice": msg,
                "is_valid": False,
                "validation_errors": [msg]
            }

        dialect = db_conn.database_type.lower()
        schema_summary = SchemaService.get_schema_summary_for_llm(db_conn)

        response_payload: Optional[Dict[str, Any]] = None
        source = "heuristic"
        notice: Optional[str] = None
        provider_attempted = provider is not None

        if provider:
            try:
                user_prompt = build_generation_prompt(
                    natural_language_input=natural_language_input,
                    schema_summary=schema_summary,
                    dialect=dialect
                )
                response_payload = await provider.generate_completion(
                    system_prompt=SYSTEM_PROMPT,
                    user_prompt=user_prompt,
                    temperature=temperature
                )
                if response_payload and "sql" in response_payload:
                    source = "llm"
                else:
                    response_payload = None
                    notice = "The AI provider returned an invalid response, so the built-in matcher was used."
            except Exception as e:
                logger.warning(f"LLM provider generation error: {e}")
                response_payload = None
                notice = "The AI provider failed, so the built-in matcher was used."

        if not response_payload or "sql" not in response_payload:
            # Enforce schema constraint: heuristic engine only knows sample database
            if not db_conn.is_sample:
                reason = (
                    "The AI provider failed, and the built-in matcher only supports the sample database. "
                    "Please verify your AI provider settings."
                    if provider_attempted
                    else "An AI provider must be configured in Settings to generate queries for custom database schemas."
                )
                return {
                    "sql": "",
                    "sanitized_sql": "",
                    "explanation": reason,
                    "tables_used": [],
                    "query_type": "SELECT",
                    "warnings": [],
                    "confidence": "low",
                    "source": "heuristic",
                    "notice": reason,
                    "is_valid": False,
                    "validation_errors": [reason]
                }

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
                "notice": notice,
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
            "notice": notice,
            "is_valid": True,
            "validation_errors": []
        }
