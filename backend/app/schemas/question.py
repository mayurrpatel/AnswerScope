from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List


class TargetQuestionBase(BaseModel):
    text: str = Field(..., min_length=3, description="Target question that users might ask")
    intent: str = Field(default="unknown", description="Search intent")
    topic: Optional[str] = None
    target_audience: Optional[str] = None
    priority: str = Field(default="medium", description="critical, high, medium, low")
    notes: Optional[str] = None


class TargetQuestionCreate(TargetQuestionBase):
    website_id: str


class TargetQuestionBatchCreate(BaseModel):
    website_id: str
    questions: List[str]
    topic: Optional[str] = None
    target_audience: Optional[str] = None


class TargetQuestionUpdate(BaseModel):
    text: Optional[str] = None
    intent: Optional[str] = None
    topic: Optional[str] = None
    target_audience: Optional[str] = None
    priority: Optional[str] = None
    notes: Optional[str] = None


class TargetQuestionResponse(TargetQuestionBase):
    id: str
    website_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IntentClassifyRequest(BaseModel):
    text: str


class IntentClassifyResponse(BaseModel):
    intent: str
    confidence: float
    reason: str
