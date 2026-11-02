# QueryCraft AI — Architecture & Audit Changelog

This document tracks all architectural decisions, security remediations, assumptions, and migrations across each phase.

---

## Phase 1: Build, Dependency, and Container Configuration

### Changes Made
1. **Repository `.gitignore`**:
   - Scoped Python virtualenv/library ignore patterns from generic `lib/` and `lib64/` to `backend/lib/` and `backend/lib64/`.
   - Verified and tracked `frontend/lib/` containing `api.ts`, `auth-context.tsx`, `types.ts`, and `utils.ts`.
2. **Missing `frontend/public/` directory**:
   - Created `frontend/public/` with `favicon.svg` so that `frontend/Dockerfile` (`COPY --from=builder /app/public ./public`) succeeds during multi-stage image builds.
3. **API Proxy Configuration**:
   - Updated `frontend/next.config.mjs` to dynamically read target backend URL from `BACKEND_URL` (defaulting to `http://localhost:8000`).
   - In `docker-compose.yml`, configured `BACKEND_URL: http://backend:8000` for containerized networking.
   - Simplified frontend API client base path in `frontend/lib/api.ts` to `/api` to route requests through Next.js proxy rewrite and prevent cross-origin cookie issues.
4. **`docker-compose.yml` cleanup**:
   - Removed obsolete top-level `version: '3.8'` attribute.
   - Replaced whole-app volume mount `backend-data:/app` with dedicated data directory mount `backend-data:/app/data` to prevent masking application source files in production images.
   - Configured `DATABASE_URL=sqlite:///./data/querycraft.db` in Compose.
   - Removed hard-coded secrets from `docker-compose.yml` and replaced with environment variable expansions.
5. **Dependency & Pydantic Modernization**:
   - Replaced unreleased/fictitious version pins in `backend/requirements.txt` (`fastapi==0.162.0`, `uvicorn==0.54.0`, `sqlalchemy==2.1.6`, `cryptography==50.0.2`, `pandas==3.0.2`) with verified stable semantic version constraints.
   - Removed unused `pandas` dependency completely.
   - Upgraded deprecated Pydantic v1 `.dict()` calls to v2 `.model_dump()` across `backend/app/api/routes/connections.py` and `backend/app/api/routes/query.py`.
6. **Linting and Typechecking in CI**:
   - Configured `eslint` with `eslint-config-next` and added `frontend/.eslintrc.json`.
   - Updated `.github/workflows/ci.yml` frontend build job to execute `npx tsc --noEmit` and `npm run lint` before building.


---

## Phase 2: Security Fixes

### Changes Made
1. **Elimination of `skip_validation`**:
   - Removed `skip_validation` completely from `QueryExecuteRequest` schema, `backend/app/api/routes/query.py`, `ExecutionService.execute_query`, and frontend API clients (`api.ts`, `types.ts`).
   - Every query undergoes deterministic AST validation; no user or caller can bypass AST safety checks under any condition.
2. **Database-Engine Level Read-Only Enforcement & Timeout**:
   - Enforced SQLite read-only mode by opening connections with `creator=lambda: sqlite3.connect(f"file:///{path}?mode=ro", uri=True)` and issuing `PRAGMA query_only = ON;`.
   - Injected dialect-level read-only session variables before query execution:
     - PostgreSQL: `SET TRANSACTION READ ONLY;`, `SET statement_timeout = 15000;`.
     - MySQL: `SET SESSION TRANSACTION READ ONLY;`, `SET SESSION max_execution_time = 15000;`.
   - Implemented real SQLite execution timeouts via `set_progress_handler` checking elapsed time against `settings.QUERY_TIMEOUT_SECONDS` (15s) every 500 VM steps, safely aborting runaway recursive queries.
3. **Connection Endpoint Lockdown & SSRF Prevention**:
   - Secured `POST /api/connections/test-raw` with mandatory `get_current_user` dependency and sliding-window rate limiting.
   - Removed free-form `connection_string` from all schemas (`ConnectionCreate`, `ConnectionUpdate`, `ConnectionTestRequest`). Server constructs URLs solely from structured fields.
   - Enforced SQLite isolation boundary: user-created SQLite databases are restricted to `settings.SQLITE_DATA_DIR` (`./database/uploads`); canonical realpaths pointing outside or targeting `querycraft.db` are strictly rejected.
   - For PostgreSQL/MySQL connections, blocked loopback, link-local, and private IP ranges by default, requiring `ALLOW_PRIVATE_DB_HOSTS=true` for self-hosters.
4. **AST Validator Hardening**:
   - Added `exp.Into` (creates PostgreSQL tables) and `exp.Lock` (`FOR UPDATE` row locks) to forbidden expressions.
   - Added denylist for dangerous SQL functions: `pg_sleep`, `pg_read_file`, `pg_read_binary_file`, `lo_import`, `lo_export`, `pg_terminate_backend`, `dblink*`, `load_extension`, `sleep`, `benchmark`, `load_file`, `readfile`, `writefile`.
   - Fixed LIMIT clamping: inspects root statement's `ast.args.get("limit")` directly, preventing subquery/CTE limits from masking missing outer limits. Supported automatic LIMIT addition and clamping across `Select`, `Union`, `Intersect`, and `Except` root expressions.
5. **Secrets & Production Hardening**:
   - In `backend/app/core/config.py`, app startup in `APP_ENV=production` refuses to boot if `JWT_SECRET` or `ENCRYPTION_KEY` is missing or matches known defaults.
   - In development mode, auto-generates strong random cryptographic keys and persists them in untracked `.dev_keys.json`.
   - Updated `_get_fernet` in `backend/app/core/security.py` to fail loudly if `ENCRYPTION_KEY` is not a valid 32-byte base64 string.
   - Removed `"*"` wildcard from `CORS_ORIGINS`.
6. **Cookie-Based Authentication & Password Policy**:
   - Transferred access tokens from vulnerable client `localStorage` to `httpOnly`, `SameSite=Lax`, `Secure`-in-production cookies (`querycraft_access_token`).
   - Updated `get_current_user` dependency to check `httpOnly` cookie with Bearer header fallback.
   - Added `POST /api/auth/logout` endpoint that deletes the session cookie.
   - Enforced 10+ character password policy in `UserRegister` schema.
   - Implemented thread-safe `InMemoryRateLimiter` on auth routes (10/min), test-raw (12/min), and AI endpoints (30/min).
   - Added `POST /api/auth/demo` creating throwaway accounts with randomized credentials when `DEMO_MODE=true`.
7. **Error Masking**:
   - Hardened `global_exception_handler` in `backend/app/main.py`: passes through legitimate `HTTPException` responses, logs unhandled server errors with full tracebacks server-side, and returns a generic error with a unique `request_id`.
