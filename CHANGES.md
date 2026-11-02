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


---

## Phase 3: Honest AI Behavior

### Changes Made
1. **Server-Side Encrypted LLM Settings**:
   - Replaced fragile and disconnected client-side `localStorage` LLM settings with a persistent database model `UserLLMSetting`.
   - Encrypted user API keys server-side using Fernet encryption (`encrypted_api_key`).
   - Exposed `GET /api/settings/llm`, `PUT /api/settings/llm`, and `POST /api/settings/llm/test`. Keys are strictly write-only, returning `has_key: bool` in API responses and never leaking raw keys.
   - Removed `*_override` arguments (`api_base_override`, `api_key_override`, `provider_override`, `model_override`) from public `GenerateSQLRequest` schemas, eliminating Server-Side Request Forgery (SSRF).
2. **Transparent Fallback & Provenance**:
   - In `SQLGenerator.generate_sql`, exceptions from external LLM providers are logged server-side, and responses return explicit provenance (`source: "heuristic"`) alongside a clear notice (`"The AI provider failed, so the built-in matcher was used."`).
   - UI models and clients display query provenance honestly without concealing errors.
3. **Custom Database Schema Integrity**:
   - Heuristic matching is strictly confined to the preloaded sample e-commerce database. On any custom/user-added database without a functional LLM provider, generation is rejected upfront with a clear instruction to configure an AI provider in Settings, preventing hallucinated queries against non-existent tables.
4. **Relabeling & Schema Privacy Disclosure**:
   - Clarified that SQL explanations are deterministic AST-derived analysis rather than LLM-generated content.
   - Documented schema privacy boundary: table and column definitions are sent to the external provider for prompt construction; row values are never transmitted.
5. **UI Execution Fixes**:
   - Fixed the `?prompt=` URL parameter effect loop in `Playground` to trigger exactly once per distinct prompt parameter.
   - Added `AbortSignal` cancellation support to `api.generateSQL()`, `api.executeSQL()`, and analysis endpoints in `frontend/lib/api.ts`.


---

## Phase 4: UI System & Design Tokens (Zero Tailwind)

### Changes Made
1. **Removal of Tailwind and PostCSS**:
   - Removed `tailwindcss`, `postcss`, `autoprefixer`, and `tailwind-merge` packages from `frontend/package.json`.
   - Deleted `frontend/tailwind.config.ts` and `frontend/postcss.config.mjs`.
   - Replaced `cn()` and `tailwind-merge` utility with a tiny 4-line `cx()` helper in `frontend/lib/utils.ts`.
   - Removed all `@tailwind` directives from `frontend/app/globals.css`.
2. **Design Tokens & Theme Architecture**:
   - Created `frontend/app/tokens.css` with CSS custom properties for colors (`--bg`, `--surface`, `--surface-sunken`, `--border`, `--text`, `--text-muted`, `--accent`, `--danger`, `--success`, `--warning`), spacing (`--space-*`), typography, radii, and shadows.
   - Implemented system-preferred and explicit dark/light mode switches via data attribute `[data-theme="dark"]` and `[data-theme="light"]`.
   - Prevented initial theme flicker by injecting an inline `<script>` in `<head>` within `frontend/app/layout.tsx`.
3. **Typography & Next.js Fonts**:
   - Loaded `IBM Plex Sans` and `IBM Plex Mono` via `next/font/google` in `frontend/app/layout.tsx`, mapping to `--font-ibm-plex-sans` and `--font-ibm-plex-mono`.
   - Established baseline body font at 15px with 1.5 line-height. Enforced a minimum font size of 12px throughout the UI (removed all legacy `text-[9px]`, `text-[10px]`, `text-[11px]`).
4. **Accessible UI Component Library**:
   - Developed clean, accessible UI primitives using scoped CSS Modules in `frontend/components/ui/`:
     - `Button`: Primary, secondary, quiet, and danger variants with size scales.
     - `Input`, `Textarea`, `Select`: Native HTML controls styled with tokens and focus-visible states.
     - `Field`: Accessible wrapper with automatic label-to-input association (`htmlFor` via `useId`) and helper hints.
     - `Notice`: Informational, error, success, and warning banners.
     - `Dialog`: Accessible native `<dialog>` implementation with `showModal()`, backdrop blur, and focus trap.
     - `ConfirmDialog`: Reusable confirmation modal with destructive action styling.
     - `ToastProvider` / `useToast`: Accessible notification system with `aria-live="polite"` and auto-dismissal.
     - `Tabs`: Accessible tab navigation with `role="tablist"`, `role="tab"`, and `aria-selected`.
     - `Table`: Monospace data table with sticky headers, right-aligned numbers, and muted null cells.
     - `EmptyState`: Clean zero-state view with subtle typography.
     - `Spinner`, `Kbd`, `Menu`: Lightweight utility components.
5. **Core Application Components**:
   - Rebuilt `Sidebar.tsx`: 4 clean items (Query, Library, Connections, Settings), mobile drawer behavior, no icon tiles.
   - Rebuilt `Navbar.tsx`: Connection switcher, user dropdown, theme toggle, and keyboard shortcuts dialog.
   - Rebuilt `SqlEditor.tsx`: Monaco Editor integration with dynamic light/dark theme synchronization and `Ctrl+Enter` execution shortcut.
   - Rebuilt `ResultsTable.tsx`: Monospace tabular results with 50-row pagination and sticky headers.
   - Rebuilt `ChartView.tsx`: Recharts-based bar, line, and pie charts with accessible color tokens.
   - Rebuilt `TablesPanel.tsx`: Collapsible schema sidebar with table and column search and click-to-insert snippet actions.

---

## Phase 5: Information Architecture & Page Restructure

### Changes Made
1. **Simplified Information Architecture**:
   - Redirected `/` to `/query` via Next.js server-side redirect.
   - Deleted legacy `/docs` and standalone `/schema` routes.
   - Forwarded `/playground` to `/query` preserving query parameters (`?prompt=...`, `?sql=...`).
   - Forwarded `/history` to `/library?tab=history`.
   - Forwarded `/saved-queries` to `/library?tab=saved`.
2. **Primary Query Workflow (`/query`)**:
   - Natural language input with `Ctrl+Enter` shortcut, sample query starters, and generation cancellation.
   - Explicit provenance indicator displaying `"Built-in heuristic"` or `"External AI"`.
   - Step-by-step logic breakdown disclosure and schema tables drawer.
   - Monaco SQL editor with execution status notice: `"Read-only. SELECT statements only. Results limited to 1,000 rows."`.
   - Query execution tabs: Table view with pagination, Charts view, and raw JSON export.
   - Quick export actions for CSV and JSON.
   - Bookmark / Save query modal.
   - EXPLAIN execution plan analysis drawer.
   - Session storage persistence for query drafts.
3. **Unified Library (`/library`)**:
   - Consolidated saved queries and query history into a single tabbed interface.
   - Full-text search and connection filtering.
   - Paginated display (20 items per page).
   - "Open in Query", "Copy SQL", and "Delete" actions.
   - Safe "Clear History" confirmation dialog.
4. **Connections Management (`/connections`)**:
   - Clean connections table with badges for dialect and read-only sample databases.
   - "Add Connection" dialog using strictly structured inputs (no raw connection strings).
   - Inline "Test Connection" button providing real-time feedback.
   - Protected deletion with `ConfirmDialog` preventing deletion of sample databases.
5. **Settings (`/settings`)**:
   - AI Provider section: Select provider (Gemini, Groq, OpenAI, Ollama), enter API key (write-only), model name, custom API base, and test connection.
   - Account section: Displays authenticated user details.
   - Appearance section: Explicit Light, Dark, or System theme toggle.
6. **Authentication (`/login` & `/register`)**:
   - Centered accessible forms using native `<label>` tags.
   - Show/hide password toggles.
   - Client-side validation enforcing 10+ character passwords.
   - 1-Click Demo Login button for instant evaluator access.

---

## Phase 6: Accessibility & Responsive Verification

### Changes Made
1. **WCAG AA Compliance**:
   - Contrast ratios verified across all token pairs in both light and dark modes (>= 4.5:1 for body text).
   - All interactive controls have `:focus-visible` outline rings with 2px offset.
   - Native `<dialog>` elements manage focus trapping, Esc key closure, and backdrop dismissal.
   - Menus support keyboard closure on Escape and tab navigation.
   - Toast notifications emit alerts via `aria-live="polite"`.
2. **Responsive Design (360px+)**:
   - Off-canvas mobile navigation drawer with hamburger toggle on viewports <= 768px.
   - Flexible workspace stacking on mobile screens.
   - Horizontally scrollable tables with sticky headers.

---

## Phase 7: Verification & Final Hand-Off

### Changes Made
1. **Backend Verification**:
   - 35 unit and integration tests passing in `pytest` covering AST security validation, read-only enforcement, statement timeout progress handlers, authentication, and honest AI behavior.
2. **Frontend Verification**:
   - Added automated smoke test `frontend/scripts/smoke-check.mjs` verifying tokens, zero Tailwind usage, routes, and UI primitives.
   - `npm test`, `npm run lint`, and `npm run build` pass with 0 errors and 0 warnings.
3. **Documentation**:
   - Rewrote `README.md` to be an honest, professional technical overview.
   - Updated `docs/security.md` with multi-layer defense details.
   - Updated `docs/api.md` with complete endpoint specifications.
