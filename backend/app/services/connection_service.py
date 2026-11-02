"""
Database Connection Service for QueryCraft AI
Handles target database connections, testing, credential encryption, and connection pooling.
"""
import os
from typing import Dict, Any, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import NullPool, QueuePool
from app.core.config import settings
from app.core.security import encrypt_secret, decrypt_secret
from app.models.connection import DatabaseConnection

class ConnectionService:
    _engine_cache: Dict[str, Engine] = {}

    @classmethod
    def get_target_url(cls, db_conn: DatabaseConnection) -> str:
        """Decrypt connection string or build from metadata."""
        if db_conn.is_sample:
            # Use local sample SQLite database
            sample_path = os.path.abspath(settings.SAMPLE_DB_PATH).replace("\\", "/")
            return f"sqlite:///{sample_path}"
        
        decrypted = decrypt_secret(db_conn.encrypted_credentials)
        if not decrypted:
            raise ValueError("Invalid or unreadable database credentials.")
        
        if decrypted.startswith("sqlite:///"):
            path_part = decrypted.replace("sqlite:///", "")
            decrypted = f"sqlite:///{path_part.replace('\\', '/')}"
        return decrypted

    @classmethod
    def get_engine(cls, db_conn: DatabaseConnection) -> Engine:
        """Get or create cached SQLAlchemy engine for the connection."""
        url = cls.get_target_url(db_conn)
        cache_key = f"{db_conn.id}_{db_conn.updated_at.isoformat() if db_conn.updated_at else 'init'}"
        
        if cache_key in cls._engine_cache:
            return cls._engine_cache[cache_key]

        connect_args = {}
        pool_kwargs = {}
        if url.startswith("sqlite"):
            connect_args["check_same_thread"] = False
            connect_args["timeout"] = 5
            pool_kwargs["poolclass"] = NullPool
        else:
            pool_kwargs["pool_pre_ping"] = True
            pool_kwargs["pool_recycle"] = 300

        engine = create_engine(
            url,
            connect_args=connect_args,
            **pool_kwargs
        )
        cls._engine_cache[cache_key] = engine
        return engine

    @classmethod
    def test_connection_url(cls, url: str) -> Dict[str, Any]:
        """Test a raw connection URL."""
        connect_args = {}
        pool_kwargs = {}
        if url.startswith("sqlite"):
            connect_args["check_same_thread"] = False
            connect_args["timeout"] = 5
            pool_kwargs["poolclass"] = NullPool
        else:
            pool_kwargs["pool_pre_ping"] = True
        
        test_engine = None
        try:
            test_engine = create_engine(url, connect_args=connect_args, **pool_kwargs)
            with test_engine.connect() as conn:
                result = conn.execute(text("SELECT 1;")).scalar()
                if result == 1:
                    return {"success": True, "message": "Connection verified successfully."}
                return {"success": False, "message": "Unexpected response from database."}
        except Exception as e:
            return {"success": False, "message": f"Connection failed: {str(e)}"}
        finally:
            if test_engine:
                test_engine.dispose()

    @classmethod
    def test_connection(cls, db_conn: DatabaseConnection) -> Dict[str, Any]:
        """Test a saved DatabaseConnection record."""
        try:
            url = cls.get_target_url(db_conn)
            return cls.test_connection_url(url)
        except Exception as e:
            return {"success": False, "message": str(e)}

    @classmethod
    def build_connection_string(cls, data: Dict[str, Any]) -> str:
        """Helper to construct connection URL from structured form inputs."""
        db_type = data.get("database_type", "sqlite").lower()
        if db_type == "sqlite":
            path = data.get("database_name") or data.get("file_path") or ":memory:"
            return f"sqlite:///{path}"
        
        user = data.get("username", "")
        pwd = data.get("password", "")
        host = data.get("host", "localhost")
        port = data.get("port", "")
        db_name = data.get("database_name", "")

        auth = f"{user}:{pwd}@" if user and pwd else (f"{user}@" if user else "")
        port_str = f":{port}" if port else ""

        if db_type == "postgresql":
            return f"postgresql://{auth}{host}{port_str}/{db_name}"
        elif db_type == "mysql":
            return f"mysql+pymysql://{auth}{host}{port_str}/{db_name}"
        else:
            raise ValueError(f"Unsupported database type: {db_type}")
