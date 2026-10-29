from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any


class CrawlStartRequest(BaseModel):
    website_id: str
    max_pages: Optional[int] = Field(default=None, ge=1, le=50)
    max_depth: Optional[int] = Field(default=None, ge=1, le=4)


class CrawledPageResponse(BaseModel):
    id: str
    crawl_job_id: str
    website_id: str
    url: str
    canonical_url: Optional[str] = None
    status_code: int
    title: Optional[str] = None
    meta_description: Optional[str] = None
    language: Optional[str] = None
    headings: Dict[str, List[str]] = Field(default_factory=dict)
    word_count: int
    structured_data: List[Dict[str, Any]] = Field(default_factory=list)
    response_time_ms: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CrawlJobResponse(BaseModel):
    id: str
    website_id: str
    status: str
    pages_crawled: int
    max_pages: int
    max_depth: int
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime
    pages: Optional[List[CrawledPageResponse]] = None

    model_config = ConfigDict(from_attributes=True)
