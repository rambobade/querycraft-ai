# QueryCraft AI — Security & Threat Model

Database security is the primary design pillar of **QueryCraft AI**. We enforce strict isolation, cryptographic storage, deterministic AST verification, and database-engine-level write prevention.

---

## 1. Threat Matrix & Mitigations

| Threat Vector | Risk Description | QueryCraft AI Mitigation |
| :--- | :--- | :--- |
| **SQL Injection via LLM** | Malicious prompt crafts a query with embedded mutation or subquery injection. | **SQLGlot AST Parsing**: The query is parsed into an abstract syntax tree. Only `Select` or CTE roots are permitted. All `Insert`, `Update`, `Delete`, `Drop`, `Alter`, `Truncate`, `Create`, `Grant`, `Into`, and `Lock` expressions are blocked. |
| **Semicolon Statement Chaining** | Attacker appends `; DROP TABLE users;` to a legitimate SELECT. | **Multi-statement rejection**: The AST parser counts statements; any payload with `> 1` statement is immediately halted before database dispatch. |
| **Resource Exhaustion / DoS** | Query returns millions of rows, exhausting server memory. | **Auto-LIMIT Clamping**: AST visitor verifies `Limit` nodes across Select and Set operations (Union, Intersect, Except). Missing limits receive `LIMIT 100`; limits exceeding 1,000 are clamped to `MAX_ROWS_RETURNED` (1,000). |
| **Side-Channel Time Delays & File Probing** | Query attempts to probe file systems or delay workers (`pg_sleep`, `load_extension`, `pg_read_file`). | **Dangerous Function Blacklist**: Specifically rejects `pg_sleep`, `sleep`, `benchmark`, `load_extension`, `pg_read_file`, `pg_ls_dir`, and `dblink*`. |
| **Bypassing App-Level Checks** | Malicious code attempts to bypass validation via `skip_validation` parameter. | **Architectural Removal**: The `skip_validation` parameter has been permanently excised from all execution schemas and services. Every execution must pass AST validation. |
| **Server-Side Request Forgery (SSRF)** | User attempts to connect to internal services (`127.0.0.1`, `169.254.169.254`, `10.0.0.0/8`). | **Private Network Blocker**: Resolves hosts prior to connection and blocks private IP ranges and loopback by default. Configurable via `ALLOW_PRIVATE_DB_HOSTS=true`. |
| **Database Overwrite via SQLite Path Traversal** | User specifies `querycraft.db` or system paths in SQLite connection. | **Path Sandboxing**: SQLite databases are restricted to `SQLITE_DATA_DIR` (`./database/uploads`), path traversal (`..`) is rejected, and the application database (`querycraft.db`) cannot be targeted. |
| **Engine-Level Write Prevention** | Even if AST check fails, database must not allow writes. | **Engine Read-Only Enforcement**:<br>- SQLite: opened via read-only URI mode (`file:///{path}?mode=ro&uri=True`) and `PRAGMA query_only = ON;`.<br>- PostgreSQL: session initialized with `SET TRANSACTION READ ONLY;`.<br>- MySQL: session initialized with `SET SESSION TRANSACTION READ ONLY;`. |
| **Statement Deadlocks / Infinite Queries** | Query with cartesian cross-join hangs connection indefinitely. | **Engine Statement Timeouts**:<br>- SQLite: statement watchdog registered via `sqlite3_progress_handler` aborting execution exceeding 15 seconds.<br>- PostgreSQL: `SET statement_timeout = 15000;`<br>- MySQL: `SET max_execution_time = 15000;` |
| **Credential & API Key Theft at Rest** | Database connection passwords or AI API keys exposed in database. | **Fernet Cryptography & Write-Only Keys**: Passwords and connection URLs are encrypted at rest using Fernet (AES-128-CBC with SHA256 HMAC). AI API keys are write-only and never echoed back to clients. |
| **Session Hijacking & XSS Token Theft** | Access token stored in `localStorage` stolen via XSS. | **HttpOnly Cookies**: Session tokens are issued in `httpOnly`, `SameSite=Lax`, `Secure`-in-production cookies (`querycraft_access_token`). |

---

## 2. Multi-Layer Defense Pipeline

```
[ User or AI Prompt ]
          │
          ▼
[ Schema-Aware Prompt Guard ]
          │
          ▼
[ Deterministic SQLGlot AST Parser ] ──(Reject DDL / DML / Functions / Chained Statements)
          │
          ▼
[ Safe LIMIT Clamping (<= 1,000) ]
          │
          ▼
[ Network & Host Safety Verification ] ──(Block Loopback / RFC1918 Private IPs)
          │
          ▼
[ Read-Only Target Database Engine ] ──(mode=ro / PRAGMA query_only=ON / READ ONLY session)
          │
          ▼
[ 15-Second Execution Timeout Watchdog ] ──(sqlite3 progress handler / statement_timeout)
          │
          ▼
[ Result Set Pagination & Sanitization ]
```
