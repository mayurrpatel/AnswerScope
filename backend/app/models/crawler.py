import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.db.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class CrawlJob(Base):
    __tablename__ = "crawl_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    website_id = Column(String(36), ForeignKey("websites.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(30), default="pending", index=True)  # pending, running, completed, failed, cancelled
    pages_crawled = Column(Integer, default=0)
    max_pages = Column(Integer, default=15)
    max_depth = Column(Integer, default=2)
    error_message = Column(Text, nullable=True)
    
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    website = relationship("Website", back_populates="crawl_jobs")
    pages = relationship("CrawledPage", back_populates="crawl_job", cascade="all, delete-orphan")
    audits = relationship("AnswerReadinessAudit", back_populates="crawl_job")


class CrawledPage(Base):
    __tablename__ = "crawled_pages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    crawl_job_id = Column(String(36), ForeignKey("crawl_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    website_id = Column(String(36), ForeignKey("websites.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(String(2048), nullable=False, index=True)
    canonical_url = Column(String(2048), nullable=True)
    status_code = Column(Integer, nullable=False, default=200)
    
    title = Column(String(500), nullable=True)
    meta_description = Column(Text, nullable=True)
    language = Column(String(20), nullable=True)
    
    # Structure & text
    headings = Column(JSON, default=dict)  # {"h1": [...], "h2": [...], "h3": [...]}
    body_text = Column(Text, nullable=True)
    structured_data = Column(JSON, default=list)  # list of JSON-LD schemas
    word_count = Column(Integer, default=0)
    response_time_ms = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    crawl_job = relationship("CrawlJob", back_populates="pages")
