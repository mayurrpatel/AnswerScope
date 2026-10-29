from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any


class VisibilityStartRequest(BaseModel):
    website_id: str
    provider_name: str = Field(default="tavily", description="tavily, serpapi, perplexity, or fixture")
    question_ids: Optional[List[str]] = None
    use_test_fixture: bool = Field(default=False, description="Explicit test fixture for demonstration/verification without live API keys")


class VisibilityCitationResponse(BaseModel):
    id: str
    cited_url: str
    cited_domain: str
    title: Optional[str] = None
    snippet: Optional[str] = None
    position: int
    matches_brand_domain: bool
    matches_competitor_domain: bool

    model_config = ConfigDict(from_attributes=True)


class VisibilityObservationResponse(BaseModel):
    id: str
    visibility_job_id: str
    question_id: str
    question_text: Optional[str] = None
    query_text: str
    provider_name: str
    model_name: Optional[str] = None
    raw_response_snippet: Optional[str] = None
    brand_mentioned: bool
    brand_mention_snippets: List[str]
    competitor_mentions: List[Dict[str, str]]
    retrieved_at: datetime
    is_simulated_fixture: bool
    citations: List[VisibilityCitationResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class VisibilityJobResponse(BaseModel):
    id: str
    website_id: str
    provider_name: str
    status: str
    total_questions: int
    questions_completed: int
    brand_mentions_count: int
    brand_mention_rate: float
    citations_count: int
    competitor_mentions_count: int
    questions_with_competitor_without_brand: int
    domain_distribution: Dict[str, int]
    error_message: Optional[str] = None
    is_live_provider: bool
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime
    observations: Optional[List[VisibilityObservationResponse]] = None

    model_config = ConfigDict(from_attributes=True)


class ProviderStatusResponse(BaseModel):
    provider_name: str
    is_configured: bool
    description: str
    requires_key: str
    supported_features: List[str]
