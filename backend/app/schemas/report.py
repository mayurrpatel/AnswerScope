from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any

from app.schemas.audit import AuditResponse
from app.schemas.visibility import VisibilityJobResponse
from app.schemas.competitor import CompetitorFindingResponse


class ReportSummaryResponse(BaseModel):
    website_id: str
    website_name: str
    canonical_url: str
    generated_at: datetime
    
    # Capability A summary
    latest_audit: Optional[AuditResponse] = None
    
    # Capability B summary
    latest_visibility: Optional[VisibilityJobResponse] = None
    
    # Competitor gap summary
    competitor_gaps: List[CompetitorFindingResponse] = []
    
    # High priority actions
    top_recommendations: List[Dict[str, Any]] = []
    
    data_limitations: List[str] = []
