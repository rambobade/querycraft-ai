"""
Heuristic SQL Engine for QueryCraft AI
Provides schema-aware fallback SQL generation for offline, testing, and zero-key environments.
"""
import re
from typing import Dict, Any, List

class HeuristicSQLEngine:
    @classmethod
    def generate_sql(
        cls,
        question: str,
        schema_summary: str,
        dialect: str = "sqlite"
    ) -> Dict[str, Any]:
        """Generate schema-aware SQL based on semantic intent and schema context."""
        q = question.lower().strip()
        
        # 1. Top spending customers
        if ("customer" in q or "client" in q or "buyer" in q) and ("spent" in q or "spending" in q or "revenue" in q or "money" in q or "top" in q):
            limit = cls._extract_limit(q, default=10)
            sql = f"""SELECT 
  c.id, 
  c.name, 
  c.email, 
  c.loyalty_tier,
  COUNT(o.id) AS total_orders, 
  ROUND(SUM(o.total_amount), 2) AS total_spent
FROM customers c
JOIN orders o ON c.id = o.customer_id
WHERE o.status != 'Cancelled'
GROUP BY c.id, c.name, c.email, c.loyalty_tier
ORDER BY total_spent DESC
LIMIT {limit};"""
            return {
                "sql": sql,
                "explanation": f"Joins `customers` and `orders`, aggregates confirmed order amounts per customer, and returns the top {limit} highest spenders.",
                "tables_used": ["customers", "orders"],
                "query_type": "SELECT",
                "warnings": ["Filtered out cancelled orders to reflect net realized spend."],
                "confidence": "high",
                "source": "heuristic"
            }

        # 2. Customers with no orders
        if ("customer" in q) and ("not" in q or "never" in q or "no" in q or "without" in q) and ("order" in q or "purchase" in q):
            sql = """SELECT 
  c.id, 
  c.name, 
  c.email, 
  c.city, 
  c.created_at
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.id IS NULL;"""
            return {
                "sql": sql,
                "explanation": "Performs a LEFT JOIN between `customers` and `orders` to find customer accounts that have zero associated order records.",
                "tables_used": ["customers", "orders"],
                "query_type": "SELECT",
                "warnings": [],
                "confidence": "high",
                "source": "heuristic"
            }

        # 3. Department-wise average salary / employee salary
        if "salary" in q or "earn" in q or "employee" in q or "department" in q:
            if "average" in q or "avg" in q or "department" in q or "dept" in q:
                sql = """SELECT 
  d.name AS department_name, 
  COUNT(e.id) AS employee_count, 
  ROUND(AVG(e.salary), 2) AS average_salary,
  ROUND(MIN(e.salary), 2) AS min_salary,
  ROUND(MAX(e.salary), 2) AS max_salary
FROM departments d
JOIN employees e ON d.id = e.department_id
GROUP BY d.id, d.name
ORDER BY average_salary DESC;"""
                return {
                    "sql": sql,
                    "explanation": "Joins `departments` with `employees`, groups by department, and calculates average, minimum, and maximum employee salaries.",
                    "tables_used": ["departments", "employees"],
                    "query_type": "SELECT",
                    "warnings": [],
                    "confidence": "high",
                    "source": "heuristic"
                }
            
            # Earning more than threshold
            amount_match = re.search(r'(\d+[\d,]*)', q)
            threshold = float(amount_match.group(1).replace(",", "")) if amount_match else 50000.0
            sql = f"""SELECT 
  e.id, 
  e.first_name || ' ' || e.last_name AS employee_name, 
  e.role, 
  d.name AS department, 
  e.salary
FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE e.salary > {threshold}
ORDER BY e.salary DESC;"""
            return {
                "sql": sql,
                "explanation": f"Selects employees whose salary exceeds ${threshold:,.2f}, joining with departments to display their organizational unit.",
                "tables_used": ["employees", "departments"],
                "query_type": "SELECT",
                "warnings": [],
                "confidence": "high",
                "source": "heuristic"
            }

        # 4. Top products by revenue or sales
        if "product" in q or "item" in q:
            limit = cls._extract_limit(q, default=5)
            if "revenue" in q or "sale" in q or "top" in q or "selling" in q:
                sql = f"""SELECT 
  p.id, 
  p.name AS product_name, 
  c.name AS category_name, 
  p.price,
  SUM(oi.quantity) AS units_sold, 
  ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount)), 2) AS total_revenue
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name, c.name, p.price
ORDER BY total_revenue DESC
LIMIT {limit};"""
                return {
                    "sql": sql,
                    "explanation": f"Joins `products`, `categories`, and `order_items` to calculate total units sold and net revenue per product, returning the top {limit}.",
                    "tables_used": ["products", "categories", "order_items"],
                    "query_type": "SELECT",
                    "warnings": ["Calculates net revenue factoring in item discount."],
                    "confidence": "high",
                    "source": "heuristic"
                }

            # Top rated products
            if "rating" in q or "review" in q or "rated" in q:
                sql = f"""SELECT 
  p.name, 
  c.name AS category, 
  p.price, 
  p.rating, 
  p.stock_quantity
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.is_active = 1
ORDER BY p.rating DESC, p.price DESC
LIMIT {limit};"""
                return {
                    "sql": sql,
                    "explanation": f"Retrieves the top {limit} highest-rated active products sorted by rating and price.",
                    "tables_used": ["products", "categories"],
                    "query_type": "SELECT",
                    "warnings": [],
                    "confidence": "high",
                    "source": "heuristic"
                }

        # 5. Monthly sales / orders over time
        if "monthly" in q or "month" in q or "trend" in q or ("sales" in q and ("date" in q or "time" in q or "year" in q)):
            if dialect == "sqlite":
                date_expr = "SUBSTR(order_date, 1, 7)"
            elif dialect == "postgresql":
                date_expr = "TO_CHAR(order_date, 'YYYY-MM')"
            else:
                date_expr = "DATE_FORMAT(order_date, '%Y-%m')"

            sql = f"""SELECT 
  {date_expr} AS sales_month, 
  COUNT(id) AS total_orders, 
  ROUND(SUM(total_amount), 2) AS monthly_revenue
FROM orders
WHERE status != 'Cancelled'
GROUP BY {date_expr}
ORDER BY sales_month ASC;"""
            return {
                "sql": sql,
                "explanation": "Groups orders by month (excluding cancelled orders) to compute monthly order volume and cumulative revenue.",
                "tables_used": ["orders"],
                "query_type": "SELECT",
                "warnings": ["Cancelled orders excluded."],
                "confidence": "high",
                "source": "heuristic"
            }

        # 6. Duplicate email addresses
        if "duplicate" in q and "email" in q:
            sql = """SELECT 
  email, 
  COUNT(*) AS occurrence_count
FROM customers
GROUP BY email
HAVING COUNT(*) > 1;"""
            return {
                "sql": sql,
                "explanation": "Identifies email addresses appearing more than once in the `customers` table using HAVING COUNT(*) > 1.",
                "tables_used": ["customers"],
                "query_type": "SELECT",
                "warnings": ["Returns an empty set if customer emails are uniquely constrained."],
                "confidence": "high",
                "source": "heuristic"
            }

        # 7. Category summary / breakdown
        if "category" in q or "categories" in q:
            sql = """SELECT 
  c.id, 
  c.name AS category_name, 
  COUNT(p.id) AS product_count, 
  ROUND(AVG(p.price), 2) AS avg_product_price
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
GROUP BY c.id, c.name
ORDER BY product_count DESC;"""
            return {
                "sql": sql,
                "explanation": "Aggregates products by category to show product catalog density and average price point per category.",
                "tables_used": ["categories", "products"],
                "query_type": "SELECT",
                "warnings": [],
                "confidence": "medium",
                "source": "heuristic"
            }

        # 8. Generic Table fallback: inspect which table matches keywords in question
        words = set(re.findall(r'[a-zA-Z_]+', q))
        # Look for table names mentioned
        known_tables = ["customers", "orders", "order_items", "products", "categories", "departments", "employees", "reviews"]
        matched_table = None
        for tbl in known_tables:
            if tbl in words or tbl[:-1] in words:
                matched_table = tbl
                break

        if not matched_table:
            matched_table = "orders"

        limit = cls._extract_limit(q, default=20)
        sql = f"SELECT * FROM {matched_table} LIMIT {limit};"
        return {
            "sql": sql,
            "explanation": f"Selects records from the `{matched_table}` table constrained to {limit} rows based on your inquiry.",
            "tables_used": [matched_table],
            "query_type": "SELECT",
            "warnings": ["Used standard column projection. Refine query prompt for specific metrics."],
            "confidence": "medium",
            "source": "heuristic"
        }

    @classmethod
    def _extract_limit(cls, q: str, default: int = 10) -> int:
        match = re.search(r'\b(?:top|first|limit)\s+(\d+)\b', q)
        if match:
            try:
                val = int(match.group(1))
                return min(val, 100)
            except Exception:
                pass
        return default
