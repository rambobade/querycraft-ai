"""
Database Connection Service for QueryCraft AI
Handles target database connections, testing, credential encryption, connection pooling,
network isolation (blocking private/loopback DB hosts), and SQLite path restrictions.
"""
import os
import time
import socket
import sqlite3
import ipaddress
from typing import Dict, Any, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import NullPool
from app.core.config import settings
from app.core.security import encrypt_secret, decrypt_secret
from app.models.connection import DatabaseConnection

def is_private_or_local_host(host: str) -> bool:
    """Check if host resolves to loopback, link-local, or private IP network."""
    host_clean = host.strip().lower()
    if host_clean in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
        return True
    
    # Try parsing directly as an IP address
    try:
        ip = ipaddress.ip_address(host_clean)
        return ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_unspecified
    except ValueError:
        pass

    # Resolve hostname via DNS
    try:
        resolved = socket.getaddrinfo(host_clean, None)
        for item in resolved:
            ip_str = item[4][0]
            ip = ipaddress.ip_address(ip_str)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_unspecified:
                return True
    except Exception:
        # If hostname cannot be resolved, reject for safety
        return True

    return False

def validate_sqlite_path(path: str) -> str:
    """Validate and sanitize SQLite database path, enforcing dedicated storage boundary."""
    clean = os.path.abspath(path.strip())
    real = os.path.realpath(clean)
    
    # Absolute canonical path to sample DB
    sample_canon = os.path.realpath(os.path.abspath(settings.SAMPLE_DB_PATH))
    if real.lower() == sample_canon.lower():
        return sample_canon

    # Check for forbidden querycraft app database files
    filename = os.path.basename(real).lower()
    if "querycraft" in filename and filename.endswith(".db"):
        raise ValueError("Access to QueryCraft internal database files is strictly forbidden.")

    # Must reside strictly within designated SQLITE_DATA_DIR
    data_dir = os.path.realpath(os.path.abspath(settings.SQLITE_DATA_DIR))
    os.makedirs(data_dir, exist_ok=True)
    
    # Check that real path starts with data_dir
    common = os.path.commonpath([real, data_dir])
    if common != data_dir:
        raise ValueError(
            f"SQLite file path must reside within the authorized directory ({data_dir}). Arbitrary file access is blocked."
        )

    return real

class ConnectionService:
    _engine_cache: Dict[str, Engine] = {}

    @classmethod
    def get_target_url(cls, db_conn: DatabaseConnection) -> str:
        """Decrypt connection string or build from metadata with path validation."""
        if db_conn.is_sample:
            sample_path = os.path.realpath(os.path.abspath(settings.SAMPLE_DB_PATH)).replace("\\", "/")
            return f"sqlite:///{sample_path}"
        
        decrypted = decrypt_secret(db_conn.encrypted_credentials)
        if not decrypted:
            raise ValueError("Invalid or unreadable database credentials.")
        
        if decrypted.startswith("sqlite:///"):
            path_part = decrypted.replace("sqlite:///", "")
            validated = validate_sqlite_path(path_part).replace("\\", "/")
            return f"sqlite:///{validated}"

        return decrypted

    @classmethod
    def get_engine(cls, db_conn: DatabaseConnection) -> Engine:
        """Get or create cached SQLAlchemy engine for the connection with read-only enforcement."""
        url = cls.get_target_url(db_conn)
        cache_key = f"{db_conn.id}_{db_conn.updated_at.isoformat() if db_conn.updated_at else 'init'}"
        
        if cache_key in cls._engine_cache:
            return cls._engine_cache[cache_key]

        if url.startswith("sqlite"):
            # Extract raw file path for creator
            file_path = url.replace("sqlite:///", "")
            timeout_sec = settings.QUERY_TIMEOUT_SECONDS

            def sqlite_creator():
                # Open with URI mode=ro for OS-level write prevention
                conn = sqlite3.connect(f"file:///{file_path}?mode=ro", uri=True)
                start_time = time.perf_counter()
                
                def progress_handler():
                    if time.perf_counter() - start_time > timeout_sec:
                        return 1  # Aborts execution with OperationalError: interrupted
                    return 0
                
                # Check timeout every 500 SQLite virtual machine opcodes
                conn.set_progress_handler(progress_handler, 500)
                return conn

            engine = create_engine(
                "sqlite://",
                creator=sqlite_creator,
                poolclass=NullPool
            )
        else:
            engine = create_engine(
                url,
                pool_pre_ping=True,
                pool_recycle=300
            )

        cls._engine_cache[cache_key] = engine
        return engine

    @classmethod
    def test_connection_url(cls, url: str) -> Dict[str, Any]:
        """Test a connection URL with read-only probe."""
        test_engine = None
        try:
            if url.startswith("sqlite"):
                file_path = url.replace("sqlite:///", "")
                test_engine = create_engine(
                    "sqlite://",
                    creator=lambda: sqlite3.connect(f"file:///{file_path}?mode=ro", uri=True),
                    poolclass=NullPool
                )
            else:
                test_engine = create_engine(url, pool_pre_ping=True)

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
        """Construct connection URL strictly from structured form inputs."""
        db_type = data.get("database_type", "sqlite").lower()

        if db_type == "sqlite":
            raw_path = data.get("database_name") or data.get("file_path") or ""
            if not raw_path:
                raise ValueError("A database file path is required for SQLite connections.")
            validated = validate_sqlite_path(raw_path).replace("\\", "/")
            return f"sqlite:///{validated}"
        
        host = (data.get("host") or "").strip()
        if not host:
            raise ValueError("Database host is required.")

        # Network safety: block loopback and private IPs unless explicitly permitted
        if not settings.ALLOW_PRIVATE_DB_HOSTS and is_private_or_local_host(host):
            raise ValueError(
                f"Connection to private or loopback host '{host}' is prohibited for security. "
                "Set ALLOW_PRIVATE_DB_HOSTS=true in server configuration to allow internal databases."
            )

        user = data.get("username", "") or ""
        pwd = data.get("password", "") or ""
        port = data.get("port", "") or ""
        db_name = (data.get("database_name") or "").strip()

        auth = f"{user}:{pwd}@" if user and pwd else (f"{user}@" if user else "")
        port_str = f":{port}" if port else ""

        if db_type == "postgresql":
            return f"postgresql://{auth}{host}{port_str}/{db_name}"
        elif db_type == "mysql":
            return f"mysql+pymysql://{auth}{host}{port_str}/{db_name}"
        else:
            raise ValueError(f"Unsupported database type: {db_type}")
