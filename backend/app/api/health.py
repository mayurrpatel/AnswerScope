from fastapi import APIRouter

from app.core.config import settings
from app.db.session import check_database

router = APIRouter(tags=["general"])


@router.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "database": check_database(),
    }
