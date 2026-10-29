from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.engine import Engine
from typing import Generator
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

_engine: Engine | None = None
_SessionLocal: sessionmaker | None = None


def get_engine() -> Engine:
    global _engine, _SessionLocal
    if _engine is None:
        url = settings.database_url
        connect_args = {}
        if url.startswith("sqlite"):
            connect_args = {"check_same_thread": False}
        _engine = create_engine(url, pool_pre_ping=True, connect_args=connect_args)
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _engine


def get_session_factory() -> sessionmaker:
    if _SessionLocal is None:
        get_engine()
    return _SessionLocal  # type: ignore


def get_db() -> Generator[Session, None, None]:
    session_factory = get_session_factory()
    db = session_factory()
    try:
        yield db
    finally:
        db.close()


def check_database() -> str:
    """Return 'ok', 'not_configured', or 'unreachable'."""
    if not settings.database_url:
        return "not_configured"
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return "ok"
    except Exception as e:
        logger.error(f"Database check failed: {e}")
        return "unreachable"


def init_db() -> None:
    """Initializes tables using metadata and ensures backward-compatible columns exist."""
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    try:
        insp = inspect(engine)
        tables = set(insp.get_table_names())
        with engine.connect() as conn:
            if "websites" in tables:
                cols = {c["name"] for c in insp.get_columns("websites")}
                if "description" not in cols:
                    conn.execute(text("ALTER TABLE websites ADD COLUMN description TEXT"))
                if "target_audience" not in cols:
                    conn.execute(text("ALTER TABLE websites ADD COLUMN target_audience VARCHAR(500)"))

            if "question_audit_results" in tables:
                cols = {c["name"] for c in insp.get_columns("question_audit_results")}
                if "suggested_headings" not in cols:
                    conn.execute(text("ALTER TABLE question_audit_results ADD COLUMN suggested_headings TEXT DEFAULT '[]'"))
                if "suggested_schema_types" not in cols:
                    conn.execute(text("ALTER TABLE question_audit_results ADD COLUMN suggested_schema_types TEXT DEFAULT '[]'"))
                if "owner_confirmation_needed" not in cols:
                    conn.execute(text("ALTER TABLE question_audit_results ADD COLUMN owner_confirmation_needed BOOLEAN DEFAULT 0"))

            if "audit_recommendations" in tables:
                cols = {c["name"] for c in insp.get_columns("audit_recommendations")}
                if "target_query" not in cols:
                    conn.execute(text("ALTER TABLE audit_recommendations ADD COLUMN target_query VARCHAR(500)"))
                if "identified_gap" not in cols:
                    conn.execute(text("ALTER TABLE audit_recommendations ADD COLUMN identified_gap TEXT"))
                if "owner_confirmation_note" not in cols:
                    conn.execute(text("ALTER TABLE audit_recommendations ADD COLUMN owner_confirmation_note TEXT"))

            conn.commit()
    except Exception as e:
        logger.warning(f"Schema column check skipped or failed: {e}")
