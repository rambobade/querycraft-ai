"""
SQL AST Security Validator for QueryCraft AI
Uses SQLGlot for deterministic AST parsing, statement isolation, and read-only enforcement.
"""
from typing import List, Set, Optional
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
    exp.Into,   # SELECT ... INTO table (creates tables in PostgreSQL)
    exp.Lock,   # SELECT ... FOR UPDATE (row locking / write intent)
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

FORBIDDEN_FUNCTIONS = {
    "pg_sleep",
    "pg_read_file",
    "pg_read_binary_file",
    "lo_import",
    "lo_export",
    "pg_terminate_backend",
    "load_extension",
    "sleep",
    "benchmark",
    "load_file",
    "readfile",
    "writefile",
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

        # 4. Check for nested forbidden mutations / DDL / DML / INTO / LOCK
        for forbidden_type in FORBIDDEN_EXPRESSION_TYPES:
            found = list(ast.find_all(forbidden_type))
            if found:
                action_name = forbidden_type.__name__.upper()
                errors.append(f"Forbidden SQL operation detected: {action_name}. Destructive or mutation operations are strictly prohibited.")

        # 5. Check for dangerous / exploit functions
        for func_node in ast.find_all(exp.Func, exp.Anonymous):
            name = (
                func_node.name
                or (func_node.this if isinstance(func_node.this, str) else getattr(func_node.this, "name", ""))
            )
            clean_func = str(name).lower().strip()
            if clean_func in FORBIDDEN_FUNCTIONS or clean_func.startswith("dblink"):
                errors.append(f"Forbidden SQL function detected: '{clean_func}'. Dangerous functions are prohibited.")

        # 6. Extract and validate referenced tables
        extracted_tables: Set[str] = set()
        for table_expr in ast.find_all(exp.Table):
            table_name = table_expr.name
            if table_name:
                extracted_tables.add(table_name)
                clean_name = table_name.lower().strip('"\'`')
                if clean_name in FORBIDDEN_CATALOG_PATTERNS:
                    errors.append(f"Access to sensitive system catalog '{table_name}' is blocked.")

        if allowed_tables:
            lower_allowed = {t.lower() for t in allowed_tables}
            for tbl in extracted_tables:
                if tbl.lower() not in lower_allowed:
                    warnings.append(f"Table '{tbl}' was not found in the connected database schema.")

        # 7. Extract columns
        extracted_columns: Set[str] = set()
        for col_expr in ast.find_all(exp.Column):
            if col_expr.name and col_expr.name != "*":
                extracted_columns.add(col_expr.name)

        # 8. Check and clamp the root statement's own LIMIT
        has_limit = False
        applied_limit: Optional[int] = None
        root_limit = ast.args.get("limit")

        if root_limit:
            has_limit = True
            try:
                expr = root_limit.expression
                limit_val = int(expr.this if hasattr(expr, "this") else str(expr))
                if limit_val > max_rows:
                    warnings.append(f"Requested LIMIT ({limit_val}) exceeds safety maximum of {max_rows}. Capped to {max_rows}.")
                    root_limit.set("expression", exp.Literal.number(max_rows))
                    applied_limit = max_rows
                else:
                    applied_limit = limit_val
            except Exception:
                warnings.append(f"Clamped complex limit expression to safety maximum of {max_rows}.")
                root_limit.set("expression", exp.Literal.number(max_rows))
                applied_limit = max_rows
        else:
            # Apply limit to root statement (works on Select, Union, Intersect, Except)
            try:
                ast = ast.limit(default_limit)
                has_limit = True
                applied_limit = default_limit
                warnings.append(f"No LIMIT was specified; automatically added LIMIT {default_limit} for performance.")
            except Exception:
                pass

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
