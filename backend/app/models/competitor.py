import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.db.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class CompetitorGapFinding(Base):
    __tablename__ = "competitor_gap_findings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    website_id = Column(String(36), ForeignKey("websites.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String(36), ForeignKey("target_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    competitor_domain = Column(String(255), nullable=False, index=True)
    
    user_site_score = Column(Float, default=0.0)
    competitor_score = Column(Float, default=0.0)
    gap_type = Column(String(50), nullable=False)  # unanswered_by_user, competitor_superior, subtopic_missing
    
    competitor_urls = Column(JSON, default=list)  # list of URLs
    missing_subtopics = Column(JSON, default=list)  # list of strings
    
    # Clearly separated categories of information:
    observed_facts = Column(Text, nullable=False)   # What was actually observed on pages
    derived_findings = Column(Text, nullable=False) # Gaps calculated from observations
    ai_suggestions = Column(Text, nullable=True)    # Optional recommendations for human review
    
    priority = Column(String(20), default="medium")
    estimated_effort = Column(String(20), default="medium")  # low, medium, high
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    website = relationship("Website", back_populates="gap_findings")
