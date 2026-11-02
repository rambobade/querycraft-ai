import os
import sys
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.utils.sample_db_seeder import seed_sample_database

@pytest.fixture(scope="session", autouse=True)
def ensure_databases():
    sample_path = os.path.abspath(settings.SAMPLE_DB_PATH)
    if not os.path.exists(sample_path):
        seed_sample_database(sample_path)
    Base.metadata.create_all(bind=engine)
    yield
