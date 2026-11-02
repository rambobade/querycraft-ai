import pytest
from app.security.sql_validator import SQLValidator

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
