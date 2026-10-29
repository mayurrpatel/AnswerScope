from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any


class AuditStartRequest(BaseModel):
    website_id: str
    crawl_job_id: Optional[str] = None  # If None, use latest completed crawl or run a crawl
    question_ids: Optional[List[str]] = None  # If None, audit all active target questions


class QuickAuditRequest(BaseModel):
    url: str = Field(..., description="Website canonical URL to analyze")
    name: Optional[str] = Field(default=None, description="Website or business name")
    description: Optional[str] = Field(default=None, description="Business description")
    target_audience: Optional[str] = Field(default=None, description="Target audience")
    questions: List[str] = Field(..., min_length=1, description="List of target user questions")
    max_pages: int = Field(default=15, ge=1, le=50, description="Max pages to crawl and analyze")
    respect_robots_txt: bool = True


class EvidenceSnippet(BaseModel):
    url: str
    text: str
    context: Optional[str] = None
    score: float


class QuestionAuditResultResponse(BaseModel):
    id: str
    audit_id: str
    question_id: str
    question_text: Optional[str] = None
    question_intent: Optional[str] = None
    readiness_score: float
    status: str
    direct_answer_found: bool
    direct_answer_snippet: Optional[str] = None
    answer_clarity_score: float
    content_depth_score: float
    structured_data_present: bool
    structured_data_score: float
    heading_structure_score: float
    evidence_quality_score: float
    relevant_page_urls: List[str]
    evidence_snippets: List[Dict[str, Any]]
    missing_subtopics: List[str]
    suggested_headings: Optional[List[str]] = None
    suggested_schema_types: Optional[List[str]] = None
    owner_confirmation_needed: Optional[bool] = False
    confidence_level: float
    explanation: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RecommendationResponse(BaseModel):
    id: str
    audit_id: str
    question_id: Optional[str] = None
    affected_page_url: Optional[str] = None
    target_query: Optional[str] = None
    identified_gap: Optional[str] = None
    issue: str
    supporting_evidence: str
    why_it_helps: str
    suggested_action: str
    priority: str
    estimated_effort: str
    is_ai_generated: bool
    owner_confirmation_note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditResponse(BaseModel):
    id: str
    website_id: str
    crawl_job_id: Optional[str] = None
    status: str
    overall_score: float
    readiness_level: str
    questions_analyzed: int
    answered_count: int
    partially_answered_count: int
    unanswered_count: int
    confidence_score: float
    scoring_methodology: Dict[str, Any]
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime

    question_results: Optional[List[QuestionAuditResultResponse]] = None
    recommendations: Optional[List[RecommendationResponse]] = None

    model_config = ConfigDict(from_attributes=True)
