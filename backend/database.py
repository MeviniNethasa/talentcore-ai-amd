import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Uses an ultra-fast local SQLite database during development cycles
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./recruitment_platform.db")

# Create engine pool handlers (connect_args required strictly for SQLite thread syncing)
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency: Yield transactional database session block contexts cleanly across routers"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()