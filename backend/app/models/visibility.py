import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.db.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class VisibilityJob(Base):
    __tablename__ = "visibility_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    website_id = Column(String(36), ForeignKey("websites.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_name = Column(String(100), nullable=False)  # e.g., "tavily", "serpapi", "perplexity", "unconfigured"
    status = Column(String(30), default="pending", index=True)  # pending, running, completed, failed
    
    total_questions = Column(Integer, default=0)
    questions_completed = Column(Integer, default=0)
    brand_mentions_count = Column(Integer, default=0)
    brand_mention_rate = Column(Float, default=0.0)  # brand_mentions_count / total_questions
    citations_count = Column(Integer, default=0)
    competitor_mentions_count = Column(Integer, default=0)
    questions_with_competitor_without_brand = Column(Integer, default=0)
    
    domain_distribution = Column(JSON, default=dict)  # {"domain.com": count}
    error_message = Column(Text, nullable=True)
    is_live_provider = Column(Boolean, default=True)  # False if fixture/unconfigured
    
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    website = relationship("Website", back_populates="visibility_jobs")
    observations = relationship("VisibilityObservation", back_populates="visibility_job", cascade="all, delete-orphan")


class VisibilityObservation(Base):
    __tablename__ = "visibility_observations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    visibility_job_id = Column(String(36), ForeignKey("visibility_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String(36), ForeignKey("target_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    query_text = Column(Text, nullable=False)
    provider_name = Column(String(100), nullable=False)
    model_name = Column(String(100), nullable=True)
    raw_response_snippet = Column(Text, nullable=True)
    
    brand_mentioned = Column(Boolean, default=False)
    brand_mention_snippets = Column(JSON, default=list)  # list of strings
    competitor_mentions = Column(JSON, default=list)  # list of {"competitor": str, "snippet": str}
    
    retrieved_at = Column(DateTime, default=datetime.utcnow)
    is_simulated_fixture = Column(Boolean, default=False)

    # Relationships
    visibility_job = relationship("VisibilityJob", back_populates="observations")
    question = relationship("TargetQuestion", back_populates="visibility_observations")
    citations = relationship("VisibilityCitation", back_populates="observation", cascade="all, delete-orphan")


class VisibilityCitation(Base):
    __tablename__ = "visibility_citations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    observation_id = Column(String(36), ForeignKey("visibility_observations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    cited_url = Column(String(2048), nullable=False)
    cited_domain = Column(String(255), nullable=False, index=True)
    title = Column(String(500), nullable=True)
    snippet = Column(Text, nullable=True)
    position = Column(Integer, default=1)
    
    matches_brand_domain = Column(Boolean, default=False)
    matches_competitor_domain = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    observation = relationship("VisibilityObservation", back_populates="citations")
