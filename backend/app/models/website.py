import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, JSON
from sqlalchemy.orm import relationship

from app.db.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Website(Base):
    __tablename__ = "websites"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    domain = Column(String(255), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)
    canonical_url = Column(String(2048), nullable=False)
    description = Column(Text, nullable=True)
    target_audience = Column(String(500), nullable=True)
    
    # Brand details
    brand_aliases = Column(JSON, default=list)  # list of strings: ["Scalezix", "Scale Zix", "scalezix.com"]
    competitor_domains = Column(JSON, default=list)  # list of domains: ["competitor1.com", "competitor2.com"]
    
    # Crawler configuration
    robots_txt_respected = Column(Boolean, default=True)
    max_crawl_pages = Column(Integer, default=15)
    crawl_delay_seconds = Column(Float, default=1.0)
    
    is_active = Column(Boolean, default=True)
    last_crawled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    questions = relationship("TargetQuestion", back_populates="website", cascade="all, delete-orphan")
    crawl_jobs = relationship("CrawlJob", back_populates="website", cascade="all, delete-orphan")
    audits = relationship("AnswerReadinessAudit", back_populates="website", cascade="all, delete-orphan")
    visibility_jobs = relationship("VisibilityJob", back_populates="website", cascade="all, delete-orphan")
    gap_findings = relationship("CompetitorGapFinding", back_populates="website", cascade="all, delete-orphan")
