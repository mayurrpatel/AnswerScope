from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.api import health, websites, questions, crawler, audits, visibility, competitors, reports
from app.core.config import settings
from app.db.session import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-initialize database tables if using SQLite or if tables don't exist yet
    try:
        init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.warning(f"Could not auto-initialize DB tables on startup: {e}")
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Full-stack AI Search Visibility & Answer Engine Audit Platform API",
    lifespan=lifespan,
)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api
app.include_router(health.router, prefix="/api")
app.include_router(websites.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(crawler.router, prefix="/api")
app.include_router(audits.router, prefix="/api")
app.include_router(visibility.router, prefix="/api")
app.include_router(competitors.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
