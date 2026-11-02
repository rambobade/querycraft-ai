# QueryCraft AI

Natural Language to SQL Query Builder & Database Assistant.

QueryCraft AI translates natural language questions into executable SQL queries, validates them against deterministic security rules, and executes them against relational databases under strict read-only constraints.

---

## Architecture Overview

QueryCraft AI is built as a decoupled full-stack application:

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, plain CSS Modules with design tokens (`tokens.css`), IBM Plex Sans / IBM Plex Mono typography, Monaco Editor for SQL editing, and Recharts for data visualization. No utility CSS frameworks or bloated UI kits.
- **Backend**: Python 3.12+, FastAPI, SQLAlchemy, SQLGlot for AST parsing and dialect translation, Cryptography (Fernet) for credential encryption.
- **Databases Supported**: SQLite, PostgreSQL, MySQL.
- **AI Providers**: Configurable per-user via Google Gemini, Groq, OpenAI, or local Ollama instances, with transparent offline heuristics for the bundled sample dataset.

---

## Security Model

QueryCraft AI implements defense-in-depth to safely run user-generated and AI-generated SQL queries:

```
User / AI Prompt
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ 1. Deterministic SQL AST Validation (SQLGlot)          │
│    - Strictly SELECT statements only                   │
│    - Disallows DDL/DML (INSERT, UPDATE, DELETE, DROP)  │
│    - Blocks multi-statement execution (semicolons)     │
│    - Blocks INTO, LOCK, and file access expressions    │
│    - Rejects dangerous functions (pg_sleep, sleep,     │
│      benchmark, load_extension, pg_read_file)         │
│    - Automatically enforces and clamps LIMIT <= 1,000  │
└──────────────────────────────────┬─────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────┐
│ 2. Engine-Level Read-Only Isolation                   │
│    - SQLite: opened via read-only URI mode (mode=ro)   │
│      and PRAGMA query_only = ON                        │
│    - PostgreSQL: SET TRANSACTION READ ONLY             │
│    - MySQL: SET SESSION TRANSACTION READ ONLY          │
└──────────────────────────────────┬─────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────┐
│ 3. Statement Timeouts & Resource Bounds                │
│    - SQLite: statement watchdog via progress handler   │
│      aborting execution exceeding 15 seconds           │
│    - PostgreSQL: statement_timeout = 15000 (ms)        │
│    - MySQL: max_execution_time = 15000 (ms)            │
│    - Maximum 1,000 rows fetched into memory            │
└──────────────────────────────────┬─────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────┐
│ 4. Network, Auth & Secrets Protection                  │
│    - Private/loopback IP blocking by default           │
│    - Database passwords encrypted at rest via Fernet   │
│    - AI API keys stored encrypted and write-only       │
│    - Sessions via httpOnly, SameSite=Lax JWT cookies   │
│    - Password complexity policy (10+ characters)       │
│    - Rate-limiting on authentication and test routes   │
└────────────────────────────────────────────────────────┘
```

---

## Transparent AI Behavior

- **Explicit Provenance**: Every generated query explicitly states its provenance (`source: "ai"` vs `source: "heuristic"`).
- **Graceful Fallback**: If an external LLM call fails or times out, the backend gracefully falls back to the deterministic heuristic matcher on the sample dataset with an explicit user notice.
- **No False Assurances**: Custom user databases require a working LLM configuration; QueryCraft AI will not pretend to understand arbitrary third-party schemas with heuristics.

---

## Quickstart

### Prerequisites

- Python 3.12+
- Node.js 18+ and npm
- Docker and Docker Compose (optional)

### Local Development

#### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Linux/macOS:
source venv/bin/activate
# Windows:
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed the bundled sample database
python app/utils/sample_db_seeder.py

# Start development server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

Open `http://localhost:3000` in your browser. The app will redirect to `/query`.

---

## Docker Deployment

To launch the full stack with Docker Compose:

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `ENVIRONMENT` | Environment (`development` or `production`) | `development` |
| `SECRET_KEY` | 32-byte secret for JWT signing | Auto-generated in dev |
| `ENCRYPTION_KEY` | 32-byte url-safe base64 Fernet key | Auto-generated in dev |
| `DATABASE_URL` | Application database connection string | `sqlite:///./data/querycraft.db` |
| `DEMO_MODE` | Enable 1-click evaluation demo accounts | `true` |
| `ALLOW_PRIVATE_DB_HOSTS`| Allow connections to localhost / private RFC1918 IPs | `false` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3000` |
| `GEMINI_API_KEY` | Default fallback Gemini API key | Optional |

### Frontend (`frontend/.env.local`)

| Variable | Description | Default |
|---|---|---|
| `BACKEND_URL` | Backend server URL used by Next.js API proxy | `http://localhost:8000` |
| `NEXT_PUBLIC_DEMO_MODE` | Show 1-click demo button on login | `true` |

---

## Testing

### Backend Test Suite
```bash
pytest
```
Runs 35 tests covering AST security validation, read-only enforcement, timeout handlers, authentication, and honest AI fallbacks.

### Frontend Smoke Tests & Linting
```bash
cd frontend
npm test
npm run lint
npm run build
```

---

## License

MIT License. See [LICENSE](LICENSE) for details.
