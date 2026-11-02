# QueryCraft AI — REST API Reference

All requests and responses use JSON. Authentication is supported via `httpOnly`, `SameSite=Lax` session cookies (`querycraft_access_token`) or an `Authorization: Bearer <token>` header for headless API clients.

Interactive Swagger UI documentation is available locally at: `http://localhost:8000/docs`.

---

## Authentication (`/api/auth`)

### `POST /api/auth/register`
Create a new user account. Passwords must be at least 10 characters long. Sets a secure session cookie. Automatically pre-seeds a "Sample E-Commerce Store (SQLite)" connection.

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
Authenticate existing user, returning tokens and setting `querycraft_access_token` session cookie.

### `POST /api/auth/logout`
Invalidates session by clearing the `httpOnly` authentication cookie.

### `POST /api/auth/demo`
Generates a temporary throwaway demo user session when `DEMO_MODE=true` is enabled on the server.

### `POST /api/auth/refresh`
Obtain a new access token using a valid refresh token.

### `GET /api/auth/me`
Retrieve profile of authenticated user.

---

## Database Connections (`/api/connections`)

### `GET /api/connections`
List all database connections owned by current user. Passwords and secret credentials are never exposed.

### `POST /api/connections`
Add a new database connection. Accepts structured parameters only (type, host, port, database, user, password) and encrypts credentials on the server using Fernet.
Connections to loopback and private network ranges are blocked by default unless `ALLOW_PRIVATE_DB_HOSTS=true`.
SQLite database paths are confined to `settings.SQLITE_DATA_DIR`.

### `POST /api/connections/test-raw`
Test connection parameters before saving. Requires an authenticated session and is rate-limited.

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
Provides a line-by-line step breakdown, operations, and security status.

### `POST /api/ai/optimize-sql`
Analyzes the database `EXPLAIN` execution plan and provides index recommendations.

---

## Query Operations (`/api/query`)

### `POST /api/query/validate`
Deterministically parses and validates SQL through SQLGlot AST without touching the database.

### `POST /api/query/execute`
Executes validated SQL with safety timeouts (15s), read-only database session guarantees, and logs results to Query History.
Validation cannot be skipped.

**Request Body:**
```json
{
  "connection_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "sql": "SELECT id, name, price FROM products LIMIT 50;",
  "natural_language_input": "List products"
}
```

### `GET /api/query/history`
Retrieves execution audit log with status, duration in ms, and row counts.
