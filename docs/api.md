# QueryCraft AI — REST API Reference

All requests and responses use JSON. Authenticated endpoints require an `Authorization: Bearer <token>` header.

Interactive Swagger UI documentation is available locally at: `http://localhost:8000/docs`.

---

## Authentication (`/api/auth`)

### `POST /api/auth/register`
Create a new user account. Automatically creates a default "Sample E-Commerce Store (SQLite)" connection for the account.

**Request Body:**
```json
{
  "email": "developer@company.com",
  "password": "SecurePassword123!",
  "full_name": "Database Developer"
}
```

**Response (201 Created):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### `POST /api/auth/login`
Authenticate existing user and obtain tokens.

### `POST /api/auth/refresh`
Obtain a new access token using a valid refresh token.

### `GET /api/auth/me`
Retrieve profile of authenticated user.

---

## Database Connections (`/api/connections`)

### `GET /api/connections`
List all database connections owned by current user. Passwords and secret credentials are never exposed.

### `POST /api/connections`
Add a new database connection. Automatically encrypts credentials with Fernet.

### `POST /api/connections/{id}/test`
Perform health check on a saved connection.

### `DELETE /api/connections/{id}`
Delete a connection and associated schema cache.

---

## AI Generation & Analysis (`/api/ai`)

### `POST /api/ai/generate-sql`
Translate natural language input into schema-aware, AST-validated SQL.

**Request Body:**
```json
{
  "connection_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "natural_language_input": "Show the top 5 products by revenue"
}
```

**Response (200 OK):**
```json
{
  "sql": "SELECT p.name, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM products p JOIN order_items oi ON p.id = oi.product_id GROUP BY p.name ORDER BY total_revenue DESC LIMIT 5",
  "sanitized_sql": "SELECT p.name, ... LIMIT 5",
  "explanation": "Joins products and order_items to compute total revenue per item, ordering descending.",
  "tables_used": ["products", "order_items"],
  "query_type": "SELECT",
  "warnings": [],
  "confidence": "high",
  "source": "heuristic",
  "is_valid": true,
  "validation_errors": []
}
```

### `POST /api/ai/explain-sql`
Provides a line-by-line step breakdown, operation badges, and performance notes.

### `POST /api/ai/optimize-sql`
Analyzes the database `EXPLAIN` execution plan, checks for table scans, and provides index recommendations.

---

## Query Operations (`/api/query`)

### `POST /api/query/validate`
Deterministically parses and validates SQL through SQLGlot AST without touching the database.

### `POST /api/query/execute`
Executes validated SQL with safety timeouts and logs results to Query History.

### `GET /api/query/history`
Retrieves execution audit log with status, duration in ms, and row counts.
