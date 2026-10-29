from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List


class CompetitorAnalyzeRequest(BaseModel):
    website_id: str
    competitor_domain: str
    question_ids: Optional[List[str]] = None


class CompetitorFindingResponse(BaseModel):
    id: str
    website_id: str
    question_id: str
    question_text: Optional[str] = None
    competitor_domain: str
    user_site_score: float
    competitor_score: float
    gap_type: str
    competitor_urls: List[str]
    missing_subtopics: List[str]
    observed_facts: str
    derived_findings: str
    ai_suggestions: Optional[str] = None
    priority: str
    estimated_effort: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CompetitorGapResponse(BaseModel):
    website_id: str
    competitor_domain: str
    total_questions: int
    user_answered_count: int
    competitor_answered_count: int
    gaps_identified_count: int
    findings: List[CompetitorFindingResponse]
