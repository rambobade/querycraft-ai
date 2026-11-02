"""
SQL AST Security Validator for QueryCraft AI
Uses SQLGlot for deterministic AST parsing, statement isolation, and read-only enforcement.
"""
from typing import List, Set, Optional, Tuple
import sqlglot
from sqlglot import exp
from pydantic import BaseModel, Field
from app.core.config import settings

FORBIDDEN_EXPRESSION_TYPES = (
    exp.Insert,
    exp.Update,
    exp.Delete,
    exp.Drop,
    exp.Alter,
    exp.Create,
    exp.TruncateTable,
    exp.Command,
    exp.Pragma,
    exp.Set,
    exp.Kill,
    exp.Transaction,
    exp.Commit,
    exp.Rollback,
    exp.Grant,
    exp.Revoke,
)

FORBIDDEN_CATALOG_PATTERNS = {
    "pg_shadow",
    "pg_authid",
    "pg_user",
    "pg_roles",
    "mysql.user",
    "mysql.db",
    "information_schema.user_privileges",
    "information_schema.table_privileges",
}

class ValidationResult(BaseModel):
    is_valid: bool
    sanitized_sql: str
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    query_type: str = "SELECT"
    tables: List[str] = Field(default_factory=list)
    columns: List[str] = Field(default_factory=list)
    has_limit: bool = False
    applied_limit: Optional[int] = None

class SQLValidator:
    """Deterministic SQL Validator that parses queries via SQL AST before execution."""

    @classmethod
    def validate_and_sanitize(
        cls,
        sql: str,
        dialect: str = "sqlite",
        max_rows: int = settings.MAX_ROWS_RETURNED,
        default_limit: int = settings.DEFAULT_LIMIT,
        allowed_tables: Optional[Set[str]] = None
    ) -> ValidationResult:
        errors: List[str] = []
        warnings: List[str] = []
        
        trimmed = sql.strip().rstrip(";")
        if not trimmed:
            return ValidationResult(
                is_valid=False,
                sanitized_sql="",
                errors=["Query cannot be empty."]
            )

        # 1. Parse AST
        try:
            parsed_statements = sqlglot.parse(trimmed, read=dialect)
        except Exception as e:
            # Try generic parsing
            try:
                parsed_statements = sqlglot.parse(trimmed)
            except Exception as e_generic:
                return ValidationResult(
                    is_valid=False,
                    sanitized_sql=sql,
                    errors=[f"SQL Syntax Error: Unable to parse query. {str(e_generic)}"]
                )

        # Filter out empty or whitespace statements
        valid_statements = [stmt for stmt in parsed_statements if stmt is not None]

        # 2. Reject multi-statement queries
        if len(valid_statements) == 0:
            return ValidationResult(
                is_valid=False,
                sanitized_sql="",
                errors=["No executable SQL statements found."]
            )

        if len(valid_statements) > 1:
            return ValidationResult(
                is_valid=False,
                sanitized_sql=sql,
                errors=["Multi-statement execution is blocked for security. Please provide a single query."]
            )

        ast = valid_statements[0]

        # 3. Verify Read-Only / SELECT Root
        # Allowed roots: Select, Union, Intersect, Except
        allowed_root_types = (exp.Select, exp.Union, exp.Intersect, exp.Except)
        if not isinstance(ast, allowed_root_types):
            errors.append(f"Operation '{ast.key.upper()}' is not permitted in read-only mode. Only SELECT queries are authorized.")

        # 4. Check for nested forbidden mutations / DDL / DML
        for forbidden_type in FORBIDDEN_EXPRESSION_TYPES:
            found = list(ast.find_all(forbidden_type))
            if found:
                action_name = forbidden_type.__name__.upper()
                errors.append(f"Forbidden SQL operation detected: {action_name}. Destructive or mutation operations are strictly prohibited.")

        # 5. Extract and validate referenced tables
        extracted_tables: Set[str] = set()
        for table_expr in ast.find_all(exp.Table):
            table_name = table_expr.name
            if table_name:
                extracted_tables.add(table_name)
                # Check forbidden catalogs
                clean_name = table_name.lower().strip('"\'`')
                if clean_name in FORBIDDEN_CATALOG_PATTERNS:
                    errors.append(f"Access to sensitive system catalog '{table_name}' is blocked.")

        # Optional schema check against allowed tables
        if allowed_tables:
            lower_allowed = {t.lower() for t in allowed_tables}
            for tbl in extracted_tables:
                if tbl.lower() not in lower_allowed:
                    warnings.append(f"Table '{tbl}' was not found in the connected database schema.")

        # 6. Extract columns
        extracted_columns: Set[str] = set()
        for col_expr in ast.find_all(exp.Column):
            if col_expr.name and col_expr.name != "*":
                extracted_columns.add(col_expr.name)

        # 7. Safe LIMIT handling
        has_limit = False
        applied_limit: Optional[int] = None
        limit_nodes = list(ast.find_all(exp.Limit))
        
        if limit_nodes:
            has_limit = True
            try:
                limit_val_expr = limit_nodes[0].expression
                limit_val = int(limit_val_expr.name) if hasattr(limit_val_expr, "name") else int(str(limit_val_expr))
                if limit_val > max_rows:
                    warnings.append(f"Requested LIMIT ({limit_val}) exceeds safety maximum of {max_rows}. Capped to {max_rows}.")
                    limit_nodes[0].set("expression", exp.Literal.number(max_rows))
                    applied_limit = max_rows
                else:
                    applied_limit = limit_val
            except Exception:
                # If complex limit expression, clamp
                warnings.append(f"Clamped complex limit expression to safety maximum of {max_rows}.")
                limit_nodes[0].set("expression", exp.Literal.number(max_rows))
                applied_limit = max_rows
        else:
            # Auto-inject limit for safety if root is Select
            if isinstance(ast, exp.Select):
                ast = ast.limit(default_limit)
                has_limit = True
                applied_limit = default_limit
                warnings.append(f"No LIMIT was specified; automatically added LIMIT {default_limit} for performance.")

        # Generate sanitized SQL string
        try:
            sanitized_sql = ast.sql(dialect=dialect, pretty=True)
        except Exception:
            sanitized_sql = ast.sql(pretty=True)

        is_valid = len(errors) == 0

        return ValidationResult(
            is_valid=is_valid,
            sanitized_sql=sanitized_sql if is_valid else trimmed,
            errors=errors,
            warnings=warnings,
            query_type="SELECT" if is_valid else (ast.key.upper() if ast else "UNKNOWN"),
            tables=sorted(list(extracted_tables)),
            columns=sorted(list(extracted_columns)),
            has_limit=has_limit,
            applied_limit=applied_limit
        )
