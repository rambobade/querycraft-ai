import os
import pytest
from app.security.sql_validator import SQLValidator
from app.services.execution_service import ExecutionService
from app.services.connection_service import ConnectionService, validate_sqlite_path, is_private_or_local_host
from app.models.connection import DatabaseConnection
from app.models.user import User
from app.schemas.connection import ConnectionTestRequest
from app.api.routes import connections as connections_route
from fastapi import HTTPException

def test_valid_select_query():
    sql = "SELECT id, name, price FROM products WHERE price > 100 ORDER BY price DESC"
    result = SQLValidator.validate_and_sanitize(sql, dialect="sqlite")
    assert result.is_valid is True
    assert len(result.errors) == 0
    assert "products" in result.tables
    assert result.has_limit is True
    assert result.applied_limit == 100

def test_block_drop_table():
    sql = "DROP TABLE users;"
    result = SQLValidator.validate_and_sanitize(sql, dialect="sqlite")
    assert result.is_valid is False
    assert any("forbidden" in err.lower() or "not permitted" in err.lower() for err in result.errors)

def test_block_delete_mutation():
    sql = "DELETE FROM customers WHERE id = 1"
    result = SQLValidator.validate_and_sanitize(sql, dialect="sqlite")
    assert result.is_valid is False
    assert any("delete" in err.lower() for err in result.errors)

def test_block_update_mutation():
    sql = "UPDATE employees SET salary = salary * 2 WHERE department_id = 1"
    result = SQLValidator.validate_and_sanitize(sql, dialect="sqlite")
    assert result.is_valid is False
    assert any("update" in err.lower() for err in result.errors)

def test_block_insert_mutation():
    sql = "INSERT INTO categories (name) VALUES ('Hacked Category')"
    result = SQLValidator.validate_and_sanitize(sql, dialect="sqlite")
    assert result.is_valid is False
    assert any("insert" in err.lower() for err in result.errors)

def test_block_multi_statement_injection():
    sql = "SELECT * FROM orders; DROP TABLE customers;"
    result = SQLValidator.validate_and_sanitize(sql, dialect="sqlite")
    assert result.is_valid is False
    assert any("multi-statement" in err.lower() for err in result.errors)

def test_block_sensitive_catalog_access():
    sql = "SELECT * FROM pg_shadow"
    result = SQLValidator.validate_and_sanitize(sql, dialect="postgresql")
    assert result.is_valid is False
    assert any("catalog" in err.lower() for err in result.errors)

def test_clamp_oversized_limit():
    sql = "SELECT * FROM products LIMIT 50000"
    result = SQLValidator.validate_and_sanitize(sql, dialect="sqlite", max_rows=1000)
    assert result.is_valid is True
    assert result.applied_limit == 1000
    assert any("exceeds safety maximum" in w for w in result.warnings)

def test_cte_with_select_is_allowed():
    sql = """
    WITH HighSpenders AS (
        SELECT customer_id, SUM(total_amount) AS total_spent
        FROM orders
        GROUP BY customer_id
    )
    SELECT * FROM HighSpenders WHERE total_spent > 500;
    """
    result = SQLValidator.validate_and_sanitize(sql, dialect="sqlite")
    assert result.is_valid is True
    assert len(result.errors) == 0

# --- Phase 2 Security Hardening Tests ---

def test_block_into_clause():
    """Verify SELECT ... INTO is blocked."""
    sql = "SELECT * INTO new_table FROM products"
    result = SQLValidator.validate_and_sanitize(sql, dialect="postgres")
    assert result.is_valid is False
    assert any("into" in err.lower() or "forbidden" in err.lower() for err in result.errors)

def test_block_for_update_lock():
    """Verify SELECT ... FOR UPDATE row-locking is blocked."""
    sql = "SELECT * FROM products FOR UPDATE"
    result = SQLValidator.validate_and_sanitize(sql, dialect="postgres")
    assert result.is_valid is False
    assert any("lock" in err.lower() or "forbidden" in err.lower() for err in result.errors)

@pytest.mark.parametrize("func_call", [
    "SELECT pg_sleep(5)",
    "SELECT sleep(2)",
    "SELECT benchmark(1000000, MD5('test'))",
    "SELECT load_file('/etc/passwd')",
    "SELECT readfile('/etc/shadow')",
    "SELECT load_extension('evil.so')",
    "SELECT dblink_connect('conn', 'localhost')",
    "SELECT pg_read_file('postgresql.conf')",
    "SELECT pg_terminate_backend(1234)",
])
def test_block_dangerous_functions(func_call):
    """Verify dangerous dialect-specific functions are blocked."""
    result = SQLValidator.validate_and_sanitize(func_call, dialect="postgres")
    assert result.is_valid is False
    assert any("forbidden sql function" in err.lower() for err in result.errors)

def test_subquery_limit_does_not_prevent_outer_limit():
    """A LIMIT inside a subquery must not prevent the outer query from receiving its own LIMIT."""
    sql = "SELECT * FROM (SELECT id FROM products LIMIT 5) t"
    result = SQLValidator.validate_and_sanitize(sql, dialect="sqlite", default_limit=100)
    assert result.is_valid is True
    assert "LIMIT 100" in result.sanitized_sql.upper()

def test_union_gets_automatic_limit():
    """UNION roots must receive an automatic safety limit when unspecified."""
    sql = "SELECT id, name FROM products UNION SELECT id, name FROM categories"
    result = SQLValidator.validate_and_sanitize(sql, dialect="sqlite", default_limit=100)
    assert result.is_valid is True
    assert "LIMIT 100" in result.sanitized_sql.upper()

def test_union_clamps_oversized_limit():
    """UNION roots with oversized LIMIT must be clamped."""
    sql = "SELECT id, name FROM products UNION SELECT id, name FROM categories LIMIT 9999"
    result = SQLValidator.validate_and_sanitize(sql, dialect="sqlite", max_rows=1000)
    assert result.is_valid is True
    assert result.applied_limit == 1000
    assert "LIMIT 1000" in result.sanitized_sql.upper()

def test_database_level_readonly_enforcement():
    """Verify database-level engine rejects mutations even if AST were bypassed."""
    sample_conn = DatabaseConnection(
        id="test-sample-conn",
        user_id="test-user",
        name="Sample",
        database_type="sqlite",
        database_name="sample_ecommerce.db",
        is_sample=True
    )
    # Attempting a non-SELECT query must fail at AST validation
    res = ExecutionService.execute_query(sample_conn, "DROP TABLE products")
    assert res["success"] is False
    assert "forbidden" in res["error"].lower() or "not permitted" in res["error"].lower()

def test_sqlite_path_traversal_and_internal_db_blocked():
    """User-created SQLite connections cannot target QueryCraft internal databases."""
    with pytest.raises(ValueError, match="internal"):
        validate_sqlite_path("querycraft.db")

    with pytest.raises(ValueError, match="internal"):
        validate_sqlite_path("./data/querycraft.db")

    with pytest.raises(ValueError, match="authorized directory"):
        validate_sqlite_path("../../../etc/passwd.db")

def test_private_host_blocking():
    """Verify localhost and private network ranges are blocked by default."""
    assert is_private_or_local_host("localhost") is True
    assert is_private_or_local_host("127.0.0.1") is True
    assert is_private_or_local_host("192.168.1.100") is True
    assert is_private_or_local_host("10.0.0.1") is True
    assert is_private_or_local_host("172.16.0.1") is True

    # Structured builder raises ValueError
    with pytest.raises(ValueError, match="private or loopback host"):
        ConnectionService.build_connection_string({
            "database_type": "postgresql",
            "host": "127.0.0.1",
            "port": 5432,
            "database_name": "testdb",
            "username": "user",
            "password": "pwd"
        })

def test_skip_validation_is_not_supported():
    """Verify ExecutionService.execute_query has no skip_validation parameter."""
    import inspect
    sig = inspect.signature(ExecutionService.execute_query)
    assert "skip_validation" not in sig.parameters
