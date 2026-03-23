from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite database file (created automatically)
DATABASE_URL = "sqlite:///./drilling.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def add_owner_email_column_if_missing():
    """SQLite: add wells.owner_email for per-user isolation on existing DBs."""
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE wells ADD COLUMN owner_email VARCHAR"))
            conn.commit()
        except Exception as e:
            err = str(e).lower()
            if "duplicate column name" in err or "no such table" in err:
                pass
            else:
                raise


def add_mud_desc_column_if_missing():
    """Add mud_desc to mud_properties if the table exists but column is missing (e.g. old DB)."""
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE mud_properties ADD COLUMN mud_desc TEXT"))
            conn.commit()
        except Exception as e:
            err = str(e).lower()
            if "duplicate column name" in err or "no such table" in err:
                pass  # already added or table created by create_all with column
            else:
                raise