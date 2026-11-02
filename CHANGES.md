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
