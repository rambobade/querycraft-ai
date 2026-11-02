# Contributing to QueryCraft AI

Thank you for your interest in contributing to **QueryCraft AI**! We welcome bug reports, feature requests, documentation improvements, and code contributions.

---

## 1. Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 2. Development Setup

### Prerequisites
- Python 3.12+
- Node.js 18+ (20+ recommended)
- Git

### Initializing the Backend
```bash
cd backend
python -m venv env
source env/bin/activate  # On Windows: .\env\Scripts\activate
pip install -r requirements.txt
python app/utils/sample_db_seeder.py
python run.py
```
The FastAPI backend will start on `http://localhost:8000` with Swagger documentation at `http://localhost:8000/docs`.

### Initializing the Frontend
```bash
cd frontend
npm install
npm run dev
```
The Next.js web application will start on `http://localhost:3000`.

---

## 3. Pull Request Guidelines

1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Write clean, documented code:
   - Backend: Use Python type annotations (`typing`) and Pydantic models.
   - Frontend: Use strict TypeScript interfaces.
3. Ensure all tests pass:
   ```bash
   cd backend && python -m pytest -v
   cd frontend && npm run build
   ```
4. Commit your changes with meaningful commit messages following the Conventional Commits specification.
5. Push your branch and open a Pull Request against `main`.

---

## 4. Reporting Issues

Please search existing issues before opening a new one. When reporting bugs, include:
- Operating System and Python / Node version
- Steps to reproduce
- Expected vs actual behavior
- Relevant log output or error messages
