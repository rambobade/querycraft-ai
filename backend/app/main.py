"""
QueryCraft AI - Backend Application
Natural Language to SQL Query Builder Engine
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import engine, Base
import app.models  # Ensure all models are registered with Base metadata
from app.api.routes import auth, connections, schema, ai, query, saved_queries, health

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables are created
    Base.metadata.create_all(bind=engine)
    print(f"[{settings.APP_NAME}] Backend initialized successfully in {settings.APP_ENV} mode.")
    yield
    # Shutdown

app = FastAPI(
    title=settings.APP_NAME,
    description="Natural Language to SQL Query Builder with Deterministic Security Validation & Schema Intelligence",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Centralized error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Prevent leaking internal stack traces in non-debug mode
    error_message = str(exc).split("\n")[0]
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"An internal server error occurred: {error_message}"}
    )

# Include API Routers
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(connections.router, prefix=settings.API_V1_STR)
app.include_router(schema.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)
app.include_router(query.router, prefix=settings.API_V1_STR)
app.include_router(saved_queries.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health"
    }
