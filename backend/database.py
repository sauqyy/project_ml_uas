import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Ambil koneksi dari environment (produksi/Render pakai PostgreSQL lewat DATABASE_URL).
# Fallback ke SQLite lokal untuk pengembangan.
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./finance.db")

# Render/Heroku kadang memberi skema lama "postgres://"; SQLAlchemy 2.x butuh "postgresql://".
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

_is_sqlite = SQLALCHEMY_DATABASE_URL.startswith("sqlite")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    # check_same_thread hanya relevan untuk SQLite
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    # pool_pre_ping mencegah error koneksi Postgres yang idle diputus server
    pool_pre_ping=not _is_sqlite,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
