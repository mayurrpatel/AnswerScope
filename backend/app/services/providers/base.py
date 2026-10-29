from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel


class ProviderCitation(BaseModel):
    url: str
    domain: str
    title: Optional[str] = None
    snippet: Optional[str] = None
    position: int = 1


class ProviderQueryResult(BaseModel):
    provider_name: str
    model_name: Optional[str] = None
    query: str
    answer_text: Optional[str] = None
    citations: List[ProviderCitation] = []
    brand_mentions: List[str] = []
    competitor_mentions: List[Dict[str, str]] = []
    raw_response: Optional[str] = None
    retrieved_at: datetime
    is_simulated_fixture: bool = False
    is_configured: bool = True
    error_message: Optional[str] = None


class BaseVisibilityProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @property
    @abstractmethod
    def is_configured(self) -> bool:
        pass

    @abstractmethod
    async def query(
        self,
        query: str,
        brand_domain: str,
        brand_aliases: List[str],
        competitor_domains: List[str],
    ) -> ProviderQueryResult:
        pass
