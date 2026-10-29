import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.db.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class AnswerReadinessAudit(Base):
    __tablename__ = "answer_readiness_audits"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    website_id = Column(String(36), ForeignKey("websites.id", ondelete="CASCADE"), nullable=False, index=True)
    crawl_job_id = Column(String(36), ForeignKey("crawl_jobs.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(30), default="pending", index=True)  # pending, running, completed, failed
    
    overall_score = Column(Float, default=0.0)  # 0 to 100
    readiness_level = Column(String(30), default="missing")  # excellent, good, fair, poor, missing
    questions_analyzed = Column(Integer, default=0)
    answered_count = Column(Integer, default=0)
    partially_answered_count = Column(Integer, default=0)
    unanswered_count = Column(Integer, default=0)
    confidence_score = Column(Float, default=0.0)
    
    scoring_methodology = Column(JSON, default=dict)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    website = relationship("Website", back_populates="audits")
    crawl_job = relationship("CrawlJob", back_populates="audits")
    question_results = relationship("QuestionAuditResult", back_populates="audit", cascade="all, delete-orphan")
    recommendations = relationship("AuditRecommendation", back_populates="audit", cascade="all, delete-orphan")


class QuestionAuditResult(Base):
    __tablename__ = "question_audit_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    audit_id = Column(String(36), ForeignKey("answer_readiness_audits.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String(36), ForeignKey("target_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    readiness_score = Column(Float, default=0.0)  # 0 to 100
    status = Column(String(30), default="unanswered")  # ready, partially_ready, needs_improvement, unanswered
    
    # Specific dimensions
    direct_answer_found = Column(Boolean, default=False)
    direct_answer_snippet = Column(Text, nullable=True)
    answer_clarity_score = Column(Float, default=0.0)  # 0 to 30
    content_depth_score = Column(Float, default=0.0)  # 0 to 30
    structured_data_present = Column(Boolean, default=False)
    structured_data_score = Column(Float, default=0.0)  # 0 to 15
    heading_structure_score = Column(Float, default=0.0)  # 0 to 15
    evidence_quality_score = Column(Float, default=0.0)  # 0 to 10
    
    relevant_page_urls = Column(JSON, default=list)  # list of strings
    evidence_snippets = Column(JSON, default=list)  # list of {url, text, context, score}
    missing_subtopics = Column(JSON, default=list)  # list of strings
    suggested_headings = Column(JSON, default=list)  # recommended headings for content gap
    suggested_schema_types = Column(JSON, default=list)  # suggested Schema.org types
    owner_confirmation_needed = Column(Boolean, default=False)
    
    confidence_level = Column(Float, default=0.0)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    audit = relationship("AnswerReadinessAudit", back_populates="question_results")
    question = relationship("TargetQuestion", back_populates="audit_results")


class AuditRecommendation(Base):
    __tablename__ = "audit_recommendations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    audit_id = Column(String(36), ForeignKey("answer_readiness_audits.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String(36), ForeignKey("target_questions.id", ondelete="SET NULL"), nullable=True, index=True)
    affected_page_url = Column(String(2048), nullable=True)
    target_query = Column(String(500), nullable=True)
    identified_gap = Column(Text, nullable=True)
    
    issue = Column(String(500), nullable=False)
    supporting_evidence = Column(Text, nullable=False)
    why_it_helps = Column(Text, nullable=False)
    suggested_action = Column(Text, nullable=False)
    priority = Column(String(20), default="medium")  # critical, high, medium, low
    estimated_effort = Column(String(20), default="medium")  # low, medium, high
    is_ai_generated = Column(Boolean, default=False)
    owner_confirmation_note = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    audit = relationship("AnswerReadinessAudit", back_populates="recommendations")
