from pydantic import BaseModel, HttpUrl, Field, ConfigDict
from datetime import datetime
from typing import List, Optional


class WebsiteBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    canonical_url: str = Field(..., description="Full canonical URL e.g. https://example.com")
    brand_aliases: List[str] = Field(default_factory=list, description="Brand name variations")
    competitor_domains: List[str] = Field(default_factory=list, description="Competitor domains")
    robots_txt_respected: bool = True
    max_crawl_pages: int = Field(default=15, ge=1, le=100)
    crawl_delay_seconds: float = Field(default=1.0, ge=0.1, le=10.0)


class WebsiteCreate(WebsiteBase):
    pass


class WebsiteUpdate(BaseModel):
    name: Optional[str] = None
    canonical_url: Optional[str] = None
    brand_aliases: Optional[List[str]] = None
    competitor_domains: Optional[List[str]] = None
    robots_txt_respected: Optional[bool] = None
    max_crawl_pages: Optional[int] = None
    crawl_delay_seconds: Optional[float] = None
    is_active: Optional[bool] = None


class WebsiteResponse(WebsiteBase):
    id: str
    domain: str
    is_active: bool
    last_crawled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
