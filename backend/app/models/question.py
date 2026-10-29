import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class SearchIntent(str, enum.Enum):
    INFORMATIONAL = "informational"
    COMMERCIAL_INVESTIGATION = "commercial_investigation"
    TRANSACTIONAL = "transactional"
    NAVIGATIONAL = "navigational"
    UNKNOWN = "unknown"


class QuestionPriority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TargetQuestion(Base):
    __tablename__ = "target_questions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    website_id = Column(String(36), ForeignKey("websites.id", ondelete="CASCADE"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    intent = Column(String(50), default=SearchIntent.UNKNOWN.value, index=True)
    topic = Column(String(255), nullable=True, index=True)
    target_audience = Column(String(255), nullable=True)
    priority = Column(String(20), default=QuestionPriority.MEDIUM.value)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    website = relationship("Website", back_populates="questions")
    audit_results = relationship("QuestionAuditResult", back_populates="question", cascade="all, delete-orphan")
    visibility_observations = relationship("VisibilityObservation", back_populates="question", cascade="all, delete-orphan")
